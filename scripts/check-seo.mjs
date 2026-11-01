#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../lib/seo.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { exports: {}, process: { env: { NEXT_PUBLIC_SITE_URL: 'https://lokava.example' } }, URL, require: (id) => { if (id === '@/lib/server/site-settings') return { readPublicSiteSettings: async () => ({ siteUrl: '', siteTitle: 'LOKAVA', searchIndexingEnabled: true }) }; throw new Error(`Unexpected import: ${id}`); } };
vm.runInNewContext(output, sandbox);
const seo = sandbox.exports;
const errors = [];
const run = async () => {
  if (await seo.siteOrigin() !== 'https://lokava.example') errors.push('siteOrigin does not normalize production origin');
  if (await seo.absoluteUrl('/wisata/contoh') !== 'https://lokava.example/wisata/contoh') errors.push('absoluteUrl failed');
  if (seo.slugifyRegion('Ujung Genteng, Sukabumi Selatan') !== 'ujung-genteng-sukabumi-selatan') errors.push('region slug failed');
  if (seo.isIndexableRecord({ id: '1', title: 'Pantai Contoh', description: 'Deskripsi lengkap yang cukup panjang untuk menjelaskan informasi nyata mengenai destinasi wisata ini kepada pengunjung.', status: 'published' }, 'destination') !== true) errors.push('complete destination should be indexable');
  if (seo.isIndexableRecord({ id: '2', title: 'Tempat', description: 'Singkat' }, 'destination') !== false) errors.push('thin content should not be indexable');
  if (seo.isIndexableRecord({ id: '3', title: 'Usaha', description: 'Deskripsi lengkap yang cukup panjang untuk menjelaskan informasi nyata mengenai usaha ini kepada pengunjung.', verified: false }, 'business') !== false) errors.push('unverified business should not be indexable');
  if (!seo.jsonLdScript({ name: '</script><script>alert(1)</script>' }).includes('\\u003c/script\\u003e')) errors.push('JSON-LD script content not escaped');
};
await run();
if (errors.length) { console.error(`SEO checks failed (${errors.length})`); errors.forEach((error) => console.error(`- ${error}`)); process.exit(1); }
console.log('OK: dynamic canonical origin, absolute URLs, region slug, indexability gates, and JSON-LD escaping checks passed.');
