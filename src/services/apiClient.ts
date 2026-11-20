import type {
  AppNotification,
  ApprovalRequest,
  BlockedCookingAttempt,
  BomAuditLog,
  BomDeductionPolicy,
  BranchTransferRequest,
  CateringOrder,
  CateringOrderStatus,
  CommissionMode,
  CommissionPayoutLog,
  DailyReconciliationItem,
  DiscrepancyAlert,
  EmailMessage,
  Employee,
  Ingredient,
  MenuItem,
  MissingStockItem,
  Order,
  OrderItemStatus,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PayrollPaymentRecord,
  PlatformLeadInquiry,
  ProductionLog,
  ProductionModel,
  ProductionOrder,
  ProductionOrderStatus,
  PurchaseRequest,
  Recipe,
  RecipeStatus,
  RestaurantTenant,
  Role,
  SaasAccount,
  SaasAccountRole,
  SaasAccountStatus,
  SaasOrganization,
  SaasPlanDefinition,
  SaasPlanId,
  SaasTenantStatus,
  StockMovement,
  Table,
  Waiter,
} from '../types/restaurant';
import type { BranchCartItem } from '../data/saasSeeds';
import type { PlatformState, ScaledRequirementsResult } from '../shared/types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, detail: string, code = 'API_ERROR', details?: unknown) {
    super(detail);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const API_BASE = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    let payload: { detail?: string; code?: string; errors?: unknown } | undefined;
    try {
      payload = (await res.json()) as { detail?: string; code?: string; errors?: unknown };
    } catch {
      // Ignore non-JSON error bodies
    }
    throw new ApiError(
      res.status,
      payload?.detail || `HTTP ${res.status} (${res.statusText})`,
      payload?.code || 'API_ERROR',
      payload?.errors
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function enc(val: string): string {
  return encodeURIComponent(val);
}

// Sequential persistence queue prevents out-of-order server mutations
let syncQueue: Promise<unknown> = Promise.resolve();

export function enqueueApiSync(task: () => Promise<unknown>, label?: string): Promise<void> {
  syncQueue = syncQueue
    .then(() => task())
    .catch((err) => {
      console.warn(`[RestaurantOS API sync${label ? ` · ${label}` : ''}]`, err);
    });
  return syncQueue as Promise<void>;
}

export const apiClient = {
  system: {
    health: () =>
      request<{
        status: string;
        service: string;
        version: string;
        timestamp: string;
        tenantsCount: number;
        branchesCount: number;
      }>('/health'),
    bootstrap: () => request<PlatformState>('/bootstrap'),
    reset: () => request<{ reset: boolean; state: PlatformState }>('/reset', { method: 'POST' }),
  },

  auth: {
    login: (email: string, password: string) =>
      request<{
        success: boolean;
        account: SaasAccount;
        surface: 'provider' | 'erp';
        organization?: SaasOrganization;
        branchId?: string;
        activeRole?: Role;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (params: {
      orgId?: string;
      branchId?: string;
      accountId?: string;
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
    }) =>
      request<{
        success: boolean;
        org: SaasOrganization;
        branch: RestaurantTenant;
        account: SaasAccount;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    quickLaunch: (preset: 'provider' | 'savanna_hq' | 'kona_hq' | 'cashier_pos') =>
      request<{
        preset: string;
        account: SaasAccount;
        surface: 'provider' | 'erp';
        orgId?: string;
        branchId?: string;
        activeRole?: Role;
        viewScope?: 'branch' | 'hq_overview';
      }>('/auth/quick-launch', {
        method: 'POST',
        body: JSON.stringify({ preset }),
      }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },

  public: {
    listPlans: () => request<SaasPlanDefinition[]>('/public/plans'),
    submitLead: (params: {
      id?: string;
      companyName: string;
      contactName: string;
      email: string;
      phone: string;
      branchesCount: number;
      planInterest: SaasPlanId;
      notes: string;
    }) =>
      request<PlatformLeadInquiry>('/public/leads', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },

  provider: {
    overview: () => request<Record<string, unknown>>('/provider/overview'),
    createTenant: (params: {
      orgId?: string;
      branchId?: string;
      accountId?: string;
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
    }) =>
      request<{ org: SaasOrganization; branch: RestaurantTenant; account: SaasAccount }>(
        '/provider/tenants',
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    updateTenantStatus: (orgId: string, status: SaasTenantStatus) =>
      request<SaasOrganization>(`/provider/tenants/${enc(orgId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateTenantPlan: (orgId: string, plan: SaasPlanId) =>
      request<SaasOrganization>(`/provider/tenants/${enc(orgId)}/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ plan }),
      }),
    markBillingPaid: (orgId: string) =>
      request<SaasOrganization>(`/provider/tenants/${enc(orgId)}/billing-paid`, {
        method: 'POST',
      }),
    inspectTenant: (orgId: string) =>
      request<{ org: SaasOrganization; branches: RestaurantTenant[] }>(
        `/provider/tenants/${enc(orgId)}/inspect`,
        { method: 'POST' }
      ),
    createPlan: (params: Record<string, unknown>) =>
      request<{ success: boolean; plan: SaasPlanDefinition }>('/provider/plans', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    updatePlan: (planId: string, patch: Partial<SaasPlanDefinition>) =>
      request<SaasPlanDefinition>(`/provider/plans/${enc(planId)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    togglePlanVisibility: (planId: string) =>
      request<SaasPlanDefinition>(`/provider/plans/${enc(planId)}/visibility`, { method: 'POST' }),
    togglePlanStatus: (planId: string) =>
      request<SaasPlanDefinition>(`/provider/plans/${enc(planId)}/status`, { method: 'POST' }),
    createAccount: (params: {
      id?: string;
      name: string;
      email: string;
      password: string;
      role: SaasAccountRole;
      organizationId?: string;
      branchId?: string;
      phone?: string;
    }) =>
      request<{ success: boolean; account: SaasAccount }>('/provider/accounts', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    updateAccountStatus: (accountId: string, status: SaasAccountStatus) =>
      request<SaasAccount>(`/provider/accounts/${enc(accountId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    updateAccountRole: (accountId: string, role: SaasAccountRole) =>
      request<SaasAccount>(`/provider/accounts/${enc(accountId)}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    resetAccountPassword: (accountId: string, newPassword: string) =>
      request<SaasAccount>(`/provider/accounts/${enc(accountId)}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword }),
      }),
    convertLeadToTenant: (
      leadId: string,
      ids?: { orgId?: string; branchId?: string; accountId?: string }
    ) =>
      request<{ success: boolean; message: string }>(`/provider/leads/${enc(leadId)}/convert`, {
        method: 'POST',
        body: ids ? JSON.stringify(ids) : undefined,
      }),
  },

  hq: {
    listBranches: (orgId: string) =>
      request<RestaurantTenant[]>(`/orgs/${enc(orgId)}/branches`),
    createBranch: (
      orgId: string,
      params: {
        id?: string;
        name: string;
        branchCode: string;
        operatingModel: RestaurantTenant['operatingModel'];
        phone?: string;
        email?: string;
        managerName?: string;
        address?: string;
        cloneCatalogFromCurrent?: boolean;
        sourceBranchId?: string;
      }
    ) =>
      request<RestaurantTenant>(`/orgs/${enc(orgId)}/branches`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    toggleBranchStatus: (orgId: string, branchId: string) =>
      request<RestaurantTenant>(`/orgs/${enc(orgId)}/branches/${enc(branchId)}/toggle-status`, {
        method: 'POST',
      }),
    overview: (orgId: string) => request<Record<string, unknown>>(`/orgs/${enc(orgId)}/hq/overview`),
    reviewApproval: (
      orgId: string,
      branchId: string,
      requestId: string,
      approve: boolean,
      managerName?: string
    ) =>
      request<ApprovalRequest>(
        `/orgs/${enc(orgId)}/hq/approvals/${enc(branchId)}/${enc(requestId)}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ approve, managerName }),
        }
      ),
    dispatchBranchTransfer: (
      orgId: string,
      params: {
        fromBranchId: string;
        toBranchId: string;
        ingredientId: string;
        quantityUnits: number;
        actor?: string;
      }
    ) =>
      request<{ success: boolean; message: string }>(`/orgs/${enc(orgId)}/hq/transfers`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    updatePurchaseRequestStatus: (
      orgId: string,
      branchId: string,
      requestId: string,
      status: PurchaseRequest['status']
    ) =>
      request<PurchaseRequest>(
        `/orgs/${enc(orgId)}/hq/purchase-requests/${enc(branchId)}/${enc(requestId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),
    listEmails: (orgId: string, branchId?: string) =>
      request<EmailMessage[]>(
        `/orgs/${enc(orgId)}/emails${branchId ? `?branchId=${enc(branchId)}` : ''}`
      ),
    sendEmail: (
      orgId: string,
      params: {
        id?: string;
        senderBranchId?: string;
        fromName?: string;
        fromEmail?: string;
        to: string[];
        cc?: string[];
        subject: string;
        body: string;
        category?: EmailMessage['category'];
        priority?: EmailMessage['priority'];
        broadcastAllBranches?: boolean;
        relatedRef?: string;
        isHq?: boolean;
      }
    ) =>
      request<EmailMessage>(`/orgs/${enc(orgId)}/emails`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    markEmailRead: (orgId: string, branchId: string, emailId: string, read = true) =>
      request<{ success: boolean }>(
        `/orgs/${enc(orgId)}/emails/${enc(branchId)}/${enc(emailId)}/read`,
        {
          method: 'PATCH',
          body: JSON.stringify({ read }),
        }
      ),
    toggleEmailStar: (orgId: string, branchId: string, emailId: string) =>
      request<{ success: boolean }>(
        `/orgs/${enc(orgId)}/emails/${enc(branchId)}/${enc(emailId)}/star`,
        { method: 'POST' }
      ),
    deleteEmail: (orgId: string, branchId: string, emailId: string) =>
      request<{ success: boolean }>(`/orgs/${enc(orgId)}/emails/${enc(branchId)}/${enc(emailId)}`, {
        method: 'DELETE',
      }),
  },

  orders: {
    list: (branchId: string) => request<Order[]>(`/branches/${enc(branchId)}/orders`),
    submit: (
      branchId: string,
      params: {
        id?: string;
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
        customItems?: BranchCartItem[];
        actorName?: string;
        actorRole?: Role;
        activeReferralCode?: string | null;
      }
    ) =>
      request<Order>(`/branches/${enc(branchId)}/orders`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    dispatchDraft: (branchId: string, orderId: string, actorName?: string) =>
      request<Order>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ actorName }),
      }),
    updateStatus: (
      branchId: string,
      orderId: string,
      status: OrderStatus,
      actorName?: string,
      note?: string,
      actorRole?: Role
    ) =>
      request<Order>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, actorName, note, actorRole }),
      }),
    fastForwardToServed: (branchId: string, orderId: string, actorName?: string) =>
      request<{ success: boolean; order: Order }>(
        `/branches/${enc(branchId)}/orders/${enc(orderId)}/fast-forward`,
        {
          method: 'POST',
          body: JSON.stringify({ actorName }),
        }
      ),
    updateItemStatus: (
      branchId: string,
      orderId: string,
      itemIndex: number,
      itemStatus: OrderItemStatus,
      actorName?: string
    ) =>
      request<Order>(
        `/branches/${enc(branchId)}/orders/${enc(orderId)}/items/${itemIndex}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ itemStatus, actorName }),
        }
      ),
    rejectItem: (
      branchId: string,
      orderId: string,
      itemIndex: number,
      kitchenStaff: string,
      reason: string
    ) =>
      request<Order>(
        `/branches/${enc(branchId)}/orders/${enc(orderId)}/items/${itemIndex}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ kitchenStaff, reason }),
        }
      ),
    processPayment: (
      branchId: string,
      orderId: string,
      method: Exclude<PaymentMethod, 'split'>,
      amount: number,
      options?: {
        completeService?: boolean;
        collectedBy?: string;
        transactionRef?: string;
        isRefund?: boolean;
      }
    ) =>
      request<{ order: Order }>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/payments`, {
        method: 'POST',
        body: JSON.stringify({ method, amount, ...(options || {}) }),
      }),
    updateCommission: (
      branchId: string,
      orderId: string,
      mode: CommissionMode,
      value: number,
      configuredBy?: string,
      waiterId?: string
    ) =>
      request<Order>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/commission`, {
        method: 'PATCH',
        body: JSON.stringify({ mode, value, configuredBy, waiterId }),
      }),
    assignWaiter: (branchId: string, orderId: string, waiterId: string) =>
      request<Order>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/waiter`, {
        method: 'PATCH',
        body: JSON.stringify({ waiterId }),
      }),
    cancelControlled: (
      branchId: string,
      orderId: string,
      reason: string,
      actor: string,
      approvedBy?: string
    ) =>
      request<Order>(`/branches/${enc(branchId)}/orders/${enc(orderId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason, actor, approvedBy }),
      }),
    promoteCustomItem: (
      branchId: string,
      orderId: string,
      itemIndex: number,
      category?: string,
      id?: string
    ) =>
      request<MenuItem>(
        `/branches/${enc(branchId)}/orders/${enc(orderId)}/items/${itemIndex}/promote`,
        {
          method: 'POST',
          body: JSON.stringify({ category, id }),
        }
      ),
    requestApproval: (
      branchId: string,
      params: {
        id?: string;
        orderId: string;
        actionType: ApprovalRequest['actionType'];
        requestedBy: string;
        requestedRole: Role;
        details: string;
        amountImpact: number;
        reason: string;
        payload?: ApprovalRequest['payload'];
      }
    ) =>
      request<ApprovalRequest>(`/branches/${enc(branchId)}/approvals`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    reviewApproval: (branchId: string, requestId: string, approve: boolean, managerName?: string) =>
      request<ApprovalRequest>(`/branches/${enc(branchId)}/approvals/${enc(requestId)}/review`, {
        method: 'POST',
        body: JSON.stringify({ approve, managerName }),
      }),
    listDiscrepancies: (branchId: string) =>
      request<DiscrepancyAlert[]>(`/branches/${enc(branchId)}/discrepancies`),
    syncCart: (branchId: string, cart: BranchCartItem[]) =>
      request<BranchCartItem[]>(`/branches/${enc(branchId)}/cart`, {
        method: 'PUT',
        body: JSON.stringify({ cart }),
      }),
    updateSettings: (
      branchId: string,
      patch: {
        taxEnabled?: boolean;
        taxRatePct?: number;
        defaultCommissionMode?: CommissionMode;
        defaultCommissionValue?: number;
        bomDeductionPolicy?: BomDeductionPolicy;
      }
    ) =>
      request<Record<string, unknown>>(`/branches/${enc(branchId)}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    listTables: (branchId: string) => request<Table[]>(`/branches/${enc(branchId)}/tables`),
    addTable: (branchId: string, data: Omit<Table, 'id'> & { id?: string }) =>
      request<Table>(`/branches/${enc(branchId)}/tables`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateTable: (branchId: string, tableId: string, patch: Partial<Table>) =>
      request<Table>(`/branches/${enc(branchId)}/tables/${enc(tableId)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    deleteTable: (branchId: string, tableId: string) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/tables/${enc(tableId)}`, {
        method: 'DELETE',
      }),
    releaseTable: (branchId: string, tableId: string) =>
      request<Table>(`/branches/${enc(branchId)}/tables/${enc(tableId)}/release`, {
        method: 'POST',
      }),
    addNotification: (
      branchId: string,
      notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>
    ) =>
      request<AppNotification>(`/branches/${enc(branchId)}/notifications`, {
        method: 'POST',
        body: JSON.stringify(notification),
      }),
    markNotificationRead: (branchId: string, notificationId: string) =>
      request<AppNotification>(
        `/branches/${enc(branchId)}/notifications/${enc(notificationId)}/read`,
        { method: 'POST' }
      ),
    markAllNotificationsRead: (branchId: string) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/notifications/read-all`, {
        method: 'POST',
      }),
    clearNotification: (branchId: string, notificationId: string) =>
      request<{ success: boolean }>(
        `/branches/${enc(branchId)}/notifications/${enc(notificationId)}`,
        { method: 'DELETE' }
      ),
  },

  menu: {
    list: (branchId: string) => request<MenuItem[]>(`/branches/${enc(branchId)}/menu`),
    add: (branchId: string, item: Omit<MenuItem, 'id'> & { id?: string }) =>
      request<MenuItem>(`/branches/${enc(branchId)}/menu`, {
        method: 'POST',
        body: JSON.stringify(item),
      }),
    update: (branchId: string, itemId: string, patch: Partial<MenuItem>) =>
      request<MenuItem>(`/branches/${enc(branchId)}/menu/${enc(itemId)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    delete: (branchId: string, itemId: string) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/menu/${enc(itemId)}`, {
        method: 'DELETE',
      }),
    toggleAvailability: (branchId: string, itemId: string) =>
      request<MenuItem>(
        `/branches/${enc(branchId)}/menu/${enc(itemId)}/toggle-availability`,
        { method: 'POST' }
      ),
  },

  inventory: {
    overview: (branchId: string) => request<Record<string, unknown>>(`/branches/${enc(branchId)}/inventory`),
    addIngredient: (branchId: string, ing: Omit<Ingredient, 'id'> & { id?: string }) =>
      request<Ingredient>(`/branches/${enc(branchId)}/ingredients`, {
        method: 'POST',
        body: JSON.stringify(ing),
      }),
    updateStock: (branchId: string, ingredientId: string, deltaUnits: number) =>
      request<Ingredient>(`/branches/${enc(branchId)}/ingredients/${enc(ingredientId)}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ deltaUnits }),
      }),
    recordIntake: (
      branchId: string,
      ingredientId: string,
      params: {
        quantityUnits: number;
        cost: number;
        supplier: string;
        invoiceRef: string;
        expiryDate?: string;
      }
    ) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/ingredients/${enc(ingredientId)}/intake`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    recordWastage: (
      branchId: string,
      ingredientId: string,
      params: {
        quantityUnits: number;
        reason: string;
        location?: 'kitchen' | 'main_store';
      }
    ) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/ingredients/${enc(ingredientId)}/wastage`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    recordDirectConsumption: (
      branchId: string,
      ingredientId: string,
      params: {
        quantityUnits: number;
        location: 'kitchen' | 'main_store';
        reason: string;
        recordedBy?: string;
      }
    ) =>
      request<{ success: boolean }>(
        `/branches/${enc(branchId)}/ingredients/${enc(ingredientId)}/direct-consumption`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    transferStock: (
      branchId: string,
      params: {
        id?: string;
        ingredientId: string;
        quantityUnits: number;
        fromLocation: 'main_store' | 'kitchen';
        toLocation: 'main_store' | 'kitchen';
        reason: string;
        shift?: string;
        recordedBy?: string;
        requireKitchenConfirmation?: boolean;
      }
    ) =>
      request<{ success: boolean; movement: StockMovement }>(
        `/branches/${enc(branchId)}/transfers`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    confirmTransfer: (branchId: string, movementId: string, receivedBy?: string) =>
      request<{ success: boolean }>(
        `/branches/${enc(branchId)}/transfers/${enc(movementId)}/confirm`,
        {
          method: 'POST',
          body: JSON.stringify({ receivedBy }),
        }
      ),
    rejectTransfer: (branchId: string, movementId: string, reason?: string) =>
      request<{ success: boolean }>(
        `/branches/${enc(branchId)}/transfers/${enc(movementId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),
    returnAllKitchenStock: (branchId: string, staffName?: string) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/transfers/return-all-kitchen`, {
        method: 'POST',
        body: JSON.stringify({ staffName }),
      }),
    saveRecipe: (
      branchId: string,
      recipe: Recipe,
      auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>
    ) =>
      request<Recipe>(`/branches/${enc(branchId)}/recipes`, {
        method: 'POST',
        body: JSON.stringify({ recipe, auditLog }),
      }),
    deleteRecipe: (branchId: string, recipeId: string) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/recipes/${enc(recipeId)}`, {
        method: 'DELETE',
      }),
    updateRecipeStatus: (
      branchId: string,
      recipeId: string,
      status: RecipeStatus,
      actor?: string,
      note?: string
    ) =>
      request<Recipe>(`/branches/${enc(branchId)}/recipes/${enc(recipeId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, actor, note }),
      }),
    computeRecipeCost: (branchId: string, recipeId: string) =>
      request<{ batchCost: number; unitCost: number; perPlateCost: number }>(
        `/branches/${enc(branchId)}/bom/cost/${enc(recipeId)}`
      ),
    scaleRequirements: (
      branchId: string,
      items: Array<{
        recipeId?: string;
        menuItemId?: string;
        portions: number;
        portionName?: string;
        modifierNames?: string[];
        substituteOverrides?: Record<string, string>;
      }>
    ) =>
      request<ScaledRequirementsResult>(`/branches/${enc(branchId)}/bom/scale`, {
        method: 'POST',
        body: JSON.stringify({ items }),
      }),
    validateBatchProduction: (
      branchId: string,
      recipeId: string,
      batches: number,
      actualInputs?: Record<string, number>
    ) =>
      request<{
        canCook: boolean;
        missingItems: MissingStockItem[];
        totalCost: number;
        targetYieldPlates: number;
      }>(`/branches/${enc(branchId)}/production/validate`, {
        method: 'POST',
        body: JSON.stringify({ recipeId, batches, actualInputs }),
      }),
    cookBatchProduction: (
      branchId: string,
      params: {
        id?: string;
        batchNumber?: string;
        recipeId: string;
        batches: number;
        actualPlatesProduced?: number;
        actualInputs?: Record<string, number>;
        chefName?: string;
        managerOverride?: boolean;
        overrideReason?: string;
      }
    ) =>
      request<{ success: boolean; error?: string; log?: ProductionLog }>(
        `/branches/${enc(branchId)}/production/cook`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      ),
    reverseProductionBatch: (
      branchId: string,
      logId: string,
      reason: string,
      actor?: string
    ) =>
      request<{ success: boolean; error?: string }>(
        `/branches/${enc(branchId)}/production/${enc(logId)}/reverse`,
        {
          method: 'POST',
          body: JSON.stringify({ reason, actor }),
        }
      ),
    handleLeftoverPreparedPlates: (
      branchId: string,
      menuItemId: string,
      platesCount: number,
      action: 'return_to_store' | 'log_as_waste',
      reason?: string
    ) =>
      request<{ success: boolean }>(`/branches/${enc(branchId)}/production/leftovers`, {
        method: 'POST',
        body: JSON.stringify({ menuItemId, platesCount, action, reason }),
      }),
    logBlockedAttempt: (
      branchId: string,
      attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>
    ) =>
      request<BlockedCookingAttempt>(
        `/branches/${enc(branchId)}/production/blocked-attempts`,
        {
          method: 'POST',
          body: JSON.stringify(attempt),
        }
      ),
    requisitionMissing: (
      branchId: string,
      missingItems: MissingStockItem[],
      shift?: string
    ) =>
      request<{ success: boolean }>(
        `/branches/${enc(branchId)}/production/requisition-missing`,
        {
          method: 'POST',
          body: JSON.stringify({ missingItems, shift }),
        }
      ),
    createProductionOrder: (
      branchId: string,
      params: {
        id?: string;
        recipeId: string;
        targetPortions: number;
        sourceType?: ProductionOrder['sourceType'];
        productionModel?: ProductionModel;
        assignedTo?: string;
        scheduledFor?: string;
        cateringOrderId?: string;
        cateringOrderNumber?: string;
        substituteOverrides?: Record<string, string>;
      }
    ) =>
      request<ProductionOrder>(`/branches/${enc(branchId)}/production-orders`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    advanceProductionOrderStage: (
      branchId: string,
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
    ) =>
      request<{ success: boolean; error?: string }>(
        `/branches/${enc(branchId)}/production-orders/${enc(orderId)}/stage`,
        {
          method: 'POST',
          body: JSON.stringify({ nextStage, options }),
        }
      ),
    cancelProductionOrder: (
      branchId: string,
      orderId: string,
      reason: string,
      actor?: string
    ) =>
      request<ProductionOrder>(
        `/branches/${enc(branchId)}/production-orders/${enc(orderId)}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason, actor }),
        }
      ),
    createPurchaseRequest: (
      branchId: string,
      params: {
        id?: string;
        ingredientId: string;
        requestedQty: number;
        reason: string;
        linkedOrderRef?: string;
        requestedBy?: string;
      }
    ) =>
      request<PurchaseRequest>(`/branches/${enc(branchId)}/purchase-requests`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    updatePurchaseRequestStatus: (
      branchId: string,
      requestId: string,
      status: PurchaseRequest['status']
    ) =>
      request<PurchaseRequest>(
        `/branches/${enc(branchId)}/purchase-requests/${enc(requestId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),
    createBranchTransferRequest: (
      branchId: string,
      params: {
        id?: string;
        ingredientId: string;
        quantity: number;
        fromBranch: string;
        requestedBy?: string;
      }
    ) =>
      request<BranchTransferRequest>(`/branches/${enc(branchId)}/branch-transfers`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    receiveBranchTransfer: (branchId: string, transferId: string) =>
      request<BranchTransferRequest>(
        `/branches/${enc(branchId)}/branch-transfers/${enc(transferId)}/receive`,
        { method: 'POST' }
      ),
    createCateringOrder: (
      branchId: string,
      params: {
        id?: string;
        eventName: string;
        eventType: CateringOrder['eventType'];
        customerName: string;
        customerPhone: string;
        siteLocation: string;
        eventDate: string;
        items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>;
        depositPaid?: number;
        notes?: string;
      }
    ) =>
      request<CateringOrder>(`/branches/${enc(branchId)}/catering-orders`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    reserveCateringIngredients: (branchId: string, orderId: string) =>
      request<{ success: boolean; message: string }>(
        `/branches/${enc(branchId)}/catering-orders/${enc(orderId)}/reserve`,
        { method: 'POST' }
      ),
    generateCateringProductionPlan: (branchId: string, orderId: string, poIds?: string[]) =>
      request<ProductionOrder[]>(
        `/branches/${enc(branchId)}/catering-orders/${enc(orderId)}/production-plan`,
        {
          method: 'POST',
          body: poIds ? JSON.stringify({ poIds }) : undefined,
        }
      ),
    recordCateringFulfillment: (
      branchId: string,
      orderId: string,
      fulfilledByMenuId: Record<string, number>,
      nextStatus?: CateringOrderStatus
    ) =>
      request<CateringOrder>(
        `/branches/${enc(branchId)}/catering-orders/${enc(orderId)}/fulfillment`,
        {
          method: 'POST',
          body: JSON.stringify({ fulfilledByMenuId, nextStatus }),
        }
      ),
    amendCateringOrder: (
      branchId: string,
      orderId: string,
      items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>,
      note: string
    ) =>
      request<CateringOrder>(
        `/branches/${enc(branchId)}/catering-orders/${enc(orderId)}/amend`,
        {
          method: 'PATCH',
          body: JSON.stringify({ items, note }),
        }
      ),
    generateCateringInvoice: (branchId: string, orderId: string) =>
      request<{ invoiceNumber: string; order: CateringOrder }>(
        `/branches/${enc(branchId)}/catering-orders/${enc(orderId)}/invoice`,
        { method: 'POST' }
      ),
    recomputeDailyVariance: (branchId: string) =>
      request<DailyReconciliationItem[]>(
        `/branches/${enc(branchId)}/reconciliation/recompute`,
        { method: 'POST' }
      ),
    updateDailyReconciliationCount: (
      branchId: string,
      ingredientId: string,
      actualCount: number,
      notes?: string
    ) =>
      request<DailyReconciliationItem[]>(
        `/branches/${enc(branchId)}/reconciliation/${enc(ingredientId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ actualCount, notes }),
        }
      ),
    commitDailyReconciliation: (branchId: string, staffName?: string) =>
      request<{ success: boolean; totalVarianceCost: number }>(
        `/branches/${enc(branchId)}/reconciliation/commit`,
        {
          method: 'POST',
          body: JSON.stringify({ staffName }),
        }
      ),
  },

  hr: {
    overview: (branchId: string) =>
      request<{
        employees: Employee[];
        waiters: Waiter[];
        commissionPayouts: CommissionPayoutLog[];
        payrollPayments: PayrollPaymentRecord[];
      }>(`/branches/${enc(branchId)}/hr`),
    addEmployee: (
      branchId: string,
      emp: Omit<Employee, 'id' | 'employeeNumber' | 'advances'> & { id?: string; waiterId?: string }
    ) =>
      request<{ employee: Employee; waiter?: Waiter }>(`/branches/${enc(branchId)}/employees`, {
        method: 'POST',
        body: JSON.stringify(emp),
      }),
    updateEmployee: (branchId: string, employeeId: string, updates: Partial<Employee>) =>
      request<Employee>(`/branches/${enc(branchId)}/employees/${enc(employeeId)}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    toggleWaiterActive: (branchId: string, waiterId: string) =>
      request<Waiter>(`/branches/${enc(branchId)}/waiters/${enc(waiterId)}/toggle-active`, {
        method: 'POST',
      }),
    waiterStats: (branchId: string, waiterId: string) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/waiters/${enc(waiterId)}/stats`
      ),
    settleWaiterCommission: (
      branchId: string,
      waiterId: string,
      amount?: number,
      options?: { method?: 'cash' | 'mpesa' | 'bank_transfer'; reference?: string; settledBy?: string }
    ) =>
      request<CommissionPayoutLog | null>(
        `/branches/${enc(branchId)}/waiters/${enc(waiterId)}/settle-commission`,
        {
          method: 'POST',
          body: JSON.stringify({ amount, ...(options || {}) }),
        }
      ),
    addAdvanceRequest: (
      branchId: string,
      employeeId: string,
      amount: number,
      reason: string,
      options?: { id?: string; autoApprove?: boolean; repaymentMonth?: string; approvedBy?: string }
    ) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/employees/${enc(employeeId)}/advances`,
        {
          method: 'POST',
          body: JSON.stringify({ amount, reason, ...(options || {}) }),
        }
      ),
    approveAdvance: (
      branchId: string,
      employeeId: string,
      advanceId: string,
      approvedBy?: string
    ) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/employees/${enc(employeeId)}/advances/${enc(advanceId)}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ approvedBy }),
        }
      ),
    rejectAdvance: (branchId: string, employeeId: string, advanceId: string, reason?: string) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/employees/${enc(employeeId)}/advances/${enc(advanceId)}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),
    markAdvanceRepaid: (branchId: string, employeeId: string, advanceId: string) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/employees/${enc(employeeId)}/advances/${enc(advanceId)}/repay`,
        { method: 'POST' }
      ),
    updateAdvance: (
      branchId: string,
      employeeId: string,
      advanceId: string,
      amount: number,
      reason: string
    ) =>
      request<Record<string, unknown>>(
        `/branches/${enc(branchId)}/employees/${enc(employeeId)}/advances/${enc(advanceId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ amount, reason }),
        }
      ),
    calculatePayroll: (branchId: string, period = '2026-11') =>
      request<Array<Record<string, unknown>>>(
        `/branches/${enc(branchId)}/payroll/calculate?period=${enc(period)}`
      ),
    recordPayrollPayment: (
      branchId: string,
      params: {
        period: string;
        employeeIds: string[];
        method: 'bank_transfer' | 'mpesa' | 'cash';
        referencePrefix?: string;
        paidBy?: string;
      }
    ) =>
      request<PayrollPaymentRecord[]>(`/branches/${enc(branchId)}/payroll/pay`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),
  },
};
