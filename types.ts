export type Language = 'de' | 'en';

export interface MenuItem {
  id: string;
  name: { de: string; en: string };
  description: { de: string; en: string };
  price: number;
  category: string;
  image: string;
  available?: boolean;
  isFeatured?: boolean;
}

export type OrderStatus = 'processing' | 'completed';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  deliveryNote?: string;
  paymentMethod: 'online' | 'cash';
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  stripeSessionId?: string;
  createdAt: string;
  acknowledgedAt?: string | null;
}
