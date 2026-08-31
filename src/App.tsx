import React, { useState, useEffect } from 'react';
import type { TabType, Transaction, Member, Budget } from './types';
import { 
  subscribeTransactions, 
  subscribeMembers, 
  subscribeBudgets, 
  seedDatabaseIfEmpty
} from './firebase';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { RegisterPaymentView } from './components/RegisterPaymentView';
import { FlowView } from './components/FlowView';
import { StatusView } from './components/StatusView';
import { ReceiptModal } from './components/ReceiptModal';
import { AllTransactionsModal } from './components/AllTransactionsModal';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [budget, setBudget] = useState<Budget>({
    name: 'Orçamento da Liga',
    total: 0,
    spent: 0,
    category: 'Eventos e Projetos',
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Receipt Modal Lightbox state
  const [receiptModalData, setReceiptModalData] = useState<{
    isOpen: boolean;
    url?: string;
    title?: string;
    subtitle?: string;
    amount?: number;
  }>({ isOpen: false });

  // All Transactions Modal state
  const [isAllTransactionsModalOpen, setIsAllTransactionsModalOpen] = useState(false);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    // 1. Initial check (keeps DB clean)
    seedDatabaseIfEmpty();

    // 2. Subscribe to real-time updates
    const unsubTransactions = subscribeTransactions((data) => {
      setTransactions(data);
    });

    const unsubMembers = subscribeMembers((data) => {
      setMembers(data);
    });

    const unsubBudgets = subscribeBudgets((data) => {
      setBudget(data);
    });

    return () => {
      unsubTransactions();
      unsubMembers();
      unsubBudgets();
    };
  }, []);

  const handleOpenReceipt = (
    url: string,
    title: string,
    subtitle?: string,
    amount?: number
  ) => {
    setReceiptModalData({
      isOpen: true,
      url,
      title,
      subtitle,
      amount,
    });
  };

  const handleRegisterForMember = (memberName: string, month: number, year: number) => {
    setCurrentTab('register');
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#191c1e] font-sans flex flex-col selection:bg-[#9fcde1] selection:text-[#003746]">
      {/* Sticky App Header with Realtime Status */}
      <Header
        currentTab={currentTab}
        isSyncing={isSyncing}
      />

      {/* Main Content Area with Safe Spacing */}
      <main className="flex-1 pt-16 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                transactions={transactions}
                members={members}
                budget={budget}
                onNavigate={(tab) => setCurrentTab(tab)}
                onViewReceipt={handleOpenReceipt}
                onOpenNewTransaction={() => setCurrentTab('flow')}
              />
            )}

            {currentTab === 'register' && (
              <RegisterPaymentView
                members={members}
                recentTransactions={transactions}
                onViewReceipt={handleOpenReceipt}
              />
            )}

            {currentTab === 'flow' && (
              <FlowView
                transactions={transactions}
                onViewReceipt={handleOpenReceipt}
                onOpenAllTransactions={() => setIsAllTransactionsModalOpen(true)}
              />
            )}

            {currentTab === 'status' && (
              <StatusView
                members={members}
                onViewReceipt={handleOpenReceipt}
                onRegisterPaymentForMember={handleRegisterForMember}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation with 4 tabs */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Lightbox / Modal for Direct Image URLs and Receipts */}
      <ReceiptModal
        isOpen={receiptModalData.isOpen}
        imageUrl={receiptModalData.url}
        title={receiptModalData.title}
        subtitle={receiptModalData.subtitle}
        amount={receiptModalData.amount}
        onClose={() => setReceiptModalData({ isOpen: false })}
      />

      {/* All Transactions Modal */}
      <AllTransactionsModal
        isOpen={isAllTransactionsModalOpen}
        onClose={() => setIsAllTransactionsModalOpen(false)}
        transactions={transactions}
        onViewReceipt={handleOpenReceipt}
      />
    </div>
  );
}
