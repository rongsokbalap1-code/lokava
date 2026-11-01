'use client';
import { useEffect } from 'react';import { AlertTriangle, RefreshCw } from 'lucide-react';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error('[lokava-page-error]',error)},[error]);return <main className="error-page"><AlertTriangle size={34}/><h1>Halaman belum dapat dimuat.</h1><p>Terjadi kendala saat memproses halaman ini. Coba muat ulang; jika masalah berulang, hubungi operator LOKAVA.</p><button className="button button-dark" onClick={()=>reset()}><RefreshCw size={16}/> Coba lagi</button></main>}
