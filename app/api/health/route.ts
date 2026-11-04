/**
 * API Route: /api/health
 *
 * GET – Masaüstü kabuğunun (Tauri) sunucunun gerçekten GameVault olduğunu
 * doğrulaması için kullanılan hafif sağlık kontrolü.
 *
 * Veritabanına veya harici API'lere dokunmaz; rate-limit ağırlığı yoktur.
 * Yanıttaki `app` alanı, aynı portta çalışan başka bir uygulamayla
 * karıştırılmayı önleyen imzadır.
 *
 * @module app/api/health/route
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * @returns {NextResponse} 200 – { app: 'gamevault', status: 'ok' }
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { app: 'gamevault', status: 'ok' },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}

