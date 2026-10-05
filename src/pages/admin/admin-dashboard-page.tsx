import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AdminEmpty, AdminError, AdminPage, AdminPanel, AdminTable } from '../../components/admin/admin-ui';
import { StatCard } from '../../components/admin/stat-card';
import { SpinnerIcon, StarIcon, UtensilsIcon } from '../../components/icons';
import { formatInr } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { AdminStats } from '../../lib/admin-repository';

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    import('../../lib/admin-repository')
      .then(({ fetchAdminStats }) => fetchAdminStats())
      .then((result) => {
        setStats(result);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });
  }, []);

  useEffect(load, [load]);

  if (status === 'loading') {
    return (
      <div className="grid place-items-center py-32">
        <SpinnerIcon className="size-8 text-neutral-400" />
        <span className="sr-only">Loading dashboard</span>
      </div>
    );
  }

  if (status === 'error' || !stats) {
    return (
      <div className="py-8">
        <AdminError message={`Could not load the dashboard: ${error}`} />
      </div>
    );
  }

  return (
    <AdminPage
      title="Dashboard"
      description="Live numbers computed from Firestore."
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatInr(stats.revenue)}
          hint={`Average ${formatInr(stats.averageOrderValue)} per order`}
          tone="brand"
        />
        <StatCard label="Orders" value={String(stats.totalOrders)} hint={`${stats.ordersToday} today`} />
        <StatCard label="Restaurants" value={String(stats.totalRestaurants)} hint="In the catalogue" />
        <StatCard
          label="Pending"
          value={String(stats.pendingOrders)}
          hint="Not yet delivered"
          tone={stats.pendingOrders > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Top restaurants by revenue">
          {stats.topRestaurants.length === 0 ? (
            <AdminEmpty message="No orders yet. Revenue appears after the first checkout." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {stats.topRestaurants.map((restaurant) => (
                <li key={restaurant.name} className="flex items-center gap-3 px-5 py-3">
                  <UtensilsIcon className="size-5 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-neutral-900">{restaurant.name}</p>
                    <p className="text-xs text-neutral-500">{restaurant.orders} orders</p>
                  </div>
                  <p className="font-bold text-neutral-900 tabular-nums">{formatInr(restaurant.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>

        <AdminPanel title="Recent orders">
          {stats.recentOrders.length === 0 ? (
            <AdminEmpty message="No orders yet." />
          ) : (
            <AdminTable head={['Order', 'Restaurant', 'Total', 'Status']}>
              {stats.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3 font-mono text-xs whitespace-nowrap">{order.orderNumber}</td>
                  <td className="px-5 py-3">
                    <span className="block font-medium text-neutral-900">{order.restaurantName}</span>
                    <span className="text-xs text-neutral-400">{dateTimeFormatter.format(order.createdAt)}</span>
                  </td>
                  <td className="px-5 py-3 font-semibold whitespace-nowrap tabular-nums">
                    {formatInr(order.totals?.total ?? 0)}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={order.status} />
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </AdminPanel>
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-bold text-neutral-900">Quick actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link
            to="/admin/restaurants"
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Manage restaurants
          </Link>
          <Link
            to="/admin/orders"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Review orders
          </Link>
          <Link
            to="/admin/customers"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Customers ({stats.customers})
          </Link>
        </div>
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-neutral-400">
        <StarIcon className="size-3.5" />
        Stats are recomputed on every load from a bounded read; a production app would use a scheduled job.
      </p>
    </AdminPage>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'delivered'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'out-for-delivery'
        ? 'bg-blue-100 text-blue-800'
        : status === 'preparing'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-neutral-200 text-neutral-700';

  return (
    <span className={cn('inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap', tone)}>
      {status.replace(/-/g, ' ')}
    </span>
  );
}
