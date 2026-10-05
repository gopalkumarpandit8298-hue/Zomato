import type { ReactNode } from 'react';

import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'brand' | 'success' | 'warning';
}

const TONES = {
  default: 'bg-white text-neutral-900',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
} as const;

export function StatCard({ label, value, hint, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className={cn('rounded-2xl border border-neutral-200 p-4', TONES[tone])}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
