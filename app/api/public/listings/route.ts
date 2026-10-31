import { NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { safeMapsUrl } from '@/lib/server/public-content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanPhotos(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).url === 'string')
    .map((item) => ({ url: String(item.url) })).slice(0, 5);
}
function validCoordinates(record: Record<string, unknown>) {
  const latitude = record.latitude;
  const longitude = record.longitude;
  return typeof latitude === 'number' && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && typeof longitude === 'number' && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}
function normalizeWhatsApp(value: unknown): string {
  if (typeof value !== 'string') return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

export async function GET() {
  try {
    const { db } = getAdminServices();
    const [businessSnapshot, productSnapshot] = await Promise.all([
      db.collection('businesses').where('status', '==', 'published').get(),
      db.collection('products').where('status', '==', 'published').get(),
    ]);
    const businesses = businessSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>))
      .filter((record) => record.approvalStatus === 'approved' && record.verified === true);
    const businessByOwner = new Map<string, Record<string, unknown>>();
    const businessById = new Map<string, Record<string, unknown>>();
    for (const business of businesses) { businessById.set(String(business.id),business); if (typeof business.ownerUid === 'string' && !businessByOwner.has(business.ownerUid)) businessByOwner.set(business.ownerUid, business); }
    const publicBusinesses = businesses.map((business) => {
      const whatsapp = normalizeWhatsApp(business.whatsapp);
      const coords = validCoordinates(business);
      const name = String(business.name || 'Usaha lokal');
      return {
        id: String(business.id), type: 'business', name, title: name, price: null, businessName: '',
        category: String(business.category || 'Lainnya'), description: String(business.description || '').slice(0, 1000),
        address: String(business.address || ''), whatsapp,
        whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Halo ${name}, saya menemukan usaha Anda di LOKAVA.`)}` : '',
        latitude: coords ? business.latitude : null, longitude: coords ? business.longitude : null,
        mapUrl: safeMapsUrl(business),
        mapsUrl: safeMapsUrl(business),
        photos: cleanPhotos(business.photos), href: `/usaha/${encodeURIComponent(String(business.id))}`,
      };
    });
    const publicProducts = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>))
      .filter((product) => product.approvalStatus === 'approved' && product.verified === true && (typeof product.businessId === 'string' ? businessById.has(product.businessId) : typeof product.ownerUid === 'string' && businessByOwner.has(product.ownerUid)))
      .map((product) => {
        const ownerBusiness = typeof product.businessId === 'string' ? businessById.get(product.businessId) : typeof product.ownerUid === 'string' ? businessByOwner.get(product.ownerUid) : undefined;
        const whatsapp = normalizeWhatsApp(ownerBusiness?.whatsapp);
        const coords = ownerBusiness ? validCoordinates(ownerBusiness) : false;
        const title = String(product.title || 'Produk lokal');
        const price = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null;
        return {
          id: String(product.id), type: 'product', title, name: title,
          category: String(product.category || ownerBusiness?.category || 'Produk lokal'),
          description: String(product.description || '').slice(0, 1000), price,
          businessName: String(ownerBusiness?.name || ''), address: String(ownerBusiness?.address || ''), whatsapp,
          whatsappUrl: whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Halo, saya tertarik dengan ${title}${price === null ? '' : ` (Rp ${price.toLocaleString('id-ID')})`} yang saya temukan di LOKAVA.`)}` : '',
          latitude: coords ? ownerBusiness?.latitude : null, longitude: coords ? ownerBusiness?.longitude : null,
          mapUrl: ownerBusiness ? safeMapsUrl(ownerBusiness) : '',
          mapsUrl: ownerBusiness ? safeMapsUrl(ownerBusiness) : '',
          photos: cleanPhotos(product.photos), href: `/produk/${encodeURIComponent(String(product.id))}`,
        };
      });
    return NextResponse.json({ businesses: publicBusinesses.slice(0, 100), products: publicProducts.slice(0, 100) }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } });
  } catch (error) {
    console.error('[public-listings] read failed', error);
    return NextResponse.json({ businesses: [], products: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
