import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
let app: FirebaseApp | undefined; let auth: Auth | undefined; let db: Firestore | undefined;
export function getFirebase(){
 const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID};
 if(!config.apiKey||!config.projectId) throw new Error('Firebase belum dikonfigurasi. Isi variabel NEXT_PUBLIC_FIREBASE_* dari proyek milik operator.');
 app=getApps().length?getApps()[0]:initializeApp(config); auth=getAuth(app); db=getFirestore(app); return {app,auth,db};
}
