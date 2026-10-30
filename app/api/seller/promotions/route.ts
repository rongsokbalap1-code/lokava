import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { readPaymentSettings } from '@/lib/server/payment-settings';
import { PROMOTION_LABELS, readPromotionSettings, type PromotionKind } from '@/lib/server/promotions';
import { notifyAdminTelegram } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function fail(error: string, status = 400) { return NextResponse.json({ error }, { status }); }
async function authSeller(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { error: fail('Token autentikasi diperlukan.', 401) } as const;
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); } catch { return { error: fail('Layanan server belum dikonfigurasi.', 503) } as const; }
  try { const decoded = await services.auth.verifyIdToken(match[1], true); if (decoded.admin === true) return { error: fail('Akun administrator tidak dapat mengajukan promosi sebagai seller.', 403) } as const; return { services, decoded } as const; }
  catch { return { error: fail('Sesi tidak valid. Silakan masuk kembali.', 401) } as const; }
}
export async function GET(request: Request) {
  const auth = await authSeller(request); if ('error' in auth) return auth.error;
  try {
    const db = auth.services.db;
    const [promotions, settings, paymentSettings] = await Promise.all([
      db.collection('promotions').where('ownerUid','==',auth.decoded.uid).get(), readPromotionSettings(db), readPaymentSettings(db),
    ]);
    const transactions = await db.collection('transactions').where('ownerUid','==',auth.decoded.uid).get();
    const paymentMap = new Map(transactions.docs.filter(d => d.data().type === 'promotion').map(d => { const data=d.data(); const proofPublicId=data.proofPublicId; const safe={...data}; delete safe.proofPublicId; delete safe.proofFormat; delete safe.proofAssetVersion; const proofUploaded=typeof proofPublicId==='string'&&proofPublicId.startsWith(`lokava/payment-proofs/${auth.decoded.uid}/${d.id}/`); return [d.id,{id:d.id,...safe,proofUploaded,paymentDetailsSnapshot:data.paymentDetailsSnapshot||null}] as const; }));
    const items = promotions.docs.map(d => ({ id:d.id, ...d.data() }));
    const paymentItems = [...paymentMap.values()].sort((a,b) => String((b as Record<string,unknown>).createdAt || '').localeCompare(String((a as Record<string,unknown>).createdAt || '')));
    return NextResponse.json({ promotions: items, payments: paymentItems, settings, paymentSettings: { methods: paymentSettings.methods } }, { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { console.error('[seller-promotions] GET failed',error); return fail('Data promosi gagal dimuat.',500); }
}
export async function POST(request: Request) {
  const auth = await authSeller(request); if ('error' in auth) return auth.error;
  let body: Record<string, unknown>; try { body = await request.json() as Record<string, unknown>; } catch { return fail('Format permintaan tidak valid.'); }
  const kind = body.kind as PromotionKind;
  if (!['product_featured','category','business_featured','homepage_banner'].includes(kind)) return fail('Jenis promosi tidak valid.');
  const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : '';
  const durationDays = Number(body.durationDays);
  if (!targetId || targetId.length > 150 || targetId.includes('/')) return fail('Pilih produk atau usaha yang akan dipromosikan.');
  const db = auth.services.db;
  const settings = await readPromotionSettings(db);
  if (!settings.durations.includes(durationDays)) return fail('Durasi promosi tidak tersedia.');
  const requestedTargetType = body.targetType;
  if (requestedTargetType !== 'product' && requestedTargetType !== 'business') return fail('Jenis konten promosi tidak valid.');
  if (kind === 'business_featured' && requestedTargetType !== 'business') return fail('Usaha unggulan harus menggunakan profil usaha.');
  if (kind !== 'business_featured' && kind !== 'homepage_banner' && requestedTargetType !== 'product') return fail('Jenis promosi ini hanya mendukung produk.');
  const collectionName = requestedTargetType === 'business' ? 'businesses' : 'products';
  const targetRef = db.collection(collectionName).doc(targetId);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) return fail('Konten yang dipilih tidak ditemukan.',404);
  const target = targetSnap.data() || {};
  if (target.ownerUid !== auth.decoded.uid) return fail('Konten ini bukan milik akun Anda.',403);
  if (target.status !== 'published' || target.approvalStatus !== 'approved') return fail('Hanya konten yang sudah dipublikasikan dan disetujui admin yang dapat dipromosikan.',409);
  const method = body.paymentMethod;
  if (method !== 'qr' && method !== 'bank') return fail('Pilih metode pembayaran.');
  const paymentSettings = await readPaymentSettings(db);
  const selectedMethod = method === 'qr' ? paymentSettings.methods.qr : paymentSettings.methods.bank;
  if (!selectedMethod.enabled) return fail('Metode pembayaran ini belum diaktifkan administrator.',409);
  if (method === 'qr' && (!paymentSettings.methods.qr.imageUrl || !paymentSettings.methods.qr.publicId)) return fail('QR pembayaran belum tersedia.',409);
  if (method === 'bank' && (!paymentSettings.methods.bank.bankName || !paymentSettings.methods.bank.accountName || !paymentSettings.methods.bank.accountNumber)) return fail('Informasi rekening belum lengkap.',409);
  const amount = Math.round(settings.prices[kind] * durationDays / 7);
  if (!Number.isSafeInteger(amount) || amount < 0) return fail('Harga promosi tidak valid.',500);
  const promoRef = db.collection('promotions').doc(); const txRef = db.collection('transactions').doc();
  const paymentCode = `LOK-PROMO-${txRef.id.slice(0,8).toUpperCase()}`;
  const targetName = String(target.title || target.name || 'Konten seller').slice(0,120);
  const paymentDetailsSnapshot = method === 'qr'
    ? { method:'qr', label:paymentSettings.methods.qr.label, imageUrl:paymentSettings.methods.qr.imageUrl, instructions:paymentSettings.methods.qr.instructions }
    : { method:'bank', bankName:paymentSettings.methods.bank.bankName, accountName:paymentSettings.methods.bank.accountName, accountNumber:paymentSettings.methods.bank.accountNumber, instructions:paymentSettings.methods.bank.instructions };
  try {
    await db.runTransaction(async transaction => {
      transaction.create(promoRef, { ownerUid:auth.decoded.uid, ownerEmail:typeof auth.decoded.email === 'string' ? auth.decoded.email : null, kind, kindLabel:PROMOTION_LABELS[kind], targetType:collectionName, targetId, targetName, durationDays, price:amount, currency:'IDR', status:'pending_payment', approvalStatus:'pending_payment', paymentStatus:'pending', createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
      transaction.create(txRef, { ownerUid:auth.decoded.uid, ownerEmail:typeof auth.decoded.email === 'string' ? auth.decoded.email : null, type:'promotion', promotionId:promoRef.id, promotionKind:kind, promotionName:PROMOTION_LABELS[kind], targetId, targetName, amount, planPriceSnapshot:amount, currency:'IDR', durationDays, status:'pending', paymentCode, paymentMethod:method, paymentDetailsSnapshot, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
      transaction.set(db.collection('adminActivityLogs').doc(), { actorUid:auth.decoded.uid, actorEmail:typeof auth.decoded.email === 'string' ? auth.decoded.email : null, action:'promotion.request_created', targetCollection:'promotions', targetId:promoRef.id, amount, kind, createdAt:FieldValue.serverTimestamp() });
    });
    void notifyAdminTelegram(`Permintaan promosi baru di LOKAVA\nKonten: ${targetName}\nJenis: ${PROMOTION_LABELS[kind]}\nNominal: Rp ${amount.toLocaleString('id-ID')}\nKode pembayaran: ${paymentCode}\nMenunggu pembayaran dan verifikasi admin.`);
    return NextResponse.json({ ok:true, promotionId:promoRef.id, transactionId:txRef.id, paymentCode, amount, durationDays, kindLabel:PROMOTION_LABELS[kind] },{status:201});
  } catch (error) { console.error('[seller-promotions] create failed',error); return fail('Permintaan promosi gagal dibuat.',500); }
}
