import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { deleteCloudinaryImage, getCloudinary, uploadCloudinaryImage } from '@/lib/server/cloudinary';
import { IMAGE_MIME_TYPES, validImageSignature } from '@/lib/server/image-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 240 * 1024;
function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return fail('Token autentikasi diperlukan.', 401);
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); getCloudinary(); }
  catch (error) { console.error('[payment-qr-upload] Configuration error', error); return fail('Firebase Admin atau Cloudinary belum dikonfigurasi.', 503); }
  let decoded;
  try { decoded = await services.auth.verifyIdToken(match[1], true); }
  catch { return fail('Sesi tidak valid atau telah dicabut.', 401); }
  if (decoded.admin !== true) return fail('Akses administrator diperlukan.', 403);
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BYTES + 64 * 1024) return fail('Permintaan unggahan terlalu besar.', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return fail('Formulir unggahan tidak valid.', 400); }
  const file = form.get('file');
  if (!(file instanceof File)) return fail('Pilih gambar QR terlebih dahulu.', 400);
  if (!IMAGE_MIME_TYPES.has(file.type)) return fail('QR harus berupa JPG, PNG, atau WebP.', 415);
  if (file.size < 1 || file.size > MAX_BYTES) return fail('Ukuran gambar QR maksimal 240 KB.', 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return fail('Isi file tidak cocok dengan format gambar.', 415);
  let uploadedPublicId = '';
  try {
    const uploaded = await uploadCloudinaryImage(bytes, { public_id: `lokava/payment-qr/${decoded.uid}/${randomUUID()}`, type: 'upload', resource_type: 'image', context: { purpose: 'lokava-payment-qr', uploaded_by: decoded.uid } });
    uploadedPublicId = uploaded.public_id;
    await services.db.collection('adminActivityLogs').add({ actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null, action: 'payment.qr.upload_cloudinary', targetCollection: 'siteSettings', targetId: 'payment', cloudinaryPublicId: uploaded.public_id, createdAt: new Date() });
    return NextResponse.json({ ok: true, imageUrl: uploaded.secure_url, publicId: uploaded.public_id, format: uploaded.format, bytes: uploaded.bytes }, { status: 201 });
  } catch (error) { if (uploadedPublicId) await deleteCloudinaryImage(uploadedPublicId, 'upload').catch(() => undefined); console.error('[payment-qr-upload] Upload failed', error); return fail('Gambar QR gagal diunggah atau dicatat. Coba lagi nanti.', 502); }
}
