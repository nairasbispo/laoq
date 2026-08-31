import React from 'react';
import { X, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  amount?: number;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Comprovante',
  subtitle,
  amount,
}) => {
  if (!isOpen || !imageUrl) return null;

  const isPdf = imageUrl.endsWith('.pdf') || imageUrl.includes('application/pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#c0c8cb]/40 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#eceef0] bg-[#f7f9fb]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1d4e5e]/10 text-[#003746] flex items-center justify-center">
              {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-headline font-semibold text-[#191c1e] text-base leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[#71787c]">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#c0c8cb]/60 text-[#41484b] hover:text-[#003746] hover:bg-[#eceef0] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content / Preview */}
        <div className="flex-1 overflow-auto p-4 bg-[#f2f4f6] flex items-center justify-center min-h-[300px]">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl shadow-sm border border-[#e0e3e5] gap-4 w-full">
              <FileText className="w-16 h-16 text-[#003746]" />
              <div>
                <p className="font-semibold text-sm text-[#191c1e]">Documento em formato PDF</p>
                <p className="text-xs text-[#71787c] mt-1">Comprovante de pagamento registrado</p>
              </div>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#003746] text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-[#1d4e5e] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir PDF em nova aba
              </a>
            </div>
          ) : (
            <div className="relative group max-h-[500px] w-full flex items-center justify-center overflow-hidden rounded-xl bg-white border border-[#e0e3e5] shadow-sm">
              <img
                src={imageUrl}
                alt={title}
                className="max-h-[480px] w-auto object-contain rounded-lg transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#eceef0] flex items-center justify-between">
          <div>
            {amount !== undefined && (
              <span className="text-sm font-semibold text-[#003746]">
                Valor: R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 text-xs font-semibold text-[#003746] bg-[#bbeafd]/40 hover:bg-[#bbeafd]/70 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Link Direto
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#003746] hover:bg-[#1d4e5e] rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
