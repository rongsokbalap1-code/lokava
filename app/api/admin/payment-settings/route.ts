import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { readPaymentSettings, validatePaymentSettings } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }
async function authorize(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { response: fail('Token autentikasi diperlukan.', 401) } as const;
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); }
  catch (error) { console.error('[payment-settings] Firebase Admin configuration error', error); return { response: fail('Layanan admin belum dikonfigurasi operator.', 503) } as const; }
  try {
    const decoded = await services.auth.verifyIdToken(match[1], true);
    if (decoded.admin !== true) return { response: fail('Akses administrator diperlukan.', 403) } as const;
    return { services, decoded } as const;
  } catch { return { response: fail('Sesi tidak valid atau telah dicabut.', 401) } as const; }
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ('response' in auth) return auth.response;
  try { return NextResponse.json({ settings: await readPaymentSettings(auth.services.db) }); }
  catch (error) { console.error('[payment-settings] Read failed', error); return fail('Pengaturan pembayaran gagal dimuat.', 500); }
}

export async function PUT(request: Request) {
  const auth = await authorize(request);
  if ('response' in auth) return auth.response;
  let body: { settings?: unknown };
  try { body = await request.json() as { settings?: unknown }; }
  catch { return fail('Format permintaan tidak valid.', 400); }
  const settings = validatePaymentSettings(body.settings);
  if (!settings) return fail('Pengaturan tidak valid. Periksa harga, informasi rekening, dan file QR (PNG/JPG/WebP maks. sekitar 250 KB).', 400);
  try {
    const ref = auth.services.db.collection('siteSettings').doc('payment');
    const versionRef = auth.services.db.collection('paymentSettingsVersions').doc();
    const auditRef = auth.services.db.collection('adminActivityLogs').doc();
    await auth.services.db.runTransaction(async (transaction) => {
      const timestamp = FieldValue.serverTimestamp();
      transaction.set(versionRef, { ...settings, versionId: versionRef.id, createdAt: timestamp, createdBy: auth.decoded.uid });
      transaction.set(ref, { ...settings, versionId: versionRef.id, updatedBy: auth.decoded.uid, updatedAt: timestamp }, { merge: false });
      transaction.set(auditRef, {
        actorUid: auth.decoded.uid,
        actorEmail: typeof auth.decoded.email === 'string' ? auth.decoded.email : null,
        action: 'payment_settings.update', targetCollection: 'siteSettings', targetId: 'payment', versionId: versionRef.id,
        planPrices: { free: settings.plans.free.price, premium: settings.plans.premium.price, bisnis: settings.plans.bisnis.price },
        qrEnabled: settings.methods.qr.enabled, bankEnabled: settings.methods.bank.enabled,
        createdAt: timestamp,
      });
    });
    return NextResponse.json({ ok: true, settings: await readPaymentSettings(auth.services.db) });
  } catch (error) { console.error('[payment-settings] Save failed', error); return fail('Pengaturan pembayaran gagal disimpan.', 500); }
}
