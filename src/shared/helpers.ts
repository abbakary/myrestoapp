import type {
  MenuItem,
  ModifierItem,
  Order,
  OrderItem,
} from '../types/restaurant.ts';
import type { BranchCartItem, BranchWorkspaceStore } from '../data/saasSeeds.ts';

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function todayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowTimestampStr(): string {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

export function nowTimeStr(): string {
  return new Date().toTimeString().substring(0, 5);
}

export function formatTzs(amountInTzs: number): string {
  return `TZS ${Math.round(amountInTzs).toLocaleString()}`;
}

export function slugify(text: string, fallback = 'tenant'): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  );
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function sanitizeModifier(mod: unknown): ModifierItem | null {
  if (!mod || typeof mod !== 'object') return null;
  const raw = mod as Partial<ModifierItem>;
  if (!raw.id && !raw.name) return null;
  return {
    id: String(raw.id || createId('mod')),
    name: String(raw.name || 'Add-on'),
    price: toFiniteNumber(raw.price, 0),
  };
}

export function sanitizeMenuItem(item: unknown): MenuItem | null {
  if (!item || typeof item !== 'object') return null;
  const raw = item as Partial<MenuItem>;
  if (!raw.id && !raw.name) return null;
  const portions = Array.isArray(raw.portions)
    ? raw.portions
        .filter((p): p is { name: string; priceDelta: number } => Boolean(p && typeof p === 'object' && p.name))
        .map((p) => ({
          name: String(p.name),
          priceDelta: toFiniteNumber(p.priceDelta, 0),
        }))
    : undefined;
  const modifiers = Array.isArray(raw.modifiers)
    ? raw.modifiers.map(sanitizeModifier).filter((m): m is ModifierItem => Boolean(m))
    : undefined;

  return {
    ...raw,
    id: String(raw.id || createId('menu')),
    name: String(raw.name || 'Menu Dish'),
    category: String(raw.category || 'Special'),
    price: Math.max(0, toFiniteNumber(raw.price, 0)),
    image: typeof raw.image === 'string' ? raw.image : '',
    preparationTimeMinutes: Math.max(1, toFiniteNumber(raw.preparationTimeMinutes, 10)),
    isAvailable: raw.isAvailable !== false,
    station: raw.station || 'hot_kitchen',
    ...(portions && portions.length > 0 ? { portions } : {}),
    ...(modifiers && modifiers.length > 0 ? { modifiers } : {}),
  };
}

export function sanitizeCartItems(cart: unknown, menuItems: MenuItem[] = []): BranchCartItem[] {
  if (!Array.isArray(cart)) return [];
  const safeMenu = menuItems
    .map(sanitizeMenuItem)
    .filter((m): m is MenuItem => Boolean(m));

  const result: BranchCartItem[] = [];
  for (const entry of cart) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Partial<BranchCartItem> & { menuItemId?: string };

    const rawMenuObj =
      raw.menuItem && typeof raw.menuItem === 'object'
        ? (raw.menuItem as Partial<MenuItem>)
        : null;
    const lookupId = rawMenuObj?.id || raw.menuItemId;
    const catalogMatch = lookupId ? safeMenu.find((m) => m.id === lookupId) || null : null;
    const resolvedMenuItem = rawMenuObj
      ? sanitizeMenuItem(
          catalogMatch
            ? {
                ...catalogMatch,
                ...rawMenuObj,
                name: rawMenuObj.name ?? catalogMatch.name,
                price: rawMenuObj.price ?? catalogMatch.price,
              }
            : rawMenuObj
        )
      : catalogMatch;
    if (!resolvedMenuItem) continue;

    const selectedModifiers = Array.isArray(raw.selectedModifiers)
      ? raw.selectedModifiers.map(sanitizeModifier).filter((m): m is ModifierItem => Boolean(m))
      : [];

    const selectedPortion =
      raw.selectedPortion && typeof raw.selectedPortion === 'object' && raw.selectedPortion.name
        ? {
            name: String(raw.selectedPortion.name),
            priceDelta: toFiniteNumber(raw.selectedPortion.priceDelta, 0),
          }
        : undefined;

    result.push({
      menuItem: resolvedMenuItem,
      quantity: Math.max(1, Math.round(toFiniteNumber(raw.quantity, 1))),
      ...(selectedPortion ? { selectedPortion } : {}),
      selectedModifiers,
      ...(typeof raw.customerNotes === 'string' ? { customerNotes: raw.customerNotes } : {}),
      ...(typeof raw.customInstructions === 'string' ? { customInstructions: raw.customInstructions } : {}),
      ...(raw.extraCharge !== undefined && toFiniteNumber(raw.extraCharge, 0) > 0
        ? { extraCharge: Math.max(0, Math.round(toFiniteNumber(raw.extraCharge, 0))) }
        : {}),
      ...(raw.isCustomItem ? { isCustomItem: true } : {}),
    });
  }
  return result;
}

export function sanitizeOrderItems(items: unknown): OrderItem[] {
  if (!Array.isArray(items)) return [];
  const result: OrderItem[] = [];
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Partial<OrderItem>;
    const selectedModifiers = Array.isArray(raw.selectedModifiers)
      ? raw.selectedModifiers.map(sanitizeModifier).filter((m): m is ModifierItem => Boolean(m))
      : [];
    result.push({
      ...raw,
      menuItemId: String(raw.menuItemId || createId('item')),
      name: String(raw.name || 'Dish'),
      price: Math.max(0, toFiniteNumber(raw.price, 0)),
      quantity: Math.max(1, Math.round(toFiniteNumber(raw.quantity, 1))),
      selectedModifiers,
      station: raw.station || 'hot_kitchen',
      status: raw.status || 'pending',
    });
  }
  return result;
}

export function sanitizeBranchStore(store: BranchWorkspaceStore): BranchWorkspaceStore {
  if (!store || typeof store !== 'object') return store;
  const safeMenuItems = Array.isArray(store.menuItems)
    ? store.menuItems.map(sanitizeMenuItem).filter((m): m is MenuItem => Boolean(m))
    : [];
  const safeCart = sanitizeCartItems(store.cart, safeMenuItems);
  const safeOrders: Order[] = Array.isArray(store.orders)
    ? store.orders
        .filter((o): o is Order => Boolean(o && typeof o === 'object'))
        .map((o) => ({
          ...o,
          items: sanitizeOrderItems(o.items),
          subtotal: toFiniteNumber(o.subtotal, 0),
          discount: toFiniteNumber(o.discount, 0),
          tax: toFiniteNumber(o.tax, 0),
          deliveryFee: toFiniteNumber(o.deliveryFee, 0),
          donation: toFiniteNumber(o.donation, 0),
          total: toFiniteNumber(o.total, 0),
          paidAmount: toFiniteNumber(o.paidAmount, 0),
        }))
    : [];

  return {
    ...store,
    menuItems: safeMenuItems,
    cart: safeCart,
    orders: safeOrders,
  };
}

