import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import type { Member, Transaction, Budget } from './types';

const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const db: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

// Collections
export const TRANSACTIONS_COLLECTION = 'transactions';
export const MEMBERS_COLLECTION = 'members';
export const BUDGETS_COLLECTION = 'budgets';
export const SETTINGS_COLLECTION = 'settings';

// Initial sample data based on the provided screenshots
export const INITIAL_MEMBERS: Omit<Member, 'id'>[] = [
  {
    name: 'Ana Maria Silva',
    role: 'Diretoria de Qualidade',
    email: 'ana.silva@laoq.org',
    phone: '5511999991111',
    initials: 'AM',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: true,
        date: '12/05/2024',
        amount: 50,
        receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      },
      '2023-10': {
        paid: true,
        date: '08/10/2023',
        amount: 50,
      }
    }
  },
  {
    name: 'Carlos Pereira',
    role: 'Membro Efetivo',
    email: 'carlos.pereira@laoq.org',
    phone: '5511999992222',
    initials: 'CP',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: false,
        date: '',
        amount: 50,
      }
    }
  },
  {
    name: 'Juliana Batista',
    role: 'Membro Efetivo',
    email: 'juliana.batista@laoq.org',
    phone: '5511999993333',
    initials: 'JB',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: true,
        date: '10/05/2024',
        amount: 50,
        receiptUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      }
    }
  },
  {
    name: 'João Santos',
    role: 'Diretoria de Projetos',
    email: 'joao.santos@laoq.org',
    phone: '5511999994444',
    initials: 'JS',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: true,
        date: '05/05/2024',
        amount: 50,
      },
      '2023-10': {
        paid: true,
        date: '12/10/2023',
        amount: 50,
      }
    }
  },
  {
    name: 'Maria Oliveira',
    role: 'Membro Efetivo',
    email: 'maria.oliveira@laoq.org',
    phone: '5511999995555',
    initials: 'MO',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: true,
        date: '08/05/2024',
        amount: 50,
      }
    }
  },
  {
    name: 'Lucas Ferreira',
    role: 'Membro Efetivo',
    email: 'lucas.f@laoq.org',
    phone: '5511999996666',
    initials: 'LF',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: false,
        date: '',
        amount: 50,
      }
    }
  },
  {
    name: 'Beatriz Costa',
    role: 'Trainee',
    email: 'beatriz.costa@laoq.org',
    phone: '5511999997777',
    initials: 'BC',
    active: true,
    monthlyFee: 50,
    payments: {
      '2024-05': {
        paid: false,
        date: '',
        amount: 50,
      }
    }
  }
];

export const INITIAL_TRANSACTIONS: Omit<Transaction, 'id'>[] = [
  {
    type: 'income',
    category: 'Mensalidade',
    description: 'Mensalidade - Turma A',
    amount: 450.00,
    date: '2023-10-12',
    timestamp: new Date('2023-10-12T14:30:00').getTime(),
    status: 'paid',
    notes: 'Pagamento conjunto via PIX',
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    receiptName: 'comprovante_turma_a.png'
  },
  {
    type: 'expense',
    category: 'Material de Escritório',
    description: 'Material de Escritório',
    amount: 120.50,
    date: '2023-10-10',
    timestamp: new Date('2023-10-10T10:15:00').getTime(),
    status: 'realized',
    notes: 'Canetas, pastas e folhas A4 para a gestão',
    receiptUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
    receiptName: 'nf_papelaria.pdf'
  },
  {
    type: 'income',
    category: 'Venda de Camisetas',
    description: 'Venda de Camisetas',
    amount: 380.00,
    date: '2023-10-08',
    timestamp: new Date('2023-10-08T16:00:00').getTime(),
    status: 'paid',
    notes: 'Lote 1 de camisetas oficiais da LAOQ'
  },
  {
    type: 'expense',
    category: 'Impressão de Banners',
    description: 'Impressão de Banners',
    amount: 120.00,
    date: '2023-10-10',
    timestamp: new Date('2023-10-10T11:00:00').getTime(),
    status: 'realized',
    notes: 'Banner para a Semana Acadêmica de Engenharia'
  },
  {
    type: 'income',
    category: 'Mensalidade',
    description: 'Mensalidade - João S.',
    amount: 50.00,
    date: '2023-10-12',
    timestamp: new Date('2023-10-12T09:20:00').getTime(),
    status: 'paid',
    memberName: 'João Santos',
    month: 10,
    year: 2023
  },
  {
    type: 'income',
    category: 'Mensalidade',
    description: 'Mensalidade - Maria O.',
    amount: 50.00,
    date: '2023-10-08',
    timestamp: new Date('2023-10-08T13:45:00').getTime(),
    status: 'paid',
    memberName: 'Maria Oliveira',
    month: 10,
    year: 2023
  },
  {
    type: 'income',
    category: 'Mensalidade',
    description: 'Mensalidade - Ana Maria Silva',
    amount: 50.00,
    date: '2024-05-12',
    timestamp: new Date('2024-05-12T11:30:00').getTime(),
    status: 'paid',
    memberName: 'Ana Maria Silva',
    month: 5,
    year: 2024,
    receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
    receiptName: 'pix_ana_maria_maio.png'
  },
  {
    type: 'income',
    category: 'Mensalidade',
    description: 'Mensalidade - Juliana Batista',
    amount: 50.00,
    date: '2024-05-10',
    timestamp: new Date('2024-05-10T15:20:00').getTime(),
    status: 'paid',
    memberName: 'Juliana Batista',
    month: 5,
    year: 2024
  }
];

export const INITIAL_BUDGET: Budget = {
  name: 'Orçamento da Liga',
  total: 0,
  spent: 0,
  category: 'Eventos e Projetos'
};

// Real-time synchronization listeners
export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  const q = query(collection(db, TRANSACTIONS_COLLECTION), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Transaction[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Transaction, 'id'>) });
    });
    callback(list);
  }, (error) => {
    console.error('Error fetching transactions:', error);
  });
}

export function subscribeMembers(callback: (members: Member[]) => void) {
  const colRef = collection(db, MEMBERS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: Member[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Member, 'id'>) });
    });
    // Sort by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    callback(list);
  }, (error) => {
    console.error('Error fetching members:', error);
  });
}

export function subscribeBudgets(callback: (budget: Budget) => void) {
  const docRef = doc(db, BUDGETS_COLLECTION, 'current');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as Omit<Budget, 'id'>) });
    } else {
      callback(INITIAL_BUDGET);
    }
  }, (error) => {
    console.error('Error fetching budget:', error);
  });
}

// Helper to remove any undefined fields before writing to Firestore
function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = cleanFirestoreData(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

// Database Actions
export async function addTransaction(transaction: Omit<Transaction, 'id'>): Promise<string> {
  const sanitized = cleanFirestoreData({
    ...transaction,
    createdAt: serverTimestamp(),
  });
  const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), sanitized);
  return docRef.id;
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
}

export async function addMember(member: Omit<Member, 'id'>): Promise<string> {
  const sanitized = cleanFirestoreData({
    ...member,
    createdAt: serverTimestamp(),
  });
  const docRef = await addDoc(collection(db, MEMBERS_COLLECTION), sanitized);
  return docRef.id;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<void> {
  const sanitized = cleanFirestoreData(data);
  await updateDoc(doc(db, MEMBERS_COLLECTION, id), sanitized);
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, MEMBERS_COLLECTION, id));
}

export async function updateBudget(data: Partial<Budget>): Promise<void> {
  const sanitized = cleanFirestoreData(data);
  await setDoc(doc(db, BUDGETS_COLLECTION, 'current'), sanitized, { merge: true });
}

// Seed Initial Data if requested manually
export async function seedDatabaseIfEmpty(): Promise<boolean> {
  // Do not auto-seed sample data so the database stays clean as requested by the user
  return true;
}

// Force re-seed (Reset demo data)
export async function resetDatabaseToDefaults(): Promise<void> {
  await clearDatabaseCompletely();
  // Reseed default data
  for (const t of INITIAL_TRANSACTIONS) {
    await addDoc(collection(db, TRANSACTIONS_COLLECTION), t);
  }
  for (const m of INITIAL_MEMBERS) {
    await addDoc(collection(db, MEMBERS_COLLECTION), m);
  }
  await setDoc(doc(db, BUDGETS_COLLECTION, 'current'), INITIAL_BUDGET);
}

// Completely Wipe/Clear Firestore Database
export async function clearDatabaseCompletely(): Promise<void> {
  const tSnap = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
  for (const docItem of tSnap.docs) {
    await deleteDoc(docItem.ref);
  }
  const mSnap = await getDocs(collection(db, MEMBERS_COLLECTION));
  for (const docItem of mSnap.docs) {
    await deleteDoc(docItem.ref);
  }
  const bSnap = await getDocs(collection(db, BUDGETS_COLLECTION));
  for (const docItem of bSnap.docs) {
    await deleteDoc(docItem.ref);
  }
}
