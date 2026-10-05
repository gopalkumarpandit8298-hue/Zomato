import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getDb } from './firebase-clients';
import type { Order, OrderStatus, Restaurant } from '../types/food';

const ORDER_STATUSES: OrderStatus[] = ['placed', 'preparing', 'out-for-delivery', 'delivered'];

export type RestaurantDraft = Omit<Restaurant, 'id'>;

function toMillis(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapRestaurant(id: string, data: Record<string, unknown>): Restaurant {
  return {
    id,
    name: typeof data.name === 'string' ? data.name : 'Unnamed restaurant',
    cuisines: Array.isArray(data.cuisines) ? data.cuisines.filter((c): c is string => typeof c === 'string') : [],
    rating: typeof data.rating === 'number' ? data.rating : 0,
    ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : 0,
    deliveryMinutes: typeof data.deliveryMinutes === 'number' ? data.deliveryMinutes : 30,
    costForTwo: typeof data.costForTwo === 'number' ? data.costForTwo : 0,
    area: typeof data.area === 'string' ? data.area : '',
    city: typeof data.city === 'string' ? data.city : '',
    state: typeof data.state === 'string' ? data.state : '',
    pureVeg: data.pureVeg === true,
    discount: typeof data.discount === 'string' && data.discount ? data.discount : null,
    featured: data.featured === true,
    imagePath: typeof data.imagePath === 'string' ? data.imagePath : '',
    fallbackImageUrl: typeof data.fallbackImageUrl === 'string' ? data.fallbackImageUrl : '',
  };
}

function mapOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    orderNumber: typeof data.orderNumber === 'string' ? data.orderNumber : '—',
    userId: typeof data.userId === 'string' ? data.userId : '',
    userName: typeof data.userName === 'string' ? data.userName : 'Unknown',
    userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
    restaurantId: typeof data.restaurantId === 'string' ? data.restaurantId : '',
    restaurantName: typeof data.restaurantName === 'string' ? data.restaurantName : 'Restaurant',
    items: Array.isArray(data.items) ? (data.items as Order['items']) : [],
    totals:
      (data.totals as Order['totals']) ?? { itemTotal: 0, deliveryFee: 0, taxes: 0, total: 0 },
    address:
      (data.address as Order['address']) ?? {
        fullName: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        pincode: '',
      },
    paymentMethod: data.paymentMethod === 'upi' ? 'upi' : 'cod',
    status: (ORDER_STATUSES as string[]).includes(data.status as string) ? (data.status as OrderStatus) : 'placed',
    createdAt: toMillis(data.createdAt),
  };
}

/**
 * Menu item counts per restaurant.
 *
 * One subcollection read per restaurant, issued in parallel and individually
 * fault-tolerant: a single unreadable menu must not blank the whole table.
 */
export async function fetchMenuCounts(): Promise<Record<string, number>> {
  const snapshot = await getDocs(collection(getDb(), 'restaurants'));
  const entries = await Promise.all(
    snapshot.docs.map(async (snapshotDoc) => {
      const count = await getDocs(collection(getDb(), 'restaurants', snapshotDoc.id, 'menu'))
        .then((menu) => menu.size)
        .catch(() => 0);
      return [snapshotDoc.id, count] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const snapshot = await getDocs(query(collection(getDb(), 'restaurants'), orderBy('name', 'asc')));
  return snapshot.docs.map((snapshotDoc) => mapRestaurant(snapshotDoc.id, snapshotDoc.data()));
}

/** Slugified, unique-enough id derived from the name. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || `restaurant-${Date.now()}`
  );
}

export async function createRestaurant(draft: RestaurantDraft): Promise<string> {
  const id = slugify(draft.name);
  // `merge: false` so removed fields actually disappear.
  await setDoc(doc(getDb(), 'restaurants', id), draft, { merge: false });
  return id;
}

export async function updateRestaurant(id: string, draft: RestaurantDraft): Promise<void> {
  await setDoc(doc(getDb(), 'restaurants', id), draft, { merge: true });
}

export async function deleteRestaurant(id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'restaurants', id));
}

/** Every order, newest first. Admin-only by Firestore rules. */
export async function fetchAllOrders(max = 200): Promise<Order[]> {
  const snapshot = await getDocs(query(collection(getDb(), 'orders'), orderBy('createdAt', 'desc'), limit(max)));
  return snapshot.docs.map((snapshotDoc) => mapOrder(snapshotDoc.id, snapshotDoc.data()));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!ORDER_STATUSES.includes(status)) throw new Error(`Unknown order status: ${status}`);
  await updateDoc(doc(getDb(), 'orders', orderId), { status });
}

export interface AdminStats {
  totalRestaurants: number;
  totalOrders: number;
  revenue: number;
  ordersToday: number;
  pendingOrders: number;
  averageOrderValue: number;
  customers: number;
  topRestaurants: Array<{ name: string; orders: number; revenue: number }>;
  recentOrders: Order[];
}

const startOfToday = (): number => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
};

/**
 * Dashboard numbers.
 *
 * Computed from a bounded read rather than an aggregation job — fine for a
 * demo catalogue, but a real deployment should use a scheduled Cloud Function
 * writing a summary document.
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const [restaurants, orders] = await Promise.all([fetchAllRestaurants(), fetchAllOrders(500)]);

  const today = startOfToday();
  const revenue = orders.reduce((sum, order) => sum + (order.totals?.total ?? 0), 0);

  const byRestaurant = new Map<string, { name: string; orders: number; revenue: number }>();
  for (const order of orders) {
    const entry = byRestaurant.get(order.restaurantId) ?? { name: order.restaurantName, orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.totals?.total ?? 0;
    byRestaurant.set(order.restaurantId, entry);
  }

  const customers = new Set(orders.filter((order) => order.userId).map((order) => order.userId)).size;

  return {
    totalRestaurants: restaurants.length,
    totalOrders: orders.length,
    revenue,
    ordersToday: orders.filter((order) => order.createdAt >= today).length,
    pendingOrders: orders.filter((order) => order.status !== 'delivered').length,
    averageOrderValue: orders.length > 0 ? Math.round(revenue / orders.length) : 0,
    customers,
    topRestaurants: [...byRestaurant.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: orders.slice(0, 6),
  };
}

/**
 * A customer list derived from orders.
 *
 * Listing Firebase Auth users needs the Admin SDK, which cannot run in the
 * browser, so the admin panel reports who has actually ordered instead.
 */
export interface AdminCustomer {
  userId: string;
  name: string;
  email: string;
  orders: number;
  spent: number;
  lastOrderAt: number;
}

export async function fetchCustomersFromOrders(): Promise<AdminCustomer[]> {
  const orders = await fetchAllOrders(500);
  const byUser = new Map<string, AdminCustomer>();

  for (const order of orders) {
    if (!order.userId) continue;
    const entry = byUser.get(order.userId) ?? {
      userId: order.userId,
      name: order.userName || 'Unknown',
      email: order.userEmail,
      orders: 0,
      spent: 0,
      lastOrderAt: 0,
    };
    entry.orders += 1;
    entry.spent += order.totals?.total ?? 0;
    entry.lastOrderAt = Math.max(entry.lastOrderAt, order.createdAt);
    if (order.userEmail) entry.email = order.userEmail;
    byUser.set(order.userId, entry);
  }

  return [...byUser.values()].sort((a, b) => b.spent - a.spent);
}

/** Orders for one restaurant, used by the restaurant detail drawer. */
export async function fetchOrdersForRestaurant(restaurantId: string): Promise<Order[]> {
  const snapshot = await getDocs(
    query(
      collection(getDb(), 'orders'),
      where('restaurantId', '==', restaurantId),
      orderBy('createdAt', 'desc'),
      limit(50),
    ),
  );
  return snapshot.docs.map((snapshotDoc) => mapOrder(snapshotDoc.id, snapshotDoc.data()));
}
