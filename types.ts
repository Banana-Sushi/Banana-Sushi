
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

export type OrderStatus = 'new' | 'processing' | 'on_the_way' | 'delivered';

export interface Order {
  id: string;
  orderNumber: string;
  time: string;
  date: string; // YYYY-MM-DD
  customerName: string;
  phone: string;
  address: string;
  zipCode: string;
  city: string;
  type: 'delivery';
  paymentMethod: 'online' | 'cash';
  status: OrderStatus;
  items: { menuItemId: string; quantity: number; price: number }[];
  total: number;
}
