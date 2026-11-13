import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'emerald' | 'amber' | 'rose' | 'slate' | 'orange';
  };
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  isLoading = false,
}) => {
  const getBadgeClass = (variant: 'emerald' | 'amber' | 'rose' | 'slate' | 'orange') => {
    switch (variant) {
      case 'emerald':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'amber':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'rose':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'orange':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="rounded-2xl bg-[#090e1a] border border-slate-800 p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase font-mono">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        {isLoading ? (
          <div className="h-8 w-20 bg-slate-800/80 rounded animate-pulse" />
        ) : (
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {value}
          </div>
        )}

        {badge && !isLoading && (
          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${getBadgeClass(badge.variant)}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 mt-1.5 leading-snug">
          {subtext}
        </p>
      )}
    </div>
  );
};

