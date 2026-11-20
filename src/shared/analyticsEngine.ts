import type {
  ApprovalRequest,
  BranchMetricsSummary,
  DiscrepancyAlert,
  Order,
  PlatformLeadInquiry,
  RestaurantTenant,
  SaasAccount,
  SaasOrganization,
} from '../types/restaurant.ts';
import type { BranchWorkspaceStore } from '../data/saasSeeds.ts';
import { formatTzs } from './helpers.ts';

export function computeDiscrepanciesPure(
  orders: Order[],
  approvalRequests: ApprovalRequest[],
  formatMoneyFn: (amt: number) => string = formatTzs
): DiscrepancyAlert[] {
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
        detail: `${ord.tableNumber || ord.customerName} · Paid ${formatMoneyFn(ord.paidAmount || 0)} of ${formatMoneyFn(ord.total)}`,
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
}

export function computeBranchMetricsSummaryPure(
  branch: RestaurantTenant,
  store?: BranchWorkspaceStore
): BranchMetricsSummary {
  if (!store) {
    return {
      branch,
      todaySales: 0,
      collectedSales: 0,
      outstandingAmount: 0,
      activeOrdersCount: 0,
      kitchenPendingCount: 0,
      completedOrdersCount: 0,
      tablesTotal: 0,
      tablesOccupied: 0,
      ingredientsCount: 0,
      lowStockCount: 0,
      inventoryValuation: 0,
      employeesCount: 0,
      pendingApprovalsCount: 0,
      openPurchaseRequestsCount: 0,
      unreadEmailsCount: 0,
    };
  }
  const validOrders = store.orders.filter(
    (o) => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'rejected'
  );
  const todaySales = validOrders.reduce((s, o) => s + o.total, 0);
  const collectedSales = validOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
  const outstandingAmount = validOrders.reduce((s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)), 0);
  const kitchenPendingCount = store.orders.filter((o) =>
    ['sent_to_kitchen', 'accepted', 'preparing'].includes(o.status)
  ).length;
  const completedOrdersCount = store.orders.filter(
    (o) => o.status === 'completed' || o.paymentStatus === 'paid'
  ).length;
  const tablesOccupied = store.tables.filter((t) => t.status !== 'available').length;
  const lowStockCount = store.ingredients.filter((i) => i.currentStockUnits <= i.minimumThreshold).length;
  const inventoryValuation = store.ingredients.reduce(
    (s, i) => s + (i.conversionRatio > 0 ? (i.currentStockUnits / i.conversionRatio) * i.costPerPurchaseUnit : 0),
    0
  );
  const pendingApprovalsCount = store.approvalRequests.filter((a) => a.status === 'pending').length;
  const openPurchaseRequestsCount = store.purchaseRequests.filter((p) => p.status !== 'received').length;
  const unreadEmailsCount = store.emails.filter((e) => e.folder === 'inbox' && !e.read).length;

  return {
    branch,
    todaySales,
    collectedSales,
    outstandingAmount,
    activeOrdersCount: validOrders.length,
    kitchenPendingCount,
    completedOrdersCount,
    tablesTotal: store.tables.length,
    tablesOccupied,
    ingredientsCount: store.ingredients.length,
    lowStockCount,
    inventoryValuation: Math.round(inventoryValuation),
    employeesCount: store.employees.length,
    pendingApprovalsCount,
    openPurchaseRequestsCount,
    unreadEmailsCount,
  };
}

export function computeProviderTenantSummariesPure(
  organizations: SaasOrganization[],
  allBranches: RestaurantTenant[],
  branchStores: Record<string, BranchWorkspaceStore>,
  saasAccounts: SaasAccount[]
) {
  return organizations.map((org) => {
    const orgBranches = allBranches.filter((b) => b.organizationId === org.id);
    const activeBranchesCount = orgBranches.filter((b) => b.status === 'active').length;
    let liveOrdersCount = 0;
    let liveGmvTzs = 0;
    orgBranches.forEach((b) => {
      const st = branchStores[b.id];
      if (!st) return;
      const valid = st.orders.filter(
        (o) => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'rejected'
      );
      liveOrdersCount += valid.length;
      liveGmvTzs += valid.reduce((sum, o) => sum + o.total, 0);
    });
    const accountsCount = saasAccounts.filter((a) => a.organizationId === org.id).length;
    return {
      org,
      branchesCount: orgBranches.length,
      activeBranchesCount,
      liveOrdersCount,
      liveGmvTzs,
      accountsCount,
    };
  });
}

export function computeProviderStatsPure(
  organizations: SaasOrganization[],
  allBranches: RestaurantTenant[],
  saasAccounts: SaasAccount[],
  leadInquiries: PlatformLeadInquiry[],
  tenantSummaries: Array<{ liveGmvTzs: number }>
) {
  return {
    totalTenants: organizations.length,
    activeTenants: organizations.filter((o) => o.status === 'active').length,
    trialTenants: organizations.filter((o) => o.status === 'trial').length,
    suspendedTenants: organizations.filter((o) => o.status === 'suspended').length,
    totalBranches: allBranches.length,
    activeAccountsCount: saasAccounts.filter((a) => a.status === 'active').length,
    pendingAccountsCount: saasAccounts.filter((a) => a.status === 'pending').length,
    monthlyRecurringRevenueTzs: organizations
      .filter((o) => o.status !== 'suspended')
      .reduce((sum, o) => sum + o.monthlyFeeTzs, 0),
    platformGmvTzs: tenantSummaries.reduce((sum, t) => sum + t.liveGmvTzs, 0),
    openLeadsCount: leadInquiries.filter((l) => l.status !== 'converted').length,
  };
}
