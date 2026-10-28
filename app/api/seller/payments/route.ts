import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { readPaymentSettings } from '@/lib/server/payment-settings';
import { notifyAdminTelegram } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }
async function authenticate(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { response: fail('Token autentikasi diperlukan.', 401) } as const;
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); }
  catch (error) { console.error('[seller-payments] Firebase Admin configuration error', error); return { response: fail('Layanan pembayaran belum dikonfigurasi operator.', 503) } as const; }
  try {
    const decoded = await services.auth.verifyIdToken(match[1], true);
    return { services, decoded } as const;
  } catch { return { response: fail('Sesi tidak valid atau telah dicabut. Silakan masuk kembali.', 401) } as const; }
}

export async function GET(request: Request) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  try {
    const db = auth.services.db;
    const settings = await readPaymentSettings(db);
    const transactionSnapshot = await db.collection('transactions').where('ownerUid', '==', auth.decoded.uid).get();
    const subscriptionDocs = transactionSnapshot.docs.filter((doc) => doc.data().type === 'subscription').sort((a, b) => {
      const av = a.data().createdAt; const bv = b.data().createdAt;
      const at = av && typeof av.toMillis === 'function' ? av.toMillis() : 0;
      const bt = bv && typeof bv.toMillis === 'function' ? bv.toMillis() : 0;
      return bt - at;
    });
    const versionCache = new Map<string, Record<string, unknown>>();
    const payments = await Promise.all(subscriptionDocs.map(async (doc) => {
      const payment = doc.data();
      const { proofPublicId, proofObjectPath, proofFormat, proofAssetVersion, ...safePayment } = payment;
      const proofUploaded = typeof proofPublicId === 'string' && proofPublicId.startsWith(`lokava/payment-proofs/${auth.decoded.uid}/${doc.id}/`);
      const versionId = typeof payment.paymentSettingsVersion === 'string' ? payment.paymentSettingsVersion : '';
      let snapshotSettings: Record<string, unknown> = settings as unknown as Record<string, unknown>;
      if (versionId) {
        if (!versionCache.has(versionId)) {
          const versionDoc = await db.collection('paymentSettingsVersions').doc(versionId).get();
          versionCache.set(versionId, versionDoc.exists ? versionDoc.data() || {} : settings as unknown as Record<string, unknown>);
        }
        snapshotSettings = versionCache.get(versionId) || settings as unknown as Record<string, unknown>;
      }
      const methods = snapshotSettings.methods as Record<string, Record<string, unknown>> | undefined;
      const method = payment.paymentMethod === 'qr' ? methods?.qr : payment.paymentMethod === 'bank' ? methods?.bank : undefined;
      let paymentDetailsSnapshot: Record<string, unknown> | null = null;
      if (method && payment.paymentMethod === 'qr') paymentDetailsSnapshot = { method: 'qr', label: method.label || 'QRIS', imageUrl: method.imageUrl || '', instructions: method.instructions || '' };
      if (method && payment.paymentMethod === 'bank') paymentDetailsSnapshot = { method: 'bank', bankName: method.bankName || '', accountName: method.accountName || '', accountNumber: method.accountNumber || '', instructions: method.instructions || '' };
      return { id: doc.id, ...safePayment, proofUploaded, paymentDetailsSnapshot };
    }));
    return NextResponse.json({ settings: { ...settings, updatedAt: undefined }, payments });
  } catch (error) {
    console.error('[seller-payments] Settings read failed', error);
    return fail('Informasi paket dan pembayaran gagal dimuat.', 500);
  }
}

export async function POST(request: Request) {
  const auth = await authenticate(request);
  if ('response' in auth) return auth.response;
  const { services, decoded } = auth;
  if (decoded.admin === true) return fail('Akun administrator tidak dapat mengajukan langganan penjual.', 403);

  let body: { planId?: unknown; paymentMethod?: unknown };
  try { body = await request.json() as { planId?: unknown; paymentMethod?: unknown }; }
  catch { return fail('Format permintaan tidak valid.', 400); }
  if (body.planId !== 'premium' && body.planId !== 'bisnis') return fail('Paket berbayar tidak valid.', 400);
  if (body.paymentMethod !== 'qr' && body.paymentMethod !== 'bank') return fail('Pilih metode pembayaran yang tersedia.', 400);

  const db = services.db;
  let settings;
  try { settings = await readPaymentSettings(db); }
  catch (error) { console.error('[seller-payments] Settings read failed', error); return fail('Pengaturan pembayaran gagal dimuat.', 500); }
  const plan = settings.plans[body.planId];
  const selectedMethod = body.paymentMethod === 'qr' ? settings.methods.qr : settings.methods.bank;
  if (!selectedMethod.enabled) return fail('Metode pembayaran ini belum diaktifkan administrator.', 409);
  if (body.paymentMethod === 'qr' && (!settings.methods.qr.imageUrl || !settings.methods.qr.publicId)) return fail('QR pembayaran belum diunggah administrator.', 409);
  if (body.paymentMethod === 'bank' && (!settings.methods.bank.bankName || !settings.methods.bank.accountName || !settings.methods.bank.accountNumber)) return fail('Informasi rekening belum lengkap.', 409);

  const transactionRef = db.collection('transactions').doc();
  const now = FieldValue.serverTimestamp();
  const paymentCode = `LOK-${transactionRef.id.slice(0, 8).toUpperCase()}`;
  try {
    await db.runTransaction(async (transaction) => {
      const existingQuery = db.collection('transactions').where('ownerUid', '==', decoded.uid);
      const existing = await transaction.get(existingQuery);
      if (existing.docs.some((item) => item.data().status === 'pending' && item.data().type === 'subscription')) throw new Error('PENDING_EXISTS');
      transaction.create(transactionRef, {
        ownerUid: decoded.uid,
        ownerEmail: typeof decoded.email === 'string' ? decoded.email : null,
        type: 'subscription', planId: body.planId, planName: plan.name,
        amount: plan.price, planPriceSnapshot: plan.price, currency: 'IDR', durationDays: plan.durationDays,
        status: 'pending', paymentCode, paymentMethod: body.paymentMethod,
        paymentSettingsVersion: settings.versionId || null,
        createdAt: now, updatedAt: now,
      });
    });
    return NextResponse.json({
      ok: true, transactionId: transactionRef.id, paymentCode,
      planId: body.planId, planName: plan.name, amount: plan.price, status: 'pending',
      paymentMethod: body.paymentMethod,
      message: 'Permintaan tercatat. Ikuti instruksi pembayaran yang ditampilkan dan pastikan nominal serta kode pembayaran sesuai.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'PENDING_EXISTS') return fail('Masih ada permintaan pembayaran yang menunggu pemeriksaan. Selesaikan atau tunggu permintaan tersebut terlebih dahulu.', 409);
    console.error('[seller-payments] Request creation failed', error);
    return fail('Permintaan paket gagal dibuat. Coba lagi nanti.', 500);
  }
}
