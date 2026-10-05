import { useId } from 'react';

import { useFilters } from '../context/filters-context';
import { ALL_STATES, STATES } from '../data/states';
import { LocationIcon } from './icons';

/**
 * "Deliver to" picker. A native <select> is used on purpose: it is keyboard
 * accessible, works with screen readers and pickers on mobile, and needs no
 * popover, focus-trap or outside-click handling.
 */
export function LocationPicker() {
  const { filters, update, cities } = useFilters();
  const selectId = useId();

  const subtitle =
    cities.length > 0
      ? cities.slice(0, 2).join(', ') + (cities.length > 2 ? ` +${cities.length - 2}` : '')
      : 'Not available yet';

  return (
    <div className="hidden items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-neutral-100 md:flex">
      <LocationIcon className="size-5 shrink-0 text-brand-600" />

      <label htmlFor={selectId} className="text-xs leading-tight whitespace-nowrap text-neutral-500">
        Deliver to
      </label>

      <div className="flex flex-col">
        <select
          id={selectId}
          value={filters.state}
          onChange={(event) => update('state', event.target.value)}
          className="-ml-1 max-w-44 cursor-pointer truncate rounded border-0 bg-transparent p-0 text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          <option value={ALL_STATES.code}>{ALL_STATES.name}</option>
          {STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none -mt-0.5 max-w-44 truncate text-[11px] leading-tight text-neutral-400">
          {subtitle}
        </span>
      </div>
    </div>
  );
}

/** Compact version for the mobile header row. */
export function LocationPickerMobile() {
  const { filters, update } = useFilters();
  const selectId = useId();

  return (
    <div className="flex items-center gap-1.5 md:hidden">
      <label htmlFor={selectId} className="sr-only">
        Delivery state
      </label>
      <LocationIcon className="size-4 shrink-0 text-brand-600" />
      <select
        id={selectId}
        value={filters.state}
        onChange={(event) => update('state', event.target.value)}
        className="max-w-40 cursor-pointer truncate rounded border-0 bg-transparent p-0 text-sm font-bold text-neutral-900 focus:ring-2 focus:ring-brand-500 focus:outline-none"
      >
        <option value={ALL_STATES.code}>{ALL_STATES.name}</option>
        {STATES.map((state) => (
          <option key={state.code} value={state.code}>
            {state.name}
          </option>
        ))}
      </select>
    </div>
  );
}
