export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  totalInventoryValue: number;
}

export interface PaginatedProductsResponse {
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
  stats: ProductStats;
  products: Product[];
}

export interface ProductPayload {
  sku: string;
  name: string;
  description?: string | null;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string | null;
  isActive: boolean;
}
