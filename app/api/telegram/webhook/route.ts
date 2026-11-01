import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { assertCloudinaryImageExists, getCloudinary } from '@/lib/server/cloudinary';
import { notifyAdminTelegram, telegramApiRequest, type TelegramActionType } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TelegramActor = { id: number; first_name?: string; last_name?: string; username?: string };
type TelegramMessage = { message_id: number; chat: { id: number | string }; text?: string; caption?: string; photo?: unknown[] };
type TelegramCallback = { id: string; data?: string; from: TelegramActor; message?: TelegramMessage };
function actorLabel(actor: TelegramActor) { return actor.username ? `@${actor.username}` : [actor.first_name, actor.last_name].filter(Boolean).join(' ') || `Telegram ${actor.id}`; }
function fail(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }

async function saveReview(type: 'business' | 'product', id: string, decision: 'approve' | 'reject', actor: TelegramActor) {
  const { db } = getAdminServices();
  const collectionName = type === 'business' ? 'businesses' : 'products';
  const ref = db.collection(collectionName).doc(id);
  const auditRef = db.collection('adminActivityLogs').doc();
  const actorUid = `telegram:${actor.id}`;
  const actorName = actorLabel(actor);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('NOT_FOUND');
    const record = snap.data() || {};
    if (record.approvalStatus !== 'pending' || ['published', 'archived'].includes(String(record.status))) throw new Error('ALREADY_DECIDED');
    const now = FieldValue.serverTimestamp();
    const reason = decision === 'reject' ? `Ditolak melalui grup Telegram oleh ${actorName}.` : '';
    tx.update(ref, {
      status: decision === 'approve' ? 'published' : 'rejected',
      approvalStatus: decision === 'approve' ? 'approved' : 'rejected',
      verified: decision === 'approve', reviewNote: reason,
      reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName },
      reviewedAt: now, updatedAt: now,
    });
    tx.set(auditRef, {
      actorUid, actorEmail: null, actorTelegramId: actor.id, actorTelegramName: actorName,
      action: `${type}.${decision === 'approve' ? 'approved' : 'rejected'}`,
      targetCollection: collectionName, targetId: id,
      targetLabel: String(record.name || record.title || id).slice(0, 160), reason,
      source: 'telegram_group', createdAt: now,
    });
  });
  return { label: type === 'business' ? 'Profil usaha' : 'Produk', decision: decision === 'approve' ? 'disetujui' : 'ditolak' };
}

async function savePayment(id: string, decision: 'approve' | 'reject', actor: TelegramActor) {
  const { db } = getAdminServices();
  const paymentRef = db.collection('transactions').doc(id);
  const initial = await paymentRef.get();
  if (!initial.exists) throw new Error('NOT_FOUND');
  const initialPayment = initial.data() || {};
  const proofPublicId = typeof initialPayment.proofPublicId === 'string' ? initialPayment.proofPublicId : '';
  if (decision === 'approve') {
    getCloudinary();
    if (!proofPublicId || typeof initialPayment.ownerUid !== 'string' || !proofPublicId.startsWith(`lokava/payment-proofs/${initialPayment.ownerUid}/${id}/`)) throw new Error('PROOF_REQUIRED');
    await assertCloudinaryImageExists(proofPublicId, 'authenticated');
  }
  const actorUid = `telegram:${actor.id}`;
  const actorName = actorLabel(actor);
  const auditRef = db.collection('adminActivityLogs').doc();
  const now = Timestamp.now();
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(paymentRef);
    if (!snap.exists) throw new Error('NOT_FOUND');
    const payment = snap.data() || {};
    if (payment.status !== 'pending') throw new Error('ALREADY_DECIDED');
    if (decision === 'approve' && payment.proofPublicId !== proofPublicId) throw new Error('PROOF_CHANGED');
    if (!['subscription', 'promotion'].includes(String(payment.type)) || typeof payment.ownerUid !== 'string' || !payment.ownerUid) throw new Error('INVALID_PAYMENT');
    const expectedAmount = typeof payment.planPriceSnapshot === 'number' ? payment.planPriceSnapshot : payment.amount;
    if (decision === 'approve' && (!['qr', 'bank'].includes(String(payment.paymentMethod)) || typeof expectedAmount !== 'number' || !Number.isSafeInteger(expectedAmount) || expectedAmount < 0 || payment.amount !== expectedAmount)) throw new Error('INVALID_PAYMENT');
    const reason = decision === 'reject' ? `Ditolak melalui grup Telegram oleh ${actorName}.` : '';
    if (payment.type === 'promotion') {
      if (typeof payment.promotionId !== 'string' || !payment.promotionId) throw new Error('INVALID_PAYMENT');
      const promoRef = db.collection('promotions').doc(payment.promotionId);
      const promoSnap = await tx.get(promoRef);
      if (!promoSnap.exists) throw new Error('PROMOTION_NOT_FOUND');
      const promo = promoSnap.data() || {};
      if (promo.targetType === 'businesses') throw new Error('BUSINESS_PROMOTION_DISABLED');
      if (promo.ownerUid !== payment.ownerUid || promo.paymentStatus !== 'pending' || promo.status !== 'pending_payment') throw new Error('ALREADY_DECIDED');
      if (decision === 'approve') {
        tx.update(paymentRef, { status: 'paid', reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), reviewNote: '' });
        tx.update(promoRef, { paymentStatus: 'paid', status: 'content_approval_pending', approvalStatus: 'pending', paymentTransactionId: id, updatedAt: FieldValue.serverTimestamp() });
      } else {
        tx.update(paymentRef, { status: 'rejected', reviewNote: reason, reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        tx.update(promoRef, { paymentStatus: 'rejected', status: 'payment_rejected', reviewNote: reason, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.set(auditRef, { actorUid, actorEmail: null, actorTelegramId: actor.id, actorTelegramName: actorName, action: decision === 'approve' ? 'promotion.payment_approved' : 'promotion.payment_rejected', targetCollection: 'promotions', targetId: payment.promotionId, ownerUid: payment.ownerUid, amount: expectedAmount, reason, source: 'telegram_group', createdAt: FieldValue.serverTimestamp() });
      return { type: 'promotion' as const, promotionId: payment.promotionId, targetName: String(promo.targetName || payment.targetName || 'Produk promosi') };
    }
    if (!['premium', 'bisnis'].includes(String(payment.planId))) throw new Error('INVALID_PAYMENT');
    if (decision === 'approve') {
      const active = await tx.get(db.collection('subscriptions').where('ownerUid', '==', payment.ownerUid));
      active.docs.forEach((doc) => { if (doc.data().status === 'active') tx.update(doc.ref, { status: 'superseded', updatedAt: FieldValue.serverTimestamp() }); });
      const durationDays = typeof payment.durationDays === 'number' && Number.isInteger(payment.durationDays) && payment.durationDays >= 1 && payment.durationDays <= 365 ? payment.durationDays : 30;
      const subscriptionRef = db.collection('subscriptions').doc();
      tx.create(subscriptionRef, { ownerUid: payment.ownerUid, transactionId: id, planId: payment.planId, amount: expectedAmount, currency: 'IDR', durationDays, status: 'active', startsAt: now, expiresAt: Timestamp.fromMillis(now.toMillis() + durationDays * 24 * 60 * 60 * 1000), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), activatedBy: actorUid });
      tx.update(paymentRef, { status: 'paid', reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), reviewNote: '' });
    } else {
      tx.update(paymentRef, { status: 'rejected', reviewNote: reason, reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    tx.set(auditRef, { actorUid, actorEmail: null, actorTelegramId: actor.id, actorTelegramName: actorName, action: decision === 'approve' ? 'payment.approve_and_activate_subscription' : 'payment.reject', targetCollection: 'transactions', targetId: id, ownerUid: payment.ownerUid, planId: payment.planId, amount: expectedAmount, reason, source: 'telegram_group', createdAt: FieldValue.serverTimestamp() });
    return { type: 'subscription' as const };
  });
  return result;
}

async function savePromotion(id: string, decision: 'approve' | 'reject', actor: TelegramActor) {
  const { db } = getAdminServices();
  const promoRef = db.collection('promotions').doc(id);
  const auditRef = db.collection('adminActivityLogs').doc();
  const actorUid = `telegram:${actor.id}`;
  const actorName = actorLabel(actor);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(promoRef);
    if (!snap.exists) throw new Error('NOT_FOUND');
    const promo = snap.data() || {};
    if (promo.targetType === 'businesses') throw new Error('BUSINESS_PROMOTION_DISABLED');
    if (promo.status !== 'content_approval_pending' || promo.paymentStatus !== 'paid') throw new Error('ALREADY_DECIDED');
    const targetCollection = promo.targetType === 'businesses' ? 'businesses' : 'products';
    const targetRef = db.collection(targetCollection).doc(String(promo.targetId || ''));
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists) throw new Error('TARGET_MISSING');
    const target = targetSnap.data() || {};
    if (target.ownerUid !== promo.ownerUid || target.status !== 'published' || target.approvalStatus !== 'approved' || target.verified !== true) throw new Error('TARGET_NOT_PUBLISHED');
    if (targetCollection === 'products') {
      const businessId = typeof target.businessId === 'string' ? target.businessId : '';
      if (businessId) {
        const businessSnap = await tx.get(db.collection('businesses').doc(businessId));
        const business = businessSnap.data() || {};
        if (!businessSnap.exists || business.ownerUid !== promo.ownerUid || business.status !== 'published' || business.approvalStatus !== 'approved' || business.verified !== true) throw new Error('TARGET_NOT_PUBLISHED');
      } else {
        const businessQuery = await tx.get(db.collection('businesses').where('ownerUid', '==', promo.ownerUid).where('status', '==', 'published'));
        if (!businessQuery.docs.some((doc) => doc.data().approvalStatus === 'approved' && doc.data().verified === true)) throw new Error('TARGET_NOT_PUBLISHED');
      }
    }
    const reason = decision === 'reject' ? `Ditolak melalui grup Telegram oleh ${actorName}.` : '';
    if (decision === 'approve') {
      const duration = typeof promo.durationDays === 'number' && [7, 14, 21, 30].includes(promo.durationDays) ? promo.durationDays : 7;
      const startsAt = Timestamp.now();
      tx.update(promoRef, { status: 'active', approvalStatus: 'approved', startsAt, endsAt: Timestamp.fromMillis(startsAt.toMillis() + duration * 24 * 60 * 60 * 1000), reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), reviewNote: '', updatedAt: FieldValue.serverTimestamp() });
    } else {
      tx.update(promoRef, { status: 'rejected', approvalStatus: 'rejected', reviewNote: reason, reviewedBy: actorUid, reviewedByTelegram: { id: actor.id, username: actor.username || null, name: actorName }, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    tx.set(auditRef, { actorUid, actorEmail: null, actorTelegramId: actor.id, actorTelegramName: actorName, action: decision === 'approve' ? 'promotion.content_approved' : 'promotion.content_rejected', targetCollection: 'promotions', targetId: id, ownerUid: promo.ownerUid, reason, source: 'telegram_group', createdAt: FieldValue.serverTimestamp() });
    return { targetName: String(promo.targetName || target.title || target.name || 'Produk'), decision };
  });
  return result;
}

function friendlyActionError(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const messages: Record<string, string> = {
    NOT_FOUND: 'Data tidak ditemukan.', ALREADY_DECIDED: 'Pengajuan ini sudah diputuskan atau statusnya berubah.',
    PROOF_REQUIRED: 'Bukti pembayaran belum tersedia. Minta penjual mengunggah ulang.', PROOF_CHANGED: 'Bukti pembayaran berubah. Muat ulang notifikasi.',
    INVALID_PAYMENT: 'Data pembayaran tidak valid.', PROMOTION_NOT_FOUND: 'Data promosi tidak ditemukan.',
    TARGET_MISSING: 'Produk promosi tidak ditemukan.', TARGET_NOT_PUBLISHED: 'Produk atau profil usaha belum disetujui.',
    BUSINESS_PROMOTION_DISABLED: 'Promosi profil usaha sudah tidak tersedia. Pilih promosi produk.',
  };
  return messages[code] || 'Tindakan gagal disimpan. Periksa log server.';
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret || request.headers.get('x-telegram-bot-api-secret-token') !== expectedSecret) return fail('Webhook tidak diizinkan.', 401);
  let update: { callback_query?: TelegramCallback };
  try { update = await request.json() as typeof update; } catch { return fail('Format update Telegram tidak valid.'); }
  const callback = update.callback_query;
  if (!callback) return NextResponse.json({ ok: true });
  const message = callback.message;
  const configuredChat = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!message || !configuredChat || String(message.chat.id) !== configuredChat) {
    await telegramApiRequest('answerCallbackQuery', { callback_query_id: callback.id, text: 'Grup ini tidak diizinkan.', show_alert: true });
    return NextResponse.json({ ok: true });
  }
  const membership = await telegramApiRequest('getChatMember', { chat_id: message.chat.id, user_id: callback.from.id });
  const memberResult = membership.result as { status?: string; is_member?: boolean } | undefined;
  const isAllowedMember = membership.ok && !!memberResult &&
    (memberResult.status === 'creator' || memberResult.status === 'administrator' ||
      memberResult.status === 'member' || (memberResult.status === 'restricted' && memberResult.is_member === true));
  if (!isAllowedMember) {
    await telegramApiRequest('answerCallbackQuery', { callback_query_id: callback.id, text: 'Hanya anggota grup LOKAVA yang dapat mengambil keputusan.', show_alert: true });
    return NextResponse.json({ ok: true });
  }
  const match = (callback.data || '').match(/^lokava\|(business|product|payment|promotion)\|([A-Za-z0-9_-]{1,32})\|(approve|reject)$/);
  if (!match) {
    await telegramApiRequest('answerCallbackQuery', { callback_query_id: callback.id, text: 'Tombol tidak valid.', show_alert: true });
    return NextResponse.json({ ok: true });
  }
  const type = match[1] as TelegramActionType;
  const id = match[2];
  const decision = match[3] as 'approve' | 'reject';
  try {
    let summary: string;
    let nextPromotion: { id: string; targetName: string } | null = null;
    if (type === 'business' || type === 'product') {
      const result = await saveReview(type, id, decision, callback.from);
      summary = `${result.label} ${result.decision}.`;
    } else if (type === 'payment') {
      const result = await savePayment(id, decision, callback.from);
      summary = `Pembayaran ${decision === 'approve' ? 'disetujui' : 'ditolak'}.`;
      if (result.type === 'promotion' && decision === 'approve') nextPromotion = { id: result.promotionId, targetName: result.targetName };
    } else {
      const result = await savePromotion(id, decision, callback.from);
      summary = `Promosi produk ${result.decision === 'approve' ? 'disetujui dan mulai tayang' : 'ditolak'}.`;
    }
    const actorName = actorLabel(callback.from);
    await telegramApiRequest('answerCallbackQuery', { callback_query_id: callback.id, text: summary, show_alert: false });
    const editedText = `${message.caption || message.text || 'LOKAVA'}\n\n${summary}\nDiputuskan oleh: ${actorName}`.slice(0, 1000);
    if (Array.isArray(message.photo) && message.photo.length) {
      await telegramApiRequest('editMessageCaption', { chat_id: message.chat.id, message_id: message.message_id, caption: editedText, reply_markup: { inline_keyboard: [] } });
    } else {
      await telegramApiRequest('editMessageText', { chat_id: message.chat.id, message_id: message.message_id, text: editedText.slice(0, 3900), reply_markup: { inline_keyboard: [] }, disable_web_page_preview: true });
    }
    if (nextPromotion) {
      await notifyAdminTelegram(
        `Promosi menunggu persetujuan akhir\nProduk: ${nextPromotion.targetName}\nPembayaran sudah disetujui. Periksa produk dan tentukan apakah promosi boleh ditayangkan.`,
        { type: 'promotion', id: nextPromotion.id },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const description = friendlyActionError(error);
    console.error('[telegram-webhook] action failed', type, id, error);
    await telegramApiRequest('answerCallbackQuery', { callback_query_id: callback.id, text: description, show_alert: true });
    return NextResponse.json({ ok: true });
  }
}
