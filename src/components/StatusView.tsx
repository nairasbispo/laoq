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
  RotateCcw
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

export const StatusView: React.FC<StatusViewProps> = ({
  members,
  onViewReceipt,
  onRegisterPaymentForMember,
}) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'realizados' | 'pendentes'>('pendentes');
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

        {/* Period Selector & Add Member Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none shadow-sm cursor-pointer"
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
              className="px-3 py-1.5 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-[#003746] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#1d4e5e] shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Membro</span>
          </button>
        </div>

        {/* Realizados vs Pendentes Tabs */}
        <div className="flex gap-1 p-1 bg-[#e6e8ea] rounded-xl">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
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
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'realizados'
                ? 'bg-[#003746] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Realizados ({paidMembers.length})</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (2 Columns: Recebido vs A Receber) */}
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
            {activeTab === 'pendentes' ? 'Membros com Mensalidade Pendente' : 'Membros com Mensalidade Paga'} ({periodLabel})
          </h3>
          <span className="text-[11px] text-[#71787c]">
            Total: {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {(activeTab === 'realizados' ? paidMembers : pendingMembers).map(
            (member) => {
              const isPaid = member.isPaid;
              const isLoading = actionLoadingId === member.id;

              return (
                <div
                  key={member.id || member.name}
                  className="bg-white rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[#e0e3e5] shadow-sm hover:border-[#c0c8cb] transition-colors"
                >
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
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#f2f4f6]">
                    {/* Edit Member & Delete Member Icons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(member)}
                        title="Editar dados do membro"
                        className="p-1.5 rounded-lg text-[#71787c] hover:text-[#003746] hover:bg-[#eceef0] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setMemberToDelete(member)}
                        title="Apagar membro da liga"
                        className="p-1.5 rounded-lg text-[#71787c] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

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
                        <span className="px-2.5 py-1 rounded-full bg-[#003746]/10 text-[#003746] text-[11px] font-bold tracking-wider">
                          PAGO
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
                        <button
                          onClick={() => setReminderMember(member)}
                          title="Enviar lembrete via WhatsApp"
                          className="px-2.5 py-1 text-xs text-[#003746] font-semibold bg-[#eceef0] hover:bg-[#d8dadc] rounded-lg transition-colors"
                        >
                          Lembrar
                        </button>

                        <button
                          onClick={() => handleQuickMarkPaid(member)}
                          disabled={isLoading}
                          title="Confirmar pagamento rápido e gerar receita no fluxo de caixa"
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

                        <button
                          onClick={() => onRegisterPaymentForMember(member.name, selectedMonth, selectedYear)}
                          title="Registrar pagamento com anexo de comprovante"
                          className="p-1 text-[#71787c] hover:text-[#003746] rounded"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}

          {(activeTab === 'realizados' ? paidMembers : pendingMembers).length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#c0c8cb]">
              <p className="text-sm text-[#71787c]">
                {members.length === 0 
                  ? 'Nenhum membro cadastrado ainda. Clique em "Novo Membro" acima para adicionar.'
                  : `Nenhum membro ${activeTab === 'realizados' ? 'com pagamento confirmado' : 'pendente'} neste mês.`}
              </p>
            </div>
          )}
        </div>
      </div>

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
                Tem certeza que deseja remover <strong>{memberToDelete.name}</strong> da lista da liga?
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
              <h3 className="font-headline font-bold text-lg text-[#003746]">
                Cadastrar Novo Membro
              </h3>
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
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
