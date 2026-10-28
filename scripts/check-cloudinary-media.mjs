#!/usr/bin/env node
/**
 * Audit only app-uploaded image flows. Decorative/illustrative images that ship
 * with the UI are intentionally outside Cloudinary and are not scanned here.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checks = [
  {
    file: 'app/api/seller/images/route.ts',
    required: [
      ['Cloudinary uploader', 'uploadCloudinaryImage'],
      ['Firebase token verification', 'verifyIdToken'],
      ['image signature validation', 'validImageSignature'],
      ['record ownership validation', 'existing.ownerUid !== decoded.uid'],
      ['published-record guard', "current.status === 'published'"],
      ['server-side quota check', 'PHOTO_QUOTA:'],
    ],
  },
  {
    file: 'app/api/admin/payment-settings/qr/route.ts',
    required: [
      ['Cloudinary uploader', 'uploadCloudinaryImage'],
      ['admin claim validation', 'decoded.admin !== true'],
      ['image signature validation', 'validImageSignature'],
    ],
  },
  {
    file: 'app/api/seller/payments/proof/route.ts',
    required: [
      ['Cloudinary uploader', 'uploadCloudinaryImage'],
      ['authenticated/private Cloudinary asset', "type: 'authenticated'"],
      ['transaction ownership validation', 'current.ownerUid !== decoded.uid'],
      ['pending transaction guard', "current.status !== 'pending'"],
      ['image signature validation', 'validImageSignature'],
    ],
  },
  {
    file: 'app/api/admin/payments/proof/route.ts',
    required: [
      ['admin claim validation', 'decoded.admin !== true'],
      ['Cloudinary existence verification', 'assertCloudinaryImageExists'],
      ['signed authenticated delivery URL', 'authenticatedCloudinaryImageUrl'],
    ],
  },
  {
    file: 'app/api/admin/content/media/route.ts',
    required: [
      ['Cloudinary uploader', 'uploadCloudinaryImage'],
      ['admin claim validation', 'decoded.admin!==true'],
      ['image signature validation', 'validImageSignature'],
      ['admin content public ID namespace', 'lokava/admin-content/'],
    ],
  },
  {
    file: 'app/api/admin/payments/route.ts',
    required: [
      ['admin claim validation', 'decoded.admin !== true'],
      ['Cloudinary proof verification before approval', 'assertCloudinaryImageExists'],
      ['proof ID recheck', "payment.proofPublicId !== verifiedProofPublicId"],
    ],
  },
];

async function main() {
  const issues = [];
  for (const check of checks) {
    let content;
    try { content = await readFile(path.join(root, check.file), 'utf8'); }
    catch { issues.push(`${check.file}: file endpoint wajib tidak ditemukan`); continue; }
    for (const [label, marker] of check.required) {
      if (!content.includes(marker)) issues.push(`${check.file}: pemeriksaan '${label}' tidak ditemukan`);
    }
  }

  const scanFiles = ['app', 'lib'];
  for (const directory of scanFiles) {
    const { readdir } = await import('node:fs/promises');
    async function walk(dir) {
      let entries;
      try { entries = await readdir(dir, { withFileTypes: true }); }
      catch (error) { if (error?.code === 'ENOENT') return; throw error; }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.isFile() && /\.[cm]?[jt]sx?$/.test(entry.name)) {
          const source = await readFile(full, 'utf8');
          if (/from\s+["']firebase\/storage["']|\bgetStorage\s*\(/.test(source)) {
            issues.push(`${path.relative(root, full)}: alur Firebase Storage masih ditemukan; foto unggahan harus melalui API Cloudinary`);
          }
        }
      }
    }
    await walk(path.join(root, directory));
  }

  const envExample = await readFile(path.join(root, '.env.example'), 'utf8');
  if (/NEXT_PUBLIC_CLOUDINARY_(?:API_KEY|API_SECRET|CLOUD_NAME)/.test(envExample)) {
    issues.push('.env.example: kredensial Cloudinary tidak boleh menggunakan prefix NEXT_PUBLIC_');
  }

  if (issues.length) {
    console.error(`GAGAL: ${issues.length} pemeriksaan alur foto unggahan perlu ditinjau:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log('OK: jalur unggah foto seller, QR admin, media konten admin, dan bukti pembayaran memakai Cloudinary dengan pemeriksaan keamanan yang diwajibkan.');
  console.log('Catatan: gambar animasi, ilustrasi, ikon, banner desain, dan foto demo bawaan UI sengaja tidak dipindai atau dipindahkan ke Cloudinary.');
}

main().catch((error) => {
  console.error(`Audit media gagal: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
