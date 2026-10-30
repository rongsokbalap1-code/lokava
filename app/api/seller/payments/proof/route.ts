import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { notifyAdminTelegram } from '@/lib/server/telegram';
import { deleteCloudinaryImage, getCloudinary, uploadCloudinaryImage } from '@/lib/server/cloudinary';
import { IMAGE_MIME_TYPES, validImageSignature } from '@/lib/server/image-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 2 * 1024 * 1024;
function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return fail('Token autentikasi diperlukan.', 401);
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); getCloudinary(); }
  catch (error) { console.error('[seller-payment-proof] Configuration error', error); return fail('Firebase Admin atau Cloudinary belum dikonfigurasi operator.', 503); }
  let decoded;
  try { decoded = await services.auth.verifyIdToken(match[1], true); }
  catch { return fail('Sesi tidak valid atau telah dicabut. Silakan masuk kembali.', 401); }
  if (decoded.admin === true) return fail('Akun administrator tidak dapat mengunggah bukti sebagai penjual.', 403);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BYTES + 64 * 1024) return fail('Permintaan unggahan terlalu besar.', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return fail('Formulir unggahan tidak valid.', 400); }
  const transactionId = typeof form.get('transactionId') === 'string' ? String(form.get('transactionId')).trim() : '';
  const file = form.get('proof');
  if (!transactionId || transactionId.length > 150 || transactionId.includes('/')) return fail('ID transaksi tidak valid.', 400);
  if (!(file instanceof File)) return fail('Pilih file bukti pembayaran terlebih dahulu.', 400);
  if (!IMAGE_MIME_TYPES.has(file.type)) return fail('Bukti harus berupa JPG, PNG, atau WebP.', 415);
  if (file.size < 1 || file.size > MAX_BYTES) return fail('Ukuran bukti harus lebih kecil dari atau sama dengan 2 MB.', 413);

  const transactionRef = services.db.collection('transactions').doc(transactionId);
  const initial = await transactionRef.get();
  if (!initial.exists) return fail('Transaksi tidak ditemukan.', 404);
  const current = initial.data() || {};
  if (current.ownerUid !== decoded.uid) return fail('Anda tidak memiliki akses ke transaksi ini.', 403);
  if (!['subscription', 'promotion'].includes(String(current.type)) || current.status !== 'pending') return fail('Bukti hanya dapat diunggah untuk transaksi yang masih menunggu pembayaran.', 409);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return fail('Isi file tidak cocok dengan format gambar yang diizinkan.', 415);
  const publicId = `lokava/payment-proofs/${decoded.uid}/${transactionId}/${randomUUID()}`;
  let uploadedPublicId = '';
  try {
    const uploaded = await uploadCloudinaryImage(bytes, {
      public_id: publicId, type: 'authenticated', resource_type: 'image',
      context: { purpose: current.type === 'promotion' ? 'promotion-payment-proof' : 'subscription-payment-proof', owner_uid: decoded.uid, transaction_id: transactionId },
    });
    uploadedPublicId = uploaded.public_id;
    await services.db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(transactionRef);
      if (!fresh.exists) throw new Error('NOT_FOUND');
      const payment = fresh.data() || {};
      if (payment.ownerUid !== decoded.uid) throw new Error('FORBIDDEN');
      if (payment.status !== 'pending' || !['subscription', 'promotion'].includes(String(payment.type))) throw new Error('NOT_PENDING');
      transaction.update(transactionRef, {
        proofPublicId: uploaded.public_id,
        proofFormat: uploaded.format,
        proofAssetVersion: uploaded.version,
        proofUploadedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(services.db.collection('adminActivityLogs').doc(), {
        actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null,
        action: 'payment.proof_uploaded_cloudinary', targetCollection: 'transactions', targetId: transactionId,
        ownerUid: decoded.uid, cloudinaryPublicId: uploaded.public_id, createdAt: FieldValue.serverTimestamp(),
      });
    });
    const oldPublicId = typeof current.proofPublicId === 'string' ? current.proofPublicId : '';
    if (oldPublicId.startsWith(`lokava/payment-proofs/${decoded.uid}/${transactionId}/`) && oldPublicId !== uploaded.public_id) {
      await deleteCloudinaryImage(oldPublicId, 'authenticated').catch((error) => console.error('[seller-payment-proof] Old Cloudinary proof cleanup failed', error));
    }
    void notifyAdminTelegram(`Bukti pembayaran baru diunggah di LOKAVA\nKode: ${String(current.paymentCode||transactionId)}\nJenis: ${current.type==='promotion'?'promosi':'langganan'}\nNominal: Rp ${Number(current.amount||0).toLocaleString('id-ID')}\nStatus: menunggu verifikasi admin.`);
    return NextResponse.json({ ok: true, status: 'uploaded', provider: 'cloudinary' });
  } catch (error) {
    if (uploadedPublicId) await deleteCloudinaryImage(uploadedPublicId, 'authenticated').catch(() => undefined);
    if (error instanceof Error && error.message === 'NOT_FOUND') return fail('Transaksi tidak ditemukan.', 404);
    if (error instanceof Error && error.message === 'FORBIDDEN') return fail('Anda tidak memiliki akses ke transaksi ini.', 403);
    if (error instanceof Error && error.message === 'NOT_PENDING') return fail('Transaksi tidak lagi menunggu pembayaran.', 409);
    console.error('[seller-payment-proof] Cloudinary upload failed', error);
    return fail('Bukti pembayaran gagal disimpan di Cloudinary. Coba lagi nanti.', 502);
  }
}
