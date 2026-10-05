import { useEffect, useId, useState } from 'react';

import type { Restaurant } from '../../types/food';

export interface RestaurantDraft {
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  deliveryMinutes: number;
  costForTwo: number;
  area: string;
  city: string;
  state: string;
  pureVeg: boolean;
  discount: string | null;
  featured: boolean;
  imagePath: string;
  fallbackImageUrl: string;
}

const EMPTY: RestaurantDraft = {
  name: '',
  cuisines: [],
  rating: 4.0,
  ratingCount: 0,
  deliveryMinutes: 30,
  costForTwo: 300,
  area: '',
  city: '',
  state: '',
  pureVeg: false,
  discount: null,
  featured: false,
  imagePath: '',
  fallbackImageUrl: '',
};

interface RestaurantFormProps {
  /** Present when editing; absent when creating. */
  restaurant?: Restaurant | null;
  busy?: boolean;
  onSubmit: (draft: RestaurantDraft) => void;
  onClose: () => void;
}

function validate(draft: RestaurantDraft): string | null {
  if (draft.name.trim().length < 2) return 'Restaurant name is required.';
  if (draft.cuisines.length === 0) return 'Add at least one cuisine (comma separated).';
  if (draft.rating < 0 || draft.rating > 5) return 'Rating must be between 0 and 5.';
  if (draft.deliveryMinutes < 5) return 'Delivery time must be at least 5 minutes.';
  if (draft.costForTwo < 1) return 'Cost for two must be greater than zero.';
  if (draft.city.trim().length < 2) return 'City is required.';
  if (draft.state.trim().length < 2) return 'State is required.';
  return null;
}

export function RestaurantForm({ restaurant, busy = false, onSubmit, onClose }: RestaurantFormProps) {
  const [draft, setDraft] = useState<RestaurantDraft>(EMPTY);
  const [cuisineText, setCuisineText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!restaurant) {
      setDraft(EMPTY);
      setCuisineText('');
    } else {
      const { id: _id, ...rest } = restaurant;
      void _id;
      setDraft(rest);
      setCuisineText(rest.cuisines.join(', '));
    }
    setError(null);
  }, [restaurant]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, busy]);

  const set = <K extends keyof RestaurantDraft>(key: K, value: RestaurantDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cuisines = cuisineText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const next = { ...draft, cuisines };
    const problem = validate(next);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onSubmit(next);
  };

  const numberField = (
    key: 'rating' | 'ratingCount' | 'deliveryMinutes' | 'costForTwo',
    label: string,
    step = 1,
    min = 0,
  ) => (
    <div>
      <label htmlFor={`rf-${key}`} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={`rf-${key}`}
        type="number"
        step={step}
        min={min}
        max={key === 'rating' ? 5 : undefined}
        value={draft[key]}
        onChange={(event) => set(key, Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
      />
    </div>
  );

  const textField = (key: 'area' | 'city' | 'state' | 'discount', label: string, placeholder: string) => (
    <div>
      <label htmlFor={`rf-${key}`} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      <input
        id={`rf-${key}`}
        type="text"
        placeholder={placeholder}
        value={draft[key] ?? ''}
        onChange={(event) => set(key, key === 'discount' ? (event.target.value || null) : event.target.value)}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-bold text-neutral-900">
            {restaurant ? `Edit ${restaurant.name}` : 'Add restaurant'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-3 py-1 text-sm font-semibold text-neutral-500 hover:bg-neutral-100"
          >
            Close
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label htmlFor="rf-name" className="block text-sm font-medium text-neutral-700">
              Restaurant name
            </label>
            <input
              id="rf-name"
              type="text"
              value={draft.name}
              autoFocus
              onChange={(event) => set('name', event.target.value)}
              placeholder="Tandoori Nights"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          <div>
            <label htmlFor="rf-cuisines" className="block text-sm font-medium text-neutral-700">
              Cuisines <span className="font-normal text-neutral-400">(comma separated)</span>
            </label>
            <input
              id="rf-cuisines"
              type="text"
              value={cuisineText}
              onChange={(event) => setCuisineText(event.target.value)}
              placeholder="North Indian, BBQ"
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {numberField('rating', 'Rating (0–5)', 0.1, 0)}
            {numberField('ratingCount', 'Number of ratings')}
            {numberField('deliveryMinutes', 'Delivery time (min)')}
            {numberField('costForTwo', 'Cost for two (₹)')}
            {textField('city', 'City', 'Hyderabad')}
            {textField('state', 'State', 'Telangana')}
            {textField('area', 'Area / locality', 'Banjara Hills')}
            {textField('discount', 'Discount label (optional)', '40% off')}
          </div>

          <fieldset className="flex flex-wrap gap-5">
            <legend className="sr-only">Flags</legend>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={draft.pureVeg}
                onChange={(event) => set('pureVeg', event.target.checked)}
                className="size-4 accent-emerald-600"
              />
              Pure veg
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(event) => set('featured', event.target.checked)}
                className="size-4 accent-brand-600"
              />
              Featured
            </label>
          </fieldset>

          <details className="rounded-lg border border-neutral-200 px-3 py-2">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-700">Image paths</summary>
            <div className="mt-3 grid gap-4">
              <div>
                <label htmlFor="rf-imagePath" className="block text-sm font-medium text-neutral-700">
                  Cloud Storage path
                </label>
                <input
                  id="rf-imagePath"
                  type="text"
                  value={draft.imagePath}
                  onChange={(event) => set('imagePath', event.target.value)}
                  placeholder="restaurants/new-restaurant.jpg"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
                />
              </div>
              <div>
                <label htmlFor="rf-fallback" className="block text-sm font-medium text-neutral-700">
                  Fallback URL
                </label>
                <input
                  id="rf-fallback"
                  type="text"
                  value={draft.fallbackImageUrl}
                  onChange={(event) => set('fallbackImageUrl', event.target.value)}
                  placeholder="/img/restaurants/new-restaurant.jpg"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
                />
              </div>
            </div>
          </details>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <footer className="flex justify-end gap-3 border-t border-neutral-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:bg-neutral-300"
            >
              {busy ? 'Saving…' : restaurant ? 'Save changes' : 'Create restaurant'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
