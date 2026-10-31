import { NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { deleteCloudinaryImage } from '@/lib/server/cloudinary';
import { notifyAdminTelegram } from '@/lib/server/telegram';
import { extractGoogleMapsCoordinates, normalizeGoogleMapsUrl } from '@/lib/maps';
import { readPaymentSettings, type PlanKey } from '@/lib/server/payment-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PLAN_KEYS = new Set<PlanKey>(['free','premium','bisnis']);
const CATEGORIES = new Set(['Kuliner', 'Penginapan', 'Wisata', 'Kerajinan', 'Jasa', 'Lainnya']);

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function validText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function normalizeWhatsApp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let digits = value.replace(/[\s()+.-]/g, '').replace(/[^0-9]/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= min && number <= max ? number : Number.NaN;
}

function validateMapsUrl(value: unknown): string | null {
  if (value === '' || value === null || value === undefined) return null;
  const safeUrl=normalizeGoogleMapsUrl(value);
  if(!safeUrl)throw new Error('INVALID_MAPS_URL');
  return safeUrl;
}

function coordinatesFromMapsUrl(value: string | null): { latitude: number; longitude: number } | null {
  return extractGoogleMapsCoordinates(value);
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return fail('Token autentikasi diperlukan.', 401);

  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    console.error('[seller-records] Firebase Admin configuration error', error);
    return fail('Layanan server belum dikonfigurasi oleh operator.', 503);
  }

  let decoded;
  try {
    decoded = await services.auth.verifyIdToken(tokenMatch[1], true);
  } catch {
    return fail('Sesi tidak valid atau telah dicabut. Silakan masuk kembali.', 401);
  }
  if (decoded.admin === true) return fail('Akun administrator tidak dapat menggunakan alur penjual.', 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return fail('Format permintaan tidak valid.', 400);
  }

  const db = services.db;
  const now = FieldValue.serverTimestamp();
  const ownerUid = decoded.uid;

  if (body.type === 'business') {
    if (!validText(body.name, 2, 100)) return fail('Nama usaha wajib diisi (2–100 karakter).', 400);
    if (typeof body.category !== 'string' || !CATEGORIES.has(body.category)) return fail('Kategori usaha tidak valid.', 400);
    if (!validText(body.description, 5, 1000)) return fail('Deskripsi usaha wajib diisi (5–1.000 karakter).', 400);
    if (!validText(body.whatsapp, 8, 30)) return fail('Nomor WhatsApp wajib diisi.', 400);
    const whatsapp = normalizeWhatsApp(body.whatsapp);
    if (!whatsapp) return fail('Nomor WhatsApp tidak valid. Gunakan nomor aktif dengan kode negara, misalnya 628123456789.', 400);
    if (!validText(body.address, 5, 300)) return fail('Alamat usaha wajib diisi (5–300 karakter).', 400);
    let latitude = parseCoordinate(body.latitude, -90, 90);
    let longitude = parseCoordinate(body.longitude, -180, 180);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return fail('Koordinat peta tidak valid.', 400);
    if ((latitude === null) !== (longitude === null)) return fail('Pilih lokasi pada peta agar kedua koordinat tersimpan bersama.', 400);
    let mapsUrl: string | null;
    try { mapsUrl = validateMapsUrl(body.mapsUrl); } catch { return fail('Tautan lokasi harus berupa tautan HTTPS Google Maps yang valid.', 400); }
    const fromLink = coordinatesFromMapsUrl(mapsUrl);
    if (latitude === null && longitude === null && fromLink) { latitude = fromLink.latitude; longitude = fromLink.longitude; }
    const ref = db.collection('businesses').doc();
    try {
      await ref.create({
        ownerUid,
        name: body.name.trim(),
        category: body.category,
        description: body.description.trim(),
        whatsapp,
        address: body.address.trim(),
        latitude,
        longitude,
        mapsUrl,
        status: 'pending',
        approvalStatus: 'pending',
        verified: false,
        subscriptionPlanId: 'free',
        paymentStatus: 'unpaid',
        createdAt: now,
        updatedAt: now,
      });
      void notifyAdminTelegram(`Pengajuan usaha baru di LOKAVA\nNama: ${body.name.trim()}\nKategori: ${body.category}\nStatus: menunggu pemeriksaan admin.`);
      return NextResponse.json({ ok: true, id: ref.id, status: 'pending' }, { status: 201 });
    } catch (error) {
      console.error('[seller-records] Business create failed', error);
      return fail('Pengajuan usaha gagal disimpan. Periksa konfigurasi server.', 500);
    }
  }

  if (body.type === 'product') {
    const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
    if (!businessId || businessId.length > 150 || businessId.includes('/')) return fail('Pilih profil usaha yang akan memiliki produk ini.', 400);
    const businessSnapshot = await db.collection('businesses').doc(businessId).get();
    if (!businessSnapshot.exists || businessSnapshot.data()?.ownerUid !== ownerUid || businessSnapshot.data()?.status === 'archived') return fail('Profil usaha tidak valid atau bukan milik akun Anda.', 403);
    const productTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const productDescription = typeof body.description === 'string' ? body.description.trim() : '';
    if (!validText(productTitle, 2, 120)) return fail('Nama produk wajib diisi (2–120 karakter).', 400);
    if (!validText(productDescription, 1, 1500)) return fail('Deskripsi produk wajib diisi (1–1.500 karakter).', 400);
    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 1_000_000_000_000) return fail('Harga produk tidak valid.', 400);

    let paymentSettings: Awaited<ReturnType<typeof readPaymentSettings>>; try { paymentSettings=await readPaymentSettings(db); } catch(error) { console.error('[seller-records] Payment settings read failed',error); return fail('Pengaturan kuota produk gagal dimuat.',500); }
    try {
      const ref = db.collection('products').doc();
      const result = await db.runTransaction(async (transaction) => {
        const productQuery = db.collection('products').where('ownerUid', '==', ownerUid);
        const subscriptionQuery = db.collection('subscriptions').where('ownerUid', '==', ownerUid);
        const productSnapshot = await transaction.get(productQuery);
        const subscriptionSnapshot = await transaction.get(subscriptionQuery);
        const currentTime = Date.now();
        const activePlan = subscriptionSnapshot.docs
          .map((doc) => doc.data())
          .filter((item) => item.status === 'active' && typeof item.planId === 'string' && PLAN_KEYS.has(item.planId.toLowerCase() as PlanKey))
          .filter((item) => {
            if (!item.expiresAt) return true;
            const expiry = item.expiresAt instanceof Timestamp ? item.expiresAt.toMillis() : (typeof item.expiresAt === 'string' || typeof item.expiresAt === 'number') ? new Date(item.expiresAt).getTime() : Number.NaN;
            return Number.isFinite(expiry) && expiry > currentTime;
          })
          .sort((a,b)=>{const expiry=(item:Record<string,unknown>)=>{if(!item.expiresAt)return Number.MAX_SAFE_INTEGER;const value=item.expiresAt;const ms=value instanceof Timestamp?(value as {toMillis:()=>number}).toMillis():(typeof value==='string'||typeof value==='number')?new Date(value).getTime():0;return Number.isFinite(ms)?ms:0};return expiry(b)-expiry(a)})
          .map((item) => String(item.planId).toLowerCase())
          .find((plan) => PLAN_KEYS.has(plan as PlanKey)) || 'free';
        const limit = paymentSettings.plans[activePlan as PlanKey].productLimit;
        if (productSnapshot.size >= limit) {
          const error = new Error('QUOTA_EXCEEDED');
          Object.assign(error, { limit, used: productSnapshot.size, plan: activePlan });
          throw error;
        }
        transaction.create(ref, {
          ownerUid,
          businessId,
          title: productTitle,
          description: productDescription,
          price: body.price,
          currency: 'IDR',
          status: 'draft',
          approvalStatus: 'pending',
          verified: false,
          createdAt: now,
          updatedAt: now,
        });
        return { plan: activePlan, used: productSnapshot.size + 1, limit };
      });
      void notifyAdminTelegram(`Produk baru diajukan di LOKAVA\nNama: ${productTitle}\nStatus: menunggu pemeriksaan admin.`);
      return NextResponse.json({ ok: true, id: ref.id, status: 'draft', ...result }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        const details = error as Error & { limit?: number; used?: number; plan?: string };
        return NextResponse.json({ error: `Kuota paket ${(details.plan || 'free').toUpperCase()} telah tercapai (${details.limit || 3} produk). Pilih paket yang lebih tinggi untuk menambah produk.`, limit: details.limit || 3, used: details.used || 0, plan: details.plan || 'free' }, { status: 409 });
      }
      console.error('[seller-records] Product create failed', error);
      return fail('Produk gagal disimpan. Periksa konfigurasi server dan coba lagi.', 500);
    }
  }

  return fail('Jenis rekaman tidak didukung.', 400);
}

async function authenticateSeller(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return { error: fail('Token autentikasi diperlukan.', 401) } as const;
  let services: ReturnType<typeof getAdminServices>;
  try {
    services = getAdminServices();
  } catch (error) {
    console.error('[seller-records] Firebase Admin configuration error', error);
    return { error: fail('Layanan server belum dikonfigurasi oleh operator.', 503) } as const;
  }
  try {
    const decoded = await services.auth.verifyIdToken(tokenMatch[1], true);
    if (decoded.admin === true) return { error: fail('Akun administrator tidak dapat menggunakan alur penjual.', 403) } as const;
    return { services, decoded } as const;
  } catch {
    return { error: fail('Sesi tidak valid atau telah dicabut. Silakan masuk kembali.', 401) } as const;
  }
}

export async function PATCH(request: Request) {
  const auth = await authenticateSeller(request);
  if ('error' in auth) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return fail('Format permintaan tidak valid.', 400); }

  const type = body.type;
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if ((type !== 'business' && type !== 'product') || !id || id.length > 150 || id.includes('/')) return fail('Jenis atau ID data tidak valid.', 400);

  const collectionName = type === 'business' ? 'businesses' : 'products';
  const ref = auth.services.db.collection(collectionName).doc(id);
  const now = FieldValue.serverTimestamp();
  try {
    await auth.services.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const existing = snapshot.data() || {};
      if (existing.ownerUid !== auth.decoded.uid) throw new Error('FORBIDDEN');
      const currentStatus = String(existing.status || '');
      if (type === 'product' && (currentStatus === 'published' || existing.approvalStatus === 'approved')) throw new Error('ADMIN_REVIEW_REQUIRED');

      if (type === 'business') {
        if (!validText(body.name, 2, 100)) throw new Error('INVALID_NAME');
        if (typeof body.category !== 'string' || !CATEGORIES.has(body.category)) throw new Error('INVALID_CATEGORY');
        if (!validText(body.description, 5, 1000)) throw new Error('INVALID_DESCRIPTION');
        if (!validText(body.whatsapp, 8, 30)) throw new Error('INVALID_WHATSAPP');
        const whatsapp = normalizeWhatsApp(body.whatsapp);
        if (!whatsapp) throw new Error('INVALID_WHATSAPP');
        if (!validText(body.address, 5, 300)) throw new Error('INVALID_ADDRESS');
        let latitude = parseCoordinate(body.latitude, -90, 90);
        let longitude = parseCoordinate(body.longitude, -180, 180);
        if (Number.isNaN(latitude) || Number.isNaN(longitude) || ((latitude === null) !== (longitude === null))) throw new Error('INVALID_COORDINATES');
        const mapsUrl = validateMapsUrl(body.mapsUrl);
        const fromLink = coordinatesFromMapsUrl(mapsUrl);
        if (latitude === null && longitude === null && fromLink) { latitude = fromLink.latitude; longitude = fromLink.longitude; }
        transaction.update(ref, {
          name: body.name.trim(), category: body.category, description: body.description.trim(), whatsapp, address: body.address.trim(), latitude, longitude, mapsUrl,
          status: 'pending', approvalStatus: 'pending', verified: false, reviewNote: '',
          updatedAt: now,
        });
      } else {
        const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : '';
        if (!businessId || businessId.length > 150 || businessId.includes('/')) throw new Error('INVALID_BUSINESS');
        const businessSnap = await transaction.get(auth.services.db.collection('businesses').doc(businessId));
        if (!businessSnap.exists || businessSnap.data()?.ownerUid !== auth.decoded.uid || businessSnap.data()?.status === 'archived') throw new Error('INVALID_BUSINESS');
        if (!validText(body.title, 2, 120)) throw new Error('INVALID_TITLE');
        if (!validText(body.description, 1, 1500)) throw new Error('INVALID_DESCRIPTION');
        if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0 || body.price > 1_000_000_000_000) throw new Error('INVALID_PRICE');
        transaction.update(ref, {
          businessId, title: body.title.trim(), description: body.description.trim(), price: body.price,
          status: 'draft', approvalStatus: 'pending', verified: false, reviewNote: '', updatedAt: now,
        });
      }
    });
    void notifyAdminTelegram(`Pembaruan pengajuan ${type==='business'?'usaha':'produk'} di LOKAVA\nID: ${id}\nStatus: menunggu pemeriksaan admin.`);
    return NextResponse.json({ ok: true, id, status: type === 'business' ? 'pending' : 'draft' });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return fail('Data tidak ditemukan.', 404);
    if (code === 'FORBIDDEN') return fail('Anda tidak memiliki akses untuk mengubah data ini.', 403);
    if (code === 'ADMIN_REVIEW_REQUIRED') return fail('Data yang sudah dipublikasikan harus ditinjau administrator sebelum dapat diubah.', 409);
    const messages: Record<string, string> = {
      INVALID_NAME: 'Nama usaha tidak valid (2–100 karakter).', INVALID_CATEGORY: 'Kategori usaha tidak valid.',
      INVALID_DESCRIPTION: 'Deskripsi tidak valid.', INVALID_WHATSAPP: 'Nomor WhatsApp tidak valid.', INVALID_ADDRESS: 'Alamat usaha tidak valid.', INVALID_COORDINATES: 'Koordinat peta tidak valid. Pilih lokasi di peta atau tempel tautan Google Maps yang valid.', INVALID_MAPS_URL: 'Tautan lokasi harus berupa tautan HTTPS Google Maps yang valid.', INVALID_TITLE: 'Nama produk tidak valid (2–120 karakter).', INVALID_BUSINESS: 'Pilih profil usaha milik Anda yang valid.', INVALID_PRICE: 'Harga produk tidak valid.',
    };
    if (messages[code]) return fail(messages[code], 400);
    console.error('[seller-records] Update failed', error);
    return fail('Perubahan gagal disimpan. Periksa konfigurasi server.', 500);
  }
}

export async function DELETE(request: Request) {
  const auth = await authenticateSeller(request);
  if ('error' in auth) return auth.error;
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return fail('Format permintaan tidak valid.', 400); }
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  if (body.type !== 'product' || !id || id.length > 150 || id.includes('/')) return fail('Penghapusan hanya tersedia untuk produk dengan ID valid.', 400);

  const ref = auth.services.db.collection('products').doc(id);
  let photoPublicIds: string[] = [];
  try {
    await auth.services.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const existing = snapshot.data() || {};
      if (existing.ownerUid !== auth.decoded.uid) throw new Error('FORBIDDEN');
      if (existing.status === 'published' || existing.approvalStatus === 'approved') throw new Error('ADMIN_REVIEW_REQUIRED');
      photoPublicIds = Array.isArray(existing.photos) ? existing.photos.map((photo: { publicId?: unknown }) => photo && typeof photo.publicId === 'string' ? photo.publicId : '').filter((value: string) => value.startsWith(`lokava/products/${auth.decoded.uid}/${id}/`)) : [];
      transaction.delete(ref);
    });
    await Promise.all(photoPublicIds.map((publicId) => deleteCloudinaryImage(publicId, 'upload').catch((error) => console.error('[seller-records] Cloudinary photo cleanup failed', publicId, error))));
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return fail('Produk tidak ditemukan.', 404);
    if (code === 'FORBIDDEN') return fail('Anda tidak memiliki akses untuk menghapus produk ini.', 403);
    if (code === 'ADMIN_REVIEW_REQUIRED') return fail('Produk yang sudah dipublikasikan harus ditinjau administrator sebelum dapat dihapus.', 409);
    console.error('[seller-records] Delete failed', error);
    return fail('Produk gagal dihapus. Periksa konfigurasi server.', 500);
  }
}
