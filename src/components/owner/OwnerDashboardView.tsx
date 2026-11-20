import React, { useState, useMemo } from 'react';
import {
  Download,
  Calendar,
  ChevronDown,
  Filter,
  Users,
  Search,
  DollarSign,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Layers,
  ChefHat,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Percent,
  Sparkles,
  AlertTriangle,
  Eye,
  X,
  ShieldAlert,
  BookOpen,
  ArrowLeftRight,
  Mail,
  Plus,
  RefreshCw,
  Power,
  Package,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, Role, RestaurantTenant } from '../../types/restaurant';

type ReportDimension =
  | 'accountability_eod'
  | 'daily_trend'
  | 'by_salesperson'
  | 'by_order_type'
  | 'by_category'
  | 'by_payment'
  | 'cashier_shift';

type PersonaView = 'boss' | 'manager' | 'cashier' | 'waiter';

export const OwnerDashboardView: React.FC = () => {
  const {
    currentOrganization,
    currentTenant,
    tenants,
    setCurrentTenantId,
    viewScope,
    switchToHqOverview,
    activeOperator,
    branchMetricsSummaries,
    hqAllOrders,
    hqAllApprovals,
    hqAllPurchaseRequests,
    hqAllBranchTransfers,
    hqReviewApproval,
    hqDispatchBranchTransfer,
    hqUpdatePurchaseRequestStatus,
    getBranchIngredients,
    addBranchToCurrentOrg,
    currentBranchQuota,
    toggleBranchStatus,
    orders,
    waiters,
    employees,
    cashierShift,
    formatMoney,
    currency,
    toggleCurrency,
    setActiveRole,
    taxEnabled,
    setTaxEnabled,
    taxRatePct,
    setTaxRatePct,
    defaultCommissionMode,
    defaultCommissionValue,
    discrepancies,
    auditLogs,
    approvalRequests,
    reviewApprovalRequest,
    promoteCustomItemToMenu,
    getOrderCommission,
    dailyReconciliations,
    productionLogs,
    subRecipeBatches,
    stockMovements,
  } = useRestaurant();

  // User type / persona view selector
  const [activePersona, setActivePersona] = useState<PersonaView>('boss');

  // Filter dimensions
  const [activeDimension, setActiveDimension] = useState<ReportDimension>('accountability_eod');
  const [inspectedWaiterId, setInspectedWaiterId] = useState<string | null>(null);
  const [auditFilterQuery, setAuditFilterQuery] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('this_month');
  const [selectedShift, setSelectedShift] = useState<string>('all_day');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all_employees');

  // HQ Branch creation & Inter-branch transfer local states
  const [showHqAddBranch, setShowHqAddBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchModel, setNewBranchModel] = useState<RestaurantTenant['operatingModel']>('dine_in_restaurant');
  const [newBranchEmail, setNewBranchEmail] = useState('');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('+255 754 000 000');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [cloneCatalogFromCurrent, setCloneCatalogFromCurrent] = useState(true);

  const [transferFromBranchId, setTransferFromBranchId] = useState<string>(() => tenants[0]?.id || '');
  const [transferToBranchId, setTransferToBranchId] = useState<string>(() => tenants[1]?.id || tenants[0]?.id || '');
  const [transferIngredientId, setTransferIngredientId] = useState<string>('');
  const [transferQty, setTransferQty] = useState<string>('5000');
  const [hqActionNotice, setHqActionNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [chartStep, setChartStep] = useState<'days' | 'hours'>('days');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    date: string;
    gross: number;
    net: number;
    profit: number;
    orders: number;
    x: number;
    y: number;
  } | null>(null);

  // Exact figures from Loyverse Back Office screenshot (image_04d4b5da.png):
  // Gross sales: $23,383.79 (+$1,611.04 / +7.41%)
  // Refunds: $0.00 (-$17.49 / -100%)
  // Discounts: $191.32 (+$8.31 / +4.55%)
  // Net sales: $23,192.47 (+$1,479 / +1.34%)
  // Gross profit: $15,461.65 (+$1,479 / +1.34%)
  const baseKpi = {
    grossSales: 23383.79,
    refunds: 0.0,
    discounts: 191.32,
    netSales: 23192.47,
    grossProfit: 15461.65,
    cogs: 7730.82,
    marginPct: 66.67,
    grossChangePct: '+7.41%',
    refundChangePct: '-100%',
    discountChangePct: '+4.55%',
    netChangePct: '+1.34%',
    profitChangePct: '+1.34%',
  };

  // Convert USD to current currency string
  const formatVal = (usdAmount: number) => {
    if (currency === 'USD') {
      return `$${usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    const tzs = Math.round(usdAmount * currentTenant.currencyRate);
    return `TZS ${tzs.toLocaleString()}`;
  };

  // Format compact number without $
  const formatRawNumber = (usdAmount: number) => {
    if (currency === 'USD') {
      return usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const tzs = Math.round(usdAmount * currentTenant.currencyRate);
    return tzs.toLocaleString();
  };

  // Historical Daily Sales Data matching the curve in image_04d4b5da.png
  // 30 days of June 2025
  const dailyData = [
    { date: 'Jun 1, 2025', gross: 580.4, discounts: 4.5, net: 575.9, cogs: 192.0, profit: 383.9, orders: 24 },
    { date: 'Jun 2, 2025', gross: 720.15, discounts: 6.2, net: 713.95, cogs: 238.0, profit: 475.95, orders: 29 },
    { date: 'Jun 3, 2025', gross: 840.0, discounts: 8.0, net: 832.0, cogs: 277.2, profit: 554.8, orders: 34 },
    { date: 'Jun 4, 2025', gross: 610.5, discounts: 5.1, net: 605.4, cogs: 201.8, profit: 403.6, orders: 25 },
    { date: 'Jun 5, 2025', gross: 950.8, discounts: 7.5, net: 943.3, cogs: 314.4, profit: 628.9, orders: 38 },
    { date: 'Jun 6, 2025', gross: 1120.3, discounts: 12.0, net: 1108.3, cogs: 369.4, profit: 738.9, orders: 46 },
    { date: 'Jun 7, 2025', gross: 1350.0, discounts: 15.5, net: 1334.5, cogs: 444.8, profit: 889.7, orders: 55 },
    { date: 'Jun 8, 2025', gross: 1080.25, discounts: 9.8, net: 1070.45, cogs: 356.8, profit: 713.65, orders: 44 },
    { date: 'Jun 9, 2025', gross: 640.1, discounts: 4.0, net: 636.1, cogs: 212.0, profit: 424.1, orders: 26 },
    { date: 'Jun 10, 2025', gross: 780.0, discounts: 5.5, net: 774.5, cogs: 258.2, profit: 516.3, orders: 31 },
    { date: 'Jun 11, 2025', gross: 820.6, discounts: 6.8, net: 813.8, cogs: 271.3, profit: 542.5, orders: 33 },
    { date: 'Jun 12, 2025', gross: 910.4, discounts: 7.2, net: 903.2, cogs: 301.1, profit: 602.1, orders: 37 },
    { date: 'Jun 13, 2025', gross: 1240.5, discounts: 11.0, net: 1229.5, cogs: 409.8, profit: 819.7, orders: 50 },
    { date: 'Jun 14, 2025', gross: 1410.8, discounts: 14.2, net: 1396.6, cogs: 465.5, profit: 931.1, orders: 58 },
    { date: 'Jun 15, 2025', gross: 1190.2, discounts: 10.5, net: 1179.7, cogs: 393.2, profit: 786.5, orders: 48 },
    { date: 'Jun 16, 2025', gross: 670.3, discounts: 5.0, net: 665.3, cogs: 221.8, profit: 443.5, orders: 27 },
    { date: 'Jun 17, 2025', gross: 750.9, discounts: 6.1, net: 744.8, cogs: 248.3, profit: 496.5, orders: 30 },
    { date: 'Jun 18, 2025', gross: 890.0, discounts: 7.8, net: 882.2, cogs: 294.1, profit: 588.1, orders: 36 },
    { date: 'Jun 19, 2025', gross: 960.5, discounts: 8.5, net: 952.0, cogs: 317.3, profit: 634.7, orders: 39 },
    { date: 'Jun 20, 2025', gross: 1290.4, discounts: 11.8, net: 1278.6, cogs: 426.2, profit: 852.4, orders: 52 },
    { date: 'Jun 21, 2025', gross: 1480.0, discounts: 16.0, net: 1464.0, cogs: 488.0, profit: 976.0, orders: 60 },
    { date: 'Jun 22, 2025', gross: 1150.6, discounts: 9.9, net: 1140.7, cogs: 380.2, profit: 760.5, orders: 47 },
    { date: 'Jun 23, 2025', gross: 620.0, discounts: 4.8, net: 615.2, cogs: 205.1, profit: 410.1, orders: 25 },
    { date: 'Jun 24, 2025', gross: 810.7, discounts: 6.5, net: 804.2, cogs: 268.1, profit: 536.1, orders: 32 },
    { date: 'Jun 25, 2025', gross: 880.3, discounts: 7.0, net: 873.3, cogs: 291.1, profit: 582.2, orders: 35 },
    { date: 'Jun 26, 2025', gross: 940.1, discounts: 8.0, net: 932.1, cogs: 310.7, profit: 621.4, orders: 38 },
    { date: 'Jun 27, 2025', gross: 1320.6, discounts: 12.5, net: 1308.1, cogs: 436.0, profit: 872.1, orders: 54 },
    { date: 'Jun 28, 2025', gross: 1687.54, discounts: 12.5, net: 1675.04, cogs: 562.51, profit: 1112.53, orders: 68 },
    { date: 'Jun 29, 2025', gross: 1222.56, discounts: 10.8, net: 1211.76, cogs: 407.85, profit: 803.91, orders: 49 },
    { date: 'Jun 30, 2025', gross: 1657.54, discounts: 12.3, net: 1645.24, cogs: 552.51, profit: 1092.73, orders: 66 },
  ];

  // Sales by Salesperson / Waiter
  const salespersonData = [
    {
      id: 'waiter-john',
      name: 'John Mwamba',
      role: 'Head Waiter',
      ordersCount: 142,
      grossSales: 9480.0,
      discounts: 82.5,
      netSales: 9397.5,
      cogs: 3132.5,
      commissionEarned: 469.88, // 5%
      avgOrderSize: 66.76,
      customerTips: 340.0,
      payoutStatus: 'Paid / Reconciled',
    },
    {
      id: 'waiter-sarah',
      name: 'Sarah Kimani',
      role: 'VIP Dining Hostess',
      ordersCount: 128,
      grossSales: 8240.5,
      discounts: 64.0,
      netSales: 8176.5,
      cogs: 2725.5,
      commissionEarned: 408.83,
      avgOrderSize: 64.38,
      customerTips: 295.0,
      payoutStatus: 'Paid / Reconciled',
    },
    {
      id: 'waiter-peter',
      name: 'Peter Masawe',
      role: 'Terrace Server',
      ordersCount: 86,
      grossSales: 5663.29,
      discounts: 44.82,
      netSales: 5618.47,
      cogs: 1872.82,
      commissionEarned: 280.92,
      avgOrderSize: 65.85,
      customerTips: 185.0,
      payoutStatus: 'Pending Next Payroll',
    },
  ];

  // Sales by Order Type / Channel
  const orderTypeData = [
    { type: 'Dine-in Service', code: 'dine_in', orders: 214, gross: 13562.6, discounts: 110.0, net: 13452.6, sharePct: 58.0 },
    { type: 'Takeaway / Pickup', code: 'pickup', orders: 98, gross: 6313.62, discounts: 55.32, net: 6258.3, sharePct: 27.0 },
    { type: 'Online Delivery', code: 'delivery', orders: 56, gross: 3507.57, discounts: 26.0, net: 3481.57, sharePct: 15.0 },
  ];

  // Sales by Category & Dishes
  const categoryData = [
    { category: 'Sweets & Desserts', itemsCount: 15, soldUnits: 840, gross: 8420.0, cogs: 2778.6, profit: 5641.4, margin: 67.0 },
    { category: 'Breakfast & Savory', itemsCount: 8, soldUnits: 512, gross: 6890.0, cogs: 2273.7, profit: 4616.3, margin: 67.0 },
    { category: 'Fruits & Salads', itemsCount: 6, soldUnits: 340, gross: 4680.0, cogs: 1544.4, profit: 3135.6, margin: 67.0 },
    { category: 'Coffee, Tea & Drinks', itemsCount: 7, soldUnits: 620, gross: 3393.79, cogs: 1134.12, profit: 2259.67, margin: 66.6 },
  ];

  // Sales by Payment Method
  const paymentMethodData = [
    { method: 'Credit / Debit Card', orders: 172, gross: 11224.22, fee: 168.36, share: '48.0%' },
    { method: 'Cash Drawer', orders: 124, gross: 7950.48, fee: 0.0, share: '34.0%' },
    { method: 'Mobile Money (M-Pesa / Scan)', orders: 60, gross: 4209.09, fee: 42.09, share: '18.0%' },
  ];

  // SVG Chart Dimensions & Calculations matching image_04d4b5da.png
  const chartW = 900;
  const chartH = 220;
  const maxGross = 2000;

  const points = useMemo(() => {
    return dailyData.map((d, index) => {
      const x = (index / (dailyData.length - 1)) * (chartW - 40) + 20;
      const y = chartH - (d.gross / maxGross) * (chartH - 40) - 20;
      return { x, y, data: d };
    });
  }, [dailyData]);

  const svgPathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');
  }, [points]);

  const svgAreaD = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    return `${svgPathD} L ${lastX} ${chartH - 20} L ${firstX} ${chartH - 20} Z`;
  }, [svgPathD, points]);

  // Live Today Operations & EOD Financial Reconciliation (computed directly from live orders & payments)
  const liveOps = useMemo(() => {
    const activeNonDraft = orders.filter((o) => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'rejected');
    const drafts = orders.filter((o) => o.status === 'draft');
    const cancelled = orders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
    const outstandingOrders = activeNonDraft.filter((o) => Math.max(0, o.total - (o.paidAmount || 0)) > 0);
    const totalSales = activeNonDraft.reduce((s, o) => s + o.total, 0);
    const totalCollected = activeNonDraft.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const outstandingAmount = outstandingOrders.reduce((s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)), 0);
    const draftAmount = drafts.reduce((s, o) => s + o.total, 0);
    const cancelledAmount = cancelled.reduce((s, o) => s + (o.originalAmount || o.total), 0);
    const customItemsCount = orders.reduce((s, o) => s + o.items.filter((i) => i.isCustomItem).length, 0);

    // Breakdown by tender method from Transaction records (fallback to paymentMethod when payments[] absent)
    let cashCollected = 0;
    let mpesaCollected = 0;
    let airtelCollected = 0;
    let cardCollected = 0;
    let refundsTotal = 0;
    let discountsTotal = 0;
    let rejectedItemsValue = 0;

    orders.forEach((ord) => {
      discountsTotal += ord.discount || 0;
      ord.items.forEach((it) => {
        if (it.status === 'rejected') {
          rejectedItemsValue += it.price * it.quantity;
        }
      });
      if (ord.payments && ord.payments.length > 0) {
        ord.payments.forEach((tx) => {
          if (tx.isRefund) {
            refundsTotal += tx.amount;
          } else if (tx.method === 'cash') {
            cashCollected += tx.amount;
          } else if (tx.method === 'mpesa') {
            mpesaCollected += tx.amount;
          } else if (tx.method === 'airtel') {
            airtelCollected += tx.amount;
          } else if (tx.method === 'card') {
            cardCollected += tx.amount;
          }
        });
      } else if ((ord.paidAmount || 0) > 0) {
        if (ord.paymentMethod === 'cash') cashCollected += ord.paidAmount;
        else if (ord.paymentMethod === 'mpesa') mpesaCollected += ord.paidAmount;
        else if (ord.paymentMethod === 'airtel') airtelCollected += ord.paidAmount;
        else if (ord.paymentMethod === 'card') cardCollected += ord.paidAmount;
      }
    });

    const perWaiter = waiters.map((w) => {
      const wOrders = orders.filter((o) => o.servingWaiterId === w.id || o.referralWaiterId === w.id);
      const wDrafts = wOrders.filter((o) => o.status === 'draft');
      const wInKitchen = wOrders.filter((o) => ['sent_to_kitchen', 'accepted', 'preparing', 'ready'].includes(o.status));
      const wServedUnpaid = wOrders.filter((o) => o.status === 'served' && o.paymentStatus !== 'paid');
      const wPaid = wOrders.filter((o) => o.paymentStatus === 'paid' && o.status !== 'cancelled');
      const wCancelled = wOrders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
      const wCustomCount = wOrders.reduce((s, o) => s + o.items.filter((i) => i.isCustomItem).length, 0);
      const wDiscounts = wOrders.reduce((s, o) => s + (o.discount || 0), 0);
      const wCollected = wOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
        .reduce((s, o) => s + (o.paidAmount || 0), 0);
      const wOutstanding = wOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'draft')
        .reduce((s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)), 0);
      const wCommission = wPaid.reduce((s, o) => s + getOrderCommission(o, w.id).amount, 0);

      return {
        waiter: w,
        orders: wOrders,
        draftsCount: wDrafts.length,
        inKitchenCount: wInKitchen.length,
        servedUnpaidCount: wServedUnpaid.length,
        paidCount: wPaid.length,
        cancelledCount: wCancelled.length,
        customItemsCount: wCustomCount,
        discountsTotal: wDiscounts,
        collectedTotal: wCollected,
        outstandingTotal: wOutstanding,
        commissionTotal: wCommission,
      };
    });

    return {
      totalSales,
      totalOrdersCount: activeNonDraft.length,
      totalCollected,
      outstandingCount: outstandingOrders.length,
      outstandingAmount,
      draftsCount: drafts.length,
      draftAmount,
      cancelledCount: cancelled.length,
      cancelledAmount,
      customItemsCount,
      cashCollected,
      mpesaCollected,
      airtelCollected,
      cardCollected,
      refundsTotal,
      discountsTotal,
      rejectedItemsValue,
      perWaiter,
    };
  }, [orders, waiters, getOrderCommission]);

  // Export CSV handler
  const handleExportCsv = () => {
    let rows: string[][] = [];

    if (activeDimension === 'daily_trend') {
      rows = [
        ['Date', 'Gross Sales', 'Discounts', 'Net Sales', 'Cost of Goods', 'Gross Profit', 'Orders'],
        ...dailyData.map((d) => [
          d.date,
          d.gross.toFixed(2),
          d.discounts.toFixed(2),
          d.net.toFixed(2),
          d.cogs.toFixed(2),
          d.profit.toFixed(2),
          d.orders.toString(),
        ]),
      ];
    } else if (activeDimension === 'by_salesperson') {
      rows = [
        ['Salesperson', 'Role', 'Orders', 'Gross Sales', 'Discounts', 'Net Sales', 'Commission (5%)', 'Avg Order'],
        ...salespersonData.map((s) => [
          s.name,
          s.role,
          s.ordersCount.toString(),
          s.grossSales.toFixed(2),
          s.discounts.toFixed(2),
          s.netSales.toFixed(2),
          s.commissionEarned.toFixed(2),
          s.avgOrderSize.toFixed(2),
        ]),
      ];
    } else {
      rows = [
        ['Channel', 'Orders Count', 'Gross Sales', 'Discounts', 'Net Sales', 'Share %'],
        ...orderTypeData.map((o) => [
          o.type,
          o.orders.toString(),
          o.gross.toFixed(2),
          o.discounts.toFixed(2),
          o.net.toFixed(2),
          `${o.sharePct}%`,
        ]),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loyverse_Sales_Report_${activeDimension}_June2025.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-neutral-100/80 text-neutral-900 font-sans pb-12">
      {/* ================= TOP VIBRANT GREEN HEADER BAR matching image_04d4b5da.png ================= */}
      <div className="bg-[#43A047] text-white px-4 sm:px-6 h-14 flex items-center justify-between shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveRole('cashier')}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
            title="Switch back to Cashier POS"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white drop-shadow-xs flex items-center gap-2">
              <span>{viewScope === 'hq_overview' ? 'Main HQ Command & Sales Summary' : 'Sales summary'}</span>
              <span className="hidden md:inline text-xs font-normal text-white/85">
                · {currentOrganization.name} · {viewScope === 'hq_overview' ? `All ${tenants.length} Branches` : `${currentTenant.name} (${currentTenant.branchCode})`}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {viewScope === 'branch' && (
            <button
              type="button"
              onClick={switchToHqOverview}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Main HQ Overview</span>
            </button>
          )}
          {/* Persona / User Type Selector Pills as requested: "based on user types each must see their respective report" */}
          <div className="hidden sm:flex items-center bg-black/20 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'boss', label: '👑 Boss / Owner' },
              { id: 'manager', label: '👔 Store Manager' },
              { id: 'cashier', label: '💳 Cashier' },
              { id: 'waiter', label: '📱 Waiter / Sales' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePersona(p.id as PersonaView)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activePersona === p.id
                    ? 'bg-white text-neutral-900 font-bold shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Currency Switcher */}
          <button
            onClick={toggleCurrency}
            className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Toggle Currency between USD and TZS"
          >
            {currency}
          </button>
        </div>
      </div>

      {/* Mobile Persona Switcher Bar */}
      <div className="sm:hidden px-4 py-2 bg-white border-b border-neutral-200 flex gap-1 overflow-x-auto text-xs">
        {[
          { id: 'boss', label: '👑 Boss' },
          { id: 'manager', label: '👔 Manager' },
          { id: 'cashier', label: '💳 Cashier' },
          { id: 'waiter', label: '📱 Waiter' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePersona(p.id as PersonaView)}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 ${
              activePersona === p.id
                ? 'bg-[#43A047] text-white'
                : 'bg-neutral-100 text-neutral-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ================= FILTER & PERSPECTIVE TOOLBAR matching image_04d4b5da.png ================= */}
      <div className="bg-white border-b border-neutral-200/90 px-4 sm:px-6 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Filter Pills Left */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-neutral-700">
            {/* Date Range Selector matching: < Jun 1, 2025 - Jun 30, 2025 > */}
            <div className="flex items-center bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 font-medium transition-colors">
              <Calendar className="w-3.5 h-3.5 text-neutral-500 mr-1.5" />
              <button
                onClick={() => setDateRangePreset('last_month')}
                className="hover:text-neutral-950 font-mono text-[11px] px-1"
              >
                &lt;
              </button>
              <span className="font-semibold text-neutral-900 px-1 font-mono text-[11px] sm:text-xs">
                Jun 1, 2025 - Jun 30, 2025
              </span>
              <button
                onClick={() => setDateRangePreset('this_month')}
                className="hover:text-neutral-950 font-mono text-[11px] px-1"
              >
                &gt;
              </button>
            </div>

            {/* Shift Filter: All day ▾ */}
            <div className="relative">
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
              >
                <option value="all_day">All day</option>
                <option value="morning">Morning Shift (08:00 - 15:00)</option>
                <option value="dinner">Dinner Shift (15:00 - 23:30)</option>
              </select>
            </div>

            {/* Store / Branch Scope Filter (Strictly Isolated to Current Tenant) */}
            <div className="relative">
              <select
                value={viewScope === 'hq_overview' ? 'all_stores' : currentTenant.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all_stores') {
                    switchToHqOverview();
                  } else {
                    setCurrentTenantId(val);
                  }
                }}
                aria-label="Branch scope filter"
                className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
              >
                <option value="all_stores">
                  Main HQ — All {tenants.length} Branches ({currentOrganization.name})
                </option>
                {tenants.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.branchCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter: Dynamically populated for current branch */}
            <div className="relative">
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                aria-label="Employee filter"
                className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
              >
                <option value="all_employees">All employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Tax Config + Quick Info Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-xs">
              <Percent className="w-3.5 h-3.5 text-neutral-500" />
              <span className="font-semibold text-neutral-700">Order Tax:</span>
              <button
                type="button"
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`px-2 py-0.5 rounded font-bold text-[11px] transition-colors cursor-pointer ${
                  taxEnabled
                    ? 'bg-[#43A047] text-white'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                }`}
              >
                {taxEnabled ? 'ON' : 'OFF'}
              </button>
              {taxEnabled && (
                <select
                  value={taxRatePct}
                  onChange={(e) => setTaxRatePct(Number(e.target.value))}
                  className="bg-white border border-neutral-200 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-neutral-800 outline-hidden cursor-pointer"
                  aria-label="VAT Rate Percentage"
                >
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={18}>18%</option>
                </select>
              )}
            </div>

            <div className="text-xs font-medium text-neutral-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                {activePersona === 'boss' && 'Role: Executive Owner & Boss (Enterprise View)'}
                {activePersona === 'manager' && 'Role: Store Manager (Shift & Kitchen Costing)'}
                {activePersona === 'cashier' && 'Role: Cashier Terminal 01 (Register Audit)'}
                {activePersona === 'waiter' &&
                  `Role: John Mwamba (${
                    defaultCommissionMode === 'percent'
                      ? `${defaultCommissionValue}% Commission`
                      : `${formatMoney(defaultCommissionValue)} / Paid Order`
                  })`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ================= MAIN HQ MULTI-BRANCH OVERVIEW & CONTROL OR BRANCH BANNER ================= */}
        {viewScope === 'hq_overview' ? (
          (() => {
            const hqTotals = branchMetricsSummaries.reduce(
              (acc, b) => ({
                todaySales: acc.todaySales + b.todaySales,
                collectedSales: acc.collectedSales + b.collectedSales,
                outstandingAmount: acc.outstandingAmount + b.outstandingAmount,
                activeOrdersCount: acc.activeOrdersCount + b.activeOrdersCount,
                kitchenPendingCount: acc.kitchenPendingCount + b.kitchenPendingCount,
                inventoryValuation: acc.inventoryValuation + b.inventoryValuation,
                lowStockCount: acc.lowStockCount + b.lowStockCount,
                pendingApprovalsCount: acc.pendingApprovalsCount + b.pendingApprovalsCount,
                openPurchaseRequestsCount: acc.openPurchaseRequestsCount + b.openPurchaseRequestsCount,
                unreadEmailsCount: acc.unreadEmailsCount + b.unreadEmailsCount,
              }),
              {
                todaySales: 0,
                collectedSales: 0,
                outstandingAmount: 0,
                activeOrdersCount: 0,
                kitchenPendingCount: 0,
                inventoryValuation: 0,
                lowStockCount: 0,
                pendingApprovalsCount: 0,
                openPurchaseRequestsCount: 0,
                unreadEmailsCount: 0,
              }
            );
            const hqPendingApprovals = hqAllApprovals.filter((a) => a.status === 'pending');
            const sourceBranchIngredients = getBranchIngredients(transferFromBranchId);
            const effectiveIngredientId =
              sourceBranchIngredients.some((i) => i.id === transferIngredientId)
                ? transferIngredientId
                : sourceBranchIngredients[0]?.id || '';

            return (
              <section className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
                {/* HQ Masthead */}
                <div className="px-5 py-4 bg-neutral-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-4 h-4 text-orange-400 shrink-0" />
                      <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                        {currentOrganization.name} — Main HQ Multi-Branch Command
                      </h2>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                        · {currentOrganization.plan} ({currentBranchQuota.used}/{currentBranchQuota.max} branches)
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Tenant-isolated control across {tenants.length} {tenants.length === 1 ? 'branch' : 'branches'} · Quota remaining: {currentBranchQuota.remaining} · Owner: {currentOrganization.ownerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowHqAddBranch((v) => !v)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Branch</span>
                    </button>
                  </div>
                </div>

                {/* Inline Feedback Banner */}
                {hqActionNotice && (
                  <div
                    className={`px-5 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
                      hqActionNotice.type === 'ok'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    <span>{hqActionNotice.text}</span>
                    <button
                      type="button"
                      onClick={() => setHqActionNotice(null)}
                      className="text-current opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Inline Add Branch Form */}
                {showHqAddBranch && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newBranchName.trim() || !newBranchCode.trim()) return;
                      const created = addBranchToCurrentOrg({
                        name: newBranchName.trim(),
                        branchCode: newBranchCode.trim().toUpperCase(),
                        operatingModel: newBranchModel,
                        phone: newBranchPhone.trim() || '+255 754 000 000',
                        email: newBranchEmail.trim() || `${newBranchCode.trim().toLowerCase()}@${currentOrganization.domain}`,
                        managerName: newBranchManager.trim() || 'Branch Manager',
                        address: newBranchAddress.trim() || 'Dar es Salaam, Tanzania',
                        cloneCatalogFromCurrent,
                      });
                      if (!created) {
                        setHqActionNotice({
                          type: 'err',
                          text: `Package branch quota reached (${currentBranchQuota.used}/${currentBranchQuota.max} branches on ${currentOrganization.plan}). Upgrade package on System Provider Control Site.`,
                        });
                        return;
                      }
                      setShowHqAddBranch(false);
                      setNewBranchName('');
                      setNewBranchCode('');
                      setNewBranchEmail('');
                      setNewBranchManager('');
                      setNewBranchAddress('');
                      setHqActionNotice({
                        type: 'ok',
                        text: `Provisioned isolated branch "${created.name}" (${created.branchCode}) under ${currentOrganization.name}.`,
                      });
                    }}
                    className="p-5 bg-neutral-50 border-b border-neutral-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                        Provision New Branch Under {currentOrganization.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowHqAddBranch(false)}
                        className="text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                      <input
                        type="text"
                        required
                        placeholder="Branch name (e.g. Mikocheni Branch)"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Code (e.g. SAV-MKC)"
                        value={newBranchCode}
                        onChange={(e) => setNewBranchCode(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg font-mono uppercase outline-hidden focus:border-neutral-900"
                      />
                      <select
                        value={newBranchModel}
                        onChange={(e) => setNewBranchModel(e.target.value as RestaurantTenant['operatingModel'])}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden"
                      >
                        <option value="dine_in_restaurant">Dine-in Restaurant</option>
                        <option value="fast_food_chips">Fast Food / Express</option>
                        <option value="cafe_bistro">Cafe & Bistro</option>
                      </select>
                      <input
                        type="email"
                        placeholder={`Branch email (@${currentOrganization.domain})`}
                        value={newBranchEmail}
                        onChange={(e) => setNewBranchEmail(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Manager full name"
                        value={newBranchManager}
                        onChange={(e) => setNewBranchManager(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Phone"
                        value={newBranchPhone}
                        onChange={(e) => setNewBranchPhone(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Street address"
                        value={newBranchAddress}
                        onChange={(e) => setNewBranchAddress(e.target.value)}
                        className="px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-hidden focus:border-neutral-900 sm:col-span-2"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cloneCatalogFromCurrent}
                          onChange={(e) => setCloneCatalogFromCurrent(e.target.checked)}
                          className="rounded border-neutral-300"
                        />
                        <span>Clone standardized menu &amp; BOM recipes from {currentTenant.name} (orders &amp; stock remain isolated)</span>
                      </label>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
                      >
                        Create Isolated Branch
                      </button>
                    </div>
                  </form>
                )}

                {/* Consolidated Tenant-Wide KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-neutral-50/70 border-b border-neutral-200">
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">HQ Total Live Sales</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                      {formatMoney(hqTotals.todaySales)}
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">
                      {hqTotals.activeOrdersCount} orders · {tenants.length} branches
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">HQ Cash &amp; Digital Collected</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
                      {formatMoney(hqTotals.collectedSales)}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Outstanding: {formatMoney(hqTotals.outstandingAmount)}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">Kitchen Active Queue</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                      {hqTotals.kitchenPendingCount} tickets
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Across all KDS screens</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">Total Stock Valuation</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                      {formatMoney(hqTotals.inventoryValuation)}
                    </div>
                    <div className={`text-[11px] mt-0.5 font-semibold ${hqTotals.lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {hqTotals.lowStockCount} low-stock alerts
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">HQ Approvals &amp; POs</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-rose-700 mt-1 tabular-nums">
                      {hqTotals.pendingApprovalsCount} pending
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {hqTotals.openPurchaseRequestsCount} open purchase reqs
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-neutral-200">
                    <div className="text-[11px] text-neutral-500 font-medium">Branch Unread Mail</div>
                    <div className="text-sm sm:text-base font-extrabold font-mono text-indigo-700 mt-1 tabular-nums">
                      {hqTotals.unreadEmailsCount} unread
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Intra-tenant mailboxes</div>
                  </div>
                </div>

                {/* Branches Comparison & 1-Click Refresh Switcher Table */}
                <div className="overflow-x-auto border-b border-neutral-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100/80 text-neutral-600 font-semibold uppercase tracking-wider text-[10px] border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-4">Branch &amp; Manager</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Today Sales</th>
                        <th className="py-2.5 px-3 text-right">Collected / Due</th>
                        <th className="py-2.5 px-3 text-center">Orders / KDS</th>
                        <th className="py-2.5 px-3 text-center">Tables</th>
                        <th className="py-2.5 px-3 text-center">Low Stock</th>
                        <th className="py-2.5 px-3 text-center">Approvals</th>
                        <th className="py-2.5 px-4 text-right">Switch &amp; Refresh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {branchMetricsSummaries.map((bm) => {
                        const isPreviewing = bm.branch.id === currentTenant.id;
                        return (
                          <tr key={bm.branch.id} className={isPreviewing ? 'bg-orange-50/40' : 'hover:bg-neutral-50'}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 text-white">
                                  {bm.branch.branchCode}
                                </span>
                                <span className="font-bold text-neutral-900">{bm.branch.name}</span>
                                {bm.branch.isHqBranch && (
                                  <span className="text-[10px] font-bold text-orange-700">· HQ</span>
                                )}
                              </div>
                              <div className="text-[11px] text-neutral-500 mt-0.5">
                                {bm.branch.managerName} · {bm.branch.email}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <button
                                type="button"
                                onClick={() => {
                                  toggleBranchStatus(bm.branch.id);
                                  setHqActionNotice({
                                    type: 'ok',
                                    text: `Updated operational status for ${bm.branch.name}.`,
                                  });
                                }}
                                title="Toggle branch status between Active and Maintenance"
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors ${
                                  bm.branch.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                <Power className="w-3 h-3" />
                                <span>{bm.branch.status === 'active' ? 'Active' : 'Maintenance'}</span>
                              </button>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900 tabular-nums">
                              {formatMoney(bm.todaySales)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums">
                              <div className="font-semibold text-emerald-700">{formatMoney(bm.collectedSales)}</div>
                              {bm.outstandingAmount > 0 && (
                                <div className="text-[10px] text-rose-700">Due: {formatMoney(bm.outstandingAmount)}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              <span className="font-bold text-neutral-900">{bm.activeOrdersCount}</span>
                              <span className="text-neutral-400"> / </span>
                              <span className="text-orange-700 font-semibold">{bm.kitchenPendingCount}</span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-neutral-700">
                              {bm.tablesOccupied}/{bm.tablesTotal}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              <span className={bm.lowStockCount > 0 ? 'font-bold text-amber-700' : 'text-neutral-500'}>
                                {bm.lowStockCount}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              <span className={bm.pendingApprovalsCount > 0 ? 'font-bold text-rose-700' : 'text-neutral-500'}>
                                {bm.pendingApprovalsCount}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setCurrentTenantId(bm.branch.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Open Branch</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* HQ Control Grid: Approvals Queue, Inter-Branch Transfer, Purchase Requests */}
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200">
                  {/* 1. HQ Multi-Branch Approvals */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>HQ Approvals Queue ({hqPendingApprovals.length})</span>
                      </h3>
                      <span className="text-[11px] text-neutral-400">All branches</span>
                    </div>
                    {hqPendingApprovals.length === 0 ? (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 text-center">
                        No pending approvals across {currentOrganization.name}.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {hqPendingApprovals.map((req) => (
                          <div
                            key={`${req.branchId}-${req.id}`}
                            className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-amber-900 uppercase">
                                  {req.branchName} · {req.orderNumber}
                                </div>
                                <div className="font-bold text-neutral-900 truncate">{req.details}</div>
                                <div className="text-[11px] text-neutral-600 truncate">
                                  {req.requestedBy}: {req.reason}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  hqReviewApproval(req.branchId, req.id, false);
                                  setHqActionNotice({
                                    type: 'err',
                                    text: `Denied request ${req.orderNumber} for ${req.branchName}.`,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 text-[11px] font-bold bg-white cursor-pointer"
                              >
                                Deny
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  hqReviewApproval(req.branchId, req.id, true);
                                  setHqActionNotice({
                                    type: 'ok',
                                    text: `Approved request ${req.orderNumber} for ${req.branchName}.`,
                                  });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. HQ Inter-Branch Stock Transfer */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-orange-600" />
                        <span>HQ Inter-Branch Stock Transfer</span>
                      </h3>
                      <span className="text-[11px] text-neutral-400">Intra-tenant</span>
                    </div>
                    {tenants.length < 2 ? (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500">
                        Add at least 2 branches under {currentOrganization.name} to transfer stock between stores.
                      </div>
                    ) : (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const qtyNum = Number(transferQty);
                          const res = hqDispatchBranchTransfer({
                            fromBranchId: transferFromBranchId,
                            toBranchId: transferToBranchId,
                            ingredientId: effectiveIngredientId,
                            quantityUnits: qtyNum,
                          });
                          setHqActionNotice({
                            type: res.success ? 'ok' : 'err',
                            text: res.message,
                          });
                        }}
                        className="space-y-2 text-xs"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">From Branch</label>
                            <select
                              value={transferFromBranchId}
                              onChange={(e) => setTransferFromBranchId(e.target.value)}
                              className="w-full mt-0.5 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold"
                            >
                              {tenants.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.branchCode} · {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">To Branch</label>
                            <select
                              value={transferToBranchId}
                              onChange={(e) => setTransferToBranchId(e.target.value)}
                              className="w-full mt-0.5 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold"
                            >
                              {tenants.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.branchCode} · {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Source Store Ingredient</label>
                            <select
                              value={effectiveIngredientId}
                              onChange={(e) => setTransferIngredientId(e.target.value)}
                              className="w-full mt-0.5 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-semibold"
                            >
                              {sourceBranchIngredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name} ({ing.storeStockUnits.toLocaleString()} {ing.consumptionUnit})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-neutral-500 uppercase">Qty (Units)</label>
                            <input
                              type="number"
                              min={1}
                              value={transferQty}
                              onChange={(e) => setTransferQty(e.target.value)}
                              className="w-full mt-0.5 px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono text-xs font-bold"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs cursor-pointer transition-colors"
                        >
                          Dispatch HQ Stock Transfer
                        </button>
                      </form>
                    )}
                    {hqAllBranchTransfers.length > 0 && (
                      <div className="pt-2 border-t border-neutral-100 space-y-1 max-h-24 overflow-y-auto text-[11px]">
                        {hqAllBranchTransfers.slice(0, 3).map((tr) => (
                          <div key={`${tr.branchId}-${tr.id}`} className="flex items-center justify-between text-neutral-600">
                            <span className="truncate">
                              <strong className="text-neutral-900 font-mono">{tr.transferNumber}</strong> · {tr.ingredientName} ({tr.quantity} {tr.unit})
                            </span>
                            <span className="text-emerald-700 font-semibold shrink-0 ml-2">{tr.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. HQ Purchase Requests & Recent Cross-Branch Orders */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-indigo-600" />
                        <span>HQ Procurement &amp; Branch POs ({hqAllPurchaseRequests.length})</span>
                      </h3>
                      <span className="text-[11px] font-mono text-neutral-400">{hqAllOrders.length} total orders</span>
                    </div>
                    {hqAllPurchaseRequests.length === 0 ? (
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 text-center">
                        No open purchase requests across branches.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {hqAllPurchaseRequests.map((pr) => (
                          <div
                            key={`${pr.branchId}-${pr.id}`}
                            className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-neutral-500 uppercase truncate">
                                {pr.branchName} · {pr.requestNumber}
                              </div>
                              <div className="font-bold text-neutral-900 truncate">
                                {pr.ingredientName} · {pr.requestedQty} {pr.unit}
                              </div>
                              <div className="text-[11px] text-neutral-600 font-mono">
                                {formatMoney(pr.estimatedCost)} · {pr.status}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {pr.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    hqUpdatePurchaseRequestStatus(pr.branchId, pr.id, 'approved');
                                    setHqActionNotice({
                                      type: 'ok',
                                      text: `Approved PO ${pr.requestNumber} (${pr.ingredientName}) for ${pr.branchName}.`,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Approve PO
                                </button>
                              )}
                              {pr.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    hqUpdatePurchaseRequestStatus(pr.branchId, pr.id, 'ordered');
                                    setHqActionNotice({
                                      type: 'ok',
                                      text: `Marked PO ${pr.requestNumber} as ordered.`,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Mark Ordered
                                </button>
                              )}
                              {pr.status === 'ordered' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    hqUpdatePurchaseRequestStatus(pr.branchId, pr.id, 'received');
                                    setHqActionNotice({
                                      type: 'ok',
                                      text: `Marked PO ${pr.requestNumber} received at ${pr.branchName}.`,
                                    });
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Receive Stock
                                </button>
                              )}
                              {pr.status === 'received' && (
                                <span className="text-[11px] font-bold text-emerald-700">Received</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })()
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-900 text-white">
                {currentTenant.branchCode}
              </span>
              <span className="font-extrabold text-neutral-900">{currentTenant.name}</span>
              <span className="text-neutral-400">·</span>
              <span className="text-neutral-600">
                Isolated Branch Workspace · Manager: <strong>{currentTenant.managerName}</strong>
              </span>
              <span className="text-neutral-400">·</span>
              <span className="inline-flex items-center gap-1 text-neutral-600 font-mono">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                {currentTenant.email}
              </span>
            </div>
            <button
              type="button"
              onClick={switchToHqOverview}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Main HQ — All Branches Overview</span>
            </button>
          </div>
        )}

        {/* ================= LIVE TODAY OPERATIONS & ACCOUNTABILITY OVERVIEW ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-neutral-200">
            <div className="text-[11px] text-neutral-500 font-medium">Today Live Sales</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatMoney(liveOps.totalSales)}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {liveOps.totalOrdersCount} active orders
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-neutral-200">
            <div className="text-[11px] text-neutral-500 font-medium">Cash &amp; Digital Paid</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
              {formatMoney(liveOps.totalCollected)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Verified payments</div>
          </div>

          <div className={`rounded-xl p-3.5 border ${liveOps.outstandingAmount > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-white border-neutral-200'}`}>
            <div className="text-[11px] text-neutral-600 font-medium">Outstanding Bills</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-rose-700 mt-1 tabular-nums">
              {formatMoney(liveOps.outstandingAmount)}
            </div>
            <div className="text-[11px] text-rose-700 font-semibold mt-0.5">
              {liveOps.outstandingCount} unpaid / partial
            </div>
          </div>

          <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200">
            <div className="text-[11px] text-amber-900 font-medium">Saved Drafts</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-amber-950 mt-1 tabular-nums">
              {liveOps.draftsCount} ({formatMoney(liveOps.draftAmount)})
            </div>
            <div className="text-[11px] text-amber-800 mt-0.5">Visible to Owner</div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-neutral-200">
            <div className="text-[11px] text-neutral-500 font-medium">Cancelled / Rejected</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
              {liveOps.cancelledCount} ({formatMoney(liveOps.cancelledAmount)})
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">Full audit kept</div>
          </div>

          <div className="bg-indigo-50/60 rounded-xl p-3.5 border border-indigo-200">
            <div className="text-[11px] text-indigo-900 font-medium">Off-Menu Specials</div>
            <div className="text-base sm:text-lg font-extrabold font-mono text-indigo-950 mt-1 tabular-nums">
              {liveOps.customItemsCount} items
            </div>
            <div className="text-[11px] text-indigo-700 mt-0.5">Per-order custom</div>
          </div>
        </div>

        {/* ================= AUTOMATED DISCREPANCY ALERTS ================= */}
        {discrepancies.length > 0 && (
          <div className="bg-white rounded-2xl border border-rose-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-extrabold text-neutral-900">
                  Live Discrepancy &amp; Risk Alerts ({discrepancies.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveDimension('accountability_eod')}
                className="text-xs font-bold text-rose-700 hover:underline cursor-pointer"
              >
                Open Accountability Ledger
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {discrepancies.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="font-mono">{alert.orderNumber}</span>
                      <span className="truncate">{alert.title}</span>
                    </div>
                    <div className="text-[11px] opacity-85">{alert.detail}</div>
                  </div>
                  <span className="font-mono font-extrabold shrink-0 tabular-nums">
                    {formatMoney(alert.amountImpact)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5 KPI CARDS STRIP matching image_04d4b5da.png ================= */}
        {/* In the screenshot: Gross sales, Refunds, Discounts, Net sales, Gross profit */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Gross sales Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Gross sales</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(activePersona === 'waiter' ? 9480.0 : baseKpi.grossSales)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>{baseKpi.grossChangePct} vs last month</span>
            </div>
          </div>

          {/* Refunds Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Refunds</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(baseKpi.refunds)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium mt-1">
              <span>{baseKpi.refundChangePct}</span>
            </div>
          </div>

          {/* Discounts Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Discounts</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(activePersona === 'waiter' ? 82.5 : baseKpi.discounts)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-rose-700 font-medium mt-1">
              <span>{baseKpi.discountChangePct}</span>
            </div>
          </div>

          {/* Net sales Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Net sales</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(activePersona === 'waiter' ? 9397.5 : baseKpi.netSales)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
              <span>{baseKpi.netChangePct}</span>
            </div>
          </div>

          {/* Gross profit Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow col-span-2 md:col-span-1">
            <div className="text-xs text-neutral-500 font-medium">
              {activePersona === 'waiter' ? 'Earned Commission' : 'Gross profit'}
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-[#43A047] mt-1 tabular-nums">
              {formatVal(activePersona === 'waiter' ? 469.88 : baseKpi.grossProfit)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <span>
                {activePersona === 'waiter'
                  ? defaultCommissionMode === 'percent'
                    ? `${defaultCommissionValue}% paid net sales`
                    : `${formatMoney(defaultCommissionValue)} / paid order`
                  : `${baseKpi.profitChangePct} (${baseKpi.marginPct}% margin)`}
              </span>
            </div>
          </div>
        </div>

        {/* ================= INTERACTIVE CHART VIEW matching image_04d4b5da.png ================= */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-4">
          {/* Chart Header & Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {activePersona === 'waiter' ? 'My Sales Trend (Daily)' : 'Gross Sales Trend'}
              </h3>
              <p className="text-xs text-neutral-400">
                Historical June performance across {dailyData.length} active service days
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart Type: Area ▾ / Line ▾ / Bar ▾ matching screenshot */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as any)}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-hidden"
              >
                <option value="area">Area</option>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>

              {/* Step: Days ▾ / Hours ▾ matching screenshot */}
              <select
                value={chartStep}
                onChange={(e) => setChartStep(e.target.value as any)}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-hidden"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>

          {/* SVG Canvas Area Chart */}
          <div className="relative w-full overflow-x-auto">
            <div className="min-w-[700px] sm:min-w-full">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-56 sm:h-64 select-none"
              >
                <defs>
                  {/* Loyverse Green Gradient Fill */}
                  <linearGradient id="loyverseGreenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#43A047" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#81C784" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 500, 1000, 1500, 2000].map((val) => {
                  const y = chartH - (val / maxGross) * (chartH - 40) - 20;
                  return (
                    <g key={val}>
                      <line
                        x1="20"
                        y1={y}
                        x2={chartW - 20}
                        y2={y}
                        stroke="#E5E7EB"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x="22"
                        y={y - 4}
                        fill="#9CA3AF"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        {currency === 'USD'
                          ? `$${val}`
                          : val === 0
                          ? 'TZS 0'
                          : `TZS ${((val * currentTenant.currencyRate) / 1000000).toFixed(1)}M`}
                      </text>
                    </g>
                  );
                })}

                {/* Area Gradient */}
                {chartType === 'area' && (
                  <path d={svgAreaD} fill="url(#loyverseGreenGradient)" />
                )}

                {/* Solid Line Stroke */}
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#43A047"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredDataPoint?.date === p.data.date ? 5 : 2.5}
                    fill={hoveredDataPoint?.date === p.data.date ? '#1B5E20' : '#43A047'}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:scale-150"
                    onMouseEnter={() =>
                      setHoveredDataPoint({
                        date: p.data.date,
                        gross: p.data.gross,
                        net: p.data.net,
                        profit: p.data.profit,
                        orders: p.data.orders,
                        x: p.x,
                        y: p.y,
                      })
                    }
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                ))}
              </svg>

              {/* Bottom Date labels matching image_04d4b5da.png */}
              <div className="flex justify-between px-4 pt-1 text-[10px] text-neutral-400 font-mono">
                {['Jun 1', 'Jun 5', 'Jun 10', 'Jun 15', 'Jun 20', 'Jun 25', 'Jun 30'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            {/* Hover Tooltip Box */}
            {hoveredDataPoint && (
              <div
                style={{
                  left: `${(hoveredDataPoint.x / chartW) * 100}%`,
                  top: `${hoveredDataPoint.y - 10}px`,
                }}
                className="absolute -translate-x-1/2 -translate-y-full bg-neutral-900 text-white p-2.5 rounded-xl shadow-2xl border border-neutral-700 pointer-events-none text-xs z-30 whitespace-nowrap animate-in fade-in duration-100"
              >
                <div className="font-bold text-white mb-1 border-b border-neutral-700 pb-1">
                  {hoveredDataPoint.date}
                </div>
                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between gap-3 text-neutral-300">
                    <span>Gross Sales:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatVal(hoveredDataPoint.gross)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-neutral-300">
                    <span>Net Sales:</span>
                    <span className="font-mono text-neutral-200">
                      {formatVal(hoveredDataPoint.net)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-neutral-300">
                    <span>Gross Profit:</span>
                    <span className="font-mono text-emerald-300">
                      {formatVal(hoveredDataPoint.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3 text-neutral-400">
                    <span>Total Receipts:</span>
                    <span className="font-mono">{hoveredDataPoint.orders}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= REPORT DIMENSION TABS & DATA TABLE matching image_04d4b5da.png ================= */}
        <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden">
          {/* Dimension Tabs (Daily trend, Sales by Person, By Type, By Category, Cashier Shift) */}
          <div className="p-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3 bg-neutral-50/50">
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {[
                { id: 'accountability_eod', label: 'Waiter Accountability & EOD Reconciliation', icon: ShieldAlert },
                { id: 'daily_trend', label: 'Daily Breakdown', icon: Calendar },
                { id: 'by_salesperson', label: 'Sales by Salesperson / Waiter', icon: Users },
                { id: 'by_order_type', label: 'Sales by Order Type (Dine/Takeaway)', icon: ShoppingBag },
                { id: 'by_category', label: 'Sales by Category & Dish', icon: ChefHat },
                { id: 'by_payment', label: 'Sales by Tender Method', icon: CreditCard },
                { id: 'cashier_shift', label: 'Cashier Shift Reconciliation', icon: Banknote },
              ].map((dim) => {
                const Icon = dim.icon;
                const isActive = activeDimension === dim.id;

                return (
                  <button
                    key={dim.id}
                    onClick={() => setActiveDimension(dim.id as ReportDimension)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#43A047] text-white shadow-xs font-bold'
                        : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{dim.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions: EXPORT BUTTON & Quick Search */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs bg-white border border-neutral-200 rounded-lg outline-hidden w-36 sm:w-44"
                />
              </div>

              {/* EXPORT button matching image_04d4b5da.png */}
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>EXPORT</span>
              </button>
            </div>
          </div>

          {/* ================= TABLE 1: DAILY SALES SUMMARY matching image_04d4b5da.png ================= */}
          {activeDimension === 'daily_trend' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Gross sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Net sales</th>
                    <th className="py-3 px-4 text-right">Cost of goods</th>
                    <th className="py-3 px-4 text-right">Gross profit</th>
                    <th className="py-3 px-4 text-right">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {dailyData
                    .filter((d) => d.date.toLowerCase().includes(tableSearch.toLowerCase()))
                    .slice(0, 15)
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-neutral-900">
                          {row.date}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatRawNumber(row.gross)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                          {row.discounts > 0 ? `-${formatRawNumber(row.discounts)}` : '0.00'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-semibold">
                          {formatRawNumber(row.net)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                          {formatRawNumber(row.cogs)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-[#2E7D32]">
                          {formatRawNumber(row.profit)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-sans">{row.orders}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold border-t border-neutral-200 font-mono text-neutral-900">
                  <tr>
                    <td className="py-3 px-4 font-sans">Total (30 Days)</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatVal(baseKpi.grossSales)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-rose-700">
                      -{formatVal(baseKpi.discounts)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatVal(baseKpi.netSales)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-neutral-600">
                      {formatVal(baseKpi.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#2E7D32]">
                      {formatVal(baseKpi.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-sans">1,248</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ================= TABLE 2: SALES BY SALESPERSON / WAITER ================= */}
          {activeDimension === 'by_salesperson' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Salesperson</th>
                    <th className="py-3 px-4">Role / Title</th>
                    <th className="py-3 px-4 text-right">Orders Taken</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Earned Commission (5%)</th>
                    <th className="py-3 px-4 text-right">Customer Tips</th>
                    <th className="py-3 px-4 text-right">Avg Ticket</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {salespersonData.map((sp) => (
                    <tr key={sp.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-neutral-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                          {sp.name[0]}
                        </div>
                        <span>{sp.name}</span>
                      </td>
                      <td className="py-3 px-4 font-sans text-neutral-500">{sp.role}</td>
                      <td className="py-3 px-4 text-right font-sans">{sp.ordersCount}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatVal(sp.grossSales)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatVal(sp.netSales)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700">
                        {formatVal(sp.commissionEarned)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-600">{formatVal(sp.customerTips)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatVal(sp.avgOrderSize)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {sp.payoutStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TABLE 3: SALES BY ORDER TYPE ================= */}
          {activeDimension === 'by_order_type' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Order Channel / Type</th>
                    <th className="py-3 px-4 text-right">Orders Count</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Revenue Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {orderTypeData.map((ot) => (
                    <tr key={ot.code} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-neutral-900">{ot.type}</td>
                      <td className="py-3 px-4 text-right font-sans">{ot.orders}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatVal(ot.gross)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-500">-{formatVal(ot.discounts)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatVal(ot.net)}</td>
                      <td className="py-3 px-4 text-right font-sans font-bold text-emerald-700">{ot.sharePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TABLE 4: SALES BY CATEGORY & DISH ================= */}
          {activeDimension === 'by_category' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Menu Category</th>
                    <th className="py-3 px-4 text-right">Menu Items Count</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Cost of Goods (COGS)</th>
                    <th className="py-3 px-4 text-right">Gross Profit</th>
                    <th className="py-3 px-4 text-right">Food Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {categoryData.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-neutral-900">{cat.category}</td>
                      <td className="py-3 px-4 text-right font-sans">{cat.itemsCount}</td>
                      <td className="py-3 px-4 text-right font-sans font-semibold">{cat.soldUnits}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{formatVal(cat.gross)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-500">{formatVal(cat.cogs)}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-bold text-[#2E7D32]">{formatVal(cat.profit)}</td>
                      <td className="py-3 px-4 text-right font-sans font-bold text-emerald-700">{cat.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ================= TABLE 5: CASHIER SHIFT RECONCILIATION ================= */}
          {activeDimension === 'cashier_shift' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-xs text-neutral-500">Opening Float</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-1">
                    {formatMoney(cashierShift.openingCash)}
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-xs text-neutral-500">Cash Sales Collected</div>
                  <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                    +{formatMoney(cashierShift.cashSales)}
                  </div>
                </div>
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="text-xs text-neutral-500">Card & M-Pesa Sales</div>
                  <div className="text-lg font-bold font-mono text-blue-700 mt-1">
                    +{formatMoney(cashierShift.mpesaSales + cashierShift.cardSales)}
                  </div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-800 font-semibold">Expected Cash in Drawer</div>
                  <div className="text-lg font-bold font-mono text-emerald-900 mt-1">
                    {formatMoney(cashierShift.expectedCash)}
                  </div>
                </div>
              </div>

              <div className="border border-neutral-200 rounded-xl p-4 bg-white space-y-2 text-xs">
                <div className="font-bold text-neutral-900">Shift Register Audit Trail</div>
                <div className="text-neutral-500">
                  Shift opened today at {cashierShift.openedAt} by {activeOperator.name} ({currentTenant.branchCode}). No void discrepancies detected.
                </div>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-900">Active Shift Orders & Service Coupons</span>
                  <span className="font-mono text-[11px] text-neutral-500">{orders.length} tickets</span>
                </div>
                <div className="divide-y divide-neutral-100 text-xs">
                  {orders.slice(0, 8).map((o) => (
                    <div key={o.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-extrabold text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-dashed border-amber-300 text-amber-900">
                          {o.serviceCouponCode || `SV-${o.orderNumber.replace('#', '')}`}
                        </span>
                        <span className="font-mono font-bold text-neutral-900">{o.orderNumber}</span>
                        <span className="text-neutral-500 truncate">{o.customerName || 'Guest'}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-neutral-900 tabular-nums">
                          {formatMoney(o.total)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            o.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.paymentStatus.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TABLE 0: LIVE WAITER ACCOUNTABILITY & EOD FINANCIAL RECONCILIATION ================= */}
          {activeDimension === 'accountability_eod' && (
            <div className="p-5 space-y-6">
              {/* Clickable Waiter Accountability Matrix */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-neutral-900">
                      Live Waiter Performance &amp; Full Accountability
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Click any waiter row to inspect drafts, kitchen-submitted, served-unpaid, paid, cancelled, and custom orders
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-100 text-neutral-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Waiter</th>
                        <th className="py-2.5 px-3 text-center">Drafts</th>
                        <th className="py-2.5 px-3 text-center">In Kitchen</th>
                        <th className="py-2.5 px-3 text-center">Served Unpaid</th>
                        <th className="py-2.5 px-3 text-center">Paid</th>
                        <th className="py-2.5 px-3 text-center">Cancelled</th>
                        <th className="py-2.5 px-3 text-center">Custom Items</th>
                        <th className="py-2.5 px-3 text-right">Collected</th>
                        <th className="py-2.5 px-3 text-right">Outstanding</th>
                        <th className="py-2.5 px-3 text-right">Commission</th>
                        <th className="py-2.5 px-3 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {liveOps.perWaiter.map((row) => (
                        <tr
                          key={row.waiter.id}
                          onClick={() => setInspectedWaiterId(row.waiter.id)}
                          className="hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3 font-bold text-neutral-900">
                            <div>{row.waiter.name}</div>
                            <div className="text-[10px] font-mono text-neutral-500">{row.waiter.referralCode}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            {row.draftsCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">{row.draftsCount}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">{row.inKitchenCount}</td>
                          <td className="py-3 px-3 text-center font-mono">
                            {row.servedUnpaidCount > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">{row.servedUnpaidCount}</span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">{row.paidCount}</td>
                          <td className="py-3 px-3 text-center font-mono text-neutral-500">{row.cancelledCount}</td>
                          <td className="py-3 px-3 text-center font-mono text-indigo-700 font-semibold">{row.customItemsCount}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                            {formatMoney(row.collectedTotal)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold tabular-nums text-rose-700">
                            {formatMoney(row.outstandingTotal)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                            {formatMoney(row.commissionTotal)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedWaiterId(row.waiter.id);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* End-of-Day Financial Reconciliation Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-neutral-200 rounded-2xl p-4 space-y-3 bg-neutral-50/50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-neutral-900">
                      End-of-Day Financial Reconciliation
                    </h4>
                    <span className="text-[11px] font-mono font-semibold text-neutral-500">Live Ledger</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                      <div className="text-neutral-500">Cash Collected</div>
                      <div className="font-mono font-extrabold text-sm text-neutral-900 mt-0.5 tabular-nums">
                        {formatMoney(liveOps.cashCollected)}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                      <div className="text-neutral-500">Mobile Money (M-Pesa + Airtel)</div>
                      <div className="font-mono font-extrabold text-sm text-blue-700 mt-0.5 tabular-nums">
                        {formatMoney(liveOps.mpesaCollected + liveOps.airtelCollected)}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-neutral-200">
                      <div className="text-neutral-500">Card / POS Settlements</div>
                      <div className="font-mono font-extrabold text-sm text-neutral-900 mt-0.5 tabular-nums">
                        {formatMoney(liveOps.cardCollected)}
                      </div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="text-rose-800 font-medium">Unpaid / Partial Balances</div>
                      <div className="font-mono font-extrabold text-sm text-rose-800 mt-0.5 tabular-nums">
                        {formatMoney(liveOps.outstandingAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-neutral-200/70 text-xs bg-white rounded-xl border border-neutral-200 px-3">
                    <div className="py-2 flex justify-between">
                      <span className="text-neutral-600">Discounts Applied</span>
                      <span className="font-mono font-bold text-neutral-900 tabular-nums">
                        -{formatMoney(liveOps.discountsTotal)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-neutral-600">Kitchen Rejected / Voided Items</span>
                      <span className="font-mono font-bold text-rose-700 tabular-nums">
                        -{formatMoney(liveOps.rejectedItemsValue)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between">
                      <span className="text-neutral-600">Refunds Issued</span>
                      <span className="font-mono font-bold text-neutral-900 tabular-nums">
                        -{formatMoney(liveOps.refundsTotal)}
                      </span>
                    </div>
                    <div className="py-2 flex justify-between font-bold">
                      <span className="text-neutral-900">Expected Cash in Drawer (Float + Cash)</span>
                      <span className="font-mono text-emerald-700 tabular-nums">
                        {formatMoney(cashierShift.openingCash + liveOps.cashCollected - liveOps.refundsTotal)}
                      </span>
                    </div>
                  </div>

                  {/* BOM Production COGS & Consumption Variance Control */}
                  {(() => {
                    const bomConsumptionCogs = stockMovements
                      .filter(
                        (m) =>
                          m.type === 'kitchen_consumption' ||
                          m.type === 'production_issue' ||
                          m.type === 'direct_consumption' ||
                          m.type === 'wastage_spoilage'
                      )
                      .reduce((sum, m) => sum + Math.abs(m.costImpact || 0), 0);
                    const subRecipePoolValue = subRecipeBatches
                      .filter((b) => b.status !== 'reversed' && b.remainingQty > 0)
                      .reduce((sum, b) => sum + b.remainingQty * b.costPerUnit, 0);
                    const netVarianceCost = dailyReconciliations.reduce(
                      (sum, r) => sum + (r.varianceCost || 0),
                      0
                    );
                    const activeBatches = productionLogs.filter((l) => l.status !== 'reversed').length;
                    const reversedBatches = productionLogs.filter((l) => l.status === 'reversed').length;

                    return (
                      <div className="pt-2 border-t border-neutral-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-neutral-900">
                            BOM Production COGS &amp; Stock Variance Control
                          </span>
                          <span className="text-[11px] font-mono text-neutral-500">
                            {activeBatches} active batches{reversedBatches > 0 ? ` · ${reversedBatches} reversed` : ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                            <div className="text-[11px] text-neutral-500">Ingredient Usage COGS</div>
                            <div className="font-mono font-bold text-neutral-900 mt-0.5 tabular-nums">
                              {formatMoney(Math.round(bomConsumptionCogs))}
                            </div>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                            <div className="text-[11px] text-neutral-500">Sub-Recipe Pool Value</div>
                            <div className="font-mono font-bold text-neutral-900 mt-0.5 tabular-nums">
                              {formatMoney(Math.round(subRecipePoolValue))}
                            </div>
                          </div>
                          <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                            <div className="text-[11px] text-neutral-500">Net Count Variance</div>
                            <div
                              className={`font-mono font-bold mt-0.5 tabular-nums ${
                                netVarianceCost < 0 ? 'text-rose-700' : 'text-emerald-700'
                              }`}
                            >
                              {netVarianceCost > 0 ? '+' : ''}
                              {formatMoney(Math.round(netVarianceCost))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Pending Approvals + Custom Off-Menu Review */}
                <div className="border border-neutral-200 rounded-2xl p-4 space-y-3 bg-white">
                  <h4 className="text-sm font-extrabold text-neutral-900">
                    Pending Approvals &amp; Custom Off-Menu Orders
                  </h4>

                  {approvalRequests.filter((r) => r.status === 'pending').length > 0 && (
                    <div className="space-y-2">
                      {approvalRequests
                        .filter((r) => r.status === 'pending')
                        .map((req) => (
                          <div key={req.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <div className="font-bold text-neutral-900">
                                {req.orderNumber} · {req.details}
                              </div>
                              <div className="text-[11px] text-neutral-600 truncate">
                                {req.requestedBy}: {req.reason}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => reviewApprovalRequest(req.id, false, 'Owner / Boss')}
                                className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 text-[11px] font-bold cursor-pointer"
                              >
                                Deny
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewApprovalRequest(req.id, true, 'Owner / Boss')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {orders
                      .flatMap((ord) =>
                        ord.items
                          .map((item, idx) => ({ ord, item, idx }))
                          .filter((x) => x.item.isCustomItem)
                      )
                      .map(({ ord, item, idx }) => (
                        <div key={`${ord.id}-${idx}`} className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 truncate">
                              {item.quantity}× {item.name} ({formatMoney(item.price)})
                            </div>
                            <div className="text-[11px] text-neutral-600 truncate">
                              {ord.orderNumber} · {item.customInstructions || 'Custom customer item'}
                            </div>
                          </div>
                          {item.promotedToMenuId ? (
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800 shrink-0">
                              In Menu ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => promoteCustomItemToMenu(ord.id, idx, 'Special')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              + Add to Menu
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Immutable Audit Log Stream */}
              <div className="border border-neutral-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-extrabold text-neutral-900">
                    System Audit Trail ({auditLogs.length} events)
                  </div>
                  <input
                    type="text"
                    value={auditFilterQuery}
                    onChange={(e) => setAuditFilterQuery(e.target.value)}
                    placeholder="Filter order #, actor, or action..."
                    className="px-3 py-1 text-xs bg-white border border-neutral-200 rounded-lg w-full sm:w-64"
                  />
                </div>
                <div className="divide-y divide-neutral-100 max-h-72 overflow-y-auto text-xs">
                  {auditLogs
                    .filter((log) => {
                      const q = auditFilterQuery.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (log.orderNumber || '').toLowerCase().includes(q) ||
                        log.actor.toLowerCase().includes(q) ||
                        log.action.toLowerCase().includes(q) ||
                        log.details.toLowerCase().includes(q)
                      );
                    })
                    .map((log) => (
                      <div key={log.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-neutral-900 mr-2">{log.orderNumber || 'SYSTEM'}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-800 mr-2">
                            {log.action}
                          </span>
                          <span className="font-semibold text-neutral-800 mr-1.5">{log.actor}:</span>
                          <span className="text-neutral-600">{log.details}</span>
                        </div>
                        <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= TABLE 6: SALES BY TENDER METHOD ================= */}
          {activeDimension === 'by_payment' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Payment Tender</th>
                    <th className="py-3 px-4 text-right">Transactions</th>
                    <th className="py-3 px-4 text-right">Gross Total</th>
                    <th className="py-3 px-4 text-right">Processing Fees</th>
                    <th className="py-3 px-4 text-right">Tender Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {paymentMethodData.map((pm, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans font-bold text-neutral-900">{pm.method}</td>
                      <td className="py-3 px-4 text-right font-sans">{pm.orders}</td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold">{formatVal(pm.gross)}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-neutral-500">{formatVal(pm.fee)}</td>
                      <td className="py-3 px-4 text-right font-sans font-bold text-emerald-700">{pm.share}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= WAITER FULL INSPECTION DRAWER / MODAL ================= */}
      {inspectedWaiterId && (() => {
        const waiterSummary = liveOps.perWaiter.find((w) => w.waiter.id === inspectedWaiterId);
        if (!waiterSummary) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-neutral-200 flex flex-col">
              <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white shrink-0">
                <div>
                  <h3 className="text-base font-extrabold">
                    {waiterSummary.waiter.name} — Full Activity Inspection
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    {waiterSummary.waiter.referralCode} · Collected {formatMoney(waiterSummary.collectedTotal)} · Outstanding {formatMoney(waiterSummary.outstandingTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedWaiterId(null)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white cursor-pointer"
                  aria-label="Close inspection drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-neutral-200 grid grid-cols-3 sm:grid-cols-6 gap-2 bg-neutral-50 text-center text-xs shrink-0">
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Drafts</div>
                  <div className="font-mono font-bold text-amber-700">{waiterSummary.draftsCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">In Kitchen</div>
                  <div className="font-mono font-bold text-neutral-900">{waiterSummary.inKitchenCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Served Unpaid</div>
                  <div className="font-mono font-bold text-rose-700">{waiterSummary.servedUnpaidCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Paid</div>
                  <div className="font-mono font-bold text-emerald-700">{waiterSummary.paidCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Cancelled</div>
                  <div className="font-mono font-bold text-neutral-600">{waiterSummary.cancelledCount}</div>
                </div>
                <div className="p-2 bg-white rounded-lg border border-neutral-200">
                  <div className="text-[10px] text-neutral-500">Commission</div>
                  <div className="font-mono font-bold text-emerald-700">{formatMoney(waiterSummary.commissionTotal)}</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {waiterSummary.orders.map((ord) => {
                  const balance = Math.max(0, ord.total - (ord.paidAmount || 0));
                  return (
                    <div key={ord.id} className="p-3.5 rounded-2xl border border-neutral-200 bg-white space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-neutral-900">{ord.orderNumber}</span>
                            {ord.kotNumber && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                {ord.kotNumber}
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-900 text-white">
                              {ord.status.replace(/_/g, ' ')}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.paymentStatus === 'partial'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-500 mt-0.5">
                            {ord.tableNumber || ord.type} · {ord.customerName}
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="font-extrabold text-neutral-900 tabular-nums">{formatMoney(ord.total)}</div>
                          {balance > 0 && ord.status !== 'draft' && ord.status !== 'cancelled' && (
                            <div className="text-[11px] font-bold text-rose-700">Bal: {formatMoney(balance)}</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1 border-t border-neutral-100 pt-2">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between gap-2 text-[11px]">
                            <span className={it.status === 'rejected' ? 'line-through text-rose-600' : 'text-neutral-800'}>
                              {it.quantity}× {it.name}
                              {it.isCustomItem ? ' [Custom]' : ''}
                              {it.customInstructions ? ` (${it.customInstructions})` : ''}
                              {it.status === 'rejected' && it.rejectionReason ? ` — REJECTED: ${it.rejectionReason}` : ''}
                            </span>
                            <span className="font-mono text-neutral-600 tabular-nums shrink-0">
                              {formatMoney(it.price * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {ord.adjustments && ord.adjustments.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-950">
                          {ord.adjustments.map((adj) => (
                            <div key={adj.id}>
                              Adjustment ({adj.type}): {formatMoney(adj.difference)} · {adj.reason}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
