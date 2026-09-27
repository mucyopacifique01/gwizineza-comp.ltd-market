'use client';

import { useApi } from '@/lib/use-api';

export type SellerProduct = {
  id: string; sku: string; name: string; slug: string; description: string | null; priceRwf: number; compareAtPriceRwf?: number | null;
  stock: number; imageUrl: string | null; isActive: boolean; categoryId: string | null; category: { id: string; name: string } | null;
  images: { id: string; url: string; isPrimary: boolean }[];
};

export function useSellerProducts() {
  return useApi<{ products: SellerProduct[] }>('/api/seller/products', { loginPath: '/seller/login' });
}

export type SellerOrder = { id: string; orderNumber: string; status: string; customerName: string; deliveryArea: string; createdAt: string; totalRwf: number; items: { id: string; productName: string; quantity: number; unitPriceRwf: number; lineTotalRwf: number }[] };
export function useSellerOrders() {
  return useApi<{ orders: SellerOrder[]; summary: { orderCount: number; revenueRwf: number; unitsSold: number } }>('/api/seller/orders', { loginPath: '/seller/login' });
}
