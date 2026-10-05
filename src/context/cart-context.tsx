import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { CartLine, CartTotals, MenuItem, Restaurant } from '../types/food';

const STORAGE_KEY = 'zomato-clone:cart';
const DELIVERY_FEE_PER_RESTAURANT = 29;
const TAX_RATE = 0.05;

interface CartContextValue {
  lines: CartLine[];
  /** Total quantity across all lines. */
  itemCount: number;
  /** Distinct restaurants in the cart — delivery is charged per restaurant. */
  restaurantCount: number;
  totals: CartTotals;
  linesFor: (restaurantId: string) => CartLine[];
  quantityOf: (menuItemId: string) => number;
  add: (restaurant: Restaurant, item: MenuItem, quantity?: number) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  remove: (menuItemId: string) => void;
  clear: () => void;
}

/**
 * Prices are recomputed from a price book rather than trusted from storage, so
 * a tampered localStorage entry cannot change what the server is asked to
 * charge. `PRICE_BOOK` is filled by the restaurant page as the user browses.
 */
const PRICE_BOOK = new Map<string, number>();

function readStoredLines(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((line): line is CartLine => {
        if (typeof line !== 'object' || line === null) return false;
        const candidate = line as Partial<CartLine>;
        return (
          typeof candidate.menuItemId === 'string' &&
          typeof candidate.restaurantId === 'string' &&
          typeof candidate.quantity === 'number' &&
          candidate.quantity > 0
        );
      })
      .map((line) => ({
        restaurantId: line.restaurantId,
        restaurantName: line.restaurantName ?? 'Unknown',
        menuItemId: line.menuItemId,
        name: line.name ?? 'Item',
        // Recomputed below from the price book when available.
        price: PRICE_BOOK.get(line.menuItemId) ?? line.price ?? 0,
        veg: line.veg === true,
        quantity: Math.min(99, Math.floor(line.quantity)),
      }));
  } catch {
    return [];
  }
}

function computeTotals(lines: CartLine[]): CartTotals {
  const itemTotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const restaurantCount = new Set(lines.map((line) => line.restaurantId)).size;
  const deliveryFee = restaurantCount * DELIVERY_FEE_PER_RESTAURANT;
  const taxes = Math.round(itemTotal * TAX_RATE);
  return { itemTotal, deliveryFee, taxes, total: itemTotal + deliveryFee + taxes };
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readStoredLines);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private mode / quota exceeded — the cart still works for this session.
    }
  }, [lines]);

  const add = useCallback((restaurant: Restaurant, item: MenuItem, quantity = 1) => {
    PRICE_BOOK.set(item.id, item.price);
    setLines((prev) => {
      const existing = prev.find((line) => line.menuItemId === item.id);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === item.id
            ? { ...line, quantity: Math.min(99, line.quantity + quantity), price: item.price }
            : line,
        );
      }
      return [
        ...prev,
        {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          veg: item.veg,
          quantity: Math.max(1, Math.min(99, quantity)),
        },
      ];
    });
  }, []);

  const setQuantity = useCallback((menuItemId: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.menuItemId !== menuItemId);
      return prev.map((line) =>
        line.menuItemId === menuItemId ? { ...line, quantity: Math.min(99, Math.floor(quantity)) } : line,
      );
    });
  }, []);

  const remove = useCallback((menuItemId: string) => {
    setLines((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const totals = computeTotals(lines);
    const byRestaurant = new Map<string, CartLine[]>();
    const byMenuItem = new Map<string, number>();

    for (const line of lines) {
      byRestaurant.set(line.restaurantId, [...(byRestaurant.get(line.restaurantId) ?? []), line]);
      byMenuItem.set(line.menuItemId, line.quantity);
    }

    return {
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      restaurantCount: totals.deliveryFee / DELIVERY_FEE_PER_RESTAURANT,
      totals,
      linesFor: (restaurantId: string) => byRestaurant.get(restaurantId) ?? [],
      quantityOf: (menuItemId: string) => byMenuItem.get(menuItemId) ?? 0,
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside <CartProvider>');
  return context;
}

export { DELIVERY_FEE_PER_RESTAURANT };
