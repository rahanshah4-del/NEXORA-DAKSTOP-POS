import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let functions: Functions | null = null;

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.FIREBASE_APP_ID || '',
};

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const fbApp = getFirebaseApp();
    auth = getAuth(fbApp);
    setPersistence(auth, browserLocalPersistence).catch(console.error);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const fbApp = getFirebaseApp();
    firestore = getFirestore(fbApp);
  }
  return firestore;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    const fbApp = getFirebaseApp();
    functions = getFunctions(fbApp);
  }
  return functions;
}
