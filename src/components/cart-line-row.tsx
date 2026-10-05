import { Link } from 'react-router-dom';

import { useCart } from '../context/cart-context';
import { formatInr } from '../utils/format';
import { VegMarker } from './menu-item-card';
import { QuantityStepper } from './quantity-stepper';
import type { CartTotals } from '../types/food';

interface OrderTotalsProps {
  totals: CartTotals;
  restaurantCount: number;
}

export function OrderTotals({ totals, restaurantCount }: OrderTotalsProps) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-neutral-600">Item total</dt>
        <dd className="font-medium text-neutral-900">{formatInr(totals.itemTotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-neutral-600">
          Delivery fee{restaurantCount > 1 ? ` (${restaurantCount} restaurants)` : ''}
        </dt>
        <dd className="font-medium text-neutral-900">{formatInr(totals.deliveryFee)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-neutral-600">Taxes and fees</dt>
        <dd className="font-medium text-neutral-900">{formatInr(totals.taxes)}</dd>
      </div>
      <div className="flex justify-between border-t border-neutral-200 pt-2 text-base">
        <dt className="font-bold text-neutral-900">To pay</dt>
        <dd className="font-bold text-neutral-900">{formatInr(totals.total)}</dd>
      </div>
    </dl>
  );
}

export function CartLineRow({ line }: { line: ReturnType<typeof useCart>['lines'][number] }) {
  const { setQuantity, remove } = useCart();

  return (
    <div className="flex items-start gap-3 border-b border-neutral-100 py-4 last:border-b-0">
      <VegMarker veg={line.veg} className="mt-1" />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-neutral-900">{line.name}</p>
        <Link to={`/restaurant/${line.restaurantId}`} className="text-xs text-neutral-500 hover:text-brand-600">
          {line.restaurantName}
        </Link>
        <p className="mt-1 text-sm font-medium text-neutral-700">{formatInr(line.price)}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <QuantityStepper value={line.quantity} label={line.name} min={0} onChange={(next) => setQuantity(line.menuItemId, next)} />
        <p className="text-sm font-bold text-neutral-900">{formatInr(line.price * line.quantity)}</p>
        <button
          type="button"
          onClick={() => remove(line.menuItemId)}
          className="text-xs font-semibold text-neutral-500 underline hover:text-brand-600"
        >
          Remove
          <span className="sr-only"> {line.name}</span>
        </button>
      </div>
    </div>
  );
}
