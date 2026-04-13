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
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number | null;
}

/** Returns the base price after applying any discount. */
export function getDiscountedPrice(item: MenuItem): number {
  const base = item.price;
  if (!item.discountType || !item.discountValue) return base;
  if (item.discountType === 'percentage') {
    return Math.round(base * (1 - item.discountValue / 100) * 100) / 100;
  }
  return Math.max(0, Math.round((base - item.discountValue) * 100) / 100);
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
}
