import { NextResponse } from 'next/server';import { getPublishedRecords } from '@/lib/server/public-content';
export const dynamic='force-dynamic';
export async function GET(){const records=await getPublishedRecords('categories',100);const categories=[...new Set(records.map(r=>String(r.name||r.title||'').trim()).filter(Boolean))].slice(0,60);return NextResponse.json({categories},{headers:{'Cache-Control':'public, max-age=300, stale-while-revalidate=600'}})}
