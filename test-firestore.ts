/**
 * Firestore POS — Round-Trip Test (4 collections)
 *
 * Uses staff credentials with the newly backfilled 'orders' permission.
 *
 * Expected:
 *   restaurantPayments — should PASS (depends on orders permission)
 *   restaurantCashSessions — should PASS (depends on orders permission)
 *   restaurantReservations — should PASS (never depended on orders)
 *   restaurantRecipes — EXPECTED FAIL (cashier lacks kitchenProduction/menuManagement)
 *
 * Run: npx tsx test-firestore.ts
 */

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

async function main() {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  };

  console.log('═══════════════════════════════════════════');
  console.log('  FIRESTORE POS — ROUND-TRIP RETEST');
  console.log('═══════════════════════════════════════════\n');

  initializeApp(config);

  // Authenticate
  const { staffPinLogin } = await import('./src/firebase/auth');
  const authResult = await staffPinLogin('RAHS8C4', 'CSH-VQC7', '125238');
  if (!authResult.success || !authResult.staff) {
    console.log('❌ Auth FAILED:', authResult.error);
    process.exit(1);
  }
  const WS = authResult.staff.workspaceId;
  console.log('Auth : ✅', authResult.staff.name, '| workspaceId:', WS);
  console.log('Role :', authResult.staff.role, '\n');

  const fs = await import('./src/firebase/firestore-pos');

  // Verify Firestore auth context
  const { getFirebaseAuth } = await import('./src/firebase/config');
  const fAuth = getFirebaseAuth();
  console.log('Firestore auth check:');
  console.log('  currentUser:', fAuth.currentUser?.uid ?? '(null)');
  console.log('  token valid:', fAuth.currentUser ? 'yes' : 'NO — auth not propagated to Firestore!');
  console.log('');

  const TEST_PREFIX = `rtt_${Date.now()}`;
  const results: Record<string, { create: string; read: string; update: string; final: string }> = {};

  // ═══════════════════════════════════════════
  //  1. restaurantPayments
  // ═══════════════════════════════════════════
  console.log('── 1. restaurantPayments ──');
  try {
    console.log('  CREATE ...');
    const r1 = await fs.createPayment(WS, {
      orderId: `${TEST_PREFIX}_order`, amountCents: 2999, method: 'card',
      status: 'paid', tipCents: 500, processedBy: authResult.staff!.uid,
    });
    if (!r1.success) throw new Error(r1.error);
    const pid = r1.id!;
    results.payments = { create: `✅ created: ${pid.slice(0, 20)}...`, read: '', update: '', final: '' };
    console.log(`  ✅ CREATE — ${pid}`);

    console.log('  READ ...');
    const r2 = await fs.getPayments(WS, { orderId: `${TEST_PREFIX}_order` });
    if (!r2.success || !r2.payments?.length) throw new Error(r2.error || 'not found');
    if (r2.payments[0].amountCents !== 2999) throw new Error(`amount mismatch: ${r2.payments[0].amountCents}`);
    results.payments.read = `✅ found: amountCents=${r2.payments[0].amountCents}, method=${r2.payments[0].method}`;
    console.log(`  ✅ READ — amountCents=${r2.payments[0].amountCents}`);

    console.log('  UPDATE ...');
    const r3 = await fs.updatePayment(WS, pid, { status: 'refunded' });
    if (!r3.success) throw new Error(r3.error);
    results.payments.update = '✅ status → refunded';
    results.payments.final = '✅ PASSED';
    console.log('  ✅ UPDATE — status → refunded');
    console.log('  🟢 PASSED\n');
  } catch (err: any) {
    results.payments = { create: '❌', read: '❌', update: '❌', final: `❌ ${err.message?.slice(0, 100)}` };
    console.log(`  🔴 FAILED — ${err.message?.slice(0, 120)}\n`);
  }

  // ═══════════════════════════════════════════
  //  2. restaurantCashSessions
  // ═══════════════════════════════════════════
  console.log('── 2. restaurantCashSessions ──');
  try {
    console.log('  CREATE (open) ...');
    const r1 = await fs.openCashSession(WS, {
      openedBy: authResult.staff!.uid, openedByName: authResult.staff!.name,
      openingBalanceCents: 50000, status: 'open',
    });
    if (!r1.success) throw new Error(r1.error);
    const sid = r1.id!;
    results.cashSessions = { create: `✅ opened: ${sid.slice(0, 20)}...`, read: '', update: '', final: '' };
    console.log(`  ✅ OPEN — ${sid}`);

    console.log('  READ (active) ...');
    const r2 = await fs.getActiveCashSession(WS);
    if (!r2.success) throw new Error(r2.error);
    if (!r2.session || r2.session.id !== sid) throw new Error('active session mismatch');
    results.cashSessions.read = `✅ active: balance=${r2.session.openingBalanceCents}`;
    console.log(`  ✅ READ — openingBalance=${r2.session.openingBalanceCents}`);

    console.log('  UPDATE (close) ...');
    const r3 = await fs.closeCashSession(WS, sid, {
      closingBalanceCents: 55000, expectedBalanceCents: 55000,
      differenceCents: 0, closedByName: authResult.staff!.name,
    });
    if (!r3.success) throw new Error(r3.error);
    results.cashSessions.update = '✅ closed';
    results.cashSessions.final = '✅ PASSED';
    console.log('  ✅ CLOSE');
    console.log('  🟢 PASSED\n');
  } catch (err: any) {
    results.cashSessions = { create: '❌', read: '❌', update: '❌', final: `❌ ${err.message?.slice(0, 100)}` };
    console.log(`  🔴 FAILED — ${err.message?.slice(0, 120)}\n`);
  }

  // ═══════════════════════════════════════════
  //  3. restaurantRecipes (EXPECTED FAIL)
  // ═══════════════════════════════════════════
  console.log('── 3. restaurantRecipes (EXPECTED: permission-denied) ──');
  try {
    console.log('  CREATE ...');
    const r1 = await fs.createRecipe(WS, {
      name: `${TEST_PREFIX} Recipe`, description: 'Test', category: 'Test',
      ingredients: [{ name: 'A', quantity: '100', unit: 'g' }],
      prepTimeMinutes: 10, cookTimeMinutes: 20, priceCents: 1599,
      costCents: 500, isActive: true,
    });
    if (!r1.success) throw new Error(r1.error);
    const rid = r1.id!;
    results.recipes = { create: `✅ created: ${rid.slice(0, 20)}...`, read: '', update: '', final: '' };
    console.log(`  ✅ CREATE (unexpected!) — ${rid}`);
    console.log('  🟢 PASSED (permission was granted)\n');
  } catch (err: any) {
    const msg = err.message || '';
    const isPermDenied = msg.includes('PERMISSION_DENIED') || msg.includes('Missing or insufficient');
    if (isPermDenied) {
      results.recipes = { create: '❌', read: '—', update: '—', final: '⚠️ EXPECTED FAIL — cashier lacks kitchenProduction/menuManagement' };
      console.log(`  ❌ PERMISSION_DENIED (expected — cashier role)\n`);
    } else {
      results.recipes = { create: '❌', read: '—', update: '—', final: `❌ ${msg.slice(0, 100)}` };
      console.log(`  🔴 UNEXPECTED ERROR — ${msg.slice(0, 120)}\n`);
    }
  }

  // ═══════════════════════════════════════════
  //  4. restaurantReservations
  // ═══════════════════════════════════════════
  console.log('── 4. restaurantReservations ──');
  try {
    console.log('  CREATE ...');
    const r1 = await fs.createReservation(WS, {
      customerName: `${TEST_PREFIX} Customer`, customerPhone: '+1-555-0100',
      partySize: 4, date: new Date().toISOString().split('T')[0],
      time: '19:00', status: 'confirmed', notes: 'Test',
      createdBy: authResult.staff!.uid,
    });
    if (!r1.success) throw new Error(r1.error);
    const rid = r1.id!;
    results.reservations = { create: `✅ created: ${rid.slice(0, 20)}...`, read: '', update: '', final: '' };
    console.log(`  ✅ CREATE — ${rid}`);

    console.log('  READ ...');
    const r2 = await fs.getReservations(WS, { date: new Date().toISOString().split('T')[0] });
    if (!r2.success || !r2.reservations?.length) throw new Error(r2.error || 'not found');
    const found = r2.reservations.find(r => r.id === rid);
    if (!found) throw new Error('created reservation not in list');
    results.reservations.read = `✅ found: partySize=${found.partySize}`;
    console.log(`  ✅ READ — ${r2.reservations.length} reservation(s)`);

    console.log('  UPDATE ...');
    const r3 = await fs.updateReservation(WS, rid, { partySize: 6 });
    if (!r3.success) throw new Error(r3.error);
    results.reservations.update = '✅ partySize → 6';
    results.reservations.final = '✅ PASSED';
    console.log('  ✅ UPDATE — partySize → 6');
    console.log('  🟢 PASSED\n');
  } catch (err: any) {
    results.reservations = { create: '❌', read: '❌', update: '❌', final: `❌ ${err.message?.slice(0, 100)}` };
    console.log(`  🔴 FAILED — ${err.message?.slice(0, 120)}\n`);
  }

  // ═══════════════════════════════════════════
  //  FINAL SUMMARY
  // ═══════════════════════════════════════════
  console.log('═══════════════════════════════════════════');
  console.log('  ROUND-TRIP RESULTS');
  console.log('═══════════════════════════════════════════');
  for (const [col, r] of Object.entries(results)) {
    const label = { payments: 'Payments', cashSessions: 'Cash Sessions', recipes: 'Recipes', reservations: 'Reservations' }[col] || col;
    const emoji = r.final.includes('PASSED') ? '🟢' : r.final.includes('EXPECTED') ? '🟡' : '🔴';
    console.log(`  ${emoji} ${label}: ${r.final}`);
    if (r.create) console.log(`     CREATE: ${r.create}`);
    if (r.read) console.log(`     READ:   ${r.read}`);
    if (r.update) console.log(`     UPDATE: ${r.update}`);
  }
  console.log('');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
