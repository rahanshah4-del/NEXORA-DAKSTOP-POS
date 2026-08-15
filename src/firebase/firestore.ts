import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, type DocumentData } from 'firebase/firestore';
import { getFirebaseFirestore } from './config';

function fs() {
  return getFirebaseFirestore();
}

// Collection references
export const usersCol = collection(fs(), 'users');
export const productsCol = collection(fs(), 'products');
export const categoriesCol = collection(fs(), 'categories');
export const customersCol = collection(fs(), 'customers');
export const ordersCol = collection(fs(), 'orders');
export const inventoryCol = collection(fs(), 'inventory');
export const employeesCol = collection(fs(), 'employees');
export const settingsCol = collection(fs(), 'settings');

// Generic CRUD helpers
export async function getDocument(collectionName: string, id: string) {
  const docRef = doc(fs(), collectionName, id);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

export async function getDocuments(collectionName: string, constraints: { field?: string; op?: string; value?: unknown; limit?: number } = {}) {
  const colRef = collection(fs(), collectionName);
  let q = query(colRef);
  if (constraints.field && constraints.op && constraints.value) {
    q = query(q, where(constraints.field, constraints.op as any, constraints.value));
  }
  if (constraints.limit) {
    q = query(q, limit(constraints.limit));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setDocument(collectionName: string, id: string, data: DocumentData) {
  const docRef = doc(fs(), collectionName, id);
  await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function updateDocument(collectionName: string, id: string, data: DocumentData) {
  const docRef = doc(fs(), collectionName, id);
  await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
}

export async function deleteDocument(collectionName: string, id: string) {
  const docRef = doc(fs(), collectionName, id);
  await deleteDoc(docRef);
}
