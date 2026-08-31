import React, { useState } from 'react';
import type { Transaction, TransactionType } from '../types';
import { addTransaction, deleteTransaction } from '../firebase';
import { 
  PlusCircle, 
  MinusCircle, 
  Check, 
  Trash2, 
  FileText, 
  Image as ImageIcon,
  ArrowRight,
  Link as LinkIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FlowViewProps {
  transactions: Transaction[];
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
  onOpenAllTransactions: () => void;
}

const CATEGORIES_ENTRADA = [
  'Mensalidade',
  'Venda de Camisetas',
  'Patrocínio',
  'Inscrição de Evento',
  'Doação',
  'Outras Entradas',
];

const CATEGORIES_SAIDA = [
  'Material de Escritório',
  'Impressão de Banners',
  'Coffee Break / Alimentação',
  'Certificados e Premiações',
  'Infraestrutura e TI',
  'Outras Saídas',
];

export const FlowView: React.FC<FlowViewProps> = ({
  transactions,
  onViewReceipt,
  onOpenAllTransactions,
}) => {
  const [transType, setTransType] = useState<TransactionType>('income'); // 'income' (entrada) or 'expense' (saida)
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Mensalidade');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Financial calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const currentBalance = totalIncome - totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(val) || val <= 0) {
      alert('Preencha uma descrição e um valor válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isIncome = transType === 'income';
      const newTrans: Omit<Transaction, 'id'> = {
        type: transType,
        category: category,
        description: description.trim(),
        amount: val,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        status: isIncome ? 'paid' : 'realized',
        receiptUrl: receiptUrl || undefined,
        receiptName: receiptUrl ? 'comprovante_anexo.png' : undefined,
      };

      await addTransaction(newTrans);

      // Trigger Confetti
      try {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.6 },
        });
      } catch {}

      // Reset form
      setDescription('');
      setAmount('');
      setReceiptUrl('');
      setShowUrlInput(false);
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Erro ao registrar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja excluir esta movimentação?')) {
      await deleteTransaction(id);
    }
  };

  const formatDatePT = (dateStr: string) => {
    try {
      if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        const monthNames = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        return `${d} ${monthNames[parseInt(m) - 1]}, ${y}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-6">
      {/* Header Summary Card (matching Screenshot 3) */}
      <div className="bg-[#e6e8ea] rounded-2xl p-5 shadow-sm mt-1 flex flex-col gap-2 relative overflow-hidden border border-[#c0c8cb]/40">
        {/* Soft background accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#003746]/5 rounded-full -translate-y-10 translate-x-10 blur-xl pointer-events-none"></div>

        <span className="text-xs font-bold text-[#41484b] uppercase tracking-wider">
          Saldo Atual
        </span>

        <h2 className="text-2xl sm:text-3xl font-headline font-bold text-[#191c1e] flex items-baseline gap-1">
          <span className="text-sm sm:text-base font-semibold text-[#71787c]">R$</span>
          <span>{currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </h2>

        <div className="flex items-center gap-4 mt-2">
          {/* Income indicator */}
          <div className="flex items-center gap-1.5 text-[#003746]">
            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            <span className="text-xs sm:text-sm font-bold">
              R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="w-[1px] h-4 bg-[#c0c8cb]"></div>

          {/* Expense indicator */}
          <div className="flex items-center gap-1.5 text-[#ba1a1a]">
            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
            <span className="text-xs sm:text-sm font-bold">
              R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Nova Movimentação Form Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-5 relative z-10 border border-[#c0c8cb]/40">
        <h3 className="font-headline font-semibold text-lg text-[#191c1e]">
          Nova Movimentação
        </h3>

        {/* Toggle Pill: Entrada / Saída */}
        <div className="flex bg-[#eceef0] rounded-xl p-1 relative w-full h-12">
          <div
            className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-all duration-300 ease-out z-0 ${
              transType === 'expense' ? 'left-[calc(50%+2px)]' : 'left-1'
            }`}
          ></div>

          <button
            type="button"
            onClick={() => {
              setTransType('income');
              setCategory('Mensalidade');
            }}
            className={`flex-1 relative z-10 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
              transType === 'income' ? 'text-[#003746]' : 'text-[#71787c]'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Entrada
          </button>

          <button
            type="button"
            onClick={() => {
              setTransType('expense');
              setCategory('Material de Escritório');
            }}
            className={`flex-1 relative z-10 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
              transType === 'expense' ? 'text-[#ba1a1a]' : 'text-[#71787c]'
            }`}
          >
            <MinusCircle className="w-4 h-4" />
            Saída
          </button>
        </div>

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Descrição */}
          <div className="relative">
            <label className="text-xs font-semibold text-[#41484b] uppercase tracking-wider mb-1 block">
              Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade João"
              className="w-full bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg px-4 py-3 text-sm text-[#191c1e] focus:outline-none focus:border-[#003746] focus:bg-white transition-colors"
            />
          </div>

          {/* Valor */}
          <div className="relative">
            <label className="text-xs font-semibold text-[#41484b] uppercase tracking-wider mb-1 block">
              Valor
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-medium text-[#71787c]">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-full bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg pl-11 pr-4 py-3 text-sm text-[#191c1e] focus:outline-none focus:border-[#003746] focus:bg-white transition-colors font-medium"
              />
            </div>
          </div>

          {/* Categoria */}
          <div className="relative">
            <label className="text-xs font-semibold text-[#41484b] uppercase tracking-wider mb-1 block">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg px-4 py-3 text-sm text-[#191c1e] focus:outline-none focus:border-[#003746] focus:bg-white transition-colors"
            >
              {(transType === 'income' ? CATEGORIES_ENTRADA : CATEGORIES_SAIDA).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Optional Direct URL / Receipt attachment */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-xs font-semibold text-[#003746] hover:underline flex items-center gap-1 self-start"
            >
              <LinkIcon className="w-3 h-3" />
              {showUrlInput ? 'Remover Link do Comprovante' : '+ Adicionar Link do Comprovante (Opcional)'}
            </button>

            {showUrlInput && (
              <input
                type="url"
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
                placeholder="https://exemplo.com/nota_fiscal.png"
                className="w-full mt-1 bg-[#f7f9fb] border border-[#c0c8cb] rounded-lg px-3 py-2 text-xs text-[#191c1e] focus:outline-[#003746]"
              />
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#003746] hover:bg-[#1d4e5e] text-white font-semibold text-sm rounded-xl py-3.5 mt-2 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <span>Salvando no Firestore...</span>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Registrar
              </>
            )}
          </button>
        </form>
      </div>

      {/* Recent Transactions List */}
      <div className="flex flex-col gap-3 mt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-headline font-semibold text-lg text-[#191c1e]">
            Recentes
          </h3>
          <button
            onClick={onOpenAllTransactions}
            className="text-[#003746] font-semibold text-xs flex items-center gap-1 hover:underline cursor-pointer"
          >
            Ver todas
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {transactions.slice(0, 6).map((item) => {
            const isIncome = item.type === 'income';
            return (
              <div
                key={item.id || item.timestamp}
                className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-[#c0c8cb]/30 hover:bg-[#f7f9fb] transition-colors cursor-pointer group"
                onClick={() => {
                  if (item.receiptUrl) {
                    onViewReceipt(
                      item.receiptUrl,
                      item.description,
                      `${formatDatePT(item.date)} • ${isIncome ? 'Entrada' : 'Saída'}`,
                      item.amount
                    );
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-[#bbeafd]/40 text-[#003746]'
                        : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isIncome ? (item.category.includes('Camiseta') ? 'sell' : 'payments') : 'shopping_cart'}
                    </span>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-[#191c1e] truncate">
                        {item.description}
                      </span>
                      {item.receiptUrl && (
                        <span title="Comprovante anexado" className="text-[#003746]">
                          <FileText className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#71787c]">
                      {formatDatePT(item.date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`font-bold text-sm block ${
                        isIncome ? 'text-[#003746]' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {isIncome ? '+ ' : '- '}R${' '}
                      {Number(item.amount).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[11px] font-medium text-[#71787c]">
                      {item.status === 'paid' ? 'Pago' : 'Realizado'}
                    </span>
                  </div>

                  {item.id && (
                    <button
                      onClick={(e) => handleDelete(item.id!, e)}
                      title="Excluir movimentação"
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg text-[#71787c] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/50 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
