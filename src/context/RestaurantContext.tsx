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
  AppNotification,
  BomAuditLog,
  ProductionLog,
  PreparedDishStock,
  MissingStockItem,
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
  INITIAL_NOTIFICATIONS,
  INITIAL_BOM_AUDIT_LOGS,
  INITIAL_PRODUCTION_LOGS,
  INITIAL_PREPARED_DISH_STOCKS,
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
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  transferStock: (params: {
    ingredientId: string;
    quantityUnits: number;
    fromLocation: 'main_store' | 'kitchen';
    toLocation: 'main_store' | 'kitchen';
    reason: string;
    shift?: string;
    recordedBy?: string;
  }) => boolean;
  returnAllKitchenStockToStore: (staffName?: string) => void;
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
  recordWastage: (
    ingredientId: string,
    quantityUnits: number,
    reason: string,
    location?: 'kitchen' | 'main_store'
  ) => void;
  addNewIngredient: (ingredient: Omit<Ingredient, 'id'>) => Ingredient;
  saveRecipe: (recipe: Recipe, auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>) => void;
  deleteRecipe: (recipeId: string) => void;
  bomAuditLogs: BomAuditLog[];
  productionLogs: ProductionLog[];
  preparedDishStocks: PreparedDishStock[];
  validateBatchKitchenStock: (recipeId: string, batches: number) => {
    canCook: boolean;
    missingItems: MissingStockItem[];
    totalCost: number;
    targetYieldPlates: number;
  };
  cookBatchProduction: (params: {
    recipeId: string;
    batches: number;
    actualPlatesProduced?: number;
    chefName?: string;
    managerOverride?: boolean;
    overrideReason?: string;
  }) => { success: boolean; error?: string; log?: ProductionLog };
  createRequisitionForMissing: (missingItems: MissingStockItem[], shift?: string) => boolean;
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
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [bomAuditLogs, setBomAuditLogs] = useState<BomAuditLog[]>(INITIAL_BOM_AUDIT_LOGS);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(INITIAL_PRODUCTION_LOGS);
  const [preparedDishStocks, setPreparedDishStocks] = useState<PreparedDishStock[]>(INITIAL_PREPARED_DISH_STOCKS);
  const [waiters, setWaiters] = useState<Waiter[]>(INITIAL_WAITERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [soundAlertTriggered, setSoundAlertTriggered] = useState<boolean>(false);

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

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

  // Deduct ingredients from kitchen stock (and store if needed)
  const deductIngredientsForOrder = (orderItems: CartItem[], orderNum: string) => {
    const newMovements: StockMovement[] = [];
    const lowKitchenAlerts: string[] = [];

    setIngredients((prevIngredients) => {
      const updated = [...prevIngredients];
      orderItems.forEach((ci) => {
        const recipe = recipes.find((r) => r.menuItemId === ci.menuItem.id);
        if (recipe && recipe.cookingMethod === 'batch_cooking') {
          // Dish is cooked in advance batches: raw stock was already deducted at cooking time!
          // Deduct from the live prepared plates pool
          setPreparedDishStocks((prev) =>
            prev.map((p) => {
              if (p.menuItemId === ci.menuItem.id) {
                const newAvailable = Math.max(0, p.preparedPlatesAvailable - ci.quantity);
                return {
                  ...p,
                  preparedPlatesAvailable: newAvailable,
                  totalSoldToday: p.totalSoldToday + ci.quantity,
                  status: newAvailable === 0 ? 'out_of_stock' : newAvailable <= 10 ? 'low' : 'ready',
                };
              }
              return p;
            })
          );
        } else if (recipe) {
          // Made-to-order: each sale deducts raw ingredients from kitchen floor stock
          recipe.ingredients.forEach((ri) => {
            const ingIndex = updated.findIndex((ing) => ing.id === ri.ingredientId);
            if (ingIndex > -1) {
              const deduction = ri.quantity * ci.quantity;
              const ing = updated[ingIndex];
              const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;

              // Primary deduction comes from active kitchenStockUnits
              let currentKitchen = ing.kitchenStockUnits ?? 0;
              let currentStore = ing.storeStockUnits ?? Math.max(0, ing.currentStockUnits - currentKitchen);

              let newKitchen = currentKitchen - deduction;
              let newStore = currentStore;

              if (newKitchen < 0) {
                // Kitchen floor was short — absorb deficit from main storage
                const deficit = -newKitchen;
                newStore = Math.max(0, currentStore - deficit);
                newKitchen = 0;
                lowKitchenAlerts.push(`${ing.name} (Kitchen line ran out, drawn from Store)`);
              } else if (newKitchen <= ing.minimumThreshold * 0.25) {
                lowKitchenAlerts.push(`${ing.name} (${newKitchen.toLocaleString()} ${ing.consumptionUnit} left in kitchen)`);
              }

              updated[ingIndex] = {
                ...ing,
                kitchenStockUnits: newKitchen,
                storeStockUnits: newStore,
                currentStockUnits: Math.max(0, newKitchen + newStore),
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
                sourceLocation: 'kitchen',
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

    if (lowKitchenAlerts.length > 0) {
      addNotification({
        title: 'Kitchen Line Stock Running Low',
        message: `Replenishment needed: ${lowKitchenAlerts.slice(0, 2).join('; ')}. Use Transfer Module to issue from Main Store.`,
        type: 'stock',
        actionRole: 'manager',
        actionLabel: 'Transfer Stock',
      });
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

    // Trigger Notification for new order
    addNotification({
      title: `New Order ${nextOrderNum}`,
      message: `${params.type === 'dine_in' ? `Table ${params.tableNumber}` : params.type.toUpperCase()} - ${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
      type: 'order',
      actionRole: 'kitchen',
      actionLabel: 'Open KDS Ticket',
    });

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

          if (status === 'ready' && ord.status !== 'ready') {
            addNotification({
              title: `Order Ready: ${ord.orderNumber}`,
              message: `${ord.tableNumber || ord.customerName} dishes are ready on the pass!`,
              type: 'kitchen',
              actionRole: 'cashier',
              actionLabel: 'View POS Counter',
            });
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
      prev.map((ing) => {
        if (ing.id === ingredientId) {
          const newTotal = Math.max(0, ing.currentStockUnits + deltaUnits);
          // By default adjust storeStockUnits
          const currentKitchen = ing.kitchenStockUnits ?? 0;
          const newStore = Math.max(0, newTotal - currentKitchen);
          return {
            ...ing,
            currentStockUnits: newTotal,
            storeStockUnits: newStore,
            kitchenStockUnits: currentKitchen,
          };
        }
        return ing;
      })
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

    // Delivery always lands into Main Store
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === ingredientId) {
          const updatedStore = (item.storeStockUnits ?? 0) + quantityUnits;
          const kStock = item.kitchenStockUnits ?? 0;
          return {
            ...item,
            storeStockUnits: updatedStore,
            kitchenStockUnits: kStock,
            currentStockUnits: updatedStore + kStock,
          };
        }
        return item;
      })
    );

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
      reason: `Received into Main Store from ${supplier || ing.supplier}`,
      recordedBy: 'David Kasambala (Manager)',
      destinationLocation: 'main_store',
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: 'Goods Received in Main Store',
      message: `+${quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} added to Main Storage.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Store Inventory',
    });
  };

  const recordWastage = (
    ingredientId: string,
    quantityUnits: number,
    reason: string,
    location: 'kitchen' | 'main_store' = 'kitchen'
  ) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === ingredientId) {
          let kStock = item.kitchenStockUnits ?? 0;
          let sStock = item.storeStockUnits ?? 0;

          if (location === 'kitchen') {
            kStock = Math.max(0, kStock - quantityUnits);
          } else {
            sStock = Math.max(0, sStock - quantityUnits);
          }

          return {
            ...item,
            kitchenStockUnits: kStock,
            storeStockUnits: sStock,
            currentStockUnits: kStock + sStock,
          };
        }
        return item;
      })
    );

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
      reason: reason || `${location === 'kitchen' ? 'Kitchen prep waste or line loss' : 'Main store humidity or spoilage'}`,
      recordedBy: 'David Kasambala (Manager)',
      sourceLocation: location,
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: 'Wastage Recorded',
      message: `${quantityUnits.toLocaleString()} ${ing.consumptionUnit} ${ing.name} logged as waste (${reason}) from ${location === 'kitchen' ? 'Kitchen' : 'Main Store'}.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Spoilage Log',
    });
  };

  // Stock Transfer between Main Store and Kitchen Floor
  const transferStock = (params: {
    ingredientId: string;
    quantityUnits: number;
    fromLocation: 'main_store' | 'kitchen';
    toLocation: 'main_store' | 'kitchen';
    reason: string;
    shift?: string;
    recordedBy?: string;
  }): boolean => {
    const ing = ingredients.find((i) => i.id === params.ingredientId);
    if (!ing) return false;

    const available =
      params.fromLocation === 'main_store'
        ? (ing.storeStockUnits ?? 0)
        : (ing.kitchenStockUnits ?? 0);

    if (params.quantityUnits <= 0 || params.quantityUnits > available) {
      return false;
    }

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === params.ingredientId) {
          let sStock = item.storeStockUnits ?? Math.max(0, item.currentStockUnits - (item.kitchenStockUnits ?? 0));
          let kStock = item.kitchenStockUnits ?? 0;

          if (params.fromLocation === 'main_store' && params.toLocation === 'kitchen') {
            sStock -= params.quantityUnits;
            kStock += params.quantityUnits;
          } else if (params.fromLocation === 'kitchen' && params.toLocation === 'main_store') {
            kStock -= params.quantityUnits;
            sStock += params.quantityUnits;
          }

          return {
            ...item,
            storeStockUnits: Math.max(0, sStock),
            kitchenStockUnits: Math.max(0, kStock),
            currentStockUnits: Math.max(0, sStock + kStock),
          };
        }
        return item;
      })
    );

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const isToKitchen = params.toLocation === 'kitchen';
    const movement: StockMovement = {
      id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'stock_transfer',
      quantityDelta: isToKitchen ? params.quantityUnits : -params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: Math.round(unitCost * params.quantityUnits),
      date: new Date().toISOString().split('T')[0],
      reference: isToKitchen
        ? `TRF-ISSUE-${Math.floor(1000 + Math.random() * 9000)}`
        : `TRF-RETURN-${Math.floor(1000 + Math.random() * 9000)}`,
      reason:
        params.reason ||
        (isToKitchen
          ? `Day operation prep requisition (${params.shift || 'Daily Shift'})`
          : 'End-of-day return from kitchen line to main storage'),
      recordedBy: params.recordedBy || 'David Kasambala (Manager)',
      sourceLocation: params.fromLocation,
      destinationLocation: params.toLocation,
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: isToKitchen ? 'Stock Issued to Kitchen' : 'Stock Returned to Store',
      message: `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} ${isToKitchen ? 'transferred to Kitchen for day operations' : 'returned from Kitchen to Store'}.`,
      type: 'transfer',
      actionRole: 'manager',
      actionLabel: 'View Stock Balances',
    });

    return true;
  };

  // End-of-day reconciliation: return all remaining kitchen stock back to store
  const returnAllKitchenStockToStore = (staffName?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newMovements: StockMovement[] = [];
    let itemsReturnedCount = 0;

    setIngredients((prev) => {
      return prev.map((ing) => {
        const kQty = ing.kitchenStockUnits ?? 0;
        if (kQty > 0) {
          itemsReturnedCount++;
          const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
          newMovements.push({
            id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ingredientId: ing.id,
            ingredientName: ing.name,
            type: 'stock_transfer',
            quantityDelta: -kQty,
            unit: ing.consumptionUnit,
            costImpact: Math.round(unitCost * kQty),
            date: today,
            reference: `TRF-CLOSE-${Math.floor(1000 + Math.random() * 9000)}`,
            reason: 'Daily Shift Close: All kitchen prep stock returned to Main Storage Room',
            recordedBy: staffName || 'David Kasambala (Manager)',
            sourceLocation: 'kitchen',
            destinationLocation: 'main_store',
          });

          return {
            ...ing,
            storeStockUnits: (ing.storeStockUnits ?? 0) + kQty,
            kitchenStockUnits: 0,
            currentStockUnits: (ing.storeStockUnits ?? 0) + kQty,
          };
        }
        return ing;
      });
    });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
      addNotification({
        title: 'Daily Shift Close Completed',
        message: `All ${itemsReturnedCount} kitchen ingredients reconciled and returned to Main Store for safe overnight storage.`,
        type: 'transfer',
        actionRole: 'manager',
        actionLabel: 'View Final Stock',
      });
    }
  };

  const addNewIngredient = (ingData: Omit<Ingredient, 'id'>) => {
    const sStock = ingData.storeStockUnits !== undefined ? ingData.storeStockUnits : ingData.currentStockUnits;
    const kStock = ingData.kitchenStockUnits !== undefined ? ingData.kitchenStockUnits : 0;
    const newIng: Ingredient = {
      ...ingData,
      id: `ing-${Date.now()}`,
      storeStockUnits: sStock,
      kitchenStockUnits: kStock,
      currentStockUnits: sStock + kStock,
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
        reason: 'New raw ingredient catalogued into Main Storage',
        recordedBy: 'David Kasambala (Manager)',
        destinationLocation: 'main_store',
      };
      setStockMovements((prev) => [movement, ...prev]);
    }

    addNotification({
      title: 'New Raw Ingredient Added',
      message: `${newIng.name} catalogued with ${newIng.currentStockUnits.toLocaleString()} ${newIng.consumptionUnit} initial stock.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    return newIng;
  };

  const saveRecipe = (recipe: Recipe, auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>) => {
    setRecipes((prev) => {
      const index = prev.findIndex((r) => r.id === recipe.id || r.menuItemId === recipe.menuItemId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = recipe;
        return updated;
      }
      return [recipe, ...prev];
    });

    // Link recipe to menu item
    if (recipe.menuItemId) {
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === recipe.menuItemId ? { ...item, recipeId: recipe.id } : item
        )
      );
    }

    // Save audit log
    if (auditLog) {
      const now = new Date();
      const dateStr = `${now.toISOString().split('T')[0]} ${now.toTimeString().substring(0, 5)}`;
      const newLog: BomAuditLog = {
        ...auditLog,
        id: `bom-log-${Date.now()}`,
        timestamp: dateStr,
      };
      setBomAuditLogs((prev) => [newLog, ...prev]);
    }

    addNotification({
      title: 'BOM Recipe Approved & Saved',
      message: `Bill of Materials for "${recipe.name || 'Menu Dish'}" saved to Master Menu (${recipe.ingredients.length} ingredients linked).`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Recipe BOM',
    });
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setMenuItems((prev) =>
      prev.map((item) => (item.recipeId === recipeId ? { ...item, recipeId: undefined } : item))
    );
  };

  // ATOMIC VALIDATION: Check Kitchen Stock Availability for Batch Cooking
  const validateBatchKitchenStock = (recipeId: string, batches: number = 1) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { canCook: false, missingItems: [], totalCost: 0, targetYieldPlates: 0 };
    }

    const multiplier = Math.max(0.1, batches);
    const targetYieldPlates = Math.round((recipe.batchYieldPlates || 100) * multiplier);
    let totalCost = 0;

    const missingItems: MissingStockItem[] = recipe.ingredients.map((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      const ingredientName = ing ? ing.name : 'Unknown Ingredient';
      const unit = ing ? ing.consumptionUnit : 'units';
      const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;

      // Base quantity calculation: batchQuantity or per-plate * batchYield
      const rawRequired = (ri.batchQuantity ?? (ri.quantity * (recipe.batchYieldPlates || 1))) * multiplier;
      const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);
      const requiredQty = Math.round(rawRequired / yieldFactor);

      const availableKitchenQty = ing?.kitchenStockUnits ?? 0;
      const storeAvailableQty = ing?.storeStockUnits ?? 0;

      totalCost += Math.round(requiredQty * unitCost);

      let status: 'not_transferred' | 'insufficient' | 'ok' = 'ok';
      let shortageQty = 0;

      if (availableKitchenQty <= 0) {
        status = 'not_transferred';
        shortageQty = requiredQty;
      } else if (availableKitchenQty < requiredQty) {
        status = 'insufficient';
        shortageQty = requiredQty - availableKitchenQty;
      }

      return {
        ingredientId: ri.ingredientId,
        ingredientName,
        requiredQty,
        availableKitchenQty,
        storeAvailableQty,
        unit,
        status,
        shortageQty,
      };
    });

    const canCook = missingItems.every((item) => item.status === 'ok');

    return {
      canCook,
      missingItems,
      totalCost,
      targetYieldPlates,
    };
  };

  // COOK BATCH PRODUCTION: All-or-nothing atomic deduction from Kitchen Stock
  const cookBatchProduction = (params: {
    recipeId: string;
    batches: number;
    actualPlatesProduced?: number;
    chefName?: string;
    managerOverride?: boolean;
    overrideReason?: string;
  }): { success: boolean; error?: string; log?: ProductionLog } => {
    const recipe = recipes.find((r) => r.id === params.recipeId);
    if (!recipe) return { success: false, error: 'Recipe not found in Master Data' };

    const validation = validateBatchKitchenStock(params.recipeId, params.batches);

    // If validation fails and not manager override -> BLOCK ATOMICALLY
    if (!validation.canCook && !params.managerOverride) {
      const blockedReasons = validation.missingItems
        .filter((m) => m.status !== 'ok')
        .map(
          (m) =>
            `${m.ingredientName}: required ${m.requiredQty.toLocaleString()} ${m.unit}, available ${m.availableKitchenQty.toLocaleString()} ${m.unit} (${
              m.status === 'not_transferred' ? 'not transferred to kitchen' : `short by ${m.shortageQty.toLocaleString()} ${m.unit}`
            })`
        )
        .join('; ');
      return {
        success: false,
        error: `Cannot cook ${params.batches} batch of ${recipe.name}. Missing items: ${blockedReasons}`,
      };
    }

    const actualPlates = params.actualPlatesProduced || validation.targetYieldPlates;
    const costPerPlate = actualPlates > 0 ? Math.round(validation.totalCost / actualPlates) : 0;
    const today = new Date().toISOString().split('T')[0];
    const timestampStr = `${today} ${new Date().toTimeString().substring(0, 5)}`;
    const consumedDetails: {
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      cost: number;
    }[] = [];
    const newMovements: StockMovement[] = [];

    // All-or-nothing: deduct each required line from kitchen stock
    setIngredients((prev) => {
      const copy = [...prev];
      validation.missingItems.forEach((req) => {
        const idx = copy.findIndex((ing) => ing.id === req.ingredientId);
        if (idx >= 0) {
          const ing = copy[idx];
          const kStock = Math.max(0, (ing.kitchenStockUnits ?? 0) - req.requiredQty);
          const sStock = ing.storeStockUnits ?? 0;
          const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
          const lineCost = Math.round(unitCost * req.requiredQty);

          consumedDetails.push({
            ingredientId: ing.id,
            ingredientName: ing.name,
            quantity: req.requiredQty,
            unit: ing.consumptionUnit,
            cost: lineCost,
          });

          copy[idx] = {
            ...ing,
            kitchenStockUnits: kStock,
            currentStockUnits: kStock + sStock,
          };

          newMovements.push({
            id: `sm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            ingredientId: ing.id,
            ingredientName: ing.name,
            type: 'kitchen_consumption',
            quantityDelta: -req.requiredQty,
            unit: ing.consumptionUnit,
            costImpact: lineCost,
            date: today,
            reference: `PROD-${actualPlates}P`,
            reason: `Batch cooking ${params.batches} batch (${actualPlates} plates) of ${recipe.name || 'Dish'}`,
            recordedBy: params.chefName || 'Executive Chef Juma',
            sourceLocation: 'kitchen',
          });
        }
      });
      return copy;
    });

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    // Save Production Log
    const newProdLog: ProductionLog = {
      id: `prod-${Date.now()}`,
      recipeId: recipe.id,
      menuItemId: recipe.menuItemId,
      dishName: recipe.name || 'Dish',
      batchesCooked: params.batches,
      targetYieldPlates: validation.targetYieldPlates,
      actualPlatesProduced: actualPlates,
      totalCost: validation.totalCost,
      costPerPlate,
      cookedBy: params.chefName || 'Executive Chef Juma',
      timestamp: timestampStr,
      remainingPlates: actualPlates,
      ingredientsConsumed: consumedDetails,
      managerOverride: params.managerOverride,
      overrideReason: params.overrideReason,
    };

    setProductionLogs((prev) => [newProdLog, ...prev]);

    // Update Prepared Dish Stock available pool
    setPreparedDishStocks((prev) => {
      const exists = prev.find((p) => p.menuItemId === recipe.menuItemId);
      if (exists) {
        return prev.map((p) =>
          p.menuItemId === recipe.menuItemId
            ? {
                ...p,
                preparedPlatesAvailable: p.preparedPlatesAvailable + actualPlates,
                totalCookedToday: p.totalCookedToday + actualPlates,
                lastCookedAt: timestampStr,
                status: 'ready',
              }
            : p
        );
      }
      return [
        {
          menuItemId: recipe.menuItemId,
          dishName: recipe.name || 'Dish',
          preparedPlatesAvailable: actualPlates,
          totalCookedToday: actualPlates,
          totalSoldToday: 0,
          lastCookedAt: timestampStr,
          status: 'ready',
        },
        ...prev,
      ];
    });

    addNotification({
      title: 'Batch Production Complete',
      message: `Cooked ${actualPlates} plates of ${recipe.name} (Unit COGS: ${formatMoney(costPerPlate)}/plate). Stock deducted from Kitchen.`,
      type: 'kitchen',
      actionRole: 'kitchen',
      actionLabel: 'View Prepared Plates',
    });

    return { success: true, log: newProdLog };
  };

  // One-Click Requisition for Missing Batch Ingredients (Store -> Kitchen)
  const createRequisitionForMissing = (missingItems: MissingStockItem[], shift: string = 'Daily Operation Prep'): boolean => {
    const shortages = missingItems.filter((m) => m.status !== 'ok');
    if (shortages.length === 0) return true;

    let transfersDone = 0;
    shortages.forEach((item) => {
      const availableInStore = item.storeAvailableQty;
      const transferQty = Math.min(item.shortageQty, availableInStore);

      if (transferQty > 0) {
        transferStock({
          ingredientId: item.ingredientId,
          quantityUnits: transferQty,
          fromLocation: 'main_store',
          toLocation: 'kitchen',
          reason: `Requisition for missing ${item.ingredientName} (short by ${item.shortageQty} ${item.unit})`,
          shift,
          recordedBy: 'Kitchen Requisition Engine',
        });
        transfersDone++;
      }
    });

    if (transfersDone > 0) {
      addNotification({
        title: 'Requisition Issued to Kitchen',
        message: `Transferred missing ingredients (${transfersDone} items) from Main Store to Kitchen Floor.`,
        type: 'transfer',
        actionRole: 'kitchen',
        actionLabel: 'Cook Batch',
      });
      return true;
    }
    return false;
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
        notifications,
        unreadNotificationCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotification,
        addNotification,
        transferStock,
        returnAllKitchenStockToStore,
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
        saveRecipe,
        deleteRecipe,
        bomAuditLogs,
        productionLogs,
        preparedDishStocks,
        validateBatchKitchenStock,
        cookBatchProduction,
        createRequisitionForMissing,
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
