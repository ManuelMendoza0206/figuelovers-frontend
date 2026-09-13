import React from 'react';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  icon: ReactNode;
  label: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  label,
  title,
  subtitle,
  badge,
}) => {
  return (
    <div className="mb-5 flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-muted text-brand">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand">
          {label}
        </p>
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {badge}
    </div>
  );
};