import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
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

  // Probe 1: getPayments query
  console.log('=== PROBE 1: getPayments (orderId + orderBy createdAt desc) ===');
  try {
    const colRef = collection(db, 'workspaces', WS, 'restaurantPayments');
    const q = query(colRef, where('orderId', '==', 'test'), orderBy('createdAt', 'desc'));
    await getDocs(q);
    console.log('OK - no error');
  } catch(e: any) {
    console.log('code:', e.code);
    console.log('name:', e.name);
    console.log('message (full):', e.message);
    // Check for nested URL
    console.log('raw error keys:', Object.keys(e));
    if (e.customData) console.log('customData:', e.customData);
    if (e._baseMessage) console.log('_baseMessage:', e._baseMessage);
    const allKeys = [...Object.getOwnPropertyNames(e), ...Object.getOwnPropertyNames(Object.getPrototypeOf(e))];
    console.log('all keys:', allKeys);
  }

  // Probe 2: getActiveCashSession query
  console.log('');
  console.log('=== PROBE 2: getActiveCashSession (status + orderBy openedAt desc) ===');
  try {
    const colRef = collection(db, 'workspaces', WS, 'restaurantCashSessions');
    const q = query(colRef, where('status', '==', 'open'), orderBy('openedAt', 'desc'), limit(1));
    await getDocs(q);
    console.log('OK - no error');
  } catch(e: any) {
    console.log('code:', e.code);
    console.log('name:', e.name);
    console.log('message (full):', e.message);
    console.log('raw error keys:', Object.keys(e));
    if (e.customData) console.log('customData:', e.customData);
    if (e._baseMessage) console.log('_baseMessage:', e._baseMessage);
    const allKeys = [...Object.getOwnPropertyNames(e), ...Object.getOwnPropertyNames(Object.getPrototypeOf(e))];
    console.log('all keys:', allKeys);
  }
}
probe().catch(e => console.error('FATAL:', e));
