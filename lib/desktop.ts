'use client';

/**
 * Tauri v2 Masaüstü İstemcisi Yardımcı Fonksiyonları.
 *
 * WebView içerisinde çalışırken Tauri komutlarını (`invoke`) çağırır;
 * normal tarayıcıda çalışırken güvenli şekilde geri dönüş (fallback) yapar.
 *
 * @module lib/desktop
 */

interface GlobalTauri {
  core?: {
    invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
}

function getTauriInvoke() {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { __TAURI__?: GlobalTauri; __TAURI_INTERNALS__?: unknown };
  return w.__TAURI__?.core?.invoke ?? null;
}

/** Uygulama Tauri masaüstü penceresi içinde mi çalışıyor? */
export function isTauriDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

const LOCAL_TRAY_KEY = 'gamevault_close_to_tray';

/** "Kapatınca sistem tepsisine küçült" ayarını okur. */
export async function getCloseToTrayPref(): Promise<boolean> {
  const invoke = getTauriInvoke();
  if (invoke) {
    try {
      return await invoke<boolean>('get_close_to_tray');
    } catch {
      // fallback
    }
  }
  try {
    const saved = localStorage.getItem(LOCAL_TRAY_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

/** "Kapatınca sistem tepsisine küçült" ayarını kaydeder. */
export async function setCloseToTrayPref(enabled: boolean): Promise<boolean> {
  try {
    localStorage.setItem(LOCAL_TRAY_KEY, String(enabled));
  } catch {
    // ignore
  }
  const invoke = getTauriInvoke();
  if (invoke) {
    try {
      return await invoke<boolean>('set_close_to_tray', { enabled });
    } catch {
      // fallback
    }
  }
  return enabled;
}

/** Pencereyi hemen sistem tepsisine gizler. */
export async function hideWindowToTray(): Promise<void> {
  const invoke = getTauriInvoke();
  if (invoke) {
    try {
      await invoke('hide_to_tray');
    } catch {
      // ignore
    }
  }
}

/** Harici bir bağlantıyı varsayılan sistem tarayıcısında açar. */
export async function openExternalUrl(url: string): Promise<void> {
  const invoke = getTauriInvoke();
  if (invoke) {
    try {
      await invoke('open_external_url', { url });
      return;
    } catch {
      // fallback to window.open
    }
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
