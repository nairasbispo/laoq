import React from 'react';
import type { TabType } from '../types';

interface HeaderProps {
  currentTab: TabType;
  isSyncing?: boolean;
}

const TAB_TITLES: Record<TabType, string> = {
  dashboard: 'Dashboard',
  register: 'Register',
  flow: 'Flow',
  status: 'Status',
};

export const Header: React.FC<HeaderProps> = ({ currentTab, isSyncing }) => {
  return (
    <header className="fixed top-0 w-full z-40 bg-[#f7f9fb]/90 backdrop-blur-xl pt-safe border-b border-[#e0e3e5]/60 shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      <div className="max-w-2xl mx-auto h-16 flex items-center justify-between px-4">
        {/* Left: Brand Badge & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#003746] rounded-md flex items-center justify-center shadow-sm">
            <span className="text-white font-headline font-bold text-lg leading-none">L</span>
          </div>
          <div className="flex flex-col">
            <span className="font-headline font-semibold text-[#003746] text-xl tracking-tight leading-none">
              {TAB_TITLES[currentTab]}
            </span>
            <span className="text-[10px] text-[#71787c] font-medium tracking-wide">
              LAOQ • Gestão Financeira
            </span>
          </div>
        </div>

        {/* Right: Realtime Firebase indicator & Logo */}
        <div className="flex items-center gap-2.5">
          {/* Live Cloud Sync Indicator */}
          <div 
            title="Sincronização em tempo real via Firebase Firestore"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1d4e5e]/10 text-[#003746] rounded-full text-xs font-medium border border-[#003746]/10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold">Firebase Sync</span>
          </div>

          {/* LAOQ Logo Avatar */}
          <div className="w-9 h-9 rounded-full bg-white border border-[#c0c8cb] p-0.5 shadow-sm overflow-hidden flex items-center justify-center">
            <img
              alt="LAOQ Logo"
              className="w-full h-full rounded-full object-cover"
              src="https://lh3.googleusercontent.com/aida/AEtjO1Wu8I-3aQHtDMKxFkBzjqtnUZ1hKkTNZTRgas1jo0LcPG6yfhOeJbweGC2gtj5GwpbSYGppgI_XeHRik5hJUUEocgPYcvTw4rU1VoIBIwlpkAOeyYixOfC1RblZkbTLVDaCpwi_oA6_MOHw7ivhST3btEdDOCG953-dRJgnOxj9fPyuhX6MQMWCztvwTaiV6v75ahLjNBhb5xo42WMRhOi9KMj39PHoF9dtuewMqq2KgTaVPpm-lkR5o88R5Slkd2keYceiL19Bdw"
              onError={(e) => {
                // Fallback elegant LAOQ avatar if remote image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
