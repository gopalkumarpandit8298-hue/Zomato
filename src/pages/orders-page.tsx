import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { SpinnerIcon } from '../components/icons';
import { VegMarker } from '../components/menu-item-card';
import { useAuth } from '../context/auth-context';
import { formatInr } from '../utils/format';
import { cn } from '../utils/cn';
import type { Order } from '../types/food';

const STATUS_STEPS: Order['status'][] = ['placed', 'preparing', 'out-for-delivery', 'delivered'];

const STATUS_LABELS: Record<Order['status'], string> = {
  placed: 'Order placed',
  preparing: 'Restaurant is preparing',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
};

function OrderCard({ order }: { order: Order }) {
  const placedAt = new Date(order.createdAt);
  const stepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Order {order.orderNumber}</p>
          <h3 className="mt-1 text-lg font-bold text-neutral-900">{order.restaurantName}</h3>
          <p className="text-sm text-neutral-500">
            {placedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} ·{' '}
            {placedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-bold',
            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
          )}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </header>

      {order.status !== 'delivered' && (
        <ol className="mt-4 flex items-center gap-1" aria-label="Order progress">
          {STATUS_STEPS.map((step, index) => (
            <li key={step} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  index <= stepIndex ? 'bg-brand-600' : 'bg-neutral-200',
                )}
              />
              <span className="sr-only">
                {STATUS_LABELS[step]}
                {index <= stepIndex ? ' — done' : ' — pending'}
              </span>
            </li>
          ))}
        </ol>
      )}

      <ul className="mt-4 space-y-2">
        {order.items.map((item) => (
          <li key={item.menuItemId} className="flex items-start gap-2 text-sm">
            <VegMarker veg={item.veg} className="mt-1" />
            <span className="min-w-0 flex-1 text-neutral-700">
              {item.name} <span className="text-neutral-400">× {item.quantity}</span>
            </span>
            <span className="font-medium text-neutral-900">{formatInr(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <footer className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm">
        <span className="text-neutral-600">
          {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'UPI'} · {order.address.city}
        </span>
        <span className="text-base font-bold text-neutral-900">{formatInr(order.totals.total)}</span>
      </footer>
    </article>
  );
}

export default function OrdersPage() {
  const { user } = useAuth();
  const location = useLocation();
  const placedOrderNumber = (location.state as { placedOrderNumber?: string } | null)?.placedOrderNumber;

  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setStatus('loading');

    import('../lib/order-repository')
      .then(({ fetchMyOrders }) => fetchMyOrders(user.uid))
      .then((result) => {
        if (!active) return;
        setOrders(result);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold text-neutral-900">My orders</h1>

      {placedOrderNumber && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          Order {placedOrderNumber} placed successfully. The restaurant has been notified.
        </div>
      )}

      {status === 'loading' ? (
        <div className="grid place-items-center py-20">
          <SpinnerIcon className="size-8 text-neutral-400" />
          <span className="sr-only">Loading your orders</span>
        </div>
      ) : status === 'error' ? (
        <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not load orders: {error}
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-neutral-900">No orders yet</h2>
          <p className="mt-1 text-sm text-neutral-500">Your placed orders will show up here.</p>
          <Link to="/" className="mt-6 inline-block rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
            Order something
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
