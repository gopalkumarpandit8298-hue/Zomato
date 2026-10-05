import { forwardRef, useId } from 'react';

import { SearchIcon } from './icons';
import { cn } from '../utils/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  onClear?: () => void;
}

/**
 * Forwarded + `useId` so the visible input is always correctly associated with
 * a real <label> (and with the header's landmark region) for screen readers.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange, resultCount, onClear },
  ref,
) {
  const inputId = useId();

  return (
    <div className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        Search for a restaurant, cuisine or locality
      </label>

      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-neutral-500" />

      <input
        id={inputId}
        ref={ref}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search for a restaurant, cuisine or locality"
        autoComplete="off"
        className={cn(
          'h-12 w-full rounded-xl border border-neutral-300 bg-white pr-28 pl-12 text-[15px] text-neutral-900',
          'placeholder:text-neutral-400',
          'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none',
          // Remove the WebKit "x" so our own clear button is the single control.
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />

      {value.length > 0 && onClear && (
        <button
          type="button"
          onClick={() => {
            onClear();
            onChange('');
          }}
          className="absolute top-1/2 right-24 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
        >
          Clear
        </button>
      )}

      <span aria-live="polite" className="sr-only">
        {resultCount} restaurants match your search
      </span>
    </div>
  );
});
