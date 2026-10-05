/**
 * Domain types shared by the UI, the Firestore repositories and the seed data.
 */

/** A restaurant document as stored in the `restaurants` Firestore collection. */
export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  ratingCount: number;
  deliveryMinutes: number;
  costForTwo: number;
  area: string;
  city: string;
  /** Indian state or union territory name, used by the "Deliver to" picker. */
  state: string;
  pureVeg: boolean;
  discount: string | null;
  featured: boolean;
  /** Path inside Firebase Storage, e.g. `restaurants/pizza-punjab.jpg`. */
  imagePath: string;
  /** Served from Firebase Hosting at `/img/...`; the Storage URL wins when available. */
  fallbackImageUrl: string;
}

/** A category chip shown in the horizontal scroller. */
export interface Category {
  id: string;
  label: string;
  imagePath: string;
  fallbackImageUrl: string;
}

/** A dish in `restaurants/{restaurantId}/menu/{itemId}`. */
export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  /** Vegetarian (green dot) vs non-vegetarian (red dot), Zomato style. */
  veg: boolean;
  spicy: boolean;
  popular: boolean;
}

export interface CartLine {
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  name: string;
  price: number;
  veg: boolean;
  quantity: number;
}

export interface CartTotals {
  itemTotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  pincode: string;
}

export type PaymentMethod = 'cod' | 'upi';

export type OrderStatus = 'placed' | 'preparing' | 'out-for-delivery' | 'delivered';

export interface OrderLine {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  veg: boolean;
}

export interface Order {
  id: string;
  /** Human-facing sequential number, e.g. `ZMC-00042`. */
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderLine[];
  totals: CartTotals;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  /** Milliseconds since epoch. Firestore `Timestamp` is converted on read. */
  createdAt: number;
}

export type SortKey = 'rating' | 'delivery' | 'cost-asc' | 'cost-desc';

export type RatingFilter = 0 | 4 | 4.5;

/** 0 = any, otherwise 1 / 2 / 3 = ₹ / ₹₹ / ₹₹₹ budget band. */
export type PriceBandFilter = 0 | 1 | 2 | 3;

export interface Filters {
  search: string;
  /** ISO 3166-2:IN code, or '' for all of India. */
  state: string;
  cuisines: string[];
  rating: RatingFilter;
  priceBand: PriceBandFilter;
  pureVegOnly: boolean;
  sort: SortKey;
}

export type LoadStatus = 'loading' | 'ready' | 'error' | 'demo';

export interface RestaurantsResult {
  status: LoadStatus;
  restaurants: Restaurant[];
  error: string | null;
  /** True when data is served from the bundled JSON instead of Firestore. */
  isDemoData: boolean;
}

/** The signed-in user, or `null`. Mirrors the subset of `User` we actually use. */
export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}
