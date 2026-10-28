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
