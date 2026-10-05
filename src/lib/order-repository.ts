import { collection, doc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';

import { getDb } from './firebase-clients';
import type { AuthUser, CartLine, CartTotals, DeliveryAddress, Order, OrderLine, PaymentMethod } from '../types/food';

const ORDERS = 'orders';
const COUNTER = 'orderCounters/global';
const ORDER_NUMBER_PREFIX = 'ZMC-';

export interface PlaceOrderInput {
  user: AuthUser;
  restaurantId: string;
  restaurantName: string;
  lines: CartLine[];
  totals: CartTotals;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
}

const ORDER_STATUSES: Order['status'][] = ['placed', 'preparing', 'out-for-delivery', 'delivered'];

function toOrderLine(line: CartLine): OrderLine {
  return { menuItemId: line.menuItemId, name: line.name, price: line.price, quantity: line.quantity, veg: line.veg };
}

function toMillis(value: unknown): number {
  // Firestore returns a Timestamp; anything else falls back to "now".
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

/**
 * Creates the order and allocates a sequential human-facing number in a single
 * transaction, so two simultaneous checkouts can never receive the same number.
 *
 * Prices are taken from the cart the server already agreed on; a production
 * app must re-price from Firestore here, since the client is untrusted.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const db = getDb();
  const orderRef = doc(collection(db, ORDERS));

  const orderNumber = await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, COUNTER);
    const counterSnapshot = await transaction.get(counterRef);
    const nextValue = ((counterSnapshot.data()?.value as number | undefined) ?? 0) + 1;

    transaction.set(
      orderRef,
      {
        orderNumber: `${ORDER_NUMBER_PREFIX}${String(nextValue).padStart(5, '0')}`,
        userId: input.user.uid,
        userName: input.user.displayName,
        userEmail: input.user.email,
        restaurantId: input.restaurantId,
        restaurantName: input.restaurantName,
        items: input.lines.map(toOrderLine),
        totals: input.totals,
        address: input.address,
        paymentMethod: input.paymentMethod,
        status: 'placed',
        createdAt: serverTimestamp(),
      },
      { merge: false },
    );

    transaction.set(counterRef, { value: nextValue, updatedAt: serverTimestamp() }, { merge: true });
    return `${ORDER_NUMBER_PREFIX}${String(nextValue).padStart(5, '0')}`;
  });

  return {
    id: orderRef.id,
    orderNumber,
    userId: input.user.uid,
    userName: input.user.displayName,
    userEmail: input.user.email,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    items: input.lines.map(toOrderLine),
    totals: input.totals,
    address: input.address,
    paymentMethod: input.paymentMethod,
    status: 'placed',
    createdAt: Date.now(),
  };
}

/**
 * Orders for the signed-in user only — the Firestore rules enforce this on the
 * server, but the query is scoped as well so we never download other people's
 * documents.
 */
export async function fetchMyOrders(uid: string): Promise<Order[]> {
  const ordersQuery = query(collection(getDb(), ORDERS), where('userId', '==', uid), orderBy('createdAt', 'desc'), limit(50));
  const snapshot = await getDocs(ordersQuery);

  return snapshot.docs.map((snapshotDoc) => {
    const data = snapshotDoc.data();
    return {
      id: snapshotDoc.id,
      orderNumber: typeof data.orderNumber === 'string' ? data.orderNumber : '—',
      userId: typeof data.userId === 'string' ? data.userId : uid,
      userName: typeof data.userName === 'string' ? data.userName : '',
      userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
      restaurantId: typeof data.restaurantId === 'string' ? data.restaurantId : '',
      restaurantName: typeof data.restaurantName === 'string' ? data.restaurantName : 'Restaurant',
      items: Array.isArray(data.items) ? (data.items as OrderLine[]) : [],
      totals: (data.totals as CartTotals) ?? { itemTotal: 0, deliveryFee: 0, taxes: 0, total: 0 },
      address: (data.address as DeliveryAddress) ?? {
        fullName: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        pincode: '',
      },
      paymentMethod: data.paymentMethod === 'upi' ? 'upi' : 'cod',
      status: (ORDER_STATUSES as string[]).includes(data.status as string) ? (data.status as Order['status']) : 'placed',
      createdAt: toMillis(data.createdAt),
    };
  });
}
