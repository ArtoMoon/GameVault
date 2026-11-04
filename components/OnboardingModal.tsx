'use client';

import { useState, useEffect, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  getApiKeyStatus,
  saveApiKey,
  ApiKeyStatus,
  getMongoStatus,
  saveMongoUri,
  MongoStatus,
} from '@/app/actions/settings';
import type { UpdateCheckResponse } from '@/app/api/update-check/route';
import {
  getCloseToTrayPref,
  setCloseToTrayPref,
  hideWindowToTray,
  isTauriDesktop,
  openExternalUrl,
} from '@/lib/desktop';

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function OnboardingModal({ isOpen: controlledOpen, onClose }: OnboardingModalProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // Riot API Key State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isApiPending, startApiTransition] = useTransition();

  // MongoDB State
  const [mongoInput, setMongoInput] = useState('');
  const [mongoStatus, setMongoStatus] = useState<MongoStatus | null>(null);
  const [mongoFeedback, setMongoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isMongoPending, startMongoTransition] = useTransition();

  // Masaüstü & Güncelleme State
  const [closeToTray, setCloseToTray] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResponse | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await fetch('/api/update-check', { cache: 'no-store' });
      if (res.ok) {
        const data: UpdateCheckResponse = await res.json();
        setUpdateInfo(data);
      }
    } catch {
      // ignore
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleToggleCloseToTray = async () => {
    const next = !closeToTray;
    setCloseToTray(next);
    await setCloseToTrayPref(next);
  };

  // Custom event dinleyicisi (Navbar'dan açmak için)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setApiFeedback(null);
      setMongoFeedback(null);
      try {
        const seen = localStorage.getItem('mylol_onboarding_seen');
        setStep(seen ? 1 : 0);
      } catch {
        setStep(0);
      }
      fetchAllStatus();
    };

    window.addEventListener('open-settings-modal', handleOpen);
    return () => window.removeEventListener('open-settings-modal', handleOpen);
  }, []);

  // Kontrollü açık/kapalı durumu
  useEffect(() => {
    if (controlledOpen !== undefined) {
      setIsOpen(controlledOpen);
      if (controlledOpen) {
        fetchAllStatus();
      }
    }
  }, [controlledOpen]);

  // İlk açılış kontrolü: Daha önce görülmemişse veya key/mongo yoksa otomatik aç
  useEffect(() => {
    const checkInitialLaunch = async () => {
      try {
        const [keyData, mData] = await Promise.all([
          getApiKeyStatus().catch(() => null),
          getMongoStatus().catch(() => null),
        ]);

        if (keyData) setApiKeyStatus(keyData);
        if (mData) {
          setMongoStatus(mData);
          if (mData.uri && !mongoInput) {
            setMongoInput(mData.uri);
          }
        }

        const seen = localStorage.getItem('mylol_onboarding_seen');
        const needsSetup = !seen || !keyData?.hasKey || !mData?.connected;
        if (needsSetup) {
          setIsOpen(true);
        }
      } catch {
        // Ignore
      }
    };

    checkInitialLaunch();
  }, []);

  const fetchAllStatus = async () => {
    try {
      setIsDesktop(isTauriDesktop());
      getCloseToTrayPref().then(setCloseToTray).catch(() => {});
      checkForUpdates();

      const [keyData, mData] = await Promise.all([
        getApiKeyStatus().catch(() => null),
        getMongoStatus().catch(() => null),
      ]);
      if (keyData) setApiKeyStatus(keyData);
      if (mData) {
        setMongoStatus(mData);
        if (mData.uri && !mongoInput) {
          setMongoInput(mData.uri);
        }
      }
    } catch {
      // Ignore
    }
  };

  // MongoDB Test & Kaydet
  const handleSaveAndTestMongo = () => {
    const uriToSave = mongoInput.trim() || 'mongodb://localhost:27017/mylol';
    setMongoFeedback(null);

    startMongoTransition(async () => {
      const result = await saveMongoUri(uriToSave);
      if (result.success) {
        setMongoFeedback({
          type: 'success',
          message: t('onboarding_mongo_valid'),
        });
        fetchAllStatus();
      } else {
        setMongoFeedback({
          type: 'error',
          message: result.error || t('onboarding_mongo_invalid'),
        });
      }
    });
  };

  // Riot API Test & Kaydet
  const handleSaveAndTestApi = () => {
    if (!apiKeyInput.trim()) {
      setApiFeedback({
        type: 'error',
        message: 'Lütfen bir Riot API Anahtarı giriniz.',
      });
      return;
    }

    setApiFeedback(null);
    startApiTransition(async () => {
      const result = await saveApiKey(apiKeyInput.trim());

      if (result.success) {
        setApiFeedback({
          type: 'success',
          message: t('onboarding_valid_key'),
        });
        setApiKeyInput('');
        fetchAllStatus();
      } else {
        setApiFeedback({
          type: 'error',
          message: result.error || t('onboarding_invalid_key'),
        });
      }
    });
  };

  const handleClose = () => {
    try {
      localStorage.setItem('mylol_onboarding_seen', 'true');
    } catch {
      // Ignore
    }
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  const steps: { id: 0 | 1 | 2; num: string; title: string; ready?: boolean }[] = [
    { id: 0, num: '01', title: 'GameVault' },
    { id: 1, num: '02', title: 'MongoDB', ready: Boolean(mongoStatus?.connected) },
    { id: 2, num: '03', title: 'Riot API', ready: Boolean(apiKeyStatus?.hasKey) },
  ];

  return (
    <div className="modal-backdrop select-none" onClick={handleClose}>
      <div
        className="modal-panel max-w-2xl flex flex-col overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Üst Başlık & Kapat Butonu */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-accent-500/40 to-glow-500/30 blur-md opacity-70" />
              <img
                src="/logo.png"
                alt="GameVault"
                className="relative w-10 h-10 rounded-xl object-cover border border-white/15"
              />
            </div>
            <div className="min-w-0">
              <div className="eyebrow">KURULUM & AYARLAR</div>
              <h2 className="text-base font-bold tracking-tight text-white truncate">
                {t('onboarding_welcome_title')}
              </h2>
              <p className="text-xs text-text-muted truncate">
                {t('onboarding_welcome_desc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-icon shrink-0"
            title="Kapat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Adım Çubuğu (Stepper) */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-ink-900/50 flex items-center gap-2">
          {steps.map((s, idx) => {
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-accent-500/20 to-glow-500/10 border-accent-400/40 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'bg-white/[0.025] border-white/[0.06] text-text-secondary hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                        active
                          ? 'bg-accent-500 text-white'
                          : 'bg-white/[0.06] text-text-muted'
                      }`}
                    >
                      {s.num}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </span>
                  {s.ready !== undefined && (
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        s.ready
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                          : 'bg-amber-400/70'
                      }`}
                    />
                  )}
                </button>
                {idx < steps.length - 1 && (
                  <div className="hidden sm:block w-3 h-[1px] bg-white/10 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* İçerik Alanı (Kaydırılabilir) */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* ADIM 0: GENEL BAKIŞ & ÖZELLİKLER */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-up">
              {/* Özellikler Özeti (3 Kart) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 stagger">
                <div className="card p-4 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-accent-500/15 border border-accent-400/25 text-accent-300 flex items-center justify-center text-base">
                    ⚡
                  </div>
                  <h3 className="text-xs font-bold text-white">
                    {t('onboarding_feature_1_title')}
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {t('onboarding_feature_1_desc')}
                  </p>
                </div>

                <div className="card p-4 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-glow-500/15 border border-glow-400/25 text-glow-400 flex items-center justify-center text-base">
                    🎯
                  </div>
                  <h3 className="text-xs font-bold text-white">
                    {t('onboarding_feature_2_title')}
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {t('onboarding_feature_2_desc')}
                  </p>
                </div>

                <div className="card p-4 space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 flex items-center justify-center text-base">
                    🛡️
                  </div>
                  <h3 className="text-xs font-bold text-white">
                    {t('onboarding_feature_3_title')}
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    {t('onboarding_feature_3_desc')}
                  </p>
                </div>
              </div>

              {/* Hızlı Bağlantı Durumu Özeti */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="card card-interactive p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg shrink-0">
                      🍃
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {t('onboarding_mongo_step_title')}
                      </div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {mongoStatus?.connected
                          ? t('onboarding_mongo_connected')
                          : t('onboarding_mongo_not_connected')}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`chip shrink-0 ${
                      mongoStatus?.connected
                        ? '!bg-emerald-500/15 !border-emerald-500/30 !text-emerald-300'
                        : '!bg-amber-500/15 !border-amber-500/30 !text-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        mongoStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {mongoStatus?.connected ? 'OK' : 'Setup'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="card card-interactive p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/25 flex items-center justify-center text-lg shrink-0">
                      🔑
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {t('onboarding_api_step_title')}
                      </div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {apiKeyStatus?.hasKey
                          ? `Aktif: ${apiKeyStatus.maskedKey}`
                          : 'RGAPI Key'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`chip shrink-0 ${
                      apiKeyStatus?.hasKey
                        ? '!bg-emerald-500/15 !border-emerald-500/30 !text-emerald-300'
                        : '!bg-amber-500/15 !border-amber-500/30 !text-amber-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        apiKeyStatus?.hasKey ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    {apiKeyStatus?.hasKey ? 'OK' : 'Setup'}
                  </span>
                </button>
              </div>

              {/* Masaüstü Sistem Tepsisi (Tray) & Sürüm Güncelleme */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Sistem Tepsisi Ayarı */}
                <div className="card p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white">
                        {t('tray_setting_title')}
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed mt-1">
                        {t('tray_setting_desc')}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={closeToTray}
                      onClick={handleToggleCloseToTray}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer ${
                        closeToTray
                          ? 'bg-accent-500 border-accent-400/60'
                          : 'bg-white/10 border-white/15'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          closeToTray ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {isDesktop && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        hideWindowToTray();
                      }}
                      className="btn btn-secondary btn-sm w-full"
                    >
                      <span>↘</span>
                      <span>{t('tray_hide_now')}</span>
                    </button>
                  )}
                </div>

                {/* Sürüm & Güncelleme Kartı */}
                <div className="card p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>GameVault</span>
                        <span className="chip !h-5 !px-2 font-mono">
                          v{updateInfo?.currentVersion || '0.4.0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1">
                        {isCheckingUpdate
                          ? t('update_checking')
                          : updateInfo?.hasUpdate
                          ? `${t('update_available')}: v${updateInfo.latestVersion}`
                          : t('update_up_to_date')}
                      </p>
                    </div>
                    {updateInfo?.hasUpdate && (
                      <span className="chip !bg-accent-500/20 !border-accent-400/40 !text-accent-300 shrink-0">
                        v{updateInfo.latestVersion}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {updateInfo?.hasUpdate ? (
                      <button
                        type="button"
                        onClick={() =>
                          openExternalUrl(updateInfo.downloadUrl || updateInfo.releaseUrl)
                        }
                        className="btn btn-primary btn-sm flex-1"
                      >
                        <span>⬇</span>
                        <span>
                          {t('update_btn')} (v{updateInfo.latestVersion})
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={checkForUpdates}
                        disabled={isCheckingUpdate}
                        className="btn btn-secondary btn-sm flex-1"
                      >
                        <span>↻</span>
                        <span>
                          {isCheckingUpdate ? t('update_checking') : t('update_check_btn')}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🍃 ADIM 1: MONGODB BAĞLANTI KURULUMU */}
          {step === 1 && (
            <div className="card p-5 space-y-4 animate-fade-up">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-lg shrink-0">
                    🍃
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t('onboarding_mongo_step_title')}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t('onboarding_mongo_step_desc')}
                    </p>
                  </div>
                </div>

                {mongoStatus && (
                  <div
                    className={`chip shrink-0 ${
                      mongoStatus.connected
                        ? '!bg-emerald-500/15 !border-emerald-500/30 !text-emerald-300'
                        : '!bg-red-500/15 !border-red-500/30 !text-red-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        mongoStatus.connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`}
                    />
                    <span>
                      {mongoStatus.connected
                        ? t('onboarding_mongo_connected')
                        : t('onboarding_mongo_not_connected')}
                    </span>
                  </div>
                )}
              </div>

              <div className="divider" />

              {/* Input ve Test Butonu */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="label !mb-0">
                      {t('onboarding_mongo_input_label')}
                    </label>
                    <span className="text-[11px] text-text-muted font-mono">
                      mongodb://localhost:27017/mylol
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder={t('onboarding_mongo_placeholder')}
                    value={mongoInput}
                    onChange={(e) => setMongoInput(e.target.value)}
                    className="input font-mono"
                  />
                </div>

                {/* Geri Bildirim Mesajı */}
                {mongoFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 animate-fade-in ${
                      mongoFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span>{mongoFeedback.type === 'success' ? '✅' : '⚠️'}</span>
                    <span>{mongoFeedback.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAndTestMongo}
                  disabled={isMongoPending}
                  className="btn btn-primary w-full !h-10"
                >
                  {isMongoPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('onboarding_testing')}</span>
                    </>
                  ) : (
                    <span>{t('onboarding_mongo_test_btn')}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 🔑 ADIM 2: RIOT API KEY KURULUMU */}
          {step === 2 && (
            <div className="card p-5 space-y-4 animate-fade-up">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-400/25 flex items-center justify-center text-lg shrink-0">
                    🔑
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t('onboarding_api_step_title')}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {t('onboarding_api_step_desc')}
                    </p>
                  </div>
                </div>

                {apiKeyStatus?.hasKey && (
                  <div className="chip !bg-emerald-500/15 !border-emerald-500/30 !text-emerald-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Aktif: {apiKeyStatus.maskedKey}</span>
                  </div>
                )}
              </div>

              {/* Nasıl Alınır Adımları */}
              <div className="p-3.5 rounded-xl bg-ink-950/60 border border-white/[0.06] text-xs text-text-secondary space-y-1.5">
                <div className="font-semibold text-white flex items-center justify-between gap-2">
                  <span>{t('onboarding_how_to_get')}</span>
                  <a
                    href="https://developer.riotgames.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-400 hover:text-accent-300 underline font-semibold flex items-center gap-1"
                  >
                    developer.riotgames.com ↗
                  </a>
                </div>
                <p>{t('onboarding_step_1')}</p>
                <p>{t('onboarding_step_2')}</p>
                <p>{t('onboarding_step_3')}</p>
              </div>

              {/* Input ve Kaydet Butonu */}
              <div className="space-y-3.5">
                <div>
                  <label className="label">
                    {t('onboarding_api_input_label')}
                  </label>
                  <input
                    type="text"
                    placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="input font-mono"
                  />
                </div>

                {/* Geri Bildirim Mesajı */}
                {apiFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium border flex items-center gap-2 animate-fade-in ${
                      apiFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span>{apiFeedback.type === 'success' ? '✅' : '⚠️'}</span>
                    <span>{apiFeedback.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveAndTestApi}
                  disabled={isApiPending}
                  className="btn btn-primary w-full !h-10"
                >
                  {isApiPending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('onboarding_testing')}</span>
                    </>
                  ) : (
                    <span>{t('onboarding_test_save_btn')}</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alt Çubuk */}
        <div className="px-6 py-4 border-t border-white/[0.07] bg-white/[0.02] flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                aria-label={`Step ${s.num}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  step === s.id
                    ? 'w-6 bg-accent-400'
                    : 'w-1.5 bg-white/15 hover:bg-white/30'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2)}
                className="btn btn-ghost"
              >
                ←
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as 0 | 1 | 2)}
                className="btn btn-secondary"
              >
                →
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-primary px-5"
            >
              {t('onboarding_close_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
