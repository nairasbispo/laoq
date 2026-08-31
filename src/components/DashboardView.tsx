import React, { useState } from 'react';
import type { Transaction, Budget, Member, TabType } from '../types';
import { 
  TrendingUp, 
  ArrowDown, 
  ArrowUp, 
  Plus, 
  GraduationCap, 
  Printer, 
  ShoppingCart, 
  Tag, 
  FileText, 
  ExternalLink,
  Edit2
} from 'lucide-react';
import { updateBudget } from '../firebase';

interface DashboardViewProps {
  transactions: Transaction[];
  members: Member[];
  budget: Budget;
  onNavigate: (tab: TabType) => void;
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
  onOpenNewTransaction: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  members,
  budget,
  onNavigate,
  onViewReceipt,
  onOpenNewTransaction,
}) => {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetTotal, setNewBudgetTotal] = useState(budget.total.toString());
  const [newBudgetName, setNewBudgetName] = useState(budget.name);

  // Calculate live financial statistics
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const currentBalance = totalIncome - totalExpense;

  // Budget calculations
  const budgetSpent = budget.spent || totalExpense;
  const budgetRemaining = Math.max(0, budget.total - budgetSpent);
  const budgetPercent = budget.total > 0 ? Math.min(100, Math.round((budgetSpent / budget.total) * 100)) : 0;

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newBudgetTotal);
    if (!isNaN(val) && val > 0) {
      await updateBudget({
        name: newBudgetName.trim() || 'Event Budget',
        total: val,
      });
      setIsEditingBudget(false);
    }
  };

  const getCategoryIcon = (category: string, description: string) => {
    const text = `${category} ${description}`.toLowerCase();
    if (text.includes('mensalidade') || text.includes('membro')) {
      return <span className="material-symbols-outlined text-[20px] text-[#003746]">school</span>;
    }
    if (text.includes('banner') || text.includes('impress') || text.includes('papel')) {
      return <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">print</span>;
    }
    if (text.includes('material') || text.includes('compra') || text.includes('escritorio')) {
      return <span className="material-symbols-outlined text-[20px] text-[#ba1a1a]">shopping_cart</span>;
    }
    if (text.includes('camisa') || text.includes('venda') || text.includes('produto')) {
      return <span className="material-symbols-outlined text-[20px] text-[#003746]">sell</span>;
    }
    return <span className="material-symbols-outlined text-[20px] text-[#003746]">payments</span>;
  };

  const formatDate = (dateStr: string) => {
    try {
      if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-6">
      {/* Top Title & Subtitle */}
      <div className="flex flex-col">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71787c]">
          Visão Financeira
        </h2>
        <h1 className="text-lg font-headline font-semibold text-[#191c1e] tracking-tight">
          Liga Acadêmica de Otimização e Qualidade
        </h1>
      </div>

      {/* Main SALDO ATUAL Card */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#e6eef0] to-[#f2f4f6] p-6 shadow-sm border border-[#c0c8cb]/40 overflow-hidden">
        {/* Subtle orange accent top strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#8e4e00]/70"></div>
        {/* Decorative soft bubble */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-[#9fcde1]/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-[#41484b] uppercase">
              SALDO ATUAL
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl sm:text-3xl font-headline font-bold text-[#003746]">
                R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-[#71787c]">
              <span>{transactions.length} {transactions.length === 1 ? 'movimentação registrada' : 'movimentações registradas'}</span>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onOpenNewTransaction}
            title="Registrar Nova Movimentação"
            className="w-11 h-11 rounded-xl bg-[#003746] hover:bg-[#1d4e5e] text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Two Column Grid: TOTAL ARRECADADO & TOTAL DE SAÍDAS */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Arrecadado */}
        <div className="rounded-2xl bg-[#eceef0]/80 p-4 border border-[#c0c8cb]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#003746] text-xs font-semibold tracking-tight uppercase">
            <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
            <span className="text-[11px] leading-tight">TOTAL ARRECADADO</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-headline font-bold text-[#003746]">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total de Saídas */}
        <div className="rounded-2xl bg-[#eceef0]/80 p-4 border border-[#c0c8cb]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#ba1a1a] text-xs font-semibold tracking-tight uppercase">
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            <span className="text-[11px] leading-tight">TOTAL DE SAÍDAS</span>
          </div>
          <div className="mt-2 text-lg sm:text-xl font-headline font-bold text-[#ba1a1a]">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Budget Allocation Card */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-semibold text-[#191c1e] text-base">
            Alocação de Orçamento
          </h3>
          <button 
            onClick={() => setIsEditingBudget(!isEditingBudget)}
            className="text-xs text-[#003746] font-medium hover:underline flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" />
            {isEditingBudget ? 'Cancelar' : 'Ajustar Orçamento'}
          </button>
        </div>

        {isEditingBudget ? (
          <form onSubmit={handleSaveBudget} className="bg-white rounded-2xl p-4 border border-[#c0c8cb] shadow-sm flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-[#41484b]">Nome do Orçamento</label>
              <input
                type="text"
                value={newBudgetName}
                onChange={(e) => setNewBudgetName(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
                placeholder="Ex: Orçamento de Eventos"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#41484b]">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                value={newBudgetTotal}
                onChange={(e) => setNewBudgetTotal(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm border border-[#c0c8cb] rounded-lg focus:outline-[#003746]"
                placeholder="2000.00"
              />
            </div>
            <button
              type="submit"
              className="mt-1 w-full py-2.5 bg-[#003746] text-white font-medium rounded-lg text-sm"
            >
              Salvar Orçamento
            </button>
          </form>
        ) : (
          <div className="rounded-2xl bg-[#eceef0]/90 p-5 border border-[#c0c8cb]/30 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#41484b]">{budget.name || 'Orçamento da Liga'}</span>
              <span className="text-xs font-bold text-[#003746] bg-[#9fcde1]/30 px-2.5 py-0.5 rounded-full">
                {budgetPercent}% Utilizado
              </span>
            </div>

            <div className="text-xl font-headline font-bold text-[#003746]">
              R$ {budget.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-2.5 bg-[#d8dadc] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#003746] rounded-full transition-all duration-500"
                style={{ width: `${budgetPercent}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#41484b]">
              <span>R$ {budgetSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gastos</span>
              <span>R$ {budgetRemaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} restantes</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline font-semibold text-[#191c1e] text-base">
            Atividades Recentes
          </h3>
          <button
            onClick={() => onNavigate('flow')}
            className="text-xs font-semibold text-[#003746] hover:underline"
          >
            Ver Todas
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {transactions.slice(0, 5).map((item) => {
            const isIncome = item.type === 'income';
            return (
              <div
                key={item.id || item.timestamp}
                onClick={() => {
                  if (item.receiptUrl) {
                    onViewReceipt(
                      item.receiptUrl,
                      item.description,
                      `${formatDate(item.date)} • ${isIncome ? 'Entrada' : 'Saída'}`,
                      item.amount
                    );
                  }
                }}
                className={`group rounded-xl bg-white p-3.5 flex items-center justify-between border border-[#e0e3e5] shadow-sm transition-all hover:border-[#9fcde1] ${
                  item.receiptUrl ? 'cursor-pointer hover:bg-[#f7f9fb]' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-[#bbeafd]/40 text-[#003746]'
                        : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}
                  >
                    {getCategoryIcon(item.category, item.description)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[#191c1e] truncate">
                        {item.description}
                      </span>
                      {item.receiptUrl && (
                        <span 
                          title="Possui comprovante anexado" 
                          className="w-4 h-4 rounded-full bg-[#1d4e5e]/10 text-[#003746] flex items-center justify-center shrink-0"
                        >
                          <FileText className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#71787c]">
                      {formatDate(item.date)} • {isIncome ? 'Entrada' : 'Saída'}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-sm font-bold ${
                      isIncome ? 'text-[#003746]' : 'text-[#ba1a1a]'
                    }`}
                  >
                    {isIncome ? '+ ' : '- '}R${' '}
                    {Number(item.amount).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {transactions.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#c0c8cb]">
              <p className="text-sm text-[#71787c]">Nenhuma movimentação registrada.</p>
              <button
                onClick={onOpenNewTransaction}
                className="mt-3 px-4 py-2 bg-[#003746] text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-[#1d4e5e]"
              >
                Adicionar primeira movimentação
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
