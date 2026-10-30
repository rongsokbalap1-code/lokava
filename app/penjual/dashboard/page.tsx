'use client';
/* eslint-disable react-hooks/set-state-in-effect -- Firebase auth callbacks and authenticated data loaders synchronize external state. */

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getIdTokenResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft, ArrowRight, Building2, LogOut, PackagePlus, Pencil, RefreshCw, ShieldAlert, Store, Trash2, X, CreditCard, Upload, Megaphone, Sparkles } from 'lucide-react';
import { getFirebase } from '@/lib/firebase';
import LocationPicker from './LocationPicker';

type OwnedRecord = { id: string; type?: string; createdAt?: string; status?: string; approvalStatus?: string; title?: string; name?: string; proofUploaded?: boolean; [key: string]: unknown };
type PaymentSettings = {
  plans: { free: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number }; premium: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number }; bisnis: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number } };
  methods: { qr: { enabled: boolean; label: string; imageUrl: string; publicId: string; instructions: string }; bank: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; instructions: string } };
};
const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { plans: { free: { name: 'FREE', price: 0, productLimit: 3, durationDays: 30, productPhotosPerProduct:3, productPhotosTotal:3, businessPhotosTotal:3 }, premium: { name: 'PREMIUM', price: 25000, productLimit: 50, durationDays: 30, productPhotosPerProduct:5, productPhotosTotal:250, businessPhotosTotal:10 }, bisnis: { name: 'BISNIS', price: 50000, productLimit: 200, durationDays: 30, productPhotosPerProduct:8, productPhotosTotal:1600, businessPhotosTotal:20 } }, methods: { qr: { enabled: false, label: 'QRIS', imageUrl: '', publicId: '', instructions: '' }, bank: { enabled: false, bankName: '', accountName: '', accountNumber: '', instructions: '' } } };

function sellerStatusLabel(value: unknown) {
  const status = String(value || 'unknown');
  const labels: Record<string, string> = { pending: 'Menunggu tinjauan', approved: 'Disetujui', rejected: 'Perlu revisi', published: 'Dipublikasikan', draft: 'Draf', archived: 'Diarsipkan', unpaid: 'Belum dibayar' };
  return labels[status] || status;
}

function friendlyError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'Akses ditolak oleh Firestore Rules. Periksa konfigurasi dan aturan keamanan Firebase.';
  if (code === 'unavailable') return 'Firebase sedang tidak tersedia. Periksa koneksi dan coba lagi.';
  if (code === 'failed-precondition') return 'Permintaan memerlukan konfigurasi/index Firestore tambahan.';
  return error instanceof Error ? error.message : 'Permintaan gagal. Coba lagi.';
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [businesses, setBusinesses] = useState<OwnedRecord[]>([]);
  const [products, setProducts] = useState<OwnedRecord[]>([]);
  const [payments, setPayments] = useState<OwnedRecord[]>([]);
  const [promotions, setPromotions] = useState<OwnedRecord[]>([]);
  const [promotionPayments, setPromotionPayments] = useState<OwnedRecord[]>([]);
  const [promotionSettings, setPromotionSettings] = useState<{ prices: Record<string, number>; durations: number[] }>({ prices: { product_featured: 20000, category: 30000, business_featured: 50000, homepage_banner: 100000 }, durations: [7,14,21,30] });
  const [promotionKind, setPromotionKind] = useState('product_featured');
  const [promotionTargetId, setPromotionTargetId] = useState('');
  const [promotionDuration, setPromotionDuration] = useState(7);
  const [promotionPaymentMethod, setPromotionPaymentMethod] = useState<'qr' | 'bank'>('qr');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loadingData, setLoadingData] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Kuliner');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessWhatsApp, setBusinessWhatsApp] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLatitude, setBusinessLatitude] = useState('');
  const [businessLongitude, setBusinessLongitude] = useState('');
  const [businessMapsUrl, setBusinessMapsUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productBusinessId, setProductBusinessId] = useState('');
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [uploadingProofId, setUploadingProofId] = useState<string | null>(null);
  const [uploadingPhotoKey, setUploadingPhotoKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const { auth } = getFirebase();
      return onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
        if (!currentUser) { router.replace('/penjual/masuk'); return; }
        try {
          const token = await getIdTokenResult(currentUser, true);
          if (token.claims.admin === true) router.replace('/admin/dashboard');
        } catch (e) { setError(friendlyError(e)); }
      });
    } catch (e) {
      setError(friendlyError(e));
      setAuthReady(true);
      return undefined;
    }
  }, [router]);

  const loadRecords = useCallback(async (currentUser = user) => {
    if (!currentUser) return;
    setLoadingData(true); setError('');
    try {
      const { db } = getFirebase();
      const [businessSnap, productSnap, paymentSnap] = await Promise.all([
        getDocs(query(collection(db, 'businesses'), where('ownerUid', '==', currentUser.uid))),
        getDocs(query(collection(db, 'products'), where('ownerUid', '==', currentUser.uid))),
        getDocs(query(collection(db, 'transactions'), where('ownerUid', '==', currentUser.uid))),
      ]);
      setBusinesses(businessSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as OwnedRecord[]);
      setProducts(productSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as OwnedRecord[]);
      setPayments(paymentSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OwnedRecord)).filter((d) => d.type === 'subscription').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) as OwnedRecord[]);
      try {
        const idToken = await currentUser.getIdToken(true);
        const settingsResponse = await fetch('/api/seller/payments', { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' });
        const settingsResult = await settingsResponse.json().catch(() => ({}));
        if (!settingsResponse.ok) throw new Error(typeof settingsResult.error === 'string' ? settingsResult.error : 'Pengaturan paket gagal dimuat.');
        if (settingsResult.settings) { const loadedSettings = settingsResult.settings as PaymentSettings; setPaymentSettings(loadedSettings); setPromotionPaymentMethod(loadedSettings.methods.qr.enabled && loadedSettings.methods.qr.imageUrl ? 'qr' : 'bank'); }
        if (Array.isArray(settingsResult.payments)) setPayments(settingsResult.payments as OwnedRecord[]);
      } catch (settingsError) { setError(friendlyError(settingsError)); }
      try {
        const idToken = await currentUser.getIdToken(true);
        const promoResponse = await fetch('/api/seller/promotions', { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' });
        const promoResult = await promoResponse.json().catch(() => ({}));
        if (!promoResponse.ok) throw new Error(typeof promoResult.error === 'string' ? promoResult.error : 'Data promosi gagal dimuat.');
        setPromotions(Array.isArray(promoResult.promotions) ? promoResult.promotions as OwnedRecord[] : []);
        setPromotionPayments(Array.isArray(promoResult.payments) ? promoResult.payments as OwnedRecord[] : []);
        if (promoResult.settings) { setPromotionSettings(promoResult.settings); if (Array.isArray(promoResult.settings.durations) && promoResult.settings.durations.length) setPromotionDuration((current) => promoResult.settings.durations.includes(current) ? current : promoResult.settings.durations[0]); }
      } catch (promoError) { setError(friendlyError(promoError)); }
    } catch (e) { setError(friendlyError(e)); }
    finally { setLoadingData(false); }
  }, [user]);

  useEffect(() => { if (user) void loadRecords(user); }, [user, loadRecords]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function createBusiness(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/seller/records', {
        method: editingBusinessId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'business', ...(editingBusinessId ? { id: editingBusinessId } : {}), name: businessName.trim(), category: businessType, description: businessDescription.trim(), whatsapp: businessWhatsApp.trim(), address: businessAddress.trim(), latitude: businessLatitude.trim(), longitude: businessLongitude.trim(), mapsUrl: businessMapsUrl.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Pengajuan usaha gagal disimpan.');
      setBusinessName(''); setBusinessType('Kuliner'); setBusinessDescription(''); setBusinessWhatsApp(''); setBusinessAddress(''); setBusinessLatitude(''); setBusinessLongitude(''); setBusinessMapsUrl('');
      setMessage(editingBusinessId ? 'Perubahan profil tersimpan dan dikirim kembali untuk pemeriksaan.' : 'Profil usaha terkirim sebagai pengajuan dan menunggu pemeriksaan operator.');
      setEditingBusinessId(null);
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    const numericPrice = Number(productPrice);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) { setError('Harga harus berupa angka nol atau lebih.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/seller/records', {
        method: editingProductId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'product', ...(editingProductId ? { id: editingProductId } : {}), title: productName.trim(), description: productDescription.trim(), price: numericPrice, businessId: productBusinessId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Produk gagal disimpan.');
      setProductName(''); setProductDescription(''); setProductPrice(''); setProductBusinessId('');
      setMessage(editingProductId ? 'Perubahan produk tersimpan sebagai draf dan menunggu pemeriksaan ulang.' : 'Produk disimpan sebagai draf. Produk belum dipublikasikan dan belum dapat dianggap terverifikasi.');
      setEditingProductId(null);
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function requestPlan(planId: 'premium' | 'bisnis', paymentMethod: 'qr' | 'bank') {
    if (!user) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/seller/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ planId, paymentMethod }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Permintaan paket gagal dibuat.');
      setMessage(`Permintaan ${String(result.planName || planId).toUpperCase()} dibuat dengan kode ${String(result.paymentCode || '')}. Ikuti detail pembayaran yang tersimpan pada riwayat permintaan.`);
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function requestPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    const kind = promotionKind;
    const [targetType, targetId] = promotionTargetId.split(':', 2);
    if (!targetId || !['product','business'].includes(targetType)) { setError('Pilih konten yang sudah dipublikasikan terlebih dahulu.'); return; }
    const paymentMethod = promotionPaymentMethod;
    const hasSelectedMethod = paymentMethod === 'qr' ? paymentSettings.methods.qr.enabled && !!paymentSettings.methods.qr.imageUrl : paymentSettings.methods.bank.enabled && !!paymentSettings.methods.bank.bankName && !!paymentSettings.methods.bank.accountNumber;
    if (!hasSelectedMethod) { setError('Pilih metode pembayaran yang sudah diaktifkan administrator.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/seller/promotions', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({kind,targetId,targetType,durationDays:promotionDuration,paymentMethod}) });
      const result = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Permintaan promosi gagal dibuat.');
      setMessage(`Permintaan ${String(result.kindLabel || 'promosi')} dibuat. Unggah bukti bayar pada riwayat promosi agar admin dapat memverifikasi pembayaran.`);
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function uploadPaymentProof(payment: OwnedRecord, file?: File) {
    if (!user || !file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Bukti pembayaran harus berupa gambar JPG, PNG, atau WebP.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('Ukuran bukti pembayaran maksimal 2 MB.'); return; }
    setUploadingProofId(payment.id); setError(''); setMessage('');
    try {
      const token = await user.getIdToken(true);
      const form = new FormData();
      form.append('transactionId', payment.id);
      form.append('proof', file);
      const response = await fetch('/api/seller/payments/proof', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Unggah bukti pembayaran gagal.');
      setMessage('Bukti pembayaran berhasil diunggah secara privat. Tunggu pemeriksaan administrator.');
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setUploadingProofId(null); }
  }

  type SellerPhoto = { publicId: string; url: string; format?: string; width?: number; height?: number };
  function photosFor(record: OwnedRecord): SellerPhoto[] {
    return Array.isArray(record.photos) ? record.photos.filter((photo): photo is SellerPhoto => !!photo && typeof photo === 'object' && typeof (photo as SellerPhoto).publicId === 'string' && typeof (photo as SellerPhoto).url === 'string') : [];
  }

  async function uploadRecordPhoto(record: OwnedRecord, recordType: 'business' | 'product', file?: File) {
    if (!user || !file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Foto harus berupa JPG, PNG, atau WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ukuran foto maksimal 5 MB.'); return; }
    const key = `${recordType}:${record.id}`;
    setUploadingPhotoKey(key); setError(''); setMessage('');
    try {
      const token = await user.getIdToken(true);
      const form = new FormData(); form.append('recordType', recordType); form.append('recordId', record.id); form.append('file', file);
      const response = await fetch('/api/seller/images', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Foto gagal diunggah.');
      setMessage('Foto berhasil disimpan di Cloudinary.');
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setUploadingPhotoKey(null); }
  }

  async function removeRecordPhoto(record: OwnedRecord, recordType: 'business' | 'product', publicId: string) {
    if (!user || !window.confirm('Hapus foto ini dari Cloudinary?')) return;
    const key = `${recordType}:${record.id}`;
    setUploadingPhotoKey(key); setError(''); setMessage('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/seller/images', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ recordType, recordId: record.id, publicId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Foto gagal dihapus.');
      setMessage('Foto dihapus dari rekaman dan Cloudinary.');
      await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setUploadingPhotoKey(null); }
  }

  function renderRecordPhotos(record: OwnedRecord, recordType: 'business' | 'product') {
    const photos = photosFor(record);
    const key = `${recordType}:${record.id}`;
    const locked = record.status === 'published' || record.approvalStatus === 'approved';
    return <div className="seller-cloudinary-media"><div className="seller-cloudinary-media-heading"><strong>Foto {recordType === 'business' ? 'usaha' : 'produk'}</strong><span>{photos.length} foto · Cloudinary</span></div>{photos.length > 0 && <div className="seller-cloudinary-photo-grid">{photos.map((photo) => <div className="seller-cloudinary-photo" key={photo.publicId}><img src={photo.url} alt={`Foto ${recordType === 'business' ? String(record.name || 'usaha') : String(record.title || 'produk')}`} loading="lazy"/><button type="button" disabled={uploadingPhotoKey === key || locked} aria-label="Hapus foto" onClick={() => void removeRecordPhoto(record, recordType, photo.publicId)}><Trash2 size={13}/></button></div>)}</div>}{!locked && <label className="record-action seller-photo-upload"><Upload size={14}/>{uploadingPhotoKey === key ? 'Mengunggah ke Cloudinary…' : 'Tambah foto'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingPhotoKey !== null} onChange={(event) => { const file = event.target.files?.[0]; void uploadRecordPhoto(record, recordType, file); event.currentTarget.value = ''; }}/></label>}{locked && <small className="seller-photo-locked">Foto tidak dapat diubah setelah publikasi.</small>}<small className="seller-photo-note">JPG, PNG, WebP · maksimal 5 MB. Kuota foto mengikuti paket aktif.</small></div>;
  }

  function formatMoney(value: unknown) {
    return typeof value === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) : 'Nominal tidak tersedia';
  }

  function renderPaymentInstructions(payment: OwnedRecord) {
    const details = payment.paymentDetailsSnapshot && typeof payment.paymentDetailsSnapshot === 'object' ? payment.paymentDetailsSnapshot as Record<string, unknown> : null;
    if (!details) return null;
    return <div className="seller-payment-instructions">
      {details.method === 'qr' && typeof details.imageUrl === 'string' && details.imageUrl && <div className="seller-payment-qr"><img src={details.imageUrl} alt={`QR pembayaran ${String(details.label || 'QR')}`} /><div><strong>{String(details.label || 'QR pembayaran')}</strong><p>Pindai QR dengan aplikasi pembayaran Anda.</p></div></div>}
      {details.method === 'bank' && <div className="seller-bank-details"><strong>{String(details.bankName || 'Bank')}</strong><span>Nama pemilik: {String(details.accountName || '—')}</span><span className="seller-account-number">{String(details.accountNumber || '—')}</span><button type="button" className="record-action" onClick={() => { void navigator.clipboard?.writeText(String(details.accountNumber || '')); setMessage('Nomor rekening disalin jika izin clipboard tersedia.'); }}>Salin nomor rekening</button></div>}
      {typeof details.instructions === 'string' && details.instructions && <p className="seller-payment-instruction-text">{details.instructions}</p>}
    </div>;
  }

  function startEditBusiness(record: OwnedRecord) {
    setEditingBusinessId(record.id); setEditingProductId(null);
    setBusinessName(String(record.name || '')); setBusinessType(String(record.category || 'Kuliner'));
    setBusinessDescription(String(record.description || '')); setBusinessWhatsApp(String(record.whatsapp || '')); setBusinessAddress(String(record.address || '')); setBusinessLatitude(record.latitude === null || record.latitude === undefined ? '' : String(record.latitude)); setBusinessLongitude(record.longitude === null || record.longitude === undefined ? '' : String(record.longitude)); setBusinessMapsUrl(String(record.mapsUrl || '')); setError(''); setMessage('');
    document.getElementById('profil-usaha')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function startEditProduct(record: OwnedRecord) {
    setEditingProductId(record.id); setEditingBusinessId(null);
    setProductName(String(record.title || '')); setProductDescription(String(record.description || ''));
    setProductPrice(typeof record.price === 'number' ? String(record.price) : ''); setProductBusinessId(String(record.businessId || businesses[0]?.id || '')); setError(''); setMessage('');
    document.getElementById('kelola-produk')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelBusinessEdit() {
    setEditingBusinessId(null); setBusinessName(''); setBusinessType('Kuliner'); setBusinessDescription(''); setBusinessWhatsApp(''); setBusinessAddress(''); setBusinessLatitude(''); setBusinessLongitude(''); setBusinessMapsUrl('');
  }

  function cancelProductEdit() {
    setEditingProductId(null); setProductName(''); setProductDescription(''); setProductPrice(''); setProductBusinessId('');
  }

  async function deleteProduct(record: OwnedRecord) {
    if (!user || !window.confirm(`Hapus produk “${String(record.title || 'Tanpa nama')}”? Tindakan ini tidak dapat dibatalkan.`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/seller/records', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'product', id: record.id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Produk gagal dihapus.');
      if (editingProductId === record.id) cancelProductEdit();
      setMessage('Produk berhasil dihapus.'); await loadRecords(user);
    } catch (e) { setError(friendlyError(e)); }
    finally { setBusy(false); }
  }

  async function requestAccountDeletion() {
    if (!user) return;
    const reason = window.prompt('Alasan penghapusan akun (opsional, maksimal 500 karakter):') || '';
    if (!window.confirm('Kirim permintaan penghapusan akun kepada admin? Akun tidak langsung dihapus.')) return;
    setBusy(true); setError(''); setMessage('');
    try { const token=await user.getIdToken(true); const response=await fetch('/api/account/deletion-request',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({reason})}); const result=await response.json().catch(()=>({})); if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Permintaan penghapusan gagal dikirim.'); setMessage(String(result.message||'Permintaan penghapusan akun telah dikirim ke admin.')); } catch(e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }

  async function logout() {
    try { const { auth } = getFirebase(); await signOut(auth); router.replace('/penjual/masuk'); }
    catch (e) { setError(friendlyError(e)); }
  }

  if (!authReady) return <main className="seller-dashboard-page"><p className="dashboard-loading">Memeriksa sesi akun…</p></main>;
  if (!user) return <main className="seller-dashboard-page"><p className="dashboard-loading">Silakan masuk untuk melanjutkan.</p>{error && <p role="alert" className="auth-error">{error}</p>}</main>;

  return <main className="seller-dashboard-page">
    <header className="detail-header"><Link className="detail-back" href="/"><ArrowLeft size={17}/> Kembali ke LOKAVA</Link><div className="detail-brand"><Store size={19}/> LOKAVA <span>RUANG PENJUAL</span></div><button className="dashboard-logout" onClick={logout}><LogOut size={15}/> Keluar</button></header>
    <nav className="dashboard-nav" aria-label="Navigasi ruang penjual"><a className="active" href="#ringkasan">Ringkasan</a><a href="#profil-usaha">Profil usaha</a><a href="#kelola-produk">Produk</a><a href="#paket-info">Paket & kuota</a><a href="#promosi">Promosi</a></nav>
    <section className="dashboard-content">
      <div className="dashboard-heading" id="ringkasan"><div><div className="eyebrow"><span/> RUANG PELAKU USAHA</div><h1>Kelola usaha<br/><em>Anda di LOKAVA.</em></h1><p className="dashboard-lead">Masuk sebagai <strong>{user.email || 'akun tanpa email'}</strong>. Data yang ditampilkan hanya dokumen yang cocok dengan UID akun ini.</p></div><button className="dashboard-refresh" onClick={() => void loadRecords()} disabled={loadingData}><RefreshCw size={15}/> {loadingData ? 'Memuat…' : 'Muat ulang'}</button></div>
      <div className="dashboard-notice"><ShieldAlert size={19}/><div><strong>Versi pengembangan — belum siap untuk transaksi produksi</strong><p>Pengajuan profil dan produk melewati API server yang memverifikasi Firebase ID token. Kuota produk diperiksa server berdasarkan paket aktif. Bukti pembayaran dapat diunggah secara privat dan diperiksa administrator, tetapi alur ini masih perlu pengujian sebelum produksi. Profil usaha yang sudah tayang dapat diperbarui; perubahan akan dikirim untuk ditinjau ulang sebelum tayang kembali. Jangan masukkan data sensitif.</p></div></div>
      {error && <p className="dashboard-feedback error" role="alert">{error}</p>}{message && <p className="dashboard-feedback success" role="status">{message}</p>}
      <div className="dashboard-stats"><article><Building2 size={19}/><span>Profil usaha</span><strong>{businesses.length}</strong><small>dokumen milik akun</small></article><article><PackagePlus size={19}/><span>Produk</span><strong>{products.length}</strong><small>termasuk draf</small></article><article><span className="status-dot"/><span>Status akun</span><strong>Belum diverifikasi</strong><small>status tidak ditentukan dari login</small></article></div>
      <div className="dashboard-columns">
        <section className="dashboard-panel" id="profil-usaha"><div className="dashboard-panel-title"><Building2 size={19}/><div><h2>Profil usaha</h2><p>Ajukan identitas usaha untuk ditinjau.</p></div></div>
          <form className="dashboard-form" onSubmit={createBusiness}><label htmlFor="business-name">Nama usaha</label><input id="business-name" required maxLength={100} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Contoh: Warung Pesisir"/><label htmlFor="business-type">Kategori</label><select id="business-type" value={businessType} onChange={(e) => setBusinessType(e.target.value)}><option>Kuliner</option><option>Penginapan</option><option>Wisata</option><option>Kerajinan</option><option>Jasa</option><option>Lainnya</option></select><label htmlFor="business-description">Deskripsi singkat</label><textarea id="business-description" required maxLength={1000} rows={4} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} placeholder="Ceritakan usaha Anda…"/><label htmlFor="business-whatsapp">Nomor WhatsApp usaha</label><input id="business-whatsapp" type="tel" required maxLength={30} value={businessWhatsApp} onChange={(e) => setBusinessWhatsApp(e.target.value)} placeholder="081234567890 atau 628123456789"/><small>Nomor dinormalisasi otomatis; pengunjung akan diarahkan ke WhatsApp usaha.</small><label htmlFor="business-address">Alamat usaha</label><textarea id="business-address" required maxLength={300} rows={2} value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} placeholder="Nama jalan, desa, kecamatan, kabupaten"/><LocationPicker latitude={businessLatitude.trim() === '' ? null : Number(businessLatitude)} longitude={businessLongitude.trim() === '' ? null : Number(businessLongitude)} mapsUrl={businessMapsUrl} onCoordinatesChange={(point) => { setBusinessLatitude(point.latitude === null ? '' : String(point.latitude)); setBusinessLongitude(point.longitude === null ? '' : String(point.longitude)); }} onMapsUrlChange={setBusinessMapsUrl} /><input type="hidden" name="business-latitude" value={businessLatitude}/><input type="hidden" name="business-longitude" value={businessLongitude}/><div className="dashboard-form-actions"><button className="button button-dark" type="submit" disabled={busy}><ArrowRight size={15}/> {editingBusinessId ? 'Simpan & kirim untuk ditinjau' : 'Kirim pengajuan'}</button>{editingBusinessId && <button className="button button-light" type="button" onClick={cancelBusinessEdit} disabled={busy}><X size={15}/> Batal</button>}</div></form>
          <div className="dashboard-records"><h3>Pengajuan tersimpan</h3>{businesses.length === 0 ? <p className="dashboard-empty">Belum ada profil usaha yang tersimpan.</p> : businesses.map((business) => <div className="dashboard-record" key={business.id}><div><strong>{String(business.name || 'Tanpa nama')}</strong><small>{String(business.category || 'Kategori belum diisi')}</small></div><span className="record-status">{sellerStatusLabel(business.approvalStatus || business.status)}</span>{renderRecordPhotos(business, 'business')}<button className="record-action" type="button" onClick={() => startEditBusiness(business)} disabled={busy} aria-label={`Edit ${String(business.name || 'usaha')}`}><Pencil size={14}/> Edit profil</button>{(business.status === 'published' || business.approvalStatus === 'approved') && <small className="record-review-note">Perubahan kontak atau lokasi akan menyembunyikan profil sementara sampai ditinjau ulang admin.</small>}{typeof business.reviewNote === 'string' && business.reviewNote && <small className="record-review-note">Catatan: {business.reviewNote}</small>}</div>)}</div>
        </section>
        <section className="dashboard-panel" id="kelola-produk"><div className="dashboard-panel-title"><PackagePlus size={19}/><div><h2>Tambah produk</h2><p>Produk baru disimpan sebagai draf.</p></div></div>
          <form className="dashboard-form" onSubmit={createProduct}><label htmlFor="product-business">Usaha pemilik</label><select id="product-business" required value={productBusinessId} onChange={(e)=>setProductBusinessId(e.target.value)}><option value="">Pilih profil usaha</option>{businesses.filter((b)=>b.status!=='archived').map((b)=><option key={b.id} value={b.id}>{String(b.name||'Usaha tanpa nama')} · {sellerStatusLabel(b.approvalStatus||b.status)}</option>)}</select><small>Produk harus terkait dengan profil usaha milik Anda. Produk publik akan mengikuti status persetujuan usaha terkait.</small><label htmlFor="product-name">Nama produk</label><input id="product-name" required maxLength={120} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: Paket oleh-oleh lokal"/><label htmlFor="product-price">Harga (Rp)</label><input id="product-price" type="number" min="0" step="1" required value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="50000"/><label htmlFor="product-description">Deskripsi produk</label><textarea id="product-description" required maxLength={1500} rows={4} value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Jelaskan produk Anda…"/><div className="dashboard-form-actions"><button className="button button-dark" type="submit" disabled={busy}><ArrowRight size={15}/> {editingProductId ? 'Simpan perubahan' : 'Simpan sebagai draf'}</button>{editingProductId && <button className="button button-light" type="button" onClick={cancelProductEdit} disabled={busy}><X size={15}/> Batal</button>}</div></form>
          <div className="dashboard-records"><h3>Produk tersimpan</h3>{products.length === 0 ? <p className="dashboard-empty">Belum ada produk yang tersimpan.</p> : products.map((product) => <div className="dashboard-record" key={product.id}><div><strong>{String(product.title || 'Tanpa nama')}</strong><small>{typeof product.price === 'number' ? `Rp ${product.price.toLocaleString('id-ID')}` : 'Harga belum tersedia'}</small></div><span className="record-status">{sellerStatusLabel(product.approvalStatus || product.status)}</span>{renderRecordPhotos(product, 'product')}{(product.status !== 'published' && product.approvalStatus !== 'approved') && <div className="record-actions"><button className="record-action" type="button" onClick={() => startEditProduct(product)} disabled={busy} aria-label={`Edit ${String(product.title || 'produk')}`}><Pencil size={14}/> Edit</button><button className="record-action danger" type="button" onClick={() => void deleteProduct(product)} disabled={busy} aria-label={`Hapus ${String(product.title || 'produk')}`}><Trash2 size={14}/> Hapus</button></div>}{typeof product.reviewNote === 'string' && product.reviewNote && <small className="record-review-note">Catatan: {product.reviewNote}</small>}</div>)}</div>
        </section>
      </div>
      <section className="dashboard-plan-note" id="paket-info"><div className="dashboard-plan-note-icon"><Store size={19}/></div><div><strong>Paket dan kuota</strong><p>Batas produk diperiksa di server: FREE (3 produk), PREMIUM (50 produk), BISNIS (200 produk). Aktivasi paket berbayar hanya dilakukan administrator setelah pembayaran diverifikasi.</p></div><span>PAKET</span></section>
      <section className="dashboard-panel seller-subscription-panel"><div className="dashboard-panel-title"><CreditCard size={19}/><div><h2>Langganan & pembayaran</h2><p>Harga dan instruksi berikut dikelola administrator LOKAVA.</p></div></div>
        <div className="seller-plan-grid seller-plan-grid-three"><article className="seller-plan-card"><span className="seller-plan-label">{paymentSettings.plans.free.name}</span><strong>{formatMoney(paymentSettings.plans.free.price)}<small>{paymentSettings.plans.free.price === 0 ? ' / gratis' : ' / harga paket'}</small></strong><p>Kuota hingga {paymentSettings.plans.free.productLimit} produk, {paymentSettings.plans.free.productPhotosTotal} foto produk total, dan {paymentSettings.plans.free.businessPhotosTotal} foto usaha.</p><span className="seller-plan-unavailable">Paket dasar</span></article>
          {(['premium', 'bisnis'] as const).map((planId) => { const plan = paymentSettings.plans[planId]; return <article key={planId} className={`seller-plan-card ${planId === 'bisnis' ? 'featured' : ''}`}><span className="seller-plan-label">{plan.name}{planId === 'bisnis' ? ' · SKALA BESAR' : ''}</span><strong>{formatMoney(plan.price)}<small> / {plan.durationDays} hari</small></strong><p>Kuota {plan.productLimit} produk · {plan.productPhotosPerProduct} foto per produk (maks. {plan.productPhotosTotal} total) · {plan.businessPhotosTotal} foto usaha.</p><div className="seller-plan-payment-actions">{paymentSettings.methods.qr.enabled && paymentSettings.methods.qr.imageUrl && <button type="button" className="button button-dark" disabled={busy} onClick={() => void requestPlan(planId, 'qr')}>Bayar via {paymentSettings.methods.qr.label} <ArrowRight size={14}/></button>}{paymentSettings.methods.bank.enabled && <button type="button" className="button button-light" disabled={busy} onClick={() => void requestPlan(planId, 'bank')}>Transfer bank <ArrowRight size={14}/></button>}{!paymentSettings.methods.qr.enabled && !paymentSettings.methods.bank.enabled && <span className="seller-plan-unavailable">Metode pembayaran belum tersedia</span>}</div></article>; })}
        </div>
        <div className="seller-payment-warning"><ShieldAlert size={17}/><p><strong>Periksa nominal dan kode pembayaran.</strong> Instruksi di bawah ini berasal dari konfigurasi administrator. Langganan baru aktif setelah pembayaran diverifikasi administrator; jangan membagikan bukti transfer di ruang publik.</p></div>
        <div className="dashboard-records"><h3>Riwayat permintaan</h3>{payments.length === 0 ? <p className="dashboard-empty">Belum ada permintaan paket.</p> : payments.map((payment) => <div className="dashboard-record payment-history-record" key={payment.id}><div><strong>{String(payment.planName || String(payment.planId || 'Paket').toUpperCase())} · {formatMoney(payment.amount)}</strong><small>Kode pembayaran: {String(payment.paymentCode || payment.id)} · {String(payment.status || 'pending')}</small>{typeof payment.reviewNote === 'string' && payment.reviewNote && <small className="record-review-note">Catatan: {payment.reviewNote}</small>}{renderPaymentInstructions(payment)}{payment.status === 'pending' && <div className="payment-proof-upload"><label className="record-action"><Upload size={14}/>{uploadingProofId === payment.id ? 'Mengunggah…' : payment.proofUploaded ? 'Ganti bukti pembayaran' : 'Unggah bukti pembayaran'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingProofId !== null} onChange={(event) => { const file = event.target.files?.[0]; void uploadPaymentProof(payment, file); event.currentTarget.value = ''; }} /></label><small>JPG, PNG, WebP · maksimal 2 MB. Bukti hanya dapat dilihat administrator.</small>{payment.proofUploaded && <span className="proof-uploaded-label">Bukti sudah diunggah</span>}</div>}</div><span className="record-status">{payment.status === 'paid' ? 'Aktif / dibayar' : payment.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span></div>)}</div></section>
      <section className="dashboard-panel seller-promotion-panel" id="promosi"><div className="dashboard-panel-title"><Megaphone size={19}/><div><h2>Promosi berbayar</h2><p>Tampilkan produk atau usaha di slot promosi halaman publik setelah pembayaran dan persetujuan admin.</p></div><span className="promotion-live-count"><Sparkles size={13}/> {promotions.filter((p) => p.status === 'active').length} aktif</span></div>
        <div className="promotion-price-grid">{([{key:'product_featured',label:'Produk unggulan'},{key:'category',label:'Promosi kategori'},{key:'business_featured',label:'Usaha unggulan'},{key:'homepage_banner',label:'Banner beranda'}] as const).map((item) => <div className="promotion-price-card" key={item.key}><span>{item.label}</span><strong>{formatMoney(promotionSettings.prices[item.key] || 0)}</strong><small>mulai dari 7 hari</small></div>)}</div>
        <form className="promotion-request-form" onSubmit={requestPromotion}><div className="promotion-form-heading"><span className="promotion-step">01</span><div><strong>Atur promosi</strong><small>Pilih konten yang sudah disetujui dan dipublikasikan.</small></div></div>
          <label htmlFor="promotion-kind">Jenis promosi</label><select id="promotion-kind" value={promotionKind} onChange={(e) => { setPromotionKind(e.target.value); setPromotionTargetId(''); }}><option value="product_featured">Produk unggulan</option><option value="category">Promosi kategori</option><option value="business_featured">Usaha unggulan</option><option value="homepage_banner">Banner beranda</option></select>
          <label htmlFor="promotion-target">Konten yang dipromosikan</label><select id="promotion-target" required value={promotionTargetId} onChange={(e) => setPromotionTargetId(e.target.value)}><option value="">Pilih konten publik…</option>{(promotionKind === 'business_featured' ? businesses.filter((r) => r.status === 'published' && r.approvalStatus === 'approved').map((r) => ({...r, targetType:'business'})) : promotionKind === 'homepage_banner' ? [...products.filter((r) => r.status === 'published' && r.approvalStatus === 'approved').map((r) => ({...r,targetType:'product'})), ...businesses.filter((r) => r.status === 'published' && r.approvalStatus === 'approved').map((r) => ({...r,targetType:'business'}))] : products.filter((r) => r.status === 'published' && r.approvalStatus === 'approved').map((r) => ({...r,targetType:'product'}))).map((record) => <option key={`${record.targetType}:${record.id}`} value={`${record.targetType}:${record.id}`}>{String(record.title || record.name || 'Konten')} · {record.targetType === 'business' ? 'Usaha' : 'Produk'}</option>)}</select>
          <label htmlFor="promotion-duration">Durasi promosi</label><select id="promotion-duration" value={promotionDuration} onChange={(e) => setPromotionDuration(Number(e.target.value))}>{promotionSettings.durations.map((days) => <option key={days} value={days}>{days} hari · {formatMoney(Math.round((promotionSettings.prices[promotionKind] || 0) * days / 7))}</option>)}</select>
          <label htmlFor="promotion-payment-method">Metode pembayaran</label><select id="promotion-payment-method" value={promotionPaymentMethod} onChange={(e) => setPromotionPaymentMethod(e.target.value as 'qr' | 'bank')}><option value="qr" disabled={!paymentSettings.methods.qr.enabled || !paymentSettings.methods.qr.imageUrl}>{paymentSettings.methods.qr.label || 'QRIS'}{!paymentSettings.methods.qr.enabled || !paymentSettings.methods.qr.imageUrl ? ' · belum tersedia' : ''}</option><option value="bank" disabled={!paymentSettings.methods.bank.enabled}>{paymentSettings.methods.bank.bankName ? `Transfer ${paymentSettings.methods.bank.bankName}` : 'Transfer bank'}{!paymentSettings.methods.bank.enabled ? ' · belum tersedia' : ''}</option></select>
          <div className="promotion-payment-note"><ShieldAlert size={16}/><span>Harga final dihitung server. Pilihan pembayaran memakai QR atau rekening yang dikonfigurasi admin. Promosi belum tayang sebelum bukti pembayaran diverifikasi dan konten disetujui.</span></div>
          <button className="button button-dark" type="submit" disabled={busy || loadingData}><Megaphone size={15}/> {busy ? 'Membuat permintaan…' : 'Buat permintaan promosi'} <ArrowRight size={15}/></button>
        </form>
        <div className="dashboard-records promotion-history"><h3>Riwayat promosi & pembayaran</h3>{promotionPayments.length === 0 ? <p className="dashboard-empty">Belum ada permintaan promosi.</p> : promotionPayments.map((payment) => { const promo = promotions.find((p) => p.id === payment.promotionId); return <div className="dashboard-record payment-history-record" key={payment.id}><div><strong>{String(payment.promotionName || 'Promosi')} · {formatMoney(Number(payment.amount || 0))}</strong><small>{String(payment.targetName || 'Konten')} · kode {String(payment.paymentCode || payment.id)}</small><span className={`promotion-status status-${String(promo?.status || payment.status).replaceAll('_','-')}`}>{String(promo?.status || payment.status).replaceAll('_',' ')}</span>{typeof payment.reviewNote === 'string' && payment.reviewNote && <small className="record-review-note">Catatan: {payment.reviewNote}</small>}{renderPaymentInstructions(payment)}{payment.status === 'pending' && <div className="payment-proof-upload"><label className="record-action"><Upload size={14}/>{uploadingProofId === payment.id ? 'Mengunggah…' : payment.proofUploaded ? 'Ganti bukti pembayaran' : 'Unggah bukti pembayaran'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingProofId !== null} onChange={(event) => { const file = event.target.files?.[0]; void uploadPaymentProof(payment, file); event.currentTarget.value = ''; }}/></label><small>Wajib unggah bukti JPG, PNG, atau WebP, maksimal 2 MB. Bukti hanya dapat dilihat admin.</small>{payment.proofUploaded && <span className="proof-uploaded-label">Bukti sudah diunggah</span>}</div>}</div><span className="record-status">{String(promo?.status || payment.status).replaceAll('_',' ')}</span></div>; })}</div>
      </section>
      <section className="dashboard-panel account-deletion-panel"><div className="dashboard-panel-title"><ShieldAlert size={18}/><div><h2>Pengaturan akun</h2><p>Anda dapat mengirim permintaan penghapusan akun. Admin akan meninjau transaksi dan kewajiban retensi terlebih dahulu; data tidak langsung dihapus dari browser.</p></div></div><button className="button button-light" type="button" onClick={() => void requestAccountDeletion()} disabled={busy}><Trash2 size={15}/> Ajukan penghapusan akun</button></section><p className="dashboard-footnote">Jika daftar kosong atau muncul permission denied, pastikan Firebase web config benar dan Firestore Rules telah dipasang serta diuji. Tidak ada hak admin yang diberikan dari halaman ini.</p>
    </section>
  </main>;
}
