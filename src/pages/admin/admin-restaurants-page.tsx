import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminEmpty, AdminError, AdminPage, AdminPanel, AdminTable } from '../../components/admin/admin-ui';
import { RestaurantForm, type RestaurantDraft } from '../../components/admin/restaurant-form';
import { SpinnerIcon } from '../../components/icons';
import { cn } from '../../utils/cn';
import { formatInr } from '../../utils/format';
import type { Restaurant } from '../../types/food';

type Status = 'loading' | 'ready' | 'error';

export default function AdminRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [menuCounts, setMenuCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Restaurant | null>(null);

  /**
   * Two independent loads: the table appears as soon as the documents arrive,
   * and the per-restaurant menu counts fill in behind it. Waiting for both
   * would blank the table for the length of N subcollection reads.
   */
  const load = useCallback(() => {
    setStatus('loading');
    import('../../lib/admin-repository')
      .then(({ fetchAllRestaurants }) => fetchAllRestaurants())
      .then((list) => {
        setRestaurants(list);
        setStatus('ready');

        import('../../lib/admin-repository')
          .then(({ fetchMenuCounts }) => fetchMenuCounts())
          .then(setMenuCounts)
          .catch(() => setMenuCounts({}));
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return restaurants;
    return restaurants.filter((restaurant) =>
      [restaurant.name, restaurant.city, restaurant.state, restaurant.area, ...restaurant.cuisines]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [restaurants, query]);

  const handleSubmit = async (draft: RestaurantDraft) => {
    setSaving(true);
    setError(null);
    try {
      const { createRestaurant, updateRestaurant } = await import('../../lib/admin-repository');
      if (editing) {
        await updateRestaurant(editing.id, draft);
        setNotice(`${draft.name} updated.`);
      } else {
        const id = await createRestaurant(draft);
        setNotice(`${draft.name} created with id "${id}".`);
      }
      setEditing(null);
      setCreating(false);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      const { deleteRestaurant } = await import('../../lib/admin-repository');
      await deleteRestaurant(confirmDelete.id);
      setNotice(`${confirmDelete.name} deleted.`);
      setConfirmDelete(null);
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage
      title="Restaurants"
      description={`${restaurants.length} in the catalogue`}
      actions={
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add restaurant
        </button>
      }
    >
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800">
          {notice}
        </p>
      )}
      {error && (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      )}

      <AdminPanel
        title="Catalogue"
        actions={
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, city or cuisine"
            aria-label="Filter restaurants"
            className="h-9 rounded-full border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        }
      >
        {status === 'loading' ? (
          <div className="grid place-items-center py-16">
            <SpinnerIcon className="size-7 text-neutral-400" />
            <span className="sr-only">Loading restaurants</span>
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmpty message={query ? 'No restaurant matches that filter.' : 'No restaurants yet.'} />
        ) : (
          <AdminTable head={['Restaurant', 'Location', 'Rating', 'Cost for two', 'Menu', 'Actions']}>
            {filtered.map((restaurant) => (
              <tr key={restaurant.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3">
                  <span className="block font-semibold text-neutral-900">{restaurant.name}</span>
                  <span className="text-xs text-neutral-500">{restaurant.cuisines.join(', ')}</span>
                </td>
                <td className="px-5 py-3 text-neutral-600">
                  {restaurant.city}
                  {restaurant.state ? <span className="block text-xs text-neutral-400">{restaurant.state}</span> : null}
                </td>
                <td className="px-5 py-3 font-semibold tabular-nums">{restaurant.rating.toFixed(1)}</td>
                <td className="px-5 py-3 whitespace-nowrap tabular-nums">{formatInr(restaurant.costForTwo)}</td>
                <td className="px-5 py-3 text-neutral-600 tabular-nums">{menuCounts[restaurant.id] ?? 0}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreating(false);
                        setEditing(restaurant);
                      }}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                    >
                      Edit
                      <span className="sr-only"> {restaurant.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(restaurant)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Delete
                      <span className="sr-only"> {restaurant.name}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>

      {(creating || editing) && (
        <RestaurantForm
          restaurant={editing}
          busy={saving}
          onSubmit={handleSubmit}
          onClose={() => {
            if (!saving) {
              setCreating(false);
              setEditing(null);
            }
          }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/50 p-4">
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="confirm-delete" className="text-lg font-bold text-neutral-900">
              Delete {confirmDelete.name}?
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              This removes the restaurant and its menu from Firestore. It cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={saving}
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={saving}
                className={cn(
                  'rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700',
                  saving && 'opacity-60',
                )}
              >
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
