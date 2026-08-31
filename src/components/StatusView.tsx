import React, { useState } from 'react';
import type { Member, Transaction } from '../types';
import { updateMember, addMember, deleteMember, addTransaction, deleteTransaction } from '../firebase';
import { 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Send, 
  Plus, 
  X, 
  Check, 
  ExternalLink,
  MessageCircle,
  FileText,
  Trash2,
  Edit2,
  ArrowRight,
  RotateCcw,
  Layers,
  Calendar,
  Users,
  Upload,
  Link as LinkIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StatusViewProps {
  members: Member[];
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
  onRegisterPaymentForMember: (memberName: string, month: number, year: number) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_SHORTS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const StatusView: React.FC<StatusViewProps> = ({
  members,
  onViewReceipt,
  onRegisterPaymentForMember,
}) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pendentes' | 'realizados' | 'todos_membros'>('pendentes');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // New Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Membro Efetivo');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFee, setNewMemberFee] = useState('50.00');

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFee, setEditFee] = useState('');

  // Delete Member Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp Reminder State
  const [reminderMember, setReminderMember] = useState<Member | null>(null);

  // Batch Payment Modal State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchMemberId, setBatchMemberId] = useState<string>('');
  const [batchSelectedYear, setBatchSelectedYear] = useState<number>(currentYear);
  const [batchSelectedMonths, setBatchSelectedMonths] = useState<number[]>([currentMonth]);
  const [batchReceiptUrl, setBatchReceiptUrl] = useState('');
  const [batchReceiptFileName, setBatchReceiptFileName] = useState('');
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const periodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const periodLabel = `${MONTH_NAMES[selectedMonth - 1]}/${selectedYear}`;

  // Filter members for the selected period
  const membersWithStatus = members.map((member) => {
    const payment = member.payments?.[periodKey];
    const isPaid = !!payment?.paid;
    return {
      ...member,
      isPaid,
      paidDate: payment?.date || '',
      receiptUrl: payment?.receiptUrl || '',
      transactionId: payment?.transactionId,
    };
  });

  const filteredMembers = membersWithStatus.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paidMembers = filteredMembers.filter((m) => m.isPaid);
  const pendingMembers = filteredMembers.filter((m) => !m.isPaid);

  // Financial stats for the selected month
  const totalReceived = paidMembers.reduce(
    (sum, m) => sum + (m.monthlyFee || 50),
    0
  );
  const totalPending = pendingMembers.reduce(
    (sum, m) => sum + (m.monthlyFee || 50),
    0
  );

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const initials = newMemberName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    await addMember({
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Membro Efetivo',
      phone: newMemberPhone.trim(),
      initials: initials || 'ME',
      active: true,
      monthlyFee: parseFloat(newMemberFee) || 50,
      payments: {},
    });

    setNewMemberName('');
    setNewMemberPhone('');
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role || 'Membro Efetivo');
    setEditPhone(member.phone || '');
    setEditFee((member.monthlyFee || 50).toString());
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember?.id || !editName.trim()) return;

    const initials = editName
      .trim()
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    await updateMember(editingMember.id, {
      name: editName.trim(),
      role: editRole.trim() || 'Membro Efetivo',
      phone: editPhone.trim(),
      initials: initials || 'ME',
      monthlyFee: parseFloat(editFee) || 50,
    });

    setEditingMember(null);
  };

  const handleConfirmDeleteMember = async () => {
    if (!memberToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteMember(memberToDelete.id);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Error deleting member:', err);
      alert('Erro ao excluir membro.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick mark paid and simultaneously create an income transaction linked to member
  const handleQuickMarkPaid = async (member: Member) => {
    if (!member.id) return;
    setActionLoadingId(member.id);

    try {
      const formattedDate = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
      const monthName = MONTH_NAMES[selectedMonth - 1];
      const feeAmount = member.monthlyFee || 50;

      // 1. Create transaction in cash flow
      const transId = await addTransaction({
        type: 'income',
        category: 'Mensalidade',
        description: `Mensalidade - ${member.name} (${monthName}/${selectedYear})`,
        amount: feeAmount,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        status: 'paid',
        memberName: member.name,
        memberId: member.id,
        month: selectedMonth,
        year: selectedYear,
        notes: `Registrado diretamente via Status de Mensalidades`,
      });

      // 2. Update member payments map
      const updatedPayments = {
        ...(member.payments || {}),
        [periodKey]: {
          paid: true,
          date: formattedDate,
          amount: feeAmount,
          transactionId: transId,
        },
      };

      await updateMember(member.id, {
        payments: updatedPayments,
      });

      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.8 },
          colors: ['#003746', '#fea045', '#9fcde1'],
        });
      } catch {}
    } catch (err) {
      console.error('Error marking paid:', err);
      alert('Erro ao registrar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Unmark payment for this month (revert to pending and delete transaction)
  const handleUnmarkPayment = async (member: Member & { transactionId?: string }) => {
    if (!member.id) return;
    if (!confirm(`Deseja desmarcar o pagamento de ${member.name} referente a ${periodLabel}?`)) return;

    setActionLoadingId(member.id);
    try {
      if (member.transactionId) {
        await deleteTransaction(member.transactionId);
      }

      const updatedPayments = { ...(member.payments || {}) };
      delete updatedPayments[periodKey];

      await updateMember(member.id, {
        payments: updatedPayments,
      });
    } catch (err) {
      console.error('Error unmarking payment:', err);
      alert('Erro ao desmarcar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Batch Payment for a specific member or general
  const handleOpenBatchModal = (member?: Member) => {
    const targetMember = member || members[0];
    if (targetMember?.id) {
      setBatchMemberId(targetMember.id);
      
      // Pre-select pending months for this member in the current year
      const pending: number[] = [];
      for (let m = 1; m <= 12; m++) {
        const key = `${selectedYear}-${String(m).padStart(2, '0')}`;
        if (!targetMember.payments?.[key]?.paid) {
          pending.push(m);
        }
      }
      setBatchSelectedMonths(pending.length > 0 ? pending : [selectedMonth]);
    } else {
      setBatchMemberId('');
      setBatchSelectedMonths([selectedMonth]);
    }

    setBatchSelectedYear(selectedYear);
    setBatchReceiptUrl('');
    setBatchReceiptFileName('');
    setIsBatchModalOpen(true);
  };

  const selectedBatchMember = members.find((m) => m.id === batchMemberId);
  const batchUnitFee = selectedBatchMember?.monthlyFee || 50;
  const batchTotalAmount = batchUnitFee * batchSelectedMonths.length;

  const handleToggleBatchMonth = (m: number) => {
    if (batchSelectedMonths.includes(m)) {
      setBatchSelectedMonths(batchSelectedMonths.filter((mo) => mo !== m));
    } else {
      setBatchSelectedMonths([...batchSelectedMonths, m].sort((a, b) => a - b));
    }
  };

  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBatchReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBatchReceiptUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmBatchPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchMember?.id) {
      alert('Selecione um membro.');
      return;
    }
    if (batchSelectedMonths.length === 0) {
      alert('Selecione ao menos um mês para o pagamento em lote.');
      return;
    }

    setIsBatchSubmitting(true);
    try {
      const formattedDate = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
      const monthNamesList = batchSelectedMonths.map((m) => MONTH_SHORTS[m - 1]).join(', ');

      // 1. Create consolidated income transaction in Cash Flow
      const batchTransId = await addTransaction({
        type: 'income',
        category: 'Mensalidade',
        description: `Mensalidade em Lote (${batchSelectedMonths.length} meses: ${monthNamesList}/${batchSelectedYear}) - ${selectedBatchMember.name}`,
        amount: batchTotalAmount,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        status: 'paid',
        memberName: selectedBatchMember.name,
        memberId: selectedBatchMember.id,
        year: batchSelectedYear,
        receiptUrl: batchReceiptUrl || undefined,
        receiptName: batchReceiptFileName || undefined,
        notes: `Pagamento em lote referente aos meses: ${monthNamesList} de ${batchSelectedYear}`,
      });

      // 2. Update member payments map for all selected months
      const updatedPayments = { ...(selectedBatchMember.payments || {}) };
      batchSelectedMonths.forEach((m) => {
        const pKey = `${batchSelectedYear}-${String(m).padStart(2, '0')}`;
        updatedPayments[pKey] = {
          paid: true,
          date: formattedDate,
          amount: batchUnitFee,
          receiptUrl: batchReceiptUrl || undefined,
          transactionId: batchTransId,
        };
      });

      await updateMember(selectedBatchMember.id, {
        payments: updatedPayments,
      });

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#003746', '#fea045', '#9fcde1'],
        });
      } catch {}

      setIsBatchModalOpen(false);
    } catch (err) {
      console.error('Error saving batch payment:', err);
      alert('Erro ao registrar pagamento em lote.');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const getWhatsAppLink = (member: Member) => {
    const msg = encodeURIComponent(
      `Olá ${member.name}! Lembramos sobre a mensalidade de ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear} da LAOQ (R$ ${member.monthlyFee || 50},00). Agradecemos a colaboração!`
    );
    const phone = member.phone ? member.phone.replace(/\D/g, '') : '';
    return phone ? `https://wa.me/${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-5">
      {/* Search & Month Filter Header */}
      <div className="flex flex-col gap-3">
        {/* Search Box */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71787c] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar membro por nome ou diretoria..."
            className="w-full h-12 pl-11 pr-4 bg-[#eceef0] rounded-xl text-sm text-[#191c1e] placeholder:text-[#71787c] focus:outline-none focus:ring-1 focus:ring-[#003746] transition-all"
          />
        </div>

        {/* Period Selector & Action Buttons */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none shadow-sm cursor-pointer"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Batch Payment Button */}
            <button
              onClick={() => handleOpenBatchModal()}
              className="px-3 py-2 bg-[#e6eef0] text-[#003746] hover:bg-[#d0e0e5] border border-[#003746]/20 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              title="Pagar múltiplos meses de uma vez (em lote)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pagar em Lote</span>
            </button>

            {/* Add Member Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-2 bg-[#003746] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-[#1d4e5e] shadow-sm transition-all active:scale-95"
              title="Cadastrar novo membro na lista da liga"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Membro</span>
            </button>
          </div>
        </div>

        {/* Realizados vs Pendentes vs Todos os Membros Tabs */}
        <div className="flex gap-1 p-1 bg-[#e6e8ea] rounded-xl">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pendentes'
                ? 'bg-[#ba1a1a] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Pendentes ({pendingMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('realizados')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'realizados'
                ? 'bg-[#003746] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pagos ({paidMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('todos_membros')}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'todos_membros'
                ? 'bg-[#003746] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Membros Salvos ({members.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (Recebido vs A Receber) */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Recebido */}
        <div className="bg-[#eceef0] rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden border border-[#c0c8cb]/30 shadow-sm">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#003746]/10 rounded-full blur-md"></div>
          <span className="text-xs text-[#41484b] font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#003746]">
              check_circle
            </span>
            Recebido ({MONTH_NAMES[selectedMonth - 1]})
          </span>
          <span className="text-xl font-headline font-bold text-[#003746] mt-0.5">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* A Receber */}
        <div className="bg-[#ffdad6]/40 rounded-xl p-4 flex flex-col gap-1 relative overflow-hidden border border-[#ba1a1a]/20 shadow-sm">
          <div className="absolute -right-3 -top-3 w-16 h-16 bg-[#ba1a1a]/10 rounded-full blur-md"></div>
          <span className="text-xs text-[#41484b] font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">
              warning
            </span>
            A Receber ({MONTH_NAMES[selectedMonth - 1]})
          </span>
          <span className="text-xl font-headline font-bold text-[#ba1a1a] mt-0.5">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* List Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787c]">
            {activeTab === 'pendentes' 
              ? `Membros Pendentes em ${periodLabel}` 
              : activeTab === 'realizados' 
              ? `Membros com Pagamento Confirmado em ${periodLabel}`
              : `Membros Cadastrados na Liga (Salvos para todos os meses)`}
          </h3>
          <span className="text-[11px] text-[#71787c]">
            {filteredMembers.length} {filteredMembers.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {(activeTab === 'realizados' 
            ? paidMembers 
            : activeTab === 'pendentes' 
            ? pendingMembers 
            : filteredMembers
          ).map((member) => {
            const isPaid = member.isPaid;
            const isLoading = actionLoadingId === member.id;

            // Count paid months in the selected year
            const paidCountYear = Object.keys(member.payments || {}).filter(
              (k) => k.startsWith(`${selectedYear}-`) && member.payments?.[k]?.paid
            ).length;

            return (
              <div
                key={member.id || member.name}
                className="bg-white rounded-xl p-3.5 flex flex-col gap-3 border border-[#e0e3e5] shadow-sm hover:border-[#c0c8cb] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Initials Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-sm shrink-0 ${
                        isPaid
                          ? 'bg-[#bbeafd] text-[#001f28]'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}
                    >
                      {member.initials || 'ME'}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#191c1e] truncate">
                          {member.name}
                        </span>
                        <span className="text-xs font-semibold text-[#003746] bg-[#e6eef0] px-2 py-0.2 rounded">
                          R$ {(member.monthlyFee || 50).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#71787c]">
                        <span>{member.role || 'Membro Efetivo'}</span>
                        {member.phone && (
                          <span>• {member.phone}</span>
                        )}
                        <span>• {paidCountYear}/12 pagos ({selectedYear})</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit & Delete Action Icons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      title="Editar dados do membro"
                      className="p-1.5 rounded-lg text-[#71787c] hover:text-[#003746] hover:bg-[#eceef0] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMemberToDelete(member)}
                      title="Apagar membro permanentemente"
                      className="p-1.5 rounded-lg text-[#71787c] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row: 12-Month Mini History Bar + Actions */}
                <div className="pt-2 border-t border-[#f2f4f6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Mini 12 Month strip */}
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    {MONTH_SHORTS.map((shortName, idx) => {
                      const mNum = idx + 1;
                      const pKey = `${selectedYear}-${String(mNum).padStart(2, '0')}`;
                      const hasPaid = !!member.payments?.[pKey]?.paid;
                      const isCurrentSelected = mNum === selectedMonth;

                      return (
                        <span
                          key={mNum}
                          title={`${MONTH_NAMES[idx]}/${selectedYear}: ${hasPaid ? 'Pago' : 'Pendente'}`}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-all ${
                            hasPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isCurrentSelected
                              ? 'bg-[#ffdad6] text-[#ba1a1a] ring-1 ring-[#ba1a1a]'
                              : 'bg-[#f2f4f6] text-[#71787c]'
                          }`}
                        >
                          {shortName}
                        </span>
                      );
                    })}
                  </div>

                  {/* Actions for current month */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0">
                    {isPaid ? (
                      <div className="flex items-center gap-2">
                        {member.receiptUrl && (
                          <button
                            onClick={() =>
                              onViewReceipt(
                                member.receiptUrl,
                                `Comprovante - ${member.name}`,
                                `Mês: ${periodLabel}`,
                                member.monthlyFee || 50
                              )
                            }
                            title="Ver Comprovante Anexo"
                            className="flex items-center gap-1 px-2 py-1 rounded bg-[#eceef0] text-[#003746] hover:bg-[#d8dadc] text-xs font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Comprovante</span>
                          </button>
                        )}
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold tracking-wider">
                          PAGO ({MONTH_SHORTS[selectedMonth - 1]})
                        </span>
                        <button
                          onClick={() => handleUnmarkPayment(member)}
                          title="Desmarcar pagamento deste mês"
                          className="p-1 text-[#71787c] hover:text-[#ba1a1a]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {/* Remind Button */}
                        <button
                          onClick={() => setReminderMember(member)}
                          title="Enviar lembrete via WhatsApp"
                          className="px-2.5 py-1 text-xs text-[#003746] font-semibold bg-[#eceef0] hover:bg-[#d8dadc] rounded-lg transition-colors"
                        >
                          Lembrar
                        </button>

                        {/* Pay in Batch Button */}
                        <button
                          onClick={() => handleOpenBatchModal(member)}
                          title="Pagar múltiplos meses em lote para este membro"
                          className="px-2.5 py-1 text-xs text-[#003746] font-semibold bg-[#e6eef0] hover:bg-[#d0e0e5] rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Em Lote</span>
                        </button>

                        {/* Quick Mark Paid for this month */}
                        <button
                          onClick={() => handleQuickMarkPaid(member)}
                          disabled={isLoading}
                          title={`Confirmar pagamento de ${periodLabel}`}
                          className="px-3 py-1 bg-[#003746] text-white text-xs font-semibold rounded-lg hover:bg-[#1d4e5e] transition-colors flex items-center gap-1 active:scale-95"
                        >
                          {isLoading ? (
                            <span>...</span>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Pagar</span>
                            </>
                          )}
                        </button>

                        {/* Open Complete Form */}
                        <button
                          onClick={() => onRegisterPaymentForMember(member.name, selectedMonth, selectedYear)}
                          title="Registrar pagamento com anexo de comprovante detalhado"
                          className="p-1 text-[#71787c] hover:text-[#003746] rounded"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#c0c8cb]">
              <p className="text-sm text-[#71787c]">
                {members.length === 0 
                  ? 'Nenhum membro cadastrado ainda. Clique em "+ Novo Membro" acima para adicionar uma única vez.'
                  : `Nenhum membro encontrado com o termo pesquisado.`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BATCH PAYMENT MODAL */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#c0c8cb] shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#003746]">
                <div className="w-8 h-8 rounded-lg bg-[#003746] text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-base leading-tight">
                    Pagamento de Mensalidades em Lote
                  </h3>
                  <span className="text-xs text-[#71787c]">
                    Pague vários meses de uma só vez para um membro
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-[#71787c] hover:text-[#191c1e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmBatchPayment} className="flex flex-col gap-4">
              {/* Member Selection */}
              <div>
                <label className="text-xs font-semibold text-[#41484b]">Selecionar Membro</label>
                <select
                  required
                  value={batchMemberId}
                  onChange={(e) => {
                    setBatchMemberId(e.target.value);
                    const m = members.find((mem) => mem.id === e.target.value);
                    if (m) {
                      const pend: number[] = [];
                      for (let i = 1; i <= 12; i++) {
                        const key = `${batchSelectedYear}-${String(i).padStart(2, '0')}`;
                        if (!m.payments?.[key]?.paid) {
                          pend.push(i);
                        }
                      }
                      setBatchSelectedMonths(pend.length > 0 ? pend : [selectedMonth]);
                    }
                  }}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm font-medium focus:outline-[#003746]"
                >
                  <option value="">Selecione o membro...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}) - R$ {(m.monthlyFee || 50).toFixed(2)}/mês
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selection */}
              <div>
                <label className="text-xs font-semibold text-[#41484b]">Ano de Referência</label>
                <select
                  value={batchSelectedYear}
                  onChange={(e) => {
                    const yr = Number(e.target.value);
                    setBatchSelectedYear(yr);
                    if (selectedBatchMember) {
                      const pend: number[] = [];
                      for (let i = 1; i <= 12; i++) {
                        const key = `${yr}-${String(i).padStart(2, '0')}`;
                        if (!selectedBatchMember.payments?.[key]?.paid) {
                          pend.push(i);
                        }
                      }
                      setBatchSelectedMonths(pend.length > 0 ? pend : [1]);
                    }
                  }}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm font-medium focus:outline-[#003746]"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                </select>
              </div>

              {/* Months Grid & Presets */}
              <div className="flex flex-col gap-2 p-3 bg-[#f7f9fb] rounded-xl border border-[#c0c8cb]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#003746]">
                    Meses Selecionados ({batchSelectedMonths.length})
                  </span>
                  <span className="text-xs font-bold text-[#003746]">
                    Total: R$ {batchTotalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setBatchSelectedMonths([1, 2, 3, 4, 5, 6])}
                    className="px-2 py-1 bg-white border border-[#c0c8cb] text-[11px] font-semibold text-[#003746] rounded-md hover:bg-[#eceef0]"
                  >
                    1º Semestre
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedMonths([7, 8, 9, 10, 11, 12])}
                    className="px-2 py-1 bg-white border border-[#c0c8cb] text-[11px] font-semibold text-[#003746] rounded-md hover:bg-[#eceef0]"
                  >
                    2º Semestre
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                    className="px-2 py-1 bg-white border border-[#c0c8cb] text-[11px] font-semibold text-[#003746] rounded-md hover:bg-[#eceef0]"
                  >
                    Ano Inteiro
                  </button>
                  {selectedBatchMember && (
                    <button
                      type="button"
                      onClick={() => {
                        const pend: number[] = [];
                        for (let i = 1; i <= 12; i++) {
                          const key = `${batchSelectedYear}-${String(i).padStart(2, '0')}`;
                          if (!selectedBatchMember.payments?.[key]?.paid) {
                            pend.push(i);
                          }
                        }
                        setBatchSelectedMonths(pend);
                      }}
                      className="px-2 py-1 bg-[#ba1a1a]/10 text-[11px] font-semibold text-[#ba1a1a] rounded-md hover:bg-[#ba1a1a]/20"
                    >
                      Todos os Pendentes
                    </button>
                  )}
                </div>

                {/* 12 Months selection checkboxes */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {MONTH_SHORTS.map((shortName, idx) => {
                    const mNum = idx + 1;
                    const isSelected = batchSelectedMonths.includes(mNum);
                    const periodK = `${batchSelectedYear}-${String(mNum).padStart(2, '0')}`;
                    const isAlreadyPaid = !!selectedBatchMember?.payments?.[periodK]?.paid;

                    return (
                      <button
                        key={mNum}
                        type="button"
                        onClick={() => handleToggleBatchMonth(mNum)}
                        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#003746] text-white border-[#003746]'
                            : isAlreadyPaid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white text-[#41484b] border-[#c0c8cb] hover:border-[#003746]'
                        }`}
                      >
                        <span>{shortName}</span>
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-white text-[#003746]' : isAlreadyPaid ? 'bg-emerald-600 text-white' : 'border border-[#c0c8cb]'
                        }`}>
                          {(isSelected || isAlreadyPaid) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="text-xs font-semibold text-[#41484b]">Comprovante PIX (Opcional)</label>
                <div className="mt-1 flex items-center gap-2">
                  <label className="flex-1 px-3 py-2 bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg text-xs cursor-pointer hover:bg-[#eceef0] flex items-center gap-2 truncate">
                    <Upload className="w-3.5 h-3.5 text-[#003746] shrink-0" />
                    <span className="truncate">
                      {batchReceiptFileName || 'Anexar comprovante do lote...'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleBatchFileUpload}
                    />
                  </label>
                  {batchReceiptFileName && (
                    <button
                      type="button"
                      onClick={() => {
                        setBatchReceiptUrl('');
                        setBatchReceiptFileName('');
                      }}
                      className="p-2 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isBatchSubmitting}
                  onClick={() => setIsBatchModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#eceef0] text-[#41484b] font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isBatchSubmitting || batchSelectedMonths.length === 0 || !batchMemberId}
                  className="flex-1 py-2.5 bg-[#003746] text-white font-semibold text-xs rounded-xl hover:bg-[#1d4e5e] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isBatchSubmitting ? 'Salvando...' : `Confirmar Pagamento (R$ ${batchTotalAmount.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#c0c8cb] shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center">
              <h3 className="font-headline font-bold text-lg text-[#191c1e]">
                Excluir Membro?
              </h3>
              <p className="text-sm text-[#41484b] mt-1">
                Tem certeza que deseja remover permanentemente <strong>{memberToDelete.name}</strong> da base de dados?
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 bg-[#eceef0] text-[#41484b] font-semibold text-xs rounded-xl hover:bg-[#d8dadc] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteMember}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white font-semibold text-xs rounded-xl hover:bg-[#93000a] transition-colors flex items-center justify-center gap-1"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#c0c8cb] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-lg text-[#003746]">
                Editar Membro
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="text-[#71787c] hover:text-[#191c1e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#41484b]">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">Cargo / Diretoria</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                >
                  <option value="Membro Efetivo">Membro Efetivo</option>
                  <option value="Diretoria de Qualidade">Diretoria de Qualidade</option>
                  <option value="Diretoria de Projetos">Diretoria de Projetos</option>
                  <option value="Diretoria Financeira">Diretoria Financeira</option>
                  <option value="Diretoria de Marketing">Diretoria de Marketing</option>
                  <option value="Diretoria de RH">Diretoria de RH</option>
                  <option value="Presidente">Presidente</option>
                  <option value="Vice-Presidente">Vice-Presidente</option>
                  <option value="Trainee">Trainee</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">WhatsApp (com DDD)</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ex: 5511999998888"
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">Valor da Mensalidade (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editFee}
                  onChange={(e) => setEditFee(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-2.5 bg-[#eceef0] text-[#41484b] font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#003746] text-white font-semibold text-xs rounded-xl hover:bg-[#1d4e5e]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reminder WhatsApp Dialog */}
      {reminderMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-[#c0c8cb] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#003746]">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-headline font-bold text-base">Enviar Lembrete</h3>
              </div>
              <button
                onClick={() => setReminderMember(null)}
                className="text-[#71787c] hover:text-[#191c1e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[#41484b]">
              Enviar mensagem de lembrete da mensalidade de <strong>{periodLabel}</strong> (R$ {reminderMember.monthlyFee || 50},00) para <strong>{reminderMember.name}</strong>.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={getWhatsAppLink(reminderMember)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir no WhatsApp
              </a>

              <button
                onClick={() => {
                  onRegisterPaymentForMember(reminderMember.name, selectedMonth, selectedYear);
                  setReminderMember(null);
                }}
                className="w-full py-2.5 bg-[#eceef0] hover:bg-[#d8dadc] text-[#003746] font-semibold text-xs rounded-xl"
              >
                Ir para Registro de Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#c0c8cb] shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-lg text-[#003746]">
                  Cadastrar Novo Membro
                </h3>
                <span className="text-xs text-[#71787c]">
                  O membro ficará salvo para todos os meses do sistema
                </span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#71787c] hover:text-[#191c1e]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-[#41484b]">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Ex: Beatriz Lima"
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">Cargo / Diretoria</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                >
                  <option value="Membro Efetivo">Membro Efetivo</option>
                  <option value="Diretoria de Qualidade">Diretoria de Qualidade</option>
                  <option value="Diretoria de Projetos">Diretoria de Projetos</option>
                  <option value="Diretoria Financeira">Diretoria Financeira</option>
                  <option value="Diretoria de Marketing">Diretoria de Marketing</option>
                  <option value="Diretoria de RH">Diretoria de RH</option>
                  <option value="Presidente">Presidente</option>
                  <option value="Vice-Presidente">Vice-Presidente</option>
                  <option value="Trainee">Trainee</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">WhatsApp (com DDD)</label>
                <input
                  type="text"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="Ex: 5511999998888"
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41484b]">Valor da Mensalidade (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newMemberFee}
                  onChange={(e) => setNewMemberFee(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2.5 border border-[#c0c8cb] rounded-lg text-sm focus:outline-[#003746]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#eceef0] text-[#41484b] font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#003746] text-white font-semibold text-xs rounded-xl hover:bg-[#1d4e5e]"
                >
                  Cadastrar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
