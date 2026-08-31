import React from 'react';
import type { TabType } from '../types';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'register', label: 'Mensalidades', icon: 'calendar_today' },
    { id: 'flow', label: 'Fluxo', icon: 'account_balance_wallet' },
    { id: 'status', label: 'Status', icon: 'fact_check' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f7f9fb]/90 backdrop-blur-xl pb-safe border-t border-[#e0e3e5]/70 shadow-[0_-1px_10px_rgba(0,0,0,0.04)]">
      <div className="max-w-2xl mx-auto h-16 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all min-w-[70px] py-1.5 rounded-lg active:scale-95 ${
                isActive
                  ? 'text-[#003746] font-semibold scale-105'
                  : 'text-[#71787c] hover:text-[#191c1e]'
              }`}
            >
              <span 
                className={`material-symbols-outlined text-[24px] transition-transform ${
                  isActive ? 'scale-110 font-bold' : ''
                }`}
              >
                {item.icon}
              </span>
              <span className="text-[12px] leading-none tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
