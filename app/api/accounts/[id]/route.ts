/**
 * API Route: /api/accounts/[id]
 *
 * DELETE – Hesabı siler
 * PATCH  – Hesap alanlarını günceller (status, notes)
 *
 * @module app/api/accounts/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';
import Account from '@/models/Account';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/accounts/[id]
 *
 * DB Mutasyonu: accounts koleksiyonundan _id'ye göre belgeyi siler.
 *
 * @returns {NextResponse} 200 – başarılı | 404 – bulunamadı | 500 – hata
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;

    const result = await Account.findByIdAndDelete(id);
    if (!result) {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/accounts/[id]
 *
 * Body (JSON): `{ "status"?: AccountStatus, "notes"?: string }`
 *
 * DB Mutasyonu: accounts koleksiyonunda belirtilen alanları günceller.
 *
 * @returns {NextResponse} 200 – güncellenmiş hesap | 404 – bulunamadı | 500 – hata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    await dbConnect();
    const { id } = await params;

    const body = await request.json();
    const allowedFields = ['status', 'notes'];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Güncellenecek alan belirtilmedi.' },
        { status: 400 }
      );
    }

    const updated = await Account.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
