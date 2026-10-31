import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { DEFAULT_PAYMENT_SETTINGS, readPaymentSettings } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { db } = getAdminServices();
    const settings = await readPaymentSettings(db);
    return NextResponse.json({ plans: settings.plans }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    // Public marketing pages remain available before the operator configures server credentials.
    console.error('[public-plans] Falling back to initial plan values', error);
    return NextResponse.json({ plans: DEFAULT_PAYMENT_SETTINGS.plans }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  }
}
