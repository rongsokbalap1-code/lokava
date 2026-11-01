import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';

export type PromotionKind = 'product_featured' | 'category' | 'business_featured' | 'homepage_banner';
export type PromotionSettings = {
  prices: Record<PromotionKind, number>;
  durations: number[];
};
export const DEFAULT_PROMOTION_SETTINGS: PromotionSettings = {
  prices: { product_featured: 20_000, category: 30_000, business_featured: 50_000, homepage_banner: 100_000 },
  durations: [7, 14, 21, 30],
};
export const PROMOTION_LABELS: Record<PromotionKind, string> = {
  product_featured: 'Produk unggulan', category: 'Promosi kategori', business_featured: 'Usaha unggulan', homepage_banner: 'Banner beranda',
};
export async function readPromotionSettings(db: Firestore): Promise<PromotionSettings> {
  const snap = await db.collection('siteSettings').doc('promotions').get();
  const raw = snap.data() || {};
  const prices = raw.prices && typeof raw.prices === 'object' ? raw.prices as Record<string, unknown> : {};
  const fallback = DEFAULT_PROMOTION_SETTINGS;
  const safePrice = (key: PromotionKind) => typeof prices[key] === 'number' && Number.isSafeInteger(prices[key]) && (prices[key] as number) >= 0 && (prices[key] as number) <= 1_000_000_000 ? prices[key] as number : fallback.prices[key];
  const durations: number[] = Array.isArray(raw.durations) ? raw.durations.filter((v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && [7,14,21,30].includes(v)).slice(0,4) : fallback.durations;
  return { prices: { product_featured: safePrice('product_featured'), category: safePrice('category'), business_featured: safePrice('business_featured'), homepage_banner: safePrice('homepage_banner') }, durations: durations.length ? [...new Set(durations)].sort((a,b)=>a-b) : fallback.durations };
}
export function validPromotionSettings(input: unknown): PromotionSettings | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>; const prices = raw.prices as Record<string, unknown> | undefined;
  if (!prices || !Array.isArray(raw.durations)) return null;
  const keys: PromotionKind[] = ['product_featured','category','business_featured','homepage_banner'];
  const output = {} as Record<PromotionKind, number>;
  for (const key of keys) { const value = prices[key]; if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000) return null; output[key] = value; }
  const validDurations = raw.durations.filter((v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && [7,14,21,30].includes(v));
  const durations: number[] = [...new Set<number>(validDurations)].sort((a: number,b: number)=>a-b);
  if (!durations.length || durations.length > 4) return null;
  return { prices: output, durations };
}
