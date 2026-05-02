export type Category = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  price: number;
  cost?: number | null;
  stock: number;
  min_stock?: number | null;
  unit?: string | null;
  image_url?: string | null;
  barcode?: string | null;
  active: boolean;
  created_at?: string;
  categories?: Category | null;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  total_spent?: number;
  points?: number;
  notes?: string | null;
  created_at?: string;
};

export type Order = {
  id: string;
  code: string;
  customer_id?: string | null;
  customer_name?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  payment_method?: string;
  status?: string;
  notes?: string | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  total: number;
};

export type CartItem = {
  product_id: string;
  product_name: string;
  product_sku: string;
  price: number;
  quantity: number;
  stock: number;
  image_url?: string | null;
  discount?: number; // giảm giá trên 1 đơn vị (hỗ trợ bán sỉ)
};

export type Settings = {
  id: number;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_enabled: boolean;
  updated_at?: string;
};
