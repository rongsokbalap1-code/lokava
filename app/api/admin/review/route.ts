import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { notifyAdminTelegram } from '@/lib/server/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ReviewBody = {
  collectionName?: unknown;
  recordId?: unknown;
  decision?: unknown;
  reason?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return jsonError('Token autentikasi diperlukan.', 401);

  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    console.error('[admin-review] Firebase Admin configuration error', error);
    return jsonError('Layanan admin belum dikonfigurasi oleh operator.', 503);
  }

  let decoded;
  try {
    decoded = await services.auth.verifyIdToken(match[1], true);
  } catch {
    return jsonError('Sesi tidak valid atau telah dicabut. Silakan masuk kembali.', 401);
  }
  if (decoded.admin !== true) return jsonError('Akses administrator diperlukan.', 403);

  let body: ReviewBody;
  try {
    body = await request.json() as ReviewBody;
  } catch {
    return jsonError('Format permintaan tidak valid.', 400);
  }

  const collectionName = body.collectionName;
  const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';
  const decision = body.decision;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (collectionName !== 'businesses' && collectionName !== 'products') return jsonError('Jenis data tidak diizinkan.', 400);
  if (!recordId || recordId.length > 150 || recordId.includes('/')) return jsonError('ID data tidak valid.', 400);
  if (decision !== 'approve' && decision !== 'revision') return jsonError('Keputusan tidak valid.', 400);
  if (decision === 'revision' && (reason.length < 5 || reason.length > 500)) return jsonError('Alasan revisi wajib diisi antara 5–500 karakter.', 400);

  const targetRef = services.db.collection(collectionName).doc(recordId);
  const auditRef = services.db.collection('adminActivityLogs').doc();
  const now = FieldValue.serverTimestamp();
  try {
    await services.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(targetRef);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const record = snapshot.data() || {};
      const currentStatus = record.approvalStatus || record.status;
      if (currentStatus === 'approved' || currentStatus === 'published') {
        if (decision === 'approve') throw new Error('ALREADY_APPROVED');
      }
      transaction.update(targetRef, {
        status: decision === 'approve' ? 'published' : 'rejected',
        approvalStatus: decision === 'approve' ? 'approved' : 'rejected',
        verified: decision === 'approve',
        reviewNote: decision === 'approve' ? '' : reason,
        reviewedBy: decoded.uid,
        reviewedAt: now,
        updatedAt: now,
      });
      transaction.set(auditRef, {
        actorUid: decoded.uid,
        actorEmail: typeof decoded.email === 'string' ? decoded.email : null,
        action: decision === 'approve' ? 'review.approve' : 'review.request_revision',
        targetCollection: collectionName,
        targetId: recordId,
        targetLabel: String(record.name || record.title || recordId).slice(0, 160),
        reason: decision === 'revision' ? reason : '',
        createdAt: now,
      });
    });
    void notifyAdminTelegram(`Keputusan moderasi LOKAVA\nID konten: ${recordId}\nKeputusan: ${decision === 'approve' ? 'disetujui dan dipublikasikan' : `perlu revisi: ${reason}`}\nAdmin: ${String(decoded.email || decoded.uid)}`);
    return NextResponse.json({ ok: true, auditId: auditRef.id });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return jsonError('Data yang akan ditinjau tidak ditemukan.', 404);
    if (error instanceof Error && error.message === 'ALREADY_APPROVED') return jsonError('Data ini sudah disetujui.', 409);
    console.error('[admin-review] Failed to apply review decision', error);
    return jsonError('Keputusan tidak berhasil disimpan. Periksa konfigurasi dan log server.', 500);
  }
}
