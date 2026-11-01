import { NextResponse } from 'next/server';import { readPublicSiteSettings } from '@/lib/server/site-settings';
export const dynamic='force-dynamic';export async function GET(){return NextResponse.json({settings:await readPublicSiteSettings()},{headers:{'Cache-Control':'public, max-age=300, stale-while-revalidate=600'}})}
