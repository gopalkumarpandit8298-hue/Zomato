import { useCallback, useEffect, useMemo, useState } from 'react';

import { AdminEmpty, AdminError, AdminPage, AdminPanel, AdminTable } from '../../components/admin/admin-ui';
import { SpinnerIcon } from '../../components/icons';
import { formatInr } from '../../utils/format';
import type { Order, OrderStatus } from '../../types/food';

const STATUS_OPTIONS: OrderStatus[] = ['placed', 'preparing', 'out-for-delivery', 'delivered'];

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    import('../../lib/admin-repository')
      .then(({ fetchAllOrders }) => fetchAllOrders())
      .then((list) => {
        setOrders(list);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter !== 'all' && order.status !== filter) return false;
      if (!needle) return true;
      return [order.orderNumber, order.restaurantName, order.userName, order.userEmail]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [orders, filter, query]);

  const changeStatus = async (orderId: string, next: OrderStatus) => {
    setUpdatingId(orderId);
    setError(null);
    try {
      const { updateOrderStatus } = await import('../../lib/admin-repository');
      await updateOrderStatus(orderId, next);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: next } : order)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUpdatingId(null);
    }
  };

  const revenue = orders.reduce((sum, order) => sum + (order.totals?.total ?? 0), 0);

  return (
    <AdminPage
      title="Orders"
      description={`${orders.length} orders · ${formatInr(revenue)} lifetime revenue`}
      actions={
        <button
          type="button"
          onClick={load}
          className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Refresh
        </button>
      }
    >
      {error && (
        <div className="mb-4">
          <AdminError message={error} />
        </div>
      )}

      <AdminPanel
        title="All orders"
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order number, restaurant or customer"
              aria-label="Filter orders"
              className="h-9 rounded-full border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
            <select
              value={filter}
              aria-label="Filter by status"
              onChange={(event) => setFilter(event.target.value as OrderStatus | 'all')}
              className="h-9 rounded-full border border-neutral-300 bg-white px-3 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/-/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {status === 'loading' ? (
          <div className="grid place-items-center py-16">
            <SpinnerIcon className="size-7 text-neutral-400" />
            <span className="sr-only">Loading orders</span>
          </div>
        ) : filtered.length === 0 ? (
          <AdminEmpty
            message={
              orders.length === 0
                ? 'No orders yet. Place one from the customer site to see it here.'
                : 'No order matches these filters.'
            }
          />
        ) : (
          <AdminTable head={['Order', 'Customer', 'Restaurant', 'Placed', 'Total', 'Status']}>
            {filtered.map((order) => (
              <tr key={order.id} className="align-top hover:bg-neutral-50">
                <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">{order.orderNumber}</td>
                <td className="px-5 py-3">
                  <span className="block font-medium text-neutral-900">{order.userName}</span>
                  <span className="text-xs text-neutral-400">{order.userEmail}</span>
                </td>
                <td className="px-5 py-3">
                  <span className="block text-neutral-800">{order.restaurantName}</span>
                  <span className="text-xs text-neutral-400">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </span>
                </td>
                <td className="px-5 py-3 text-xs whitespace-nowrap text-neutral-500">
                  {dateTimeFormatter.format(order.createdAt)}
                </td>
                <td className="px-5 py-3 font-semibold whitespace-nowrap tabular-nums">
                  {formatInr(order.totals?.total ?? 0)}
                </td>
                <td className="px-5 py-3">
                  <label className="sr-only" htmlFor={`status-${order.id}`}>
                    Status for {order.orderNumber}
                  </label>
                  <select
                    id={`status-${order.id}`}
                    value={order.status}
                    disabled={updatingId === order.id}
                    onChange={(event) => void changeStatus(order.id, event.target.value as OrderStatus)}
                    className="h-8 rounded-full border border-neutral-300 bg-white px-2.5 text-xs font-semibold capitalize outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/-/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminPanel>
    </AdminPage>
  );
}
