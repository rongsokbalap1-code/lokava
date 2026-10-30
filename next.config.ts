import type { NextConfig } from 'next';
const nextConfig: NextConfig = { output: 'standalone', outputFileTracingRoot: process.cwd(), poweredByHeader: false, images: { unoptimized: true } };
export default nextConfig;
