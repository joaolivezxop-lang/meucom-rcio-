// Utilitários para o sistema de gerenciamento de lojas

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Product, Sale, Employee, CashRegister, MonthlyReport } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simulação de banco de dados local (localStorage)
export class LocalStorage {
  static get<T>(key: string): T[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  static set<T>(key: string, data: T[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  }

  static add<T extends { id: string }>(key: string, item: T): void {
    const items = this.get<T>(key);
    items.push(item);
    this.set(key, items);
  }

  static update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): void {
    const items = this.get<T>(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      this.set(key, items);
    }
  }

  static delete<T extends { id: string }>(key: string, id: string): void {
    const items = this.get<T>(key);
    const filtered = items.filter(item => item.id !== id);
    this.set(key, filtered);
  }

  // NOVO: Função para limpar todos os dados
  static clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('products');
    localStorage.removeItem('sales');
    localStorage.removeItem('cashRegisters');
    // Manter apenas funcionários (não limpar employees)
  }
}

// Geradores de ID únicos
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Formatadores
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const formatDateOnly = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

// Validadores
export const validateProduct = (product: Partial<Product>): string[] => {
  const errors: string[] = [];
  
  if (!product.name?.trim()) errors.push('Nome é obrigatório');
  if (!product.price || product.price <= 0) errors.push('Preço deve ser maior que zero');
  if (product.stock === undefined || product.stock < 0) errors.push('Estoque não pode ser negativo');
  if (!product.category?.trim()) errors.push('Categoria é obrigatória');
  if (!product.unitType) errors.push('Tipo de unidade é obrigatório');
  
  // Validar preço por quilo se o tipo for 'kg'
  if (product.unitType === 'kg' && (!product.pricePerKg || product.pricePerKg <= 0)) {
    errors.push('Preço por quilo é obrigatório para produtos vendidos por peso');
  }
  
  return errors;
};

export const validateEmployee = (employee: Partial<Employee>): string[] => {
  const errors: string[] = [];
  
  if (!employee.name?.trim()) errors.push('Nome é obrigatório');
  if (!employee.email?.trim()) errors.push('Email é obrigatório');
  if (!employee.role) errors.push('Função é obrigatória');
  
  return errors;
};

// MODIFICADO: Dados iniciais ZERADOS (sem produtos nem vendas)
export const initializeDefaultData = (): void => {
  // Funcionários iniciais (manter apenas estes)
  const employees: Employee[] = [
    {
      id: 'admin',
      name: 'Administrador',
      email: 'admin@loja.com',
      role: 'admin',
      isActive: true,
      createdAt: new Date()
    }
  ];

  // Inicializar apenas funcionários se não existir
  if (LocalStorage.get<Employee>('employees').length === 0) {
    LocalStorage.set('employees', employees);
  }
  
  // ZERAR produtos e vendas sempre (conforme solicitado)
  LocalStorage.set('products', []);
  LocalStorage.set('sales', []);
  LocalStorage.set('cashRegisters', []);
};