import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { FieldValue, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { deleteCloudinaryImage, getCloudinary, uploadCloudinaryImage } from '@/lib/server/cloudinary';
import { IMAGE_MIME_TYPES, validImageSignature } from '@/lib/server/image-validation';
import { readPaymentSettings, type PlanKey } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BYTES = 5 * 1024 * 1024;
const PLAN_KEYS = new Set<PlanKey>(['free','premium','bisnis']);
type Photo = { publicId: string; url: string; format: string; width?: number; height?: number; uploadedAt?: unknown };
function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }
function parsePhotos(value: unknown): Photo[] { return Array.isArray(value) ? value.filter((item): item is Photo => !!item && typeof item === 'object' && typeof (item as Photo).publicId === 'string' && typeof (item as Photo).url === 'string') : []; }
function timestampMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'string' || typeof value === 'number') { const millis = new Date(value).getTime(); return Number.isFinite(millis) ? millis : 0; }
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') return (value as { toMillis: () => number }).toMillis();
  return 0;
}
function activePlan(docs: QueryDocumentSnapshot[], now: number): PlanKey {
  const active = docs.map((doc) => doc.data()).filter((item) => item.status === 'active' && typeof item.planId === 'string' && PLAN_KEYS.has(item.planId as PlanKey) && (!item.expiresAt || timestampMillis(item.expiresAt) > now)).sort((a, b) => timestampMillis(b.expiresAt) - timestampMillis(a.expiresAt));
  return (active[0]?.planId as PlanKey) || 'free';
}
async function authenticate(request: Request) {
  const match = (request.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return { response: fail('Token autentikasi diperlukan.', 401) } as const;
  let services: ReturnType<typeof getAdminServices>;
  try { services = getAdminServices(); getCloudinary(); }
  catch (error) { console.error('[seller-images] Configuration error', error); return { response: fail('Firebase Admin atau Cloudinary belum dikonfigurasi.', 503) } as const; }
  try {
    const decoded = await services.auth.verifyIdToken(match[1], true);
    if (decoded.admin === true) return { response: fail('Akun administrator tidak dapat menggunakan alur unggah penjual.', 403) } as const;
    return { services, decoded } as const;
  } catch { return { response: fail('Sesi tidak valid atau telah dicabut.', 401) } as const; }
}

export async function POST(request: Request) {
  const auth = await authenticate(request); if ('response' in auth) return auth.response;
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > MAX_BYTES + 96 * 1024) return fail('Permintaan unggahan terlalu besar.', 413);
  let form: FormData;
  try { form = await request.formData(); } catch { return fail('Formulir unggahan tidak valid.', 400); }
  const recordType = form.get('recordType');
  const recordId = typeof form.get('recordId') === 'string' ? String(form.get('recordId')).trim() : '';
  const file = form.get('file');
  if (recordType !== 'business' && recordType !== 'product') return fail('Jenis rekaman tidak valid.', 400);
  if (!recordId || recordId.length > 150 || recordId.includes('/')) return fail('ID rekaman tidak valid.', 400);
  if (!(file instanceof File)) return fail('Pilih foto terlebih dahulu.', 400);
  if (!IMAGE_MIME_TYPES.has(file.type)) return fail('Foto harus berupa JPG, PNG, atau WebP.', 415);
  if (file.size < 1 || file.size > MAX_BYTES) return fail('Ukuran foto maksimal 5 MB.', 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImageSignature(bytes, file.type)) return fail('Isi file tidak cocok dengan format gambar yang diizinkan.', 415);

  const { services, decoded } = auth;
  const collectionName = recordType === 'business' ? 'businesses' : 'products';
  const targetRef = services.db.collection(collectionName).doc(recordId);
  const initial = await targetRef.get();
  if (!initial.exists) return fail('Rekaman tidak ditemukan.', 404);
  const existing = initial.data() || {};
  if (existing.ownerUid !== decoded.uid) return fail('Anda tidak memiliki akses ke rekaman ini.', 403);
  if (existing.status === 'published' || existing.approvalStatus === 'approved') return fail('Foto untuk rekaman yang sudah dipublikasikan harus diubah melalui proses tinjauan admin.', 409);

  let paymentSettings: Awaited<ReturnType<typeof readPaymentSettings>>; try { paymentSettings=await readPaymentSettings(services.db); } catch(error) { console.error('[seller-images] Payment settings read failed',error); return fail('Pengaturan kuota foto gagal dimuat.',500); }
  const publicId = `lokava/${recordType === 'business' ? 'businesses' : 'products'}/${decoded.uid}/${recordId}/${randomUUID()}`;
  let uploadedPublicId = '';
  try {
    const uploaded = await uploadCloudinaryImage(bytes, {
      public_id: publicId, type: 'upload', resource_type: 'image',
      context: { purpose: `${recordType}-photo`, owner_uid: decoded.uid, record_id: recordId },
    });
    uploadedPublicId = uploaded.public_id;
    const photo: Photo = { publicId: uploaded.public_id, url: uploaded.secure_url, format: uploaded.format, width: uploaded.width, height: uploaded.height };
    const limits = await services.db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(targetRef);
      if (!fresh.exists) throw new Error('NOT_FOUND');
      const current = fresh.data() || {};
      if (current.ownerUid !== decoded.uid) throw new Error('FORBIDDEN');
      if (current.status === 'published' || current.approvalStatus === 'approved') throw new Error('ADMIN_REVIEW_REQUIRED');
      const subscriptions = await transaction.get(services.db.collection('subscriptions').where('ownerUid', '==', decoded.uid));
      const plan = activePlan(subscriptions.docs, Date.now());
      const configuredPlan = paymentSettings.plans[plan];
      const limitsForPlan = { productPhotosPerProduct:configuredPlan.productPhotosPerProduct, productPhotosTotal:configuredPlan.productPhotosTotal, businessPhotosTotal:configuredPlan.businessPhotosTotal };
      const ownedRecords = await transaction.get(services.db.collection(collectionName).where('ownerUid', '==', decoded.uid));
      const totalPhotos = ownedRecords.docs.reduce((sum, doc) => sum + parsePhotos(doc.data().photos).length, 0);
      const currentPhotos = parsePhotos(current.photos);
      if (recordType === 'business' && totalPhotos >= limitsForPlan.businessPhotosTotal) throw new Error(`PHOTO_QUOTA:${plan}:${limitsForPlan.businessPhotosTotal}:${totalPhotos}`);
      if (recordType === 'product') {
        if (currentPhotos.length >= limitsForPlan.productPhotosPerProduct) throw new Error(`PHOTO_QUOTA:${plan}:${limitsForPlan.productPhotosPerProduct}:${currentPhotos.length}`);
        if (totalPhotos >= limitsForPlan.productPhotosTotal) throw new Error(`PHOTO_QUOTA:${plan}:${limitsForPlan.productPhotosTotal}:${totalPhotos}`);
      }
      transaction.update(targetRef, { photos: [...currentPhotos, { ...photo, uploadedAt: Timestamp.now() }], updatedAt: FieldValue.serverTimestamp() });
      transaction.set(services.db.collection('adminActivityLogs').doc(), {
        actorUid: decoded.uid, actorEmail: typeof decoded.email === 'string' ? decoded.email : null,
        action: `media.${recordType}.upload`, targetCollection: collectionName, targetId: recordId,
        cloudinaryPublicId: uploaded.public_id, planId: plan, createdAt: FieldValue.serverTimestamp(),
      });
      return { plan, used: totalPhotos + 1, limit: recordType === 'business' ? limitsForPlan.businessPhotosTotal : plan === 'free' ? limitsForPlan.productPhotosTotal : limitsForPlan.productPhotosPerProduct };
    });
    return NextResponse.json({ ok: true, provider: 'cloudinary', photo, ...limits }, { status: 201 });
  } catch (error) {
    if (uploadedPublicId) await deleteCloudinaryImage(uploadedPublicId, 'upload').catch(() => undefined);
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return fail('Rekaman tidak ditemukan.', 404);
    if (code === 'FORBIDDEN') return fail('Anda tidak memiliki akses ke rekaman ini.', 403);
    if (code === 'ADMIN_REVIEW_REQUIRED') return fail('Rekaman sudah dipublikasikan dan memerlukan tinjauan administrator untuk perubahan foto.', 409);
    if (code.startsWith('PHOTO_QUOTA:')) {
      const [, plan, limit, used] = code.split(':');
      return NextResponse.json({ error: `Kuota foto paket ${plan.toUpperCase()} telah tercapai (${used}/${limit}).`, plan, limit: Number(limit), used: Number(used) }, { status: 409 });
    }
    console.error('[seller-images] Cloudinary upload failed', error);
    return fail('Foto gagal diunggah ke Cloudinary. Coba lagi nanti.', 502);
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticate(request); if ('response' in auth) return auth.response;
  let body: { recordType?: unknown; recordId?: unknown; publicId?: unknown };
  try { body = await request.json() as typeof body; } catch { return fail('Format permintaan tidak valid.', 400); }
  const recordType = body.recordType;
  const recordId = typeof body.recordId === 'string' ? body.recordId.trim() : '';
  const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';
  if ((recordType !== 'business' && recordType !== 'product') || !recordId || recordId.length > 150 || recordId.includes('/') || !publicId || publicId.length > 500) return fail('Data foto tidak valid.', 400);
  const collectionName = recordType === 'business' ? 'businesses' : 'products';
  const ref = auth.services.db.collection(collectionName).doc(recordId);
  try {
    await auth.services.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const record = snapshot.data() || {};
      if (record.ownerUid !== auth.decoded.uid) throw new Error('FORBIDDEN');
      if (record.status === 'published' || record.approvalStatus === 'approved') throw new Error('ADMIN_REVIEW_REQUIRED');
      const photos = parsePhotos(record.photos);
      const target = photos.find((photo) => photo.publicId === publicId && photo.publicId.startsWith(`lokava/${recordType === 'business' ? 'businesses' : 'products'}/${auth.decoded.uid}/${recordId}/`));
      if (!target) throw new Error('PHOTO_NOT_FOUND');
      transaction.update(ref, { photos: photos.filter((photo) => photo.publicId !== publicId), updatedAt: FieldValue.serverTimestamp() });
      transaction.set(auth.services.db.collection('adminActivityLogs').doc(), {
        actorUid: auth.decoded.uid, actorEmail: typeof auth.decoded.email === 'string' ? auth.decoded.email : null,
        action: `media.${recordType}.delete`, targetCollection: collectionName, targetId: recordId,
        cloudinaryPublicId: publicId, createdAt: FieldValue.serverTimestamp(),
      });
    });
    let cleanupPending = false;
    try { await deleteCloudinaryImage(publicId, 'upload'); }
    catch (error) { cleanupPending = true; console.error('[seller-images] Cloudinary cleanup pending', publicId, error); }
    return NextResponse.json({ ok: true, provider: 'cloudinary', cleanupPending });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return fail('Rekaman tidak ditemukan.', 404);
    if (code === 'FORBIDDEN') return fail('Anda tidak memiliki akses ke rekaman ini.', 403);
    if (code === 'ADMIN_REVIEW_REQUIRED') return fail('Foto rekaman yang sudah dipublikasikan tidak dapat dihapus oleh penjual.', 409);
    if (code === 'PHOTO_NOT_FOUND') return fail('Foto tidak ditemukan pada rekaman ini.', 404);
    console.error('[seller-images] Delete failed', error);
    return fail('Foto gagal dihapus. Periksa koneksi Cloudinary.', 502);
  }
}
