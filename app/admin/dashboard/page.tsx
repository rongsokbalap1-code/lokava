'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut, type User, getIdTokenResult } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, BadgeCheck, Building2, Check, CreditCard, Bell,
  CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck, Clock3, FileText,
  LayoutDashboard, LogOut, Package, RefreshCw, Search, ShieldCheck, Store,
  Users, X, XCircle, Banknote, QrCode, Save, Upload, Trash2, Megaphone, UserX, UserCog, SlidersHorizontal,
} from 'lucide-react';
import { getFirebase } from '@/lib/firebase';

type ReviewRecord = {
  id: string;
  ownerUid?: string;
  name?: string;
  title?: string;
  category?: string;
  description?: string;
  whatsapp?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
  approvalStatus?: string;
  verified?: boolean;
  price?: number;
  createdAt?: string;
  reviewNote?: string;
  type?: string;
  planId?: string;
  planName?: string;
  amount?: number;
  paymentCode?: string;
  ownerEmail?: string | null;
  paymentMethod?: string;
  durationDays?: number;
  planPriceSnapshot?: number;
  proofPublicId?: string;
  promotionId?: string;
  promotionName?: string;
  kindLabel?: string;
  promotionKind?: string;
  targetName?: string;
  targetTitle?: string;
  targetDescription?: string;
  targetPreviewUrl?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  area?: string;
  mapsUrl?: string;
  author?: string;
  excerpt?: string;
  body?: string;
  photos?: Array<Record<string,unknown>>;
};
type Section = 'overview' | 'businesses' | 'products' | 'payments' | 'deletions' | 'content' | 'users' | 'settings' | 'audit' | 'notifications';
type ContentCollection='destinations'|'articles'|'packages'|'categories'|'banners';
type AdminUserRecord={uid:string;email:string|null;displayName:string|null;disabled:boolean;admin:boolean;createdAt:string|null;lastSignInAt:string|null;providerIds:string[]};
type AuditLogRecord={id:string;actorUid:string;actorEmail:string;action:string;targetCollection:string;targetId:string;targetLabel:string;status:string;createdAt:string|null};
type NotificationLogRecord={id:string;channel:string;title:string;status:string;attempts:number;providerStatus:number|null;createdAt:string|null};
type GeneralSiteSettings={siteTitle:string;tagline:string;seoTitle:string;seoDescription:string;siteUrl:string;searchIndexingEnabled:boolean;googleSiteVerification:string;supportEmail:string;supportWhatsApp:string;supportAddress:string;socialLinks:{instagram:string;facebook:string;youtube:string}};
const DEFAULT_GENERAL_SETTINGS:GeneralSiteSettings={siteTitle:'LOKAVA',tagline:'Jelajahi Keindahan Sukabumi Selatan',seoTitle:'LOKAVA — Jelajahi Keindahan Sukabumi Selatan',seoDescription:'Temukan destinasi, kuliner, penginapan, produk, dan usaha lokal Sukabumi Selatan bersama LOKAVA.',siteUrl:'',searchIndexingEnabled:true,googleSiteVerification:'',supportEmail:'',supportWhatsApp:'',supportAddress:'',socialLinks:{instagram:'',facebook:'',youtube:''}};
type DeletionRequest = { id:string; ownerUid:string; ownerEmail:string|null; reason:string; status:string; createdAt:string|null; reviewNote?:string };
type PaymentSettings = {
  plans: { free: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number }; premium: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number }; bisnis: { name: string; price: number; productLimit: number; durationDays: number; productPhotosPerProduct: number; productPhotosTotal: number; businessPhotosTotal: number } };
  methods: { qr: { enabled: boolean; label: string; imageUrl: string; publicId: string; instructions: string }; bank: { enabled: boolean; bankName: string; accountName: string; accountNumber: string; instructions: string } };
};
const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { plans: { free: { name: 'FREE', price: 0, productLimit: 3, durationDays: 30, productPhotosPerProduct:3, productPhotosTotal:3, businessPhotosTotal:3 }, premium: { name: 'PREMIUM', price: 25000, productLimit: 50, durationDays: 30, productPhotosPerProduct:5, productPhotosTotal:250, businessPhotosTotal:10 }, bisnis: { name: 'BISNIS', price: 50000, productLimit: 200, durationDays: 30, productPhotosPerProduct:8, productPhotosTotal:1600, businessPhotosTotal:20 } }, methods: { qr: { enabled: false, label: 'QRIS', imageUrl: '', publicId: '', instructions: 'Bayar sesuai nominal pada permintaan langganan.' }, bank: { enabled: false, bankName: '', accountName: '', accountNumber: '', instructions: 'Cantumkan kode pembayaran pada berita transfer.' } } };

type DecisionTarget = { collectionName: 'businesses' | 'products'; id: string; title: string };

function getErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  if (code === 'permission-denied') return 'Akses ditolak. Pastikan akun memiliki custom claim admin dan Firestore Rules sudah diterapkan.';
  if (code === 'unavailable') return 'Firebase sedang tidak tersedia. Periksa koneksi lalu coba lagi.';
  if (code === 'failed-precondition') return 'Firestore memerlukan konfigurasi tambahan.';
  return error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui.';
}

function statusLabel(record: ReviewRecord) {
  const status = record.approvalStatus || record.status || 'unknown';
  const labels: Record<string, string> = {
    pending: 'Menunggu tinjauan', approved: 'Disetujui', rejected: 'Perlu revisi',
    published: 'Dipublikasikan', draft: 'Draf', archived: 'Diarsipkan',
  };
  return labels[status] || status;
}

function formatDate(value?: string) {
  if (!value) return 'Tanggal tidak tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Tanggal tidak valid' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<'loading' | 'signed-out' | 'denied' | 'allowed' | 'error'>('loading');
  const [businesses, setBusinesses] = useState<ReviewRecord[]>([]);
  const [products, setProducts] = useState<ReviewRecord[]>([]);
  const [payments, setPayments] = useState<ReviewRecord[]>([]);
  const [promotions, setPromotions] = useState<ReviewRecord[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [contentCollection,setContentCollection]=useState<ContentCollection>('destinations');
  const [contentItems,setContentItems]=useState<ReviewRecord[]>([]);
  const [editingContentId,setEditingContentId]=useState<string|null>(null);
  const [contentTitle,setContentTitle]=useState('');
  const [contentSlug,setContentSlug]=useState('');
  const [contentSeoTitle,setContentSeoTitle]=useState('');
  const [contentSeoDescription,setContentSeoDescription]=useState('');
  const [contentDescription,setContentDescription]=useState('');
  const [contentCategory,setContentCategory]=useState('');
  const [contentArea,setContentArea]=useState('');
  const [contentAddress,setContentAddress]=useState('');
  const [contentMapsUrl,setContentMapsUrl]=useState('');
  const [contentLatitude,setContentLatitude]=useState('');
  const [contentLongitude,setContentLongitude]=useState('');
  const [contentPrice,setContentPrice]=useState('');
  const [contentAuthor,setContentAuthor]=useState('');
  const [contentExcerpt,setContentExcerpt]=useState('');
  const [contentBody,setContentBody]=useState('');
  const [contentStatus,setContentStatus]=useState<'draft'|'published'>('draft');
  const [contentPhotos,setContentPhotos]=useState<Array<Record<string,unknown>>>([]);
  const [uploadingContentPhoto,setUploadingContentPhoto]=useState(false);
  const [adminUsers,setAdminUsers]=useState<AdminUserRecord[]>([]);
  const [userNextPageToken,setUserNextPageToken]=useState<string|null>(null);
  const [generalSettings,setGeneralSettings]=useState<GeneralSiteSettings>(DEFAULT_GENERAL_SETTINGS);
  const [auditLogs,setAuditLogs]=useState<AuditLogRecord[]>([]);
  const [notificationLogs,setNotificationLogs]=useState<NotificationLogRecord[]>([]);
  const [promotionSettings, setPromotionSettings] = useState<{prices:Record<string,number>;durations:number[]}>({prices:{product_featured:20000,category:30000,business_featured:50000,homepage_banner:100000},durations:[7,14,21,30]});
  const [savingPromotionSettings, setSavingPromotionSettings] = useState(false);
  const [section, setSection] = useState<Section>('overview');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rejectTarget, setRejectTarget] = useState<DecisionTarget | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const [loadingProofId, setLoadingProofId] = useState<string | null>(null);

  const loadPaymentSettings = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/admin/payment-settings', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Pengaturan pembayaran gagal dimuat.');
      if (result.settings) setPaymentSettings(result.settings as PaymentSettings);
    } catch (err) { setError(getErrorMessage(err)); }
  }, [user]);

  const loadAuditLogs=useCallback(async()=>{if(!user)return;try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/audit-logs?limit=100',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Audit log gagal dimuat.');setAuditLogs(Array.isArray(result.logs)?result.logs as AuditLogRecord[]:[])}catch(err){setError(getErrorMessage(err))}},[user]);
  const loadNotificationLogs=useCallback(async()=>{if(!user)return;try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/notifications',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Riwayat notifikasi gagal dimuat.');setNotificationLogs(Array.isArray(result.notifications)?result.notifications as NotificationLogRecord[]:[])}catch(err){setError(getErrorMessage(err))}},[user]);

  const loadGeneralSettings = useCallback(async()=>{if(!user)return;try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/site-settings',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Pengaturan situs gagal dimuat.');if(result.settings)setGeneralSettings({...DEFAULT_GENERAL_SETTINGS,...result.settings,socialLinks:{...DEFAULT_GENERAL_SETTINGS.socialLinks,...result.settings.socialLinks}})}catch(err){setError(getErrorMessage(err))}},[user]);
  async function saveGeneralSettings(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!user)return;setBusyKey('general-settings');setError('');setNotice('');try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/site-settings',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(generalSettings)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Pengaturan situs gagal disimpan.');setNotice('Pengaturan situs tersimpan. Domain kanonis, metadata, sitemap, robots, dan kontak publik akan mengikuti pengaturan tersimpan. Pastikan domain sudah aktif melalui HTTPS.');await loadGeneralSettings()}catch(err){setError(getErrorMessage(err))}finally{setBusyKey('')}}

  const loadAdminUsers = useCallback(async (pageToken?:string,append=false) => {if(!user)return;try{const token=await user.getIdToken(true);const suffix=pageToken?`?pageToken=${encodeURIComponent(pageToken)}`:'';const response=await fetch(`/api/admin/users${suffix}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Daftar akun gagal dimuat.');const list=Array.isArray(result.users)?result.users as AdminUserRecord[]:[];setAdminUsers(current=>append?[...current,...list]:list);setUserNextPageToken(typeof result.nextPageToken==='string'?result.nextPageToken:null)}catch(err){setError(getErrorMessage(err))}},[user]);
  async function setUserDisabled(item:AdminUserRecord,disabled:boolean){if(!user||item.admin)return;if(!window.confirm(`${disabled?'Nonaktifkan':'Aktifkan kembali'} akun ${item.email||item.uid}?`))return;setBusyKey(`user:${item.uid}`);setError('');setNotice('');try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/users',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({uid:item.uid,action:disabled?'disable':'enable'})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Status akun gagal diperbarui.');setNotice(disabled?'Akun dinonaktifkan.':'Akun diaktifkan kembali.');await loadAdminUsers()}catch(err){setError(getErrorMessage(err))}finally{setBusyKey('')}}

  const loadContent = useCallback(async (collectionName=contentCollection) => {
    if(!user)return;try{const token=await user.getIdToken(true);const response=await fetch(`/api/admin/content?collection=${collectionName}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Konten gagal dimuat.');setContentItems(Array.isArray(result.items)?result.items as ReviewRecord[]:[])}catch(err){setError(getErrorMessage(err))}
  },[user,contentCollection]);
  async function uploadContentPhoto(file?:File){if(!user||!file)return;setUploadingContentPhoto(true);setError('');setNotice('');try{const token=await user.getIdToken(true);const form=new FormData();form.append('collectionName',contentCollection);form.append('file',file);const response=await fetch('/api/admin/content/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});const result=await response.json().catch(()=>({}));if(!response.ok||!result.photo)throw new Error(typeof result.error==='string'?result.error:'Foto gagal diunggah.');setContentPhotos(current=>[...current,result.photo].slice(0,10));setNotice('Foto berhasil diunggah ke Cloudinary. Simpan konten agar foto terhubung.')}catch(err){setError(getErrorMessage(err))}finally{setUploadingContentPhoto(false)}}
  function startEditContent(item:ReviewRecord){setEditingContentId(item.id);setContentTitle(String(item.title||item.name||''));setContentSlug(String(item.slug||''));setContentSeoTitle(String(item.seoTitle||''));setContentSeoDescription(String(item.seoDescription||''));setContentDescription(String(item.description||''));setContentCategory(String(item.category||''));setContentArea(String(item.area||''));setContentAddress(String(item.address||''));setContentMapsUrl(String(item.mapsUrl||''));setContentLatitude(typeof item.latitude==='number'?String(item.latitude):'');setContentLongitude(typeof item.longitude==='number'?String(item.longitude):'');setContentPrice(typeof item.price==='number'?String(item.price):'');setContentAuthor(String(item.author||''));setContentExcerpt(String(item.excerpt||''));setContentBody(String(item.body||item.description||''));setContentStatus(item.status==='published'?'published':'draft');setContentPhotos(Array.isArray((item as any).photos)?(item as any).photos:[]);setError('');setNotice('');document.getElementById('admin-content-form')?.scrollIntoView({behavior:'smooth',block:'start'})}
  function resetContentForm(){setEditingContentId(null);setContentTitle('');setContentSlug('');setContentSeoTitle('');setContentSeoDescription('');setContentDescription('');setContentCategory('');setContentArea('');setContentAddress('');setContentMapsUrl('');setContentLatitude('');setContentLongitude('');setContentPrice('');setContentAuthor('');setContentExcerpt('');setContentBody('');setContentStatus('draft');setContentPhotos([])}
  async function saveContent(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!user)return;setBusyKey('content-save');setError('');setNotice('');try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/content',{method:editingContentId?'PATCH':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({collectionName:contentCollection,...(editingContentId?{id:editingContentId}:{}),title:contentTitle.trim(),slug:contentSlug.trim(),seoTitle:contentSeoTitle.trim(),seoDescription:contentSeoDescription.trim(),description:contentDescription.trim(),category:contentCategory.trim(),area:contentArea.trim(),address:contentAddress.trim(),mapsUrl:contentMapsUrl.trim(),latitude:contentLatitude.trim(),longitude:contentLongitude.trim(),price:contentPrice.trim()===''?null:Number(contentPrice),author:contentAuthor,excerpt:contentExcerpt,body:contentBody,status:contentStatus,photos:contentPhotos})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Konten gagal disimpan.');setNotice(contentStatus==='published'?'Konten disimpan dan dipublikasikan. Periksa data sebelum mengumumkannya.':'Konten disimpan sebagai draf.');resetContentForm();await loadContent(contentCollection)}catch(err){setError(getErrorMessage(err))}finally{setBusyKey('')}}
  async function archiveContent(item:ReviewRecord){if(!user||!window.confirm(`Arsipkan “${item.title||item.name||item.id}”? Konten tidak lagi ditampilkan publik.`))return;setBusyKey(`content:${item.id}`);setError('');try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/content',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({collectionName:contentCollection,id:item.id})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Konten gagal diarsipkan.');setNotice('Konten diarsipkan.');await loadContent(contentCollection)}catch(err){setError(getErrorMessage(err))}finally{setBusyKey('')}}

  const loadDeletionRequests = useCallback(async () => {
    if (!user) return;
    try { const token=await user.getIdToken(true); const response=await fetch('/api/admin/account-deletion',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}); const result=await response.json().catch(()=>({})); if(!response.ok) throw new Error(typeof result.error==='string'?result.error:'Permintaan penghapusan gagal dimuat.'); setDeletionRequests(Array.isArray(result.requests)?result.requests as DeletionRequest[]:[]); } catch(err) { setError(getErrorMessage(err)); }
  }, [user]);

  async function decideDeletion(item:DeletionRequest,decision:'review'|'complete'|'reject') {
    if(!user)return; let reason=''; if(decision==='complete'&&!window.confirm(`Proses penghapusan akun ${item.ownerEmail||item.ownerUid}? Profil/produk akan diarsipkan dan akun Authentication dihapus. Transaksi serta audit dipertahankan untuk retensi.`))return; if(decision==='reject'){const input=window.prompt('Alasan penolakan (minimal 5 karakter):');if(input===null)return;reason=input.trim();if(reason.length<5){setError('Alasan penolakan minimal 5 karakter.');return;}} setBusyKey(`deletion:${item.id}`);setError('');setNotice('');try{const token=await user.getIdToken(true);const response=await fetch('/api/admin/account-deletion',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({requestId:item.id,decision,reason})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(typeof result.error==='string'?result.error:'Permintaan penghapusan gagal diproses.');setNotice(String(result.message||({review:'Permintaan ditandai sedang ditinjau.',complete:'Penghapusan akun diproses.',reject:'Permintaan ditolak.'}[decision])));await loadDeletionRequests();}catch(err){setError(getErrorMessage(err));}finally{setBusyKey('');}
  }

  const loadPromotionData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/admin/promotions', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Pengaturan promosi gagal dimuat.');
      if (result.settings?.prices) setPromotionSettings({ prices: result.settings.prices, durations: Array.isArray(result.settings.durations) ? result.settings.durations : [7,14,21,30] });
      if (Array.isArray(result.promotions)) setPromotions(result.promotions as ReviewRecord[]);
    } catch (err) { setError(getErrorMessage(err)); }
  }, [user]);

  async function savePromotionSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!user) return;
    setSavingPromotionSettings(true); setError(''); setNotice('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/admin/promotions', { method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({settings:promotionSettings}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Harga promosi gagal disimpan.');
      if (result.settings) setPromotionSettings(result.settings);
      setNotice('Harga dan durasi promosi berhasil disimpan. Perubahan berlaku untuk permintaan baru.');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSavingPromotionSettings(false); }
  }

  async function decidePromotion(target: ReviewRecord, decision: 'approve' | 'reject') {
    if (!user) return;
    let reason = '';
    if (decision === 'approve') {
      if (!window.confirm(`Setujui konten promosi “${target.targetName || target.kindLabel || target.id}” dan tampilkan di slot publik selama ${target.durationDays || 7} hari? Pastikan konten layak dan pembayaran sudah disetujui.`)) return;
    } else {
      const input = window.prompt('Alasan penolakan konten (minimal 5 karakter):');
      if (input === null) return;
      reason = input.trim(); if (reason.length < 5 || reason.length > 500) { setError('Alasan penolakan harus berisi 5–500 karakter.'); return; }
    }
    setBusyKey(`promotion:${target.id}`); setError(''); setNotice('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/admin/promotions', { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify({promotionId:target.id,decision,reason}) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Keputusan promosi gagal disimpan.');
      setNotice(decision === 'approve' ? 'Konten promosi disetujui dan dijadwalkan tampil sampai masa promosi berakhir.' : 'Konten promosi ditolak. Alasan penolakan dicatat.');
      await loadPromotionData();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusyKey(''); }
  }

  async function savePaymentSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setSavingPaymentSettings(true); setError(''); setNotice('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: paymentSettings }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Pengaturan pembayaran gagal disimpan.');
      if (result.settings) setPaymentSettings(result.settings as PaymentSettings);
      setNotice('Harga paket dan metode pembayaran berhasil disimpan. Pengaturan ini akan ditampilkan kepada penjual untuk permintaan baru.');
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setSavingPaymentSettings(false); }
  }

  async function handleQrUpload(file?: File) {
    if (!file || !user) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('QR harus berupa file PNG, JPG, atau WebP.'); return; }
    if (file.size > 240 * 1024) { setError('Ukuran gambar QR maksimal 240 KB. Gunakan gambar yang lebih kecil.'); return; }
    setUploadingQr(true); setError(''); setNotice('Mengunggah QR ke Cloudinary…');
    try {
      const token = await user.getIdToken(true);
      const form = new FormData(); form.append('file', file);
      const response = await fetch('/api/admin/payment-settings/qr', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.imageUrl !== 'string' || typeof result.publicId !== 'string') throw new Error(typeof result.error === 'string' ? result.error : 'QR gagal diunggah ke Cloudinary.');
      setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, qr: { ...current.methods.qr, imageUrl: result.imageUrl, publicId: result.publicId } } }));
      setNotice('QR berhasil diunggah ke Cloudinary. Tekan Simpan pengaturan untuk mengaktifkan perubahan.');
    } catch (err) { setError(getErrorMessage(err)); setNotice(''); }
    finally { setUploadingQr(false); }
  }

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { db } = getFirebase();
      const [businessSnapshot, productSnapshot, paymentSnapshot] = await Promise.all([
        getDocs(collection(db, 'businesses')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'transactions')),
      ]);
      setBusinesses(businessSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ReviewRecord[]);
      setProducts(productSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ReviewRecord[]);
      setPayments(paymentSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => item.type === 'subscription' || item.type === 'promotion').sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))) as ReviewRecord[]);
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      const { auth } = getFirebase();
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (!active) return;
        setUser(currentUser);
        if (!currentUser) { setAccess('signed-out'); return; }
        try {
          const token = await getIdTokenResult(currentUser, true);
          if (!active) return;
          if (token.claims.admin === true) setAccess('allowed');
          else setAccess('denied');
        } catch (err) {
          if (!active) return;
          setError(getErrorMessage(err)); setAccess('error');
        }
      });
    } catch (err) {
      setError(getErrorMessage(err)); setAccess('error');
    }
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => { if (access === 'allowed') { void loadData(); void loadPaymentSettings(); void loadPromotionData(); void loadDeletionRequests(); void loadContent(); void loadAdminUsers(); void loadGeneralSettings(); void loadAuditLogs(); void loadNotificationLogs(); } }, [access, loadData, loadPaymentSettings, loadPromotionData, loadDeletionRequests, loadContent, loadAdminUsers, loadGeneralSettings, loadAuditLogs, loadNotificationLogs]);

  useEffect(()=>{if(access==='allowed'&&section==='content')void loadContent(contentCollection)},[access,section,contentCollection,loadContent]);

  const pendingBusinesses = useMemo(() => businesses.filter((item) => (item.approvalStatus || item.status) === 'pending'), [businesses]);
  const pendingProducts = useMemo(() => products.filter((item) => (item.approvalStatus || item.status) === 'pending'), [products]);
  const visibleBusinesses = useMemo(() => businesses.filter((item) => `${item.name || ''} ${item.category || ''} ${item.ownerUid || ''} ${item.whatsapp || ''} ${item.address || ''}`.toLowerCase().includes(search.toLowerCase())), [businesses, search]);
  const visibleProducts = useMemo(() => products.filter((item) => `${item.title || ''} ${item.ownerUid || ''}`.toLowerCase().includes(search.toLowerCase())), [products, search]);

  async function decide(target: DecisionTarget, approved: boolean, reason = '') {
    const key = `${target.collectionName}:${target.id}`;
    setBusyKey(key); setError(''); setNotice('');
    try {
      if (!user) throw new Error('Sesi administrator tidak tersedia. Silakan masuk kembali.');
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          collectionName: target.collectionName,
          recordId: target.id,
          decision: approved ? 'approve' : 'revision',
          reason: reason.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Keputusan tinjauan gagal disimpan.');
      setNotice(approved ? `${target.title} disetujui melalui layanan tepercaya. Periksa hasil publikasi sebelum mengumumkannya.` : `${target.title} ditandai perlu revisi dan aktivitas dicatat.`);
      setRejectTarget(null); setRejectReason('');
      await loadData();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusyKey(''); }
  }

  async function loadPaymentProof(target: ReviewRecord) {
    if (!user) return;
    setLoadingProofId(target.id); setError('');
    try {
      const token = await user.getIdToken(true);
      const response = await fetch(`/api/admin/payments/proof?transactionId=${encodeURIComponent(target.id)}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== 'string') throw new Error(typeof result.error === 'string' ? result.error : 'Bukti pembayaran tidak dapat dibuka.');
      setProofUrls((current) => ({ ...current, [target.id]: result.url }));
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setLoadingProofId(null); }
  }

  async function decidePayment(target: ReviewRecord, decision: 'approve' | 'reject') {
    if (!user) return;
    let reason = '';
    if (decision === 'approve') {
      if (!window.confirm(target.type === 'promotion' ? `Verifikasi pembayaran promosi “${target.promotionName || target.targetName || target.id}” dari ${target.ownerEmail || target.ownerUid || 'penjual'}? Pastikan dana benar-benar sudah diterima. Setelah ini konten masih menunggu persetujuan admin.` : `Aktifkan paket ${String(target.planName || target.planId || '').toUpperCase()} untuk ${target.ownerEmail || target.ownerUid || 'penjual'}? Pastikan dana benar-benar sudah diterima di rekening resmi sebelum menyetujui.`)) return;
    } else {
      const input = window.prompt('Alasan penolakan (minimal 5 karakter):');
      if (input === null) return;
      reason = input.trim();
      if (reason.length < 5 || reason.length > 500) { setError('Alasan penolakan harus berisi 5–500 karakter.'); return; }
    }
    setBusyKey(`payment:${target.id}`); setError(''); setNotice('');
    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/admin/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ transactionId: target.id, decision, reason }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Keputusan pembayaran gagal disimpan.');
      setNotice(decision === 'approve' ? (target.type === 'promotion' ? 'Pembayaran promosi diverifikasi. Konten masuk antrean persetujuan sebelum tampil publik.' : 'Pembayaran ditandai lunas dan langganan diaktifkan. Pastikan bukti dana telah diverifikasi di luar aplikasi.') : 'Permintaan pembayaran ditolak dan alasannya dicatat.');
      await loadData(); await loadPromotionData();
    } catch (err) { setError(getErrorMessage(err)); }
    finally { setBusyKey(''); }
  }

  async function logout() {
    try { const { auth } = getFirebase(); await signOut(auth); router.replace('/penjual/masuk'); }
    catch (err) { setError(getErrorMessage(err)); }
  }

  if (access === 'loading') return <main className="admin-shell"><div className="admin-gate"><div className="admin-mark"><Store size={23}/></div><p>Memeriksa akses administrator…</p></div></main>;
  if (access === 'signed-out') return <main className="admin-shell"><div className="admin-gate"><div className="admin-mark"><ShieldCheck size={23}/></div><p className="admin-kicker">AREA TERBATAS</p><h1>Masuk sebagai administrator.</h1><p>Dashboard ini hanya tersedia untuk akun dengan custom claim admin yang ditetapkan melalui proses tepercaya.</p><Link className="admin-primary-link" href="/penjual/masuk">Ke halaman masuk <ChevronRight size={16}/></Link><Link className="admin-secondary-link" href="/">Kembali ke situs publik</Link></div></main>;
  if (access === 'denied') return <main className="admin-shell"><div className="admin-gate"><div className="admin-mark danger"><ShieldCheck size={23}/></div><p className="admin-kicker">AKSES DITOLAK</p><h1>Akun ini bukan administrator.</h1><p>Login berhasil, tetapi Firebase ID token tidak memiliki custom claim <code>admin: true</code>. Role tidak bisa diberikan dari halaman web.</p><button className="admin-primary-link" onClick={() => void logout()}>Keluar dari akun <LogOut size={16}/></button><Link className="admin-secondary-link" href="/">Kembali ke situs publik</Link></div></main>;
  if (access === 'error') return <main className="admin-shell"><div className="admin-gate"><CircleAlert size={28}/><h1>Dashboard belum dapat dibuka.</h1><p>{error || 'Periksa konfigurasi Firebase.'}</p><Link className="admin-secondary-link" href="/">Kembali ke situs publik</Link></div></main>;

  const activeCount = businesses.filter((item) => item.approvalStatus === 'approved').length + products.filter((item) => item.approvalStatus === 'approved').length;
  const navItems: { id: Section; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'businesses', label: 'Verifikasi usaha', icon: Building2, count: pendingBusinesses.length },
    { id: 'products', label: 'Moderasi produk', icon: Package, count: pendingProducts.length },
    { id: 'payments', label: 'Paket, promosi & pembayaran', icon: CreditCard, count: payments.filter((item) => item.status === 'pending').length + promotions.filter((item) => item.status === 'content_approval_pending').length },
    { id: 'deletions', label: 'Permintaan hapus akun', icon: UserX, count: deletionRequests.length },
    { id: 'content', label: 'Konten situs', icon: FileText, count: undefined },
    { id: 'users', label: 'Pengguna', icon: UserCog, count: adminUsers.length },
    { id: 'settings', label: 'Pengaturan situs', icon: SlidersHorizontal, count: undefined },
    { id: 'notifications', label: 'Notifikasi', icon: Bell, count: notificationLogs.filter(x=>x.status==='failed').length },
    { id: 'audit', label: 'Audit log', icon: Activity, count: undefined },
  ];

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link href="/" className="admin-logo"><span className="admin-logo-symbol"><Store size={20}/></span><span>LOKAVA<small>CONTROL CENTER</small></span></Link>
      <div className="admin-sidebar-label">WORKSPACE</div>
      <nav className="admin-nav" aria-label="Navigasi administrator">
        {navItems.map((item) => <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => { setSection(item.id); setSearch(''); }}><item.icon size={17}/><span>{item.label}</span>{typeof item.count === 'number' && item.count > 0 && <b>{item.count}</b>}</button>)}
      </nav>
      <div className="admin-sidebar-bottom"><div className="admin-secure"><ShieldCheck size={17}/><div><strong>Akses terverifikasi</strong><small>Firebase custom claims</small></div></div><Link href="/" className="admin-public-link"><ArrowLeft size={15}/> Lihat situs publik</Link></div>
    </aside>

    <section className="admin-main">
      <header className="admin-topbar"><div className="admin-breadcrumb">LOKAVA <ChevronRight size={14}/> <span>Administrator</span></div><div className="admin-user"><span className="admin-avatar">{(user?.email || 'A').slice(0, 1).toUpperCase()}</span><div className="admin-user-copy"><strong>{user?.email || 'Administrator'}</strong><small>Administrator terverifikasi</small></div><button aria-label="Keluar" title="Keluar" onClick={() => void logout()}><LogOut size={17}/></button></div></header>
      <div className="admin-content">
        <div className="admin-page-heading"><div><p className="admin-kicker">PANEL OPERASIONAL <span>•</span> SUKABUMI SELATAN</p><h1>{section === 'overview' ? 'Selamat datang kembali.' : section === 'businesses' ? 'Verifikasi usaha.' : section === 'products' ? 'Moderasi produk.' : section === 'deletions' ? 'Permintaan penghapusan akun.' : section === 'content' ? 'Kelola konten situs.' : section === 'users' ? 'Kelola status akun penjual.' : section === 'settings' ? 'SEO, kontak, dan media sosial.' : section === 'notifications' ? 'Riwayat pengiriman notifikasi.' : section === 'audit' ? 'Jejak tindakan sensitif.' : 'Paket, promosi & pembayaran.'}</h1><p>{section === 'overview' ? 'Pantau pengajuan dan jaga kualitas informasi yang tampil di LOKAVA.' : section === 'businesses' ? 'Tinjau informasi usaha sebelum disetujui untuk tampil ke publik.' : section === 'products' ? 'Pastikan informasi produk layak dan jelas sebelum publikasi.' : section === 'deletions' ? 'Tinjau permintaan, pertimbangkan retensi transaksi, lalu proses atau tolak dengan alasan.' : section === 'content' ? 'Buat dan kelola destinasi, artikel, paket wisata, kategori, dan banner. Publikasi hanya dilakukan oleh administrator.' : section === 'users' ? 'Lihat akun terdaftar dan nonaktifkan akun penjual yang melanggar kebijakan. Peran admin tidak dapat diubah dari panel ini.' : section === 'settings' ? 'Atur judul dan deskripsi SEO, email/WhatsApp dukungan, alamat operator, dan tautan sosial publik.' : section === 'notifications' ? 'Pantau notifikasi Telegram yang terkirim, gagal, atau dilewati karena konfigurasi belum tersedia.' : section === 'audit' ? 'Lihat aktor, tindakan, objek, status, dan waktu untuk operasi administratif yang dicatat.' : 'Atur harga promosi, verifikasi bukti pembayaran, dan setujui konten sebelum tampil di beranda publik.'}</p></div><button className="admin-refresh" onClick={() => void loadData()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{loading ? 'Memuat data' : 'Perbarui data'}</button></div>
        <div className="admin-security-note"><ShieldCheck size={18}/><div><strong>Mode administrasi terbatas</strong><span>Keputusan tinjauan dikirim ke API server dan dicatat di audit log. Alur sensitif lain masih membutuhkan endpoint tepercaya dan pengujian sebelum produksi.</span></div></div>
        {error && <div className="admin-alert error" role="alert"><CircleAlert size={17}/>{error}</div>}{notice && <div className="admin-alert success" role="status"><CheckCircle2 size={17}/>{notice}</div>}

        {section === 'overview' && <>
          <div className="admin-metric-grid">
            <article className="admin-metric-card"><div className="metric-top"><span>Total profil usaha</span><span className="metric-icon"><Building2 size={18}/></span></div><strong>{businesses.length}</strong><small><span className="metric-neutral"><Activity size={12}/>{pendingBusinesses.length} menunggu</span> untuk ditinjau</small></article>
            <article className="admin-metric-card"><div className="metric-top"><span>Total produk</span><span className="metric-icon"><Package size={18}/></span></div><strong>{products.length}</strong><small><span className="metric-neutral"><Clock3 size={12}/>{pendingProducts.length} menunggu</span> untuk ditinjau</small></article>
            <article className="admin-metric-card"><div className="metric-top"><span>Antrean pemeriksaan</span><span className="metric-icon amber"><ClipboardCheck size={18}/></span></div><strong>{pendingBusinesses.length + pendingProducts.length}</strong><small>Usaha dan produk perlu keputusan</small></article>
            <article className="admin-metric-card"><div className="metric-top"><span>Disetujui</span><span className="metric-icon green"><BadgeCheck size={18}/></span></div><strong>{activeCount}</strong><small>Rekaman dengan status disetujui</small></article>
          </div>
          <div className="admin-overview-grid">
            <section className="admin-card admin-queue-card"><div className="admin-card-heading"><div><h2>Perlu ditinjau</h2><p>Prioritas pemeriksaan terbaru</p></div><span className="admin-count-pill">{pendingBusinesses.length + pendingProducts.length} antrean</span></div>
              {pendingBusinesses.length + pendingProducts.length === 0 ? <div className="admin-empty"><CheckCircle2 size={24}/><strong>Antrean bersih</strong><p>Tidak ada pengajuan berstatus menunggu saat ini.</p></div> : <div className="admin-queue-list">{[...pendingBusinesses.slice(0, 4).map((item) => ({ ...item, entityType: 'business' as const })), ...pendingProducts.slice(0, 4).map((item) => ({ ...item, entityType: 'product' as const }))].slice(0, 6).map((item) => <div className="admin-queue-row" key={`${item.entityType}:${item.id}`}><span className="queue-icon">{item.entityType === 'business' ? <Building2 size={17}/> : <Package size={17}/>}</span><div className="queue-copy"><strong>{item.name || item.title || 'Tanpa nama'}</strong><small>{item.entityType === 'business' ? `Usaha · ${item.category || 'Kategori belum diisi'}` : 'Produk'} · {formatDate(item.createdAt)}</small></div><span className="admin-status pending">Menunggu</span><button aria-label="Tinjau" onClick={() => { setSection(item.entityType === 'business' ? 'businesses' : 'products'); setSearch(item.name || item.title || ''); }}><ChevronRight size={17}/></button></div>)}</div>}
            </section>
            <section className="admin-card admin-quick-card"><div className="admin-card-heading"><div><h2>Akses cepat</h2><p>Langkah operasional</p></div><Activity size={18}/></div><button className="admin-quick-action" onClick={() => setSection('businesses')}><span className="quick-action-icon"><Building2 size={18}/></span><span><strong>Periksa usaha</strong><small>{pendingBusinesses.length} pengajuan menunggu</small></span><ChevronRight size={17}/></button><button className="admin-quick-action" onClick={() => setSection('products')}><span className="quick-action-icon"><Package size={18}/></span><span><strong>Moderasi produk</strong><small>{pendingProducts.length} produk menunggu</small></span><ChevronRight size={17}/></button><button className="admin-quick-action" onClick={() => setSection('payments')}><span className="quick-action-icon"><CreditCard size={18}/></span><span><strong>Periksa pembayaran</strong><small>{payments.filter((item) => item.status === 'pending').length} permintaan menunggu</small></span><ChevronRight size={17}/></button><div className="admin-quick-footnote"><CircleAlert size={15}/> Pembayaran manual belum terhubung ke gateway. Verifikasi dana di rekening resmi sebelum menyetujui.</div></section>
          </div>
          <div className="admin-bottom-note"><div><CheckCircle2 size={17}/><div><strong>Prinsip publikasi LOKAVA</strong><p>Informasi hanya layak ditampilkan setelah pemeriksaan. Status disetujui bukan pengganti verifikasi fakta di lapangan.</p></div></div><span>DATA BERBASIS FIRESTORE</span></div>
        </>}

        {section === 'businesses' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Daftar usaha</h2><p>Setujui atau minta revisi pengajuan usaha.</p></div><span className="admin-count-pill">{pendingBusinesses.length} menunggu</span></div><div className="admin-table-tools"><label className="admin-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, kategori, atau UID pemilik" aria-label="Cari usaha"/><kbd>⌕</kbd></label><span>{visibleBusinesses.length} rekaman</span></div>
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>USAHA</th><th>PEMILIK</th><th>TANGGAL</th><th>STATUS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{visibleBusinesses.map((item) => <tr key={item.id}><td><div className="table-primary">{item.name || 'Tanpa nama'}</div><div className="table-secondary">{item.category || 'Kategori belum diisi'}</div>{item.whatsapp && <div className="table-secondary">WhatsApp: {item.whatsapp}</div>}{item.address && <div className="table-secondary">Alamat: {item.address}</div>}{typeof item.latitude === 'number' && typeof item.longitude === 'number' && <div className="table-secondary">Koordinat: {item.latitude}, {item.longitude}</div>}</td><td><code>{(item.ownerUid || 'UID tidak tersedia').slice(0, 12)}{(item.ownerUid || '').length > 12 ? '…' : ''}</code></td><td>{formatDate(item.createdAt)}</td><td><span className={`admin-status ${item.approvalStatus === 'approved' ? 'approved' : item.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`}>{statusLabel(item)}</span>{item.reviewNote && <div className="table-secondary review-note">Catatan: {item.reviewNote}</div>}</td><td className="align-right">{(item.approvalStatus || item.status) === 'pending' ? <div className="table-actions"><button className="approve-button" disabled={!!busyKey} onClick={() => void decide({ collectionName: 'businesses', id: item.id, title: item.name || 'Usaha' }, true)}><Check size={14}/> Setujui</button><button className="reject-button" disabled={!!busyKey} onClick={() => { setRejectTarget({ collectionName: 'businesses', id: item.id, title: item.name || 'Usaha' }); setRejectReason(''); }}><X size={14}/> Revisi</button></div> : <span className="table-secondary">Tidak ada tindakan</span>}</td></tr>)}</tbody></table></div>
          {visibleBusinesses.length === 0 && <div className="admin-empty table-empty"><Search size={24}/><strong>Tidak ada hasil</strong><p>Coba kata kunci lain atau perbarui data.</p></div>}
        </section>}

        {section === 'products' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Katalog produk</h2><p>Periksa informasi dan status publikasi produk.</p></div><span className="admin-count-pill">{pendingProducts.length} menunggu</span></div><div className="admin-table-tools"><label className="admin-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama produk atau UID pemilik" aria-label="Cari produk"/><kbd>⌕</kbd></label><span>{visibleProducts.length} rekaman</span></div>
          <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>PRODUK</th><th>HARGA</th><th>PEMILIK</th><th>STATUS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{visibleProducts.map((item) => <tr key={item.id}><td><div className="table-primary">{item.title || 'Tanpa nama'}</div><div className="table-secondary table-description">{item.description || 'Belum ada deskripsi'}</div></td><td>{typeof item.price === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price) : 'Harga tidak tersedia'}</td><td><code>{(item.ownerUid || 'UID tidak tersedia').slice(0, 12)}{(item.ownerUid || '').length > 12 ? '…' : ''}</code></td><td><span className={`admin-status ${item.approvalStatus === 'approved' ? 'approved' : item.approvalStatus === 'rejected' ? 'rejected' : 'pending'}`}>{statusLabel(item)}</span>{item.reviewNote && <div className="table-secondary review-note">Catatan: {item.reviewNote}</div>}</td><td className="align-right">{(item.approvalStatus || item.status) === 'pending' ? <div className="table-actions"><button className="approve-button" disabled={!!busyKey} onClick={() => void decide({ collectionName: 'products', id: item.id, title: item.title || 'Produk' }, true)}><Check size={14}/> Setujui</button><button className="reject-button" disabled={!!busyKey} onClick={() => { setRejectTarget({ collectionName: 'products', id: item.id, title: item.title || 'Produk' }); setRejectReason(''); }}><X size={14}/> Revisi</button></div> : <span className="table-secondary">Tidak ada tindakan</span>}</td></tr>)}</tbody></table></div>
          {visibleProducts.length === 0 && <div className="admin-empty table-empty"><Search size={24}/><strong>Tidak ada hasil</strong><p>Coba kata kunci lain atau perbarui data.</p></div>}
        </section>}
        {section === 'notifications' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Riwayat notifikasi</h2><p>Log menyimpan jenis kejadian dan status pengiriman, bukan isi pesan lengkap atau rahasia.</p></div><button className="admin-refresh" onClick={()=>void loadNotificationLogs()}><RefreshCw size={14}/> Muat ulang</button></div>{notificationLogs.length?<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>KEJADIAN</th><th>KANAL</th><th>STATUS</th><th>PERCOBAAN</th><th>WAKTU</th></tr></thead><tbody>{notificationLogs.map(item=><tr key={item.id}><td><div className="table-primary">{item.title}</div></td><td>{item.channel||'—'}</td><td><span className={`admin-status ${item.status==='sent'?'approved':item.status==='failed'?'rejected':'pending'}`}>{item.status}</span>{item.providerStatus&&<div className="table-secondary">HTTP {item.providerStatus}</div>}</td><td>{item.attempts}</td><td>{formatDate(item.createdAt||undefined)}</td></tr>)}</tbody></table></div>:<div className="admin-empty"><Bell size={24}/><strong>Belum ada log notifikasi</strong><p>Log akan tercatat setelah ada kejadian yang memicu notifikasi.</p></div>}</section>}
        {section === 'audit' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Audit log</h2><p>100 tindakan terbaru. Data log tidak dapat diubah melalui panel pengguna.</p></div><button className="admin-refresh" onClick={()=>void loadAuditLogs()}><RefreshCw size={14}/> Muat ulang</button></div>{auditLogs.length?<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>AKTOR</th><th>TINDAKAN</th><th>OBJEK</th><th>STATUS</th><th>WAKTU</th></tr></thead><tbody>{auditLogs.map(item=><tr key={item.id}><td><div className="table-primary">{item.actorEmail||item.actorUid||'Server'}</div><div className="table-secondary">{item.actorUid}</div></td><td>{item.action}</td><td><div className="table-primary">{item.targetLabel||item.targetCollection||'—'}</div><div className="table-secondary">{item.targetCollection} · {item.targetId}</div></td><td>{item.status||'—'}</td><td>{formatDate(item.createdAt||undefined)}</td></tr>)}</tbody></table></div>:<div className="admin-empty"><Activity size={24}/><strong>Belum ada audit log</strong><p>Operasi sensitif yang didukung akan tercatat di sini.</p></div>}</section>}

        {section === 'settings' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Pengaturan situs publik</h2><p>Atur metadata, domain kanonis, indeksasi Google, verifikasi Search Console, dan kontak publik. Domain harus sudah terhubung ke hosting dan menggunakan HTTPS.</p></div></div><form className="admin-content-form" onSubmit={saveGeneralSettings}><label className="payment-field"><span>Nama situs</span><input required maxLength={80} value={generalSettings.siteTitle} onChange={e=>setGeneralSettings(c=>({...c,siteTitle:e.target.value}))}/></label><label className="payment-field"><span>Tagline</span><input required maxLength={180} value={generalSettings.tagline} onChange={e=>setGeneralSettings(c=>({...c,tagline:e.target.value}))}/></label><label className="payment-field"><span>Judul SEO</span><input required maxLength={100} value={generalSettings.seoTitle} onChange={e=>setGeneralSettings(c=>({...c,seoTitle:e.target.value}))}/></label><label className="payment-field"><span>Deskripsi SEO</span><textarea required minLength={20} maxLength={300} rows={3} value={generalSettings.seoDescription} onChange={e=>setGeneralSettings(c=>({...c,seoDescription:e.target.value}))}/></label><label className="payment-field"><span>Domain utama HTTPS</span><input type="url" maxLength={300} value={generalSettings.siteUrl} onChange={e=>setGeneralSettings(c=>({...c,siteUrl:e.target.value}))} placeholder="https://lokava.id"/><small>Gunakan domain produksi saja, tanpa path, query, atau garis miring tambahan. Jika kosong, sistem memakai NEXT_PUBLIC_SITE_URL dari hosting.</small></label><label className="payment-field"><span>Token verifikasi Google Search Console</span><input maxLength={200} value={generalSettings.googleSiteVerification} onChange={e=>setGeneralSettings(c=>({...c,googleSiteVerification:e.target.value}))} placeholder="Isi token dari Google Search Console"/><small>Masukkan nilai token saja, bukan tag meta lengkap. Verifikasi DNS tetap bisa dilakukan langsung di penyedia domain.</small></label><label className="payment-field checkbox-field"><input type="checkbox" checked={generalSettings.searchIndexingEnabled} onChange={e=>setGeneralSettings(c=>({...c,searchIndexingEnabled:e.target.checked}))}/><span>Izinkan Google mengindeks halaman publik</span></label><label className="payment-field"><span>Email dukungan</span><input type="email" maxLength={150} value={generalSettings.supportEmail} onChange={e=>setGeneralSettings(c=>({...c,supportEmail:e.target.value}))} placeholder="Email resmi operator"/></label><label className="payment-field"><span>WhatsApp dukungan</span><input maxLength={40} value={generalSettings.supportWhatsApp} onChange={e=>setGeneralSettings(c=>({...c,supportWhatsApp:e.target.value}))} placeholder="Nomor resmi dengan kode negara"/></label><label className="payment-field"><span>Alamat operator</span><textarea rows={2} maxLength={250} value={generalSettings.supportAddress} onChange={e=>setGeneralSettings(c=>({...c,supportAddress:e.target.value}))}/></label><label className="payment-field"><span>Instagram (URL HTTPS)</span><input type="url" value={generalSettings.socialLinks.instagram} onChange={e=>setGeneralSettings(c=>({...c,socialLinks:{...c.socialLinks,instagram:e.target.value}}))}/></label><label className="payment-field"><span>Facebook (URL HTTPS)</span><input type="url" value={generalSettings.socialLinks.facebook} onChange={e=>setGeneralSettings(c=>({...c,socialLinks:{...c.socialLinks,facebook:e.target.value}}))}/></label><label className="payment-field"><span>YouTube (URL HTTPS)</span><input type="url" value={generalSettings.socialLinks.youtube} onChange={e=>setGeneralSettings(c=>({...c,socialLinks:{...c.socialLinks,youtube:e.target.value}}))}/></label><div className="table-actions"><button className="admin-primary-link" type="submit" disabled={!!busyKey}><Save size={15}/>{busyKey==='general-settings'?'Menyimpan…':'Simpan pengaturan situs'}</button></div></form></section>}

        {section === 'users' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Pengguna terdaftar</h2><p>Peran admin ditampilkan untuk transparansi, tetapi tidak dapat diberikan atau dicabut melalui panel ini. Menonaktifkan akun memblokir login berikutnya.</p></div><span className="admin-count-pill">{adminUsers.length} akun dimuat</span></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>AKUN</th><th>PERAN</th><th>STATUS</th><th>AKTIVITAS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{adminUsers.map(item=><tr key={item.uid}><td><div className="table-primary">{item.displayName||item.email||'Tanpa nama'}</div><div className="table-secondary">{item.email||item.uid}</div><div className="table-secondary">UID: {item.uid}</div></td><td><span className={`admin-status ${item.admin?'approved':'pending'}`}>{item.admin?'Admin':'Penjual/pengguna'}</span></td><td><span className={`admin-status ${item.disabled?'rejected':'approved'}`}>{item.disabled?'Nonaktif':'Aktif'}</span></td><td><div className="table-secondary">Dibuat: {formatDate(item.createdAt||undefined)}</div><div className="table-secondary">Masuk: {formatDate(item.lastSignInAt||undefined)}</div></td><td className="align-right">{item.admin?<span className="table-secondary">Role dilindungi</span>:<button className={item.disabled?'approve-button':'reject-button'} disabled={!!busyKey} onClick={()=>void setUserDisabled(item,!item.disabled)}>{item.disabled?<Check size={14}/>:<X size={14}/>} {item.disabled?'Aktifkan':'Nonaktifkan'}</button>}</td></tr>)}</tbody></table></div>{adminUsers.length===0&&<div className="admin-empty"><Users size={24}/><strong>Belum ada akun pada halaman ini</strong><p>Periksa konfigurasi Firebase Authentication.</p></div>}{userNextPageToken&&<div className="directory-pagination"><button className="admin-refresh" disabled={!!busyKey} onClick={()=>void loadAdminUsers(userNextPageToken,true)}>Muat pengguna berikutnya</button></div>}</section>}

        {section === 'content' && <><section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Konten situs</h2><p>Kelola destinasi, artikel, paket wisata, kategori, dan banner.</p></div><span className="admin-count-pill">{contentItems.length} rekaman</span></div><label className="payment-field content-collection-select"><span>Jenis konten</span><select value={contentCollection} onChange={e=>{setContentCollection(e.target.value as ContentCollection);resetContentForm()}}><option value="destinations">Destinasi wisata</option><option value="articles">Artikel / panduan</option><option value="packages">Paket wisata</option><option value="categories">Kategori</option><option value="banners">Banner</option></select></label><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>JUDUL</th><th>KATEGORI / LOKASI</th><th>STATUS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{contentItems.map(item=><tr key={item.id}><td><div className="table-primary">{String(item.title||item.name||'Tanpa judul')}</div><div className="table-secondary">/{String(item.slug||item.id)}</div></td><td>{String(item.category||'—')}<div className="table-secondary">{String(item.area||item.address||'')}</div></td><td><span className={`admin-status ${item.status==='published'?'approved':'pending'}`}>{String(item.status||'draft')}</span></td><td className="align-right"><div className="table-actions"><button className="admin-refresh" onClick={()=>startEditContent(item)}>Edit</button><button className="reject-button" disabled={!!busyKey} onClick={()=>void archiveContent(item)}><Trash2 size={14}/> Arsipkan</button></div></td></tr>)}</tbody></table></div>{contentItems.length===0&&<div className="admin-empty"><FileText size={24}/><strong>Belum ada konten</strong><p>Buat konten baru pada formulir di bawah.</p></div>}</section><section className="admin-card admin-table-card" id="admin-content-form"><div className="admin-card-heading"><div><h2>{editingContentId?'Edit konten':'Tambah konten'}</h2><p>Konten publikasi harus akurat. Jangan mengarang koordinat, harga, atau fasilitas.</p></div></div><form className="admin-content-form" onSubmit={saveContent}><label className="payment-field"><span>Nama / judul</span><input required minLength={2} maxLength={160} value={contentTitle} onChange={e=>setContentTitle(e.target.value)}/></label><label className="payment-field"><span>Slug URL (opsional)</span><input maxLength={100} value={contentSlug} onChange={e=>setContentSlug(e.target.value)} placeholder="wisata-pantai-contoh"/><small>Jika kosong, slug dibuat otomatis dari judul.</small></label><label className="payment-field"><span>Judul SEO (opsional)</span><input maxLength={100} value={contentSeoTitle} onChange={e=>setContentSeoTitle(e.target.value)} placeholder="Judul yang tampil di hasil pencarian"/></label><label className="payment-field"><span>Deskripsi SEO (opsional)</span><textarea rows={2} maxLength={300} value={contentSeoDescription} onChange={e=>setContentSeoDescription(e.target.value)} placeholder="Ringkasan halaman yang akurat untuk hasil pencarian"/><small>Gunakan deskripsi unik, jelas, dan sesuai fakta halaman.</small></label><label className="payment-field"><span>Kategori</span><input maxLength={100} value={contentCategory} onChange={e=>setContentCategory(e.target.value)} placeholder="Wisata, Kuliner, Panduan…"/></label><label className="payment-field"><span>Deskripsi</span><textarea required rows={4} maxLength={5000} value={contentDescription} onChange={e=>setContentDescription(e.target.value)}/></label>{contentCollection==='articles'&&<><label className="payment-field"><span>Penulis / editor (opsional)</span><input maxLength={120} value={contentAuthor} onChange={e=>setContentAuthor(e.target.value)}/></label><label className="payment-field"><span>Ringkasan artikel</span><textarea rows={2} maxLength={400} value={contentExcerpt} onChange={e=>setContentExcerpt(e.target.value)}/></label><div className="table-actions"><button className="admin-refresh" type="button" onClick={()=>{const area=contentArea.trim();const intro=contentDescription.trim();const title=contentTitle.trim();const category=contentCategory.trim();const draft=[title?`${title}`:'Judul artikel',intro,area?`Wilayah terkait: ${area}.`:'',category?`Kategori: ${category}.`: '','Informasi seperti jam operasional, harga tiket, fasilitas, akses, dan kondisi kunjungan harus ditambahkan hanya setelah diverifikasi dari sumber yang dapat dipercaya.','Sebelum diterbitkan, periksa fakta, tambahkan sumber bila diperlukan, dan pastikan setiap informasi sesuai kondisi terbaru.'].filter(Boolean).join('\n\n');setContentBody(draft);if(!contentExcerpt.trim())setContentExcerpt(intro.slice(0,400));if(!contentSeoTitle.trim())setContentSeoTitle(`${title}${area?` di ${area}`:''} | LOKAVA`.slice(0,100));if(!contentSeoDescription.trim())setContentSeoDescription(`${intro}${area?` Jelajahi informasi ${category||'lokal'} di ${area}.`:''}`.slice(0,300));}}>Buat draf awal dari data yang diisi</button><small>Draf hanya memakai data formulir dan pengingat verifikasi; wajib diperiksa editor sebelum dipublikasikan.</small></div><label className="payment-field"><span>Isi artikel</span><textarea required rows={8} maxLength={30000} value={contentBody} onChange={e=>setContentBody(e.target.value)} placeholder="Pisahkan paragraf dengan baris kosong."/></label></>}<label className="payment-field"><span>Area / wilayah</span><input maxLength={200} value={contentArea} onChange={e=>setContentArea(e.target.value)} placeholder="Ujung Genteng, Ciracap…"/></label><label className="payment-field"><span>Alamat (opsional)</span><textarea rows={2} maxLength={300} value={contentAddress} onChange={e=>setContentAddress(e.target.value)}/></label><div className="dashboard-coordinate-grid"><label className="payment-field"><span>Latitude (opsional)</span><input type="number" step="any" value={contentLatitude} onChange={e=>setContentLatitude(e.target.value)}/></label><label className="payment-field"><span>Longitude (opsional)</span><input type="number" step="any" value={contentLongitude} onChange={e=>setContentLongitude(e.target.value)}/></label></div><label className="payment-field"><span>Link Google Maps (opsional)</span><input type="url" value={contentMapsUrl} onChange={e=>setContentMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…"/></label><label className="payment-field"><span>Harga (opsional)</span><input type="number" min="0" step="1" value={contentPrice} onChange={e=>setContentPrice(e.target.value)} placeholder="Rp"/></label><label className="payment-field"><span>Foto / media (maksimal 10)</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingContentPhoto||contentPhotos.length>=10} onChange={e=>{const f=e.target.files?.[0];void uploadContentPhoto(f);e.currentTarget.value=''}}/><small>JPG, PNG, WebP · maksimal 5 MB. Foto diunggah ke Cloudinary sebelum disimpan ke konten.</small></label>{contentPhotos.length>0&&<div className="admin-content-photo-grid">{contentPhotos.map((photo,index)=><div key={String(photo.publicId||index)}><img src={String(photo.url||'')} alt="Pratinjau konten"/><button type="button" onClick={()=>setContentPhotos(current=>current.filter((_,i)=>i!==index))}>Hapus dari formulir</button></div>)}</div>}<label className="payment-field"><span>Status publikasi</span><select value={contentStatus} onChange={e=>setContentStatus(e.target.value as 'draft'|'published')}><option value="draft">Simpan sebagai draf</option><option value="published">Publikasikan sekarang</option></select></label><div className="table-actions"><button className="admin-primary-link" type="submit" disabled={!!busyKey||uploadingContentPhoto}><Save size={15}/>{busyKey==='content-save'?'Menyimpan…':editingContentId?'Simpan perubahan':'Simpan konten'}</button>{editingContentId&&<button className="admin-refresh" type="button" onClick={resetContentForm}>Batal edit</button>}</div></form></section></>}

        {section === 'deletions' && <section className="admin-card admin-table-card"><div className="admin-card-heading"><div><h2>Permintaan penghapusan akun</h2><p>Proses ini mengarsipkan profil/produk dan menghapus akun Authentication setelah keputusan admin. Transaksi dan audit dipertahankan sesuai retensi.</p></div><span className="admin-count-pill">{deletionRequests.length} terbuka</span></div>{deletionRequests.length===0?<div className="admin-empty"><UserX size={24}/><strong>Tidak ada permintaan terbuka</strong><p>Permintaan baru dari penjual akan tampil di sini.</p></div>:<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>AKUN</th><th>ALASAN</th><th>STATUS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{deletionRequests.map(item=><tr key={item.id}><td><div className="table-primary">{item.ownerEmail||'Email tidak tersedia'}</div><div className="table-secondary">{item.ownerUid}</div><div className="table-secondary">{formatDate(item.createdAt||undefined)}</div></td><td>{item.reason||'Tidak ada alasan tambahan'}</td><td><span className="admin-status pending">{item.status}</span>{item.reviewNote&&<div className="table-secondary review-note">{item.reviewNote}</div>}</td><td className="align-right"><div className="table-actions"><button className="admin-refresh" disabled={!!busyKey} onClick={()=>void decideDeletion(item,'review')}>Tandai ditinjau</button><button className="approve-button" disabled={!!busyKey||item.status==='pending'} onClick={()=>void decideDeletion(item,'complete')}><Check size={14}/> Proses hapus</button><button className="reject-button" disabled={!!busyKey} onClick={()=>void decideDeletion(item,'reject')}><X size={14}/> Tolak</button></div></td></tr>)}</tbody></table></div>}</section>}

        {section === 'payments' && <>
          <section className="admin-card payment-settings-card">
            <div className="admin-card-heading"><div><h2>Pengaturan paket & pembayaran</h2><p>Harga, QR pembayaran, dan rekening di sini menjadi instruksi resmi yang dilihat penjual.</p></div><span className="admin-count-pill">KONFIGURASI</span></div>
            <form className="payment-settings-form" onSubmit={savePaymentSettings}>
              <div className="payment-settings-section"><div className="payment-settings-section-title"><CreditCard size={17}/><div><strong>Harga semua paket</strong><small>Nominal dalam rupiah. Harga disalin ke transaksi saat penjual membuat permintaan baru.</small></div></div>
                <div className="payment-price-grid">{(['free', 'premium', 'bisnis'] as const).map((key) => <label key={key} className="payment-field"><span>{paymentSettings.plans[key].name} · kuota {paymentSettings.plans[key].productLimit} produk</span><div className="payment-price-input"><span>Rp</span><input type="number" min="0" max="1000000000" step="1" required value={paymentSettings.plans[key].price} onChange={(e) => setPaymentSettings((current) => ({ ...current, plans: { ...current.plans, [key]: { ...current.plans[key], price: Number(e.target.value) } } }))}/></div></label>)}</div><div className="payment-quota-grid">{(['free','premium','bisnis'] as const).map(key=><div className="payment-quota-card" key={key}><h3>{paymentSettings.plans[key].name} · Batas paket</h3><label className="payment-field"><span>Jumlah produk</span><input type="number" min="1" max="10000" required value={paymentSettings.plans[key].productLimit} onChange={e=>setPaymentSettings(current=>({...current,plans:{...current.plans,[key]:{...current.plans[key],productLimit:Number(e.target.value)}}}))}/></label><label className="payment-field"><span>Durasi (hari)</span><input type="number" min="1" max="365" required value={paymentSettings.plans[key].durationDays} onChange={e=>setPaymentSettings(current=>({...current,plans:{...current.plans,[key]:{...current.plans[key],durationDays:Number(e.target.value)}}}))}/></label><label className="payment-field"><span>Foto per produk</span><input type="number" min="1" max="100" required value={paymentSettings.plans[key].productPhotosPerProduct} onChange={e=>setPaymentSettings(current=>({...current,plans:{...current.plans,[key]:{...current.plans[key],productPhotosPerProduct:Number(e.target.value)}}}))}/></label><label className="payment-field"><span>Total foto produk</span><input type="number" min="1" max="10000" required value={paymentSettings.plans[key].productPhotosTotal} onChange={e=>setPaymentSettings(current=>({...current,plans:{...current.plans,[key]:{...current.plans[key],productPhotosTotal:Number(e.target.value)}}}))}/></label><label className="payment-field"><span>Total foto usaha</span><input type="number" min="1" max="1000" required value={paymentSettings.plans[key].businessPhotosTotal} onChange={e=>setPaymentSettings(current=>({...current,plans:{...current.plans,[key]:{...current.plans[key],businessPhotosTotal:Number(e.target.value)}}}))}/></label></div>)}</div>
              </div>
              <div className="payment-settings-section"><div className="payment-settings-section-title"><QrCode size={17}/><div><strong>QR pembayaran</strong><small>Unggah gambar QR yang resmi. Format PNG, JPG, atau WebP, maksimal 240 KB.</small></div></div>
                <label className="payment-toggle"><input type="checkbox" checked={paymentSettings.methods.qr.enabled} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, qr: { ...current.methods.qr, enabled: e.target.checked } } }))}/><span><strong>Aktifkan pembayaran QR</strong><small>Jika aktif, QR dan instruksi akan ditampilkan pada dashboard penjual.</small></span></label>
                <div className="payment-method-fields"><label className="payment-field"><span>Nama metode</span><input required maxLength={60} value={paymentSettings.methods.qr.label} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, qr: { ...current.methods.qr, label: e.target.value } } }))}/></label><label className="payment-field"><span>Instruksi pembayaran</span><textarea rows={3} maxLength={500} value={paymentSettings.methods.qr.instructions} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, qr: { ...current.methods.qr, instructions: e.target.value } } }))}/></label></div>
                <div className="qr-upload-row"><div className="qr-preview">{paymentSettings.methods.qr.imageUrl ? <img src={paymentSettings.methods.qr.imageUrl} alt="Pratinjau QR pembayaran"/> : <div><QrCode size={30}/><span>Belum ada QR</span></div>}</div><div className="qr-upload-actions"><label className="button button-light qr-file-button"><Upload size={15}/> Unggah gambar QR<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingQr} onChange={(e) => { void handleQrUpload(e.target.files?.[0]); e.currentTarget.value = ''; }}/></label>{paymentSettings.methods.qr.imageUrl && <button type="button" className="button button-light" onClick={() => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, qr: { ...current.methods.qr, imageUrl: '', publicId: '', enabled: false } } }))}><Trash2 size={14}/> Hapus QR</button>}<small>Gambar QR disimpan di Cloudinary; Firestore hanya menyimpan URL dan public ID. Gunakan QR milik rekening resmi LOKAVA.</small></div></div>
              </div>
              <div className="payment-settings-section"><div className="payment-settings-section-title"><Banknote size={17}/><div><strong>Transfer rekening</strong><small>Semua detail rekening dapat diedit dan ditampilkan kepada penjual.</small></div></div>
                <label className="payment-toggle"><input type="checkbox" checked={paymentSettings.methods.bank.enabled} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, bank: { ...current.methods.bank, enabled: e.target.checked } } }))}/><span><strong>Aktifkan transfer rekening</strong><small>Metode ini hanya dapat diaktifkan jika bank, nama pemilik, dan nomor rekening diisi.</small></span></label>
                <div className="payment-method-fields bank-fields"><label className="payment-field"><span>Nama bank</span><input maxLength={100} required={paymentSettings.methods.bank.enabled} value={paymentSettings.methods.bank.bankName} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, bank: { ...current.methods.bank, bankName: e.target.value } } }))} placeholder="Contoh: BCA"/></label><label className="payment-field"><span>Nama pemilik rekening</span><input maxLength={120} required={paymentSettings.methods.bank.enabled} value={paymentSettings.methods.bank.accountName} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, bank: { ...current.methods.bank, accountName: e.target.value } } }))} placeholder="Nama resmi penerima"/></label><label className="payment-field"><span>Nomor rekening</span><input maxLength={80} required={paymentSettings.methods.bank.enabled} value={paymentSettings.methods.bank.accountNumber} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, bank: { ...current.methods.bank, accountNumber: e.target.value } } }))} placeholder="Nomor rekening tujuan"/></label><label className="payment-field"><span>Instruksi transfer</span><textarea rows={3} maxLength={500} value={paymentSettings.methods.bank.instructions} onChange={(e) => setPaymentSettings((current) => ({ ...current, methods: { ...current.methods, bank: { ...current.methods.bank, instructions: e.target.value } } }))}/></label></div>
              </div>
              <div className="payment-settings-footer"><p>Perubahan hanya berlaku untuk permintaan baru. Setiap transaksi menyimpan salinan nominal dan instruksi metode saat dibuat.</p><button className="admin-primary-link payment-save-button" type="submit" disabled={savingPaymentSettings}><Save size={15}/>{savingPaymentSettings ? 'Menyimpan…' : 'Simpan pengaturan'}</button></div>
            </form>
          </section>
          <section className="admin-card admin-table-card payment-request-card"><div className="admin-card-heading"><div><h2>Transaksi paket & promosi</h2><p>Buka bukti pembayaran terlebih dahulu. Untuk promosi, pembayaran yang disetujui masih harus melewati persetujuan konten.</p></div><span className="admin-count-pill">{payments.filter((item) => item.status === 'pending').length} menunggu</span></div><div className="admin-security-note payment-admin-warning"><ShieldCheck size={18}/><div><strong>Pemeriksaan dana dilakukan oleh admin</strong><span>Pastikan nominal dan kode pembayaran cocok sebelum menyetujui. Sistem ini belum terhubung ke payment gateway.</span></div></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>KODE / PEMILIK</th><th>PAKET</th><th>METODE</th><th>NOMINAL</th><th>STATUS</th><th className="align-right">TINDAKAN</th></tr></thead><tbody>{payments.map((item) => <tr key={item.id}><td><div className="table-primary">{item.paymentCode || item.id}</div><div className="table-secondary">{item.ownerEmail || item.ownerUid || 'Pemilik tidak tersedia'}</div></td><td><div className="table-primary">{String(item.type === 'promotion' ? item.promotionName || 'PROMOSI' : item.planName || item.planId || 'Paket').toUpperCase()}</div><div className="table-secondary">{item.type === 'promotion' ? String(item.targetName || 'Konten promosi') : typeof item.durationDays === 'number' ? `${item.durationDays} hari` : '30 hari'}</div></td><td>{item.paymentMethod === 'qr' ? 'QR' : item.paymentMethod === 'bank' ? 'Transfer bank' : '—'}</td><td>{typeof item.amount === 'number' ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.amount) : 'Nominal tidak valid'}</td><td><span className={`admin-status ${item.status === 'paid' ? 'approved' : item.status === 'rejected' ? 'rejected' : 'pending'}`}>{item.status === 'paid' ? (item.type === 'promotion' ? 'Pembayaran disetujui' : 'Dibayar') : item.status === 'rejected' ? 'Ditolak' : 'Menunggu'}</span>{item.reviewNote && <div className="table-secondary review-note">Catatan: {item.reviewNote}</div>}</td><td className="align-right">{item.proofPublicId && <div className="table-actions proof-admin-actions"><button className="admin-refresh" disabled={loadingProofId === item.id} onClick={() => void loadPaymentProof(item)}>{loadingProofId === item.id ? 'Memuat bukti…' : 'Lihat bukti'}</button>{proofUrls[item.id] && <a className="admin-primary-link" href={proofUrls[item.id]} target="_blank" rel="noopener noreferrer">Buka gambar</a>}</div>}{item.status === 'pending' ? <div className="table-actions"><button className="approve-button" disabled={!!busyKey || !item.proofPublicId} title={!item.proofPublicId ? 'Penjual harus mengunggah bukti pembayaran terlebih dahulu.' : 'Verifikasi dana sebelum mengaktifkan paket.'} onClick={() => void decidePayment(item, 'approve')}><Check size={14}/> {item.type === 'promotion' ? 'Verifikasi pembayaran' : 'Verifikasi & aktifkan'}</button><button className="reject-button" disabled={!!busyKey} onClick={() => void decidePayment(item, 'reject')}><X size={14}/> Tolak</button></div> : <span className="table-secondary">Sudah diproses</span>}</td></tr>)}</tbody></table></div>{payments.length === 0 && <div className="admin-empty table-empty"><CreditCard size={24}/><strong>Belum ada transaksi</strong><p>Permintaan paket dan promosi seller akan muncul di sini.</p></div>}</section>
          <section className="admin-card promotion-admin-settings"><div className="admin-card-heading"><div><h2>Pengaturan promosi berbayar</h2><p>Harga berikut menjadi harga dasar 7 hari. Server menghitung harga sesuai durasi yang dipilih seller.</p></div><span className="admin-count-pill">4 tipe promosi</span></div><form onSubmit={savePromotionSettings} className="promotion-admin-form"><div className="promotion-admin-price-grid">{([{key:'product_featured',label:'Produk unggulan'},{key:'category',label:'Promosi kategori'},{key:'business_featured',label:'Usaha unggulan'},{key:'homepage_banner',label:'Banner beranda'}] as const).map((item) => <label className="payment-field" key={item.key}><span>{item.label} · harga 7 hari</span><div className="payment-price-input"><span>Rp</span><input type="number" min="0" max="1000000000" step="1" required value={promotionSettings.prices[item.key]} onChange={(e) => setPromotionSettings((current) => ({...current,prices:{...current.prices,[item.key]:Number(e.target.value)}}))}/></div></label>)}</div><div className="promotion-duration-options"><strong>Durasi yang tersedia</strong>{[7,14,21,30].map((days) => <label key={days}><input type="checkbox" checked={promotionSettings.durations.includes(days)} disabled={promotionSettings.durations.length===1&&promotionSettings.durations.includes(days)} onChange={(e) => setPromotionSettings((current) => ({...current,durations:e.target.checked?[...current.durations,days].sort((a,b)=>a-b):current.durations.filter((value)=>value!==days)}))}/>{days} hari</label>)}</div><button className="admin-primary-link payment-save-button" type="submit" disabled={savingPromotionSettings}><Save size={15}/>{savingPromotionSettings?'Menyimpan…':'Simpan harga promosi'}</button></form></section>
          <section className="admin-card promotion-moderation-card"><div className="admin-card-heading"><div><h2>Persetujuan konten promosi</h2><p>Konten hanya aktif setelah bukti pembayaran diverifikasi dan admin menyetujui materi promosi.</p></div><span className="admin-count-pill">{promotions.filter((item)=>item.status==='content_approval_pending').length} menunggu</span></div>{promotions.filter((item)=>item.status==='content_approval_pending').length===0?<div className="admin-empty"><Megaphone size={24}/><strong>Tidak ada promosi menunggu persetujuan</strong><p>Promosi yang pembayarannya sudah diverifikasi akan tampil di antrean ini.</p></div>:<div className="promotion-moderation-list">{promotions.filter((item)=>item.status==='content_approval_pending').map((item)=><article className="promotion-moderation-item" key={item.id}><div className="promotion-moderation-icon">{typeof item.targetPreviewUrl==='string'&&item.targetPreviewUrl?<img src={item.targetPreviewUrl} alt=""/>:<Megaphone size={20}/>}</div><div className="promotion-moderation-copy"><span className="promotion-status status-content-approval-pending">Pembayaran disetujui · konten menunggu</span><h3>{String(item.targetTitle||item.targetName||item.kindLabel||'Konten promosi')}</h3><p>{String(item.targetDescription||'')}<br/>{String(item.kindLabel||item.kind||'Promosi')} · {String(item.ownerEmail||item.ownerUid||'Seller')} · {Number(item.durationDays||7)} hari</p><strong>{new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(item.price||0))}</strong></div><div className="promotion-moderation-actions"><button className="approve-button" disabled={!!busyKey} onClick={()=>void decidePromotion(item,'approve')}><Check size={14}/> Setujui & tayangkan</button><button className="reject-button" disabled={!!busyKey} onClick={()=>void decidePromotion(item,'reject')}><X size={14}/> Tolak konten</button></div></article>)}</div>}</section>
        </>}
        <footer className="admin-footer"><span>LOKAVA CONTROL CENTER</span><span>Panel pengembangan · {new Date().getFullYear()}</span></footer>
      </div>
    </section>

    {rejectTarget && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRejectTarget(null); }}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="reject-title"><div className="admin-modal-icon"><FileText size={21}/></div><button className="admin-modal-close" aria-label="Tutup" onClick={() => setRejectTarget(null)}><X size={18}/></button><p className="admin-kicker">TINJAUAN KONTEN</p><h2 id="reject-title">Minta revisi</h2><p>Catatan ini akan terlihat pada data pengajuan: <strong>{rejectTarget.title}</strong>.</p><label htmlFor="reject-reason">Alasan revisi</label><textarea id="reject-reason" rows={4} maxLength={500} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Contoh: Mohon lengkapi deskripsi dan pastikan informasi usaha akurat."/><div className="admin-modal-actions"><button className="admin-cancel" onClick={() => setRejectTarget(null)}>Batal</button><button className="reject-button modal-confirm" disabled={!rejectReason.trim() || !!busyKey} onClick={() => void decide(rejectTarget, false, rejectReason)}>{busyKey ? 'Menyimpan…' : 'Kirim catatan revisi'} <ArrowUpRight size={15}/></button></div></section></div>}
  </main>;
}
