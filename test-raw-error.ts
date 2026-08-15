import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore } from './src/firebase/config';
import { staffPinLogin } from './src/firebase/auth';

async function main() {
  const cfg = {
    apiKey: process.env.FIREBASE_API_KEY || '', authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '', storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '', appId: process.env.FIREBASE_APP_ID || '',
  };
  initializeApp(cfg);

  const r = await staffPinLogin('RAHS8C4', 'CSH-VQC7', '125238');
  if (!r.success || !r.staff) { console.log('AUTH FAILED'); process.exit(1); }

  const ws = r.staff.workspaceId;
  const uid = getAuth().currentUser?.uid;
  console.log('UID:', uid, '| WS:', ws, '\n');

  const db = getFirebaseFirestore();
  const colRef = collection(db, 'workspaces', ws, 'restaurantPayments');
  const docRef = doc(colRef);
  const payload = {
    orderId: 'raw-error-test',
    amountCents: 100, method: 'cash', status: 'paid',
    processedBy: uid,
    workspaceId: ws, createdBy: uid, ownerId: ws,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  console.log('Path:', colRef.path);
  console.log('Payload keys:', Object.keys(payload).join(', '), '\n');

  try {
    await setDoc(docRef, payload);
    console.log('SUCCESS');
  } catch (err: any) {
    console.log('=== RAW ERROR OBJECT ===');
    console.log('code   :', err.code);
    console.log('message:', err.message);
    console.log('name   :', err.name);
    console.log('');

    // Check for CEL/expression text
    const msg = (err.message || '').toLowerCase();
    const hasCEL = msg.includes('unable to evaluate');
    const hasEmailVerified = msg.includes('email_verified');
    console.log('Has "Unable to evaluate"?', hasCEL ? 'YES' : 'no');
    console.log('Has "email_verified"?    ', hasEmailVerified ? 'YES' : 'no');
    console.log('');

    // All enumerable keys
    console.log('Enumerable keys:', Object.keys(err).join(', '));
    console.log('');

    // Full JSON via prototype chain
    const allProps: Record<string, any> = {};
    for (const key of Object.getOwnPropertyNames(err)) {
      try { allProps[key] = (err as any)[key]; } catch { allProps[key] = '(unreadable)'; }
    }
    console.log('All own properties:');
    for (const [k, v] of Object.entries(allProps)) {
      if (k === 'stack') {
        console.log(`  ${k}:`, (v as string)?.split('\n').slice(0, 3).join('\n'));
      } else {
        console.log(`  ${k}:`, JSON.stringify(v));
      }
    }
  }
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
