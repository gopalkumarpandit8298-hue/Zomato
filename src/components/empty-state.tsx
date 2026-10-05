import { SearchIcon } from './icons';

interface EmptyStateProps {
  query: string;
  /** Extra explanation, e.g. "we do not deliver to Maharashtra yet". */
  hint?: string;
  onReset: () => void;
}

export function EmptyState({ query, hint, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <SearchIcon className="size-7" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">No restaurants found</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {query ? (
            <>
              We could not match <span className="font-medium text-neutral-700">“{query}”</span>. Try a different
              search or remove a filter.
            </>
          ) : (
            'Try removing a filter to see more results.'
          )}
        </p>
        {hint && <p className="mt-2 text-sm font-medium text-brand-600">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Show all restaurants
      </button>
    </div>
  );
}
