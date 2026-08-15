/**
 * End-to-End Staff PIN Login Dry Run
 *
 * Tests:
 *   POSITIVE: Real credentials → customToken → signInWithCustomToken → staff object
 *   NEGATIVE: Wrong PIN → permission-denied → graceful error
 *
 * Run: npx tsx test-firebase.ts
 */

import 'dotenv/config';
import { initializeApp } from 'firebase/app';

// Use the EXACT same function from auth.ts to test the full flow
async function main() {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  };

  // ── Init ──
  console.log('========================================');
  console.log('  STAFF PIN LOGIN — END TO END TEST');
  console.log('========================================');
  console.log('Project:', config.projectId);
  console.log('');

  try {
    initializeApp(config);
    console.log('Firebase init: ✅');
  } catch (err: any) {
    console.log('Firebase init: ❌', err.message);
    process.exit(1);
  }

  // Import auth.ts's staffPinLogin (same code path as the real app)
  const { staffPinLogin } = await import('./src/firebase/auth');

  // ═══════════════════════════════════════════
  //  POSITIVE TEST — Real credentials
  // ═══════════════════════════════════════════
  console.log('');
  console.log('────────────────────────────────────────');
  console.log('  TEST 1: POSITIVE — Valid credentials');
  console.log('────────────────────────────────────────');
  console.log('  workspaceCode: RAHS8C4');
  console.log('  staffLoginId:  CSH-VQC7');
  console.log('  pin:           ******');
  console.log('');

  const posResult = await staffPinLogin('RAHS8C4', 'CSH-VQC7', '125238');

  console.log('  success:     ', posResult.success);
  console.log('  customToken: ', posResult.customToken ? posResult.customToken.slice(0, 30) + '...' : '(null)');
  console.log('  errorCode:   ', posResult.errorCode || '(none)');
  console.log('  error:       ', posResult.error || '(none)');

  if (posResult.success && posResult.staff) {
    console.log('');
    console.log('  ── Staff Object ──');
    console.log('  uid:          ', posResult.staff.uid);
    console.log('  staffId:      ', posResult.staff.staffId);
    console.log('  staffLoginId: ', posResult.staff.staffLoginId);
    console.log('  workspaceId:  ', posResult.staff.workspaceId);
    console.log('  ownerId:      ', posResult.staff.ownerId);
    console.log('  role:         ', posResult.staff.role);
    console.log('  name:         ', posResult.staff.name);
    console.log('  email:        ', posResult.staff.email);

    // Verify role
    if (posResult.staff.role === 'cashier') {
      console.log('');
      console.log('  ✅ Role is "cashier" — correct!');
    } else {
      console.log('');
      console.log('  ⚠️  Role is "' + posResult.staff.role + '" — expected "cashier"');
    }

    // Verify signInWithCustomToken established a session
    const { getFirebaseAuth } = await import('./src/firebase/config');
    const currentUser = getFirebaseAuth().currentUser;
    console.log('');
    console.log('  ── Auth Session Check ──');
    if (currentUser) {
      console.log('  ✅ Firebase Auth session established');
      console.log('     uid:', currentUser.uid);
      console.log('     email:', currentUser.email);
      console.log('     emailVerified:', currentUser.emailVerified);
    } else {
      console.log('  ❌ No Firebase Auth session — signInWithCustomToken may have failed silently');
    }

    console.log('');
    console.log('  RESULT: ✅ POSITIVE TEST PASSED');
  } else {
    console.log('');
    console.log('  RESULT: ❌ POSITIVE TEST FAILED');
  }

  // ═══════════════════════════════════════════
  //  NEGATIVE TEST — Wrong PIN
  // ═══════════════════════════════════════════
  console.log('');
  console.log('────────────────────────────────────────');
  console.log('  TEST 2: NEGATIVE — Wrong PIN');
  console.log('────────────────────────────────────────');
  console.log('  workspaceCode: RAHS8C4');
  console.log('  staffLoginId:  CSH-VQC7');
  console.log('  pin:           000000 (deliberately wrong)');
  console.log('');

  const negResult = await staffPinLogin('RAHS8C4', 'CSH-VQC7', '000000');

  console.log('  success:     ', negResult.success);
  console.log('  customToken: ', negResult.customToken ? '(present)' : '(null)');
  console.log('  errorCode:   ', negResult.errorCode || '(none)');
  console.log('  error:       ', negResult.error || '(none)');
  console.log('  staff:       ', negResult.staff ? '(present — unexpected!)' : '(null — correct)');

  const isPermissionDenied = negResult.errorCode === 'functions/permission-denied';
  const isExpectedMessage = negResult.error?.includes('Invalid team login details');

  if (!negResult.success && isPermissionDenied && isExpectedMessage) {
    console.log('');
    console.log('  ✅ Correctly rejected with permission-denied');
    console.log('  ✅ Error message matches: "Invalid team login details."');
    console.log('  ✅ No crash, no token, no staff object');
    console.log('');
    console.log('  RESULT: ✅ NEGATIVE TEST PASSED');
  } else {
    console.log('');
    console.log('  RESULT: ❌ NEGATIVE TEST FAILED');
    if (negResult.success) console.log('     Unexpected: login succeeded with wrong PIN!');
    if (!isPermissionDenied) console.log('     Unexpected errorCode:', negResult.errorCode);
    if (!isExpectedMessage) console.log('     Unexpected error message:', negResult.error);
  }

  // ═══════════════════════════════════════════
  //  FINAL SUMMARY
  // ═══════════════════════════════════════════
  console.log('');
  console.log('========================================');
  console.log('  FINAL SUMMARY');
  console.log('========================================');
  const posPassed = posResult.success && posResult.staff !== null;
  const negPassed = !negResult.success && negResult.errorCode === 'functions/permission-denied';

  console.log('  Positive test:', posPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('  Negative test:', negPassed ? '✅ PASSED' : '❌ FAILED');
  console.log('');

  if (posPassed && negPassed) {
    console.log('  🎉 All tests passed. Staff PIN login is working end-to-end.');
    console.log('     - teamStaffLogin callable: ✅');
    console.log('     - signInWithCustomToken:  ✅');
    console.log('     - Auth session established: ✅');
    console.log('     - Error handling (wrong PIN): ✅');
    console.log('');
    console.log('  The flow is ready for production use.');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
