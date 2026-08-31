import React from 'react';
import { Trash2, RefreshCw, X, AlertTriangle } from 'lucide-react';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAll: () => Promise<void>;
  onRestoreDefaults: () => Promise<void>;
  isProcessing: boolean;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  onClearAll,
  onRestoreDefaults,
  isProcessing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-[#c0c8cb] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eceef0] bg-[#f7f9fb]">
          <div className="flex items-center gap-2 text-[#003746]">
            <AlertTriangle className="w-5 h-5 text-[#ba1a1a]" />
            <h2 className="font-headline font-bold text-lg">Gerenciar Banco de Dados</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-white border border-[#c0c8cb] text-[#41484b] hover:text-[#003746] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          <p className="text-xs text-[#41484b] leading-relaxed">
            Escolha uma das opções abaixo para gerenciar os dados armazenados na nuvem (Firebase Firestore) da LAOQ:
          </p>

          {/* Option 1: Clean/Wipe Everything */}
          <div className="p-4 rounded-xl border border-[#ffdad6] bg-[#ffdad6]/20 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#ba1a1a] font-bold text-sm">
              <Trash2 className="w-4 h-4" />
              <span>Zerar Totalmente (Em Branco)</span>
            </div>
            <p className="text-[11px] text-[#71787c]">
              Apaga <strong>todas</strong> as transações, comprovantes e membros. O banco de dados ficará 100% limpo para você começar a cadastrar os dados reais da gestão.
            </p>
            <button
              onClick={async () => {
                if (confirm('Tem certeza que deseja APAGAR TUDO do banco de dados? Esta ação não pode ser desfeita.')) {
                  await onClearAll();
                  onClose();
                }
              }}
              disabled={isProcessing}
              className="mt-2 w-full py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isProcessing ? 'Apagando...' : 'Zerar Banco de Dados'}
            </button>
          </div>

          {/* Option 2: Restore Defaults/Samples */}
          <div className="p-4 rounded-xl border border-[#c0c8cb] bg-[#f7f9fb] flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[#003746] font-bold text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>Restaurar Dados de Exemplo</span>
            </div>
            <p className="text-[11px] text-[#71787c]">
              Limpa e reinsere a lista de demonstração com os membros padrão da LAOQ (Ana Maria, Carlos, Juliana, etc.) e as movimentações modelo.
            </p>
            <button
              onClick={async () => {
                if (confirm('Deseja restaurar os dados de exemplo padrão da LAOQ?')) {
                  await onRestoreDefaults();
                  onClose();
                }
              }}
              disabled={isProcessing}
              className="mt-2 w-full py-2 bg-[#003746] hover:bg-[#1d4e5e] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {isProcessing ? 'Restaurando...' : 'Restaurar Dados de Exemplo'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#eceef0] text-right">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-[#eceef0] hover:bg-[#e0e3e5] text-[#191c1e] text-xs font-semibold rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
