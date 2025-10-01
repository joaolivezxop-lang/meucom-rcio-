// Tipos para o sistema de gerenciamento de lojas

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  pricePerKg?: number; // NOVO: Preço por quilo (opcional)
  unitType: 'unit' | 'kg'; // NOVO: Tipo de unidade (unidade ou quilo)
  stock: number;
  category: string;
  barcode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'pix';
  employeeId: string;
  createdAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'cashier' | 'manager';
  isActive: boolean;
  createdAt: Date;
}

export interface CashRegister {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  initialAmount: number;
  finalAmount?: number;
  totalSales: number;
  employeeId: string;
  isOpen: boolean;
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalSales: number;
  totalProducts: number;
  totalEmployees: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export type ViewType = 
  | 'login' 
  | 'dashboard' 
  | 'products' 
  | 'sales' 
  | 'stock' 
  | 'cash-register' 
  | 'reports' 
  | 'employees';