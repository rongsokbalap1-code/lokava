import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { assertCloudinaryImageExists, getCloudinary } from '@/lib/server/cloudinary';
import { notifyAdminTelegram } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return fail('Token autentikasi diperlukan.', 401);
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); }
  catch (error) {
    console.error('[admin-payments] Firebase Admin configuration error', error);
    return fail('Layanan admin belum dikonfigurasi operator.', 503);
  }
  let decoded;
  try { decoded = await services.auth.verifyIdToken(match[1], true); }
  catch { return fail('Sesi tidak valid atau telah dicabut.', 401); }
  if (decoded.admin !== true) return fail('Akses administrator diperlukan.', 403);

  let body: { transactionId?: unknown; decision?: unknown; reason?: unknown };
  try { body = await request.json() as typeof body; }
  catch { return fail('Format permintaan tidak valid.', 400); }
  const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : '';
  const decision = body.decision;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!transactionId || transactionId.length > 150 || transactionId.includes('/')) return fail('ID transaksi tidak valid.', 400);
  if (decision !== 'approve' && decision !== 'reject') return fail('Keputusan pembayaran tidak valid.', 400);
  if (decision === 'reject' && (reason.length < 5 || reason.length > 500)) return fail('Alasan penolakan wajib diisi antara 5–500 karakter.', 400);

  const db = services.db;
  const transactionRef = db.collection('transactions').doc(transactionId);
  const auditRef = db.collection('adminActivityLogs').doc();
  const now = Timestamp.now();
  let verifiedProofPublicId = '';
  if (decision === 'approve') {
    try { getCloudinary(); } catch (error) { console.error('[admin-payments] Cloudinary configuration error', error); return fail('Cloudinary belum dikonfigurasi. Bukti pembayaran wajib diperiksa sebelum aktivasi.', 503); }
    const initial = await transactionRef.get();
    if (!initial.exists) return fail('Transaksi tidak ditemukan.', 404);
    const initialData = initial.data() || {};
    verifiedProofPublicId = typeof initialData.proofPublicId === 'string' ? initialData.proofPublicId : '';
    if (!verifiedProofPublicId || typeof initialData.ownerUid !== 'string' || !verifiedProofPublicId.startsWith(`lokava/payment-proofs/${initialData.ownerUid}/${transactionId}/`)) return fail('Bukti pembayaran wajib diunggah ke Cloudinary sebelum langganan dapat diaktifkan.', 422);
    try { await assertCloudinaryImageExists(verifiedProofPublicId, 'authenticated'); }
    catch (error) { console.error('[admin-payments] Cloudinary proof existence check failed', error); return fail('Bukti pembayaran tidak ditemukan di Cloudinary. Minta penjual mengunggah ulang.', 422); }
  }
  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(transactionRef);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const payment = snapshot.data() || {};
      if (payment.status !== 'pending') throw new Error('NOT_PENDING');
      if (decision === 'approve' && payment.proofPublicId !== verifiedProofPublicId) throw new Error('PROOF_CHANGED');
      if (!['subscription','promotion'].includes(String(payment.type)) || typeof payment.ownerUid !== 'string' || !payment.ownerUid) throw new Error('INVALID_PAYMENT');
      if (payment.type === 'subscription' && !['premium', 'bisnis'].includes(String(payment.planId))) throw new Error('INVALID_PAYMENT');
      const expectedAmount = typeof payment.planPriceSnapshot === 'number' ? payment.planPriceSnapshot : payment.amount;
      if (decision === 'approve' && (!['qr', 'bank'].includes(String(payment.paymentMethod)) || typeof expectedAmount !== 'number' || !Number.isSafeInteger(expectedAmount) || expectedAmount < 0 || payment.amount !== expectedAmount)) throw new Error('INVALID_PAYMENT');
      if (payment.type === 'promotion') {
        if (typeof payment.promotionId !== 'string' || !payment.promotionId) throw new Error('INVALID_PAYMENT');
        const promotionRef = db.collection('promotions').doc(payment.promotionId);
        const promotionSnapshot = await transaction.get(promotionRef);
        if (!promotionSnapshot.exists) throw new Error('PROMOTION_NOT_FOUND');
        const promotion = promotionSnapshot.data() || {};
        if (promotion.ownerUid !== payment.ownerUid || promotion.paymentStatus === 'paid' || promotion.status !== 'pending_payment') throw new Error('PROMOTION_NOT_PENDING');
        if (decision === 'approve') {
          transaction.update(transactionRef, { status: 'paid', reviewedBy: decoded.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), reviewNote: '' });
          transaction.update(promotionRef, { paymentStatus: 'paid', status: 'content_approval_pending', approvalStatus: 'pending', paymentTransactionId: transactionId, updatedAt: FieldValue.serverTimestamp() });
        } else {
          transaction.update(transactionRef, { status: 'rejected', reviewNote: reason, reviewedBy: decoded.uid, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
          transaction.update(promotionRef, { paymentStatus: 'rejected', status: 'payment_rejected', reviewNote: reason, updatedAt: FieldValue.serverTimestamp() });
        }
        transaction.set(auditRef, { actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null, action: decision === 'approve' ? 'promotion.payment_approved' : 'promotion.payment_rejected', targetCollection: 'promotions', targetId: payment.promotionId, ownerUid: payment.ownerUid, amount: expectedAmount, reason: decision === 'reject' ? reason : '', createdAt: FieldValue.serverTimestamp() });
        return;
      }
      const durationDays = typeof payment.durationDays === 'number' && Number.isInteger(payment.durationDays) && payment.durationDays >= 1 && payment.durationDays <= 365 ? payment.durationDays : 30;

      if (decision === 'approve') {
        // The operator must verify incoming funds outside this app before approving.
        const activeSubscriptions = await transaction.get(db.collection('subscriptions').where('ownerUid', '==', payment.ownerUid));
        activeSubscriptions.docs.forEach((subscription) => {
          if (subscription.data().status === 'active') transaction.update(subscription.ref, { status: 'superseded', updatedAt: FieldValue.serverTimestamp() });
        });
        const subscriptionRef = db.collection('subscriptions').doc();
        const expiresAt = Timestamp.fromMillis(now.toMillis() + durationDays * 24 * 60 * 60 * 1000);
        transaction.create(subscriptionRef, {
          ownerUid: payment.ownerUid, transactionId, planId: payment.planId, amount: expectedAmount, currency: 'IDR', durationDays,
          status: 'active', startsAt: now, expiresAt,
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), activatedBy: decoded.uid,
        });
        transaction.update(transactionRef, {
          status: 'paid', reviewedBy: decoded.uid,
          reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), reviewNote: '',
        });
        transaction.set(auditRef, {
          actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null,
          action: 'payment.approve_and_activate_subscription', targetCollection: 'transactions',
          targetId: transactionId, ownerUid: payment.ownerUid, planId: payment.planId,
          amount: expectedAmount, createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.update(transactionRef, {
          status: 'rejected', reviewNote: reason, reviewedBy: decoded.uid,
          reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(auditRef, {
          actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null,
          action: 'payment.reject', targetCollection: 'transactions', targetId: transactionId,
          ownerUid: payment.ownerUid, planId: payment.planId, amount: typeof expectedAmount === 'number' ? expectedAmount : null, reason,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
    void notifyAdminTelegram(`Keputusan pembayaran LOKAVA\nKode transaksi: ${transactionId}\nKeputusan: ${decision==='approve'?'pembayaran disetujui setelah pemeriksaan manual':'pembayaran ditolak'}\nAdmin: ${String(decoded.email||decoded.uid)}${decision==='reject'?`\nAlasan: ${reason}`:''}`);
    return NextResponse.json({ ok: true, status: decision === 'approve' ? 'paid' : 'rejected' });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return fail('Transaksi tidak ditemukan.', 404);
    if (error instanceof Error && error.message === 'NOT_PENDING') return fail('Transaksi sudah diproses atau tidak lagi menunggu.', 409);
    if (error instanceof Error && error.message === 'INVALID_PAYMENT') return fail('Data transaksi tidak valid atau nominal tidak sesuai paket/promosi.', 422);
    if (error instanceof Error && error.message === 'PROMOTION_NOT_FOUND') return fail('Data promosi tidak ditemukan.', 404);
    if (error instanceof Error && error.message === 'PROMOTION_NOT_PENDING') return fail('Status promosi sudah berubah atau pembayaran telah diproses.', 409);
    if (error instanceof Error && error.message === 'PROOF_CHANGED') return fail('Bukti pembayaran berubah saat pemeriksaan. Muat ulang daftar transaksi.', 409);
    console.error('[admin-payments] Payment review failed', error);
    return fail('Pemeriksaan pembayaran gagal disimpan.', 500);
  }
}
