import { cn } from '../utils/cn';

interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
}

export function QuantityStepper({ value, onChange, label, min = 0, max = 99 }: QuantityStepperProps) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div className="inline-flex items-center rounded-full border border-brand-500" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        className={cn(
          'grid size-9 place-items-center rounded-full text-lg font-semibold transition',
          canDecrease ? 'text-brand-600 hover:bg-brand-50' : 'cursor-not-allowed text-neutral-300',
        )}
      >
        −
        <span className="sr-only">Decrease {label}</span>
      </button>

      <span aria-live="polite" className="w-7 text-center text-sm font-bold text-neutral-900 tabular-nums">
        {value}
        <span className="sr-only"> {label} quantity</span>
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        className={cn(
          'grid size-9 place-items-center rounded-full text-lg font-semibold transition',
          canIncrease ? 'text-brand-600 hover:bg-brand-50' : 'cursor-not-allowed text-neutral-300',
        )}
      >
        +
        <span className="sr-only">Increase {label}</span>
      </button>
    </div>
  );
}
