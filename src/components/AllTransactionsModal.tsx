import React, { useState } from 'react';
import type { Transaction } from '../types';
import { X, Search, FileText, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { deleteTransaction } from '../firebase';

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onViewReceipt: (url: string, title: string, subtitle?: string, amount?: number) => void;
}

export const AllTransactionsModal: React.FC<AllTransactionsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onViewReceipt,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = transactions.filter((t) => {
    const matchType = filterType === 'all' || t.type === filterType;
    const matchSearch =
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      (t.memberName && t.memberName.toLowerCase().includes(search.toLowerCase()));
    return matchType && matchSearch;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta transação?')) {
      await deleteTransaction(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl border border-[#c0c8cb] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eceef0] bg-[#f7f9fb]">
          <h2 className="font-headline font-bold text-lg text-[#003746]">
            Todas as Movimentações ({transactions.length})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#c0c8cb] text-[#41484b] hover:text-[#003746] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-4 bg-white border-b border-[#eceef0] flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#71787c] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição, membro ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#f7f9fb] border border-[#c0c8cb] rounded-xl text-xs focus:outline-[#003746]"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'all'
                  ? 'bg-[#003746] text-white'
                  : 'bg-[#eceef0] text-[#41484b]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'income'
                  ? 'bg-[#003746] text-white'
                  : 'bg-[#eceef0] text-[#41484b]'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                filterType === 'expense'
                  ? 'bg-[#ba1a1a] text-white'
                  : 'bg-[#eceef0] text-[#41484b]'
              }`}
            >
              Saídas
            </button>
          </div>
        </div>

        {/* List of items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {filtered.map((item) => {
            const isIncome = item.type === 'income';
            return (
              <div
                key={item.id || item.timestamp}
                className="p-3.5 bg-[#f7f9fb] rounded-xl border border-[#e0e3e5] flex items-center justify-between gap-3 hover:bg-[#eceef0] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-[#bbeafd]/40 text-[#003746]' : 'bg-[#ffdad6] text-[#ba1a1a]'
                    }`}
                  >
                    {isIncome ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[#191c1e] truncate">
                      {item.description}
                    </span>
                    <span className="text-[11px] text-[#71787c]">
                      {item.date} • {item.category}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold block ${
                        isIncome ? 'text-[#003746]' : 'text-[#ba1a1a]'
                      }`}
                    >
                      {isIncome ? '+' : '-'} R${' '}
                      {Number(item.amount).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-[10px] text-[#71787c]">{item.status}</span>
                  </div>

                  {item.receiptUrl && (
                    <button
                      onClick={() =>
                        onViewReceipt(
                          item.receiptUrl!,
                          item.description,
                          item.date,
                          item.amount
                        )
                      }
                      title="Ver Comprovante"
                      className="p-1.5 bg-[#bbeafd]/40 text-[#003746] rounded-lg hover:bg-[#bbeafd]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {item.id && (
                    <button
                      onClick={() => handleDelete(item.id!)}
                      title="Excluir"
                      className="p-1.5 text-[#71787c] hover:text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-xs text-[#71787c] py-8">
              Nenhuma movimentação encontrada com estes filtros.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#eceef0] text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#003746] text-white text-xs font-semibold rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
