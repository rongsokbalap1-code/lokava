# LOKAVA image storage policy — Cloudinary

Cloudinary is used for images uploaded through LOKAVA workflows by sellers or administrators. It is **not** intended to host every image or visual element that ships with the website UI. Never expose `CLOUDINARY_API_SECRET` to the browser.

## Scope

| Image type | Storage | Access / handling |
|---|---|---|
| Seller-uploaded business/profile photos | Cloudinary `upload` | Public delivery URL; upload/remove requires owner, eligible record status, valid image signature, and package quota |
| Seller-uploaded product photos | Cloudinary `upload` | Public delivery URL; upload/remove requires owner, eligible record status, valid image signature, and package quota |
| Admin-uploaded payment QR | Cloudinary `upload` | Public image URL shown to sellers; upload requires Firebase `admin: true` claim |
| Seller-uploaded subscription payment proof | Cloudinary `authenticated` | Private asset; admin-only endpoint issues a signed delivery URL after verifying the transaction and Cloudinary asset |
| UI animation, icon, decoration, layout illustration, design banner, and illustrative/demo imagery | Existing app assets / configured demo image sources | Intentionally outside Cloudinary; no migration needed |

Firestore stores Cloudinary IDs and limited URL/format metadata for new uploads, not image bytes or base64 payloads. Firebase Storage is not used by current upload endpoints; `storage.rules` remains deny-all as protection for legacy storage.

## Upload limits and quotas

- Payment QR: JPEG/PNG/WebP, maximum 240 KB.
- Payment proof: JPEG/PNG/WebP, maximum 2 MB; Cloudinary delivery type `authenticated`.
- Business/product photos: JPEG/PNG/WebP, maximum 5 MB.
- FREE: 3 product photos total and 3 business photos total.
- PREMIUM: 5 photos per product and 10 business photos total.
- BISNIS: 8 photos per product and 20 business photos total.

Quotas and ownership checks are enforced by the server; UI checks alone are not trusted.

## Audit

Run `npm run media:check`. This audit checks the required upload endpoints for Cloudinary upload calls and security guardrails, and verifies there are no active Firebase Storage upload flows in `app/` or `lib/`. It deliberately does **not** scan or reject static images, icons, animations, banners, or demo imagery used to render the UI. It does not upload files or contact the live Cloudinary account.

## Environment variables

Configure these server-only values in `.env.local` and in the deployment environment:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Do not use the `NEXT_PUBLIC_` prefix for Cloudinary credentials.

## Legacy data and production checks

Older versions may have stored QR images as base64 in Firestore or payment proofs in Firebase Storage. Re-upload the current QR from the admin dashboard and re-upload pending legacy payment proofs, or carry out a separately reviewed migration before approving those transactions. Do not delete old assets until transaction/version references are reconciled.

The static source audit is not a substitute for live tests. Before production, configure Cloudinary and Firebase, then test real uploads, owner isolation, package quotas, private proof access, signed URL expiry/access, deletion cleanup, and responsive browser behavior. Run `npm run typecheck` and `npm run build` in an environment with dependencies installed.
