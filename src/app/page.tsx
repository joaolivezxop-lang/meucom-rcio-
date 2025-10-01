"use client";

import { useState, useEffect } from 'react';
import { 
  Store, 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign, 
  BarChart3, 
  LogOut,
  Plus,
  Edit,
  Trash2,
  Search,
  Calculator,
  CreditCard,
  Banknote,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ViewType, Product, Sale, Employee, CashRegister, SaleItem } from '@/lib/types';
import { LocalStorage, generateId, formatCurrency, formatDate, formatDateOnly, validateProduct, validateEmployee, initializeDefaultData } from '@/lib/utils';

export default function StoreManagement() {
  const [currentView, setCurrentView] = useState<ViewType>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Estados para produtos
  const [products, setProducts] = useState<Product[]>([]);
  const [productForm, setProductForm] = useState<Partial<Product>>({ unitType: 'unit' });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Estados para vendas/PDV
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);

  // Estados para funcionários
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({});
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);

  // Estados para relatórios
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Inicialização
  useEffect(() => {
    initializeDefaultData();
    loadData();
  }, []);

  const loadData = () => {
    setProducts(LocalStorage.get<Product>('products'));
    setEmployees(LocalStorage.get<Employee>('employees'));
    setSales(LocalStorage.get<Sale>('sales'));
    
    const openRegister = LocalStorage.get<CashRegister>('cashRegisters')
      .find(register => register.isOpen);
    setCashRegister(openRegister || null);
  };

  // Autenticação
  const handleLogin = () => {
    if (password === '210588') {
      const admin = employees.find(emp => emp.role === 'admin');
      if (admin) {
        setCurrentUser(admin);
        setIsAuthenticated(true);
        setCurrentView('dashboard');
        setLoginError('');
      }
    } else {
      setLoginError('Senha incorreta');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('login');
    setPassword('');
  };

  // Gerenciamento de produtos
  const handleSaveProduct = () => {
    const errors = validateProduct(productForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    if (editingProduct) {
      LocalStorage.update('products', editingProduct, {
        ...productForm,
        updatedAt: new Date()
      });
    } else {
      const newProduct: Product = {
        id: generateId(),
        name: productForm.name!,
        description: productForm.description || '',
        price: productForm.price!,
        pricePerKg: productForm.pricePerKg,
        unitType: productForm.unitType!,
        stock: productForm.stock!,
        category: productForm.category!,
        barcode: productForm.barcode,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      LocalStorage.add('products', newProduct);
    }

    setProductForm({ unitType: 'unit' });
    setEditingProduct(null);
    loadData();
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      LocalStorage.delete('products', id);
      loadData();
    }
  };

  // Gerenciamento de vendas/PDV
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Produto sem estoque!');
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Quantidade máxima em estoque atingida!');
        return;
      }
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        total: product.price
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (product && quantity > product.stock) {
      alert('Quantidade maior que o estoque disponível!');
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    ));
  };

  const completeSale = () => {
    if (cart.length === 0) {
      alert('Carrinho vazio!');
      return;
    }

    if (!cashRegister?.isOpen) {
      alert('Caixa não está aberto!');
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.total, 0);
    const newSale: Sale = {
      id: generateId(),
      items: cart,
      total,
      paymentMethod,
      employeeId: currentUser?.id || 'unknown',
      createdAt: new Date()
    };

    // Salvar venda
    LocalStorage.add('sales', newSale);

    // Atualizar estoque
    cart.forEach(item => {
      LocalStorage.update('products', item.productId, {
        stock: products.find(p => p.id === item.productId)!.stock - item.quantity
      });
    });

    // Atualizar caixa
    LocalStorage.update('cashRegisters', cashRegister.id, {
      totalSales: cashRegister.totalSales + total
    });

    setCart([]);
    loadData();
    alert(`Venda realizada com sucesso! Total: ${formatCurrency(total)}`);
  };

  // Gerenciamento de caixa
  const openCashRegister = () => {
    const initialAmount = parseFloat(prompt('Valor inicial do caixa:') || '0');
    const newRegister: CashRegister = {
      id: generateId(),
      openedAt: new Date(),
      initialAmount,
      totalSales: 0,
      employeeId: currentUser?.id || 'unknown',
      isOpen: true
    };

    LocalStorage.add('cashRegisters', newRegister);
    setCashRegister(newRegister);
  };

  const closeCashRegister = () => {
    if (!cashRegister) return;

    const finalAmount = parseFloat(prompt('Valor final do caixa:') || '0');
    LocalStorage.update('cashRegisters', cashRegister.id, {
      closedAt: new Date(),
      finalAmount,
      isOpen: false
    });

    setCashRegister(null);
    loadData();
  };

  // Gerenciamento de funcionários
  const handleSaveEmployee = () => {
    const errors = validateEmployee(employeeForm);
    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    if (editingEmployee) {
      LocalStorage.update('employees', editingEmployee, employeeForm);
    } else {
      const newEmployee: Employee = {
        id: generateId(),
        name: employeeForm.name!,
        email: employeeForm.email!,
        role: employeeForm.role!,
        isActive: true,
        createdAt: new Date()
      };
      LocalStorage.add('employees', newEmployee);
    }

    setEmployeeForm({});
    setEditingEmployee(null);
    loadData();
  };

  const handleDeleteEmployee = (id: string) => {
    if (id === 'admin') {
      alert('Não é possível excluir o administrador!');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
      LocalStorage.delete('employees', id);
      loadData();
    }
  };

  // Filtros e cálculos
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);

  const monthlyData = sales.filter(sale => {
    const saleDate = new Date(sale.createdAt);
    return saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
  });

  const monthlyRevenue = monthlyData.reduce((sum, sale) => sum + sale.total, 0);
  const monthlySalesCount = monthlyData.length;

  // Renderização condicional baseada na view atual
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Sistema de Gerenciamento</CardTitle>
            <CardDescription>Digite a senha do administrador para acessar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Senha do administrador"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            {loginError && (
              <p className="text-sm text-red-600 text-center">{loginError}</p>
            )}
            <Button onClick={handleLogin} className="w-full">
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Store className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Sistema de Gerenciamento</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Olá, {currentUser?.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { key: 'sales', label: 'Vendas (PDV)', icon: ShoppingCart },
              { key: 'products', label: 'Produtos', icon: Package },
              { key: 'stock', label: 'Estoque', icon: Package },
              { key: 'cash-register', label: 'Caixa', icon: DollarSign },
              { key: 'reports', label: 'Relatórios', icon: BarChart3 },
              { key: 'employees', label: 'Funcionários', icon: Users },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={currentView === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentView(key as ViewType)}
                className="flex items-center space-x-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </nav>

        {/* Dashboard */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{products.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sales.filter(sale => 
                      formatDateOnly(new Date(sale.createdAt)) === formatDateOnly(new Date())
                    ).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      sales
                        .filter(sale => formatDateOnly(new Date(sale.createdAt)) === formatDateOnly(new Date()))
                        .reduce((sum, sale) => sum + sale.total, 0)
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status do Caixa</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cashRegister?.isOpen ? 'Aberto' : 'Fechado'}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos com Estoque Baixo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {products
                      .filter(product => product.stock <= 10)
                      .slice(0, 5)
                      .map(product => (
                        <div key={product.id} className="flex justify-between items-center">
                          <span className="text-sm">{product.name}</span>
                          <span className="text-sm font-medium text-red-600">
                            {product.stock} unidades
                          </span>
                        </div>
                      ))}
                    {products.filter(product => product.stock <= 10).length === 0 && (
                      <p className="text-sm text-gray-500">Todos os produtos têm estoque adequado</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Últimas Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sales
                      .slice(-5)
                      .reverse()
                      .map(sale => (
                        <div key={sale.id} className="flex justify-between items-center">
                          <span className="text-sm">{formatDate(new Date(sale.createdAt))}</span>
                          <span className="text-sm font-medium">{formatCurrency(sale.total)}</span>
                        </div>
                      ))}
                    {sales.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhuma venda realizada</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* PDV/Vendas */}
        {currentView === 'sales' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Produtos */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Disponíveis</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar produtos..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => addToCart(product)}
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(product.price)} 
                            {product.unitType === 'kg' && product.pricePerKg && (
                              <span> • {formatCurrency(product.pricePerKg)}/kg</span>
                            )}
                            {' • Estoque: '}{product.stock}
                          </p>
                        </div>
                        <Button size="sm" disabled={product.stock <= 0}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Carrinho */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Carrinho de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.productId} className="flex justify-between items-center p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.unitPrice)} x {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.productId)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="ml-4 font-medium">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Carrinho vazio</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Finalização */}
              <Card>
                <CardHeader>
                  <CardTitle>Finalizar Venda</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-bold text-center">
                    Total: {formatCurrency(cartTotal)}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Forma de Pagamento:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                      >
                        <Banknote className="w-4 h-4 mr-1" />
                        Dinheiro
                      </Button>
                      <Button
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('card')}
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Cartão
                      </Button>
                      <Button
                        variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('pix')}
                      >
                        <Smartphone className="w-4 h-4 mr-1" />
                        PIX
                      </Button>
                    </div>
                  </div>

                  <Button
                    onClick={completeSale}
                    className="w-full"
                    disabled={cart.length === 0 || !cashRegister?.isOpen}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Finalizar Venda
                  </Button>

                  {!cashRegister?.isOpen && (
                    <p className="text-sm text-red-600 text-center">
                      Caixa fechado - abra o caixa para realizar vendas
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Produtos */}
        {currentView === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gerenciar Produtos</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Nome do produto"
                      value={productForm.name || ''}
                      onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    />
                    <Input
                      placeholder="Descrição"
                      value={productForm.description || ''}
                      onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    />
                    
                    {/* NOVO: Seletor de tipo de unidade */}
                    <select
                      value={productForm.unitType || 'unit'}
                      onChange={(e) => setProductForm({...productForm, unitType: e.target.value as 'unit' | 'kg'})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="unit">Vendido por unidade</option>
                      <option value="kg">Vendido por peso (kg)</option>
                    </select>
                    
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Preço por unidade"
                      value={productForm.price || ''}
                      onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                    />
                    
                    {/* NOVO: Campo de preço por quilo (condicional) */}
                    {productForm.unitType === 'kg' && (
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço por quilo (kg)"
                        value={productForm.pricePerKg || ''}
                        onChange={(e) => setProductForm({...productForm, pricePerKg: parseFloat(e.target.value)})}
                      />
                    )}
                    
                    <Input
                      type="number"
                      placeholder="Estoque"
                      value={productForm.stock || ''}
                      onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value)})}
                    />
                    <Input
                      placeholder="Categoria"
                      value={productForm.category || ''}
                      onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    />
                    <Input
                      placeholder="Código de barras (opcional)"
                      value={productForm.barcode || ''}
                      onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveProduct}>
                      {editingProduct ? 'Atualizar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estoque
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map(product => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.description}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(product.price)}
                            {product.unitType === 'kg' && product.pricePerKg && (
                              <div className="text-xs text-gray-500">
                                {formatCurrency(product.pricePerKg)}/kg
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${product.stock <= 10 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setProductForm(product);
                                    setEditingProduct(product.id);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Produto</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Input
                                    placeholder="Nome do produto"
                                    value={productForm.name || ''}
                                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                                  />
                                  <Input
                                    placeholder="Descrição"
                                    value={productForm.description || ''}
                                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                                  />
                                  
                                  <select
                                    value={productForm.unitType || 'unit'}
                                    onChange={(e) => setProductForm({...productForm, unitType: e.target.value as 'unit' | 'kg'})}
                                    className="w-full px-3 py-2 border rounded-md"
                                  >
                                    <option value="unit">Vendido por unidade</option>
                                    <option value="kg">Vendido por peso (kg)</option>
                                  </select>
                                  
                                  <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Preço por unidade"
                                    value={productForm.price || ''}
                                    onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                                  />
                                  
                                  {productForm.unitType === 'kg' && (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Preço por quilo (kg)"
                                      value={productForm.pricePerKg || ''}
                                      onChange={(e) => setProductForm({...productForm, pricePerKg: parseFloat(e.target.value)})}
                                    />
                                  )}
                                  
                                  <Input
                                    type="number"
                                    placeholder="Estoque"
                                    value={productForm.stock || ''}
                                    onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value)})}
                                  />
                                  <Input
                                    placeholder="Categoria"
                                    value={productForm.category || ''}
                                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                                  />
                                  <Input
                                    placeholder="Código de barras (opcional)"
                                    value={productForm.barcode || ''}
                                    onChange={(e) => setProductForm({...productForm, barcode: e.target.value})}
                                  />
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleSaveProduct}>
                                    Atualizar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estoque */}
        {currentView === 'stock' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Controle de Estoque</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Produtos em Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {products.filter(p => p.stock > 10).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estoque Baixo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {products.filter(p => p.stock <= 10 && p.stock > 0).length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sem Estoque</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {products.filter(p => p.stock === 0).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Produtos por Status de Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Produtos sem estoque */}
                  {products.filter(p => p.stock === 0).length > 0 && (
                    <div>
                      <h3 className="font-medium text-red-600 mb-2">Sem Estoque</h3>
                      <div className="space-y-2">
                        {products.filter(p => p.stock === 0).map(product => (
                          <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">{product.category}</p>
                            </div>
                            <span className="text-red-600 font-bold">0 unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Produtos com estoque baixo */}
                  {products.filter(p => p.stock <= 10 && p.stock > 0).length > 0 && (
                    <div>
                      <h3 className="font-medium text-yellow-600 mb-2">Estoque Baixo (≤ 10 unidades)</h3>
                      <div className="space-y-2">
                        {products.filter(p => p.stock <= 10 && p.stock > 0).map(product => (
                          <div key={product.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">{product.category}</p>
                            </div>
                            <span className="text-yellow-600 font-bold">{product.stock} unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Produtos com estoque adequado */}
                  {products.filter(p => p.stock > 10).length > 0 && (
                    <div>
                      <h3 className="font-medium text-green-600 mb-2">Estoque Adequado</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {products.filter(p => p.stock > 10).map(product => (
                          <div key={product.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600">{product.category}</p>
                            </div>
                            <span className="text-green-600 font-bold">{product.stock} unidades</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Caixa */}
        {currentView === 'cash-register' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Controle de Caixa</h2>
              {!cashRegister?.isOpen ? (
                <Button onClick={openCashRegister}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Abrir Caixa
                </Button>
              ) : (
                <Button variant="destructive" onClick={closeCashRegister}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Fechar Caixa
                </Button>
              )}
            </div>

            {cashRegister?.isOpen && (
              <Card>
                <CardHeader>
                  <CardTitle>Caixa Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Valor Inicial</p>
                      <p className="text-2xl font-bold">{formatCurrency(cashRegister.initialAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total de Vendas</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(cashRegister.totalSales)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Esperado</p>
                      <p className="text-2xl font-bold">{formatCurrency(cashRegister.initialAmount + cashRegister.totalSales)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-600">Aberto em: {formatDate(new Date(cashRegister.openedAt))}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Histórico de Caixas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {LocalStorage.get<CashRegister>('cashRegisters')
                    .filter(register => !register.isOpen)
                    .slice(-10)
                    .reverse()
                    .map(register => (
                      <div key={register.id} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Período</p>
                            <p className="font-medium">
                              {formatDate(new Date(register.openedAt))}
                            </p>
                            {register.closedAt && (
                              <p className="text-sm text-gray-500">
                                até {formatDate(new Date(register.closedAt))}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Inicial</p>
                            <p className="font-medium">{formatCurrency(register.initialAmount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Vendas</p>
                            <p className="font-medium text-green-600">{formatCurrency(register.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Final</p>
                            <p className="font-medium">
                              {register.finalAmount ? formatCurrency(register.finalAmount) : 'N/A'}
                            </p>
                            {register.finalAmount && (
                              <p className={`text-sm ${
                                register.finalAmount === (register.initialAmount + register.totalSales)
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                Diferença: {formatCurrency(register.finalAmount - (register.initialAmount + register.totalSales))}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Relatórios */}
        {currentView === 'reports' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Relatórios</h2>
              <div className="flex space-x-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-md"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border rounded-md"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={2024 - i}>
                      {2024 - i}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Receita do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatCurrency(monthlyRevenue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vendas do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {monthlySalesCount}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {formatCurrency(monthlySalesCount > 0 ? monthlyRevenue / monthlySalesCount : 0)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vendas Detalhadas do Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Data
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Itens
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Total
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Pagamento
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {monthlyData.map(sale => (
                        <tr key={sale.id}>
                          <td className="px-4 py-2 text-sm">
                            {formatDate(new Date(sale.createdAt))}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {sale.items.length} item(s)
                          </td>
                          <td className="px-4 py-2 text-sm font-medium">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {sale.paymentMethod === 'cash' ? 'Dinheiro' :
                             sale.paymentMethod === 'card' ? 'Cartão' : 'PIX'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Funcionários */}
        {currentView === 'employees' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gerenciar Funcionários</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Funcionário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Nome completo"
                      value={employeeForm.name || ''}
                      onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={employeeForm.email || ''}
                      onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                    />
                    <select
                      value={employeeForm.role || ''}
                      onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value as 'admin' | 'cashier' | 'manager'})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Selecione a função</option>
                      <option value="cashier">Operador de Caixa</option>
                      <option value="manager">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveEmployee}>
                      {editingEmployee ? 'Atualizar' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Funcionário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Função
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data de Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map(employee => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {employee.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {employee.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {employee.role === 'admin' ? 'Administrador' :
                             employee.role === 'manager' ? 'Gerente' : 'Operador de Caixa'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              employee.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateOnly(new Date(employee.createdAt))}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEmployeeForm(employee);
                                    setEditingEmployee(employee.id);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Editar Funcionário</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Input
                                    placeholder="Nome completo"
                                    value={employeeForm.name || ''}
                                    onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                                  />
                                  <Input
                                    type="email"
                                    placeholder="Email"
                                    value={employeeForm.email || ''}
                                    onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                                  />
                                  <select
                                    value={employeeForm.role || ''}
                                    onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value as 'admin' | 'cashier' | 'manager'})}
                                    className="w-full px-3 py-2 border rounded-md"
                                  >
                                    <option value="">Selecione a função</option>
                                    <option value="cashier">Operador de Caixa</option>
                                    <option value="manager">Gerente</option>
                                    <option value="admin">Administrador</option>
                                  </select>
                                </div>
                                <DialogFooter>
                                  <Button onClick={handleSaveEmployee}>
                                    Atualizar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            {employee.id !== 'admin' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteEmployee(employee.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}