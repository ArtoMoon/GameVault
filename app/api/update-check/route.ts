/**
 * API Route: /api/update-check
 *
 * GET – Uygulamanın yerel sürümünü GitHub (`ArtoMoon/GameVault`) üzerindeki
 * en son yayınlanan sürümle karşılaştırır.
 *
 * Yeni bir sürüm varsa indirme bağlantısını (`.exe` installer veya release
 * sayfası) döner. Harici ağ erişilemezse hata fırlatmak yerine güvenli bir
 * şekilde `hasUpdate: false` döner.
 *
 * @module app/api/update-check/route
 */

import { NextResponse } from 'next/server';
import pkg from '../../../package.json';

export const dynamic = 'force-dynamic';

const GITHUB_LATEST_URL = 'https://api.github.com/repos/ArtoMoon/GameVault/releases/latest';
const GITHUB_RELEASES_PAGE = 'https://github.com/ArtoMoon/GameVault/releases/latest';

export interface UpdateCheckResponse {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseUrl: string;
  downloadUrl: string;
  publishedAt?: string;
}

function parseSemver(version: string): [number, number, number] {
  const cleaned = version.replace(/^v/i, '').trim().split('-')[0];
  const parts = cleaned.split('.').map((n) => parseInt(n, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewerVersion(latest: string, current: string): boolean {
  const [lMaj, lMin, lPat] = parseSemver(latest);
  const [cMaj, cMin, cPat] = parseSemver(current);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

/**
 * GET /api/update-check
 *
 * @returns {Promise<NextResponse<UpdateCheckResponse>>}
 */
export async function GET(): Promise<NextResponse<UpdateCheckResponse>> {
  const currentVersion = pkg.version || '0.4.1';

  try {
    const res = await fetch(GITHUB_LATEST_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'GameVault-Desktop-Updater',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        currentVersion,
        latestVersion: currentVersion,
        hasUpdate: false,
        releaseUrl: GITHUB_RELEASES_PAGE,
        downloadUrl: GITHUB_RELEASES_PAGE,
      });
    }

    const data = (await res.json()) as {
      tag_name?: string;
      html_url?: string;
      published_at?: string;
      assets?: { name?: string; browser_download_url?: string }[];
    };

    const latestVersion = (data.tag_name || currentVersion).replace(/^v/i, '');
    const releaseUrl = data.html_url || GITHUB_RELEASES_PAGE;
    const exeAsset = (data.assets || []).find(
      (a) => a.name && a.name.toLowerCase().endsWith('.exe')
    );

    return NextResponse.json({
      currentVersion,
      latestVersion,
      hasUpdate: isNewerVersion(latestVersion, currentVersion),
      releaseUrl,
      downloadUrl: exeAsset?.browser_download_url || releaseUrl,
      publishedAt: data.published_at,
    });
  } catch {
    return NextResponse.json({
      currentVersion,
      latestVersion: currentVersion,
      hasUpdate: false,
      releaseUrl: GITHUB_RELEASES_PAGE,
      downloadUrl: GITHUB_RELEASES_PAGE,
    });
  }
}
