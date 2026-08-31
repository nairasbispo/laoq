import React, { useState, useRef } from 'react';
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
  Sparkles
} from 'lucide-react';

interface RegisterPaymentViewProps {
  members: Member[];
  recentTransactions: Transaction[];
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export const RegisterPaymentView: React.FC<RegisterPaymentViewProps> = ({
  members,
  recentTransactions,
  onViewReceipt,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [memberName, setMemberName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [amount, setAmount] = useState('50.00');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [useDirectUrl, setUseDirectUrl] = useState(false);
  const [directUrlInput, setDirectUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter existing members for autocompletion
  const matchingMembers = members.filter((m) =>
    m.name.toLowerCase().includes(memberName.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFileName(file.name);

    // Convert to base64 DataURL for direct cross-device preview in Firestore
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReceiptUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyDirectUrl = () => {
    if (directUrlInput.trim()) {
      setReceiptUrl(directUrlInput.trim());
      setReceiptFileName('link_direto_imagem.png');
      setUseDirectUrl(false);
    }
  };

  const handleSelectMember = (member: Member) => {
    setMemberName(member.name);
    setAmount(member.monthlyFee?.toString() || '50.00');
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) {
      alert('Por favor, informe o nome do membro.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedAmount = parseFloat(amount) || 50.0;
      const monthObj = MONTHS.find((m) => m.value === Number(selectedMonth));
      const monthName = monthObj ? monthObj.label : `Mês ${selectedMonth}`;
      const periodKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      const formattedDate = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

      // 1. Create Transaction in Firestore
      const newTransaction: Omit<Transaction, 'id'> = {
        type: 'income',
        category: 'Mensalidade',
        description: `Mensalidade - ${memberName} (${monthName}/${selectedYear})`,
        amount: parsedAmount,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        status: 'paid',
        memberName: memberName.trim(),
        month: Number(selectedMonth),
        year: Number(selectedYear),
        receiptUrl: receiptUrl || undefined,
        receiptName: receiptFileName || undefined,
        notes: `Mensalidade referente a ${monthName} de ${selectedYear}`,
      };

      const transId = await addTransaction(newTransaction);

      // 2. Link with member or create member if not exists
      const existingMember = members.find(
        (m) => m.name.toLowerCase() === memberName.trim().toLowerCase()
      );

      if (existingMember && existingMember.id) {
        const updatedPayments = {
          ...(existingMember.payments || {}),
          [periodKey]: {
            paid: true,
            date: formattedDate,
            amount: parsedAmount,
            receiptUrl: receiptUrl || undefined,
            transactionId: transId,
          },
        };
        await updateMember(existingMember.id, {
          payments: updatedPayments,
        });
      } else {
        // Create new member profile
        const initials = memberName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        await addMember({
          name: memberName.trim(),
          role: 'Membro Efetivo',
          initials: initials || 'ME',
          active: true,
          monthlyFee: parsedAmount,
          payments: {
            [periodKey]: {
              paid: true,
              date: formattedDate,
              amount: parsedAmount,
              receiptUrl: receiptUrl || undefined,
              transactionId: transId,
            },
          },
        });
      }

      // Celebratory Confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#003746', '#fea045', '#9fcde1', '#8e4e00'],
        });
      } catch {}

      setSuccessMessage(`Mensalidade de ${memberName} registrada com sucesso!`);
      // Reset form
      setMemberName('');
      setReceiptUrl('');
      setReceiptFileName('');
      setDirectUrlInput('');

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error registering payment:', err);
      alert('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-6">
      {/* Header text from Screenshot 1 */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-headline font-bold text-[#003746] tracking-tight">
          Registrar Mensalidade
        </h1>
        <p className="text-sm text-[#41484b] leading-relaxed">
          Insira os dados do membro e anexe o comprovante de pagamento.
        </p>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#bbeafd]/30 border border-[#003746]/20 text-[#003746] flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-8 h-8 rounded-full bg-[#003746] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-sm font-medium">
            {successMessage}
          </div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="text-[#003746] hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-white p-5 rounded-2xl border border-[#e0e3e5] shadow-sm">
        {/* Member Name with Autocomplete */}
        <div className="flex flex-col gap-1.5 relative">
          <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
            Nome do Membro
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#71787c] text-[20px] pointer-events-none">
              person
            </span>
            <input
              type="text"
              required
              value={memberName}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setMemberName(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="Ex: Maria Silva"
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#003746] transition-all placeholder:text-[#71787c]/60"
            />
          </div>

          {/* Autocomplete suggestions */}
          {isDropdownOpen && memberName && matchingMembers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#c0c8cb] rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto py-1">
              {matchingMembers.map((m) => (
                <button
                  key={m.id || m.name}
                  type="button"
                  onClick={() => handleSelectMember(m)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#f2f4f6] flex items-center justify-between transition-colors border-b border-[#eceef0] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#1d4e5e]/10 text-[#003746] text-xs font-bold flex items-center justify-center">
                      {m.initials}
                    </span>
                    <span className="font-medium text-[#191c1e]">{m.name}</span>
                  </div>
                  <span className="text-xs text-[#71787c]">{m.role}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Month and Year Selects */}
        <div className="grid grid-cols-2 gap-4">
          {/* Mês Referência */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Mês Referência
            </label>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full h-12 px-3.5 pr-8 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71787c] pointer-events-none text-[20px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Ano */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Ano
            </label>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full h-12 px-3.5 pr-8 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71787c] pointer-events-none text-[20px]">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Valor da Mensalidade
            </label>
            <span className="text-xs text-[#71787c]">Padrão: R$ 50,00</span>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#71787c]">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-lg bg-[#f7f9fb] text-[#191c1e] text-sm font-medium border border-[#c0c8cb] focus:border-[#003746] focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* File Upload Box (matching design screenshot with Direct Link capability) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#191c1e] uppercase tracking-wider">
              Comprovante do PIX
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

          {/* Direct URL input if chosen */}
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
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#003746] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">
                    upload_file
                  </span>
                </div>
                <div>
                  <p className={`text-sm font-medium ${receiptFileName ? 'text-[#003746] font-semibold' : 'text-[#191c1e]'}`}>
                    {receiptFileName || 'Toque para anexar o comprovante'}
                  </p>
                  <p className="text-xs text-[#71787c] mt-0.5">
                    JPG, PNG ou PDF (Máx 5MB)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Preview Thumbnail if uploaded */}
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
          disabled={isSubmitting}
          className="mt-2 w-full h-14 rounded-xl bg-[#003746] text-white text-base font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-[#1d4e5e] active:scale-[0.98] transition-all disabled:opacity-70 cursor-pointer"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Sincronizando...
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
              Registrar Pagamento
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
