'use client';

import { RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  actions?: ReactNode;
}

export function Header({ title, subtitle, onRefresh, actions }: HeaderProps) {
  return (
    <header className="mb-6 md:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1B2838]">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 md:p-2.5 bg-white rounded-lg md:rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#1B2838] transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
          {actions}
        </div>
      </div>
    </header>
  );
}
