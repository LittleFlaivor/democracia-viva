/**
 * CONFIGURACIÓN Y CLIENTE MODULAR OFICIAL DE FIREBASE (SDK v11)
 * Proyecto: democracia-viva-es
 * Servicios: Authentication (Just-In-Time / Anónimo) & Cloud Firestore (Inmutable)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAJZgt4kvCbpbW3hoeS3zmAKoRy6LBLBCY",
  authDomain: "democracia-viva-es.firebaseapp.com",
  projectId: "democracia-viva-es",
  storageBucket: "democracia-viva-es.firebasestorage.app",
  messagingSenderId: "1092003289735",
  appId: "1:1092003289735:web:39bc366cceaed671597622"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('Inicialización de Firebase en modo degradado/mock:', err);
  // Fallbacks si corre en entornos limitados
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
}

export { app, auth, db };

/**
 * Asegura que exista una sesión de Firebase Auth Just-in-Time (Anónima)
 * para vincular el token de red sin exigir correo ni contraseña.
 */
export async function ensureAnonymousAuth(): Promise<User | null> {
  if (!auth || !auth.currentUser) {
    try {
      if (typeof window !== 'undefined' && auth.signInAnonymously) {
        const cred = await signInAnonymously(auth);
        return cred.user;
      }
    } catch (err) {
      console.warn('Aviso: Auth anónimo de Firebase no disponible directamente:', err);
    }
  }
  return auth?.currentUser || null;
}
