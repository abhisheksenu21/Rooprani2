export enum AvailabilityStatus {
  AVAILABLE = 'available',
  UNAVAILABLE = 'unavailable',
  IN_STOCK = 'in_stock',
  MADE_TO_ORDER = 'made_to_order',
  LIMITED = 'limited',
  OUT_OF_STOCK = 'out_of_stock',
}

export function isProductAvailable(status: AvailabilityStatus | string): boolean {
  return status !== AvailabilityStatus.UNAVAILABLE && status !== AvailabilityStatus.OUT_OF_STOCK;
}

export function formatAvailabilityLabel(status: AvailabilityStatus | string): string {
  switch (status) {
    case AvailabilityStatus.AVAILABLE:
    case AvailabilityStatus.IN_STOCK:
      return 'Available';
    case AvailabilityStatus.LIMITED:
      return 'Limited Pieces';
    case AvailabilityStatus.MADE_TO_ORDER:
      return 'Made to Order';
    case AvailabilityStatus.UNAVAILABLE:
    case AvailabilityStatus.OUT_OF_STOCK:
      return 'Unavailable';
    default:
      return 'Available';
  }
}

export interface Category {
  id: string;
  numeric_id?: number;
  name: string;
  slug: string;
  product_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  numeric_id?: number;
  title: string;
  name: string;
  slug: string;
  description: string;
  price_inr: number;
  sku: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  image_urls: string[];
  variants?: {
    finish?: string;
    sizes?: string[];
  };
  is_published: boolean;
  is_active: boolean;
  is_featured: boolean;
  availability_status: AvailabilityStatus | string;
  created_at: string;
  updated_at: string;
}

export interface AdminSummary {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  totalCategories: number;
}

export interface CustomerProfile {
  uid: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
}

export interface CustomerEnquiry {
  id: number;
  user_uid?: string | null;
  product_id: number | null;
  product_name: string;
  product_price_inr: number | null;
  product_sku: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  preferred_size: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface AdminDashboardData {
  summary: AdminSummary;
  categories: Category[];
  products: Product[];
  enquiries: CustomerEnquiry[];
}
