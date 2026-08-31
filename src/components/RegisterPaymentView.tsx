import React, { useState, useRef, useEffect } from 'react';
import type { Member, Transaction } from '../types';
import { addTransaction, updateMember, addMember } from '../firebase';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Upload, 
  Link as LinkIcon, 
  FileText, 
  Image as ImageIcon, 
  X, 
  UserCheck, 
  Clock,
  Sparkles,
  Calendar,
  Layers,
  Check,
  ChevronDown,
  UserPlus,
  AlertCircle
} from 'lucide-react';

interface RegisterPaymentViewProps {
  members: Member[];
  recentTransactions: Transaction[];
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
  prefillMemberName?: string;
  prefillMonth?: number;
  prefillYear?: number;
}

const MONTHS = [
  { value: 1, label: 'Janeiro', short: 'Jan' },
  { value: 2, label: 'Fevereiro', short: 'Fev' },
  { value: 3, label: 'Março', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Maio', short: 'Mai' },
  { value: 6, label: 'Junho', short: 'Jun' },
  { value: 7, label: 'Julho', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Setembro', short: 'Set' },
  { value: 10, label: 'Outubro', short: 'Out' },
  { value: 11, label: 'Novembro', short: 'Nov' },
  { value: 12, label: 'Dezembro', short: 'Dez' },
];

export const RegisterPaymentView: React.FC<RegisterPaymentViewProps> = ({
  members,
  recentTransactions,
  onViewReceipt,
  prefillMemberName = '',
  prefillMonth,
  prefillYear,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Payment Mode: 'single' (1 month) or 'batch' (multiple months in batch)
  const [paymentMode, setPaymentMode] = useState<'single' | 'batch'>('single');

  // Selected Member
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberName, setMemberName] = useState(prefillMemberName || '');
  const [memberRole, setMemberRole] = useState('Membro Efetivo');
  const [isNewMember, setIsNewMember] = useState(false);

  // Year Selection
  const [selectedYear, setSelectedYear] = useState<number>(prefillYear || currentYear);

  // Single Month Selection
  const [selectedMonth, setSelectedMonth] = useState<number>(prefillMonth || currentMonth);

  // Batch Months Selection (Array of month numbers: [1, 2, 3...])
  const [batchMonths, setBatchMonths] = useState<number[]>([currentMonth]);

  // Fee and Amount
  const [unitAmount, setUnitAmount] = useState<string>('50.00');

  // Receipt details
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [directUrlInput, setDirectUrlInput] = useState('');
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // When members list or prefill changes, auto-select if matching
  useEffect(() => {
    if (prefillMemberName) {
      const match = members.find(
        (m) => m.name.toLowerCase() === prefillMemberName.toLowerCase()
      );
      if (match) {
        setSelectedMemberId(match.id || '');
        setMemberName(match.name);
        setMemberRole(match.role || 'Membro Efetivo');
        setUnitAmount((match.monthlyFee || 50).toFixed(2));
      } else {
        setMemberName(prefillMemberName);
      }
    }
  }, [prefillMemberName, members]);

  // Active member object if selected
  const activeMember = members.find((m) => m.id === selectedMemberId || m.name.toLowerCase() === memberName.trim().toLowerCase());

  const handleSelectMember = (member: Member) => {
    setSelectedMemberId(member.id || '');
    setMemberName(member.name);
    setMemberRole(member.role || 'Membro Efetivo');
    setUnitAmount((member.monthlyFee || 50).toFixed(2));
    setIsNewMember(false);
    setIsDropdownOpen(false);
  };

  const handleSwitchToNewMember = () => {
    setSelectedMemberId('');
    setMemberName('');
    setMemberRole('Membro Efetivo');
    setUnitAmount('50.00');
    setIsNewMember(true);
    setIsDropdownOpen(false);
  };

  // Filter matching members for autocomplete
  const matchingMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberName.toLowerCase()) ||
    m.role.toLowerCase().includes(memberName.toLowerCase())
  );

  // Month toggle for batch mode
  const handleToggleBatchMonth = (monthVal: number) => {
    if (batchMonths.includes(monthVal)) {
      setBatchMonths(batchMonths.filter((m) => m !== monthVal));
    } else {
      setBatchMonths([...batchMonths, monthVal].sort((a, b) => a - b));
    }
  };

  // Batch Presets
  const handleSelectSemester1 = () => {
    setBatchMonths([1, 2, 3, 4, 5, 6]);
  };
  const handleSelectSemester2 = () => {
    setBatchMonths([7, 8, 9, 10, 11, 12]);
  };
  const handleSelectFullYear = () => {
    setBatchMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  };
  const handleSelectAllPending = () => {
    if (!activeMember) {
      setBatchMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      return;
    }
    const pendings: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`;
      if (!activeMember.payments?.[key]?.paid) {
        pendings.push(m);
      }
    }
    setBatchMonths(pendings.length > 0 ? pendings : [currentMonth]);
  };
  const handleClearBatch = () => {
    setBatchMonths([]);
  };

  // Total calculation
  const singleMonthlyFee = parseFloat(unitAmount) || 50;
  const totalAmount = paymentMode === 'single' 
    ? singleMonthlyFee 
    : singleMonthlyFee * (batchMonths.length || 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.8);
            setReceiptUrl(compressed);
          } else {
            setReceiptUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReceiptUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyDirectUrl = () => {
    if (directUrlInput.trim()) {
      setReceiptUrl(directUrlInput.trim());
      setReceiptFileName('link_direto_imagem.png');
      setUseDirectUrl(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      alert('Por favor, selecione ou informe o nome do membro.');
      return;
    }

    if (paymentMode === 'batch' && batchMonths.length === 0) {
      alert('Por favor, selecione ao menos um mês para o pagamento em lote.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedDate = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;
      const monthsToProcess = paymentMode === 'single' ? [selectedMonth] : batchMonths;

      // 1. Resolve or create member
      let targetMember = activeMember;
      let targetMemberId = targetMember?.id;

      if (!targetMember) {
        // Find existing by name
        targetMember = members.find(
          (m) => m.name.toLowerCase() === memberName.trim().toLowerCase()
        );
        targetMemberId = targetMember?.id;
      }

      if (!targetMemberId) {
        // Create new member permanently in database
        const initials = memberName
          .trim()
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        targetMemberId = await addMember({
          name: memberName.trim(),
          role: memberRole.trim() || 'Membro Efetivo',
          initials: initials || 'ME',
          active: true,
          monthlyFee: singleMonthlyFee,
          payments: {},
        });
      }

      // 2. Create Transaction and update member payments for all selected months
      const updatedPayments = { ...(targetMember?.payments || {}) };
      const monthNamesList = monthsToProcess.map((m) => MONTHS.find((mo) => mo.value === m)?.short || `M${m}`).join(', ');

      if (paymentMode === 'single') {
        const m = selectedMonth;
        const monthObj = MONTHS.find((mo) => mo.value === m);
        const monthName = monthObj ? monthObj.label : `Mês ${m}`;
        const periodKey = `${selectedYear}-${String(m).padStart(2, '0')}`;

        const transId = await addTransaction({
          type: 'income',
          category: 'Mensalidade',
          description: `Mensalidade - ${memberName.trim()} (${monthName}/${selectedYear})`,
          amount: singleMonthlyFee,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          status: 'paid',
          memberName: memberName.trim(),
          memberId: targetMemberId,
          month: m,
          year: selectedYear,
          receiptUrl: receiptUrl || undefined,
          receiptName: receiptFileName || undefined,
          notes: `Mensalidade referente a ${monthName} de ${selectedYear}`,
        });

        updatedPayments[periodKey] = {
          paid: true,
          date: formattedDate,
          amount: singleMonthlyFee,
          receiptUrl: receiptUrl || undefined,
          transactionId: transId,
        };
      } else {
        // Batch Payment: Register consolidated transaction in Cash Flow
        const batchTransId = await addTransaction({
          type: 'income',
          category: 'Mensalidade',
          description: `Mensalidade em Lote (${monthsToProcess.length} meses: ${monthNamesList}/${selectedYear}) - ${memberName.trim()}`,
          amount: totalAmount,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now(),
          status: 'paid',
          memberName: memberName.trim(),
          memberId: targetMemberId,
          year: selectedYear,
          receiptUrl: receiptUrl || undefined,
          receiptName: receiptFileName || undefined,
          notes: `Pagamento em lote dos meses [${monthNamesList}] de ${selectedYear}`,
        });

        // Set all selected months as paid in member's record
        monthsToProcess.forEach((m) => {
          const periodKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
          updatedPayments[periodKey] = {
            paid: true,
            date: formattedDate,
            amount: singleMonthlyFee,
            receiptUrl: receiptUrl || undefined,
            transactionId: batchTransId,
          };
        });
      }

      // Update Member in Firestore
      await updateMember(targetMemberId, {
        monthlyFee: singleMonthlyFee,
        payments: updatedPayments,
      });

      // Confetti celebration
      try {
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#003746', '#fea045', '#9fcde1', '#8e4e00'],
        });
      } catch {}

      const successTxt = paymentMode === 'single'
        ? `Mensalidade de ${memberName} (${MONTHS.find(m => m.value === selectedMonth)?.label}/${selectedYear}) registrada com sucesso!`
        : `Pagamento em lote de ${monthsToProcess.length} meses (${monthNamesList}/${selectedYear}) para ${memberName} registrado com sucesso (R$ ${totalAmount.toFixed(2)})!`;

      setSuccessMessage(successTxt);
      
      // Clean form
      setReceiptUrl('');
      setReceiptFileName('');
      setDirectUrlInput('');

      setTimeout(() => {
        setSuccessMessage('');
      }, 6000);
    } catch (err) {
      console.error('Error registering payment:', err);
      alert('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-headline font-bold text-[#003746] tracking-tight">
          Registrar Mensalidade
        </h1>
        <p className="text-sm text-[#41484b] leading-relaxed">
          Selecione o membro salvo na liga, escolha um mês ou pagamento em lote, e anexe o comprovante.
        </p>
      </div>

      {/* Mode Switcher: Mês Único vs Em Lote */}
      <div className="flex p-1 bg-[#eceef0] rounded-xl border border-[#c0c8cb]/40">
        <button
          type="button"
          onClick={() => setPaymentMode('single')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            paymentMode === 'single'
              ? 'bg-[#003746] text-white shadow-sm'
              : 'text-[#41484b] hover:bg-white/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Mês Individual</span>
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode('batch')}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
            paymentMode === 'batch'
              ? 'bg-[#003746] text-white shadow-sm'
              : 'text-[#41484b] hover:bg-white/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pagamento em Lote (Vários Meses)</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#bbeafd]/40 border border-[#003746]/20 text-[#003746] flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-[#003746] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm font-medium">
            {successMessage}
          </div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="text-[#003746] hover:opacity-70 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-sm">
        {/* Saved Members Dropdown / Selector */}
        <div className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#191c1e] uppercase tracking-wider flex items-center gap-1.5">
              <span>Membro da Liga</span>
              <span className="text-[11px] font-normal text-[#71787c]">
                ({members.length} {members.length === 1 ? 'salvo' : 'salvos permanentemente'})
              </span>
            </label>
            <button
              type="button"
              onClick={handleSwitchToNewMember}
              className="text-xs font-semibold text-[#003746] hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Novo Membro</span>
            </button>
          </div>

          {/* Member Picker Input */}
          <div className="relative">
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full min-h-[48px] px-3.5 py-2 rounded-xl bg-[#f7f9fb] border border-[#c0c8cb] hover:border-[#003746] cursor-pointer flex items-center justify-between gap-2 transition-all"
            >
              {activeMember ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#003746] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {activeMember.initials || 'ME'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-[#191c1e] truncate">
                      {activeMember.name}
                    </span>
                    <span className="text-[11px] text-[#71787c]">
                      {activeMember.role} • R$ {(activeMember.monthlyFee || 50).toFixed(2)}/mês
                    </span>
                  </div>
                </div>
              ) : isNewMember ? (
                <div className="flex items-center gap-2 text-sm text-[#003746] font-medium">
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrando Novo Membro</span>
                </div>
              ) : (
                <span className="text-sm text-[#71787c]">
                  Selecione um membro salvo na liga...
                </span>
              )}

              <ChevronDown className={`w-4 h-4 text-[#71787c] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c0c8cb] rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto py-1 animate-in fade-in">
                {/* Search inside dropdown */}
                <div className="p-2 border-b border-[#eceef0]">
                  <input
                    type="text"
                    placeholder="Filtrar membros..."
                    value={memberName}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setMemberName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
                  />
                </div>

                {/* Option to create new */}
                <button
                  type="button"
                  onClick={handleSwitchToNewMember}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-semibold text-[#003746] hover:bg-[#eceef0] flex items-center gap-2 border-b border-[#eceef0]"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Cadastrar Novo Membro</span>
                </button>

                {matchingMembers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#71787c]">
                    Nenhum membro encontrado com este nome.
                  </div>
                ) : (
                  matchingMembers.map((m) => (
                    <button
                      key={m.id || m.name}
                      type="button"
                      onClick={() => handleSelectMember(m)}
                      className={`w-full px-3.5 py-2 text-left hover:bg-[#f2f4f6] flex items-center justify-between transition-colors border-b border-[#eceef0] last:border-0 ${
                        selectedMemberId === m.id ? 'bg-[#bbeafd]/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-[#1d4e5e]/10 text-[#003746] text-xs font-bold flex items-center justify-center shrink-0">
                          {m.initials}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs text-[#191c1e] truncate">{m.name}</span>
                          <span className="text-[10px] text-[#71787c]">{m.role}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#003746] shrink-0">
                        R$ {(m.monthlyFee || 50).toFixed(2)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* If registering a brand new member, show input fields */}
          {isNewMember && (
            <div className="p-3 bg-[#f7f9fb] rounded-xl border border-[#c0c8cb] flex flex-col gap-2.5 mt-1 animate-in fade-in">
              <span className="text-xs font-bold text-[#003746]">Dados do Novo Membro (ficará salvo para sempre):</span>
              <div>
                <label className="text-[11px] font-semibold text-[#41484b]">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Silva"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full mt-0.5 px-3 py-2 text-xs bg-white border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#41484b]">Cargo / Diretoria</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full mt-0.5 px-3 py-2 text-xs bg-white border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
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
            </div>
          )}
        </div>

        {/* Member Status Mini-Strip (shows payment status for the selected year) */}
        {activeMember && (
          <div className="p-3 bg-[#eceef0]/60 rounded-xl border border-[#c0c8cb]/50 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#41484b]">
              <span className="font-semibold text-[#003746] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Histórico em {selectedYear}:
              </span>
              <span className="text-[11px]">
                {Object.keys(activeMember.payments || {}).filter(k => k.startsWith(`${selectedYear}-`) && activeMember.payments?.[k]?.paid).length} de 12 meses pagos
              </span>
            </div>
            
            {/* 12 months mini indicators */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
              {MONTHS.map((mo) => {
                const key = `${selectedYear}-${String(mo.value).padStart(2, '0')}`;
                const isPaid = !!activeMember.payments?.[key]?.paid;
                return (
                  <div
                    key={mo.value}
                    title={`${mo.label}/${selectedYear}: ${isPaid ? 'PAGO' : 'Pendente'}`}
                    className={`py-1 rounded text-center text-[10px] font-bold ${
                      isPaid
                        ? 'bg-[#003746] text-white'
                        : 'bg-white border border-[#c0c8cb] text-[#ba1a1a]'
                    }`}
                  >
                    {mo.short}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Year Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
            Ano de Referência
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full h-11 px-3.5 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none transition-all cursor-pointer font-medium"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>
        </div>

        {/* SINGLE MONTH MODE */}
        {paymentMode === 'single' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Mês de Pagamento
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none transition-all cursor-pointer font-medium"
            >
              {MONTHS.map((m) => {
                const key = `${selectedYear}-${String(m.value).padStart(2, '0')}`;
                const isPaid = activeMember?.payments?.[key]?.paid;
                return (
                  <option key={m.value} value={m.value}>
                    {m.label} {isPaid ? '✓ (Já está pago)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* BATCH MONTHS MODE */}
        {paymentMode === 'batch' && (
          <div className="flex flex-col gap-2.5 p-3.5 bg-[#f7f9fb] rounded-xl border border-[#003746]/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#003746] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>Selecione os Meses do Lote ({batchMonths.length} selecionados)</span>
              </label>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleSelectSemester1}
                className="px-2.5 py-1 bg-white border border-[#c0c8cb] hover:border-[#003746] text-[#003746] text-[11px] font-semibold rounded-lg transition-colors"
              >
                1º Semestre (Jan-Jun)
              </button>
              <button
                type="button"
                onClick={handleSelectSemester2}
                className="px-2.5 py-1 bg-white border border-[#c0c8cb] hover:border-[#003746] text-[#003746] text-[11px] font-semibold rounded-lg transition-colors"
              >
                2º Semestre (Jul-Dez)
              </button>
              <button
                type="button"
                onClick={handleSelectFullYear}
                className="px-2.5 py-1 bg-white border border-[#c0c8cb] hover:border-[#003746] text-[#003746] text-[11px] font-semibold rounded-lg transition-colors"
              >
                Ano Inteiro (12m)
              </button>
              {activeMember && (
                <button
                  type="button"
                  onClick={handleSelectAllPending}
                  className="px-2.5 py-1 bg-[#ba1a1a]/10 hover:bg-[#ba1a1a]/20 text-[#ba1a1a] text-[11px] font-semibold rounded-lg transition-colors"
                >
                  Todos os Pendentes
                </button>
              )}
              <button
                type="button"
                onClick={handleClearBatch}
                className="px-2 py-1 text-[#71787c] hover:text-[#191c1e] text-[11px] ml-auto font-medium"
              >
                Limpar
              </button>
            </div>

            {/* 12 Months Grid with Checkboxes */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
              {MONTHS.map((mo) => {
                const isSelected = batchMonths.includes(mo.value);
                const periodKey = `${selectedYear}-${String(mo.value).padStart(2, '0')}`;
                const alreadyPaid = !!activeMember?.payments?.[periodKey]?.paid;

                return (
                  <button
                    key={mo.value}
                    type="button"
                    onClick={() => handleToggleBatchMonth(mo.value)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                      isSelected
                        ? 'bg-[#003746] text-white border-[#003746] shadow-sm'
                        : alreadyPaid
                        ? 'bg-[#e6f4ea] border-emerald-300 text-emerald-800'
                        : 'bg-white border-[#c0c8cb] text-[#191c1e] hover:border-[#003746]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-xs">{mo.short}</span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected 
                          ? 'bg-white text-[#003746]' 
                          : alreadyPaid 
                          ? 'bg-emerald-600 text-white' 
                          : 'border border-[#c0c8cb]'
                      }`}>
                        {(isSelected || alreadyPaid) && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <span className={`text-[10px] mt-1 ${
                      isSelected 
                        ? 'text-white/80' 
                        : alreadyPaid 
                        ? 'text-emerald-700 font-medium' 
                        : 'text-[#71787c]'
                    }`}>
                      {alreadyPaid ? 'Já Pago' : `R$ ${singleMonthlyFee.toFixed(0)}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Amount Section with Summary Calculation */}
        <div className="flex flex-col gap-2 p-3.5 bg-[#eceef0]/50 rounded-xl border border-[#c0c8cb]/40">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#191c1e] uppercase tracking-wider">
              Valor Unitário da Mensalidade
            </label>
            <div className="flex items-center gap-1">
              <span className="text-xs text-[#71787c]">R$</span>
              <input
                type="number"
                step="0.01"
                required
                value={unitAmount}
                onChange={(e) => setUnitAmount(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-[#c0c8cb] rounded text-xs font-bold text-[#003746] text-right focus:outline-[#003746]"
              />
            </div>
          </div>

          {/* Calculated Total for Batch */}
          <div className="flex items-center justify-between pt-2 border-t border-[#c0c8cb]/40">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-[#41484b]">
                {paymentMode === 'single' ? 'Total do Pagamento:' : `Total (${batchMonths.length} meses):`}
              </span>
              {paymentMode === 'batch' && batchMonths.length > 0 && (
                <span className="text-[11px] text-[#71787c]">
                  {batchMonths.map(m => MONTHS.find(mo => mo.value === m)?.short).join(', ')}
                </span>
              )}
            </div>
            <span className="text-xl font-headline font-bold text-[#003746]">
              R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Receipt Upload Box */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Comprovante do PIX (Opcional)
            </label>
            <button
              type="button"
              onClick={() => setUseDirectUrl(!useDirectUrl)}
              className="text-xs font-semibold text-[#003746] hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              {useDirectUrl ? 'Anexar Arquivo' : 'Adicionar Link Direto'}
            </button>
          </div>

          {/* Direct URL input */}
          {useDirectUrl ? (
            <div className="flex flex-col gap-2 p-3 bg-[#f2f4f6] rounded-xl border border-[#c0c8cb]">
              <span className="text-xs text-[#41484b] font-medium">
                Cole a URL direta da imagem (JPG, PNG, WebP) ou PDF:
              </span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://exemplo.com/comprovante.png"
                  value={directUrlInput}
                  onChange={(e) => setDirectUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
                />
                <button
                  type="button"
                  onClick={handleApplyDirectUrl}
                  className="px-3 py-2 bg-[#003746] text-white text-xs font-semibold rounded-lg hover:bg-[#1d4e5e]"
                >
                  Aplicar
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full rounded-xl bg-[#f7f9fb] border-2 border-dashed border-[#c0c8cb] hover:border-[#003746] hover:bg-[#f2f4f6] transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center justify-center py-7 px-4 text-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-[#003746] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${receiptFileName ? 'text-[#003746] font-semibold' : 'text-[#191c1e]'}`}>
                    {receiptFileName || 'Toque para anexar o comprovante'}
                  </p>
                  <p className="text-xs text-[#71787c] mt-0.5">
                    JPG, PNG ou PDF
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Preview Thumbnail */}
          {receiptUrl && (
            <div className="p-3 bg-[#bbeafd]/20 rounded-xl border border-[#003746]/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-white border border-[#c0c8cb] overflow-hidden flex items-center justify-center shrink-0">
                  {receiptUrl.startsWith('data:image') || receiptUrl.startsWith('http') ? (
                    <img src={receiptUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <FileText className="w-5 h-5 text-[#003746]" />
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#003746] truncate">
                    {receiptFileName || 'Comprovante selecionado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewReceipt(receiptUrl, `Comprovante - ${memberName || 'Membro'}`)}
                    className="text-[11px] text-[#003746] underline text-left hover:text-[#1d4e5e]"
                  >
                    Visualizar comprovante
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReceiptUrl('');
                  setReceiptFileName('');
                }}
                className="w-7 h-7 rounded-full bg-white border border-[#c0c8cb] text-[#ba1a1a] hover:bg-[#ffdad6] flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || (paymentMode === 'batch' && batchMonths.length === 0)}
          className="mt-2 w-full h-14 rounded-xl bg-[#003746] text-white text-base font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-[#1d4e5e] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Registrando no Sistema...
            </span>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {paymentMode === 'single'
                  ? `Registrar Pagamento (R$ ${totalAmount.toFixed(2)})`
                  : `Confirmar Lote de ${batchMonths.length} Meses (R$ ${totalAmount.toFixed(2)})`}
              </span>
            </>
          )}
        </button>
      </form>

      {/* Quick Recent Receipts section */}
      <div className="flex flex-col gap-3">
        <h3 className="font-headline font-semibold text-[#191c1e] text-base">
          Comprovantes Recentes
        </h3>
        <div className="flex flex-col gap-2">
          {recentTransactions
            .filter((t) => t.category === 'Mensalidade')
            .slice(0, 4)
            .map((item) => (
              <div
                key={item.id || item.timestamp}
                className="p-3 bg-white rounded-xl border border-[#e0e3e5] flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#1d4e5e]/10 text-[#003746] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#191c1e] truncate">
                      {item.description}
                    </span>
                    <span className="text-xs text-[#71787c]">
                      {item.date} • R$ {Number(item.amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {item.receiptUrl ? (
                  <button
                    onClick={() =>
                      onViewReceipt(
                        item.receiptUrl!,
                        item.description,
                        `Data: ${item.date}`,
                        item.amount
                      )
                    }
                    className="px-2.5 py-1.5 bg-[#bbeafd]/40 hover:bg-[#bbeafd] text-[#003746] text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-3 h-3" />
                    Ver
                  </button>
                ) : (
                  <span className="text-[11px] text-[#71787c] bg-[#eceef0] px-2 py-1 rounded">
                    Sem anexo
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
