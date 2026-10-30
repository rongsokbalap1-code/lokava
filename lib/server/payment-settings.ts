import 'server-only';
import type { Firestore } from 'firebase-admin/firestore';

export type PlanKey = 'free' | 'premium' | 'bisnis';
export type PaymentSettings = {
  plans: Record<PlanKey, { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number }>;
  methods: {
    qr: { enabled: boolean; label: string; imageUrl: string; publicId: string; instructions: string };
    bank: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; instructions: string };
  };
  updatedAt?: unknown;
  versionId?: string;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  plans: {
    free: { name: 'FREE', price: 0, productLimit: 3, durationDays: 30, productPhotosPerProduct: 3, productPhotosTotal: 3, businessPhotosTotal: 3 },
    premium: { name: 'PREMIUM', price: 25_000, productLimit: 50, durationDays: 30, productPhotosPerProduct: 5, productPhotosTotal: 250, businessPhotosTotal: 10 },
    bisnis: { name: 'BISNIS', price: 50_000, productLimit: 200, durationDays: 30, productPhotosPerProduct: 8, productPhotosTotal: 1600, businessPhotosTotal: 20 },
  },
  methods: {
    qr: { enabled: false, label: 'QRIS', imageUrl: '', publicId: '', instructions: 'Bayar sesuai nominal pada permintaan langganan.' },
    bank: { enabled: false, bankName: '', accountName: '', accountNumber: '', instructions: 'Cantumkan kode pembayaran pada berita transfer.' },
  },
};

function safePrice(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000 ? value : fallback;
}
function safeLimit(value:unknown,fallback:number,min=1,max=10000){return typeof value==='number'&&Number.isSafeInteger(value)&&value>=min&&value<=max?value:fallback}
function safeText(value: unknown, fallback: string, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback;
}

export async function readPaymentSettings(db: Firestore): Promise<PaymentSettings> {
  const snapshot = await db.collection('siteSettings').doc('payment').get();
  if (!snapshot.exists) return DEFAULT_PAYMENT_SETTINGS;
  const raw = snapshot.data() || {};
  const plans = (raw.plans || {}) as Record<string, Record<string, unknown>>;
  const methods = (raw.methods || {}) as Record<string, Record<string, unknown>>;
  const base = DEFAULT_PAYMENT_SETTINGS;
  const qr = methods.qr || {};
  const bank = methods.bank || {};
  const configuredCloudPrefix = process.env.CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/` : '';
  const qrImageUrl = configuredCloudPrefix && typeof qr.imageUrl === 'string' && qr.imageUrl.startsWith(configuredCloudPrefix) ? qr.imageUrl : '';
  const qrPublicId = typeof qr.publicId === 'string' && qr.publicId.startsWith('lokava/payment-qr/') ? qr.publicId : '';
  return {
    plans: {
      free: { ...base.plans.free, price: safePrice(plans.free?.price, base.plans.free.price), productLimit:safeLimit(plans.free?.productLimit,base.plans.free.productLimit), durationDays:safeLimit(plans.free?.durationDays,base.plans.free.durationDays,1,365), productPhotosPerProduct:safeLimit(plans.free?.productPhotosPerProduct,base.plans.free.productPhotosPerProduct), productPhotosTotal:safeLimit(plans.free?.productPhotosTotal,base.plans.free.productPhotosTotal), businessPhotosTotal:safeLimit(plans.free?.businessPhotosTotal,base.plans.free.businessPhotosTotal) },
      premium: { ...base.plans.premium, price: safePrice(plans.premium?.price, base.plans.premium.price), productLimit:safeLimit(plans.premium?.productLimit,base.plans.premium.productLimit), durationDays:safeLimit(plans.premium?.durationDays,base.plans.premium.durationDays,1,365), productPhotosPerProduct:safeLimit(plans.premium?.productPhotosPerProduct,base.plans.premium.productPhotosPerProduct), productPhotosTotal:safeLimit(plans.premium?.productPhotosTotal,base.plans.premium.productPhotosTotal), businessPhotosTotal:safeLimit(plans.premium?.businessPhotosTotal,base.plans.premium.businessPhotosTotal) },
      bisnis: { ...base.plans.bisnis, price: safePrice(plans.bisnis?.price, base.plans.bisnis.price), productLimit:safeLimit(plans.bisnis?.productLimit,base.plans.bisnis.productLimit), durationDays:safeLimit(plans.bisnis?.durationDays,base.plans.bisnis.durationDays,1,365), productPhotosPerProduct:safeLimit(plans.bisnis?.productPhotosPerProduct,base.plans.bisnis.productPhotosPerProduct), productPhotosTotal:safeLimit(plans.bisnis?.productPhotosTotal,base.plans.bisnis.productPhotosTotal), businessPhotosTotal:safeLimit(plans.bisnis?.businessPhotosTotal,base.plans.bisnis.businessPhotosTotal) },
    },
    methods: {
      qr: {
        enabled: qr.enabled === true && !!qrImageUrl && !!qrPublicId,
        label: safeText(qr.label, base.methods.qr.label, 60),
        imageUrl: qrImageUrl,
        publicId: qrPublicId,
        instructions: safeText(qr.instructions, base.methods.qr.instructions, 500),
      },
      bank: {
        enabled: bank.enabled === true,
        bankName: safeText(bank.bankName, '', 100),
        accountName: safeText(bank.accountName, '', 120),
        accountNumber: safeText(bank.accountNumber, '', 80),
        instructions: safeText(bank.instructions, base.methods.bank.instructions, 500),
      },
    },
    updatedAt: raw.updatedAt,
    versionId: typeof raw.versionId === 'string' ? raw.versionId : undefined,
  };
}

export function validatePaymentSettings(input: unknown): PaymentSettings | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const plans = raw.plans as Record<string, Record<string, unknown>> | undefined;
  const methods = raw.methods as Record<string, Record<string, unknown>> | undefined;
  if (!plans || !methods || !plans.free || !plans.premium || !plans.bisnis || !methods.qr || !methods.bank) return null;
  const price = (key: PlanKey) => {
    const value = plans[key].price;
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000 ? value : null;
  };
  const freePrice = price('free'); const premiumPrice = price('premium'); const bisnisPrice = price('bisnis');
  if (freePrice === null || premiumPrice === null || bisnisPrice === null) return null;
  const limits=(key:PlanKey)=>{const p=plans[key];const fields=['productLimit','durationDays','productPhotosPerProduct','productPhotosTotal','businessPhotosTotal'];const values=fields.map(field=>p[field]);if(values.some(v=>typeof v!=='number'||!Number.isSafeInteger(v)))return null;const [productLimit,durationDays,productPhotosPerProduct,productPhotosTotal,businessPhotosTotal]=values as number[];if(productLimit<1||productLimit>10000||durationDays<1||durationDays>365||productPhotosPerProduct<1||productPhotosPerProduct>100||productPhotosTotal<1||productPhotosTotal>10000||businessPhotosTotal<1||businessPhotosTotal>1000)return null;return {productLimit,durationDays,productPhotosPerProduct,productPhotosTotal,businessPhotosTotal}};const freeLimits=limits('free');const premiumLimits=limits('premium');const bisnisLimits=limits('bisnis');if(!freeLimits||!premiumLimits||!bisnisLimits)return null;
  const qr = methods.qr; const bank = methods.bank;
  const imageUrl = typeof qr.imageUrl === 'string' ? qr.imageUrl.trim() : '';
  const publicId = typeof qr.publicId === 'string' ? qr.publicId.trim() : '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const expectedPrefix = cloudName ? `https://res.cloudinary.com/${cloudName}/image/upload/` : '';
  if (imageUrl && (!expectedPrefix || !imageUrl.startsWith(expectedPrefix) || imageUrl.length > 1500)) return null;
  if (publicId && (!publicId.startsWith('lokava/payment-qr/') || publicId.length > 500 || publicId.includes('..'))) return null;
  const getString = (obj: Record<string, unknown>, key: string, max: number) => typeof obj[key] === 'string' && (obj[key] as string).trim().length <= max ? (obj[key] as string).trim() : null;
  const qrLabel = getString(qr, 'label', 60); const qrInstructions = getString(qr, 'instructions', 500);
  const bankName = getString(bank, 'bankName', 100); const accountName = getString(bank, 'accountName', 120);
  const accountNumber = getString(bank, 'accountNumber', 80); const bankInstructions = getString(bank, 'instructions', 500);
  if ([qrLabel, qrInstructions, bankName, accountName, accountNumber, bankInstructions].some((v) => v === null)) return null;
  const qrEnabled = qr.enabled === true; const bankEnabled = bank.enabled === true;
  if (qr.enabled !== true && qr.enabled !== false) return null;
  if (bank.enabled !== true && bank.enabled !== false) return null;
  if (qrEnabled && (!imageUrl || !publicId)) return null;
  if (bankEnabled && (!bankName || !accountName || !accountNumber)) return null;
  return {
    plans: {
      free: { ...DEFAULT_PAYMENT_SETTINGS.plans.free, price: freePrice, ...freeLimits },
      premium: { ...DEFAULT_PAYMENT_SETTINGS.plans.premium, price: premiumPrice, ...premiumLimits },
      bisnis: { ...DEFAULT_PAYMENT_SETTINGS.plans.bisnis, price: bisnisPrice, ...bisnisLimits },
    },
    methods: {
      qr: { enabled: qrEnabled, label: qrLabel!, imageUrl, publicId, instructions: qrInstructions! },
      bank: { enabled: bankEnabled, bankName: bankName!, accountName: accountName!, accountNumber: accountNumber!, instructions: bankInstructions! },
    },
  };
}
