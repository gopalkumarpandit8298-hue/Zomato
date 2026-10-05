import { memo } from 'react';

import { useCart } from '../context/cart-context';
import { cn } from '../utils/cn';
import { formatInr } from '../utils/format';
import { QuantityStepper } from './quantity-stepper';
import type { MenuItem, Restaurant } from '../types/food';

/** Zomato's green/red square veg marker. */
export function VegMarker({ veg, className }: { veg: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[3px] border-2',
        veg ? 'border-emerald-600' : 'border-rose-600',
        className,
      )}
      title={veg ? 'Vegetarian' : 'Non-vegetarian'}
    >
      <span className={cn('size-1.5 rounded-full', veg ? 'bg-emerald-600' : 'bg-rose-600')} />
      <span className="sr-only">{veg ? 'Vegetarian' : 'Non-vegetarian'}</span>
    </span>
  );
}

interface MenuItemCardProps {
  item: MenuItem;
  restaurant: Restaurant;
}

function MenuItemCardComponent({ item, restaurant }: MenuItemCardProps) {
  const { add, quantityOf, setQuantity } = useCart();
  const quantity = quantityOf(item.id);

  return (
    <article className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:shadow-md">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <VegMarker veg={item.veg} />
          {item.spicy && (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 uppercase">
              Spicy
            </span>
          )}
          {item.popular && (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 uppercase">
              Bestseller
            </span>
          )}
        </div>

        <h3 className="mt-2 text-base font-semibold text-neutral-900">{item.name}</h3>
        <p className="mt-0.5 text-sm font-medium text-neutral-500">{formatInr(item.price)}</p>
        <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500">{item.description}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between">
        {quantity === 0 ? (
          <button
            type="button"
            onClick={() => add(restaurant, item, 1)}
            className="rounded-full border-2 border-brand-500 px-4 py-1.5 text-sm font-bold text-brand-600 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          >
            Add
            <span className="sr-only"> {item.name} to cart</span>
          </button>
        ) : (
          <QuantityStepper
            value={quantity}
            label={item.name}
            min={0}
            onChange={(next) => setQuantity(item.id, next)}
          />
        )}
      </div>
    </article>
  );
}

export const MenuItemCard = memo(MenuItemCardComponent);
