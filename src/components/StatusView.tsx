import React, { useState } from 'react';
import type { Member, Transaction } from '../types';
import { updateMember, addMember } from '../firebase';
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
  FileText
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'realizados' | 'pendentes'>('realizados');
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // Default to Maio (5) as in screenshot
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // New Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Membro Efetivo');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberFee, setNewMemberFee] = useState('50.00');

  // WhatsApp Reminder State
  const [reminderMember, setReminderMember] = useState<Member | null>(null);

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

  const handleQuickMarkPaid = async (member: Member) => {
    if (!member.id) return;
    const formattedDate = `${String(new Date().getDate()).padStart(2, '0')}/${String(selectedMonth).padStart(2, '0')}`;
    const updatedPayments = {
      ...(member.payments || {}),
      [periodKey]: {
        paid: true,
        date: formattedDate,
        amount: member.monthlyFee || 50,
      },
    };

    await updateMember(member.id, {
      payments: updatedPayments,
    });

    try {
      confetti({
        particleCount: 40,
        spread: 40,
        origin: { y: 0.8 },
      });
    } catch {}
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
            placeholder="Buscar por membro..."
            className="w-full h-12 pl-11 pr-4 bg-[#eceef0] rounded-xl text-sm text-[#191c1e] placeholder:text-[#71787c] focus:outline-none focus:ring-1 focus:ring-[#003746] transition-all"
          />
        </div>

        {/* Period Selector & Add Member Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-1.5 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none"
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
              className="px-3 py-1.5 bg-white border border-[#c0c8cb] rounded-lg text-xs font-semibold text-[#003746] focus:outline-none"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-[#003746] text-white rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-[#1d4e5e] shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Membro
          </button>
        </div>

        {/* Realizados vs Pendentes Tabs (exact visual match from Screenshot 4) */}
        <div className="flex gap-1 p-1 bg-[#e6e8ea] rounded-xl">
          <button
            onClick={() => setActiveTab('realizados')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'realizados'
                ? 'bg-[#003746] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            Realizados ({paidMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'pendentes'
                ? 'bg-[#003746] text-white shadow-sm'
                : 'text-[#41484b] hover:bg-[#d8dadc]/50'
            }`}
          >
            Pendentes ({pendingMembers.length})
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#71787c] px-1">
          Status referente a {periodLabel}
        </h3>

        <div className="flex flex-col gap-2.5">
          {(activeTab === 'realizados' ? paidMembers : pendingMembers).map(
            (member) => {
              const isPaid = member.isPaid;
              return (
                <div
                  key={member.id || member.name}
                  className="bg-white rounded-xl p-3.5 flex items-center justify-between border border-[#e0e3e5] shadow-sm hover:border-[#c0c8cb] transition-colors"
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
                      <span className="text-sm font-semibold text-[#191c1e] truncate">
                        {member.name}
                      </span>
                      <span className="text-xs text-[#71787c]">
                        {member.role || 'Membro Efetivo'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isPaid ? (
                      <>
                        <div className="flex items-center gap-1.5">
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
                              className="text-[#003746] hover:opacity-80 p-0.5"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full bg-[#003746]/10 text-[#003746] text-[10px] font-bold uppercase tracking-wider">
                            PAGO
                          </span>
                        </div>
                        <span className="text-xs text-[#71787c] font-medium">
                          {member.paidDate || 'Confirmado'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">
                            schedule
                          </span>
                          Pendente
                        </span>

                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setReminderMember(member)}
                            className="text-xs text-[#003746] font-semibold underline hover:text-[#1d4e5e]"
                          >
                            Lembrar
                          </button>

                          <button
                            onClick={() => handleQuickMarkPaid(member)}
                            title="Marcar como pago agora"
                            className="px-2 py-0.5 bg-[#003746] text-white text-[10px] font-bold rounded-md hover:bg-[#1d4e5e]"
                          >
                            Pagar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            }
          )}

          {(activeTab === 'realizados' ? paidMembers : pendingMembers).length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#c0c8cb]">
              <p className="text-sm text-[#71787c]">
                Nenhum membro {activeTab === 'realizados' ? 'com pagamento confirmado' : 'pendente'} neste mês.
              </p>
            </div>
          )}
        </div>
      </div>

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
