export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'paid' | 'pending' | 'realized';

export interface Transaction {
  id?: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD or formatted string
  timestamp: number;
  status: TransactionStatus;
  memberName?: string;
  memberId?: string;
  month?: number;
  year?: number;
  receiptUrl?: string;
  receiptName?: string;
  notes?: string;
  createdAt?: any;
}

export interface Member {
  id?: string;
  name: string;
  role: string; // e.g. 'Diretoria de Qualidade', 'Membro Efetivo', 'Presidente'
  email?: string;
  phone?: string;
  avatarUrl?: string;
  initials: string;
  active: boolean;
  monthlyFee: number;
  // Paid months record: map of 'YYYY-MM' -> { paid: boolean, date: string, receiptUrl?: string, transactionId?: string }
  payments?: Record<string, {
    paid: boolean;
    date: string;
    receiptUrl?: string;
    transactionId?: string;
    amount?: number;
  }>;
  createdAt?: any;
}

export interface Budget {
  id?: string;
  name: string;
  total: number;
  spent: number;
  category: string;
}

export type TabType = 'dashboard' | 'register' | 'flow' | 'status';
