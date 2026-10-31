import 'server-only';
import { getAdminServices } from '@/lib/server/firebase-admin';
import { googleMapsDirectionsUrl, normalizeGoogleMapsUrl } from '@/lib/maps';
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type PublicRecord = Record<string, unknown> & { id: string };
export async function getPublishedRecords(collectionName: string, limit = 100): Promise<PublicRecord[]> {
  const allowed = new Set(['businesses', 'products', 'destinations', 'articles', 'packages', 'categories', 'banners']);
  if (!allowed.has(collectionName)) return [];
  try {
    const { db } = getAdminServices();
    const snapshot = await db.collection(collectionName).where('status', '==', 'published').limit(Math.max(1, Math.min(limit, 100))).get();
    const records=snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PublicRecord)).filter((record) => record.approvalStatus === 'approved' && (collectionName === 'categories' || record.verified === true || collectionName === 'articles' || collectionName === 'destinations' || collectionName === 'packages' || collectionName === 'banners'));
    if(collectionName==='products'){const businessSnap=await db.collection('businesses').where('status','==','published').limit(200).get();const approvedBusinesses=businessSnap.docs.map(doc=>({id:doc.id,...doc.data()} as PublicRecord)).filter((b)=>b.approvalStatus==='approved'&&b.verified===true);const byId=new Set(approvedBusinesses.map(b=>b.id));const byOwner=new Set(approvedBusinesses.map(b=>b.ownerUid).filter((v):v is string=>typeof v==='string'));return records.filter(r=>typeof r.businessId==='string'?byId.has(r.businessId):typeof r.ownerUid==='string'&&byOwner.has(r.ownerUid));}
    return records;
  } catch (error) {
    console.error(`[public-content] ${collectionName} unavailable`, error);
    return [];
  }
}
export function hasValidCoordinates(record: Record<string, unknown>): record is Record<string, unknown> & { latitude: number; longitude: number } {
  return typeof record.latitude === 'number' && Number.isFinite(record.latitude) && record.latitude >= -90 && record.latitude <= 90 && typeof record.longitude === 'number' && Number.isFinite(record.longitude) && record.longitude >= -180 && record.longitude <= 180;
}
export function safeMapsUrl(record: Record<string, unknown>): string {
  const stored=normalizeGoogleMapsUrl(record.mapsUrl);
  if(stored)return stored;
  return hasValidCoordinates(record)?googleMapsDirectionsUrl(record.latitude,record.longitude):'';
}
export function normalizeWhatsApp(value: unknown): string {
  if (typeof value !== 'string') return '';
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : '';
}

/** Fetches all approved public records in bounded pages for sitemap/SEO inventory only. */
export async function getAllPublishedRecords(collectionName: string, maxRecords = 5000): Promise<PublicRecord[]> {
  const allowed = new Set(['businesses', 'products', 'destinations', 'articles', 'packages']);
  if (!allowed.has(collectionName)) return [];
  try {
    const { db } = getAdminServices();
    const result: PublicRecord[] = [];
    let cursor: QueryDocumentSnapshot | undefined;
    while (result.length < Math.min(Math.max(maxRecords, 1), 10000)) {
      let query: Query = db.collection(collectionName).where('status', '==', 'published').limit(Math.min(100, maxRecords - result.length));
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      if (snapshot.empty) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const record = { id: doc.id, ...data } as PublicRecord;
        if (record.approvalStatus !== 'approved') continue;
        if ((collectionName === 'businesses' || collectionName === 'products') && record.verified !== true) continue;
        result.push(record);
        if (result.length >= maxRecords) break;
      }
      if (snapshot.size < 100) break;
    }
    if (collectionName !== 'products') return result;
    const businessSnapshot = await db.collection('businesses').where('status', '==', 'published').limit(1000).get();
    const businesses = businessSnapshot.docs.filter((doc) => doc.data().approvalStatus === 'approved' && doc.data().verified === true);
    const businessIds = new Set(businesses.map((doc) => doc.id));
    const ownerUids = new Set(businesses.map((doc) => doc.data().ownerUid).filter((uid): uid is string => typeof uid === 'string'));
    return result.filter((record) => typeof record.businessId === 'string' ? businessIds.has(record.businessId) : typeof record.ownerUid === 'string' && ownerUids.has(record.ownerUid));
  } catch (error) {
    console.error(`[public-content] all ${collectionName} unavailable`, error);
    return [];
  }
}
