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
  BlockedCookingAttempt,
  DailyReconciliationItem,
  RecipeVersionHistoryItem,
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
  INITIAL_BLOCKED_ATTEMPTS,
  INITIAL_DAILY_RECONCILIATION,
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
    requireKitchenConfirmation?: boolean;
  }) => boolean;
  confirmStockTransferReceipt: (movementId: string, receivedBy?: string) => boolean;
  rejectStockTransfer: (movementId: string, reason?: string) => boolean;
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
  blockedCookingAttempts: BlockedCookingAttempt[];
  logBlockedCookingAttempt: (attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>) => void;
  dailyReconciliations: DailyReconciliationItem[];
  updateDailyReconciliationCount: (ingredientId: string, actualCount: number, notes?: string) => void;
  commitDailyReconciliation: (staffName?: string) => { success: boolean; totalVarianceCost: number };
  handleLeftoverPreparedPlates: (
    menuItemId: string,
    platesCount: number,
    action: 'return_to_store' | 'log_as_waste',
    reason?: string
  ) => boolean;
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
  const [blockedCookingAttempts, setBlockedCookingAttempts] = useState<BlockedCookingAttempt[]>(INITIAL_BLOCKED_ATTEMPTS);
  const [dailyReconciliations, setDailyReconciliations] = useState<DailyReconciliationItem[]>(INITIAL_DAILY_RECONCILIATION);
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
    requireKitchenConfirmation?: boolean;
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

    const isToKitchen = params.toLocation === 'kitchen' && params.fromLocation === 'main_store';
    // If transferring from Main Store to Kitchen, if requireKitchenConfirmation is set or true, treat as in_transit
    const needsConfirmation = isToKitchen && (params.requireKitchenConfirmation ?? false);

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === params.ingredientId) {
          let sStock = item.storeStockUnits ?? Math.max(0, item.currentStockUnits - (item.kitchenStockUnits ?? 0));
          let kStock = item.kitchenStockUnits ?? 0;

          if (isToKitchen) {
            sStock -= params.quantityUnits;
            // Only add to kitchen stock if confirmation is not required
            if (!needsConfirmation) {
              kStock += params.quantityUnits;
            }
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
      transferStatus: needsConfirmation ? 'in_transit' : 'received',
      receivedAt: needsConfirmation ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      receivedBy: needsConfirmation ? undefined : 'Kitchen Floor Staff',
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: needsConfirmation
        ? 'Requisition Dispatched (In Transit)'
        : isToKitchen
        ? 'Stock Issued to Kitchen'
        : 'Stock Returned to Store',
      message: needsConfirmation
        ? `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} is in transit to Kitchen. Awaiting kitchen receipt confirmation.`
        : `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} ${isToKitchen ? 'transferred to Kitchen for day operations' : 'returned from Kitchen to Store'}.`,
      type: 'transfer',
      actionRole: needsConfirmation ? 'kitchen' : 'manager',
      actionLabel: needsConfirmation ? 'Confirm Kitchen Receipt' : 'View Stock Balances',
    });

    return true;
  };

  // Kitchen Receipt Confirmation: Stock only counts once kitchen confirms receiving it!
  const confirmStockTransferReceipt = (movementId: string, receivedBy: string = 'Chef Hamisi Juma'): boolean => {
    const movement = stockMovements.find((m) => m.id === movementId);
    if (!movement || movement.transferStatus !== 'in_transit') return false;

    const ing = ingredients.find((i) => i.id === movement.ingredientId);
    if (!ing) return false;

    const transferQty = Math.abs(movement.quantityDelta);

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === movement.ingredientId) {
          const newKitchen = (item.kitchenStockUnits ?? 0) + transferQty;
          const sStock = item.storeStockUnits ?? 0;
          return {
            ...item,
            kitchenStockUnits: newKitchen,
            currentStockUnits: sStock + newKitchen,
          };
        }
        return item;
      })
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setStockMovements((prev) =>
      prev.map((m) =>
        m.id === movementId
          ? {
              ...m,
              transferStatus: 'received',
              receivedAt: nowTime,
              receivedBy,
            }
          : m
      )
    );

    addNotification({
      title: 'Kitchen Confirmed Stock Receipt',
      message: `${receivedBy} verified and accepted ${transferQty.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} onto Kitchen cooking line.`,
      type: 'transfer',
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    return true;
  };

  const rejectStockTransfer = (movementId: string, reason: string = 'Kitchen refused delivery or wrong specification'): boolean => {
    const movement = stockMovements.find((m) => m.id === movementId);
    if (!movement || movement.transferStatus !== 'in_transit') return false;

    const transferQty = Math.abs(movement.quantityDelta);

    // Revert back to main store
    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === movement.ingredientId) {
          const newStore = (item.storeStockUnits ?? 0) + transferQty;
          const kStock = item.kitchenStockUnits ?? 0;
          return {
            ...item,
            storeStockUnits: newStore,
            currentStockUnits: newStore + kStock,
          };
        }
        return item;
      })
    );

    setStockMovements((prev) =>
      prev.map((m) =>
        m.id === movementId
          ? {
              ...m,
              transferStatus: 'rejected',
              reason: `${m.reason} [REJECTED: ${reason}]`,
            }
          : m
      )
    );

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
      const index = prev.findIndex((r) => r.id === recipe.id || (recipe.menuItemId && r.menuItemId === recipe.menuItemId));
      let updatedRecipe = { ...recipe };

      if (index >= 0) {
        const existing = prev[index];
        // Archive existing version to history
        const historyItem: RecipeVersionHistoryItem = {
          version: existing.version || 1,
          changedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          changedBy: recipe.approvedBy || 'Executive Chef Juma',
          changeSummary: `Version ${existing.version || 1} archived upon update (${existing.ingredients?.length || 0} ingredients, ${existing.batchYieldPlates || 100} plates batch)`,
          batchYieldPlates: existing.batchYieldPlates || 100,
          ingredients: existing.ingredients || [],
          totalBatchCost: (existing.ingredients || []).reduce((s, ri) => {
            const ing = ingredients.find((i) => i.id === ri.ingredientId);
            const c = ing ? (ing.costPerPurchaseUnit / ing.conversionRatio) * (ri.batchQuantity ?? (ri.quantity * (existing.batchYieldPlates || 1))) : 0;
            return s + c;
          }, 0),
          costPerPlate: 0,
          foodCostPercentage: 0,
        };
        const prevHistory = existing.history || [];
        updatedRecipe.history = [historyItem, ...prevHistory];
        updatedRecipe.version = (existing.version || 1) + 1;

        const updated = [...prev];
        updated[index] = updatedRecipe;
        return updated;
      }
      return [updatedRecipe, ...prev];
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
      message: `Bill of Materials for "${recipe.name || 'Menu Dish'}" saved (v${recipe.version || 1}) with ${recipe.ingredients.length} ingredients linked.`,
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

      // Calculate in-transit quantity awaiting kitchen receipt confirmation
      const inTransitQty = stockMovements
        .filter((m) => m.ingredientId === ri.ingredientId && m.transferStatus === 'in_transit')
        .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

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
        inTransitQty,
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

    // If validation fails and not manager override -> BLOCK ATOMICALLY & LOG PROCESS AUDIT
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

      const timestampStr = `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`;
      const blockedAttempt: BlockedCookingAttempt = {
        id: `block-${Date.now()}`,
        recipeId: recipe.id,
        dishName: recipe.name || 'Dish',
        batches: params.batches,
        attemptedBy: params.chefName || 'Executive Chef Juma',
        timestamp: timestampStr,
        missingItems: validation.missingItems.filter((m) => m.status !== 'ok'),
        reason: `Cannot cook ${params.batches} batch of ${recipe.name}. Missing items: ${blockedReasons}`,
        resolution: 'requisition_created',
      };
      setBlockedCookingAttempts((prev) => [blockedAttempt, ...prev]);

      addNotification({
        title: 'Batch Cooking Blocked',
        message: `Attempt to cook ${recipe.name} blocked: raw ingredients not transferred to kitchen floor.`,
        type: 'kitchen',
        actionRole: 'manager',
        actionLabel: 'View Blocked Logs',
      });

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

  const logBlockedCookingAttempt = (attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>) => {
    const newAttempt: BlockedCookingAttempt = {
      ...attempt,
      id: `block-${Date.now()}`,
      timestamp: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
    };
    setBlockedCookingAttempts((prev) => [newAttempt, ...prev]);
  };

  const handleLeftoverPreparedPlates = (
    menuItemId: string,
    platesCount: number,
    action: 'return_to_store' | 'log_as_waste',
    reason?: string
  ): boolean => {
    const dish = preparedDishStocks.find((p) => p.menuItemId === menuItemId);
    if (!dish || platesCount <= 0 || platesCount > dish.preparedPlatesAvailable) {
      return false;
    }

    const recipe = recipes.find((r) => r.menuItemId === menuItemId);
    const cogsPerPlate = 2685;
    const totalImpact = Math.round(platesCount * cogsPerPlate);
    const today = new Date().toISOString().split('T')[0];

    setPreparedDishStocks((prev) =>
      prev.map((p) =>
        p.menuItemId === menuItemId
          ? {
              ...p,
              preparedPlatesAvailable: Math.max(0, p.preparedPlatesAvailable - platesCount),
              status: p.preparedPlatesAvailable - platesCount === 0 ? 'out_of_stock' : p.status,
            }
          : p
      )
    );

    if (action === 'log_as_waste') {
      const wasteMovement: StockMovement = {
        id: `sm-${Date.now()}-leftover`,
        ingredientId: recipe?.ingredients[0]?.ingredientId || 'ing-rice',
        ingredientName: `${dish.dishName} (Prepared Batch Food)`,
        type: 'wastage_spoilage',
        quantityDelta: -platesCount,
        unit: 'plates',
        costImpact: totalImpact,
        date: today,
        reference: `WST-LEFTOVER-${platesCount}P`,
        reason: reason || 'End-of-day unsold batch leftover discard',
        recordedBy: 'Executive Chef Juma',
        sourceLocation: 'kitchen',
      };
      setStockMovements((prev) => [wasteMovement, ...prev]);

      addNotification({
        title: 'Leftovers Logged as Waste',
        message: `${platesCount} unsold plates of ${dish.dishName} logged as waste (${formatMoney(totalImpact)} impact).`,
        type: 'stock',
        actionRole: 'manager',
        actionLabel: 'View Spoilage',
      });
    } else {
      addNotification({
        title: 'Leftovers Returned to Store',
        message: `${platesCount} plates of ${dish.dishName} chilled and returned to cold room buffer storage.`,
        type: 'transfer',
        actionRole: 'kitchen',
        actionLabel: 'View Prepared Plates',
      });
    }

    return true;
  };

  const updateDailyReconciliationCount = (ingredientId: string, actualCount: number, notes?: string) => {
    setDailyReconciliations((prev) =>
      prev.map((item) => {
        if (item.ingredientId === ingredientId) {
          const varianceQty = actualCount - item.expectedClosingStock;
          const ing = ingredients.find((i) => i.id === ingredientId);
          const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
          const varianceCost = Math.round(Math.abs(varianceQty) * unitCost);
          let varianceType: DailyReconciliationItem['varianceType'] = 'match';
          if (varianceQty < 0) {
            varianceType = Math.abs(varianceQty) > item.expectedClosingStock * 0.1 ? 'unaccounted_loss' : 'over_portioning';
          } else if (varianceQty > 0) {
            varianceType = 'surplus';
          }
          return {
            ...item,
            actualCountedStock: actualCount,
            varianceQty,
            varianceCost,
            varianceType,
            notes: notes !== undefined ? notes : item.notes,
          };
        }
        return item;
      })
    );
  };

  const commitDailyReconciliation = (staffName: string = 'David Kasambala (Manager)') => {
    let totalVariance = 0;
    const newMovements: StockMovement[] = [];
    const today = new Date().toISOString().split('T')[0];

    setDailyReconciliations((prev) =>
      prev.map((item) => {
        totalVariance += item.varianceCost;
        if (item.varianceQty < 0) {
          newMovements.push({
            id: `sm-${Date.now()}-${item.ingredientId}`,
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            type: 'wastage_spoilage',
            quantityDelta: item.varianceQty,
            unit: item.unit,
            costImpact: item.varianceCost,
            date: today,
            reference: `RECON-${today}`,
            reason: `Daily Kitchen Reconciliation: ${item.varianceType.replace(/_/g, ' ')} (${item.notes || 'Physical stock count variance'})`,
            recordedBy: staffName,
            sourceLocation: 'kitchen',
          });
        }
        return { ...item, status: 'reconciled' };
      })
    );

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    addNotification({
      title: 'Daily Stock Reconciliation Committed',
      message: `Reconciliation audit finalized by ${staffName}. Variance impact: ${formatMoney(totalVariance)}.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Audit Ledger',
    });

    return { success: true, totalVarianceCost: totalVariance };
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
        confirmStockTransferReceipt,
        rejectStockTransfer,
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
        blockedCookingAttempts,
        logBlockedCookingAttempt,
        dailyReconciliations,
        updateDailyReconciliationCount,
        commitDailyReconciliation,
        handleLeftoverPreparedPlates,
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
