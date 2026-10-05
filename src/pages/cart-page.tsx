import { Link } from 'react-router-dom';

import { CartLineRow, OrderTotals } from '../components/cart-line-row';
import { useCart } from '../context/cart-context';
import { formatInr } from '../utils/format';

export default function CartPage() {
  const { lines, totals, restaurantCount, clear } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">Your cart is empty</h1>
        <p className="mt-2 text-sm text-neutral-500">Add a dish from any restaurant to get started.</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
          Browse restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-neutral-900">Cart</h1>
        <button type="button" onClick={clear} className="text-sm font-semibold text-brand-600 hover:underline">
          Clear cart
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-label="Cart items" className="rounded-2xl border border-neutral-200 bg-white px-4">
          <div className="divide-y divide-neutral-100">
            {lines.map((line) => (
              <CartLineRow key={`${line.restaurantId}:${line.menuItemId}`} line={line} />
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-neutral-900">Bill details</h2>
          <div className="mt-4">
            <OrderTotals totals={totals} restaurantCount={restaurantCount} />
          </div>

          <Link
            to="/checkout"
            className="mt-5 block rounded-full bg-brand-600 py-3 text-center text-sm font-bold text-white transition hover:bg-brand-700"
          >
            Proceed to checkout · {formatInr(totals.total)}
          </Link>
          <p className="mt-2 text-center text-xs text-neutral-400">You will be asked to log in</p>
        </aside>
      </div>
    </div>
  );
}
