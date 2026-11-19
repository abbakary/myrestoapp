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
  OrderStatusHistoryItem,
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
  CommissionMode,
  OrderItemStatus,
  PaymentTransaction,
  OrderAdjustment,
  ApprovalRequest,
  AuditLogEntry,
  DiscrepancyAlert,
  BomDeductionPolicy,
  StockBatchLot,
  SubRecipeStockBatch,
  OrderItem,
  MovementType,
  PayrollPaymentRecord,
  CommissionPayoutLog,
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
  INITIAL_AUDIT_LOGS,
  INITIAL_APPROVAL_REQUESTS,
  INITIAL_STOCK_LOTS,
  INITIAL_SUB_RECIPE_BATCHES,
} from '../data/mockData';
import { parseAppDeepLink, notifyFlutterHost } from '../utils/mobileEnvironment';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedPortion?: { name: string; priceDelta: number };
  selectedModifiers: ModifierItem[];
  customerNotes?: string;
  customInstructions?: string;
  extraCharge?: number;
  isCustomItem?: boolean;
}

interface RestaurantContextType {
  tenants: RestaurantTenant[];
  currentTenant: RestaurantTenant;
  setCurrentTenantId: (tenantId: string) => void;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  isStandalonePortal: boolean;
  initialTableNumber?: string;
  activeWaiterId: string;
  setActiveWaiterId: (id: string) => void;
  currency: 'TZS' | 'USD';
  toggleCurrency: () => void;
  formatMoney: (amountInTzs: number) => string;
  taxEnabled: boolean;
  setTaxEnabled: (enabled: boolean) => void;
  taxRatePct: number;
  setTaxRatePct: (ratePct: number) => void;
  defaultCommissionMode: CommissionMode;
  defaultCommissionValue: number;
  setDefaultCommissionPolicy: (mode: CommissionMode, value: number) => void;
  updateOrderCommission: (
    orderId: string,
    mode: CommissionMode,
    value: number,
    configuredBy?: string,
    waiterId?: string
  ) => void;
  getOrderCommission: (
    order: Order,
    waiterId?: string
  ) => {
    mode: CommissionMode;
    value: number;
    amount: number;
    isPaidEligible: boolean;
    configuredBy: string;
  };
  settleWaiterCommission: (
    waiterId: string,
    amount?: number,
    options?: { method?: 'cash' | 'mpesa' | 'bank_transfer'; reference?: string; settledBy?: string }
  ) => void;
  commissionPayouts: CommissionPayoutLog[];
  toggleWaiterActive: (waiterId: string) => void;
  assignOrderWaiter: (orderId: string, waiterId: string) => void;
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
    asDraft?: boolean;
    existingDraftId?: string;
    priority?: 'normal' | 'rush' | 'vip';
    discount?: number;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
    tax?: number;
    taxRate?: number;
    isTaxExempt?: boolean;
    deliveryFee?: number;
    donation?: number;
    customItems?: CartItem[];
    actorName?: string;
    actorRole?: Role;
  }) => Order;
  submitDraftToKitchen: (orderId: string, actorName?: string) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, actorName?: string, note?: string) => void;
  fastForwardOrderToServed: (orderId: string, actorName?: string) => boolean;
  updateOrderItemStatus: (orderId: string, itemIndex: number, itemStatus: OrderItemStatus, actorName?: string) => void;
  rejectOrderItem: (orderId: string, itemIndex: number, kitchenStaff: string, reason: string) => void;
  processPayment: (
    orderId: string,
    method: Exclude<PaymentMethod, 'split'>,
    amount: number,
    options?: { completeService?: boolean; collectedBy?: string; transactionRef?: string; isRefund?: boolean }
  ) => void;
  auditLogs: AuditLogEntry[];
  approvalRequests: ApprovalRequest[];
  discrepancies: DiscrepancyAlert[];
  requestApproval: (params: {
    orderId: string;
    actionType: ApprovalRequest['actionType'];
    requestedBy: string;
    requestedRole: Role;
    details: string;
    amountImpact: number;
    reason: string;
    payload?: ApprovalRequest['payload'];
  }) => ApprovalRequest;
  reviewApprovalRequest: (requestId: string, approve: boolean, managerName?: string) => void;
  cancelOrderControlled: (orderId: string, reason: string, actor: string, approvedBy?: string) => void;
  promoteCustomItemToMenu: (orderId: string, itemIndex: number, category?: string) => MenuItem | null;
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
    invoiceRef: string,
    expiryDate?: string
  ) => void;
  recordWastage: (
    ingredientId: string,
    quantityUnits: number,
    reason: string,
    location?: 'kitchen' | 'main_store'
  ) => void;
  recordDirectConsumption: (params: {
    ingredientId: string;
    quantityUnits: number;
    location: 'kitchen' | 'main_store';
    reason: string;
    recordedBy?: string;
  }) => boolean;
  addNewIngredient: (ingredient: Omit<Ingredient, 'id'>) => Ingredient;
  saveRecipe: (recipe: Recipe, auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>) => void;
  deleteRecipe: (recipeId: string) => void;
  bomDeductionPolicy: BomDeductionPolicy;
  setBomDeductionPolicy: (policy: BomDeductionPolicy) => void;
  stockLots: StockBatchLot[];
  subRecipeBatches: SubRecipeStockBatch[];
  computeRecipeUnitCost: (recipeId: string) => {
    batchCost: number;
    unitCost: number;
    perPlateCost: number;
  };
  bomAuditLogs: BomAuditLog[];
  productionLogs: ProductionLog[];
  preparedDishStocks: PreparedDishStock[];
  blockedCookingAttempts: BlockedCookingAttempt[];
  logBlockedCookingAttempt: (attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>) => void;
  dailyReconciliations: DailyReconciliationItem[];
  updateDailyReconciliationCount: (ingredientId: string, actualCount: number, notes?: string) => void;
  commitDailyReconciliation: (staffName?: string) => { success: boolean; totalVarianceCost: number };
  recomputeDailyVariance: () => void;
  handleLeftoverPreparedPlates: (
    menuItemId: string,
    platesCount: number,
    action: 'return_to_store' | 'log_as_waste',
    reason?: string
  ) => boolean;
  validateBatchKitchenStock: (
    recipeId: string,
    batches: number,
    actualInputs?: Record<string, number>
  ) => {
    canCook: boolean;
    missingItems: MissingStockItem[];
    totalCost: number;
    targetYieldPlates: number;
  };
  cookBatchProduction: (params: {
    recipeId: string;
    batches: number;
    actualPlatesProduced?: number;
    actualInputs?: Record<string, number>;
    chefName?: string;
    managerOverride?: boolean;
    overrideReason?: string;
  }) => { success: boolean; error?: string; log?: ProductionLog };
  reverseProductionBatch: (
    productionLogId: string,
    reason: string,
    actor?: string
  ) => { success: boolean; error?: string };
  createRequisitionForMissing: (missingItems: MissingStockItem[], shift?: string) => boolean;
  addAdvanceRequest: (
    employeeId: string,
    amount: number,
    reason: string,
    options?: { autoApprove?: boolean; repaymentMonth?: string; approvedBy?: string }
  ) => void;
  approveAdvance: (employeeId: string, advanceId: string, approvedBy?: string) => void;
  rejectAdvance: (employeeId: string, advanceId: string, reason?: string) => void;
  markAdvanceRepaid: (employeeId: string, advanceId: string) => void;
  updateAdvance: (employeeId: string, advanceId: string, amount: number, reason: string) => void;
  addEmployee: (emp: Omit<Employee, 'id' | 'employeeNumber' | 'advances'>) => Employee;
  updateEmployee: (employeeId: string, updates: Partial<Employee>) => void;
  payrollPayments: PayrollPaymentRecord[];
  calculateEmployeePayroll: (
    employeeId: string,
    period?: string
  ) => {
    basicSalary: number;
    allowances: number;
    commission: number;
    grossPay: number;
    nssfDeduction: number;
    payeTax: number;
    approvedAdvances: number;
    netPayable: number;
    isPaidForPeriod: boolean;
    paymentRecord?: PayrollPaymentRecord;
  };
  recordPayrollPayment: (params: {
    period: string;
    employeeIds: string[];
    method: 'bank_transfer' | 'mpesa' | 'cash';
    referencePrefix?: string;
    paidBy?: string;
  }) => PayrollPaymentRecord[];
  calculateWaiterStats: (waiterId: string) => {
    myOrders: Order[];
    todaySales: number;
    pendingOrdersCount: number;
    completedOrdersCount: number;
    unpaidOrdersCount: number;
    unpaidProjectedCommission: number;
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
  const [deepLink] = useState(() => parseAppDeepLink());
  const [tenants] = useState<RestaurantTenant[]>(INITIAL_TENANTS);
  const [currentTenantId, setCurrentTenantId] = useState<string>(() => {
    if (deepLink.tenantId && INITIAL_TENANTS.some((t) => t.id === deepLink.tenantId || t.slug === deepLink.tenantId)) {
      const found = INITIAL_TENANTS.find((t) => t.id === deepLink.tenantId || t.slug === deepLink.tenantId);
      return found ? found.id : 'tenant-savanna';
    }
    return 'tenant-savanna';
  });
  const [activeRole, setActiveRole] = useState<Role>(() => deepLink.portal ?? 'cashier');
  const [isStandalonePortal] = useState<boolean>(() => Boolean(deepLink.standalone));
  const [activeWaiterId, setActiveWaiterId] = useState<string>('waiter-john');
  const [currency, setCurrency] = useState<'TZS' | 'USD'>('TZS');
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [taxRatePct, setTaxRatePct] = useState<number>(18);
  const [defaultCommissionMode, setDefaultCommissionMode] = useState<CommissionMode>('percent');
  const [defaultCommissionValue, setDefaultCommissionValue] = useState<number>(5);
  const [settledCommissionByWaiter, setSettledCommissionByWaiter] = useState<Record<string, number>>({});
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>(() => deepLink.referralCode ?? 'WAITER_JOHN');

  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [tables, setTables] = useState<Table[]>(INITIAL_TABLES);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [ingredients, setIngredients] = useState<Ingredient[]>(INITIAL_INGREDIENTS);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [stockLots, setStockLots] = useState<StockBatchLot[]>(INITIAL_STOCK_LOTS);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  const [subRecipeBatches, setSubRecipeBatches] = useState<SubRecipeStockBatch[]>(INITIAL_SUB_RECIPE_BATCHES);
  const [bomDeductionPolicy, setBomDeductionPolicy] = useState<BomDeductionPolicy>('on_kitchen_start');
  const [bomAuditLogs, setBomAuditLogs] = useState<BomAuditLog[]>(INITIAL_BOM_AUDIT_LOGS);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>(INITIAL_PRODUCTION_LOGS);
  const [preparedDishStocks, setPreparedDishStocks] = useState<PreparedDishStock[]>(INITIAL_PREPARED_DISH_STOCKS);
  const [blockedCookingAttempts, setBlockedCookingAttempts] = useState<BlockedCookingAttempt[]>(INITIAL_BLOCKED_ATTEMPTS);
  const [dailyReconciliations, setDailyReconciliations] = useState<DailyReconciliationItem[]>(INITIAL_DAILY_RECONCILIATION);
  const [waiters, setWaiters] = useState<Waiter[]>(INITIAL_WAITERS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [payrollPayments, setPayrollPayments] = useState<PayrollPaymentRecord[]>([]);
  const [commissionPayouts, setCommissionPayouts] = useState<CommissionPayoutLog[]>([]);

  // Initialize cart empty when opened directly into Customer Portal, otherwise seed Cashier POS demo ticket
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (deepLink.portal === 'customer') return [];
    const findItem = (id: string, fallbackIdx: number) =>
      INITIAL_MENU_ITEMS.find((i) => i.id === id) || INITIAL_MENU_ITEMS[fallbackIdx];
    return [
      { menuItem: findItem('pos-pepperoni-pizza', 15), quantity: 1, selectedModifiers: [] },
      { menuItem: findItem('pos-caesar-salad', 16), quantity: 2, selectedModifiers: [] },
      { menuItem: findItem('pos-orange-juice', 17), quantity: 1, selectedModifiers: [] },
      { menuItem: findItem('pos-black-tea', 18), quantity: 1, selectedModifiers: [] },
      { menuItem: findItem('pos-sandwich', 19), quantity: 1, selectedModifiers: [] },
      { menuItem: findItem('pos-mango-dessert', 2), quantity: 2, selectedModifiers: [] },
    ];
  });
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(INITIAL_APPROVAL_REQUESTS);
  const [soundAlertTriggered, setSoundAlertTriggered] = useState<boolean>(false);

  const logAuditEvent = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newLog: AuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

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

  // Recursive / Sub-recipe-aware BOM Costing Helper (Live from Master Data + Sub-Recipe Batches)
  const computeRecipeUnitCost = (recipeId: string, visited: Set<string> = new Set()): {
    batchCost: number;
    unitCost: number;
    perPlateCost: number;
  } => {
    if (visited.has(recipeId)) return { batchCost: 0, unitCost: 0, perPlateCost: 0 };
    const nextVisited = new Set(visited);
    nextVisited.add(recipeId);

    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return { batchCost: 0, unitCost: 0, perPlateCost: 0 };

    const yieldQty = Math.max(1, recipe.batchYieldPlates || 1);
    let batchCost = 0;

    recipe.ingredients.forEach((ri) => {
      const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);
      if (ri.isSubRecipe && ri.subRecipeId) {
        const subQtyForBatch = ri.subRecipeQuantity ?? ri.batchQuantity ?? (ri.quantity * yieldQty);
        // Prefer active sub-recipe batch cost if available, else compute from sub-recipe BOM
        const activeSubBatches = subRecipeBatches.filter(
          (sb) => sb.subRecipeId === ri.subRecipeId && sb.status !== 'reversed' && sb.remainingQty > 0
        );
        const subUnitCost =
          activeSubBatches.length > 0
            ? activeSubBatches[0].costPerUnit
            : computeRecipeUnitCost(ri.subRecipeId, nextVisited).unitCost;
        batchCost += (subQtyForBatch / yieldFactor) * subUnitCost;
      } else {
        const ing = ingredients.find((i) => i.id === ri.ingredientId);
        if (ing && ing.conversionRatio > 0) {
          const ingUnitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
          const batchQty = ri.batchQuantity ?? (ri.quantity * yieldQty);
          batchCost += (batchQty / yieldFactor) * ingUnitCost;
        }
      }
    });

    const roundedBatch = Math.round(batchCost);
    const unitCost = batchCost / yieldQty;
    return {
      batchCost: roundedBatch,
      unitCost,
      perPlateCost: Math.round(unitCost),
    };
  };

  // FEFO / FIFO Stock Lot deduction helper
  const consumeStockLots = (
    ingredientId: string,
    qtyToDeduct: number,
    location: 'kitchen' | 'main_store'
  ) => {
    if (qtyToDeduct <= 0) return;
    setStockLots((prev) => {
      let remaining = qtyToDeduct;
      // Sort FEFO (earliest expiry first), then FIFO (earliest receivedDate first)
      const matchingIds = prev
        .filter((lot) => lot.ingredientId === ingredientId && lot.location === location && lot.remainingQty > 0)
        .sort((a, b) => {
          if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
          if (a.expiryDate) return -1;
          if (b.expiryDate) return 1;
          return a.receivedDate.localeCompare(b.receivedDate);
        })
        .map((l) => l.id);

      const deductions = new Map<string, number>();
      for (const lotId of matchingIds) {
        if (remaining <= 0) break;
        const lot = prev.find((l) => l.id === lotId);
        if (!lot) continue;
        const take = Math.min(lot.remainingQty, remaining);
        deductions.set(lotId, take);
        remaining -= take;
      }

      if (deductions.size === 0) return prev;
      return prev.map((lot) => {
        const take = deductions.get(lot.id);
        return take ? { ...lot, remainingQty: Math.max(0, lot.remainingQty - take) } : lot;
      });
    });
  };

  // Unified Order Stock Deduction Engine (Zero Double-Deduction, Sub-Recipe & Variant/Modifier Aware)
  const deductStockForOrderLines = (
    orderItems: Array<{
      menuItemId: string;
      name: string;
      quantity: number;
      portion?: string;
      selectedModifiers?: ModifierItem[];
      customerNotes?: string;
      customInstructions?: string;
      status?: OrderItemStatus;
    }>,
    orderNum: string,
    stageLabel: string
  ) => {
    const newMovements: StockMovement[] = [];
    const lowKitchenAlerts: string[] = [];
    const subRecipeDeductions: { subRecipeId: string; qty: number; dishName: string }[] = [];
    const batchPlateDeductions: { menuItemId: string; qty: number }[] = [];
    const ingredientDeductions: {
      ingredientId: string;
      qty: number;
      reason: string;
      type: MovementType;
    }[] = [];

    const activeLines = orderItems.filter((li) => li.status !== 'rejected');

    activeLines.forEach((li) => {
      const recipe = recipes.find((r) => r.menuItemId === li.menuItemId);

      // Method 3 / Un-recipied packaged drinks direct 1:1 deduction (BOM is optional!)
      if (!recipe) {
        if (li.menuItemId === 'menu-soda-bottle' || li.name.toLowerCase().includes('soda')) {
          ingredientDeductions.push({
            ingredientId: 'ing-soda',
            qty: li.quantity,
            reason: `Direct stock consumption (${li.quantity}x ${li.name} · ${stageLabel})`,
            type: 'direct_consumption',
          });
        }
        return;
      }

      if (recipe.status === 'archived') return;

      // Batch-cooked dish: deduct ONLY from pre-prepared plates pool & production log remainingPlates (NEVER raw ingredients again!)
      if (recipe.cookingMethod === 'batch_cooking') {
        const variant = li.portion
          ? recipe.variants?.find((v) => v.name.toLowerCase() === li.portion?.toLowerCase())
          : undefined;
        const plateScale = variant ? (variant.portionMultiplier >= 1.4 ? 1.5 : 1) : 1;
        batchPlateDeductions.push({
          menuItemId: li.menuItemId,
          qty: Math.round(li.quantity * plateScale * 10) / 10,
        });
        return;
      }

      // Made-to-order BOM: scale by Portion Variant + apply Modifier Rules
      const variant = li.portion
        ? recipe.variants?.find((v) => v.name.toLowerCase() === li.portion?.toLowerCase())
        : undefined;
      const portionMultiplier = variant?.portionMultiplier ?? 1.0;

      const combinedNotes = `${li.customerNotes || ''} ${li.customInstructions || ''}`.toLowerCase();
      const modNames = (li.selectedModifiers || []).map((m) => m.name.toLowerCase());

      // Track per-ingredient net quantity for this line item
      const perLineRawQty = new Map<string, number>();

      recipe.ingredients.forEach((ri) => {
        const override = variant?.ingredientOverrides?.find((ov) => ov.ingredientId === ri.ingredientId);
        const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);

        if (ri.isSubRecipe && ri.subRecipeId) {
          const perPlateSubQty =
            (ri.subRecipeQuantity && recipe.batchYieldPlates > 0
              ? ri.subRecipeQuantity / recipe.batchYieldPlates
              : ri.quantity) * portionMultiplier;
          const totalSubQty = Math.round((perPlateSubQty / yieldFactor) * li.quantity * 100) / 100;
          if (totalSubQty > 0) {
            subRecipeDeductions.push({
              subRecipeId: ri.subRecipeId,
              qty: totalSubQty,
              dishName: `${li.quantity}x ${li.name}${li.portion ? ` (${li.portion})` : ''}`,
            });
          }
          return;
        }

        const basePerPlate = override ? override.quantity : ri.quantity * portionMultiplier;
        const grossPerPlate = basePerPlate / yieldFactor;
        const totalQty = grossPerPlate * li.quantity;

        // Check if primary ingredient is out in kitchen and an approved substitute is configured
        const primaryIng = ingredients.find((i) => i.id === ri.ingredientId);
        let targetIngId = ri.ingredientId;
        if (
          primaryIng &&
          (primaryIng.kitchenStockUnits ?? 0) < totalQty &&
          ri.substituteIngredientId
        ) {
          const subIng = ingredients.find((i) => i.id === ri.substituteIngredientId);
          if (subIng && (subIng.kitchenStockUnits ?? 0) >= totalQty) {
            targetIngId = subIng.id;
          }
        }

        perLineRawQty.set(targetIngId, (perLineRawQty.get(targetIngId) || 0) + totalQty);
      });

      // Apply Recipe Modifier Rules (Extra Chicken, Boiled Egg, No Onions, etc.)
      (recipe.modifierRules || []).forEach((rule) => {
        const ruleLower = rule.modifierName.toLowerCase();
        const isTriggered =
          modNames.some((mn) => mn.includes(ruleLower) || ruleLower.includes(mn)) ||
          combinedNotes.includes(ruleLower);
        if (!isTriggered) return;

        if (rule.action === 'add') {
          perLineRawQty.set(
            rule.ingredientId,
            (perLineRawQty.get(rule.ingredientId) || 0) + rule.quantityDelta * li.quantity
          );
        } else if (rule.action === 'remove') {
          const cur = perLineRawQty.get(rule.ingredientId) || 0;
          perLineRawQty.set(rule.ingredientId, Math.max(0, cur - rule.quantityDelta * li.quantity));
        } else if (rule.action === 'substitute' && rule.substituteIngredientId) {
          const cur = perLineRawQty.get(rule.ingredientId) || 0;
          const removed = Math.min(cur, rule.quantityDelta * li.quantity);
          perLineRawQty.set(rule.ingredientId, Math.max(0, cur - removed));
          perLineRawQty.set(
            rule.substituteIngredientId,
            (perLineRawQty.get(rule.substituteIngredientId) || 0) + removed
          );
        }
      });

      perLineRawQty.forEach((rawQty, ingId) => {
        const rounded = Math.round(rawQty);
        if (rounded > 0) {
          ingredientDeductions.push({
            ingredientId: ingId,
            qty: rounded,
            reason: `BOM consumption for ${li.quantity}x ${li.name}${li.portion ? ` (${li.portion})` : ''} · ${stageLabel}`,
            type: 'kitchen_consumption',
          });
        }
      });
    });

    // 1. Deduct batch-cooked finished plates & update ProductionLog remainingPlates FIFO
    if (batchPlateDeductions.length > 0) {
      setPreparedDishStocks((prev) =>
        prev.map((p) => {
          const match = batchPlateDeductions.filter((b) => b.menuItemId === p.menuItemId);
          if (match.length === 0) return p;
          const sumQty = match.reduce((s, b) => s + b.qty, 0);
          const newAvailable = Math.max(0, p.preparedPlatesAvailable - sumQty);
          return {
            ...p,
            preparedPlatesAvailable: newAvailable,
            totalSoldToday: p.totalSoldToday + sumQty,
            status: newAvailable === 0 ? 'out_of_stock' : newAvailable <= 10 ? 'low' : 'ready',
          };
        })
      );

      setProductionLogs((prev) => {
        const remainingNeed = new Map<string, number>();
        batchPlateDeductions.forEach((b) => {
          remainingNeed.set(b.menuItemId, (remainingNeed.get(b.menuItemId) || 0) + b.qty);
        });
        return prev.map((pl) => {
          if (pl.status === 'reversed' || pl.productionType === 'sub_recipe') return pl;
          const need = remainingNeed.get(pl.menuItemId) || 0;
          if (need <= 0 || pl.remainingPlates <= 0) return pl;
          const take = Math.min(pl.remainingPlates, need);
          remainingNeed.set(pl.menuItemId, need - take);
          return {
            ...pl,
            remainingPlates: Math.max(0, pl.remainingPlates - take),
          };
        });
      });
    }

    // 2. Deduct Sub-Recipe prepared stock batches (FEFO by expiresAt, never raw ingredients again!)
    if (subRecipeDeductions.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      setSubRecipeBatches((prev) => {
        const copy = prev.map((b) => ({ ...b }));
        subRecipeDeductions.forEach((ded) => {
          let rem = ded.qty;
          const candidates = copy
            .filter((b) => b.subRecipeId === ded.subRecipeId && b.remainingQty > 0 && b.status !== 'reversed' && b.status !== 'expired')
            .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
          for (const batch of candidates) {
            if (rem <= 0) break;
            const take = Math.min(batch.remainingQty, rem);
            batch.remainingQty = Math.round((batch.remainingQty - take) * 100) / 100;
            batch.status =
              batch.remainingQty <= 0
                ? 'consumed'
                : batch.remainingQty <= batch.producedQty * 0.2
                ? 'low'
                : 'available';
            rem -= take;

            newMovements.push({
              id: `sm-sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              ingredientId: batch.subRecipeId,
              ingredientName: `${batch.name} [Sub-Recipe]`,
              type: 'kitchen_consumption',
              quantityDelta: -take,
              unit: batch.unit,
              costImpact: Math.round(take * batch.costPerUnit),
              date: todayStr,
              reference: `Order ${orderNum}`,
              batchNumber: batch.batchNumber,
              recipeId: batch.subRecipeId,
              reason: `Sub-recipe batch deduction for ${ded.dishName} (${stageLabel})`,
              recordedBy: 'Auto Kitchen BOM Engine',
              sourceLocation: 'kitchen',
            });
          }
        });
        return copy;
      });
    }

    // 3. Deduct Raw Ingredients & FEFO/FIFO lots
    if (ingredientDeductions.length > 0) {
      setIngredients((prevIngredients) => {
        const updated = [...prevIngredients];
        ingredientDeductions.forEach((ded) => {
          const ingIndex = updated.findIndex((ing) => ing.id === ded.ingredientId);
          if (ingIndex === -1) return;
          const ing = updated[ingIndex];
          const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;

          const currentKitchen = ing.kitchenStockUnits ?? 0;
          const currentStore = ing.storeStockUnits ?? Math.max(0, ing.currentStockUnits - currentKitchen);

          let newKitchen = currentKitchen - ded.qty;
          let newStore = currentStore;

          if (newKitchen < 0) {
            const deficit = -newKitchen;
            newStore = Math.max(0, currentStore - deficit);
            newKitchen = 0;
            lowKitchenAlerts.push(`${ing.name} (Kitchen line ran out, drawn from Store)`);
            consumeStockLots(ing.id, currentKitchen, 'kitchen');
            consumeStockLots(ing.id, deficit, 'main_store');
          } else {
            consumeStockLots(ing.id, ded.qty, 'kitchen');
            if (newKitchen <= ing.minimumThreshold * 0.25) {
              lowKitchenAlerts.push(`${ing.name} (${newKitchen.toLocaleString()} ${ing.consumptionUnit} left in kitchen)`);
            }
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
            type: ded.type,
            quantityDelta: -ded.qty,
            unit: ing.consumptionUnit,
            costImpact: Math.round(unitCost * ded.qty),
            date: new Date().toISOString().split('T')[0],
            reference: `Order ${orderNum}`,
            reason: ded.reason,
            recordedBy: 'Auto Kitchen BOM Engine',
            sourceLocation: 'kitchen',
          });
        });
        return updated;
      });
    }

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

  // Backwards-compatible wrapper
  const deductIngredientsForOrder = (orderItems: CartItem[], orderNum: string) => {
    deductStockForOrderLines(
      orderItems.map((ci) => ({
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        quantity: ci.quantity,
        portion: ci.selectedPortion?.name,
        selectedModifiers: ci.selectedModifiers,
        customerNotes: ci.customerNotes,
        customInstructions: ci.customInstructions,
      })),
      orderNum,
      'Order Submit'
    );
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
    asDraft?: boolean;
    existingDraftId?: string;
    priority?: 'normal' | 'rush' | 'vip';
    discount?: number;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    discountReason?: string;
    tax?: number;
    taxRate?: number;
    isTaxExempt?: boolean;
    deliveryFee?: number;
    donation?: number;
    customItems?: CartItem[];
    actorName?: string;
    actorRole?: Role;
  }) => {
    const sourceItems = params.customItems ?? cart;
    let subtotal = 0;
    const items = sourceItems.map((ci) => {
      const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
      const modifiersSum = ci.selectedModifiers.reduce((acc, m) => acc + m.price, 0);
      const extraCharge = Math.max(0, Math.round(ci.extraCharge || 0));
      const totalItemPrice = unitPrice + modifiersSum + extraCharge;
      subtotal += totalItemPrice * ci.quantity;

      return {
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        price: totalItemPrice,
        quantity: ci.quantity,
        portion: ci.selectedPortion?.name,
        selectedModifiers: ci.selectedModifiers,
        customerNotes: ci.customerNotes,
        customInstructions: ci.customInstructions,
        extraCharge: extraCharge > 0 ? extraCharge : undefined,
        isCustomItem: ci.isCustomItem || ci.menuItem.id.startsWith('custom-'),
        station: ci.menuItem.station,
        status: 'pending' as const,
      };
    });

    const discountAmount = Math.max(0, Math.min(subtotal, Math.round(params.discount ?? 0)));
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    const effectiveRate = taxEnabled ? (params.taxRate !== undefined ? params.taxRate : taxRatePct / 100) : 0;
    let tax = 0;
    const isExempt = !taxEnabled || Boolean(params.isTaxExempt);
    if (!isExempt) {
      if (params.tax !== undefined) {
        tax = Math.max(0, Math.round(params.tax));
      } else {
        tax = Math.round(discountedSubtotal * effectiveRate);
      }
    }

    let deliveryFee = 0;
    if (params.type === 'delivery') {
      deliveryFee = params.deliveryFee !== undefined ? Math.max(0, Math.round(params.deliveryFee)) : currentTenant.deliveryFee;
    }
    const donation = params.donation !== undefined ? params.donation : 0;
    const total = Math.max(0, discountedSubtotal + tax + deliveryFee + donation);

    const existingDraft = params.existingDraftId ? orders.find((o) => o.id === params.existingDraftId) : undefined;
    const nextOrderNum = existingDraft?.orderNumber || `#F00${orders.length + 27}`;
    const nextKotNum = existingDraft?.kotNumber || `KOT-${Math.floor(154650 + orders.length * 3 + Math.random() * 9)}`;
    const branchPrefix = currentTenant.id === 'tenant-kona-chips' ? 'KC' : 'SV';
    const existingCodes = new Set(orders.map((o) => o.serviceCouponCode).filter(Boolean));
    let serviceCouponCode = existingDraft?.serviceCouponCode || `${branchPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingDraft?.serviceCouponCode) {
      while (existingCodes.has(serviceCouponCode)) {
        serviceCouponCode = `${branchPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const defaultCommAmount =
      defaultCommissionMode === 'percent'
        ? Math.round(discountedSubtotal * (Math.max(0, Math.min(100, defaultCommissionValue)) / 100))
        : Math.max(0, Math.round(defaultCommissionValue));

    const nowIso = new Date().toISOString();
    const actor = params.actorName || (params.servingWaiterId ? waiters.find((w) => w.id === params.servingWaiterId)?.name || 'Staff' : 'POS / Guest');
    const actorRole: Role = params.actorRole || (params.servingWaiterId ? 'waiter' : activeRole);
    const targetStatus: OrderStatus = params.asDraft ? 'draft' : 'sent_to_kitchen';
    const orderId = existingDraft?.id || `ord-${Date.now()}`;

    const initialPayments: PaymentTransaction[] =
      params.markAsPaid && total > 0
        ? [
            {
              id: `pay-${Date.now()}`,
              orderId,
              method: (params.paymentMethod && params.paymentMethod !== 'split' ? params.paymentMethod : 'cash') as Exclude<PaymentMethod, 'split'>,
              amount: total,
              receivedBy: actor,
              timestamp: nowIso,
            },
          ]
        : existingDraft?.payments || [];

    const shouldDeductNow =
      !params.asDraft &&
      (bomDeductionPolicy === 'on_order_submit' ||
        (bomDeductionPolicy === 'on_payment' && Boolean(params.markAsPaid)));

    const newOrder: Order = {
      id: orderId,
      orderNumber: nextOrderNum,
      kotNumber: nextKotNum,
      serviceCouponCode,
      tenantId: currentTenant.id,
      type: params.type,
      priority: params.priority || 'normal',
      tableNumber: params.tableNumber,
      customerName: params.customerName || 'Guest Customer',
      customerPhone: params.customerPhone,
      deliveryAddress: params.deliveryAddress,
      items,
      status: targetStatus,
      paymentStatus: params.markAsPaid ? 'paid' : 'unpaid',
      paymentMethod: params.paymentMethod,
      referralWaiterId: params.referralWaiterId || (activeReferralCode ? 'waiter-john' : undefined),
      servingWaiterId: params.servingWaiterId,
      subtotal,
      originalAmount: existingDraft?.originalAmount ?? total,
      discount: discountAmount,
      discountType: params.discountType,
      discountValue: params.discountValue,
      discountReason: params.discountReason,
      tax,
      taxRate: isExempt ? 0 : effectiveRate,
      isTaxExempt: isExempt,
      deliveryFee,
      donation,
      total,
      paidAmount: params.markAsPaid ? total : existingDraft?.paidAmount || 0,
      payments: initialPayments,
      adjustments: existingDraft?.adjustments || [],
      statusHistory: [
        ...(existingDraft?.statusHistory || []),
        {
          status: targetStatus,
          actor,
          note: params.asDraft
            ? 'Saved draft order (visible to management)'
            : existingDraft
            ? 'Submitted saved draft to Kitchen'
            : 'Order created and sent to Kitchen',
          timestamp: nowIso,
        },
      ],
      commissionMode: defaultCommissionMode,
      commissionValue: defaultCommissionValue,
      commissionAmount: defaultCommAmount,
      commissionConfiguredBy:
        defaultCommissionMode === 'percent'
          ? `Auto Rule (${defaultCommissionValue}% Net)`
          : `Auto Rule (${formatMoney(defaultCommissionValue)} Fixed)`,
      commissionUpdatedAt: nowIso,
      stockDeducted: shouldDeductNow || existingDraft?.stockDeducted || false,
      stockDeductionStage: shouldDeductNow
        ? bomDeductionPolicy === 'on_payment'
          ? 'On Payment'
          : 'Order Submit'
        : existingDraft?.stockDeductionStage,
      notes: params.notes,
      createdAt: existingDraft?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (existingDraft) {
      setOrders((prev) => prev.map((o) => (o.id === existingDraft.id ? newOrder : o)));
    } else {
      setOrders((prev) => [newOrder, ...prev]);
    }

    if (params.type === 'dine_in' && params.tableNumber && !params.asDraft) {
      setTables((prev) =>
        prev.map((t) =>
          t.number.toLowerCase() === params.tableNumber?.toLowerCase()
            ? { ...t, status: 'occupied', currentOrderId: newOrder.id, assignedWaiterId: params.servingWaiterId }
            : t
        )
      );
    }

    if (!params.asDraft) {
      if (shouldDeductNow && !existingDraft?.stockDeducted) {
        deductIngredientsForOrder(sourceItems, nextOrderNum);
      }
      setSoundAlertTriggered(true);
      addNotification({
        title: `New Order ${nextOrderNum} (${serviceCouponCode})`,
        message: `${params.type === 'dine_in' ? `Table ${params.tableNumber}` : params.type.toUpperCase()} - ${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
        type: 'order',
        actionRole: 'kitchen',
        actionLabel: 'Open KDS Ticket',
      });
    } else {
      addNotification({
        title: `Waiter Draft Saved: ${nextOrderNum}`,
        message: `${actor} saved a draft (${formatMoney(total)}) for ${params.tableNumber || params.customerName}. Visible for accountability.`,
        type: 'order',
        actionRole: 'manager',
        actionLabel: 'Review Drafts',
      });
    }

    logAuditEvent({
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      actor,
      actorRole,
      action: params.asDraft ? 'DRAFT_SAVED' : 'ORDER_SUBMITTED',
      details: `${params.asDraft ? 'Draft saved' : 'Sent to kitchen'} (${items.length} line items, ${formatMoney(total)})${
        items.some((i) => i.isCustomItem) ? ' · Contains Custom Off-Menu Item' : ''
      }`,
    });

    if (!params.customItems) {
      clearCart();
    }

    notifyFlutterHost('orderPlaced', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      serviceCouponCode: newOrder.serviceCouponCode,
      total: newOrder.total,
      type: newOrder.type,
    });

    return newOrder;
  };

  const submitDraftToKitchen = (orderId: string, actorName: string = 'Waiter') => {
    const draft = orders.find((o) => o.id === orderId);
    if (!draft || draft.status !== 'draft') return;
    const nowIso = new Date().toISOString();
    const deductNow = !draft.stockDeducted && bomDeductionPolicy === 'on_order_submit';

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'sent_to_kitchen',
              stockDeducted: o.stockDeducted || deductNow,
              stockDeductionStage: deductNow ? 'Order Submit' : o.stockDeductionStage,
              updatedAt: nowIso,
              statusHistory: [
                ...(o.statusHistory || []),
                {
                  status: 'sent_to_kitchen',
                  actor: actorName,
                  note: 'Draft submitted to Kitchen KDS',
                  timestamp: nowIso,
                },
              ],
            }
          : o
      )
    );

    if (deductNow) {
      deductStockForOrderLines(draft.items, draft.orderNumber, 'Draft Dispatch');
    }

    if (draft.type === 'dine_in' && draft.tableNumber) {
      setTables((prev) =>
        prev.map((t) =>
          t.number.toLowerCase() === draft.tableNumber?.toLowerCase()
            ? { ...t, status: 'occupied', currentOrderId: draft.id, assignedWaiterId: draft.servingWaiterId }
            : t
        )
      );
    }

    setSoundAlertTriggered(true);
    addNotification({
      title: `Draft Dispatched: ${draft.orderNumber}`,
      message: `${draft.kotNumber || draft.orderNumber} sent to Kitchen by ${actorName}.`,
      type: 'order',
      actionRole: 'kitchen',
      actionLabel: 'Open KDS',
    });

    logAuditEvent({
      orderId: draft.id,
      orderNumber: draft.orderNumber,
      actor: actorName,
      actorRole: 'waiter',
      action: 'DRAFT_DISPATCHED_TO_KITCHEN',
      details: `Converted draft ${draft.orderNumber} (${draft.kotNumber || ''}) into live Kitchen KOT.`,
    });
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    actorName: string = 'Kitchen / Floor Staff',
    note?: string
  ) => {
    const nowIso = new Date().toISOString();
    const target = orders.find((o) => o.id === orderId);
    const shouldDeductOnKitchenTransition =
      Boolean(target) &&
      !target?.stockDeducted &&
      bomDeductionPolicy === 'on_kitchen_start' &&
      (status === 'accepted' || status === 'preparing' || status === 'ready' || status === 'served' || status === 'completed');

    if (shouldDeductOnKitchenTransition && target) {
      deductStockForOrderLines(target.items, target.orderNumber, `Kitchen ${status}`);
    }

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          let updatedItems = ord.items;
          if (status === 'accepted') {
            updatedItems = ord.items.map((it) =>
              it.status === 'pending' ? { ...it, status: 'accepted' as const } : it
            );
          } else if (status === 'ready') {
            updatedItems = ord.items.map((it) =>
              it.status !== 'rejected' ? { ...it, status: 'ready' as const } : it
            );
          } else if (status === 'served') {
            updatedItems = ord.items.map((it) =>
              it.status !== 'rejected' ? { ...it, status: 'served' as const } : it
            );
          } else if (status === 'preparing') {
            updatedItems = ord.items.map((it) => ({
              ...it,
              status: it.status === 'pending' || it.status === 'accepted' ? 'preparing' : it.status,
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
            stockDeducted: ord.stockDeducted || shouldDeductOnKitchenTransition,
            stockDeductionStage:
              shouldDeductOnKitchenTransition && !ord.stockDeductionStage
                ? `Kitchen ${status}`
                : ord.stockDeductionStage,
            updatedAt: nowIso,
            statusHistory: [
              ...(ord.statusHistory || []),
              { status, actor: actorName, note, timestamp: nowIso },
            ],
          };
        }
        return ord;
      })
    );

    if (target) {
      logAuditEvent({
        orderId: target.id,
        orderNumber: target.orderNumber,
        actor: actorName,
        actorRole: activeRole,
        action: `STATUS_${status.toUpperCase()}`,
        details: `Order ${target.orderNumber} moved from ${target.status} to ${status}${
          shouldDeductOnKitchenTransition ? ' · BOM Stock Deducted' : ''
        }${note ? ` (${note})` : ''}.`,
      });
    }

    if (status === 'completed' || status === 'cancelled' || status === 'rejected') {
      if (target?.tableNumber) {
        setTables((prev) =>
          prev.map((t) =>
            t.number.toLowerCase() === target.tableNumber?.toLowerCase()
              ? { ...t, status: 'available', currentOrderId: undefined }
              : t
          )
        );
      }
    }
  };

  const fastForwardOrderToServed = (
    orderId: string,
    actorName: string = 'Waiter'
  ): boolean => {
    const target = orders.find((o) => o.id === orderId);
    if (
      !target ||
      target.status === 'draft' ||
      target.status === 'cancelled' ||
      target.status === 'rejected' ||
      target.status === 'served' ||
      target.status === 'completed'
    ) {
      return false;
    }

    const nowIso = new Date().toISOString();
    const pipeline: OrderStatus[] = ['accepted', 'preparing', 'ready', 'served'];
    const currentIdx = pipeline.indexOf(target.status);
    const stepsToRecord: OrderStatus[] =
      currentIdx >= 0 ? pipeline.slice(currentIdx + 1) : pipeline;

    const shouldDeductNow =
      !target.stockDeducted &&
      (bomDeductionPolicy === 'on_kitchen_start' || bomDeductionPolicy === 'on_order_submit');

    if (shouldDeductNow) {
      deductStockForOrderLines(target.items, target.orderNumber, 'Waiter Fast-Serve');
    }

    const newHistoryEntries: OrderStatusHistoryItem[] = stepsToRecord.map((stage) => ({
      status: stage,
      actor: `${actorName} (Waiter Assist)`,
      note:
        stage === 'served'
          ? 'Processed all kitchen stages up to Served (kitchen busy assist)'
          : 'Auto-advanced via Waiter Fast-Serve',
      timestamp: nowIso,
    }));

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status: 'served',
          items: ord.items.map((it) =>
            it.status !== 'rejected' ? { ...it, status: 'served' as const } : it
          ),
          stockDeducted: ord.stockDeducted || shouldDeductNow,
          stockDeductionStage:
            shouldDeductNow && !ord.stockDeductionStage
              ? 'Waiter Fast-Serve'
              : ord.stockDeductionStage,
          updatedAt: nowIso,
          statusHistory: [...(ord.statusHistory || []), ...newHistoryEntries],
        };
      })
    );

    logAuditEvent({
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor: actorName,
      actorRole: 'waiter',
      action: 'WAITER_FAST_FORWARD_SERVED',
      details: `Order ${target.orderNumber} fast-processed from ${target.status} through ${stepsToRecord.join(
        ' → '
      )} by ${actorName}${shouldDeductNow ? ' · BOM Stock Deducted' : ''}.`,
    });

    return true;
  };

  const updateOrderItemStatus = (
    orderId: string,
    itemIndex: number,
    itemStatus: OrderItemStatus,
    actorName: string = 'Kitchen Staff'
  ) => {
    const nowIso = new Date().toISOString();
    const target = orders.find((o) => o.id === orderId);
    const shouldDeductNow =
      Boolean(target) &&
      !target?.stockDeducted &&
      bomDeductionPolicy === 'on_kitchen_start' &&
      (itemStatus === 'accepted' || itemStatus === 'preparing' || itemStatus === 'ready' || itemStatus === 'served');

    if (shouldDeductNow && target) {
      deductStockForOrderLines(target.items, target.orderNumber, `Kitchen ${itemStatus}`);
    }

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedItems = [...ord.items];
          if (updatedItems[itemIndex]) {
            updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: itemStatus };
          }
          const activeItems = updatedItems.filter((it) => it.status !== 'rejected');
          const allReady = activeItems.length > 0 && activeItems.every((it) => it.status === 'ready' || it.status === 'served');
          const anyPreparing = activeItems.some((it) => it.status === 'preparing');
          const anyAccepted = activeItems.some((it) => it.status === 'accepted');
          const newOrderStatus: OrderStatus =
            activeItems.length === 0
              ? 'rejected'
              : allReady
              ? 'ready'
              : anyPreparing
              ? 'preparing'
              : anyAccepted && ord.status === 'sent_to_kitchen'
              ? 'accepted'
              : ord.status;

          return {
            ...ord,
            items: updatedItems,
            status: newOrderStatus,
            stockDeducted: ord.stockDeducted || shouldDeductNow,
            stockDeductionStage:
              shouldDeductNow && !ord.stockDeductionStage
                ? `Kitchen ${itemStatus}`
                : ord.stockDeductionStage,
            updatedAt: nowIso,
            statusHistory:
              newOrderStatus !== ord.status
                ? [
                    ...(ord.statusHistory || []),
                    {
                      status: newOrderStatus,
                      actor: actorName,
                      note: `Item "${updatedItems[itemIndex]?.name}" marked ${itemStatus}`,
                      timestamp: nowIso,
                    },
                  ]
                : ord.statusHistory,
          };
        }
        return ord;
      })
    );
  };

  const rejectOrderItem = (
    orderId: string,
    itemIndex: number,
    kitchenStaff: string,
    reason: string
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || !target.items[itemIndex]) return;
    const nowIso = new Date().toISOString();
    const rejectedItem = target.items[itemIndex];
    const deductionAmount = rejectedItem.price * rejectedItem.quantity;

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const updatedItems = ord.items.map((it, idx) =>
          idx === itemIndex
            ? {
                ...it,
                status: 'rejected' as const,
                rejectionReason: reason,
                rejectedBy: kitchenStaff,
                rejectedAt: nowIso,
              }
            : it
        );
        const activeItems = updatedItems.filter((it) => it.status !== 'rejected');
        const newSubtotal = activeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const discountedSub = Math.max(0, newSubtotal - (ord.discount || 0));
        const newTax = ord.isTaxExempt ? 0 : Math.round(discountedSub * (ord.taxRate || 0));
        const newTotal = Math.max(0, discountedSub + newTax + (ord.deliveryFee || 0) + (ord.donation || 0));
        const newStatus: OrderStatus = activeItems.length === 0 ? 'rejected' : ord.status;

        const adjustment: OrderAdjustment = {
          id: `adj-${Date.now()}`,
          orderId: ord.id,
          type: 'void_item',
          originalAmount: ord.total,
          newAmount: newTotal,
          difference: newTotal - ord.total,
          reason: `Kitchen rejected ${rejectedItem.quantity}x ${rejectedItem.name}: ${reason}`,
          requestedBy: kitchenStaff,
          approvedBy: 'Kitchen Exception Log',
          status: 'approved',
          timestamp: nowIso,
        };

        return {
          ...ord,
          items: updatedItems,
          subtotal: newSubtotal,
          tax: newTax,
          total: newTotal,
          status: newStatus,
          adjustments: [...(ord.adjustments || []), adjustment],
          statusHistory: [
            ...(ord.statusHistory || []),
            {
              status: newStatus,
              actor: kitchenStaff,
              note: `Rejected ${rejectedItem.name}: ${reason}`,
              timestamp: nowIso,
            },
          ],
          updatedAt: nowIso,
        };
      })
    );

    addNotification({
      title: `Kitchen Rejected Item (${target.orderNumber})`,
      message: `${kitchenStaff} rejected ${rejectedItem.quantity}x ${rejectedItem.name} (${formatMoney(deductionAmount)}). Reason: ${reason}`,
      type: 'kitchen',
      actionRole: 'manager',
      actionLabel: 'Inspect Audit Log',
    });

    logAuditEvent({
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor: kitchenStaff,
      actorRole: 'kitchen',
      action: 'KITCHEN_ITEM_REJECTED',
      details: `Marked ${rejectedItem.quantity}x ${rejectedItem.name} as REJECTED (-${formatMoney(deductionAmount)}). Reason: ${reason}`,
    });
  };

  const processPayment = (
    orderId: string,
    method: Exclude<PaymentMethod, 'split'>,
    amount: number,
    options?: { completeService?: boolean; collectedBy?: string; transactionRef?: string; isRefund?: boolean }
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const nowIso = new Date().toISOString();
    const delta = options?.isRefund ? -Math.abs(amount) : Math.abs(amount);
    const willBeFullyPaid = targetOrder ? (targetOrder.paidAmount || 0) + delta >= targetOrder.total : false;
    const collector = options?.collectedBy || 'Cashier / POS';

    const tx: PaymentTransaction = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      orderId,
      method,
      amount: Math.abs(amount),
      receivedBy: collector,
      transactionRef: options?.transactionRef,
      timestamp: nowIso,
      isRefund: options?.isRefund,
    };

    const shouldDeductOnPayNow =
      !options?.isRefund &&
      Boolean(targetOrder) &&
      !targetOrder?.stockDeducted &&
      willBeFullyPaid &&
      (bomDeductionPolicy === 'on_payment' ||
        (Boolean(options?.completeService) && bomDeductionPolicy === 'on_kitchen_start'));

    if (shouldDeductOnPayNow && targetOrder) {
      deductStockForOrderLines(
        targetOrder.items,
        targetOrder.orderNumber,
        bomDeductionPolicy === 'on_payment' ? 'On Payment' : 'Service Completion'
      );
    }

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const newPaidAmount = Math.max(0, (ord.paidAmount || 0) + delta);
          const isFullyPaid = newPaidAmount >= ord.total && ord.total > 0;
          const updatedPayments = [...(ord.payments || []), tx];
          const distinctMethods = Array.from(new Set(updatedPayments.filter((p) => !p.isRefund).map((p) => p.method)));
          const resolvedMethod: PaymentMethod = distinctMethods.length > 1 ? 'split' : method;

          const netSales = Math.max(0, ord.subtotal - (ord.discount || 0));
          const mode = ord.commissionMode ?? defaultCommissionMode;
          const val = ord.commissionValue ?? defaultCommissionValue;
          const computedComm =
            ord.commissionAmount !== undefined
              ? ord.commissionAmount
              : mode === 'percent'
              ? Math.round(netSales * (Math.max(0, Math.min(100, val)) / 100))
              : Math.max(0, Math.round(val));

          const nextStatus: OrderStatus =
            isFullyPaid && options?.completeService
              ? 'completed'
              : isFullyPaid && ord.status === 'ready'
              ? 'served'
              : ord.status;

          const updatedItems =
            isFullyPaid && options?.completeService
              ? ord.items.map((it) =>
                  it.status !== 'rejected' ? { ...it, status: 'served' as const } : it
                )
              : ord.items;

          return {
            ...ord,
            paymentStatus: options?.isRefund && newPaidAmount === 0 ? 'refunded' : isFullyPaid ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid',
            paymentMethod: resolvedMethod,
            paidAmount: newPaidAmount,
            payments: updatedPayments,
            status: nextStatus,
            items: updatedItems,
            stockDeducted: ord.stockDeducted || shouldDeductOnPayNow,
            stockDeductionStage:
              shouldDeductOnPayNow && !ord.stockDeductionStage
                ? bomDeductionPolicy === 'on_payment'
                  ? 'On Payment'
                  : 'Service Completion'
                : ord.stockDeductionStage,
            commissionMode: mode,
            commissionValue: val,
            commissionAmount: computedComm,
            commissionConfiguredBy:
              ord.commissionConfiguredBy ||
              (mode === 'percent' ? `Auto Rule (${val}% Net)` : `Auto Rule (${formatMoney(val)} Fixed)`),
            updatedAt: nowIso,
          };
        }
        return ord;
      })
    );

    if (options?.completeService && willBeFullyPaid && targetOrder?.tableNumber) {
      setTables((prev) =>
        prev.map((t) =>
          t.number.toLowerCase() === targetOrder.tableNumber?.toLowerCase()
            ? { ...t, status: 'available', currentOrderId: undefined, assignedWaiterId: undefined }
            : t
        )
      );
    }

    if (targetOrder) {
      logAuditEvent({
        orderId: targetOrder.id,
        orderNumber: targetOrder.orderNumber,
        actor: collector,
        actorRole: activeRole,
        action: options?.isRefund ? 'REFUND_RECORDED' : 'PAYMENT_COLLECTED',
        details: `${options?.isRefund ? 'Refunded' : 'Collected'} ${formatMoney(Math.abs(amount))} via ${method.toUpperCase()}${
          options?.transactionRef ? ` (Ref: ${options.transactionRef})` : ''
        }`,
      });
    }

    if (options?.collectedBy && targetOrder) {
      addNotification({
        title: `Payment Collected (${targetOrder.orderNumber})`,
        message: `${options.collectedBy} collected ${formatMoney(amount)} via ${method.toUpperCase()} for Coupon ${
          targetOrder.serviceCouponCode || targetOrder.orderNumber
        }${options.completeService && willBeFullyPaid ? ' & completed service' : ''}.`,
        type: 'order',
        actionRole: 'cashier',
        actionLabel: 'View Shift',
      });
    }

    setCashierShift((prev) => {
      const signedAmt = options?.isRefund ? -Math.abs(amount) : Math.abs(amount);
      const isCash = method === 'cash';
      const isMpesa = method === 'mpesa' || method === 'airtel';
      const isCard = method === 'card';
      return {
        ...prev,
        cashSales: isCash ? prev.cashSales + signedAmt : prev.cashSales,
        mpesaSales: isMpesa ? prev.mpesaSales + signedAmt : prev.mpesaSales,
        cardSales: isCard ? prev.cardSales + signedAmt : prev.cardSales,
        expectedCash: isCash ? prev.expectedCash + signedAmt : prev.expectedCash,
      };
    });
  };

  const requestApproval = (params: {
    orderId: string;
    actionType: ApprovalRequest['actionType'];
    requestedBy: string;
    requestedRole: Role;
    details: string;
    amountImpact: number;
    reason: string;
    payload?: ApprovalRequest['payload'];
  }): ApprovalRequest => {
    const ord = orders.find((o) => o.id === params.orderId);
    const nowIso = new Date().toISOString();
    const newReq: ApprovalRequest = {
      id: `apr-${Date.now()}`,
      orderId: params.orderId,
      orderNumber: ord?.orderNumber || '#F0000',
      actionType: params.actionType,
      requestedBy: params.requestedBy,
      requestedRole: params.requestedRole,
      details: params.details,
      amountImpact: params.amountImpact,
      reason: params.reason,
      status: 'pending',
      createdAt: nowIso,
      payload: params.payload,
    };
    setApprovalRequests((prev) => [newReq, ...prev]);

    addNotification({
      title: `Approval Required: ${params.actionType.replace('_', ' ').toUpperCase()}`,
      message: `${params.requestedBy} requested ${params.details} on ${newReq.orderNumber}. Reason: ${params.reason}`,
      type: 'order',
      actionRole: 'manager',
      actionLabel: 'Review Approvals',
    });

    logAuditEvent({
      orderId: params.orderId,
      orderNumber: newReq.orderNumber,
      actor: params.requestedBy,
      actorRole: params.requestedRole,
      action: 'APPROVAL_REQUESTED',
      details: `${params.actionType.toUpperCase()} (${formatMoney(params.amountImpact)}): ${params.details} · Reason: ${params.reason}`,
    });

    return newReq;
  };

  const cancelOrderControlled = (
    orderId: string,
    reason: string,
    actor: string,
    approvedBy: string = 'Manager David Kasambala'
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.status === 'cancelled') return;
    const nowIso = new Date().toISOString();

    // Controlled Stock Return: Only restore recoverable prepared plates if order had deducted stock and wasn't already served
    if (target.stockDeducted && !target.reversedStock) {
      const recoverableBatchItems = target.items.filter((it) => {
        if (it.status === 'rejected' || it.status === 'served') return false;
        const r = recipes.find((rec) => rec.menuItemId === it.menuItemId);
        return r?.cookingMethod === 'batch_cooking';
      });
      if (recoverableBatchItems.length > 0) {
        setPreparedDishStocks((prev) =>
          prev.map((p) => {
            const matchQty = recoverableBatchItems
              .filter((bi) => bi.menuItemId === p.menuItemId)
              .reduce((s, bi) => s + bi.quantity, 0);
            if (matchQty <= 0) return p;
            return {
              ...p,
              preparedPlatesAvailable: p.preparedPlatesAvailable + matchQty,
              totalSoldToday: Math.max(0, p.totalSoldToday - matchQty),
              status: 'ready',
            };
          })
        );
      }
    }

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const adj: OrderAdjustment = {
          id: `adj-${Date.now()}`,
          orderId: ord.id,
          type: 'cancellation',
          originalAmount: ord.total,
          newAmount: 0,
          difference: -ord.total,
          reason,
          requestedBy: actor,
          approvedBy,
          status: 'approved',
          timestamp: nowIso,
        };
        return {
          ...ord,
          status: 'cancelled',
          reversedStock: ord.stockDeducted ? true : ord.reversedStock,
          adjustments: [...(ord.adjustments || []), adj],
          cancellationRecord: {
            cancelledBy: actor,
            approvedBy,
            reason,
            timestamp: nowIso,
          },
          statusHistory: [
            ...(ord.statusHistory || []),
            {
              status: 'cancelled',
              actor,
              note: `Cancelled (${reason}) · Approved by ${approvedBy}${
                !ord.stockDeducted ? ' · No stock deducted yet' : ''
              }`,
              timestamp: nowIso,
            },
          ],
          updatedAt: nowIso,
        };
      })
    );

    if (target.tableNumber) {
      setTables((prev) =>
        prev.map((t) =>
          t.number.toLowerCase() === target.tableNumber?.toLowerCase()
            ? { ...t, status: 'available', currentOrderId: undefined, assignedWaiterId: undefined }
            : t
        )
      );
    }

    logAuditEvent({
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor,
      actorRole: activeRole,
      action: 'ORDER_CANCELLED_CONTROLLED',
      details: `Order ${target.orderNumber} (${formatMoney(target.total)}) marked cancelled (record retained). ${
        target.stockDeducted
          ? 'Prep already started: consumption logged / recoverable batch plates returned.'
          : 'Zero stock deduction occurred (cancelled before kitchen prep).'
      } Reason: ${reason}. Approved by: ${approvedBy}.`,
    });
  };

  const reviewApprovalRequest = (
    requestId: string,
    approve: boolean,
    managerName: string = 'David Kasambala (Manager)'
  ) => {
    const req = approvalRequests.find((r) => r.id === requestId);
    if (!req || req.status !== 'pending') return;
    const nowIso = new Date().toISOString();

    setApprovalRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: approve ? 'approved' : 'rejected',
              reviewedBy: managerName,
              reviewedAt: nowIso,
            }
          : r
      )
    );

    if (approve) {
      if (req.actionType === 'cancel_order') {
        cancelOrderControlled(req.orderId, req.reason, req.requestedBy, managerName);
      } else if (req.actionType === 'discount') {
        setOrders((prev) =>
          prev.map((ord) => {
            if (ord.id !== req.orderId) return ord;
            const discType = req.payload?.discountType || 'fixed';
            const discVal = req.payload?.discountValue ?? req.amountImpact;
            const discountAmount =
              discType === 'percent'
                ? Math.round(ord.subtotal * (Math.min(100, Math.max(0, discVal)) / 100))
                : Math.min(ord.subtotal, Math.max(0, Math.round(discVal)));
            const discountedSub = Math.max(0, ord.subtotal - discountAmount);
            const newTax = ord.isTaxExempt ? 0 : Math.round(discountedSub * (ord.taxRate || 0));
            const newTotal = Math.max(0, discountedSub + newTax + (ord.deliveryFee || 0) + (ord.donation || 0));
            const adj: OrderAdjustment = {
              id: `adj-${Date.now()}`,
              orderId: ord.id,
              type: 'discount',
              originalAmount: ord.total,
              newAmount: newTotal,
              difference: newTotal - ord.total,
              reason: req.reason,
              requestedBy: req.requestedBy,
              approvedBy: managerName,
              status: 'approved',
              timestamp: nowIso,
            };
            return {
              ...ord,
              discount: discountAmount,
              discountType: discType,
              discountValue: discVal,
              discountReason: req.reason,
              tax: newTax,
              total: newTotal,
              adjustments: [...(ord.adjustments || []), adj],
              updatedAt: nowIso,
            };
          })
        );
      }
    }

    logAuditEvent({
      orderId: req.orderId,
      orderNumber: req.orderNumber,
      actor: managerName,
      actorRole: 'manager',
      action: approve ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
      details: `${approve ? 'Approved' : 'Rejected'} ${req.actionType} request by ${req.requestedBy} for ${req.orderNumber} (${req.details}).`,
    });
  };

  const promoteCustomItemToMenu = (
    orderId: string,
    itemIndex: number,
    category: string = 'Special'
  ): MenuItem | null => {
    const ord = orders.find((o) => o.id === orderId);
    const item = ord?.items[itemIndex];
    if (!ord || !item) return null;

    const newMenuItem: MenuItem = {
      id: `menu-promoted-${Date.now()}`,
      name: item.name,
      category,
      description: item.customInstructions || 'Promoted from waiter special customer order.',
      price: item.price,
      image: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
      preparationTimeMinutes: 15,
      isAvailable: true,
      station: item.station,
      tags: ['Manager Promoted', 'Chef Special'],
    };

    setMenuItems((prev) => [newMenuItem, ...prev]);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map((it, idx) =>
                idx === itemIndex ? { ...it, promotedToMenuId: newMenuItem.id } : it
              ),
            }
          : o
      )
    );

    logAuditEvent({
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      actor: 'Manager / Owner',
      actorRole: 'manager',
      action: 'CUSTOM_ITEM_PROMOTED_TO_MENU',
      details: `Added custom order item "${item.name}" (${formatMoney(item.price)}) from ${ord.orderNumber} into permanent ${category} menu.`,
    });

    return newMenuItem;
  };

  const discrepancies = useMemo<DiscrepancyAlert[]>(() => {
    const alerts: DiscrepancyAlert[] = [];
    const now = Date.now();

    orders.forEach((ord) => {
      if (ord.status === 'cancelled' || ord.status === 'draft') return;
      const balance = Math.max(0, ord.total - (ord.paidAmount || 0));

      if ((ord.status === 'served' || ord.status === 'completed') && balance > 0) {
        alerts.push({
          id: `disc-unpaid-${ord.id}`,
          severity: 'critical',
          type: ord.paidAmount > 0 ? 'partial_balance' : 'served_unpaid',
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          title: ord.paidAmount > 0 ? 'Served Order with Partial Payment Balance' : 'Order Marked Served but Unpaid',
          detail: `${ord.tableNumber || ord.customerName} · Paid ${formatMoney(ord.paidAmount || 0)} of ${formatMoney(ord.total)}`,
          amountImpact: balance,
        });
      }

      ord.items.forEach((it, idx) => {
        if (it.status === 'rejected') {
          alerts.push({
            id: `disc-rej-${ord.id}-${idx}`,
            severity: 'warning',
            type: 'rejected_item',
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            title: `Kitchen Rejected Item: ${it.name}`,
            detail: `Rejected by ${it.rejectedBy || 'Kitchen'} · Reason: ${it.rejectionReason || 'Not specified'}`,
            amountImpact: it.price * it.quantity,
          });
        }
      });

      const ageMins = Math.floor((now - new Date(ord.createdAt).getTime()) / 60000);
      if (
        (ord.status === 'sent_to_kitchen' || ord.status === 'accepted' || ord.status === 'preparing') &&
        ageMins > 25
      ) {
        alerts.push({
          id: `disc-age-${ord.id}`,
          severity: 'warning',
          type: 'overdue_open',
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          title: `Kitchen Ticket Open > 25 mins (${ageMins}m)`,
          detail: `${ord.kotNumber || ord.orderNumber} (${ord.tableNumber || ord.customerName}) still in ${ord.status.replace('_', ' ')}`,
          amountImpact: ord.total,
        });
      }
    });

    approvalRequests
      .filter((r) => r.status === 'pending')
      .forEach((req) => {
        alerts.push({
          id: `disc-apr-${req.id}`,
          severity: 'warning',
          type: 'unapproved_adjustment',
          orderId: req.orderId,
          orderNumber: req.orderNumber,
          title: `Pending Manager Approval: ${req.actionType.replace('_', ' ')}`,
          detail: `${req.requestedBy}: ${req.details}`,
          amountImpact: req.amountImpact,
        });
      });

    return alerts;
  }, [orders, approvalRequests]);

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
    invoiceRef: string,
    expiryDate?: string
  ) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing || quantityUnits <= 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const incomingUnitCost = quantityUnits > 0 && cost > 0 ? cost / quantityUnits : ing.costPerPurchaseUnit / ing.conversionRatio;
    const existingQty = Math.max(0, ing.currentStockUnits);
    const existingUnitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const weightedUnitCost =
      existingQty + quantityUnits > 0
        ? (existingQty * existingUnitCost + quantityUnits * incomingUnitCost) / (existingQty + quantityUnits)
        : incomingUnitCost;
    const updatedCostPerPurchase = Math.round(weightedUnitCost * ing.conversionRatio);

    // Delivery always lands into Main Store & updates weighted-average valuation
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
            costPerPurchaseUnit: updatedCostPerPurchase,
            lastUnitCost: Math.round(incomingUnitCost * 100) / 100,
          };
        }
        return item;
      })
    );

    const computedExpiry =
      expiryDate ||
      (ing.shelfLifeDays
        ? new Date(Date.now() + ing.shelfLifeDays * 86400000).toISOString().split('T')[0]
        : undefined);
    const lotNumber = `LOT-${ing.id.replace('ing-', '').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newLot: StockBatchLot = {
      id: `lot-${Date.now()}`,
      ingredientId,
      lotNumber,
      location: 'main_store',
      initialQty: quantityUnits,
      remainingQty: quantityUnits,
      unit: ing.consumptionUnit,
      unitCost: Math.round(incomingUnitCost * 100) / 100,
      receivedDate: todayStr,
      expiryDate: computedExpiry,
      supplier: supplier || ing.supplier,
      invoiceRef: invoiceRef || `PO-${Math.floor(10000 + Math.random() * 90000)}`,
    };
    setStockLots((prev) => [newLot, ...prev]);

    // Record formal Stock Movement
    const movement: StockMovement = {
      id: `sm-${Date.now()}`,
      ingredientId,
      ingredientName: ing.name,
      type: 'purchase_intake',
      quantityDelta: quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: cost,
      date: todayStr,
      reference: invoiceRef || newLot.invoiceRef,
      batchNumber: lotNumber,
      reason: `Received into Main Store from ${supplier || ing.supplier} (Weighted Avg recalculated to ${formatMoney(updatedCostPerPurchase)} / ${ing.purchaseUnit})`,
      recordedBy: 'David Kasambala (Manager)',
      destinationLocation: 'main_store',
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: 'Goods Received & Recipe Costs Synced',
      message: `+${quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} (${lotNumber}) received. Unit cost recalculated for live BOM recipes.`,
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

    consumeStockLots(ingredientId, quantityUnits, location);

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

  // Method 3: Direct Stock Consumption Without BOM (e.g. deep-fryer oil, cleaning/prep consumables, un-recipied items)
  const recordDirectConsumption = (params: {
    ingredientId: string;
    quantityUnits: number;
    location: 'kitchen' | 'main_store';
    reason: string;
    recordedBy?: string;
  }): boolean => {
    const ing = ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.quantityUnits <= 0) return false;

    const available =
      params.location === 'kitchen' ? ing.kitchenStockUnits ?? 0 : ing.storeStockUnits ?? 0;
    if (params.quantityUnits > available) return false;

    consumeStockLots(params.ingredientId, params.quantityUnits, params.location);

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id !== params.ingredientId) return item;
        const kStock =
          params.location === 'kitchen'
            ? Math.max(0, (item.kitchenStockUnits ?? 0) - params.quantityUnits)
            : item.kitchenStockUnits ?? 0;
        const sStock =
          params.location === 'main_store'
            ? Math.max(0, (item.storeStockUnits ?? 0) - params.quantityUnits)
            : item.storeStockUnits ?? 0;
        return {
          ...item,
          kitchenStockUnits: kStock,
          storeStockUnits: sStock,
          currentStockUnits: kStock + sStock,
        };
      })
    );

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const costImpact = Math.round(unitCost * params.quantityUnits);
    const movement: StockMovement = {
      id: `sm-dir-${Date.now()}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'direct_consumption',
      quantityDelta: -params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact,
      date: new Date().toISOString().split('T')[0],
      reference: `DIR-${Math.floor(1000 + Math.random() * 9000)}`,
      reason: params.reason || 'Direct operational consumption (Non-BOM)',
      recordedBy: params.recordedBy || 'Chef Hamisi Juma',
      sourceLocation: params.location,
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotification({
      title: 'Direct Stock Consumption Logged',
      message: `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} consumed directly (${formatMoney(costImpact)}).`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    return true;
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

  // ATOMIC VALIDATION: Check Kitchen Stock & Prepared Sub-Recipe Batches for Production
  const validateBatchKitchenStock = (
    recipeId: string,
    batches: number = 1,
    actualInputs?: Record<string, number>
  ) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      return { canCook: false, missingItems: [], totalCost: 0, targetYieldPlates: 0 };
    }

    const multiplier = Math.max(0.1, batches);
    const targetYieldPlates = Math.round((recipe.batchYieldPlates || 1) * multiplier);
    let totalCost = 0;

    const missingItems: MissingStockItem[] = recipe.ingredients.map((ri) => {
      const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);

      // Sub-Recipe Input Line (resolves against prepared SubRecipeStockBatch, never double-deducting raw!)
      if (ri.isSubRecipe && ri.subRecipeId) {
        const subRec = recipes.find((r) => r.id === ri.subRecipeId);
        const subName = subRec?.name || 'Prepared Sub-Recipe';
        const subUnit = ri.subRecipeUnit || subRec?.yieldUnit || 'portions';
        const baseSubReq =
          (ri.subRecipeQuantity ?? ri.batchQuantity ?? (ri.quantity * (recipe.batchYieldPlates || 1))) *
          multiplier;
        const standardReq = Math.round(baseSubReq / yieldFactor);
        const requiredQty =
          actualInputs && actualInputs[ri.subRecipeId] !== undefined
            ? Math.max(0, Math.round(actualInputs[ri.subRecipeId]))
            : standardReq;

        const availableSubBatches = subRecipeBatches.filter(
          (sb) =>
            sb.subRecipeId === ri.subRecipeId &&
            sb.remainingQty > 0 &&
            sb.status !== 'reversed' &&
            sb.status !== 'expired'
        );
        const availableKitchenQty = Math.round(
          availableSubBatches.reduce((sum, sb) => sum + sb.remainingQty, 0)
        );
        const subUnitCost =
          availableSubBatches.length > 0
            ? availableSubBatches[0].costPerUnit
            : computeRecipeUnitCost(ri.subRecipeId).unitCost;

        totalCost += Math.round(requiredQty * subUnitCost);

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
          ingredientId: ri.subRecipeId,
          ingredientName: `${subName} (Prepared Sub-Recipe)`,
          requiredQty,
          availableKitchenQty,
          storeAvailableQty: 0,
          inTransitQty: 0,
          unit: subUnit,
          status,
          shortageQty,
          isSubRecipe: true,
          subRecipeId: ri.subRecipeId,
        };
      }

      // Raw Ingredient Input Line
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      const ingredientName = ing ? ing.name : 'Unknown Ingredient';
      const unit = ing ? ing.consumptionUnit : 'units';
      const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;

      const rawRequired = (ri.batchQuantity ?? (ri.quantity * (recipe.batchYieldPlates || 1))) * multiplier;
      const standardReq = Math.round(rawRequired / yieldFactor);
      const requiredQty =
        actualInputs && actualInputs[ri.ingredientId] !== undefined
          ? Math.max(0, Math.round(actualInputs[ri.ingredientId]))
          : standardReq;

      const availableKitchenQty = ing?.kitchenStockUnits ?? 0;
      const storeAvailableQty = ing?.storeStockUnits ?? 0;
      const inTransitQty = stockMovements
        .filter((m) => m.ingredientId === ri.ingredientId && m.transferStatus === 'in_transit')
        .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

      const subIng = ri.substituteIngredientId
        ? ingredients.find((i) => i.id === ri.substituteIngredientId)
        : undefined;

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
        substituteIngredientId: subIng?.id,
        substituteIngredientName: subIng?.name,
        substituteKitchenQty: subIng?.kitchenStockUnits ?? 0,
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

  // COOK BATCH PRODUCTION: Supports Finished Batches, Sub-Recipes, and Method 2 Semi-Standardized Input Overrides
  const cookBatchProduction = (params: {
    recipeId: string;
    batches: number;
    actualPlatesProduced?: number;
    actualInputs?: Record<string, number>;
    chefName?: string;
    managerOverride?: boolean;
    overrideReason?: string;
  }): { success: boolean; error?: string; log?: ProductionLog } => {
    const recipe = recipes.find((r) => r.id === params.recipeId);
    if (!recipe) return { success: false, error: 'Recipe not found in Master Data' };

    const validation = validateBatchKitchenStock(params.recipeId, params.batches, params.actualInputs);
    const stdValidation = params.actualInputs
      ? validateBatchKitchenStock(params.recipeId, params.batches)
      : validation;

    if (!validation.canCook && !params.managerOverride) {
      const blockedReasons = validation.missingItems
        .filter((m) => m.status !== 'ok')
        .map(
          (m) =>
            `${m.ingredientName}: required ${m.requiredQty.toLocaleString()} ${m.unit}, available ${m.availableKitchenQty.toLocaleString()} ${m.unit} (${
              m.isSubRecipe
                ? 'cook sub-recipe batch first'
                : m.status === 'not_transferred'
                ? 'not transferred to kitchen'
                : `short by ${m.shortageQty.toLocaleString()} ${m.unit}`
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
        message: `Attempt to cook ${recipe.name} blocked: missing raw stock or sub-recipe batch in Kitchen.`,
        type: 'kitchen',
        actionRole: 'manager',
        actionLabel: 'View Blocked Logs',
      });

      return {
        success: false,
        error: `Cannot cook ${params.batches} batch of ${recipe.name}. Missing items: ${blockedReasons}`,
      };
    }

    const actualOutputQty = params.actualPlatesProduced || validation.targetYieldPlates;
    const costPerUnit = actualOutputQty > 0 ? validation.totalCost / actualOutputQty : 0;
    const costPerPlate = Math.round(costPerUnit);
    const today = new Date().toISOString().split('T')[0];
    const timestampStr = `${today} ${new Date().toTimeString().substring(0, 5)}`;
    const expiryDt = recipe.shelfLifeHours
      ? new Date(Date.now() + recipe.shelfLifeHours * 3600000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 16)
      : undefined;
    const batchNumber = `${recipe.isSubRecipe ? 'SUB' : 'BATCH'}-${(recipe.code || recipe.id.slice(-3)).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const consumedDetails: ProductionLog['ingredientsConsumed'] = [];
    const inputAdjustments: NonNullable<ProductionLog['actualInputAdjustments']> = [];
    const newMovements: StockMovement[] = [];

    const rawRequirements = validation.missingItems.filter((m) => !m.isSubRecipe);
    const subRequirements = validation.missingItems.filter((m) => m.isSubRecipe && m.subRecipeId);

    // Record Semi-Standardized actual vs standard input variances
    validation.missingItems.forEach((req, idx) => {
      const stdReq = stdValidation.missingItems[idx]?.requiredQty ?? req.requiredQty;
      if (stdReq !== req.requiredQty) {
        inputAdjustments.push({
          ingredientId: req.ingredientId,
          ingredientName: req.ingredientName,
          standardQty: stdReq,
          actualQty: req.requiredQty,
          unit: req.unit,
        });
      }
    });

    // 1. Deduct Sub-Recipe Inputs (FEFO)
    if (subRequirements.length > 0) {
      setSubRecipeBatches((prev) => {
        const copy = prev.map((b) => ({ ...b }));
        subRequirements.forEach((req) => {
          let rem = req.requiredQty;
          const candidates = copy
            .filter(
              (b) =>
                b.subRecipeId === req.subRecipeId &&
                b.remainingQty > 0 &&
                b.status !== 'reversed' &&
                b.status !== 'expired'
            )
            .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

          let subLineCost = 0;
          for (const sb of candidates) {
            if (rem <= 0) break;
            const take = Math.min(sb.remainingQty, rem);
            sb.remainingQty = Math.round((sb.remainingQty - take) * 100) / 100;
            sb.status =
              sb.remainingQty <= 0
                ? 'consumed'
                : sb.remainingQty <= sb.producedQty * 0.2
                ? 'low'
                : 'available';
            subLineCost += Math.round(take * sb.costPerUnit);
            rem -= take;
          }

          consumedDetails.push({
            ingredientId: req.ingredientId,
            ingredientName: req.ingredientName,
            quantity: req.requiredQty,
            unit: req.unit,
            cost: subLineCost,
            isSubRecipe: true,
            subRecipeId: req.subRecipeId,
          });

          newMovements.push({
            id: `sm-prod-sub-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            ingredientId: req.ingredientId,
            ingredientName: req.ingredientName,
            type: 'production_issue',
            quantityDelta: -req.requiredQty,
            unit: req.unit,
            costImpact: subLineCost,
            date: today,
            reference: batchNumber,
            batchNumber,
            recipeId: recipe.id,
            reason: `Issued prepared sub-recipe into ${batchNumber} (${recipe.name})`,
            recordedBy: params.chefName || 'Executive Chef Juma',
            sourceLocation: 'kitchen',
          });
        });
        return copy;
      });
    }

    // 2. Deduct Raw Ingredients from Kitchen Stock + FEFO/FIFO lots
    if (rawRequirements.length > 0) {
      setIngredients((prev) => {
        const copy = [...prev];
        rawRequirements.forEach((req) => {
          const idx = copy.findIndex((ing) => ing.id === req.ingredientId);
          if (idx >= 0) {
            const ing = copy[idx];
            const kStock = Math.max(0, (ing.kitchenStockUnits ?? 0) - req.requiredQty);
            const sStock = ing.storeStockUnits ?? 0;
            const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
            const lineCost = Math.round(unitCost * req.requiredQty);

            consumeStockLots(ing.id, req.requiredQty, 'kitchen');

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
              type: 'production_issue',
              quantityDelta: -req.requiredQty,
              unit: ing.consumptionUnit,
              costImpact: lineCost,
              date: today,
              reference: batchNumber,
              batchNumber,
              recipeId: recipe.id,
              reason: `Batch production ${batchNumber} (${actualOutputQty.toLocaleString()} ${recipe.yieldUnit || 'plates'}) of ${recipe.name || 'Dish'}`,
              recordedBy: params.chefName || 'Executive Chef Juma',
              sourceLocation: 'kitchen',
            });
          }
        });
        return copy;
      });
    }

    // 3. Output Stage: Sub-Recipe Stock Batch OR Finished Prepared Dish Pool
    const targetMenuItemId = recipe.menuItemId || recipe.id;
    if (recipe.isSubRecipe) {
      const outputUnit = recipe.yieldUnit || 'grams';
      const newSubBatch: SubRecipeStockBatch = {
        id: `subb-${Date.now()}`,
        batchNumber,
        subRecipeId: recipe.id,
        name: recipe.name || 'Prepared Sub-Recipe',
        producedQty: actualOutputQty,
        remainingQty: actualOutputQty,
        unit: outputUnit,
        totalCost: validation.totalCost,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
        preparedAt: timestampStr,
        expiresAt: expiryDt || `${today} 23:59`,
        preparedBy: params.chefName || 'Executive Chef Juma',
        status: 'available',
      };
      setSubRecipeBatches((prev) => [newSubBatch, ...prev]);

      newMovements.push({
        id: `sm-out-${Date.now()}`,
        ingredientId: recipe.id,
        ingredientName: `${recipe.name} [Prepared Sub-Recipe]`,
        type: 'production_output',
        quantityDelta: actualOutputQty,
        unit: outputUnit,
        costImpact: validation.totalCost,
        date: today,
        reference: batchNumber,
        batchNumber,
        recipeId: recipe.id,
        reason: `Produced sub-recipe batch ${batchNumber} (${formatMoney(Math.round(costPerUnit * 100) / 100)}/${outputUnit})`,
        recordedBy: params.chefName || 'Executive Chef Juma',
        destinationLocation: 'kitchen',
      });
    } else {
      setPreparedDishStocks((prev) => {
        const exists = prev.find((p) => p.menuItemId === targetMenuItemId);
        if (exists) {
          return prev.map((p) =>
            p.menuItemId === targetMenuItemId
              ? {
                  ...p,
                  preparedPlatesAvailable: p.preparedPlatesAvailable + actualOutputQty,
                  totalCookedToday: p.totalCookedToday + actualOutputQty,
                  lastCookedAt: timestampStr,
                  status: 'ready',
                }
              : p
          );
        }
        return [
          {
            menuItemId: targetMenuItemId,
            dishName: recipe.name || 'Dish',
            preparedPlatesAvailable: actualOutputQty,
            totalCookedToday: actualOutputQty,
            totalSoldToday: 0,
            lastCookedAt: timestampStr,
            status: 'ready',
          },
          ...prev,
        ];
      });
    }

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    const newProdLog: ProductionLog = {
      id: `prod-${Date.now()}`,
      batchNumber,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      menuItemId: targetMenuItemId,
      dishName: recipe.name || 'Dish',
      productionType: recipe.isSubRecipe
        ? 'sub_recipe'
        : recipe.productionMethod === 'semi_standardized'
        ? 'semi_standardized'
        : 'batch_finished',
      batchesCooked: params.batches,
      targetYieldPlates: validation.targetYieldPlates,
      actualPlatesProduced: actualOutputQty,
      unitLabel: recipe.yieldUnit || 'plates',
      totalCost: validation.totalCost,
      costPerPlate,
      cookedBy: params.chefName || 'Executive Chef Juma',
      timestamp: timestampStr,
      expiryDate: expiryDt,
      remainingPlates: actualOutputQty,
      status: 'completed',
      ingredientsConsumed: consumedDetails,
      actualInputAdjustments: inputAdjustments.length > 0 ? inputAdjustments : undefined,
      managerOverride: params.managerOverride,
      overrideReason: params.overrideReason,
    };

    setProductionLogs((prev) => [newProdLog, ...prev]);

    addNotification({
      title: recipe.isSubRecipe ? 'Sub-Recipe Batch Prepared' : 'Batch Production Complete',
      message: `${batchNumber}: Produced ${actualOutputQty.toLocaleString()} ${recipe.yieldUnit || 'plates'} of ${recipe.name}. Raw & sub-recipe stock updated.`,
      type: 'kitchen',
      actionRole: 'kitchen',
      actionLabel: 'View Production Batches',
    });

    return { success: true, log: newProdLog };
  };

  // Controlled Production Reversal (preserves complete audit trail, never deletes records)
  const reverseProductionBatch = (
    productionLogId: string,
    reason: string,
    actor: string = 'David Kasambala (Manager)'
  ): { success: boolean; error?: string } => {
    const log = productionLogs.find((l) => l.id === productionLogId);
    if (!log) return { success: false, error: 'Production log not found.' };
    if (log.status === 'reversed') return { success: false, error: 'Batch has already been reversed.' };

    const today = new Date().toISOString().split('T')[0];
    const nowStr = `${today} ${new Date().toTimeString().substring(0, 5)}`;

    let recoverableRatio = 1;
    if (log.productionType === 'sub_recipe') {
      const subBatch = subRecipeBatches.find((sb) => sb.batchNumber === log.batchNumber);
      if (subBatch && subBatch.producedQty > 0) {
        recoverableRatio = subBatch.remainingQty / subBatch.producedQty;
        setSubRecipeBatches((prev) =>
          prev.map((sb) =>
            sb.batchNumber === log.batchNumber ? { ...sb, remainingQty: 0, status: 'reversed' } : sb
          )
        );
      }
    } else {
      const unSold = Math.max(0, log.remainingPlates);
      recoverableRatio = log.actualPlatesProduced > 0 ? unSold / log.actualPlatesProduced : 0;
      if (unSold > 0) {
        setPreparedDishStocks((prev) =>
          prev.map((p) => {
            if (p.menuItemId !== log.menuItemId) return p;
            const nextAvail = Math.max(0, p.preparedPlatesAvailable - unSold);
            return {
              ...p,
              preparedPlatesAvailable: nextAvail,
              totalCookedToday: Math.max(0, p.totalCookedToday - unSold),
              status: nextAvail === 0 ? 'out_of_stock' : nextAvail <= 10 ? 'low' : 'ready',
            };
          })
        );
      }
    }

    // Return unconsumed portion of raw / sub-recipe inputs back to Kitchen stock and record reversal movements
    const reversalMovements: StockMovement[] = [];
    if (recoverableRatio > 0) {
      log.ingredientsConsumed.forEach((ic) => {
        const restoreQty = Math.round(ic.quantity * recoverableRatio);
        if (restoreQty <= 0) return;

        if (ic.isSubRecipe && ic.subRecipeId) {
          setSubRecipeBatches((prev) =>
            prev.map((sb) =>
              sb.subRecipeId === ic.subRecipeId && sb.status !== 'reversed'
                ? { ...sb, remainingQty: sb.remainingQty + restoreQty, status: 'available' }
                : sb
            )
          );
        } else {
          setIngredients((prev) =>
            prev.map((ing) =>
              ing.id === ic.ingredientId
                ? {
                    ...ing,
                    kitchenStockUnits: (ing.kitchenStockUnits ?? 0) + restoreQty,
                    currentStockUnits: (ing.kitchenStockUnits ?? 0) + restoreQty + (ing.storeStockUnits ?? 0),
                  }
                : ing
            )
          );
        }

        reversalMovements.push({
          id: `sm-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ingredientId: ic.ingredientId,
          ingredientName: ic.ingredientName,
          type: 'production_reversal',
          quantityDelta: restoreQty,
          unit: ic.unit,
          costImpact: Math.round(ic.cost * recoverableRatio),
          date: today,
          reference: log.batchNumber || log.id,
          batchNumber: log.batchNumber,
          recipeId: log.recipeId,
          reason: `Controlled batch reversal (${Math.round(recoverableRatio * 100)}% unused): ${reason}`,
          recordedBy: actor,
          destinationLocation: 'kitchen',
          isReversed: true,
        });
      });
    }

    if (reversalMovements.length > 0) {
      setStockMovements((prev) => [...reversalMovements, ...prev]);
    }

    setProductionLogs((prev) =>
      prev.map((pl) =>
        pl.id === productionLogId
          ? {
              ...pl,
              remainingPlates: 0,
              status: 'reversed',
              reversedAt: nowStr,
              reversedBy: actor,
              reversalReason: reason,
            }
          : pl
      )
    );

    logAuditEvent({
      actor,
      actorRole: 'manager',
      action: 'PRODUCTION_BATCH_REVERSED',
      details: `Controlled reversal of ${log.batchNumber || log.dishName} (${Math.round(recoverableRatio * 100)}% unused output restored). Reason: ${reason}`,
    });

    addNotification({
      title: 'Production Batch Reversed',
      message: `${log.batchNumber || log.dishName} reversed by ${actor}. Audit trail preserved.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    return { success: true };
  };

  // One-Click Requisition for Missing Batch Ingredients (Store -> Kitchen)
  const createRequisitionForMissing = (missingItems: MissingStockItem[], shift: string = 'Daily Operation Prep'): boolean => {
    const shortages = missingItems.filter((m) => m.status !== 'ok' && !m.isSubRecipe);
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
    const latestLog = productionLogs.find(
      (pl) => pl.menuItemId === menuItemId && pl.status !== 'reversed' && pl.costPerPlate > 0
    );
    const cogsPerPlate =
      latestLog?.costPerPlate || (recipe ? computeRecipeUnitCost(recipe.id).perPlateCost : 2500);
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

  // Recompute Theoretical vs Actual Variance dynamically from live movements & physical counts (never modifies approved recipes!)
  const recomputeDailyVariance = () => {
    const today = new Date().toISOString().split('T')[0];
    setDailyReconciliations((prev) => {
      const existingMap = new Map(prev.map((item) => [item.ingredientId, item]));
      return ingredients.slice(0, 8).map((ing) => {
        const existing = existingMap.get(ing.id);
        const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
        const transferredToday = stockMovements
          .filter(
            (m) =>
              m.ingredientId === ing.id &&
              m.type === 'stock_transfer' &&
              m.destinationLocation === 'kitchen' &&
              m.date === today
          )
          .reduce((s, m) => s + Math.abs(m.quantityDelta), 0);
        const theoreticalToday = stockMovements
          .filter(
            (m) =>
              m.ingredientId === ing.id &&
              (m.type === 'kitchen_consumption' || m.type === 'production_issue' || m.type === 'direct_consumption') &&
              m.date === today
          )
          .reduce((s, m) => s + Math.abs(m.quantityDelta), 0);

        const opening = existing?.openingKitchenStock ?? Math.max(0, (ing.kitchenStockUnits ?? 0) + theoreticalToday - transferredToday);
        const expectedClosing = Math.max(0, opening + transferredToday - theoreticalToday);
        const actualCounted = existing?.actualCountedStock ?? (ing.kitchenStockUnits ?? expectedClosing);
        const varianceQty = actualCounted - expectedClosing;
        const varianceCost = Math.round(Math.abs(varianceQty) * unitCost);
        let varianceType: DailyReconciliationItem['varianceType'] = 'match';
        if (varianceQty < 0) {
          varianceType =
            Math.abs(varianceQty) > Math.max(1, expectedClosing) * 0.1
              ? 'unaccounted_loss'
              : 'over_portioning';
        } else if (varianceQty > 0) {
          varianceType = 'surplus';
        }

        return {
          ingredientId: ing.id,
          ingredientName: ing.name,
          unit: ing.consumptionUnit,
          openingKitchenStock: opening,
          transferredToKitchen: transferredToday || (existing?.transferredToKitchen ?? 0),
          theoreticalUsage: theoreticalToday || (existing?.theoreticalUsage ?? 0),
          actualUsage: Math.max(0, opening + (transferredToday || (existing?.transferredToKitchen ?? 0)) - actualCounted),
          expectedClosingStock: expectedClosing,
          actualCountedStock: actualCounted,
          varianceQty,
          varianceCost,
          varianceType,
          status: existing?.status ?? 'pending',
          notes: existing?.notes,
        };
      });
    });
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
            varianceType = Math.abs(varianceQty) > Math.max(1, item.expectedClosingStock) * 0.1 ? 'unaccounted_loss' : 'over_portioning';
          } else if (varianceQty > 0) {
            varianceType = 'surplus';
          }
          return {
            ...item,
            actualCountedStock: actualCount,
            actualUsage: Math.max(0, item.openingKitchenStock + item.transferredToKitchen - actualCount),
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

    // Sync kitchen physical stock to actual counted stock (never alters approved recipes!)
    const countedMap = new Map(dailyReconciliations.map((d) => [d.ingredientId, d.actualCountedStock]));
    setIngredients((prev) =>
      prev.map((ing) => {
        const counted = countedMap.get(ing.id);
        if (counted === undefined) return ing;
        const sStock = ing.storeStockUnits ?? 0;
        return {
          ...ing,
          kitchenStockUnits: Math.max(0, counted),
          currentStockUnits: Math.max(0, counted) + sStock,
        };
      })
    );

    setDailyReconciliations((prev) =>
      prev.map((item) => {
        totalVariance += item.varianceCost;
        if (item.varianceQty !== 0) {
          newMovements.push({
            id: `sm-${Date.now()}-${item.ingredientId}`,
            ingredientId: item.ingredientId,
            ingredientName: item.ingredientName,
            type: 'reconciliation_adjustment',
            quantityDelta: item.varianceQty,
            unit: item.unit,
            costImpact: item.varianceCost,
            date: today,
            reference: `RECON-${today}`,
            reason: `Physical closing variance (${item.varianceType.replace(/_/g, ' ')}): ${item.notes || 'End-of-day stock count'}`,
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
      message: `Physical closing counts synced by ${staffName}. Variance impact: ${formatMoney(totalVariance)}. Approved recipes unchanged.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Audit Ledger',
    });

    return { success: true, totalVarianceCost: totalVariance };
  };

  // Staff Advances, Employee Directory & Waiter Stats
  const addAdvanceRequest = (
    employeeId: string,
    amount: number,
    reason: string,
    options?: { autoApprove?: boolean; repaymentMonth?: string; approvedBy?: string }
  ) => {
    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (cleanAmount <= 0) return;
    const isAuto = options?.autoApprove !== false;
    const emp = employees.find((e) => e.id === employeeId);
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: [
                ...e.advances,
                {
                  id: `adv-${Date.now()}`,
                  amount: cleanAmount,
                  date: new Date().toISOString().split('T')[0],
                  approved: isAuto,
                  status: isAuto ? 'approved' : 'pending',
                  reason: reason.trim() || 'Staff salary advance',
                  approvedBy: isAuto ? options?.approvedBy || 'Manager' : undefined,
                  repaymentMonth: options?.repaymentMonth || new Date().toISOString().slice(0, 7),
                },
              ],
            }
          : e
      )
    );
    logAuditEvent({
      actor: options?.approvedBy || 'HR / Reception',
      actorRole: activeRole,
      action: isAuto ? 'SALARY_ADVANCE_APPROVED' : 'SALARY_ADVANCE_REQUESTED',
      details: `${emp?.name || employeeId}: ${formatMoney(cleanAmount)} (${reason.trim()})`,
    });
  };

  const approveAdvance = (employeeId: string, advanceId: string, approvedBy: string = 'Manager') => {
    const emp = employees.find((e) => e.id === employeeId);
    const adv = emp?.advances.find((a) => a.id === advanceId);
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: e.advances.map((a) =>
                a.id === advanceId
                  ? { ...a, approved: true, status: 'approved', approvedBy }
                  : a
              ),
            }
          : e
      )
    );
    if (emp && adv) {
      logAuditEvent({
        actor: approvedBy,
        actorRole: activeRole,
        action: 'SALARY_ADVANCE_APPROVED',
        details: `Approved ${formatMoney(adv.amount)} advance for ${emp.name}`,
      });
    }
  };

  const rejectAdvance = (employeeId: string, advanceId: string, reason?: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const adv = emp?.advances.find((a) => a.id === advanceId);
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: e.advances.map((a) =>
                a.id === advanceId
                  ? {
                      ...a,
                      approved: false,
                      status: 'rejected',
                      reason: reason ? `${a.reason} [Rejected: ${reason}]` : a.reason,
                    }
                  : a
              ),
            }
          : e
      )
    );
    if (emp && adv) {
      logAuditEvent({
        actor: 'Manager',
        actorRole: activeRole,
        action: 'SALARY_ADVANCE_REJECTED',
        details: `Rejected ${formatMoney(adv.amount)} advance for ${emp.name}${reason ? ` (${reason})` : ''}`,
      });
    }
  };

  const markAdvanceRepaid = (employeeId: string, advanceId: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const adv = emp?.advances.find((a) => a.id === advanceId);
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: e.advances.map((a) =>
                a.id === advanceId
                  ? { ...a, approved: false, status: 'repaid' }
                  : a
              ),
            }
          : e
      )
    );
    if (emp && adv) {
      logAuditEvent({
        actor: 'Cashier / HR',
        actorRole: activeRole,
        action: 'SALARY_ADVANCE_REPAID',
        details: `${emp.name} repaid ${formatMoney(adv.amount)} advance in cash`,
      });
    }
  };

  const updateAdvance = (employeeId: string, advanceId: string, amount: number, reason: string) => {
    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    if (cleanAmount <= 0) return;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: e.advances.map((a) =>
                a.id === advanceId ? { ...a, amount: cleanAmount, reason: reason.trim() || a.reason } : a
              ),
            }
          : e
      )
    );
  };

  const addEmployee = (emp: Omit<Employee, 'id' | 'employeeNumber' | 'advances'>): Employee => {
    const nextNum = employees.length + 1;
    const empNumber = `EMP-${String(nextNum).padStart(3, '0')}`;
    const newEmp: Employee = {
      ...emp,
      id: `emp-${Date.now()}`,
      employeeNumber: empNumber,
      advances: [],
    };
    setEmployees((prev) => [...prev, newEmp]);

    if (emp.role === 'waiter') {
      const codeBase = emp.name
        .trim()
        .split(/\s+/)[0]
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') || 'STAFF';
      const newWaiter: Waiter = {
        id: `waiter-${Date.now()}`,
        name: emp.name,
        phone: emp.phone,
        email: emp.email || `${codeBase.toLowerCase()}@savannagrill.com`,
        referralCode: `WAITER_${codeBase}_${nextNum}`,
        active: emp.status === 'active',
        commissionRate: defaultCommissionMode === 'percent' ? defaultCommissionValue / 100 : 0.05,
      };
      setWaiters((prev) => [...prev, newWaiter]);
    }

    logAuditEvent({
      actor: 'HR / Manager',
      actorRole: activeRole,
      action: 'EMPLOYEE_ONBOARDED',
      details: `Added ${newEmp.name} (${newEmp.employeeNumber} · ${newEmp.position}) at ${formatMoney(newEmp.baseSalary)}`,
    });
    return newEmp;
  };

  const updateEmployee = (employeeId: string, updates: Partial<Employee>) => {
    const target = employees.find((e) => e.id === employeeId);
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, ...updates } : e))
    );
    if (target && updates.status) {
      setWaiters((prev) =>
        prev.map((w) =>
          w.name === target.name ? { ...w, active: updates.status === 'active' } : w
        )
      );
    }
    if (target) {
      logAuditEvent({
        actor: 'HR / Manager',
        actorRole: activeRole,
        action: 'EMPLOYEE_UPDATED',
        details: `Updated staff profile for ${updates.name || target.name}`,
      });
    }
  };

  const toggleWaiterActive = (waiterId: string) => {
    setWaiters((prev) =>
      prev.map((w) => (w.id === waiterId ? { ...w, active: !w.active } : w))
    );
  };

  const assignOrderWaiter = (orderId: string, waiterId: string) => {
    const waiter = waiters.find((w) => w.id === waiterId);
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? { ...ord, servingWaiterId: waiterId || undefined, updatedAt: new Date().toISOString() }
          : ord
      )
    );
    if (waiter) {
      logAuditEvent({
        orderId,
        actor: 'Reception Desk',
        actorRole: activeRole,
        action: 'WAITER_ASSIGNED',
        details: `Assigned waiter ${waiter.name} to order`,
      });
    }
  };

  // Tanzania TRA PAYE + 10% Employee NSSF calculation helper
  const computeTraPaye = (taxablePay: number): number => {
    if (taxablePay <= 270000) return 0;
    if (taxablePay <= 520000) return Math.round((taxablePay - 270000) * 0.08);
    if (taxablePay <= 760000) return Math.round(20000 + (taxablePay - 520000) * 0.2);
    if (taxablePay <= 1000000) return Math.round(68000 + (taxablePay - 760000) * 0.25);
    return Math.round(128000 + (taxablePay - 1000000) * 0.3);
  };

  const calculateEmployeePayroll = (employeeId: string, period: string = '2026-11') => {
    const emp = employees.find((e) => e.id === employeeId);
    const paymentRecord = payrollPayments.find(
      (p) => p.employeeId === employeeId && p.period === period
    );
    if (!emp) {
      return {
        basicSalary: 0,
        allowances: 0,
        commission: 0,
        grossPay: 0,
        nssfDeduction: 0,
        payeTax: 0,
        approvedAdvances: 0,
        netPayable: 0,
        isPaidForPeriod: false,
      };
    }

    if (paymentRecord) {
      return {
        basicSalary: paymentRecord.basicSalary,
        allowances: paymentRecord.allowances,
        commission: paymentRecord.commission,
        grossPay: paymentRecord.grossPay,
        nssfDeduction: paymentRecord.nssfDeduction,
        payeTax: paymentRecord.payeTax,
        approvedAdvances: paymentRecord.advanceDeducted,
        netPayable: paymentRecord.netPaid,
        isPaidForPeriod: true,
        paymentRecord,
      };
    }

    const waiterMatch = waiters.find((w) => w.name === emp.name);
    const commission = waiterMatch ? calculateWaiterStats(waiterMatch.id).earnedCommission : 0;
    const basicSalary = emp.baseSalary;
    const allowances = emp.allowances || 0;
    const grossPay = basicSalary + allowances + commission;
    const nssfDeduction = Math.round(grossPay * 0.1); // 10% NSSF employee share
    const taxablePay = Math.max(0, grossPay - nssfDeduction);
    const payeTax = computeTraPaye(taxablePay);
    const approvedAdvances = emp.advances
      .filter((a) => {
        const st = a.status || (a.approved ? 'approved' : 'pending');
        return st === 'approved';
      })
      .reduce((sum, a) => sum + a.amount, 0);
    const netPayable = Math.max(0, grossPay - nssfDeduction - payeTax - approvedAdvances);

    return {
      basicSalary,
      allowances,
      commission,
      grossPay,
      nssfDeduction,
      payeTax,
      approvedAdvances,
      netPayable,
      isPaidForPeriod: false,
    };
  };

  const recordPayrollPayment = (params: {
    period: string;
    employeeIds: string[];
    method: 'bank_transfer' | 'mpesa' | 'cash';
    referencePrefix?: string;
    paidBy?: string;
  }): PayrollPaymentRecord[] => {
    const nowIso = new Date().toISOString();
    const payer = params.paidBy || 'David Kasambala (Manager)';
    const createdRecords: PayrollPaymentRecord[] = [];
    const settledEmpIds = new Set<string>();

    params.employeeIds.forEach((empId, idx) => {
      const emp = employees.find((e) => e.id === empId);
      if (!emp) return;
      const calc = calculateEmployeePayroll(empId, params.period);
      if (calc.isPaidForPeriod) return;

      const rec: PayrollPaymentRecord = {
        id: `pay-${Date.now()}-${idx}`,
        period: params.period,
        employeeId: emp.id,
        employeeName: emp.name,
        basicSalary: calc.basicSalary,
        allowances: calc.allowances,
        commission: calc.commission,
        grossPay: calc.grossPay,
        nssfDeduction: calc.nssfDeduction,
        payeTax: calc.payeTax,
        advanceDeducted: calc.approvedAdvances,
        netPaid: calc.netPayable,
        method: params.method,
        reference: `${params.referencePrefix || 'PAY'}-${params.period}-${emp.employeeNumber}`,
        paidAt: nowIso,
        paidBy: payer,
      };
      createdRecords.push(rec);
      settledEmpIds.add(emp.id);
    });

    if (createdRecords.length > 0) {
      setPayrollPayments((prev) => [...createdRecords, ...prev]);
      // Mark queued approved advances as 'deducted' so they are never double-deducted next cycle
      setEmployees((prev) =>
        prev.map((emp) => {
          if (!settledEmpIds.has(emp.id)) return emp;
          const payRec = createdRecords.find((r) => r.employeeId === emp.id);
          return {
            ...emp,
            advances: emp.advances.map((adv) => {
              const st = adv.status || (adv.approved ? 'approved' : 'pending');
              if (st !== 'approved') return adv;
              return {
                ...adv,
                status: 'deducted',
                deductedInPayrollId: payRec?.id,
              };
            }),
          };
        })
      );

      const totalNet = createdRecords.reduce((s, r) => s + r.netPaid, 0);
      addNotification({
        title: `Payroll Settled (${params.period})`,
        message: `${createdRecords.length} staff payslips paid (${formatMoney(totalNet)}) via ${params.method.replace('_', ' ').toUpperCase()}.`,
        type: 'payroll',
        actionRole: 'manager',
        actionLabel: 'View Payroll',
      });
      logAuditEvent({
        actor: payer,
        actorRole: activeRole,
        action: 'PAYROLL_DISBURSED',
        details: `Settled ${createdRecords.length} payslips for ${params.period} totaling ${formatMoney(totalNet)} via ${params.method}`,
      });
    }

    return createdRecords;
  };

  const setDefaultCommissionPolicy = (mode: CommissionMode, value: number) => {
    const cleanValue =
      mode === 'percent'
        ? Math.max(0, Math.min(100, Number(value) || 0))
        : Math.max(0, Math.round(Number(value) || 0));
    setDefaultCommissionMode(mode);
    setDefaultCommissionValue(cleanValue);
    if (mode === 'percent') {
      setWaiters((prev) => prev.map((w) => ({ ...w, commissionRate: cleanValue / 100 })));
    }
    addNotification({
      title: 'Waiter Commission Rule Updated',
      message:
        mode === 'percent'
          ? `Default waiter commission set to ${cleanValue}% of paid net sales.`
          : `Default waiter commission set to ${formatMoney(cleanValue)} fixed per paid order.`,
      type: 'payroll',
      actionRole: 'manager',
      actionLabel: 'View Rules',
    });
  };

  const getOrderCommission = (order: Order, waiterId?: string) => {
    const waiter = waiterId ? waiters.find((w) => w.id === waiterId) : undefined;
    const mode: CommissionMode = order.commissionMode ?? defaultCommissionMode;
    const fallbackVal =
      mode === 'percent' && waiter
        ? Math.round((waiter.commissionRate || 0.05) * 10000) / 100
        : defaultCommissionValue;
    const value = order.commissionValue !== undefined ? order.commissionValue : fallbackVal;
    const netSales = Math.max(0, order.subtotal - (order.discount || 0));
    const computed =
      order.commissionAmount !== undefined && order.commissionMode !== undefined
        ? order.commissionAmount
        : mode === 'percent'
        ? Math.round(netSales * (Math.max(0, Math.min(100, value)) / 100))
        : Math.max(0, Math.round(value));
    const isPaidEligible = order.paymentStatus === 'paid' && order.status !== 'cancelled';

    return {
      mode,
      value,
      amount: computed,
      isPaidEligible,
      configuredBy: order.commissionConfiguredBy || 'Auto Rule',
    };
  };

  const updateOrderCommission = (
    orderId: string,
    mode: CommissionMode,
    value: number,
    configuredBy: string = 'Manager',
    waiterId?: string
  ) => {
    const cleanValue =
      mode === 'percent'
        ? Math.max(0, Math.min(100, Number(value) || 0))
        : Math.max(0, Math.round(Number(value) || 0));

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const netSales = Math.max(0, ord.subtotal - (ord.discount || 0));
        const amount =
          mode === 'percent'
            ? Math.round(netSales * (cleanValue / 100))
            : Math.max(0, Math.round(cleanValue));
        return {
          ...ord,
          servingWaiterId: waiterId !== undefined ? waiterId || undefined : ord.servingWaiterId,
          commissionMode: mode,
          commissionValue: cleanValue,
          commissionAmount: amount,
          commissionConfiguredBy: configuredBy,
          commissionUpdatedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const settleWaiterCommission = (
    waiterId: string,
    amount?: number,
    options?: { method?: 'cash' | 'mpesa' | 'bank_transfer'; reference?: string; settledBy?: string }
  ) => {
    const stats = calculateWaiterStats(waiterId);
    const waiter = waiters.find((w) => w.id === waiterId);
    const rawAmt = amount !== undefined ? Math.max(0, amount) : stats.pendingCommission;
    const settleAmt = Math.min(stats.pendingCommission, Math.round(rawAmt));
    if (settleAmt <= 0 || !waiter) return;

    const method = options?.method || 'cash';
    const ref = options?.reference?.trim() || `COMM-${Date.now().toString().slice(-5)}`;
    const settledBy = options?.settledBy || 'David Kasambala (Manager)';

    setSettledCommissionByWaiter((prev) => ({
      ...prev,
      [waiterId]: (prev[waiterId] || 0) + settleAmt,
    }));

    const payout: CommissionPayoutLog = {
      id: `cp-${Date.now()}`,
      waiterId,
      waiterName: waiter.name,
      amount: settleAmt,
      method,
      reference: ref,
      settledAt: new Date().toISOString(),
      settledBy,
    };
    setCommissionPayouts((prev) => [payout, ...prev]);

    addNotification({
      title: `Commission Settled (${waiter.name})`,
      message: `Paid ${formatMoney(settleAmt)} via ${method.replace('_', ' ').toUpperCase()} (Ref: ${ref}).`,
      type: 'payroll',
      actionRole: 'manager',
      actionLabel: 'View Settlements',
    });
    logAuditEvent({
      actor: settledBy,
      actorRole: activeRole,
      action: 'COMMISSION_SETTLED',
      details: `Settled ${formatMoney(settleAmt)} waiter commission to ${waiter.name} via ${method} (${ref})`,
    });
  };

  const calculateWaiterStats = (waiterId: string) => {
    const myOrders = orders.filter(
      (o) => o.referralWaiterId === waiterId || o.servingWaiterId === waiterId
    );

    // Waiter commission is strictly earned ONLY on PAID, non-cancelled orders
    const paidOrders = myOrders.filter(
      (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled'
    );
    const unpaidOrders = myOrders.filter(
      (o) => o.paymentStatus !== 'paid' && o.status !== 'cancelled'
    );

    const todaySales = paidOrders.reduce(
      (sum, o) => sum + Math.max(0, o.subtotal - (o.discount || 0)),
      0
    );

    const pendingOrdersCount = myOrders.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled'
    ).length;

    const completedOrdersCount = paidOrders.length;
    const earnedCommission = paidOrders.reduce(
      (sum, o) => sum + getOrderCommission(o, waiterId).amount,
      0
    );
    const unpaidProjectedCommission = unpaidOrders.reduce(
      (sum, o) => sum + getOrderCommission(o, waiterId).amount,
      0
    );
    const paidCommission = settledCommissionByWaiter[waiterId] || 0;
    const pendingCommission = Math.max(0, earnedCommission - paidCommission);

    return {
      myOrders,
      todaySales,
      pendingOrdersCount,
      completedOrdersCount,
      unpaidOrdersCount: unpaidOrders.length,
      unpaidProjectedCommission,
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
        isStandalonePortal,
        initialTableNumber: deepLink.tableNumber,
        activeWaiterId,
        setActiveWaiterId,
        currency,
        toggleCurrency,
        formatMoney,
        taxEnabled,
        setTaxEnabled,
        taxRatePct,
        setTaxRatePct,
        defaultCommissionMode,
        defaultCommissionValue,
        setDefaultCommissionPolicy,
        updateOrderCommission,
        getOrderCommission,
        settleWaiterCommission,
        commissionPayouts,
        toggleWaiterActive,
        assignOrderWaiter,
        orders,
        tables,
        menuItems,
        ingredients,
        recipes,
        waiters,
        employees,
        payrollPayments,
        calculateEmployeePayroll,
        recordPayrollPayment,
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
        submitDraftToKitchen,
        updateOrderStatus,
        fastForwardOrderToServed,
        updateOrderItemStatus,
        rejectOrderItem,
        processPayment,
        auditLogs,
        approvalRequests,
        discrepancies,
        requestApproval,
        reviewApprovalRequest,
        cancelOrderControlled,
        promoteCustomItemToMenu,
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
        recordDirectConsumption,
        addNewIngredient,
        saveRecipe,
        deleteRecipe,
        bomDeductionPolicy,
        setBomDeductionPolicy,
        stockLots,
        subRecipeBatches,
        computeRecipeUnitCost,
        bomAuditLogs,
        productionLogs,
        preparedDishStocks,
        blockedCookingAttempts,
        logBlockedCookingAttempt,
        dailyReconciliations,
        updateDailyReconciliationCount,
        commitDailyReconciliation,
        recomputeDailyVariance,
        handleLeftoverPreparedPlates,
        validateBatchKitchenStock,
        cookBatchProduction,
        reverseProductionBatch,
        createRequisitionForMissing,
        addAdvanceRequest,
        approveAdvance,
        rejectAdvance,
        markAdvanceRepaid,
        updateAdvance,
        addEmployee,
        updateEmployee,
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
