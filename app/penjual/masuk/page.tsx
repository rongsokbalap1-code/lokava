'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Waves } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebase } from '@/lib/firebase';

type Mode = 'login' | 'register';
export default function SellerAccessPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try {
      const { auth } = getFirebase();
      if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        router.replace('/penjual/dashboard');
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.replace('/penjual/dashboard');
      }
    } catch (e) {
      const code = typeof e === 'object' && e && 'code' in e ? String(e.code) : '';
      const messages: Record<string, string> = {
        'auth/invalid-email': 'Format email belum benar.',
        'auth/invalid-credential': 'Email atau kata sandi tidak sesuai.',
        'auth/email-already-in-use': 'Email ini sudah terdaftar. Coba masuk.',
        'auth/weak-password': 'Gunakan kata sandi minimal 6 karakter.',
        'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
        'auth/operation-not-allowed': 'Metode Email/Kata Sandi belum diaktifkan di Firebase.',
      };
      setError(messages[code] ?? (e instanceof Error ? e.message : 'Autentikasi gagal. Periksa konfigurasi Firebase dan coba lagi.'));
    } finally { setBusy(false); }
  }
  return <main className="seller-auth-page"><header className="detail-header"><Link className="detail-back" href="/"><ArrowLeft size={17}/> Kembali ke LOKAVA</Link><Link className="detail-brand" href="/"><Waves size={19}/> LOKAVA</Link></header><section className="seller-auth-card"><div className="eyebrow"><span/> RUANG PELAKU USAHA</div><h1>{mode === 'login' ? 'Selamat datang kembali.' : 'Mulai bersama LOKAVA.'}</h1><p>{mode === 'login' ? 'Masuk menggunakan akun penjual yang telah terdaftar.' : 'Buat akun untuk memulai proses pendaftaran penjual.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('login'); setError(''); setMessage(''); }}>Masuk</button><button className={mode === 'register' ? 'auth-tab active' : 'auth-tab'} onClick={() => { setMode('register'); setError(''); setMessage(''); }}>Daftar akun</button></div><form onSubmit={submit}><label htmlFor="seller-email">Email</label><input id="seller-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com"/><label htmlFor="seller-password">Kata sandi</label><input id="seller-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter"/><button className="button button-dark auth-submit" disabled={busy} type="submit">{busy ? 'Memproses…' : mode === 'login' ? 'Masuk' : 'Buat akun'} <ArrowRight size={16}/></button></form>{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}<p className="auth-disclaimer">Akun administrator yang sudah dibuat melalui proses tepercaya dapat membuka <Link href="/admin" className="auth-admin-link">panel administrator</Link>. Firebase Auth harus dikonfigurasi operator. Admin tidak dapat mendaftar melalui halaman ini. Dashboard saat ini masih prototipe awal; pemeriksaan status penjual dan otorisasi server belum tersedia, sehingga jangan gunakan untuk transaksi produksi.</p></section></main>;
}
