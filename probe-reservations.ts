import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { staffPinLogin } from './src/firebase/auth';

async function probe() {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  };
  initializeApp(config);

  const authResult = await staffPinLogin('RAHS8C4', 'CSH-VQC7', '125238');
  if (!authResult.success) { console.log('Auth failed:', authResult.error); return; }
  const WS = authResult.staff!.workspaceId;

  const db = getFirestore();

  console.log('=== getReservations query (date + orderBy time) ===');
  try {
    const colRef = collection(db, 'workspaces', WS, 'restaurantReservations');
    const q = query(colRef, where('date', '==', '2026-08-04'), orderBy('time', 'asc'));
    await getDocs(q);
    console.log('OK - no error');
  } catch(e: any) {
    console.log('code:', e.code);
    console.log('name:', e.name);
    console.log('message (full):', e.message);
  }
}
probe().catch(e => console.error('FATAL:', e));
