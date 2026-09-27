export type SellerStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';
export type OrderStatus = 'ORDERED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export const DISPLAY_SECTIONS = ['HERO_MAIN', 'HERO_SECONDARY', 'SPOTLIGHT', 'HOME_HIDDEN'] as const;
export type DisplaySection = (typeof DISPLAY_SECTIONS)[number];

export type CategoryDTO = { id: string; name: string; slug: string };
export type SellerPublicDTO = { id: string; businessName: string; address: string | null };
export type ProductImageDTO = { id: string; url: string; altText: string | null; isPrimary: boolean; sortOrder: number };

export type ProductDTO = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string | null;
  priceRwf: number;
  compareAtPriceRwf: number | null;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean | null;
  displaySection: string | null;
  displayPriority: number | null;
  createdAt: string;
  category: CategoryDTO | null;
  seller: SellerPublicDTO | null;
  images: ProductImageDTO[];
};

export type CartLine = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    slug: string;
    priceRwf: number;
    compareAtPriceRwf?: number | null;
    stock: number;
    imageUrl: string | null;
    seller?: { businessName: string } | null;
    category?: { name: string } | null;
  };
};

export type CartDTO = { id?: string; items: CartLine[]; subtotalRwf: number };

export type OrderItemDTO = {
  id: string;
  productId: string;
  productName: string;
  unitPriceRwf: number;
  quantity: number;
  lineTotalRwf: number;
  imageUrl?: string | null;
  slug?: string | null;
};

export type OrderDTO = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  phone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  subtotalRwf: number;
  deliveryRwf: number;
  totalRwf: number;
  currency: string;
  createdAt: string;
  items: OrderItemDTO[];
};

export type SortKey = 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';
export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];
