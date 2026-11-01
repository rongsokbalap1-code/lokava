import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { assertCloudinaryImageExists, authenticatedCloudinaryImageUrl, getCloudinary } from '@/lib/server/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function GET(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return fail('Token autentikasi diperlukan.', 401);
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); getCloudinary(); }
  catch (error) { console.error('[admin-payment-proof] Configuration error', error); return fail('Firebase Admin atau Cloudinary belum dikonfigurasi.', 503); }
  let decoded;
  try { decoded = await services.auth.verifyIdToken(match[1], true); }
  catch { return fail('Sesi tidak valid atau telah dicabut.', 401); }
  if (decoded.admin !== true) return fail('Akses administrator diperlukan.', 403);

  const transactionId = new URL(request.url).searchParams.get('transactionId')?.trim() || '';
  if (!transactionId || transactionId.length > 150 || transactionId.includes('/')) return fail('ID transaksi tidak valid.', 400);
  try {
    const snapshot = await services.db.collection('transactions').doc(transactionId).get();
    if (!snapshot.exists) return fail('Transaksi tidak ditemukan.', 404);
    const payment = snapshot.data() || {};
    const publicId = typeof payment.proofPublicId === 'string' ? payment.proofPublicId : '';
    const ownerUid = typeof payment.ownerUid === 'string' ? payment.ownerUid : '';
    if (!ownerUid || !publicId || !publicId.startsWith(`lokava/payment-proofs/${ownerUid}/${transactionId}/`)) return fail('Bukti pembayaran Cloudinary belum diunggah atau lokasinya tidak valid.', 404);
    await assertCloudinaryImageExists(publicId, 'authenticated');
    const url = authenticatedCloudinaryImageUrl(publicId, typeof payment.proofFormat === 'string' ? payment.proofFormat : 'jpg');
    return NextResponse.json({ url, delivery: 'cloudinary-authenticated-signed-url' });
  } catch (error) {
    console.error('[admin-payment-proof] Cloudinary URL generation failed', error);
    return fail('Bukti pembayaran tidak dapat dibuka. Periksa asset di Cloudinary.', 502);
  }
}
