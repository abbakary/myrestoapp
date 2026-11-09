import React, { createContext, useContext, useState, useMemo } from 'react';
import {
  RestaurantTenant,
  MenuItem,
  Table,
  Waiter,
  Employee,
  Ingredient,
  Recipe,
  Order,
  OrderStatus,
  OrderType,
  PaymentMethod,
  Role,
  ModifierItem,
  StockMovement,
} from '../types/restaurant';
import {
  INITIAL_TENANTS,
  INITIAL_WAITERS,
  INITIAL_MENU_ITEMS,
  INITIAL_TABLES,
  INITIAL_ORDERS,
  INITIAL_INGREDIENTS,
  INITIAL_RECIPES,
  INITIAL_EMPLOYEES,
  INITIAL_STOCK_MOVEMENTS,
} from '../data/mockData';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedPortion?: { name: string; priceDelta: number };
  selectedModifiers: ModifierItem[];
  customerNotes?: string;
}

interface RestaurantContextType {
  tenants: RestaurantTenant[];
  currentTenant: RestaurantTenant;
  setCurrentTenantId: (tenantId: string) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  activeWaiterId: string;
  setActiveWaiterId: (id: string) => void;
  currency: 'TZS' | 'USD';
  toggleCurrency: () => void;
  formatMoney: (amountInTzs: number) => string;
  orders: Order[];
  tables: Table[];
  menuItems: MenuItem[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  waiters: Waiter[];
  employees: Employee[];
  cart: CartItem[];
  stockMovements: StockMovement[];
  activeReferralCode: string | null;
  setReferralCode: (code: string | null) => void;
  addToCart: (
    item: MenuItem,
    portion?: { name: string; priceDelta: number },
    modifiers?: ModifierItem[],
    notes?: string,
    quantity?: number
  ) => void;
  updateCartItemQty: (index: number, delta: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  submitOrder: (params: {
    type: OrderType;
    tableNumber?: string;
    customerName: string;
    customerPhone?: string;
    deliveryAddress?: string;
    paymentMethod?: PaymentMethod;
    referralWaiterId?: string;
    servingWaiterId?: string;
    notes?: string;
    markAsPaid?: boolean;
    discount?: number;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
    tax?: number;
    taxRate?: number;
    isTaxExempt?: boolean;
    deliveryFee?: number;
    donation?: number;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderItemStatus: (orderId: string, itemIndex: number, itemStatus: 'pending' | 'preparing' | 'ready') => void;
  processPayment: (orderId: string, method: PaymentMethod, amount: number) => void;
  updateTableStatus: (tableId: string, status: Table['status'], waiterId?: string) => void;
  addTable: (table: Omit<Table, 'id'>) => Table;
  updateTable: (table: Table) => void;
  deleteTable: (tableId: string) => void;
  releaseTable: (tableId: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => MenuItem;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (itemId: string) => void;
  toggleMenuItemAvailability: (itemId: string) => void;
  updateStock: (ingredientId: string, deltaUnits: number) => void;
  recordStockIntake: (
    ingredientId: string,
    quantityUnits: number,
    cost: number,
    supplier: string,
    invoiceRef: string
  ) => void;
  recordWastage: (ingredientId: string, quantityUnits: number, reason: string) => void;
  addNewIngredient: (ingredient: Omit<Ingredient, 'id'>) => Ingredient;
  addAdvanceRequest: (employeeId: string, amount: number, reason: string) => void;
  approveAdvance: (employeeId: string, advanceId: string) => void;
  calculateWaiterStats: (waiterId: string) => {
    myOrders: Order[];
    todaySales: number;
    pendingOrdersCount: number;
    completedOrdersCount: number;
    earnedCommission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  cashierShift: {
    isOpen: boolean;
    openedAt: string;
    openingCash: number;
    cashSales: number;
    mpesaSales: number;
    cardSales: number;
    expectedCash: number;
  };
  soundAlertTriggered: boolean;
  dismissSoundAlert: () => void;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants] = useState<RestaurantTenant[]>(INITIAL_TENANTS);
  const [currentTenantId, setCurrentTenantId] = useState<string>('tenant-savanna');
  const [activeRole, setActiveRole] = useState<Role>('owner');
  const [activeWaiterId, setActiveWaiterId] = useState<string>('waiter-john');
  const [currency, setCurrency] = useState<'TZS' | 'USD'>('TZS');
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>('WAITER_JOHN');

  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [recipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [waiters] = useState<Waiter[]>(INITIAL_WAITERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [soundAlertTriggered, setSoundAlertTriggered] = useState<boolean>(false);

  const [cashierShift, setCashierShift] = useState({
    isOpen: true,
    openedAt: '08:00 AM',
    openingCash: 150000,
    cashSales: 67080,
    mpesaSales: 114740,
    cardSales: 0,
    expectedCash: 217080,
  });

  const currentTenant = useMemo(() => {
    return tenants.find((t) => t.id === currentTenantId) || tenants[0];
  }, [tenants, currentTenantId]);

  const toggleCurrency = () => {
    setCurrency((prev) => (prev === 'TZS' ? 'USD' : 'TZS'));
  };

  const formatMoney = (amountInTzs: number) => {
    if (currency === 'USD') {
      const usdValue = amountInTzs / currentTenant.currencyRate;
      return `$${usdValue.toFixed(2)}`;
    }
    return `TZS ${amountInTzs.toLocaleString()}`;
  };

  // Cart operations
  const addToCart = (
    item: MenuItem,
    portion?: { name: string; priceDelta: number },
    modifiers: ModifierItem[] = [],
    notes: string = '',
    quantity: number = 1
  ) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (ci) =>
          ci.menuItem.id === item.id &&
          ci.selectedPortion?.name === portion?.name &&
          ci.customerNotes === notes &&
          JSON.stringify(ci.selectedModifiers) === JSON.stringify(modifiers)
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [
        ...prev,
        {
          menuItem: item,
          quantity,
          selectedPortion: portion,
          selectedModifiers: modifiers,
          customerNotes: notes,
        },
      ];
    });
  };

  const updateCartItemQty = (index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Deduct ingredients and record movement
  const deductIngredientsForOrder = (orderItems: CartItem[], orderNum: string) => {
    const newMovements: StockMovement[] = [];

    setIngredients((prevIngredients) => {
      const updated = [...prevIngredients];
      orderItems.forEach((ci) => {
        const recipe = recipes.find((r) => r.menuItemId === ci.menuItem.id);
        if (recipe) {
          recipe.ingredients.forEach((ri) => {
            const ingIndex = updated.findIndex((ing) => ing.id === ri.ingredientId);
            if (ingIndex > -1) {
              const deduction = ri.quantity * ci.quantity;
              const ing = updated[ingIndex];
              const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
              updated[ingIndex] = {
                ...ing,
                currentStockUnits: Math.max(0, ing.currentStockUnits - deduction),
              };

              newMovements.push({
                id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                ingredientId: ing.id,
                ingredientName: ing.name,
                type: 'kitchen_consumption',
                quantityDelta: -deduction,
                unit: ing.consumptionUnit,
                costImpact: Math.round(unitCost * deduction),
                date: new Date().toISOString().split('T')[0],
                reference: `Order ${orderNum}`,
                reason: `Kitchen consumption for ${ci.quantity}x ${ci.menuItem.name}`,
                recordedBy: 'Auto Kitchen BOM Engine',
              });
            }
          });
        }
      });
      return updated;
    });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }
  };

  const submitOrder = (params: {
    type: OrderType;
    tableNumber?: string;
    customerName: string;
    customerPhone?: string;
    deliveryAddress?: string;
    paymentMethod?: PaymentMethod;
    referralWaiterId?: string;
    servingWaiterId?: string;
    notes?: string;
    markAsPaid?: boolean;
    discount?: number;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
    tax?: number;
    taxRate?: number;
    isTaxExempt?: boolean;
    deliveryFee?: number;
    donation?: number;
  }) => {
    let subtotal = 0;
    const items = cart.map((ci) => {
      const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
      const modifiersSum = ci.selectedModifiers.reduce((acc, m) => acc + m.price, 0);
      const totalItemPrice = unitPrice + modifiersSum;
      subtotal += totalItemPrice * ci.quantity;

      return {
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        price: totalItemPrice,
        quantity: ci.quantity,
        portion: ci.selectedPortion?.name,
        selectedModifiers: ci.selectedModifiers,
        customerNotes: ci.customerNotes,
        station: ci.menuItem.station,
        status: 'pending' as const,
      };
    });

    // Discount calculation
    const discountAmount = Math.max(0, Math.min(subtotal, Math.round(params.discount ?? 0)));
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    // Tax calculation: if isTaxExempt is true or tax is explicitly 0, tax is 0. Otherwise use params.tax or standard rate on discountedSubtotal.
    let tax = 0;
    if (!params.isTaxExempt) {
      if (params.tax !== undefined) {
        tax = Math.max(0, Math.round(params.tax));
      } else {
        const rate = params.taxRate !== undefined ? params.taxRate : currentTenant.taxRate;
        tax = Math.round(discountedSubtotal * rate);
      }
    }

    // Delivery fee: use custom params.deliveryFee if provided, else if delivery order default to tenant standard delivery fee, else 0
    let deliveryFee = 0;
    if (params.type === 'delivery') {
      deliveryFee = params.deliveryFee !== undefined ? Math.max(0, Math.round(params.deliveryFee)) : currentTenant.deliveryFee;
    }
    const donation = params.donation !== undefined ? params.donation : 0;
    const total = Math.max(0, discountedSubtotal + tax + deliveryFee + donation);

    const nextOrderNum = `#F00${orders.length + 27}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: nextOrderNum,
      tenantId: currentTenant.id,
      type: params.type,
      tableNumber: params.tableNumber,
      customerName: params.customerName || 'Guest Customer',
      customerPhone: params.customerPhone,
      deliveryAddress: params.deliveryAddress,
      items,
      status: 'sent_to_kitchen',
      paymentStatus: params.markAsPaid ? 'paid' : 'unpaid',
      paymentMethod: params.paymentMethod,
      referralWaiterId: params.referralWaiterId || (activeReferralCode ? 'waiter-john' : undefined),
      servingWaiterId: params.servingWaiterId,
      subtotal,
      discount: discountAmount,
      discountType: params.discountType,
      discountValue: params.discountValue,
      discountReason: params.discountReason,
      tax,
      taxRate: params.isTaxExempt ? 0 : (params.taxRate ?? currentTenant.taxRate),
      isTaxExempt: params.isTaxExempt ?? false,
      deliveryFee,
      donation,
      total,
      paidAmount: params.markAsPaid ? total : 0,
      notes: params.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Update table status if dine-in
    if (params.type === 'dine_in' && params.tableNumber) {
      setTables((prev) =>
        prev.map((t) =>
          t.number.toLowerCase() === params.tableNumber?.toLowerCase()
            ? { ...t, status: 'occupied', currentOrderId: newOrder.id, assignedWaiterId: params.servingWaiterId }
            : t
        )
      );
    }

    // Deduct theoretical recipe inventory
    deductIngredientsForOrder(cart, nextOrderNum);

    // Clear cart and trigger sound alert
    clearCart();
    setSoundAlertTriggered(true);

    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          let updatedItems = ord.items;
          if (status === 'ready') {
            updatedItems = ord.items.map((it) => ({ ...it, status: 'ready' }));
          } else if (status === 'preparing') {
            updatedItems = ord.items.map((it) => ({
              ...it,
              status: it.status === 'pending' ? 'preparing' : it.status,
            }));
          }
          return {
            ...ord,
            status,
            items: updatedItems,
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );

    // Release table if completed or cancelled
    if (status === 'completed' || status === 'cancelled') {
      const order = orders.find((o) => o.id === orderId);
      if (order?.tableNumber) {
        setTables((prev) =>
          prev.map((t) =>
            t.number.toLowerCase() === order.tableNumber?.toLowerCase()
              ? { ...t, status: 'available', currentOrderId: undefined }
              : t
          )
        );
      }
    }
  };

  const updateOrderItemStatus = (
    orderId: string,
    itemIndex: number,
    itemStatus: 'pending' | 'preparing' | 'ready'
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedItems = [...ord.items];
          if (updatedItems[itemIndex]) {
            updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: itemStatus };
          }
          const allReady = updatedItems.every((it) => it.status === 'ready');
          const anyPreparing = updatedItems.some((it) => it.status === 'preparing');
          const newOrderStatus = allReady
            ? 'ready'
            : anyPreparing
            ? 'preparing'
            : ord.status;

          return {
            ...ord,
            items: updatedItems,
            status: newOrderStatus,
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );
  };

  const processPayment = (orderId: string, method: PaymentMethod, amount: number) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const newPaidAmount = (ord.paidAmount || 0) + amount;
          const isFullyPaid = newPaidAmount >= ord.total;
          return {
            ...ord,
            paymentStatus: isFullyPaid ? 'paid' : 'partial',
            paymentMethod: method,
            paidAmount: newPaidAmount,
            status: isFullyPaid && ord.status === 'ready' ? 'served' : ord.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return ord;
      })
    );

    setCashierShift((prev) => {
      const isCash = method === 'cash';
      const isMpesa = method === 'mpesa' || method === 'airtel';
      const isCard = method === 'card';
      return {
        ...prev,
        cashSales: isCash ? prev.cashSales + amount : prev.cashSales,
        mpesaSales: isMpesa ? prev.mpesaSales + amount : prev.mpesaSales,
        cardSales: isCard ? prev.cardSales + amount : prev.cardSales,
        expectedCash: isCash ? prev.expectedCash + amount : prev.expectedCash,
      };
    });
  };

  // Table Management
  const updateTableStatus = (tableId: string, status: Table['status'], waiterId?: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status, assignedWaiterId: waiterId ?? t.assignedWaiterId } : t))
    );
  };

  const addTable = (newTableData: Omit<Table, 'id'>) => {
    const newTable: Table = {
      ...newTableData,
      id: `tbl-${Date.now()}`,
    };
    setTables((prev) => [...prev, newTable]);
    return newTable;
  };

  const updateTable = (updatedTable: Table) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
  };

  const deleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
  };

  const releaseTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: 'available', currentOrderId: undefined }
          : t
      )
    );
  };

  // Menu Management
  const addMenuItem = (itemData: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...itemData,
      id: `menu-${Date.now()}`,
    };
    setMenuItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const updateMenuItem = (updatedItem: MenuItem) => {
    setMenuItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
  };

  const deleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const toggleMenuItemAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i))
    );
  };

  // Inventory Management & Stock Intake
  const updateStock = (ingredientId: string, deltaUnits: number) => {
    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === ingredientId
          ? { ...ing, currentStockUnits: Math.max(0, ing.currentStockUnits + deltaUnits) }
          : ing
      )
    );
  };

  const recordStockIntake = (
    ingredientId: string,
    quantityUnits: number,
    cost: number,
    supplier: string,
    invoiceRef: string
  ) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    // Increment inventory stock
    updateStock(ingredientId, quantityUnits);

    // Record formal Stock Movement
    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      ingredientId,
      ingredientName: ing.name,
      type: 'purchase_intake',
      quantityDelta: quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: cost,
      date: new Date().toISOString().split('T')[0],
      reference: invoiceRef || `PO-${Math.floor(10000 + Math.random() * 90000)}`,
      reason: `Received from ${supplier || ing.supplier}`,
      recordedBy: 'David Kasambala (Manager)',
    };

    setStockMovements((prev) => [movement, ...prev]);
  };

  const recordWastage = (ingredientId: string, quantityUnits: number, reason: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    // Decrement stock
    updateStock(ingredientId, -quantityUnits);

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      ingredientId,
      ingredientName: ing.name,
      type: 'wastage_spoilage',
      quantityDelta: -quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: Math.round(unitCost * quantityUnits),
      date: new Date().toISOString().split('T')[0],
      reference: `WST-${Math.floor(1000 + Math.random() * 9000)}`,
      reason: reason || 'Kitchen prep waste or spoilage',
      recordedBy: 'David Kasambala (Manager)',
    };

    setStockMovements((prev) => [movement, ...prev]);
  };

  const addNewIngredient = (ingData: Omit<Ingredient, 'id'>) => {
    const newIng: Ingredient = {
      ...ingData,
      id: `ing-${Date.now()}`,
    };
    setIngredients((prev) => [...prev, newIng]);

    // Log opening balance movement
    if (newIng.currentStockUnits > 0) {
      const movement: StockMovement = {
        id: `sm-${Date.now()}`,
        ingredientId: newIng.id,
        ingredientName: newIng.name,
        type: 'purchase_intake',
        quantityDelta: newIng.currentStockUnits,
        unit: newIng.consumptionUnit,
        costImpact: Math.round(
          (newIng.costPerPurchaseUnit / newIng.conversionRatio) * newIng.currentStockUnits
        ),
        date: new Date().toISOString().split('T')[0],
        reference: 'Initial Opening Balance',
        reason: 'New raw ingredient catalogued',
        recordedBy: 'David Kasambala (Manager)',
      };
      setStockMovements((prev) => [movement, ...prev]);
    }

    return newIng;
  };

  // Staff Advances & Waiter Stats
  const addAdvanceRequest = (employeeId: string, amount: number, reason: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              advances: [
                ...emp.advances,
                {
                  id: `adv-${Date.now()}`,
                  amount,
                  date: new Date().toISOString().split('T')[0],
                  approved: true,
                  reason,
                },
              ],
            }
          : emp
      )
    );
  };

  const approveAdvance = (employeeId: string, advanceId: string) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === employeeId
          ? {
              ...emp,
              advances: emp.advances.map((a) => (a.id === advanceId ? { ...a, approved: true } : a)),
            }
          : emp
      )
    );
  };

  const calculateWaiterStats = (waiterId: string) => {
    const waiter = waiters.find((w) => w.id === waiterId);
    const rate = waiter?.commissionRate || 0.05;

    const myOrders = orders.filter(
      (o) => o.referralWaiterId === waiterId || o.servingWaiterId === waiterId
    );

    const completedOrders = myOrders.filter(
      (o) => o.status === 'completed' || o.paymentStatus === 'paid'
    );
    const todaySales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);

    const pendingOrdersCount = myOrders.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled'
    ).length;

    const completedOrdersCount = completedOrders.length;
    const earnedCommission = Math.round(todaySales * rate);
    const paidCommission = 45000;
    const pendingCommission = Math.max(0, earnedCommission - paidCommission);

    return {
      myOrders,
      todaySales,
      pendingOrdersCount,
      completedOrdersCount,
      earnedCommission,
      pendingCommission,
      paidCommission,
    };
  };

  const dismissSoundAlert = () => setSoundAlertTriggered(false);

  return (
    <RestaurantContext.Provider
      value={{
        tenants,
        currentTenant,
        setCurrentTenantId,
        activeRole,
        setActiveRole,
        activeWaiterId,
        setActiveWaiterId,
        currency,
        toggleCurrency,
        formatMoney,
        orders,
        tables,
        menuItems,
        ingredients,
        recipes,
        waiters,
        employees,
        cart,
        stockMovements,
        activeReferralCode,
        setReferralCode: setActiveReferralCode,
        addToCart,
        updateCartItemQty,
        removeFromCart,
        clearCart,
        submitOrder,
        updateOrderStatus,
        updateOrderItemStatus,
        processPayment,
        updateTableStatus,
        addTable,
        updateTable,
        deleteTable,
        releaseTable,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        toggleMenuItemAvailability,
        updateStock,
        recordStockIntake,
        recordWastage,
        addNewIngredient,
        addAdvanceRequest,
        approveAdvance,
        calculateWaiterStats,
        cashierShift,
        soundAlertTriggered,
        dismissSoundAlert,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};
