import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let cachedApp: App | undefined;

export function getAdminServices() {
  if (!cachedApp) {
    const existing = getApps()[0];
    if (existing) {
      cachedApp = existing;
    } else {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Konfigurasi Firebase Admin belum lengkap. Isi FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, dan FIREBASE_ADMIN_PRIVATE_KEY.');
      }
      cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
    }
  }
  const app = cachedApp;
  if (!app) throw new Error('Firebase Admin gagal diinisialisasi.');
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
