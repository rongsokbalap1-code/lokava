'use client';
import dynamic from 'next/dynamic';
import type { MapPoint } from '@/app/peta/PublicMapCanvas';
const Canvas=dynamic(()=>import('@/app/peta/PublicMapCanvas'),{ssr:false,loading:()=> <div className="location-map-loading">Memuat peta OpenStreetMap…</div>});
export default function PublicMap({points}:{points:MapPoint[]}){return <Canvas points={points}/>}
