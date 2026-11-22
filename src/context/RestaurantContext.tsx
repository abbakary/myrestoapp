import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
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
  PayrollPaymentRecord,
  CommissionPayoutLog,
  ProductionOrder,
  ProductionOrderStatus,
  ProductionModel,
  PurchaseRequest,
  BranchTransferRequest,
  CateringOrder,
  CateringOrderItem,
  CateringOrderStatus,
  RecipeStatus,
  SaasOrganization,
  BranchViewScope,
  EmailMessage,
  BranchMetricsSummary,
  PlatformSurface,
  LandingPageId,
  SaasPlanId,
  SaasPlanDefinition,
  SaasTenantStatus,
  SaasAccount,
  SaasAccountRole,
  SaasAccountStatus,
  ProviderAuditEvent,
  PlatformLeadInquiry,
} from '../types/restaurant';
import {
  SAAS_PLANS,
  INITIAL_ORGANIZATIONS,
  INITIAL_SAAS_ACCOUNTS,
  INITIAL_PROVIDER_AUDIT_LOGS,
  INITIAL_LEAD_INQUIRIES,
  INITIAL_BRANCHES,
  BranchWorkspaceStore,
  createInitialBranchStores,
  createStarterBranchStore,
} from '../data/saasSeeds';
import { parseAppDeepLink, notifyFlutterHost } from '../utils/mobileEnvironment';
import { apiClient, enqueueApiSync } from '../services/apiClient';
import type { ScaledRequirementRow, ScaledRequirementsResult, CartItem } from '../shared/types';
import {
  computeRecipeUnitCostPure,
  consumeStockLotsPure,
  validateBatchKitchenStockPure,
  calculateScaledRequirementsPure,
  deductStockForOrderLinesPure,
} from '../shared/costingEngine';
import {
  getOrderCommissionPure,
  calculateWaiterStatsPure,
  calculateEmployeePayrollPure,
} from '../shared/payrollEngine';
import {
  computeDiscrepanciesPure,
  computeBranchMetricsSummaryPure,
  computeProviderTenantSummariesPure,
  computeProviderStatsPure,
} from '../shared/analyticsEngine';

export type { ScaledRequirementRow, ScaledRequirementsResult, CartItem };

interface RestaurantContextType {
  organizations: SaasOrganization[];
  currentOrganization: SaasOrganization;
  setCurrentOrganizationId: (orgId: string) => void;
  createSaasTenant: (params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    branchName: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    address: string;
    plan?: SaasPlanId;
    status?: SaasTenantStatus;
    password?: string;
    switchToNew?: boolean;
  }) => { org: SaasOrganization; branch: RestaurantTenant; account: SaasAccount };
  tenants: RestaurantTenant[];
  allBranches: RestaurantTenant[];
  currentTenant: RestaurantTenant;
  setCurrentTenantId: (tenantId: string) => void;
  viewScope: BranchViewScope;
  setViewScope: (scope: BranchViewScope) => void;
  switchToHqOverview: () => void;
  workspaceRevision: number;
  activeOperator: {
    name: string;
    email: string;
    initials: string;
    roleLabel: string;
  };
  addBranchToCurrentOrg: (params: {
    name: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    email: string;
    managerName: string;
    address: string;
    cloneCatalogFromCurrent?: boolean;
  }) => RestaurantTenant | null;
  currentBranchQuota: {
    used: number;
    max: number;
    remaining: number;
    isAtLimit: boolean;
  };
  toggleBranchStatus: (branchId: string) => void;
  branchMetricsSummaries: BranchMetricsSummary[];
  hqAllOrders: Array<Order & { branchId: string; branchName: string }>;
  hqAllApprovals: Array<ApprovalRequest & { branchId: string; branchName: string }>;
  hqAllPurchaseRequests: Array<PurchaseRequest & { branchId: string; branchName: string }>;
  hqAllBranchTransfers: Array<BranchTransferRequest & { branchId: string; branchName: string }>;
  hqReviewApproval: (branchId: string, requestId: string, approve: boolean, managerName?: string) => void;
  hqDispatchBranchTransfer: (params: {
    fromBranchId: string;
    toBranchId: string;
    ingredientId: string;
    quantityUnits: number;
    actor?: string;
  }) => { success: boolean; message: string };
  hqUpdatePurchaseRequestStatus: (
    branchId: string,
    requestId: string,
    status: PurchaseRequest['status']
  ) => void;
  getBranchIngredients: (branchId: string) => Ingredient[];
  emails: EmailMessage[];
  unreadEmailCount: number;
  sendEmail: (params: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    category?: EmailMessage['category'];
    priority?: EmailMessage['priority'];
    broadcastAllBranches?: boolean;
    relatedRef?: string;
  }) => EmailMessage;
  markEmailRead: (emailId: string, branchId: string, read?: boolean) => void;
  toggleEmailStar: (emailId: string, branchId: string) => void;
  deleteEmail: (emailId: string, branchId: string) => void;
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
  // Enhanced Production Planning, Scaling, Reservations, Shortages & Catering
  productionOrders: ProductionOrder[];
  cateringOrders: CateringOrder[];
  purchaseRequests: PurchaseRequest[];
  branchTransfers: BranchTransferRequest[];
  calculateScaledRequirements: (
    items: Array<{
      recipeId?: string;
      menuItemId?: string;
      portions: number;
      portionName?: string;
      modifierNames?: string[];
      substituteOverrides?: Record<string, string>;
    }>
  ) => ScaledRequirementsResult;
  updateRecipeStatus: (recipeId: string, status: RecipeStatus, actor?: string, note?: string) => void;
  createProductionOrder: (params: {
    recipeId: string;
    targetPortions: number;
    sourceType?: ProductionOrder['sourceType'];
    productionModel?: ProductionModel;
    assignedTo?: string;
    scheduledFor?: string;
    cateringOrderId?: string;
    cateringOrderNumber?: string;
    substituteOverrides?: Record<string, string>;
  }) => ProductionOrder | null;
  advanceProductionOrderStage: (
    orderId: string,
    nextStage: ProductionOrderStatus,
    options?: {
      actualPortions?: number;
      wastagePortions?: number;
      wastageReason?: string;
      actualLineQtys?: Record<string, number>;
      exceptionReason?: string;
      actor?: string;
    }
  ) => { success: boolean; error?: string };
  cancelProductionOrder: (orderId: string, reason: string, actor?: string) => void;
  resolveShortageViaPurchaseRequest: (params: {
    ingredientId: string;
    requestedQty: number;
    reason: string;
    linkedOrderRef?: string;
    requestedBy?: string;
  }) => PurchaseRequest | null;
  updatePurchaseRequestStatus: (requestId: string, status: PurchaseRequest['status']) => void;
  resolveShortageViaBranchTransfer: (params: {
    ingredientId: string;
    quantity: number;
    fromBranch: string;
    requestedBy?: string;
  }) => BranchTransferRequest | null;
  receiveBranchTransfer: (transferId: string) => void;
  createCateringOrder: (params: {
    eventName: string;
    eventType: CateringOrder['eventType'];
    customerName: string;
    customerPhone: string;
    siteLocation: string;
    eventDate: string;
    items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>;
    depositPaid?: number;
    notes?: string;
  }) => CateringOrder;
  reserveCateringIngredients: (cateringOrderId: string) => { success: boolean; message: string };
  generateCateringProductionPlan: (cateringOrderId: string) => ProductionOrder[];
  recordCateringFulfillment: (
    cateringOrderId: string,
    fulfilledByMenuId: Record<string, number>,
    nextStatus?: CateringOrderStatus
  ) => void;
  amendCateringOrder: (
    cateringOrderId: string,
    items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>,
    note: string
  ) => void;
  generateCateringInvoice: (cateringOrderId: string) => string;
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
  // SaaS Platform Surface, Auth, Registration & System Provider Accounts Control
  platformSurface: PlatformSurface;
  setPlatformSurface: (surface: PlatformSurface) => void;
  landingPage: LandingPageId;
  setLandingPage: (page: LandingPageId) => void;
  selectedRegisterPlan: SaasPlanId;
  setSelectedRegisterPlan: (plan: SaasPlanId) => void;
  saasAccounts: SaasAccount[];
  authenticatedAccount: SaasAccount | null;
  impersonatingOrgId: string | null;
  providerAuditLogs: ProviderAuditEvent[];
  leadInquiries: PlatformLeadInquiry[];
  providerTenantSummaries: Array<{
    org: SaasOrganization;
    branchesCount: number;
    activeBranchesCount: number;
    liveOrdersCount: number;
    liveGmvTzs: number;
    accountsCount: number;
  }>;
  providerStats: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalBranches: number;
    activeAccountsCount: number;
    pendingAccountsCount: number;
    monthlyRecurringRevenueTzs: number;
    platformGmvTzs: number;
    openLeadsCount: number;
  };
  loginWithCredentials: (
    email: string,
    password: string
  ) => { success: boolean; error?: string; account?: SaasAccount };
  registerTenantAccount: (params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    plan: SaasPlanId;
    operatingModel: RestaurantTenant['operatingModel'];
    branchName: string;
    branchCode: string;
    phone: string;
    address: string;
  }) => { success: boolean; error?: string };
  quickLaunchWorkspace: (preset: 'provider' | 'savanna_hq' | 'kona_hq' | 'cashier_pos') => void;
  logoutAccount: () => void;
  providerUpdateTenantStatus: (orgId: string, status: SaasTenantStatus) => void;
  providerUpdateTenantPlan: (orgId: string, plan: SaasPlanId) => void;
  providerMarkBillingPaid: (orgId: string) => void;
  providerInspectTenant: (orgId: string) => void;
  providerExitInspection: () => void;
  providerCreateAccount: (params: {
    name: string;
    email: string;
    password: string;
    role: SaasAccountRole;
    status?: SaasAccountStatus;
    organizationId?: string;
    branchId?: string;
    phone?: string;
  }) => { success: boolean; error?: string; account?: SaasAccount };
  providerUpdateAccount: (
    accountId: string,
    patch: {
      name?: string;
      email?: string;
      phone?: string;
      role?: SaasAccountRole;
      status?: SaasAccountStatus;
      organizationId?: string;
      branchId?: string;
    }
  ) => { success: boolean; error?: string; account?: SaasAccount };
  providerUpdateAccountStatus: (accountId: string, status: SaasAccountStatus) => { success: boolean; error?: string };
  providerUpdateAccountRole: (
    accountId: string,
    role: SaasAccountRole,
    scope?: { organizationId?: string; branchId?: string }
  ) => { success: boolean; error?: string };
  providerResetAccountPassword: (accountId: string, newPassword: string) => { success: boolean; error?: string };
  providerDeleteAccount: (accountId: string) => { success: boolean; error?: string };
  saasPlans: SaasPlanDefinition[];
  providerCreatePlan: (params: {
    name: string;
    tagline: string;
    audience: string;
    monthlyFeeTzs: number;
    annualDiscountPct: number;
    trialDays: number;
    maxBranches: number;
    maxStaffSeats: number;
    maxRecipes: number;
    includedModules: string[];
    summary: string;
    isFeatured?: boolean;
    isPublic?: boolean;
  }) => { success: boolean; error?: string; plan?: SaasPlanDefinition };
  providerUpdatePlan: (planId: string, patch: Partial<SaasPlanDefinition>) => void;
  providerTogglePlanVisibility: (planId: string) => void;
  providerTogglePlanStatus: (planId: string) => void;
  submitLeadInquiry: (params: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    branchesCount: number;
    planInterest: SaasPlanId;
    notes: string;
  }) => PlatformLeadInquiry;
  providerConvertLeadToTenant: (leadId: string) => { success: boolean; message: string };
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deepLink] = useState(() => parseAppDeepLink());
  const [organizations, setOrganizations] = useState<SaasOrganization[]>(INITIAL_ORGANIZATIONS);
  const [saasPlans, setSaasPlans] = useState<SaasPlanDefinition[]>(SAAS_PLANS);
  const [allBranches, setAllBranches] = useState<RestaurantTenant[]>(INITIAL_BRANCHES);
  const [saasAccounts, setSaasAccounts] = useState<SaasAccount[]>(INITIAL_SAAS_ACCOUNTS);
  const [providerAuditLogs, setProviderAuditLogs] = useState<ProviderAuditEvent[]>(INITIAL_PROVIDER_AUDIT_LOGS);
  const [leadInquiries, setLeadInquiries] = useState<PlatformLeadInquiry[]>(INITIAL_LEAD_INQUIRIES);

  const [platformSurface, setPlatformSurface] = useState<PlatformSurface>(() =>
    deepLink.standalone || deepLink.portal ? 'erp' : 'landing'
  );
  const [landingPage, setLandingPage] = useState<LandingPageId>('home');
  const [selectedRegisterPlan, setSelectedRegisterPlan] = useState<SaasPlanId>('Growth');
  const [authenticatedAccount, setAuthenticatedAccount] = useState<SaasAccount | null>(() =>
    deepLink.standalone || deepLink.portal ? INITIAL_SAAS_ACCOUNTS[1] : null
  );
  const [impersonatingOrgId, setImpersonatingOrgId] = useState<string | null>(null);

  const [branchStores, setBranchStores] = useState<Record<string, BranchWorkspaceStore>>(() => {
    const initial = createInitialBranchStores();
    if (deepLink.portal === 'customer') {
      Object.keys(initial).forEach((k) => {
        initial[k] = { ...initial[k], cart: [] };
      });
    }
    return initial;
  });

  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    let active = true;
    apiClient.system
      .bootstrap()
      .then((state) => {
        if (!active || !state) return;
        setOrganizations(state.organizations);
        setSaasPlans(state.saasPlans);
        setAllBranches(state.allBranches);
        setSaasAccounts(state.saasAccounts);
        setProviderAuditLogs(state.providerAuditLogs);
        setLeadInquiries(state.leadInquiries);
        const nextStores = { ...state.branchStores };
        if (deepLink.portal === 'customer') {
          Object.keys(nextStores).forEach((k) => {
            nextStores[k] = { ...nextStores[k], cart: [] };
          });
        }
        setBranchStores(nextStores);
        if (deepLink.tenantId) {
          const matched = state.allBranches.find(
            (b) => b.id === deepLink.tenantId || b.slug === deepLink.tenantId
          );
          if (matched) {
            setCurrentOrganizationIdState(matched.organizationId);
            setCurrentBranchIdState(matched.id);
          }
        }
      })
      .catch((err) => {
        console.warn('[RestaurantOS] Bootstrap hydration fell back to seed state:', err);
      });
    return () => {
      active = false;
    };
  }, [deepLink.portal, deepLink.tenantId]);

  const initialMatchedBranch = useMemo(() => {
    if (deepLink.tenantId) {
      return INITIAL_BRANCHES.find((b) => b.id === deepLink.tenantId || b.slug === deepLink.tenantId);
    }
    return undefined;
  }, [deepLink.tenantId]);

  const [currentOrganizationId, setCurrentOrganizationIdState] = useState<string>(
    () => initialMatchedBranch?.organizationId || INITIAL_ORGANIZATIONS[0].id
  );
  const [currentBranchIdState, setCurrentBranchIdState] = useState<string>(
    () => initialMatchedBranch?.id || INITIAL_BRANCHES[0].id
  );
  const [viewScope, setViewScopeState] = useState<BranchViewScope>('branch');
  const [workspaceRevision, setWorkspaceRevision] = useState<number>(1);

  const [activeRole, setActiveRole] = useState<Role>(() => deepLink.portal ?? 'cashier');
  const [isStandalonePortal] = useState<boolean>(() => Boolean(deepLink.standalone));
  const [activeWaiterIdState, setActiveWaiterId] = useState<string>('waiter-john');
  const [currency, setCurrency] = useState<'TZS' | 'USD'>('TZS');
  const [activeReferralCode, setActiveReferralCode] = useState<string | null>(
    () => deepLink.referralCode ?? 'WAITER_JOHN'
  );
  const [soundAlertTriggered, setSoundAlertTriggered] = useState<boolean>(false);

  const currentOrganization = useMemo(() => {
    return organizations.find((o) => o.id === currentOrganizationId) || organizations[0];
  }, [organizations, currentOrganizationId]);

  // Strict Tenant Isolation: `tenants` exposes ONLY branches belonging to `currentOrganization`
  const tenants = useMemo(() => {
    return allBranches.filter((b) => b.organizationId === currentOrganization.id);
  }, [allBranches, currentOrganization.id]);

  const currentTenant = useMemo(() => {
    return (
      tenants.find((t) => t.id === currentBranchIdState) ||
      tenants.find((t) => t.isHqBranch) ||
      tenants[0]
    );
  }, [tenants, currentBranchIdState]);

  const activeBranchId = currentTenant.id;

  const activeStore: BranchWorkspaceStore = useMemo(() => {
    return (
      branchStores[activeBranchId] ||
      createStarterBranchStore(currentTenant, currentOrganization)
    );
  }, [branchStores, activeBranchId, currentTenant, currentOrganization]);

  const updateBranchSlice = <K extends keyof BranchWorkspaceStore>(
    key: K,
    updater: React.SetStateAction<BranchWorkspaceStore[K]>,
    targetBranchId?: string
  ) => {
    const bId = targetBranchId || activeBranchId;
    setBranchStores((prev) => {
      const store = prev[bId];
      if (!store) return prev;
      const nextVal =
        typeof updater === 'function'
          ? (updater as (curr: BranchWorkspaceStore[K]) => BranchWorkspaceStore[K])(store[key])
          : updater;
      return {
        ...prev,
        [bId]: {
          ...store,
          [key]: nextVal,
        },
      };
    });
  };

  // Branch-isolated state accessors and setters
  const orders = activeStore.orders;
  const setOrders: React.Dispatch<React.SetStateAction<Order[]>> = (u) => updateBranchSlice('orders', u);
  const tables = activeStore.tables;
  const setTables: React.Dispatch<React.SetStateAction<Table[]>> = (u) => updateBranchSlice('tables', u);
  const menuItems = activeStore.menuItems;
  const setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>> = (u) => updateBranchSlice('menuItems', u);
  const ingredients = activeStore.ingredients;
  const setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>> = (u) => updateBranchSlice('ingredients', u);
  const stockMovements = activeStore.stockMovements;
  const setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>> = (u) => updateBranchSlice('stockMovements', u);
  const stockLots = activeStore.stockLots;
  const setStockLots: React.Dispatch<React.SetStateAction<StockBatchLot[]>> = (u) => updateBranchSlice('stockLots', u);
  const recipes = activeStore.recipes;
  const setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>> = (u) => updateBranchSlice('recipes', u);
  const subRecipeBatches = activeStore.subRecipeBatches;
  const setSubRecipeBatches: React.Dispatch<React.SetStateAction<SubRecipeStockBatch[]>> = (u) => updateBranchSlice('subRecipeBatches', u);
  const bomDeductionPolicy = activeStore.bomDeductionPolicy;
  const setBomDeductionPolicy = (policy: BomDeductionPolicy) => {
    updateBranchSlice('bomDeductionPolicy', policy);
    enqueueApiSync(() => apiClient.orders.updateSettings(activeBranchId, { bomDeductionPolicy: policy }), 'setBomDeductionPolicy');
  };
  const bomAuditLogs = activeStore.bomAuditLogs;
  const setBomAuditLogs: React.Dispatch<React.SetStateAction<BomAuditLog[]>> = (u) => updateBranchSlice('bomAuditLogs', u);
  const productionLogs = activeStore.productionLogs;
  const setProductionLogs: React.Dispatch<React.SetStateAction<ProductionLog[]>> = (u) => updateBranchSlice('productionLogs', u);
  const preparedDishStocks = activeStore.preparedDishStocks;
  const setPreparedDishStocks: React.Dispatch<React.SetStateAction<PreparedDishStock[]>> = (u) => updateBranchSlice('preparedDishStocks', u);
  const blockedCookingAttempts = activeStore.blockedCookingAttempts;
  const setBlockedCookingAttempts: React.Dispatch<React.SetStateAction<BlockedCookingAttempt[]>> = (u) => updateBranchSlice('blockedCookingAttempts', u);
  const dailyReconciliations = activeStore.dailyReconciliations;
  const setDailyReconciliations: React.Dispatch<React.SetStateAction<DailyReconciliationItem[]>> = (u) => updateBranchSlice('dailyReconciliations', u);
  const productionOrders = activeStore.productionOrders;
  const setProductionOrders: React.Dispatch<React.SetStateAction<ProductionOrder[]>> = (u) => updateBranchSlice('productionOrders', u);
  const cateringOrders = activeStore.cateringOrders;
  const setCateringOrders: React.Dispatch<React.SetStateAction<CateringOrder[]>> = (u) => updateBranchSlice('cateringOrders', u);
  const purchaseRequests = activeStore.purchaseRequests;
  const setPurchaseRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>> = (u) => updateBranchSlice('purchaseRequests', u);
  const branchTransfers = activeStore.branchTransfers;
  const setBranchTransfers: React.Dispatch<React.SetStateAction<BranchTransferRequest[]>> = (u) => updateBranchSlice('branchTransfers', u);
  const waiters = activeStore.waiters;
  const setWaiters: React.Dispatch<React.SetStateAction<Waiter[]>> = (u) => updateBranchSlice('waiters', u);
  const employees = activeStore.employees;
  const setEmployees: React.Dispatch<React.SetStateAction<Employee[]>> = (u) => updateBranchSlice('employees', u);
  const payrollPayments = activeStore.payrollPayments;
  const setPayrollPayments: React.Dispatch<React.SetStateAction<PayrollPaymentRecord[]>> = (u) => updateBranchSlice('payrollPayments', u);
  const commissionPayouts = activeStore.commissionPayouts;
  const setCommissionPayouts: React.Dispatch<React.SetStateAction<CommissionPayoutLog[]>> = (u) => updateBranchSlice('commissionPayouts', u);
  const settledCommissionByWaiter = activeStore.settledCommissionByWaiter;
  const setSettledCommissionByWaiter: React.Dispatch<React.SetStateAction<Record<string, number>>> = (u) =>
    updateBranchSlice('settledCommissionByWaiter', u);
  const cart = activeStore.cart;
  const setCart: React.Dispatch<React.SetStateAction<CartItem[]>> = (u) => updateBranchSlice('cart', u);
  const notifications = activeStore.notifications;
  const setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>> = (u) => updateBranchSlice('notifications', u);
  const auditLogs = activeStore.auditLogs;
  const setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>> = (u) => updateBranchSlice('auditLogs', u);
  const approvalRequests = activeStore.approvalRequests;
  const setApprovalRequests: React.Dispatch<React.SetStateAction<ApprovalRequest[]>> = (u) => updateBranchSlice('approvalRequests', u);
  const cashierShift = activeStore.cashierShift;
  const setCashierShift: React.Dispatch<React.SetStateAction<BranchWorkspaceStore['cashierShift']>> = (u) =>
    updateBranchSlice('cashierShift', u);
  const taxEnabled = activeStore.taxEnabled;
  const setTaxEnabled = (enabled: boolean) => {
    updateBranchSlice('taxEnabled', enabled);
    enqueueApiSync(() => apiClient.orders.updateSettings(activeBranchId, { taxEnabled: enabled }), 'setTaxEnabled');
  };
  const taxRatePct = activeStore.taxRatePct;
  const setTaxRatePct = (ratePct: number) => {
    updateBranchSlice('taxRatePct', ratePct);
    enqueueApiSync(() => apiClient.orders.updateSettings(activeBranchId, { taxRatePct: ratePct }), 'setTaxRatePct');
  };
  const defaultCommissionMode = activeStore.defaultCommissionMode;
  const setDefaultCommissionMode = (m: CommissionMode) => updateBranchSlice('defaultCommissionMode', m);
  const defaultCommissionValue = activeStore.defaultCommissionValue;
  const setDefaultCommissionValue = (v: number) => updateBranchSlice('defaultCommissionValue', v);

  // Ensure active waiter stays valid for the currently isolated branch
  const activeWaiterId = useMemo(() => {
    return waiters.find((w) => w.id === activeWaiterIdState)?.id || waiters[0]?.id || '';
  }, [waiters, activeWaiterIdState]);

  // Tenant & Branch switching with clean app refresh
  const setCurrentTenantId = (branchId: string) => {
    const target = allBranches.find(
      (b) => b.id === branchId && b.organizationId === currentOrganization.id
    );
    if (!target) return;
    setCurrentBranchIdState(target.id);
    setViewScopeState('branch');
    const targetWaiters = branchStores[target.id]?.waiters || [];
    if (targetWaiters.length > 0) {
      setActiveWaiterId(targetWaiters[0].id);
      setActiveReferralCode(targetWaiters[0].referralCode);
    } else {
      setActiveWaiterId('');
      setActiveReferralCode(null);
    }
    setSoundAlertTriggered(false);
    setWorkspaceRevision((r) => r + 1);
  };

  const setCurrentOrganizationId = (orgId: string) => {
    const targetOrg = organizations.find((o) => o.id === orgId);
    if (!targetOrg) return;
    const orgBranches = allBranches.filter((b) => b.organizationId === orgId);
    const firstBranch = orgBranches.find((b) => b.isHqBranch) || orgBranches[0];
    setCurrentOrganizationIdState(targetOrg.id);
    if (firstBranch) {
      setCurrentBranchIdState(firstBranch.id);
      const firstWaiters = branchStores[firstBranch.id]?.waiters || [];
      setActiveWaiterId(firstWaiters[0]?.id || '');
      setActiveReferralCode(firstWaiters[0]?.referralCode || null);
    }
    setViewScopeState('branch');
    setSoundAlertTriggered(false);
    setWorkspaceRevision((r) => r + 1);
  };

  const setViewScope = (scope: BranchViewScope) => {
    setViewScopeState(scope);
    setWorkspaceRevision((r) => r + 1);
  };

  const switchToHqOverview = () => {
    setViewScopeState('hq_overview');
    setActiveRole('owner');
    setWorkspaceRevision((r) => r + 1);
  };

  const activeOperator = useMemo(() => {
    const name =
      viewScope === 'hq_overview' || activeRole === 'owner'
        ? currentOrganization.ownerName
        : currentTenant.managerName;
    const email =
      viewScope === 'hq_overview' || activeRole === 'owner'
        ? currentOrganization.ownerEmail
        : currentTenant.email;
    const roleLabel =
      viewScope === 'hq_overview'
        ? `Main HQ · ${tenants.length} Branches`
        : `${currentTenant.branchCode} · ${currentTenant.name}`;
    const parts = name.trim().split(/\s+/);
    const initials =
      parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : name.slice(0, 2).toUpperCase();
    return { name, email, initials, roleLabel };
  }, [viewScope, activeRole, currentOrganization, currentTenant, tenants.length]);

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
    enqueueApiSync(() => apiClient.orders.markNotificationRead(activeBranchId, id), 'markNotificationAsRead');
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    enqueueApiSync(() => apiClient.orders.markAllNotificationsRead(activeBranchId), 'markAllNotificationsAsRead');
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    enqueueApiSync(() => apiClient.orders.clearNotification(activeBranchId, id), 'clearNotification');
  };

  const addNotificationLocal = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    return newNotif;
  };

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    addNotificationLocal(notif);
    enqueueApiSync(() => apiClient.orders.addNotification(activeBranchId, notif), 'addNotification');
  };

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
    const existingIndex = cart.findIndex(
      (ci) =>
        ci.menuItem.id === item.id &&
        ci.selectedPortion?.name === portion?.name &&
        ci.customerNotes === notes &&
        JSON.stringify(ci.selectedModifiers) === JSON.stringify(modifiers)
    );

    const nextCart: CartItem[] =
      existingIndex > -1
        ? cart.map((ci, idx) => (idx === existingIndex ? { ...ci, quantity: ci.quantity + quantity } : ci))
        : [
            ...cart,
            {
              menuItem: item,
              quantity,
              selectedPortion: portion,
              selectedModifiers: modifiers,
              customerNotes: notes,
            },
          ];

    setCart(nextCart);
    enqueueApiSync(() => apiClient.orders.syncCart(activeBranchId, nextCart), 'addToCart');
  };

  const updateCartItemQty = (index: number, delta: number) => {
    if (!cart[index]) return;
    const newQty = cart[index].quantity + delta;
    const nextCart =
      newQty <= 0
        ? cart.filter((_, i) => i !== index)
        : cart.map((ci, i) => (i === index ? { ...ci, quantity: newQty } : ci));
    setCart(nextCart);
    enqueueApiSync(() => apiClient.orders.syncCart(activeBranchId, nextCart), 'updateCartItemQty');
  };

  const removeFromCart = (index: number) => {
    const nextCart = cart.filter((_, i) => i !== index);
    setCart(nextCart);
    enqueueApiSync(() => apiClient.orders.syncCart(activeBranchId, nextCart), 'removeFromCart');
  };

  const clearCartLocal = () => {
    setCart([]);
  };

  const clearCart = () => {
    setCart([]);
    enqueueApiSync(() => apiClient.orders.syncCart(activeBranchId, []), 'clearCart');
  };

  // Recursive / Sub-recipe-aware BOM Costing Helper (Delegated to shared costingEngine)
  const computeRecipeUnitCost = (recipeId: string, visited: Set<string> = new Set()): {
    batchCost: number;
    unitCost: number;
    perPlateCost: number;
  } => computeRecipeUnitCostPure(recipeId, recipes, ingredients, subRecipeBatches, visited);

  // FEFO / FIFO Stock Lot deduction helper (Delegated to shared costingEngine)
  const consumeStockLots = (
    ingredientId: string,
    qtyToDeduct: number,
    location: 'kitchen' | 'main_store'
  ) => {
    if (qtyToDeduct <= 0) return;
    setStockLots((prev) => consumeStockLotsPure(prev, ingredientId, qtyToDeduct, location));
  };

  // Unified Order Stock Deduction Engine (Delegated to shared costingEngine)
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
    const res = deductStockForOrderLinesPure({
      orderItems,
      orderNumber: orderNum,
      stageLabel,
      recipes,
      ingredients,
      stockLots,
      subRecipeBatches,
      preparedDishStocks,
      productionLogs,
      stockMovements,
      notifications,
    });
    setPreparedDishStocks(res.preparedDishStocks);
    setProductionLogs(res.productionLogs);
    setSubRecipeBatches(res.subRecipeBatches);
    setIngredients(res.ingredients);
    setStockLots(res.stockLots);
    setStockMovements(res.stockMovements);
    setNotifications(res.notifications);
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
    const branchPrefix = currentTenant.branchCode?.split('-')[1] || (currentTenant.id === 'tenant-kona-chips' ? 'KC' : 'SV');
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

    const resolvedReferralWaiterId =
      params.referralWaiterId ||
      (activeReferralCode
        ? waiters.find((w) => w.referralCode === activeReferralCode)?.id || waiters[0]?.id
        : undefined);

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
      referralWaiterId: resolvedReferralWaiterId,
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
      addNotificationLocal({
        title: `New Order ${nextOrderNum} (${serviceCouponCode})`,
        message: `${params.type === 'dine_in' ? `Table ${params.tableNumber}` : params.type.toUpperCase()} - ${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
        type: 'order',
        actionRole: 'kitchen',
        actionLabel: 'Open KDS Ticket',
      });
    } else {
      addNotificationLocal({
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
      clearCartLocal();
    }

    notifyFlutterHost('orderPlaced', {
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      serviceCouponCode: newOrder.serviceCouponCode,
      total: newOrder.total,
      type: newOrder.type,
    });

    enqueueApiSync(
      () =>
        apiClient.orders.submit(activeBranchId, {
          ...params,
          id: newOrder.id,
          activeReferralCode,
        }),
      'submitOrder'
    );

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
    addNotificationLocal({
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

    enqueueApiSync(
      () => apiClient.orders.dispatchDraft(activeBranchId, orderId, actorName),
      'submitDraftToKitchen'
    );
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

    if (status === 'ready' && target && target.status !== 'ready') {
      addNotificationLocal({
        title: `Order Ready: ${target.orderNumber}`,
        message: `${target.tableNumber || target.customerName} dishes are ready on the pass!`,
        type: 'kitchen',
        actionRole: 'cashier',
        actionLabel: 'View POS Counter',
      });
    }

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

    enqueueApiSync(
      () => apiClient.orders.updateStatus(activeBranchId, orderId, status, actorName, note, activeRole),
      'updateOrderStatus'
    );
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

    enqueueApiSync(
      () => apiClient.orders.fastForwardToServed(activeBranchId, orderId, actorName),
      'fastForwardOrderToServed'
    );

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

    enqueueApiSync(
      () => apiClient.orders.updateItemStatus(activeBranchId, orderId, itemIndex, itemStatus, actorName),
      'updateOrderItemStatus'
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

    addNotificationLocal({
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

    enqueueApiSync(
      () => apiClient.orders.rejectItem(activeBranchId, orderId, itemIndex, kitchenStaff, reason),
      'rejectOrderItem'
    );
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
      addNotificationLocal({
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

    enqueueApiSync(
      () => apiClient.orders.processPayment(activeBranchId, orderId, method, amount, options),
      'processPayment'
    );
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

    addNotificationLocal({
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

    enqueueApiSync(
      () => apiClient.orders.requestApproval(activeBranchId, { ...params, id: newReq.id }),
      'requestApproval'
    );

    return newReq;
  };

  const applyCancelOrderLocal = (
    orderId: string,
    reason: string,
    actor: string,
    approvedBy: string = 'Branch Manager'
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target || target.status === 'cancelled') return false;
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

    return true;
  };

  const cancelOrderControlled = (
    orderId: string,
    reason: string,
    actor: string,
    approvedBy: string = 'Branch Manager'
  ) => {
    const ok = applyCancelOrderLocal(orderId, reason, actor, approvedBy);
    if (!ok) return;
    enqueueApiSync(
      () => apiClient.orders.cancelControlled(activeBranchId, orderId, reason, actor, approvedBy),
      'cancelOrderControlled'
    );
  };

  const reviewApprovalRequest = (
    requestId: string,
    approve: boolean,
    managerName: string = 'Branch Manager'
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
        applyCancelOrderLocal(req.orderId, req.reason, req.requestedBy, managerName);
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

    enqueueApiSync(
      () => apiClient.orders.reviewApproval(activeBranchId, requestId, approve, managerName),
      'reviewApprovalRequest'
    );
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

    enqueueApiSync(
      () => apiClient.orders.promoteCustomItem(activeBranchId, orderId, itemIndex, category, newMenuItem.id),
      'promoteCustomItemToMenu'
    );

    return newMenuItem;
  };

  const discrepancies = useMemo<DiscrepancyAlert[]>(
    () => computeDiscrepanciesPure(orders, approvalRequests, formatMoney),
    [orders, approvalRequests, currency, currentTenant.currencyRate]
  );

  // Table Management
  const updateTableStatus = (tableId: string, status: Table['status'], waiterId?: string) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, status, assignedWaiterId: waiterId ?? t.assignedWaiterId } : t))
    );
    enqueueApiSync(
      () =>
        apiClient.orders.updateTable(activeBranchId, tableId, {
          status,
          ...(waiterId !== undefined ? { assignedWaiterId: waiterId } : {}),
        }),
      'updateTableStatus'
    );
  };

  const addTable = (newTableData: Omit<Table, 'id'>) => {
    const newTable: Table = {
      ...newTableData,
      id: `tbl-${Date.now()}`,
    };
    setTables((prev) => [...prev, newTable]);
    enqueueApiSync(() => apiClient.orders.addTable(activeBranchId, newTable), 'addTable');
    return newTable;
  };

  const updateTable = (updatedTable: Table) => {
    setTables((prev) => prev.map((t) => (t.id === updatedTable.id ? updatedTable : t)));
    enqueueApiSync(
      () => apiClient.orders.updateTable(activeBranchId, updatedTable.id, updatedTable),
      'updateTable'
    );
  };

  const deleteTable = (tableId: string) => {
    setTables((prev) => prev.filter((t) => t.id !== tableId));
    enqueueApiSync(() => apiClient.orders.deleteTable(activeBranchId, tableId), 'deleteTable');
  };

  const releaseTable = (tableId: string) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, status: 'available', currentOrderId: undefined }
          : t
      )
    );
    enqueueApiSync(() => apiClient.orders.releaseTable(activeBranchId, tableId), 'releaseTable');
  };

  // Menu Management
  const addMenuItem = (itemData: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...itemData,
      id: `menu-${Date.now()}`,
    };
    setMenuItems((prev) => [newItem, ...prev]);
    enqueueApiSync(() => apiClient.menu.add(activeBranchId, newItem), 'addMenuItem');
    return newItem;
  };

  const updateMenuItem = (updatedItem: MenuItem) => {
    setMenuItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
    enqueueApiSync(
      () => apiClient.menu.update(activeBranchId, updatedItem.id, updatedItem),
      'updateMenuItem'
    );
  };

  const deleteMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    enqueueApiSync(() => apiClient.menu.delete(activeBranchId, itemId), 'deleteMenuItem');
  };

  const toggleMenuItemAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isAvailable: !i.isAvailable } : i))
    );
    enqueueApiSync(() => apiClient.menu.toggleAvailability(activeBranchId, itemId), 'toggleMenuItemAvailability');
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
    enqueueApiSync(
      () => apiClient.inventory.updateStock(activeBranchId, ingredientId, deltaUnits),
      'updateStock'
    );
  };

  const applyRecordStockIntakeLocal = (
    ingredientId: string,
    quantityUnits: number,
    cost: number,
    supplier: string,
    invoiceRef: string,
    expiryDate?: string
  ) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing || quantityUnits <= 0) return false;

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
      recordedBy: 'Branch Manager',
      destinationLocation: 'main_store',
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotificationLocal({
      title: 'Goods Received & Recipe Costs Synced',
      message: `+${quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} (${lotNumber}) received. Unit cost recalculated for live BOM recipes.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Store Inventory',
    });

    return true;
  };

  const recordStockIntake = (
    ingredientId: string,
    quantityUnits: number,
    cost: number,
    supplier: string,
    invoiceRef: string,
    expiryDate?: string
  ) => {
    const ok = applyRecordStockIntakeLocal(ingredientId, quantityUnits, cost, supplier, invoiceRef, expiryDate);
    if (!ok) return;
    enqueueApiSync(
      () =>
        apiClient.inventory.recordIntake(activeBranchId, ingredientId, {
          quantityUnits,
          cost,
          supplier,
          invoiceRef,
          expiryDate,
        }),
      'recordStockIntake'
    );
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
      recordedBy: 'Branch Manager',
      sourceLocation: location,
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotificationLocal({
      title: 'Wastage Recorded',
      message: `${quantityUnits.toLocaleString()} ${ing.consumptionUnit} ${ing.name} logged as waste (${reason}) from ${location === 'kitchen' ? 'Kitchen' : 'Main Store'}.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Spoilage Log',
    });

    enqueueApiSync(
      () =>
        apiClient.inventory.recordWastage(activeBranchId, ingredientId, {
          quantityUnits,
          reason,
          location,
        }),
      'recordWastage'
    );
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
      recordedBy: params.recordedBy || 'Kitchen Chef',
      sourceLocation: params.location,
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotificationLocal({
      title: 'Direct Stock Consumption Logged',
      message: `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} consumed directly (${formatMoney(costImpact)}).`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    enqueueApiSync(
      () =>
        apiClient.inventory.recordDirectConsumption(activeBranchId, params.ingredientId, {
          quantityUnits: params.quantityUnits,
          location: params.location,
          reason: params.reason,
          recordedBy: params.recordedBy,
        }),
      'recordDirectConsumption'
    );

    return true;
  };

  // Stock Transfer between Main Store and Kitchen Floor
  const applyTransferStockLocal = (params: {
    ingredientId: string;
    quantityUnits: number;
    fromLocation: 'main_store' | 'kitchen';
    toLocation: 'main_store' | 'kitchen';
    reason: string;
    shift?: string;
    recordedBy?: string;
    requireKitchenConfirmation?: boolean;
  }): { ok: boolean; movement?: StockMovement } => {
    const ing = ingredients.find((i) => i.id === params.ingredientId);
    if (!ing) return { ok: false };

    const available =
      params.fromLocation === 'main_store'
        ? (ing.storeStockUnits ?? 0)
        : (ing.kitchenStockUnits ?? 0);

    if (params.quantityUnits <= 0 || params.quantityUnits > available) {
      return { ok: false };
    }

    const isToKitchen = params.toLocation === 'kitchen' && params.fromLocation === 'main_store';
    const needsConfirmation = isToKitchen && (params.requireKitchenConfirmation ?? false);

    setIngredients((prev) =>
      prev.map((item) => {
        if (item.id === params.ingredientId) {
          let sStock = item.storeStockUnits ?? Math.max(0, item.currentStockUnits - (item.kitchenStockUnits ?? 0));
          let kStock = item.kitchenStockUnits ?? 0;

          if (isToKitchen) {
            sStock -= params.quantityUnits;
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
      recordedBy: params.recordedBy || 'Branch Manager',
      sourceLocation: params.fromLocation,
      destinationLocation: params.toLocation,
      transferStatus: needsConfirmation ? 'in_transit' : 'received',
      receivedAt: needsConfirmation ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      receivedBy: needsConfirmation ? undefined : 'Kitchen Floor Staff',
    };

    setStockMovements((prev) => [movement, ...prev]);

    addNotificationLocal({
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

    return { ok: true, movement };
  };

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
    const res = applyTransferStockLocal(params);
    if (!res.ok || !res.movement) return false;
    enqueueApiSync(
      () => apiClient.inventory.transferStock(activeBranchId, { ...params, id: res.movement!.id }),
      'transferStock'
    );
    return true;
  };

  // Kitchen Receipt Confirmation: Stock only counts once kitchen confirms receiving it!
  const confirmStockTransferReceipt = (movementId: string, receivedBy: string = 'Kitchen Chef'): boolean => {
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

    addNotificationLocal({
      title: 'Kitchen Confirmed Stock Receipt',
      message: `${receivedBy} verified and accepted ${transferQty.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} onto Kitchen cooking line.`,
      type: 'transfer',
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    enqueueApiSync(
      () => apiClient.inventory.confirmTransfer(activeBranchId, movementId, receivedBy),
      'confirmStockTransferReceipt'
    );

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

    enqueueApiSync(
      () => apiClient.inventory.rejectTransfer(activeBranchId, movementId, reason),
      'rejectStockTransfer'
    );

    return true;
  };

  // End-of-day reconciliation: return all remaining kitchen stock back to store
  const returnAllKitchenStockToStore = (staffName?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newMovements: StockMovement[] = [];
    let itemsReturnedCount = 0;

    const updatedIngredients = ingredients.map((ing) => {
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
          recordedBy: staffName || 'Branch Manager',
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

    setIngredients(updatedIngredients);

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
      addNotificationLocal({
        title: 'Daily Shift Close Completed',
        message: `All ${itemsReturnedCount} kitchen ingredients reconciled and returned to Main Store for safe overnight storage.`,
        type: 'transfer',
        actionRole: 'manager',
        actionLabel: 'View Final Stock',
      });
    }

    enqueueApiSync(
      () => apiClient.inventory.returnAllKitchenStock(activeBranchId, staffName),
      'returnAllKitchenStockToStore'
    );
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
        recordedBy: 'Branch Manager',
        destinationLocation: 'main_store',
      };
      setStockMovements((prev) => [movement, ...prev]);
    }

    addNotificationLocal({
      title: 'New Raw Ingredient Added',
      message: `${newIng.name} catalogued with ${newIng.currentStockUnits.toLocaleString()} ${newIng.consumptionUnit} initial stock.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    enqueueApiSync(() => apiClient.inventory.addIngredient(activeBranchId, newIng), 'addNewIngredient');

    return newIng;
  };

  const saveRecipe = (recipe: Recipe, auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>) => {
    setRecipes((prev) => {
      const index = prev.findIndex((r) => r.id === recipe.id || (recipe.menuItemId && r.menuItemId === recipe.menuItemId));
      const updatedRecipe = { ...recipe };

      if (index >= 0) {
        const existing = prev[index];
        // Archive existing version to history
        const historyItem: RecipeVersionHistoryItem = {
          version: existing.version || 1,
          changedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          changedBy: recipe.approvedBy || 'Executive Chef',
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

    addNotificationLocal({
      title: 'BOM Recipe Approved & Saved',
      message: `Bill of Materials for "${recipe.name || 'Menu Dish'}" saved (v${recipe.version || 1}) with ${recipe.ingredients.length} ingredients linked.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Recipe BOM',
    });

    enqueueApiSync(
      () => apiClient.inventory.saveRecipe(activeBranchId, recipe, auditLog),
      'saveRecipe'
    );
  };

  const deleteRecipe = (recipeId: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setMenuItems((prev) =>
      prev.map((item) => (item.recipeId === recipeId ? { ...item, recipeId: undefined } : item))
    );
    enqueueApiSync(() => apiClient.inventory.deleteRecipe(activeBranchId, recipeId), 'deleteRecipe');
  };

  // ATOMIC VALIDATION: Check Kitchen Stock & Prepared Sub-Recipe Batches for Production
  const validateBatchKitchenStock = (
    recipeId: string,
    batches: number = 1,
    actualInputs?: Record<string, number>
  ) =>
    validateBatchKitchenStockPure(
      recipeId,
      batches,
      recipes,
      ingredients,
      stockMovements,
      subRecipeBatches,
      actualInputs
    );

  // COOK BATCH PRODUCTION: Supports Finished Batches, Sub-Recipes, and Method 2 Semi-Standardized Input Overrides
  const applyCookBatchProductionLocal = (params: {
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
        attemptedBy: params.chefName || 'Executive Chef',
        timestamp: timestampStr,
        missingItems: validation.missingItems.filter((m) => m.status !== 'ok'),
        reason: `Cannot cook ${params.batches} batch of ${recipe.name}. Missing items: ${blockedReasons}`,
        resolution: 'requisition_created',
      };
      setBlockedCookingAttempts((prev) => [blockedAttempt, ...prev]);

      addNotificationLocal({
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

    // 1. Deduct Sub-Recipe Inputs (FEFO) cleanly outside state updater
    let nextSubBatches = subRecipeBatches.map((b) => ({ ...b }));
    if (subRequirements.length > 0) {
      subRequirements.forEach((req) => {
        let rem = req.requiredQty;
        const candidates = nextSubBatches
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
          recordedBy: params.chefName || 'Executive Chef',
          sourceLocation: 'kitchen',
        });
      });
    }

    // 2. Deduct Raw Ingredients from Kitchen Stock + FEFO/FIFO lots
    if (rawRequirements.length > 0) {
      const nextIngredients = [...ingredients];
      rawRequirements.forEach((req) => {
        const idx = nextIngredients.findIndex((ing) => ing.id === req.ingredientId);
        if (idx >= 0) {
          const ing = nextIngredients[idx];
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

          nextIngredients[idx] = {
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
            recordedBy: params.chefName || 'Executive Chef',
            sourceLocation: 'kitchen',
          });
        }
      });
      setIngredients(nextIngredients);
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
        preparedBy: params.chefName || 'Executive Chef',
        status: 'available',
      };
      nextSubBatches = [newSubBatch, ...nextSubBatches];

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
        recordedBy: params.chefName || 'Executive Chef',
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

    if (subRequirements.length > 0 || recipe.isSubRecipe) {
      setSubRecipeBatches(nextSubBatches);
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
      cookedBy: params.chefName || 'Executive Chef',
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

    addNotificationLocal({
      title: recipe.isSubRecipe ? 'Sub-Recipe Batch Prepared' : 'Batch Production Complete',
      message: `${batchNumber}: Produced ${actualOutputQty.toLocaleString()} ${recipe.yieldUnit || 'plates'} of ${recipe.name}. Raw & sub-recipe stock updated.`,
      type: 'kitchen',
      actionRole: 'kitchen',
      actionLabel: 'View Production Batches',
    });

    return { success: true, log: newProdLog };
  };

  const cookBatchProduction = (params: {
    recipeId: string;
    batches: number;
    actualPlatesProduced?: number;
    actualInputs?: Record<string, number>;
    chefName?: string;
    managerOverride?: boolean;
    overrideReason?: string;
  }): { success: boolean; error?: string; log?: ProductionLog } => {
    const res = applyCookBatchProductionLocal(params);
    enqueueApiSync(
      () =>
        apiClient.inventory.cookBatchProduction(activeBranchId, {
          ...params,
          id: res.log?.id,
          batchNumber: res.log?.batchNumber,
        }),
      'cookBatchProduction'
    );
    return res;
  };

  // Controlled Production Reversal (preserves complete audit trail, never deletes records)
  const reverseProductionBatch = (
    productionLogId: string,
    reason: string,
    actor: string = 'Branch Manager'
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

    addNotificationLocal({
      title: 'Production Batch Reversed',
      message: `${log.batchNumber || log.dishName} reversed by ${actor}. Audit trail preserved.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    enqueueApiSync(
      () => apiClient.inventory.reverseProductionBatch(activeBranchId, productionLogId, reason, actor),
      'reverseProductionBatch'
    );

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
        const res = applyTransferStockLocal({
          ingredientId: item.ingredientId,
          quantityUnits: transferQty,
          fromLocation: 'main_store',
          toLocation: 'kitchen',
          reason: `Requisition for missing ${item.ingredientName} (short by ${item.shortageQty} ${item.unit})`,
          shift,
          recordedBy: 'Kitchen Requisition Engine',
        });
        if (res.ok) transfersDone++;
      }
    });

    if (transfersDone > 0) {
      addNotificationLocal({
        title: 'Requisition Issued to Kitchen',
        message: `Transferred missing ingredients (${transfersDone} items) from Main Store to Kitchen Floor.`,
        type: 'transfer',
        actionRole: 'kitchen',
        actionLabel: 'Cook Batch',
      });
      enqueueApiSync(
        () => apiClient.inventory.requisitionMissing(activeBranchId, missingItems, shift),
        'createRequisitionForMissing'
      );
      return true;
    }
    return false;
  };

  // ============================================================================
  // OPERATIONAL BOM SCALING, PRODUCTION ORDERS, SHORTAGES & CATERING ENGINE
  // ============================================================================
  const calculateScaledRequirements = (
    items: Array<{
      recipeId?: string;
      menuItemId?: string;
      portions: number;
      portionName?: string;
      modifierNames?: string[];
      substituteOverrides?: Record<string, string>;
    }>
  ): ScaledRequirementsResult =>
    calculateScaledRequirementsPure(items, recipes, menuItems, ingredients, subRecipeBatches);

  const updateRecipeStatus = (
    recipeId: string,
    status: RecipeStatus,
    actor: string = 'Executive Chef',
    note?: string
  ) => {
    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`;
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const costInfo = computeRecipeUnitCost(r.id);
        const linkedDish = menuItems.find((m) => m.id === r.menuItemId);
        const sellPrice = linkedDish?.price || 0;
        const hist: RecipeVersionHistoryItem = {
          version: r.version,
          changedAt: nowStr,
          changedBy: actor,
          changeSummary: note || `Governance status updated from ${r.status || 'approved'} to ${status}`,
          batchYieldPlates: r.batchYieldPlates,
          ingredients: r.ingredients,
          totalBatchCost: costInfo.batchCost,
          costPerPlate: costInfo.perPlateCost,
          foodCostPercentage: sellPrice > 0 ? (costInfo.perPlateCost / sellPrice) * 100 : 0,
          sellingPrice: sellPrice,
          foodGrossProfit: Math.max(0, sellPrice - costInfo.perPlateCost),
          status,
          name: r.name,
          productionMethod: r.productionMethod,
          productionModel: r.productionModel,
        };
        return {
          ...r,
          status,
          approvedBy: status === 'approved' ? actor : r.approvedBy,
          approvedAt: status === 'approved' ? nowStr : r.approvedAt,
          history: [hist, ...(r.history || [])],
        };
      })
    );

    logAuditEvent({
      actor,
      actorRole: 'manager',
      action: 'RECIPE_STATUS_CHANGED',
      details: `Recipe ${recipeId} transitioned to "${status}". ${note || ''}`,
    });

    enqueueApiSync(
      () => apiClient.inventory.updateRecipeStatus(activeBranchId, recipeId, status, actor, note),
      'updateRecipeStatus'
    );
  };

  const applyCreateProductionOrderLocal = (params: {
    recipeId: string;
    targetPortions: number;
    sourceType?: ProductionOrder['sourceType'];
    productionModel?: ProductionModel;
    assignedTo?: string;
    scheduledFor?: string;
    cateringOrderId?: string;
    cateringOrderNumber?: string;
    substituteOverrides?: Record<string, string>;
  }): ProductionOrder | null => {
    const recipe = recipes.find((r) => r.id === params.recipeId);
    if (!recipe || params.targetPortions <= 0) return null;

    const scaled = calculateScaledRequirements([
      {
        recipeId: recipe.id,
        portions: params.targetPortions,
        substituteOverrides: params.substituteOverrides,
      },
    ]);

    const today = new Date().toISOString().split('T')[0];
    const nowStr = `${today} ${new Date().toTimeString().substring(0, 5)}`;
    const newOrder: ProductionOrder = {
      id: `po-kit-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      orderNumber: `PRD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      sourceType: params.sourceType || 'manager_plan',
      cateringOrderId: params.cateringOrderId,
      cateringOrderNumber: params.cateringOrderNumber,
      recipeId: recipe.id,
      recipeCode: recipe.code,
      recipeName: recipe.name || 'Standard Recipe',
      isSubRecipe: recipe.isSubRecipe,
      productionModel:
        params.productionModel ||
        recipe.productionModel ||
        (recipe.cookingMethod === 'batch_cooking' ? 'batch_production' : 'made_to_order'),
      station: recipe.productionLocation || 'hot_kitchen',
      targetPortions: params.targetPortions,
      yieldUnit: recipe.yieldUnit || (recipe.isSubRecipe ? 'grams' : 'plates'),
      status: scaled.canProduceWithStore ? 'stock_checked' : 'planned',
      standardCost: scaled.totalEstimatedCost,
      assignedTo: params.assignedTo || 'Kitchen Chef',
      scheduledFor: params.scheduledFor || `Today · ${new Date().toTimeString().substring(0, 5)}`,
      createdBy: 'Branch Manager',
      createdAt: nowStr,
      stockCheckedAt: scaled.canProduceWithStore ? nowStr : undefined,
      lines: scaled.rows.map((r) => ({
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        isSubRecipe: r.isSubRecipe,
        subRecipeId: r.subRecipeId,
        standardQty: r.requiredQty,
        actualQty: r.requiredQty,
        unit: r.unit,
        unitCost: r.unitCost,
      })),
    };

    setProductionOrders((prev) => [newOrder, ...prev]);

    addNotificationLocal({
      title: `Production Order ${newOrder.orderNumber}`,
      message: `Scheduled ${newOrder.targetPortions} ${newOrder.yieldUnit} of ${newOrder.recipeName} (${newOrder.station.replace('_', ' ')}).`,
      type: 'kitchen',
      actionRole: 'kitchen',
      actionLabel: 'Open Production Orders',
    });

    return newOrder;
  };

  const createProductionOrder = (params: {
    recipeId: string;
    targetPortions: number;
    sourceType?: ProductionOrder['sourceType'];
    productionModel?: ProductionModel;
    assignedTo?: string;
    scheduledFor?: string;
    cateringOrderId?: string;
    cateringOrderNumber?: string;
    substituteOverrides?: Record<string, string>;
  }): ProductionOrder | null => {
    const newOrder = applyCreateProductionOrderLocal(params);
    if (!newOrder) return null;
    enqueueApiSync(
      () => apiClient.inventory.createProductionOrder(activeBranchId, { ...params, id: newOrder.id }),
      'createProductionOrder'
    );
    return newOrder;
  };

  const advanceProductionOrderStage = (
    orderId: string,
    nextStage: ProductionOrderStatus,
    options?: {
      actualPortions?: number;
      wastagePortions?: number;
      wastageReason?: string;
      actualLineQtys?: Record<string, number>;
      exceptionReason?: string;
      actor?: string;
    }
  ): { success: boolean; error?: string } => {
    const order = productionOrders.find((po) => po.id === orderId);
    if (!order) return { success: false, error: 'Production order not found.' };
    const actor = options?.actor || 'Executive Chef';
    const today = new Date().toISOString().split('T')[0];
    const nowStr = `${today} ${new Date().toTimeString().substring(0, 5)}`;

    if (nextStage === 'stock_checked') {
      const scaled = calculateScaledRequirements([
        { recipeId: order.recipeId, portions: order.targetPortions },
      ]);
      if (!scaled.canProduceWithStore && !options?.exceptionReason) {
        return {
          success: false,
          error: 'Stock shortage detected. Resolve via Store Transfer, Purchase Request, Substitute, or Manager Exception.',
        };
      }
      setProductionOrders((prev) =>
        prev.map((po) =>
          po.id === orderId
            ? {
                ...po,
                status: 'stock_checked',
                stockCheckedAt: nowStr,
                exceptionApprovedBy: options?.exceptionReason ? actor : po.exceptionApprovedBy,
                exceptionReason: options?.exceptionReason || po.exceptionReason,
              }
            : po
        )
      );
      enqueueApiSync(
        () => apiClient.inventory.advanceProductionOrderStage(activeBranchId, orderId, nextStage, options),
        'advanceProductionOrderStage'
      );
      return { success: true };
    }

    if (nextStage === 'ingredients_issued') {
      const scaled = calculateScaledRequirements([
        { recipeId: order.recipeId, portions: order.targetPortions },
      ]);
      if (!scaled.canProduceWithStore && !options?.exceptionReason) {
        return {
          success: false,
          error: 'Insufficient total stock (Store + Kitchen) to issue ingredients.',
        };
      }
      scaled.rows
        .filter((r) => !r.isSubRecipe && r.kitchenShortageQty > 0 && r.availableStoreQty > 0)
        .forEach((r) => {
          const transferAmt = Math.min(r.kitchenShortageQty, r.availableStoreQty);
          if (transferAmt > 0) {
            applyTransferStockLocal({
              ingredientId: r.ingredientId,
              quantityUnits: transferAmt,
              fromLocation: 'main_store',
              toLocation: 'kitchen',
              reason: `Issued for Production Order ${order.orderNumber} (${order.recipeName})`,
              shift: 'Production Issue',
              recordedBy: actor,
            });
          }
        });

      setProductionOrders((prev) =>
        prev.map((po) =>
          po.id === orderId
            ? {
                ...po,
                status: 'ingredients_issued',
                ingredientsIssuedAt: nowStr,
                exceptionApprovedBy: options?.exceptionReason ? actor : po.exceptionApprovedBy,
                exceptionReason: options?.exceptionReason || po.exceptionReason,
              }
            : po
        )
      );
      enqueueApiSync(
        () => apiClient.inventory.advanceProductionOrderStage(activeBranchId, orderId, nextStage, options),
        'advanceProductionOrderStage'
      );
      return { success: true };
    }

    if (nextStage === 'in_production') {
      setProductionOrders((prev) =>
        prev.map((po) => (po.id === orderId ? { ...po, status: 'in_production' } : po))
      );
      enqueueApiSync(
        () => apiClient.inventory.advanceProductionOrderStage(activeBranchId, orderId, nextStage, options),
        'advanceProductionOrderStage'
      );
      return { success: true };
    }

    if (nextStage === 'completed') {
      const recipe = recipes.find((r) => r.id === order.recipeId);
      if (!recipe) return { success: false, error: 'Linked recipe missing.' };
      const batches = order.targetPortions / Math.max(1, recipe.batchYieldPlates || 1);
      const actualPortions = options?.actualPortions ?? order.targetPortions;
      const wastagePortions = options?.wastagePortions ?? 0;

      const cookRes = applyCookBatchProductionLocal({
        recipeId: recipe.id,
        batches,
        actualPlatesProduced: actualPortions,
        actualInputs: options?.actualLineQtys,
        chefName: actor,
        managerOverride: Boolean(options?.exceptionReason || order.exceptionReason),
        overrideReason: options?.exceptionReason || order.exceptionReason,
      });

      if (!cookRes.success) {
        return { success: false, error: cookRes.error || 'Could not complete production order.' };
      }

      const actualCost = cookRes.log?.totalCost ?? order.standardCost;
      const costVariance = actualCost - order.standardCost;

      setProductionOrders((prev) =>
        prev.map((po) =>
          po.id === orderId
            ? {
                ...po,
                status: 'completed',
                actualPortions,
                wastagePortions,
                wastageReason: options?.wastageReason,
                actualCost,
                costVariance,
                completedAt: nowStr,
                lines: po.lines.map((ln) => ({
                  ...ln,
                  actualQty:
                    options?.actualLineQtys && options.actualLineQtys[ln.ingredientId] !== undefined
                      ? options.actualLineQtys[ln.ingredientId]
                      : ln.standardQty,
                })),
              }
            : po
        )
      );

      if (wastagePortions > 0 && recipe.menuItemId) {
        setPreparedDishStocks((prev) =>
          prev.map((p) =>
            p.menuItemId === recipe.menuItemId
              ? {
                  ...p,
                  preparedPlatesAvailable: Math.max(0, p.preparedPlatesAvailable - Math.min(wastagePortions, actualPortions)),
                  status: p.preparedPlatesAvailable - Math.min(wastagePortions, actualPortions) === 0 ? 'out_of_stock' : p.status,
                }
              : p
          )
        );
        const wasteImpact = Math.round(
          Math.min(wastagePortions, actualPortions) * (cookRes.log?.costPerPlate || computeRecipeUnitCost(recipe.id).perPlateCost)
        );
        setStockMovements((prev) => [
          {
            id: `sm-${Date.now()}-leftover`,
            ingredientId: recipe.ingredients[0]?.ingredientId || 'ing-rice',
            ingredientName: `${order.recipeName} (Prepared Batch Food)`,
            type: 'wastage_spoilage',
            quantityDelta: -Math.min(wastagePortions, actualPortions),
            unit: 'plates',
            costImpact: wasteImpact,
            date: today,
            reference: `WST-LEFTOVER-${Math.min(wastagePortions, actualPortions)}P`,
            reason: options?.wastageReason || `Production loss on ${order.orderNumber}`,
            recordedBy: 'Executive Chef',
            sourceLocation: 'kitchen',
          },
          ...prev,
        ]);
      }

      enqueueApiSync(
        () => apiClient.inventory.advanceProductionOrderStage(activeBranchId, orderId, nextStage, options),
        'advanceProductionOrderStage'
      );

      return { success: true };
    }

    setProductionOrders((prev) =>
      prev.map((po) => (po.id === orderId ? { ...po, status: nextStage } : po))
    );
    enqueueApiSync(
      () => apiClient.inventory.advanceProductionOrderStage(activeBranchId, orderId, nextStage, options),
      'advanceProductionOrderStage'
    );
    return { success: true };
  };

  const cancelProductionOrder = (orderId: string, reason: string, actor: string = 'Branch Manager') => {
    setProductionOrders((prev) =>
      prev.map((po) =>
        po.id === orderId
          ? { ...po, status: 'cancelled', exceptionApprovedBy: actor, exceptionReason: reason }
          : po
      )
    );
    enqueueApiSync(
      () => apiClient.inventory.cancelProductionOrder(activeBranchId, orderId, reason, actor),
      'cancelProductionOrder'
    );
  };

  const resolveShortageViaPurchaseRequest = (params: {
    ingredientId: string;
    requestedQty: number;
    reason: string;
    linkedOrderRef?: string;
    requestedBy?: string;
  }): PurchaseRequest | null => {
    const ing = ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.requestedQty <= 0) return null;
    const unitCost = ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const pr: PurchaseRequest = {
      id: `pr-${Date.now()}`,
      requestNumber: `PR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      requestedQty: Math.round(params.requestedQty),
      unit: ing.consumptionUnit,
      estimatedCost: Math.round(params.requestedQty * unitCost),
      supplier: ing.supplier,
      reason: params.reason,
      linkedOrderRef: params.linkedOrderRef,
      status: 'pending',
      requestedBy: params.requestedBy || 'Executive Chef',
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
    };
    setPurchaseRequests((prev) => [pr, ...prev]);

    addNotificationLocal({
      title: `Purchase Requisition ${pr.requestNumber}`,
      message: `Requested ${pr.requestedQty.toLocaleString()} ${pr.unit} of ${pr.ingredientName} (${formatMoney(pr.estimatedCost)}).`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'Review Purchase Request',
    });

    enqueueApiSync(
      () => apiClient.inventory.createPurchaseRequest(activeBranchId, { ...params, id: pr.id }),
      'resolveShortageViaPurchaseRequest'
    );

    return pr;
  };

  const updatePurchaseRequestStatus = (requestId: string, status: PurchaseRequest['status']) => {
    const target = purchaseRequests.find((p) => p.id === requestId);
    setPurchaseRequests((prev) =>
      prev.map((p) => (p.id === requestId ? { ...p, status } : p))
    );
    if (status === 'received' && target) {
      applyRecordStockIntakeLocal(
        target.ingredientId,
        target.requestedQty,
        target.estimatedCost,
        target.supplier,
        target.requestNumber
      );
    }
    enqueueApiSync(
      () => apiClient.inventory.updatePurchaseRequestStatus(activeBranchId, requestId, status),
      'updatePurchaseRequestStatus'
    );
  };

  const resolveShortageViaBranchTransfer = (params: {
    ingredientId: string;
    quantity: number;
    fromBranch: string;
    requestedBy?: string;
  }): BranchTransferRequest | null => {
    const ing = ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.quantity <= 0) return null;
    const bt: BranchTransferRequest = {
      id: `bt-${Date.now()}`,
      transferNumber: `BTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      fromBranch: params.fromBranch,
      toBranch: currentTenant.name,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: Math.round(params.quantity),
      unit: ing.consumptionUnit,
      status: 'in_transit',
      requestedBy: params.requestedBy || 'Branch Manager',
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
    };
    setBranchTransfers((prev) => [bt, ...prev]);
    addNotificationLocal({
      title: `Inter-Branch Transfer ${bt.transferNumber}`,
      message: `${bt.quantity.toLocaleString()} ${bt.unit} of ${bt.ingredientName} dispatched from ${bt.fromBranch}.`,
      type: 'transfer',
      actionRole: 'manager',
      actionLabel: 'Receive Transfer',
    });
    enqueueApiSync(
      () => apiClient.inventory.createBranchTransferRequest(activeBranchId, { ...params, id: bt.id }),
      'resolveShortageViaBranchTransfer'
    );
    return bt;
  };

  const receiveBranchTransfer = (transferId: string) => {
    const bt = branchTransfers.find((b) => b.id === transferId);
    if (!bt || bt.status === 'received') return;
    setBranchTransfers((prev) =>
      prev.map((b) => (b.id === transferId ? { ...b, status: 'received' } : b))
    );
    const ing = ingredients.find((i) => i.id === bt.ingredientId);
    if (ing) {
      const unitCost = ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
      applyRecordStockIntakeLocal(
        ing.id,
        bt.quantity,
        Math.round(bt.quantity * unitCost),
        `Branch Transfer (${bt.fromBranch})`,
        bt.transferNumber
      );
    }
    enqueueApiSync(
      () => apiClient.inventory.receiveBranchTransfer(activeBranchId, transferId),
      'receiveBranchTransfer'
    );
  };

  const createCateringOrder = (params: {
    eventName: string;
    eventType: CateringOrder['eventType'];
    customerName: string;
    customerPhone: string;
    siteLocation: string;
    eventDate: string;
    items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>;
    depositPaid?: number;
    notes?: string;
  }): CateringOrder => {
    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`;
    const builtItems: CateringOrderItem[] = params.items
      .filter((it) => it.quantity > 0)
      .map((it) => {
        const dish = menuItems.find((m) => m.id === it.menuItemId);
        const rec = recipes.find((r) => r.menuItemId === it.menuItemId);
        const unitCost = rec
          ? computeRecipeUnitCost(rec.id).perPlateCost
          : it.menuItemId === 'menu-soda-bottle'
          ? 917
          : Math.round((dish?.price || 0) * 0.35);
        return {
          menuItemId: it.menuItemId,
          recipeId: rec?.id,
          name: dish?.name || 'Catering Item',
          quantity: it.quantity,
          fulfilledQuantity: 0,
          unitPrice: dish?.price || 0,
          unitCost,
          portion: it.portion,
          notes: it.notes,
        };
      });

    const totalRevenue = builtItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const estimatedFoodCost = builtItems.reduce((s, it) => s + it.unitCost * it.quantity, 0);
    const foodGrossProfit = Math.max(0, totalRevenue - estimatedFoodCost);
    const foodCostPercentage = totalRevenue > 0 ? (estimatedFoodCost / totalRevenue) * 100 : 0;

    const newCat: CateringOrder = {
      id: `cat-${Date.now()}`,
      orderNumber: `CAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      eventName: params.eventName,
      eventType: params.eventType,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      siteLocation: params.siteLocation,
      eventDate: params.eventDate,
      status: 'confirmed',
      items: builtItems,
      totalRevenue,
      estimatedFoodCost,
      foodGrossProfit,
      foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
      depositPaid: params.depositPaid || 0,
      notes: params.notes,
      createdBy: 'Branch Manager',
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    setCateringOrders((prev) => [newCat, ...prev]);

    addNotificationLocal({
      title: `Catering Order ${newCat.orderNumber}`,
      message: `${newCat.eventName} (${builtItems.reduce((s, i) => s + i.quantity, 0)} items) scheduled for ${newCat.eventDate}.`,
      type: 'order',
      actionRole: 'manager',
      actionLabel: 'Plan Kitchen Production',
    });

    enqueueApiSync(
      () => apiClient.inventory.createCateringOrder(activeBranchId, { ...params, id: newCat.id }),
      'createCateringOrder'
    );

    return newCat;
  };

  const reserveCateringIngredients = (cateringOrderId: string): { success: boolean; message: string } => {
    const order = cateringOrders.find((c) => c.id === cateringOrderId);
    if (!order) return { success: false, message: 'Catering order not found.' };
    if (order.reservedIngredients && order.reservedIngredients.length > 0) {
      return { success: true, message: 'Ingredients already reserved for this event.' };
    }

    const scaled = calculateScaledRequirements(
      order.items.map((it) => ({
        recipeId: it.recipeId,
        menuItemId: it.menuItemId,
        portions: it.quantity,
        portionName: it.portion,
      }))
    );

    if (!scaled.canProduceWithStore) {
      return {
        success: false,
        message: 'Insufficient unreserved stock for one or more ingredients. Resolve shortages or create purchase request first.',
      };
    }

    const rawReservations = scaled.rows.filter((r) => !r.isSubRecipe && r.requiredQty > 0);
    setIngredients((prev) =>
      prev.map((ing) => {
        const match = rawReservations.find((r) => r.ingredientId === ing.id);
        if (!match) return ing;
        return {
          ...ing,
          reservedStockUnits: (ing.reservedStockUnits ?? 0) + match.requiredQty,
        };
      })
    );

    setCateringOrders((prev) =>
      prev.map((c) =>
        c.id === cateringOrderId
          ? {
              ...c,
              status: c.status === 'confirmed' || c.status === 'draft' ? 'ingredients_reserved' : c.status,
              reservedIngredients: rawReservations.map((r) => ({
                ingredientId: r.ingredientId,
                ingredientName: r.ingredientName,
                qty: r.requiredQty,
                unit: r.unit,
              })),
              updatedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
            }
          : c
      )
    );

    enqueueApiSync(
      () => apiClient.inventory.reserveCateringIngredients(activeBranchId, cateringOrderId),
      'reserveCateringIngredients'
    );

    return {
      success: true,
      message: `Reserved ${rawReservations.length} consolidated ingredients for ${order.orderNumber}.`,
    };
  };

  const generateCateringProductionPlan = (cateringOrderId: string): ProductionOrder[] => {
    const order = cateringOrders.find((c) => c.id === cateringOrderId);
    if (!order) return [];
    const created: ProductionOrder[] = [];
    order.items.forEach((it) => {
      if (!it.recipeId) return;
      const po = applyCreateProductionOrderLocal({
        recipeId: it.recipeId,
        targetPortions: it.quantity,
        sourceType: 'catering',
        productionModel: 'catering',
        scheduledFor: `${order.eventDate} · ${order.eventName}`,
        cateringOrderId: order.id,
        cateringOrderNumber: order.orderNumber,
      });
      if (po) created.push(po);
    });

    if (created.length > 0) {
      setCateringOrders((prev) =>
        prev.map((c) =>
          c.id === cateringOrderId
            ? {
                ...c,
                status: 'in_production',
                productionOrderIds: [...(c.productionOrderIds || []), ...created.map((p) => p.id)],
                updatedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
              }
            : c
        )
      );
      enqueueApiSync(
        () =>
          apiClient.inventory.generateCateringProductionPlan(
            activeBranchId,
            cateringOrderId,
            created.map((p) => p.id)
          ),
        'generateCateringProductionPlan'
      );
    }
    return created;
  };

  const recordCateringFulfillment = (
    cateringOrderId: string,
    fulfilledByMenuId: Record<string, number>,
    nextStatus?: CateringOrderStatus
  ) => {
    const targetOrder = cateringOrders.find((c) => c.id === cateringOrderId);
    let releaseReserved = false;
    let reservedList: NonNullable<CateringOrder['reservedIngredients']> = [];

    if (targetOrder) {
      const previewItems = targetOrder.items.map((it) => ({
        ...it,
        fulfilledQuantity:
          fulfilledByMenuId[it.menuItemId] !== undefined
            ? Math.min(it.quantity, Math.max(0, fulfilledByMenuId[it.menuItemId]))
            : it.fulfilledQuantity,
      }));
      const allDone = previewItems.every((it) => it.fulfilledQuantity >= it.quantity);
      const someDone = previewItems.some((it) => it.fulfilledQuantity > 0);
      const derivedStatus: CateringOrderStatus =
        nextStatus || (allDone ? 'completed' : someDone ? 'partial_fulfilled' : targetOrder.status);
      if (derivedStatus === 'completed' && targetOrder.reservedIngredients && targetOrder.reservedIngredients.length > 0) {
        releaseReserved = true;
        reservedList = targetOrder.reservedIngredients;
      }
    }

    setCateringOrders((prev) =>
      prev.map((c) => {
        if (c.id !== cateringOrderId) return c;
        const updatedItems = c.items.map((it) => ({
          ...it,
          fulfilledQuantity:
            fulfilledByMenuId[it.menuItemId] !== undefined
              ? Math.min(it.quantity, Math.max(0, fulfilledByMenuId[it.menuItemId]))
              : it.fulfilledQuantity,
        }));
        const allDone = updatedItems.every((it) => it.fulfilledQuantity >= it.quantity);
        const someDone = updatedItems.some((it) => it.fulfilledQuantity > 0);
        const derivedStatus: CateringOrderStatus =
          nextStatus || (allDone ? 'completed' : someDone ? 'partial_fulfilled' : c.status);

        return {
          ...c,
          items: updatedItems,
          status: derivedStatus,
          updatedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
        };
      })
    );

    if (releaseReserved) {
      setIngredients((prevIng) =>
        prevIng.map((ing) => {
          const resMatch = reservedList.find((r) => r.ingredientId === ing.id);
          if (!resMatch) return ing;
          return {
            ...ing,
            reservedStockUnits: Math.max(0, (ing.reservedStockUnits ?? 0) - resMatch.qty),
          };
        })
      );
    }

    enqueueApiSync(
      () =>
        apiClient.inventory.recordCateringFulfillment(
          activeBranchId,
          cateringOrderId,
          fulfilledByMenuId,
          nextStatus
        ),
      'recordCateringFulfillment'
    );
  };

  const amendCateringOrder = (
    cateringOrderId: string,
    items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>,
    note: string
  ) => {
    const nowStr = `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`;
    setCateringOrders((prev) =>
      prev.map((c) => {
        if (c.id !== cateringOrderId) return c;
        const builtItems: CateringOrderItem[] = items
          .filter((it) => it.quantity > 0)
          .map((it) => {
            const existing = c.items.find((e) => e.menuItemId === it.menuItemId);
            const dish = menuItems.find((m) => m.id === it.menuItemId);
            const rec = recipes.find((r) => r.menuItemId === it.menuItemId);
            const unitCost = rec
              ? computeRecipeUnitCost(rec.id).perPlateCost
              : it.menuItemId === 'menu-soda-bottle'
              ? 917
              : Math.round((dish?.price || 0) * 0.35);
            return {
              menuItemId: it.menuItemId,
              recipeId: rec?.id,
              name: dish?.name || existing?.name || 'Catering Item',
              quantity: it.quantity,
              fulfilledQuantity: Math.min(it.quantity, existing?.fulfilledQuantity || 0),
              unitPrice: dish?.price || existing?.unitPrice || 0,
              unitCost,
              portion: it.portion,
              notes: it.notes,
            };
          });
        const totalRevenue = builtItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
        const estimatedFoodCost = builtItems.reduce((s, it) => s + it.unitCost * it.quantity, 0);
        const foodGrossProfit = Math.max(0, totalRevenue - estimatedFoodCost);
        const foodCostPercentage = totalRevenue > 0 ? (estimatedFoodCost / totalRevenue) * 100 : 0;

        return {
          ...c,
          items: builtItems,
          totalRevenue,
          estimatedFoodCost,
          foodGrossProfit,
          foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
          amendments: [
            {
              id: `amd-${Date.now()}`,
              summary: note || 'Amended event quantities',
              timestamp: nowStr,
              actor: 'Branch Manager',
            },
            ...(c.amendments || []),
          ],
          updatedAt: nowStr,
        };
      })
    );
    enqueueApiSync(
      () => apiClient.inventory.amendCateringOrder(activeBranchId, cateringOrderId, items, note),
      'amendCateringOrder'
    );
  };

  const generateCateringInvoice = (cateringOrderId: string): string => {
    const invNum = `INV-CAT-${Math.floor(10000 + Math.random() * 89999)}`;
    setCateringOrders((prev) =>
      prev.map((c) =>
        c.id === cateringOrderId
          ? {
              ...c,
              invoiceNumber: c.invoiceNumber || invNum,
              status: 'invoiced',
              updatedAt: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
            }
          : c
      )
    );
    enqueueApiSync(
      () => apiClient.inventory.generateCateringInvoice(activeBranchId, cateringOrderId),
      'generateCateringInvoice'
    );
    return invNum;
  };

  const logBlockedCookingAttempt = (attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>) => {
    const newAttempt: BlockedCookingAttempt = {
      ...attempt,
      id: `block-${Date.now()}`,
      timestamp: `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`,
    };
    setBlockedCookingAttempts((prev) => [newAttempt, ...prev]);
    enqueueApiSync(
      () => apiClient.inventory.logBlockedAttempt(activeBranchId, attempt),
      'logBlockedCookingAttempt'
    );
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
        recordedBy: 'Executive Chef',
        sourceLocation: 'kitchen',
      };
      setStockMovements((prev) => [wasteMovement, ...prev]);

      addNotificationLocal({
        title: 'Leftovers Logged as Waste',
        message: `${platesCount} unsold plates of ${dish.dishName} logged as waste (${formatMoney(totalImpact)} impact).`,
        type: 'stock',
        actionRole: 'manager',
        actionLabel: 'View Spoilage',
      });
    } else {
      addNotificationLocal({
        title: 'Leftovers Returned to Store',
        message: `${platesCount} plates of ${dish.dishName} chilled and returned to cold room buffer storage.`,
        type: 'transfer',
        actionRole: 'kitchen',
        actionLabel: 'View Prepared Plates',
      });
    }

    enqueueApiSync(
      () =>
        apiClient.inventory.handleLeftoverPreparedPlates(
          activeBranchId,
          menuItemId,
          platesCount,
          action,
          reason
        ),
      'handleLeftoverPreparedPlates'
    );

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

    enqueueApiSync(
      () => apiClient.inventory.recomputeDailyVariance(activeBranchId),
      'recomputeDailyVariance'
    );
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

    enqueueApiSync(
      () => apiClient.inventory.updateDailyReconciliationCount(activeBranchId, ingredientId, actualCount, notes),
      'updateDailyReconciliationCount'
    );
  };

  const commitDailyReconciliation = (staffName: string = 'Branch Manager') => {
    let totalVariance = 0;
    const newMovements: StockMovement[] = [];
    const today = new Date().toISOString().split('T')[0];

    const updatedRecs: DailyReconciliationItem[] = dailyReconciliations.map((item) => {
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
    });

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

    setDailyReconciliations(updatedRecs);

    if (newMovements.length > 0) {
      setStockMovements((prev) => [...newMovements, ...prev]);
    }

    addNotificationLocal({
      title: 'Daily Stock Reconciliation Committed',
      message: `Physical closing counts synced by ${staffName}. Variance impact: ${formatMoney(totalVariance)}. Approved recipes unchanged.`,
      type: 'stock',
      actionRole: 'manager',
      actionLabel: 'View Audit Ledger',
    });

    enqueueApiSync(
      () => apiClient.inventory.commitDailyReconciliation(activeBranchId, staffName),
      'commitDailyReconciliation'
    );

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
    const advId = `adv-${Date.now()}`;
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              advances: [
                ...e.advances,
                {
                  id: advId,
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
    enqueueApiSync(
      () =>
        apiClient.hr.addAdvanceRequest(activeBranchId, employeeId, cleanAmount, reason, {
          ...options,
          id: advId,
        }),
      'addAdvanceRequest'
    );
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
    enqueueApiSync(
      () => apiClient.hr.approveAdvance(activeBranchId, employeeId, advanceId, approvedBy),
      'approveAdvance'
    );
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
    enqueueApiSync(
      () => apiClient.hr.rejectAdvance(activeBranchId, employeeId, advanceId, reason),
      'rejectAdvance'
    );
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
    enqueueApiSync(
      () => apiClient.hr.markAdvanceRepaid(activeBranchId, employeeId, advanceId),
      'markAdvanceRepaid'
    );
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
    enqueueApiSync(
      () => apiClient.hr.updateAdvance(activeBranchId, employeeId, advanceId, cleanAmount, reason),
      'updateAdvance'
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

    let newWaiterId: string | undefined;
    if (emp.role === 'waiter') {
      const codeBase = emp.name
        .trim()
        .split(/\s+/)[0]
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '') || 'STAFF';
      newWaiterId = `waiter-${Date.now()}`;
      const emailDomain = currentOrganization.domain || 'restaurant.local';
      const newWaiter: Waiter = {
        id: newWaiterId,
        name: emp.name,
        phone: emp.phone,
        email: emp.email || `${codeBase.toLowerCase()}@${emailDomain}`,
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
    enqueueApiSync(
      () => apiClient.hr.addEmployee(activeBranchId, { ...emp, id: newEmp.id, waiterId: newWaiterId }),
      'addEmployee'
    );
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
      enqueueApiSync(
        () => apiClient.hr.updateEmployee(activeBranchId, employeeId, updates),
        'updateEmployee'
      );
    }
  };

  const toggleWaiterActive = (waiterId: string) => {
    setWaiters((prev) =>
      prev.map((w) => (w.id === waiterId ? { ...w, active: !w.active } : w))
    );
    enqueueApiSync(() => apiClient.hr.toggleWaiterActive(activeBranchId, waiterId), 'toggleWaiterActive');
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
    enqueueApiSync(() => apiClient.orders.assignWaiter(activeBranchId, orderId, waiterId), 'assignOrderWaiter');
  };

  // Tanzania TRA PAYE + 10% Employee NSSF calculation helper
  const calculateEmployeePayroll = (employeeId: string, period: string = '2026-11') =>
    calculateEmployeePayrollPure(
      employeeId,
      period,
      employees,
      waiters,
      orders,
      defaultCommissionMode,
      defaultCommissionValue,
      settledCommissionByWaiter,
      payrollPayments
    );

  const recordPayrollPayment = (params: {
    period: string;
    employeeIds: string[];
    method: 'bank_transfer' | 'mpesa' | 'cash';
    referencePrefix?: string;
    paidBy?: string;
  }): PayrollPaymentRecord[] => {
    const nowIso = new Date().toISOString();
    const payer = params.paidBy || 'Branch Manager';
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
      addNotificationLocal({
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
      enqueueApiSync(
        () => apiClient.hr.recordPayrollPayment(activeBranchId, params),
        'recordPayrollPayment'
      );
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
    addNotificationLocal({
      title: 'Waiter Commission Rule Updated',
      message:
        mode === 'percent'
          ? `Default waiter commission set to ${cleanValue}% of paid net sales.`
          : `Default waiter commission set to ${formatMoney(cleanValue)} fixed per paid order.`,
      type: 'payroll',
      actionRole: 'manager',
      actionLabel: 'View Rules',
    });
    enqueueApiSync(
      () =>
        apiClient.orders.updateSettings(activeBranchId, {
          defaultCommissionMode: mode,
          defaultCommissionValue: cleanValue,
        }),
      'setDefaultCommissionPolicy'
    );
  };

  const getOrderCommission = (order: Order, waiterId?: string) =>
    getOrderCommissionPure(order, waiters, defaultCommissionMode, defaultCommissionValue, waiterId);

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
    enqueueApiSync(
      () =>
        apiClient.orders.updateCommission(
          activeBranchId,
          orderId,
          mode,
          cleanValue,
          configuredBy,
          waiterId
        ),
      'updateOrderCommission'
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
    const settledBy = options?.settledBy || 'Branch Manager';

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

    addNotificationLocal({
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
    enqueueApiSync(
      () =>
        apiClient.hr.settleWaiterCommission(activeBranchId, waiterId, amount, {
          method,
          reference: ref,
          settledBy,
        }),
      'settleWaiterCommission'
    );
  };

  const calculateWaiterStats = (waiterId: string) =>
    calculateWaiterStatsPure(
      waiterId,
      orders,
      waiters,
      defaultCommissionMode,
      defaultCommissionValue,
      settledCommissionByWaiter
    );

  const dismissSoundAlert = () => setSoundAlertTriggered(false);

  // ============== MAIN HQ MULTI-BRANCH OVERVIEW & CONTROL (TENANT-ISOLATED) ==============
  const branchMetricsSummaries: BranchMetricsSummary[] = useMemo(
    () => tenants.map((branch) => computeBranchMetricsSummaryPure(branch, branchStores[branch.id])),
    [tenants, branchStores]
  );

  const hqAllOrders = useMemo(() => {
    return tenants
      .flatMap((b) =>
        (branchStores[b.id]?.orders || []).map((o) => ({
          ...o,
          branchId: b.id,
          branchName: b.name,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [tenants, branchStores]);

  const hqAllApprovals = useMemo(() => {
    return tenants.flatMap((b) =>
      (branchStores[b.id]?.approvalRequests || []).map((a) => ({
        ...a,
        branchId: b.id,
        branchName: b.name,
      }))
    );
  }, [tenants, branchStores]);

  const hqAllPurchaseRequests = useMemo(() => {
    return tenants.flatMap((b) =>
      (branchStores[b.id]?.purchaseRequests || []).map((p) => ({
        ...p,
        branchId: b.id,
        branchName: b.name,
      }))
    );
  }, [tenants, branchStores]);

  const hqAllBranchTransfers = useMemo(() => {
    return tenants.flatMap((b) =>
      (branchStores[b.id]?.branchTransfers || []).map((t) => ({
        ...t,
        branchId: b.id,
        branchName: b.name,
      }))
    );
  }, [tenants, branchStores]);

  const getBranchIngredients = (branchId: string): Ingredient[] => {
    if (!tenants.some((b) => b.id === branchId)) return [];
    return branchStores[branchId]?.ingredients || [];
  };

  const hqReviewApproval = (
    branchId: string,
    requestId: string,
    approve: boolean,
    managerName: string = `${currentOrganization.ownerName} (Main HQ)`
  ) => {
    // Strictly ensure target branch belongs to current organization
    const targetBranch = tenants.find((b) => b.id === branchId);
    if (!targetBranch) return;
    const store = branchStores[branchId];
    const req = store?.approvalRequests.find((a) => a.id === requestId);
    if (!store || !req || req.status !== 'pending') return;

    const nowIso = new Date().toISOString();
    updateBranchSlice(
      'approvalRequests',
      (prev) =>
        prev.map((a) =>
          a.id === requestId
            ? { ...a, status: approve ? 'approved' : 'rejected', reviewedBy: managerName, reviewedAt: nowIso }
            : a
        ),
      branchId
    );

    if (approve && req.actionType === 'discount' && req.payload) {
      updateBranchSlice(
        'orders',
        (prev) =>
          prev.map((o) => {
            if (o.id !== req.orderId) return o;
            const disc =
              req.payload?.discountType === 'percent'
                ? Math.round(o.subtotal * ((req.payload.discountValue || 0) / 100))
                : req.payload?.discountValue || 0;
            const discountedSub = Math.max(0, o.subtotal - disc);
            const newTotal = Math.max(0, discountedSub + o.tax + o.deliveryFee + o.donation);
            return {
              ...o,
              discount: disc,
              discountType: req.payload?.discountType,
              discountValue: req.payload?.discountValue,
              discountReason: `${req.reason} (Approved by HQ)`,
              total: newTotal,
              updatedAt: nowIso,
            };
          }),
        branchId
      );
    } else if (approve && req.actionType === 'cancel_order') {
      updateBranchSlice(
        'orders',
        (prev) =>
          prev.map((o) =>
            o.id === req.orderId
              ? {
                  ...o,
                  status: 'cancelled',
                  cancellationRecord: {
                    cancelledBy: req.requestedBy,
                    approvedBy: managerName,
                    reason: req.reason,
                    timestamp: nowIso,
                  },
                  updatedAt: nowIso,
                }
              : o
          ),
        branchId
      );
    }

    updateBranchSlice(
      'auditLogs',
      (prev) => [
        {
          id: `aud-hq-${Date.now()}`,
          orderId: req.orderId,
          orderNumber: req.orderNumber,
          actor: managerName,
          actorRole: 'owner',
          action: approve ? 'HQ_APPROVAL_GRANTED' : 'HQ_APPROVAL_REJECTED',
          details: `${approve ? 'Approved' : 'Rejected'} ${req.actionType} on ${req.orderNumber}: ${req.details}`,
          timestamp: nowIso,
        },
        ...prev,
      ],
      branchId
    );
    enqueueApiSync(
      () =>
        apiClient.hq.reviewApproval(
          currentOrganization.id,
          branchId,
          requestId,
          approve,
          managerName
        ),
      'hqReviewApproval'
    );
  };

  const hqDispatchBranchTransfer = (params: {
    fromBranchId: string;
    toBranchId: string;
    ingredientId: string;
    quantityUnits: number;
    actor?: string;
  }): { success: boolean; message: string } => {
    const fromBranch = tenants.find((b) => b.id === params.fromBranchId);
    const toBranch = tenants.find((b) => b.id === params.toBranchId);
    if (!fromBranch || !toBranch || fromBranch.id === toBranch.id) {
      return { success: false, message: 'Select two distinct branches within your organization.' };
    }
    const sourceStore = branchStores[fromBranch.id];
    const destStore = branchStores[toBranch.id];
    if (!sourceStore || !destStore) {
      return { success: false, message: 'Branch workspace not initialized.' };
    }
    const srcIng = sourceStore.ingredients.find((i) => i.id === params.ingredientId);
    if (!srcIng || params.quantityUnits <= 0) {
      return { success: false, message: 'Select a valid ingredient and quantity.' };
    }
    if (srcIng.storeStockUnits < params.quantityUnits) {
      return {
        success: false,
        message: `${fromBranch.name} only has ${srcIng.storeStockUnits.toLocaleString()} ${srcIng.consumptionUnit} in Main Store.`,
      };
    }

    const actor = params.actor || `${currentOrganization.ownerName} (Main HQ)`;
    const transferNum = `HQ-BTR-${Date.now().toString().slice(-4)}`;
    const unitCost = srcIng.conversionRatio > 0 ? srcIng.costPerPurchaseUnit / srcIng.conversionRatio : 0;
    const costImpact = Math.round(params.quantityUnits * unitCost);
    const today = new Date().toISOString().split('T')[0];

    // 1. Deduct from source branch store
    updateBranchSlice(
      'ingredients',
      (prev) =>
        prev.map((i) =>
          i.id === srcIng.id
            ? {
                ...i,
                storeStockUnits: Math.max(0, i.storeStockUnits - params.quantityUnits),
                currentStockUnits: Math.max(0, i.currentStockUnits - params.quantityUnits),
              }
            : i
        ),
      fromBranch.id
    );
    updateBranchSlice(
      'stockMovements',
      (prev) => [
        {
          id: `sm-hq-out-${Date.now()}`,
          ingredientId: srcIng.id,
          ingredientName: srcIng.name,
          type: 'stock_transfer',
          quantityDelta: -params.quantityUnits,
          unit: srcIng.consumptionUnit,
          costImpact,
          date: today,
          reference: transferNum,
          reason: `HQ Inter-Branch Dispatch to ${toBranch.name}`,
          recordedBy: actor,
          sourceLocation: 'main_store',
          transferStatus: 'received',
        },
        ...prev,
      ],
      fromBranch.id
    );

    // 2. Credit destination branch store (match by id or name, or create master item in destination branch)
    updateBranchSlice(
      'ingredients',
      (prev) => {
        const existing = prev.find(
          (i) => i.id === srcIng.id || i.name.toLowerCase() === srcIng.name.toLowerCase()
        );
        if (existing) {
          return prev.map((i) =>
            i.id === existing.id
              ? {
                  ...i,
                  storeStockUnits: i.storeStockUnits + params.quantityUnits,
                  currentStockUnits: i.currentStockUnits + params.quantityUnits,
                }
              : i
          );
        }
        return [
          ...prev,
          {
            ...srcIng,
            storeStockUnits: params.quantityUnits,
            kitchenStockUnits: 0,
            currentStockUnits: params.quantityUnits,
            reservedStockUnits: 0,
          },
        ];
      },
      toBranch.id
    );
    updateBranchSlice(
      'stockMovements',
      (prev) => [
        {
          id: `sm-hq-in-${Date.now()}`,
          ingredientId: srcIng.id,
          ingredientName: srcIng.name,
          type: 'stock_transfer',
          quantityDelta: params.quantityUnits,
          unit: srcIng.consumptionUnit,
          costImpact,
          date: today,
          reference: transferNum,
          reason: `HQ Inter-Branch Transfer received from ${fromBranch.name}`,
          recordedBy: actor,
          destinationLocation: 'main_store',
          transferStatus: 'received',
          receivedAt: new Date().toLocaleTimeString(),
          receivedBy: toBranch.managerName,
        },
        ...prev,
      ],
      toBranch.id
    );
    updateBranchSlice(
      'branchTransfers',
      (prev) => [
        {
          id: `bt-hq-${Date.now()}`,
          transferNumber: transferNum,
          fromBranch: fromBranch.name,
          toBranch: toBranch.name,
          ingredientId: srcIng.id,
          ingredientName: srcIng.name,
          quantity: params.quantityUnits,
          unit: srcIng.consumptionUnit,
          status: 'received',
          requestedBy: actor,
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        },
        ...prev,
      ],
      toBranch.id
    );
    updateBranchSlice(
      'notifications',
      (prev) => [
        {
          id: `notif-hq-trf-${Date.now()}`,
          title: `HQ Stock Transfer Received (${transferNum})`,
          message: `Main HQ transferred ${params.quantityUnits.toLocaleString()} ${srcIng.consumptionUnit} of ${srcIng.name} from ${fromBranch.branchCode} to ${toBranch.branchCode}.`,
          type: 'transfer',
          timestamp: new Date().toISOString(),
          read: false,
          actionRole: 'manager',
          actionLabel: 'Inspect Inventory',
        },
        ...prev,
      ],
      toBranch.id
    );

    enqueueApiSync(
      () => apiClient.hq.dispatchBranchTransfer(currentOrganization.id, { ...params, actor }),
      'hqDispatchBranchTransfer'
    );
    return {
      success: true,
      message: `Dispatched ${params.quantityUnits.toLocaleString()} ${srcIng.consumptionUnit} of ${srcIng.name} from ${fromBranch.branchCode} to ${toBranch.branchCode}.`,
    };
  };

  const hqUpdatePurchaseRequestStatus = (
    branchId: string,
    requestId: string,
    nextStatus: PurchaseRequest['status']
  ) => {
    const targetBranch = tenants.find((b) => b.id === branchId);
    if (!targetBranch) return;
    const req = branchStores[branchId]?.purchaseRequests.find((p) => p.id === requestId);
    if (!req) return;

    updateBranchSlice(
      'purchaseRequests',
      (prev) => prev.map((p) => (p.id === requestId ? { ...p, status: nextStatus } : p)),
      branchId
    );
    if (nextStatus === 'received') {
      updateBranchSlice(
        'ingredients',
        (prev) =>
          prev.map((i) =>
            i.id === req.ingredientId
              ? {
                  ...i,
                  storeStockUnits: i.storeStockUnits + req.requestedQty,
                  currentStockUnits: i.currentStockUnits + req.requestedQty,
                }
              : i
          ),
        branchId
      );
    }
    enqueueApiSync(
      () =>
        apiClient.hq.updatePurchaseRequestStatus(
          currentOrganization.id,
          branchId,
          requestId,
          nextStatus
        ),
      'hqUpdatePurchaseRequestStatus'
    );
  };

  const currentBranchQuota = useMemo(() => {
    const used = tenants.length;
    const max = currentOrganization.maxBranches || 1;
    return {
      used,
      max,
      remaining: Math.max(0, max - used),
      isAtLimit: used >= max,
    };
  }, [tenants.length, currentOrganization.maxBranches]);

  const addBranchToCurrentOrg = (params: {
    name: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    email: string;
    managerName: string;
    address: string;
    cloneCatalogFromCurrent?: boolean;
  }): RestaurantTenant | null => {
    if (tenants.length >= currentOrganization.maxBranches) {
      return null;
    }
    const cleanCode = params.branchCode.trim().toUpperCase() || `BR-${tenants.length + 1}`;
    const slug = params.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const branchId = `branch-${currentOrganization.slug}-${Date.now()}`;
    const branchEmail =
      params.email.trim() || `${cleanCode.toLowerCase()}@${currentOrganization.domain}`;
    const newBranch: RestaurantTenant = {
      id: branchId,
      organizationId: currentOrganization.id,
      branchCode: cleanCode,
      isHqBranch: false,
      status: 'active',
      name: params.name.trim(),
      slug,
      tagline: `${currentOrganization.name} · ${params.name.trim()}`,
      operatingModel: params.operatingModel,
      phone: params.phone.trim() || '+255 700 000 000',
      email: branchEmail,
      managerName: params.managerName.trim() || 'Branch Manager',
      managerEmail: branchEmail,
      address: params.address.trim() || 'Dar es Salaam, Tanzania',
      operatingHours: '09:00 AM – 11:00 PM (Daily)',
      logo: currentOrganization.logo,
      bannerImage: currentTenant.bannerImage,
      currency: currentOrganization.currency,
      currencyRate: currentOrganization.currencyRate,
      taxRate: 0.18,
      deliveryFee: 4000,
    };

    const starterStore = createStarterBranchStore(
      newBranch,
      currentOrganization,
      params.cloneCatalogFromCurrent !== false ? activeStore : undefined
    );
    setAllBranches((prev) => [...prev, newBranch]);
    setBranchStores((prev) => ({ ...prev, [branchId]: starterStore }));
    enqueueApiSync(
      () =>
        apiClient.hq.createBranch(currentOrganization.id, {
          ...params,
          id: branchId,
          sourceBranchId: params.cloneCatalogFromCurrent !== false ? activeBranchId : undefined,
        }),
      'addBranchToCurrentOrg'
    );
    return newBranch;
  };

  const toggleBranchStatus = (branchId: string) => {
    setAllBranches((prev) =>
      prev.map((b) =>
        b.id === branchId && b.organizationId === currentOrganization.id
          ? { ...b, status: b.status === 'active' ? 'maintenance' : 'active' }
          : b
      )
    );
    enqueueApiSync(
      () => apiClient.hq.toggleBranchStatus(currentOrganization.id, branchId),
      'toggleBranchStatus'
    );
  };

  const applyCreateSaasTenantLocal = (params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    branchName: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    address: string;
    plan?: SaasPlanId;
    status?: SaasTenantStatus;
    password?: string;
    switchToNew?: boolean;
  }) => {
    const slug = params.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'tenant';
    const domain = `${slug.replace(/-/g, '')}.co.tz`;
    const orgId = `org-${slug}-${Date.now()}`;
    const chosenPlan =
      saasPlans.find((p) => p.id === (params.plan || 'Enterprise Multi-Branch') || p.name === params.plan) ||
      saasPlans[saasPlans.length - 1] ||
      SAAS_PLANS[2];
    const nextMonth = new Date(
      Date.now() + (params.status === 'trial' ? chosenPlan.trialDays : 30) * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

    const newOrg: SaasOrganization = {
      id: orgId,
      name: params.orgName.trim(),
      slug,
      plan: chosenPlan.id,
      status: params.status || 'active',
      monthlyFeeTzs: chosenPlan.monthlyFeeTzs,
      maxBranches: chosenPlan.maxBranches,
      billingStatus: params.status === 'trial' ? 'pending' : 'paid',
      nextBillingDate: nextMonth,
      country: 'Tanzania',
      ownerName: params.ownerName.trim() || 'Tenant Owner',
      ownerEmail: params.ownerEmail.trim() || `owner@${domain}`,
      hqEmail: `hq@${domain}`,
      domain,
      logo: '🏢',
      currency: 'TZS',
      currencyRate: 2600,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const branchId = `branch-${slug}-hq-${Date.now()}`;
    const branchCode = params.branchCode.trim().toUpperCase() || 'HQ-01';
    const hqBranch: RestaurantTenant = {
      id: branchId,
      organizationId: orgId,
      branchCode,
      isHqBranch: true,
      status: 'active',
      name: params.branchName.trim() || `${params.orgName.trim()} — Main HQ`,
      slug: `${slug}-hq`,
      tagline: `${params.orgName.trim()} Flagship Location`,
      operatingModel: params.operatingModel,
      phone: params.phone.trim() || '+255 700 000 000',
      email: `hq@${domain}`,
      managerName: newOrg.ownerName,
      managerEmail: newOrg.ownerEmail,
      address: params.address.trim() || 'Dar es Salaam, Tanzania',
      operatingHours: '08:00 AM – 11:00 PM (Daily)',
      logo: '🏢',
      bannerImage: '/src/assets/images/hero_restaurant_dining_1794223268333.jpg',
      currency: 'TZS',
      currencyRate: 2600,
      taxRate: 0.18,
      deliveryFee: 4000,
    };
    const starterStore = createStarterBranchStore(hqBranch, newOrg);

    setOrganizations((prev) => [...prev, newOrg]);
    setAllBranches((prev) => [...prev, hqBranch]);
    setBranchStores((prev) => ({ ...prev, [branchId]: starterStore }));

    const newOwnerAccount: SaasAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newOrg.ownerName,
      email: newOrg.ownerEmail,
      password: params.password || 'tenant123',
      role: 'tenant_owner',
      status: 'active',
      organizationId: orgId,
      phone: params.phone.trim() || '+255 700 000 000',
      lastLoginAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSaasAccounts((prev) => {
      if (prev.some((a) => a.email.toLowerCase() === newOwnerAccount.email.toLowerCase())) {
        return prev;
      }
      return [newOwnerAccount, ...prev];
    });

    if (params.switchToNew !== false) {
      setCurrentOrganizationIdState(orgId);
      setCurrentBranchIdState(branchId);
      setViewScopeState('branch');
      setActiveWaiterId('');
      setActiveReferralCode(null);
      setSoundAlertTriggered(false);
      setWorkspaceRevision((r) => r + 1);
    }
    return { org: newOrg, branch: hqBranch, account: newOwnerAccount };
  };

  const createSaasTenant = (params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    branchName: string;
    branchCode: string;
    operatingModel: RestaurantTenant['operatingModel'];
    phone: string;
    address: string;
    plan?: SaasPlanId;
    status?: SaasTenantStatus;
    password?: string;
    switchToNew?: boolean;
  }) => {
    const created = applyCreateSaasTenantLocal(params);
    enqueueApiSync(
      () =>
        apiClient.provider.createTenant({
          ...params,
          orgId: created.org.id,
          branchId: created.branch.id,
          accountId: created.account.id,
        }),
      'createSaasTenant'
    );
    return created;
  };

  // ============== SAAS PROVIDER CONTROL, AUTH & LANDING ACTIONS ==============
  const recordProviderAudit = (action: string, target: string, details: string) => {
    const actor = authenticatedAccount || {
      name: 'System Provider Admin',
      email: 'provider@restaurantos.io',
    };
    setProviderAuditLogs((prev) => [
      {
        id: `paud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        actorName: actor.name,
        actorEmail: actor.email,
        action,
        target,
        details,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      },
      ...prev,
    ]);
  };

  const providerTenantSummaries = useMemo(
    () =>
      computeProviderTenantSummariesPure(
        organizations,
        allBranches,
        branchStores,
        saasAccounts
      ),
    [organizations, allBranches, branchStores, saasAccounts]
  );

  const providerStats = useMemo(
    () =>
      computeProviderStatsPure(
        organizations,
        allBranches,
        saasAccounts,
        leadInquiries,
        providerTenantSummaries
      ),
    [organizations, allBranches, saasAccounts, providerTenantSummaries, leadInquiries]
  );

  const loginWithCredentials = (
    email: string,
    password: string
  ): { success: boolean; error?: string; account?: SaasAccount } => {
    const cleanEmail = email.trim().toLowerCase();
    const account = saasAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (!account || account.password !== password) {
      return { success: false, error: 'Invalid email address or password.' };
    }
    if (account.status === 'pending') {
      return {
        success: false,
        error: 'Account is awaiting System Provider activation. Sign in as System Provider to approve this account.',
      };
    }
    if (account.status === 'suspended') {
      return {
        success: false,
        error: 'This user account has been suspended by the System Provider.',
      };
    }

    const nowLabel = new Date().toISOString().slice(0, 16).replace('T', ' ');

    if (account.role === 'provider_admin') {
      const updated = { ...account, lastLoginAt: nowLabel };
      setSaasAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
      setAuthenticatedAccount(updated);
      setImpersonatingOrgId(null);
      setPlatformSurface('provider');
      enqueueApiSync(() => apiClient.auth.login(cleanEmail, password), 'loginWithCredentials');
      return { success: true, account: updated };
    }

    const targetOrg = organizations.find((o) => o.id === account.organizationId);
    if (!targetOrg) {
      return { success: false, error: 'No tenant organization is linked to this account.' };
    }
    if (targetOrg.status === 'suspended') {
      return {
        success: false,
        error: `${targetOrg.name} subscription is currently suspended by System Provider. Reactivate tenant in Provider Control.`,
      };
    }

    const updated = { ...account, lastLoginAt: nowLabel };
    setSaasAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
    setAuthenticatedAccount(updated);
    setImpersonatingOrgId(null);
    setCurrentOrganizationIdState(targetOrg.id);

    const orgBranches = allBranches.filter((b) => b.organizationId === targetOrg.id);
    const preferredBranch =
      (account.branchId && orgBranches.find((b) => b.id === account.branchId)) ||
      orgBranches.find((b) => b.isHqBranch) ||
      orgBranches[0];

    if (preferredBranch) {
      setCurrentBranchIdState(preferredBranch.id);
      const brWaiters = branchStores[preferredBranch.id]?.waiters || [];
      setActiveWaiterId(brWaiters[0]?.id || '');
      setActiveReferralCode(brWaiters[0]?.referralCode || null);
    }

    if (account.role === 'tenant_owner') {
      setViewScopeState(orgBranches.length > 1 ? 'hq_overview' : 'branch');
      setActiveRole('owner');
    } else {
      setViewScopeState('branch');
      setActiveRole('cashier');
    }
    setWorkspaceRevision((r) => r + 1);
    setPlatformSurface('erp');
    enqueueApiSync(() => apiClient.auth.login(cleanEmail, password), 'loginWithCredentials');
    return { success: true, account: updated };
  };

  const registerTenantAccount = (params: {
    orgName: string;
    ownerName: string;
    ownerEmail: string;
    password: string;
    plan: SaasPlanId;
    operatingModel: RestaurantTenant['operatingModel'];
    branchName: string;
    branchCode: string;
    phone: string;
    address: string;
  }): { success: boolean; error?: string } => {
    const cleanEmail = params.ownerEmail.trim().toLowerCase();
    if (!cleanEmail || !params.orgName.trim() || !params.ownerName.trim() || params.password.length < 4) {
      return { success: false, error: 'Complete all required fields (password minimum 4 characters).' };
    }
    if (saasAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'An account with this email already exists. Please sign in instead.' };
    }

    const created = applyCreateSaasTenantLocal({
      orgName: params.orgName,
      ownerName: params.ownerName,
      ownerEmail: cleanEmail,
      branchName: params.branchName,
      branchCode: params.branchCode,
      operatingModel: params.operatingModel,
      phone: params.phone,
      address: params.address,
      plan: params.plan,
      status: 'trial',
      password: params.password,
      switchToNew: true,
    });

    setAuthenticatedAccount(created.account);
    setImpersonatingOrgId(null);
    setActiveRole('owner');
    setViewScopeState('branch');
    setProviderAuditLogs((prev) => [
      {
        id: `paud-reg-${Date.now()}`,
        actorName: created.account.name,
        actorEmail: created.account.email,
        action: 'TENANT_SELF_REGISTERED',
        target: `${created.org.name} (${created.org.plan})`,
        details: `Self-onboarded 14-day trial with flagship branch ${created.branch.branchCode}.`,
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      },
      ...prev,
    ]);
    setPlatformSurface('erp');
    enqueueApiSync(
      () =>
        apiClient.auth.register({
          ...params,
          ownerEmail: cleanEmail,
          orgId: created.org.id,
          branchId: created.branch.id,
          accountId: created.account.id,
        }),
      'registerTenantAccount'
    );
    return { success: true };
  };

  const quickLaunchWorkspace = (preset: 'provider' | 'savanna_hq' | 'kona_hq' | 'cashier_pos') => {
    setImpersonatingOrgId(null);
    if (preset === 'provider') {
      const prov = saasAccounts.find((a) => a.role === 'provider_admin') || saasAccounts[0];
      setAuthenticatedAccount(prov);
      setPlatformSurface('provider');
      enqueueApiSync(() => apiClient.auth.quickLaunch(preset), 'quickLaunchWorkspace');
      return;
    }
    if (preset === 'kona_hq') {
      const konaAcc = saasAccounts.find((a) => a.organizationId === 'org-kona') || saasAccounts[3];
      setAuthenticatedAccount(konaAcc);
      setCurrentOrganizationId('org-kona');
      setViewScopeState('hq_overview');
      setActiveRole('owner');
      setPlatformSurface('erp');
      enqueueApiSync(() => apiClient.auth.quickLaunch(preset), 'quickLaunchWorkspace');
      return;
    }
    const savAcc = saasAccounts.find((a) => a.organizationId === 'org-savanna' && a.role === 'tenant_owner') || saasAccounts[1];
    setAuthenticatedAccount(savAcc);
    setCurrentOrganizationId('org-savanna');
    if (preset === 'cashier_pos') {
      setViewScopeState('branch');
      setActiveRole('cashier');
    } else {
      setViewScopeState('hq_overview');
      setActiveRole('owner');
    }
    setPlatformSurface('erp');
    enqueueApiSync(() => apiClient.auth.quickLaunch(preset), 'quickLaunchWorkspace');
  };

  const logoutAccount = () => {
    setAuthenticatedAccount(null);
    setImpersonatingOrgId(null);
    setPlatformSurface('login');
    enqueueApiSync(() => apiClient.auth.logout(), 'logoutAccount');
  };

  const providerUpdateTenantStatus = (orgId: string, status: SaasTenantStatus) => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) return;
    setOrganizations((prev) => prev.map((o) => (o.id === orgId ? { ...o, status } : o)));
    recordProviderAudit('TENANT_STATUS_CHANGED', target.name, `Set subscription status to ${status.toUpperCase()}.`);
    enqueueApiSync(() => apiClient.provider.updateTenantStatus(orgId, status), 'providerUpdateTenantStatus');
  };

  const providerUpdateTenantPlan = (orgId: string, plan: SaasPlanId) => {
    const target = organizations.find((o) => o.id === orgId);
    const planDef = saasPlans.find((p) => p.id === plan || p.name === plan);
    if (!target || !planDef) return;
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? {
              ...o,
              plan: planDef.id,
              monthlyFeeTzs: planDef.monthlyFeeTzs,
              maxBranches: planDef.maxBranches,
            }
          : o
      )
    );
    recordProviderAudit(
      'TENANT_PLAN_UPDATED',
      target.name,
      `Switched package to ${planDef.name} (quota: ${planDef.maxBranches} branches, fee: TZS ${planDef.monthlyFeeTzs.toLocaleString()}/mo).`
    );
    enqueueApiSync(() => apiClient.provider.updateTenantPlan(orgId, plan), 'providerUpdateTenantPlan');
  };

  const providerCreatePlan = (params: {
    name: string;
    tagline: string;
    audience: string;
    monthlyFeeTzs: number;
    annualDiscountPct: number;
    trialDays: number;
    maxBranches: number;
    maxStaffSeats: number;
    maxRecipes: number;
    includedModules: string[];
    summary: string;
    isFeatured?: boolean;
    isPublic?: boolean;
  }): { success: boolean; error?: string; plan?: SaasPlanDefinition } => {
    const cleanName = params.name.trim();
    if (!cleanName || params.monthlyFeeTzs < 0 || params.maxBranches < 1) {
      return { success: false, error: 'Provide package name, valid monthly fee, and minimum 1 branch quota.' };
    }
    if (saasPlans.some((p) => p.id.toLowerCase() === cleanName.toLowerCase() || p.name.toLowerCase() === cleanName.toLowerCase())) {
      return { success: false, error: `A package named "${cleanName}" already exists.` };
    }
    const newPlan: SaasPlanDefinition = {
      id: cleanName,
      name: cleanName,
      tagline: params.tagline.trim() || `${cleanName} Hospitality Package`,
      audience: params.audience.trim() || 'For growing hospitality operations',
      monthlyFeeTzs: Math.round(params.monthlyFeeTzs),
      annualDiscountPct: Math.min(50, Math.max(0, Math.round(params.annualDiscountPct))),
      trialDays: Math.max(0, Math.round(params.trialDays)),
      maxBranches: Math.max(1, Math.round(params.maxBranches)),
      maxStaffSeats: Math.max(1, Math.round(params.maxStaffSeats)),
      maxRecipes: Math.max(10, Math.round(params.maxRecipes)),
      includedModules: params.includedModules.length > 0 ? params.includedModules : ['Cashier POS & Split Payments', 'Kitchen Display System (KDS)'],
      summary: params.summary.trim() || 'Custom provider-managed SaaS hospitality package.',
      isFeatured: Boolean(params.isFeatured),
      isPublic: params.isPublic !== false,
      status: 'active',
    };
    setSaasPlans((prev) => {
      const base = newPlan.isFeatured ? prev.map((p) => ({ ...p, isFeatured: false })) : prev;
      return [...base, newPlan];
    });
    recordProviderAudit(
      'PACKAGE_CREATED',
      newPlan.name,
      `Published ${newPlan.name} (TZS ${newPlan.monthlyFeeTzs.toLocaleString()}/mo · ${newPlan.maxBranches} branches · ${newPlan.isPublic ? 'Visible on Landing' : 'Private'}).`
    );
    enqueueApiSync(() => apiClient.provider.createPlan(params), 'providerCreatePlan');
    return { success: true, plan: newPlan };
  };

  const providerUpdatePlan = (planId: string, patch: Partial<SaasPlanDefinition>) => {
    const currentPlan = saasPlans.find((p) => p.id === planId);
    if (!currentPlan) return;
    const updatedPlan: SaasPlanDefinition = {
      ...currentPlan,
      ...patch,
      id: currentPlan.id,
    };
    setSaasPlans((prev) =>
      prev.map((p) => {
        if (p.id === planId) return updatedPlan;
        if (patch.isFeatured) return { ...p, isFeatured: false };
        return p;
      })
    );
    if (patch.monthlyFeeTzs !== undefined || patch.maxBranches !== undefined) {
      setOrganizations((prev) =>
        prev.map((o) =>
          o.plan === planId
            ? {
                ...o,
                monthlyFeeTzs: updatedPlan.monthlyFeeTzs,
                maxBranches: updatedPlan.maxBranches,
              }
            : o
        )
      );
    }
    recordProviderAudit(
      'PACKAGE_UPDATED',
      updatedPlan.name,
      `Updated fee TZS ${updatedPlan.monthlyFeeTzs.toLocaleString()}/mo, branch quota ${updatedPlan.maxBranches}, seats ${updatedPlan.maxStaffSeats}, landing visibility: ${updatedPlan.isPublic ? 'PUBLIC' : 'HIDDEN'}.`
    );
    enqueueApiSync(() => apiClient.provider.updatePlan(planId, patch), 'providerUpdatePlan');
  };

  const providerTogglePlanVisibility = (planId: string) => {
    const target = saasPlans.find((p) => p.id === planId);
    if (!target) return;
    const nextPublic = !target.isPublic;
    setSaasPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, isPublic: nextPublic } : p)));
    recordProviderAudit(
      'PACKAGE_VISIBILITY_CHANGED',
      target.name,
      `${nextPublic ? 'Published' : 'Hidden'} package on Public Landing Page & Self-Registration.`
    );
    enqueueApiSync(() => apiClient.provider.togglePlanVisibility(planId), 'providerTogglePlanVisibility');
  };

  const providerTogglePlanStatus = (planId: string) => {
    const target = saasPlans.find((p) => p.id === planId);
    if (!target) return;
    const nextStatus = target.status === 'active' ? 'archived' : 'active';
    setSaasPlans((prev) =>
      prev.map((p) =>
        p.id === planId
          ? { ...p, status: nextStatus, isPublic: nextStatus === 'active' ? p.isPublic : false }
          : p
      )
    );
    recordProviderAudit('PACKAGE_STATUS_CHANGED', target.name, `Set package lifecycle status to ${nextStatus.toUpperCase()}.`);
    enqueueApiSync(() => apiClient.provider.togglePlanStatus(planId), 'providerTogglePlanStatus');
  };

  const providerMarkBillingPaid = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) return;
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? { ...o, billingStatus: 'paid', status: o.status === 'suspended' ? 'active' : o.status, nextBillingDate: nextMonth }
          : o
      )
    );
    recordProviderAudit('BILLING_VERIFIED', target.name, `Marked monthly subscription invoice settled (next cycle ${nextMonth}).`);
    enqueueApiSync(() => apiClient.provider.markBillingPaid(orgId), 'providerMarkBillingPaid');
  };

  const providerInspectTenant = (orgId: string) => {
    const target = organizations.find((o) => o.id === orgId);
    if (!target) return;
    setCurrentOrganizationId(orgId);
    setViewScopeState('hq_overview');
    setActiveRole('owner');
    setImpersonatingOrgId(orgId);
    setPlatformSurface('erp');
    recordProviderAudit('TENANT_IMPERSONATION_STARTED', target.name, 'System Provider entered tenant Main HQ for live inspection.');
    enqueueApiSync(() => apiClient.provider.inspectTenant(orgId), 'providerInspectTenant');
  };

  const providerExitInspection = () => {
    setImpersonatingOrgId(null);
    setPlatformSurface('provider');
  };

  const providerCreateAccount = (params: {
    name: string;
    email: string;
    password: string;
    role: SaasAccountRole;
    status?: SaasAccountStatus;
    organizationId?: string;
    branchId?: string;
    phone?: string;
  }): { success: boolean; error?: string; account?: SaasAccount } => {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanName || params.password.length < 4) {
      return { success: false, error: 'Provide full name, valid email address, and password (min 4 chars).' };
    }
    if (saasAccounts.some((a) => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Email already registered on platform.' };
    }
    let resolvedOrgId: string | undefined;
    let resolvedBranchId: string | undefined;
    if (params.role !== 'provider_admin') {
      resolvedOrgId = params.organizationId || organizations[0]?.id;
      if (!resolvedOrgId || !organizations.some((o) => o.id === resolvedOrgId)) {
        return { success: false, error: 'Select a valid tenant organization.' };
      }
      if (params.role === 'branch_manager') {
        const orgBranches = allBranches.filter((b) => b.organizationId === resolvedOrgId);
        const branch = params.branchId
          ? orgBranches.find((b) => b.id === params.branchId)
          : orgBranches[0];
        if (params.branchId && !branch) {
          return { success: false, error: 'Selected branch does not belong to the chosen organization.' };
        }
        resolvedBranchId = branch?.id;
      }
    }
    const initialStatus: SaasAccountStatus = params.status || 'active';
    const newAcc: SaasAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      password: params.password,
      role: params.role,
      status: initialStatus,
      organizationId: resolvedOrgId,
      branchId: resolvedBranchId,
      phone: params.phone?.trim() || undefined,
      lastLoginAt: 'Never',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSaasAccounts((prev) => [newAcc, ...prev]);
    recordProviderAudit(
      'ACCOUNT_CREATED',
      cleanEmail,
      `Created ${initialStatus.toUpperCase()} ${params.role} account for ${cleanName}.`
    );
    enqueueApiSync(
      () =>
        apiClient.provider.createAccount({
          ...params,
          id: newAcc.id,
          status: initialStatus,
          organizationId: resolvedOrgId,
          branchId: resolvedBranchId,
        }),
      'providerCreateAccount'
    );
    return { success: true, account: newAcc };
  };

  const providerUpdateAccount = (
    accountId: string,
    patch: {
      name?: string;
      email?: string;
      phone?: string;
      role?: SaasAccountRole;
      status?: SaasAccountStatus;
      organizationId?: string;
      branchId?: string;
    }
  ): { success: boolean; error?: string; account?: SaasAccount } => {
    const acc = saasAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, error: 'Account not found.' };

    const nextRole = patch.role ?? acc.role;
    const nextStatus = patch.status ?? acc.status;

    if (
      acc.role === 'provider_admin' &&
      acc.status === 'active' &&
      (nextRole !== 'provider_admin' || nextStatus !== 'active')
    ) {
      const otherActiveProviders = saasAccounts.filter(
        (a) => a.id !== acc.id && a.role === 'provider_admin' && a.status === 'active'
      );
      if (otherActiveProviders.length === 0) {
        return {
          success: false,
          error: 'Cannot demote or suspend the last active System Provider administrator.',
        };
      }
    }

    const nextName = patch.name !== undefined ? patch.name.trim() : acc.name;
    if (!nextName) {
      return { success: false, error: 'Account holder name cannot be empty.' };
    }

    const nextEmail = patch.email !== undefined ? patch.email.trim().toLowerCase() : acc.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return { success: false, error: 'Provide a valid email address.' };
    }
    if (saasAccounts.some((a) => a.id !== acc.id && a.email.toLowerCase() === nextEmail)) {
      return { success: false, error: 'Another account already uses this email address.' };
    }

    const nextPhone = patch.phone !== undefined ? patch.phone.trim() || undefined : acc.phone;

    let nextOrgId: string | undefined;
    let nextBranchId: string | undefined;
    if (nextRole !== 'provider_admin') {
      const candidateOrgId =
        patch.organizationId !== undefined
          ? patch.organizationId || undefined
          : acc.organizationId || organizations[0]?.id;
      if (candidateOrgId) {
        if (!organizations.some((o) => o.id === candidateOrgId)) {
          return { success: false, error: 'Selected organization does not exist.' };
        }
        nextOrgId = candidateOrgId;
        if (nextRole === 'branch_manager') {
          const orgBranches = allBranches.filter((b) => b.organizationId === candidateOrgId);
          const candidateBranchId = patch.branchId !== undefined ? patch.branchId : acc.branchId;
          const matchedBranch = candidateBranchId
            ? orgBranches.find((b) => b.id === candidateBranchId)
            : orgBranches[0];
          if (candidateBranchId && !matchedBranch) {
            return { success: false, error: 'Selected branch does not belong to the chosen organization.' };
          }
          nextBranchId = matchedBranch?.id;
        }
      }
    }

    const updated: SaasAccount = {
      ...acc,
      name: nextName,
      email: nextEmail,
      phone: nextPhone,
      role: nextRole,
      status: nextStatus,
      organizationId: nextOrgId,
      branchId: nextBranchId,
    };

    setSaasAccounts((prev) => prev.map((a) => (a.id === accountId ? updated : a)));
    if (authenticatedAccount?.id === accountId) {
      setAuthenticatedAccount(updated);
    }
    recordProviderAudit(
      'ACCOUNT_UPDATED',
      updated.email,
      `Updated profile/access: role=${updated.role}, status=${updated.status.toUpperCase()}${
        updated.organizationId ? `, org=${updated.organizationId}` : ', scope=GLOBAL'
      }${updated.branchId ? `, branch=${updated.branchId}` : ''}.`
    );
    enqueueApiSync(
      () =>
        apiClient.provider.updateAccount(accountId, {
          name: updated.name,
          email: updated.email,
          phone: updated.phone ?? '',
          role: updated.role,
          status: updated.status,
          organizationId: updated.organizationId,
          branchId: updated.branchId,
        }),
      'providerUpdateAccount'
    );
    return { success: true, account: updated };
  };

  const providerUpdateAccountStatus = (
    accountId: string,
    status: SaasAccountStatus
  ): { success: boolean; error?: string } => {
    const acc = saasAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, error: 'Account not found.' };
    if (authenticatedAccount?.id === accountId && status !== 'active') {
      return { success: false, error: 'You cannot suspend your own active session.' };
    }
    if (acc.role === 'provider_admin' && acc.status === 'active' && status !== 'active') {
      const otherActiveProviders = saasAccounts.filter(
        (a) => a.id !== acc.id && a.role === 'provider_admin' && a.status === 'active'
      );
      if (otherActiveProviders.length === 0) {
        return {
          success: false,
          error: 'Cannot suspend the last active System Provider administrator.',
        };
      }
    }
    setSaasAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, status } : a)));
    recordProviderAudit('ACCOUNT_STATUS_CHANGED', acc.email, `Set user account status to ${status.toUpperCase()}.`);
    enqueueApiSync(
      () => apiClient.provider.updateAccountStatus(accountId, status),
      'providerUpdateAccountStatus'
    );
    return { success: true };
  };

  const providerUpdateAccountRole = (
    accountId: string,
    role: SaasAccountRole,
    scope?: { organizationId?: string; branchId?: string }
  ): { success: boolean; error?: string } => {
    const res = providerUpdateAccount(accountId, {
      role,
      organizationId: scope?.organizationId,
      branchId: scope?.branchId,
    });
    return { success: res.success, error: res.error };
  };

  const providerResetAccountPassword = (
    accountId: string,
    newPassword: string
  ): { success: boolean; error?: string } => {
    const acc = saasAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, error: 'Account not found.' };
    if (newPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    setSaasAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, password: newPassword } : a)));
    if (authenticatedAccount?.id === accountId) {
      setAuthenticatedAccount((prev) => (prev ? { ...prev, password: newPassword } : prev));
    }
    recordProviderAudit('ACCOUNT_PASSWORD_RESET', acc.email, 'System Provider issued new account password.');
    enqueueApiSync(
      () => apiClient.provider.resetAccountPassword(accountId, newPassword),
      'providerResetAccountPassword'
    );
    return { success: true };
  };

  const providerDeleteAccount = (accountId: string): { success: boolean; error?: string } => {
    const acc = saasAccounts.find((a) => a.id === accountId);
    if (!acc) return { success: false, error: 'Account not found.' };
    if (authenticatedAccount?.id === accountId) {
      return { success: false, error: 'You cannot delete the currently signed-in account.' };
    }
    if (acc.role === 'provider_admin' && acc.status === 'active') {
      const otherActiveProviders = saasAccounts.filter(
        (a) => a.id !== acc.id && a.role === 'provider_admin' && a.status === 'active'
      );
      if (otherActiveProviders.length === 0) {
        return {
          success: false,
          error: 'Cannot delete the last active System Provider administrator.',
        };
      }
    }
    setSaasAccounts((prev) => prev.filter((a) => a.id !== accountId));
    recordProviderAudit('ACCOUNT_DELETED', acc.email, `Revoked and removed ${acc.role} account (${acc.name}).`);
    enqueueApiSync(() => apiClient.provider.deleteAccount(accountId), 'providerDeleteAccount');
    return { success: true };
  };

  const submitLeadInquiry = (params: {
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
    branchesCount: number;
    planInterest: SaasPlanId;
    notes: string;
  }): PlatformLeadInquiry => {
    const newLead: PlatformLeadInquiry = {
      id: `lead-${Date.now()}`,
      companyName: params.companyName.trim(),
      contactName: params.contactName.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone.trim(),
      branchesCount: Math.max(1, params.branchesCount || 1),
      planInterest: params.planInterest,
      notes: params.notes.trim(),
      status: 'new',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };
    setLeadInquiries((prev) => [newLead, ...prev]);
    enqueueApiSync(
      () => apiClient.public.submitLead({ ...params, id: newLead.id }),
      'submitLeadInquiry'
    );
    return newLead;
  };

  const providerConvertLeadToTenant = (leadId: string): { success: boolean; message: string } => {
    const lead = leadInquiries.find((l) => l.id === leadId);
    if (!lead || lead.status === 'converted') {
      return { success: false, message: 'Lead already converted or not found.' };
    }
    const codePrefix = lead.companyName.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TEN';
    const created = applyCreateSaasTenantLocal({
      orgName: lead.companyName,
      ownerName: lead.contactName,
      ownerEmail: lead.email,
      branchName: `${lead.companyName} — Main HQ`,
      branchCode: `${codePrefix}-HQ`,
      operatingModel: 'dine_in_restaurant',
      phone: lead.phone || '+255 754 000 000',
      address: 'Dar es Salaam, Tanzania',
      plan: lead.planInterest,
      status: 'active',
      switchToNew: false,
    });
    setLeadInquiries((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: 'converted' } : l)));
    recordProviderAudit(
      'LEAD_CONVERTED_TO_TENANT',
      created.org.name,
      `Provisioned active ${created.org.plan} tenant and owner credentials for ${lead.email}.`
    );
    enqueueApiSync(
      () =>
        apiClient.provider.convertLeadToTenant(leadId, {
          orgId: created.org.id,
          branchId: created.branch.id,
          accountId: created.account.id,
        }),
      'providerConvertLeadToTenant'
    );
    return {
      success: true,
      message: `Converted ${lead.companyName} into active Tenant (${created.branch.branchCode}).`,
    };
  };

  // ============== WORKING EMAIL SITE / WORKSPACE (TENANT & BRANCH ISOLATED) ==============
  const emails: EmailMessage[] = useMemo(() => {
    if (viewScope === 'hq_overview') {
      return tenants
        .flatMap((b) => branchStores[b.id]?.emails || [])
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return [...(activeStore.emails || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [viewScope, tenants, branchStores, activeStore.emails]);

  const unreadEmailCount = useMemo(() => {
    return emails.filter((e) => e.folder === 'inbox' && !e.read).length;
  }, [emails]);

  const sendEmail = (params: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    category?: EmailMessage['category'];
    priority?: EmailMessage['priority'];
    broadcastAllBranches?: boolean;
    relatedRef?: string;
  }): EmailMessage => {
    const cleanTo = params.broadcastAllBranches
      ? tenants.map((b) => b.email)
      : params.to.map((e) => e.trim()).filter(Boolean);
    const nowIso = new Date().toISOString();
    const senderBranch = viewScope === 'hq_overview' ? tenants.find((b) => b.isHqBranch) || currentTenant : currentTenant;

    const sentMsg: EmailMessage = {
      id: `mail-sent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      organizationId: currentOrganization.id,
      branchId: senderBranch.id,
      branchName: viewScope === 'hq_overview' ? `${currentOrganization.name} Main HQ` : senderBranch.name,
      fromName: activeOperator.name,
      fromEmail: activeOperator.email,
      to: cleanTo,
      cc: params.cc,
      subject: params.subject.trim(),
      body: params.body.trim(),
      folder: 'sent',
      category: params.category || (viewScope === 'hq_overview' ? 'hq_directive' : 'branch_ops'),
      priority: params.priority || 'normal',
      read: true,
      starred: false,
      timestamp: nowIso,
      relatedRef: params.relatedRef,
    };

    updateBranchSlice('emails', (prev) => [sentMsg, ...prev], senderBranch.id);

    // Deliver intra-tenant copies strictly to matching branches inside currentOrganization ONLY
    const lowerTargets = new Set(cleanTo.map((t) => t.toLowerCase()));
    tenants.forEach((b) => {
      const matchesBranch =
        params.broadcastAllBranches ||
        lowerTargets.has(b.email.toLowerCase()) ||
        lowerTargets.has(b.managerEmail.toLowerCase()) ||
        (b.isHqBranch &&
          (lowerTargets.has(currentOrganization.hqEmail.toLowerCase()) ||
            lowerTargets.has(currentOrganization.ownerEmail.toLowerCase())));

      if (matchesBranch && b.id !== senderBranch.id) {
        const inboxCopy: EmailMessage = {
          ...sentMsg,
          id: `mail-in-${Date.now()}-${b.branchCode}`,
          branchId: b.id,
          branchName: b.name,
          folder: 'inbox',
          read: false,
        };
        updateBranchSlice('emails', (prev) => [inboxCopy, ...prev], b.id);
        updateBranchSlice(
          'notifications',
          (prev) => [
            {
              id: `notif-mail-${Date.now()}-${b.branchCode}`,
              title: `New Email: ${sentMsg.subject}`,
              message: `From ${sentMsg.fromName} (${sentMsg.fromEmail})`,
              type: 'order',
              timestamp: nowIso,
              read: false,
              actionRole: 'owner',
              actionLabel: 'Open Mail',
            },
            ...prev,
          ],
          b.id
        );
      }
    });

    enqueueApiSync(
      () =>
        apiClient.hq.sendEmail(currentOrganization.id, {
          ...params,
          id: sentMsg.id,
          senderBranchId: senderBranch.id,
          fromName: activeOperator.name,
          fromEmail: activeOperator.email,
          isHq: viewScope === 'hq_overview',
        }),
      'sendEmail'
    );
    return sentMsg;
  };

  const markEmailRead = (emailId: string, branchId: string, read: boolean = true) => {
    updateBranchSlice(
      'emails',
      (prev) => prev.map((e) => (e.id === emailId ? { ...e, read } : e)),
      branchId
    );
    enqueueApiSync(
      () => apiClient.hq.markEmailRead(currentOrganization.id, branchId, emailId, read),
      'markEmailRead'
    );
  };

  const toggleEmailStar = (emailId: string, branchId: string) => {
    updateBranchSlice(
      'emails',
      (prev) => prev.map((e) => (e.id === emailId ? { ...e, starred: !e.starred } : e)),
      branchId
    );
    enqueueApiSync(
      () => apiClient.hq.toggleEmailStar(currentOrganization.id, branchId, emailId),
      'toggleEmailStar'
    );
  };

  const deleteEmail = (emailId: string, branchId: string) => {
    updateBranchSlice(
      'emails',
      (prev) => prev.filter((e) => e.id !== emailId),
      branchId
    );
    enqueueApiSync(
      () => apiClient.hq.deleteEmail(currentOrganization.id, branchId, emailId),
      'deleteEmail'
    );
  };

  return (
    <RestaurantContext.Provider
      value={{
        organizations,
        currentOrganization,
        setCurrentOrganizationId,
        createSaasTenant,
        tenants,
        allBranches,
        currentTenant,
        setCurrentTenantId,
        viewScope,
        setViewScope,
        switchToHqOverview,
        workspaceRevision,
        activeOperator,
        addBranchToCurrentOrg,
        toggleBranchStatus,
        branchMetricsSummaries,
        hqAllOrders,
        hqAllApprovals,
        hqAllPurchaseRequests,
        hqAllBranchTransfers,
        hqReviewApproval,
        hqDispatchBranchTransfer,
        hqUpdatePurchaseRequestStatus,
        getBranchIngredients,
        emails,
        unreadEmailCount,
        sendEmail,
        markEmailRead,
        toggleEmailStar,
        deleteEmail,
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
        productionOrders,
        cateringOrders,
        purchaseRequests,
        branchTransfers,
        calculateScaledRequirements,
        updateRecipeStatus,
        createProductionOrder,
        advanceProductionOrderStage,
        cancelProductionOrder,
        resolveShortageViaPurchaseRequest,
        updatePurchaseRequestStatus,
        resolveShortageViaBranchTransfer,
        receiveBranchTransfer,
        createCateringOrder,
        reserveCateringIngredients,
        generateCateringProductionPlan,
        recordCateringFulfillment,
        amendCateringOrder,
        generateCateringInvoice,
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
        platformSurface,
        setPlatformSurface,
        landingPage,
        setLandingPage,
        selectedRegisterPlan,
        setSelectedRegisterPlan,
        saasAccounts,
        authenticatedAccount,
        impersonatingOrgId,
        providerAuditLogs,
        leadInquiries,
        providerTenantSummaries,
        providerStats,
        loginWithCredentials,
        registerTenantAccount,
        quickLaunchWorkspace,
        logoutAccount,
        providerUpdateTenantStatus,
        providerUpdateTenantPlan,
        providerMarkBillingPaid,
        providerInspectTenant,
        providerExitInspection,
        providerCreateAccount,
        providerUpdateAccount,
        providerUpdateAccountStatus,
        providerUpdateAccountRole,
        providerResetAccountPassword,
        providerDeleteAccount,
        currentBranchQuota,
        saasPlans,
        providerCreatePlan,
        providerUpdatePlan,
        providerTogglePlanVisibility,
        providerTogglePlanStatus,
        submitLeadInquiry,
        providerConvertLeadToTenant,
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
