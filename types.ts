export type Language = 'de' | 'en';

export interface Addon {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: { de: string; en: string };
  description: { de: string; en: string };
  price: number;
  category: string;
  image: string;
  available?: boolean;
  isFeatured?: boolean;
  addonsOptional?: Addon[];
  addonsMandatory?: Addon[];
}

export interface Discount {
  id: string;
  section: 'product' | 'category' | 'global' | 'command';
  menuItemId: string | null;
  categoryName: string | null;
  discountType: 'percentage' | 'fixed' | 'two_for_one';
  discountValue: number | null;
  minOrderTotal: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

function isDiscountActive(d: Discount): boolean {
  const now = new Date();
  return (
    d.isActive &&
    (!d.startDate || new Date(d.startDate) <= now) &&
    (!d.endDate || new Date(d.endDate) >= now)
  );
}

export function getAppliedItemDiscount(item: MenuItem, discounts: Discount[]): Discount | null {
  return (
    discounts.find(d => d.section === 'product' && d.menuItemId === item.id && isDiscountActive(d)) ??
    discounts.find(d => d.section === 'category' && d.categoryName === item.category && isDiscountActive(d)) ??
    discounts.find(d => d.section === 'global' && isDiscountActive(d)) ??
    null
  );
}

export function getDiscountedPrice(item: MenuItem, discounts: Discount[]): number {
  const matched = getAppliedItemDiscount(item, discounts);
  if (!matched) return item.price;
  if (matched.discountType === 'two_for_one') return item.price;
  if (matched.discountType === 'fixed') return Math.max(0, item.price - (matched.discountValue ?? 0));
  if (matched.discountType === 'percentage') {
    return Math.round(item.price * (1 - (matched.discountValue ?? 0) / 100) * 100) / 100;
  }
  return item.price;
}

export type OrderStatus = 'pending' | 'processing' | 'ready_for_pickup' | 'completed';

export type PaymentMethod = 'online' | 'cash' | 'pickup_online' | 'pickup_cash';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  selectedOptionalAddons?: Addon[];
  selectedMandatoryAddons?: Addon[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  deliveryNote?: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  stripeSessionId?: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  scheduledTime?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface DeliveryZone {
  id: string;
  maxDistanceKm: number;
  fee: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
}
