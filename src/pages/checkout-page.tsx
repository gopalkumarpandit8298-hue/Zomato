import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { AddressFields, validateAddress, type AddressErrors } from '../components/address-form';
import { OrderTotals } from '../components/cart-line-row';
import { SpinnerIcon } from '../components/icons';
import { VegMarker } from '../components/menu-item-card';
import { useAuth } from '../context/auth-context';
import { useCart } from '../context/cart-context';
import { formatInr } from '../utils/format';
import type { DeliveryAddress, PaymentMethod } from '../types/food';

const EMPTY_ADDRESS: DeliveryAddress = { fullName: '', phone: '', line1: '', line2: '', city: '', pincode: '' };

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string; hint: string }> = [
  { value: 'cod', label: 'Cash on delivery', hint: 'Pay the delivery partner in cash' },
  { value: 'upi', label: 'UPI', hint: 'GPay, PhonePe or any UPI app (demo only)' },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { lines, totals, restaurantCount, clear } = useCart();
  const navigate = useNavigate();

  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [placing, setPlacing] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  if (lines.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  // A multi-restaurant cart cannot be delivered in one trip, so checkout is
  // scoped to a single restaurant and the others stay in the cart.
  const primaryRestaurantId = lines[0].restaurantId;
  const restaurantName = lines[0].restaurantName;
  const mixedRestaurants = restaurantCount > 1;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);

    const nextErrors = validateAddress(address);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!user) return;

    setPlacing(true);
    try {
      const { placeOrder } = await import('../lib/order-repository');
      const order = await placeOrder({
        user,
        restaurantId: primaryRestaurantId,
        restaurantName,
        lines,
        totals,
        address,
        paymentMethod,
      });
      clear();
      navigate('/orders', { replace: true, state: { placedOrderNumber: order.orderNumber } });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setPlacing(false);
    }
  };

  return (
    <form id="checkout-form" onSubmit={handleSubmit} noValidate className="mx-auto max-w-5xl py-8">
      <h1 className="text-2xl font-extrabold text-neutral-900">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {mixedRestaurants && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Your cart has items from {restaurantCount} restaurants. This order will be placed with{' '}
              <strong>{restaurantName}</strong> only — Zomato takes one restaurant per trip.
            </p>
          )}

          <section aria-labelledby="address-heading" className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 id="address-heading" className="text-base font-bold text-neutral-900">
              Delivery address
            </h2>
            {user && (
              <p className="mt-1 text-xs text-neutral-500">
                Ordering as {user.displayName} ({user.email})
              </p>
            )}

            <div className="mt-4">
              <AddressFields idPrefix="checkout" value={address} errors={errors} onChange={setAddress} disabled={placing} />
            </div>
          </section>

          <section aria-labelledby="payment-heading" className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 id="payment-heading" className="text-base font-bold text-neutral-900">
              Payment method
            </h2>
            <div className="mt-3 space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label
                  key={method.value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 transition has-checked:border-brand-500 has-checked:bg-brand-50/40"
                >
                  <input
                    type="radio"
                    name="payment"
                    value={method.value}
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                    className="mt-1 accent-brand-600"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-neutral-900">{method.label}</span>
                    <span className="block text-xs text-neutral-500">{method.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-neutral-200 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold text-neutral-900">Order summary</h2>

          <ul className="mt-3 space-y-2">
            {lines.map((line) => (
              <li key={`${line.restaurantId}:${line.menuItemId}`} className="flex items-start gap-2 text-sm">
                <VegMarker veg={line.veg} className="mt-1" />
                <span className="min-w-0 flex-1 text-neutral-700">
                  {line.name} <span className="text-neutral-400">× {line.quantity}</span>
                </span>
                <span className="font-medium text-neutral-900">{formatInr(line.price * line.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-neutral-200 pt-4">
            <OrderTotals totals={totals} restaurantCount={restaurantCount} />
          </div>

          {failure && (
            <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {failure}
            </p>
          )}

          <button
            type="submit"
            disabled={placing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {placing ? (
              <>
                <SpinnerIcon className="size-4" />
                Placing your order…
              </>
            ) : (
              `Place order · ${formatInr(totals.total)}`
            )}
          </button>

          <p className="mt-2 text-center text-xs text-neutral-400">
            By placing the order you agree to our demo terms. No real payment is taken.
          </p>

          <Link to="/cart" className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline">
            Back to cart
          </Link>
        </aside>
      </div>
    </form>
  );
}
