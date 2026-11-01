import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { getPublishedRecords } from '@/lib/server/public-content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function millis(value: unknown) {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') return (value as { toMillis: () => number }).toMillis();
  if (typeof value === 'string' || typeof value === 'number') { const parsed = new Date(value).getTime(); return Number.isFinite(parsed) ? parsed : 0; }
  return 0;
}
function firstPhoto(record: Record<string, unknown>) {
  return Array.isArray(record.photos) ? record.photos.find((photo) => !!photo && typeof photo === 'object' && typeof (photo as { url?: unknown }).url === 'string') as { url: string } | undefined : undefined;
}

export async function GET() {
  const manualRecords = await getPublishedRecords('banners', 30);
  const manualBanners = manualRecords.map((record) => ({
    id: record.id,
    title: String(record.title || record.name || 'Informasi LOKAVA'),
    description: String(record.description || '').slice(0, 500),
    href: typeof record.href === 'string' && record.href.startsWith('/') ? record.href : '',
    photos: firstPhoto(record) ? [{ url: String(firstPhoto(record)?.url) }] : [],
    source: 'admin' as const,
  }));

  let promotedBanners: Array<{ id: string; title: string; description: string; href: string; photos: Array<{ url: string }>; source: 'promotion' }> = [];
  try {
    const { db } = getAdminServices();
    const snapshot = await db.collection('promotions').where('status', '==', 'active').get();
    const now = Date.now();
    const active = snapshot.docs.filter((doc) => {
      const promotion = doc.data();
      return promotion.targetType === 'products' && promotion.approvalStatus === 'approved' && millis(promotion.startsAt) <= now && millis(promotion.endsAt) > now;
    });
    const expired = snapshot.docs.filter((doc) => doc.data().targetType === 'products' && doc.data().approvalStatus === 'approved' && millis(doc.data().endsAt) > 0 && millis(doc.data().endsAt) <= now);
    if (expired.length) await Promise.all(expired.map((doc) => doc.ref.update({ status: 'expired', updatedAt: Timestamp.now() })));
    promotedBanners = (await Promise.all(active.map(async (doc) => {
      const promotion = doc.data();
      const productSnapshot = await db.collection('products').doc(String(promotion.targetId || '')).get();
      if (!productSnapshot.exists) return null;
      const product = productSnapshot.data() || {};
      if (product.ownerUid !== promotion.ownerUid || product.status !== 'published' || product.approvalStatus !== 'approved' || product.verified !== true) return null;
      const businessId = typeof product.businessId === 'string' ? product.businessId : '';
      if (businessId) {
        const businessSnapshot = await db.collection('businesses').doc(businessId).get();
        const business = businessSnapshot.data() || {};
        if (!businessSnapshot.exists || business.ownerUid !== promotion.ownerUid || business.status !== 'published' || business.approvalStatus !== 'approved' || business.verified !== true) return null;
      } else {
        const businesses = await db.collection('businesses').where('ownerUid', '==', promotion.ownerUid).where('status', '==', 'published').limit(5).get();
        if (!businesses.docs.some((business) => business.data().approvalStatus === 'approved' && business.data().verified === true)) return null;
      }
      const photo = firstPhoto(product);
      return {
        id: `promotion-${doc.id}`,
        title: String(product.title || promotion.targetName || 'Produk pilihan LOKAVA'),
        description: String(product.description || 'Produk pilihan dari penjual terverifikasi.').slice(0, 500),
        href: `/produk/${productSnapshot.id}`,
        photos: photo ? [{ url: photo.url }] : [],
        source: 'promotion' as const,
      };
    }))).filter((item): item is NonNullable<typeof item> => item !== null);
  } catch (error) {
    console.error('[public-banners] active promotions could not be loaded', error);
  }

  // Paid and approved product promotions take priority so the advertised product is visible on the homepage.
  const banners = [...promotedBanners, ...manualBanners].slice(0, 30);
  return NextResponse.json({ banners }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } });
}
