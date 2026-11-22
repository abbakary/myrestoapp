import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Crown,
  Briefcase,
  UserCheck,
  Check,
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
    menuItems,
    recipes,
    computeRecipeUnitCost,
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
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState(false);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  // Filter dimensions
  const [activeDimension, setActiveDimension] = useState<ReportDimension>('accountability_eod');
  const [inspectedWaiterId, setInspectedWaiterId] = useState<string | null>(null);
  const [auditFilterQuery, setAuditFilterQuery] = useState<string>('');
  const [dateRangePreset, setDateRangePreset] = useState<string>('this_month');
  const [selectedShift, setSelectedShift] = useState<string>('all_day');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all_employees');

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(e.target as Node)) {
        setIsRoleSwitcherOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsRoleSwitcherOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const personaMeta: Record<
    PersonaView,
    {
      label: string;
      shortLabel: string;
      headerTitle: string;
      description: string;
      defaultDimension: ReportDimension;
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    boss: {
      label: 'Boss / Owner',
      shortLabel: 'Boss / Owner',
      headerTitle: viewScope === 'hq_overview' ? 'Main HQ Sales Summary' : 'Executive Sales Summary',
      description: 'Enterprise P&L, HQ command & all branch analytics',
      defaultDimension: 'accountability_eod',
      icon: Crown,
    },
    manager: {
      label: 'Store Manager',
      shortLabel: 'Store Manager',
      headerTitle: 'Store Manager Operations',
      description: 'BOM costing, kitchen margins, stock & approvals',
      defaultDimension: 'by_category',
      icon: Briefcase,
    },
    cashier: {
      label: 'Cashier',
      shortLabel: 'Cashier',
      headerTitle: 'Cashier Register Audit',
      description: 'Drawer float, tender split & active shift bills',
      defaultDimension: 'cashier_shift',
      icon: CreditCard,
    },
    waiter: {
      label: 'Waiter / Sales',
      shortLabel: 'Waiter / Sales',
      headerTitle: 'Waiter Sales & Commissions',
      description: 'Waiter-attributed orders, unpaid bills & commission',
      defaultDimension: 'by_salesperson',
      icon: UserCheck,
    },
  };

  const handleSelectPersona = (nextPersona: PersonaView) => {
    setActivePersona(nextPersona);
    setSelectedEmployeeFilter('all_employees');
    setActiveDimension(personaMeta[nextPersona].defaultDimension);
    setIsRoleSwitcherOpen(false);
  };

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

  // Date Range Presets (live calendar bounds)
  const datePresets = ['all', 'last_month', 'this_month', 'today'] as const;
  const cycleDatePreset = (dir: -1 | 1) => {
    const idx = datePresets.indexOf(dateRangePreset as (typeof datePresets)[number]);
    const currentIdx = idx === -1 ? 2 : idx;
    const nextIdx = (currentIdx + dir + datePresets.length) % datePresets.length;
    setDateRangePreset(datePresets[nextIdx]);
  };

  const dateRangeInfo = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (dateRangePreset === 'today') {
      const start = new Date(y, m, now.getDate(), 0, 0, 0, 0);
      const end = new Date(y, m, now.getDate(), 23, 59, 59, 999);
      return {
        label: `Today · ${monthNames[m]} ${now.getDate()}, ${y}`,
        start,
        end,
      };
    }
    if (dateRangePreset === 'last_month') {
      const prevMonthDate = new Date(y, m - 1, 1);
      const py = prevMonthDate.getFullYear();
      const pm = prevMonthDate.getMonth();
      const lastDay = new Date(py, pm + 1, 0).getDate();
      return {
        label: `${monthNames[pm]} 1, ${py} - ${monthNames[pm]} ${lastDay}, ${py}`,
        start: new Date(py, pm, 1, 0, 0, 0, 0),
        end: new Date(py, pm, lastDay, 23, 59, 59, 999),
      };
    }
    if (dateRangePreset === 'all') {
      return {
        label: 'All Recorded Dates',
        start: null as Date | null,
        end: null as Date | null,
      };
    }
    const lastDay = new Date(y, m + 1, 0).getDate();
    return {
      label: `${monthNames[m]} 1, ${y} - ${monthNames[m]} ${lastDay}, ${y}`,
      start: new Date(y, m, 1, 0, 0, 0, 0),
      end: new Date(y, m, lastDay, 23, 59, 59, 999),
    };
  }, [dateRangePreset]);

  // Format TZS amount to current currency string
  const formatVal = (amountTzs: number) => formatMoney(amountTzs);

  // Format compact number in active currency without currency prefix
  const formatRawNumber = (amountTzs: number) => {
    if (currency === 'USD') {
      const usd = amountTzs / currentTenant.currencyRate;
      return usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return Math.round(amountTzs).toLocaleString();
  };

  // Role-scoped options for the Staff / Person dropdown filter
  const rolePersonOptions = useMemo(() => {
    if (activePersona === 'waiter') {
      return waiters.map((w) => ({
        id: w.id,
        label: `${w.name} (${w.referralCode})`,
        name: w.name,
      }));
    }
    if (activePersona === 'cashier') {
      const cashiers = employees.filter((e) =>
        ['cashier', 'reception', 'accountant'].includes(e.role)
      );
      const list = cashiers.length > 0 ? cashiers : employees;
      return list.map((e) => ({
        id: e.id,
        label: `${e.name} (${e.role})`,
        name: e.name,
      }));
    }
    if (activePersona === 'manager') {
      return employees.map((e) => ({
        id: e.id,
        label: `${e.name} (${e.role})`,
        name: e.name,
      }));
    }
    return employees.map((e) => ({
      id: e.id,
      label: `${e.name} (${e.role})`,
      name: e.name,
    }));
  }, [activePersona, employees, waiters]);

  // Determine active waiter when Waiter Persona is selected (undefined = All Waiters)
  const selectedPersonaWaiter = useMemo(() => {
    if (selectedEmployeeFilter !== 'all_employees') {
      const directWaiter = waiters.find((w) => w.id === selectedEmployeeFilter);
      if (directWaiter) return directWaiter;
      const emp = employees.find((e) => e.id === selectedEmployeeFilter);
      if (emp) {
        const byMatch = waiters.find(
          (w) => w.id === emp.id || w.name.toLowerCase() === emp.name.toLowerCase()
        );
        if (byMatch) return byMatch;
      }
    }
    return undefined;
  }, [waiters, employees, selectedEmployeeFilter]);

  // Base orders scoped by Branch vs Main HQ
  const scopeOrders = useMemo(
    () => (viewScope === 'hq_overview' ? hqAllOrders : orders),
    [viewScope, hqAllOrders, orders]
  );

  // Apply Date Range, Shift, Role Perspective, and Staff/Waiter filters strictly to live tenant orders
  const filteredOrders = useMemo(() => {
    const selectedEmp =
      activePersona !== 'waiter' && selectedEmployeeFilter !== 'all_employees'
        ? employees.find((e) => e.id === selectedEmployeeFilter)
        : undefined;
    const matchedEmpWaiter = selectedEmp
      ? waiters.find(
          (w) => w.id === selectedEmp.id || w.name.toLowerCase() === selectedEmp.name.toLowerCase()
        )
      : undefined;

    return scopeOrders.filter((o) => {
      const created = new Date(o.createdAt);
      const validDate = !Number.isNaN(created.getTime());

      if (dateRangeInfo.start && dateRangeInfo.end && validDate) {
        if (created < dateRangeInfo.start || created > dateRangeInfo.end) {
          return false;
        }
      }

      if (selectedShift !== 'all_day' && validDate) {
        const hour = created.getHours();
        if (selectedShift === 'morning' && (hour < 8 || hour >= 15)) return false;
        if (selectedShift === 'dinner' && hour < 15) return false;
      }

      // Role-level filtering
      if (activePersona === 'waiter') {
        if (selectedPersonaWaiter) {
          if (
            o.servingWaiterId !== selectedPersonaWaiter.id &&
            o.referralWaiterId !== selectedPersonaWaiter.id
          ) {
            return false;
          }
        } else {
          // All Waiters view: include orders attributed to any waiter
          if (!o.servingWaiterId && !o.referralWaiterId) {
            return false;
          }
        }
      } else if (activePersona === 'cashier') {
        // Counter / payment-settlement orders (exclude unsubmitted drafts)
        if (o.status === 'draft') {
          return false;
        }
        if (selectedEmp) {
          const empNameLower = selectedEmp.name.toLowerCase();
          const paymentMatch = o.payments?.some((tx) =>
            tx.receivedBy.toLowerCase().includes(empNameLower)
          );
          const actorMatch = o.statusHistory?.some((h) =>
            h.actor.toLowerCase().includes(empNameLower)
          );
          if (!paymentMatch && !actorMatch) return false;
        }
      } else if (activePersona === 'manager') {
        // Store Manager focuses on submitted kitchen/service orders (exclude unsubmitted drafts)
        if (o.status === 'draft') {
          return false;
        }
        if (selectedEmp && selectedEmp.role !== 'manager') {
          const empNameLower = selectedEmp.name.toLowerCase();
          const waiterMatch =
            matchedEmpWaiter &&
            (o.servingWaiterId === matchedEmpWaiter.id || o.referralWaiterId === matchedEmpWaiter.id);
          const paymentMatch = o.payments?.some((tx) =>
            tx.receivedBy.toLowerCase().includes(empNameLower)
          );
          const actorMatch = o.statusHistory?.some((h) =>
            h.actor.toLowerCase().includes(empNameLower)
          );
          if (!waiterMatch && !paymentMatch && !actorMatch) return false;
        } else if (selectedEmp && selectedEmp.role === 'manager') {
          // Branch manager oversees all orders in their branch
          if (o.tenantId !== currentTenant.id) return false;
        }
      } else if (selectedEmp) {
        if (selectedEmp.role === 'manager') {
          if (o.tenantId !== currentTenant.id) return false;
        } else {
          const empNameLower = selectedEmp.name.toLowerCase();
          const waiterMatch =
            matchedEmpWaiter &&
            (o.servingWaiterId === matchedEmpWaiter.id || o.referralWaiterId === matchedEmpWaiter.id);
          const paymentMatch = o.payments?.some((tx) =>
            tx.receivedBy.toLowerCase().includes(empNameLower)
          );
          const actorMatch = o.statusHistory?.some((h) =>
            h.actor.toLowerCase().includes(empNameLower)
          );
          if (!waiterMatch && !paymentMatch && !actorMatch) return false;
        }
      }

      return true;
    });
  }, [
    scopeOrders,
    dateRangeInfo,
    selectedShift,
    selectedEmployeeFilter,
    employees,
    waiters,
    activePersona,
    selectedPersonaWaiter,
    currentTenant.id,
  ]);

  const validFilteredOrders = useMemo(
    () =>
      filteredOrders.filter(
        (o) => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'rejected'
      ),
    [filteredOrders]
  );

  // Recipe lookup map for live BOM COGS calculations
  const recipeByMenuId = useMemo(() => {
    const map = new Map<string, number>();
    recipes.forEach((rec) => {
      if (!rec.menuItemId) return;
      const cost = computeRecipeUnitCost(rec.id).perPlateCost;
      map.set(rec.menuItemId, cost);
    });
    return map;
  }, [recipes, computeRecipeUnitCost]);

  const computeOrderCogs = (ord: Order) => {
    return ord.items.reduce((sum, item) => {
      if (item.status === 'rejected') return sum;
      const plateCost = recipeByMenuId.get(item.menuItemId) || 0;
      return sum + plateCost * item.quantity;
    }, 0);
  };

  // Live KPI Summary (strictly in TZS)
  const baseKpi = useMemo(() => {
    let grossSales = 0;
    let discounts = 0;
    let netSales = 0;
    let cogs = 0;
    let refunds = 0;

    filteredOrders.forEach((o) => {
      if (o.payments && o.payments.length > 0) {
        o.payments.forEach((tx) => {
          if (tx.isRefund) refunds += tx.amount;
        });
      }
    });

    validFilteredOrders.forEach((o) => {
      const disc = o.discount || 0;
      discounts += disc;
      netSales += o.total;
      grossSales += o.total + disc;
      cogs += computeOrderCogs(o);
    });

    const grossProfit = netSales - cogs - refunds;
    const marginPct = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;
    const waiterCommission =
      activePersona === 'waiter'
        ? validFilteredOrders
            .filter((o) => o.paymentStatus === 'paid')
            .reduce((s, o) => {
              const targetWaiterId =
                selectedPersonaWaiter?.id || o.servingWaiterId || o.referralWaiterId;
              return s + (targetWaiterId ? getOrderCommission(o, targetWaiterId).amount : 0);
            }, 0)
        : 0;
    const collectedTotal = validFilteredOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const outstandingTotal = validFilteredOrders.reduce(
      (s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)),
      0
    );

    return {
      grossSales,
      refunds,
      discounts,
      netSales,
      cogs,
      grossProfit,
      marginPct,
      waiterCommission,
      collectedTotal,
      outstandingTotal,
      receiptsCount: validFilteredOrders.length,
    };
  }, [
    filteredOrders,
    validFilteredOrders,
    recipeByMenuId,
    activePersona,
    selectedPersonaWaiter,
    getOrderCommission,
  ]);

  // Live Trend Series (by Days or Hours)
  const dailyData = useMemo(() => {
    const buckets = new Map<
      string,
      {
        sortKey: string;
        date: string;
        shortLabel: string;
        gross: number;
        discounts: number;
        net: number;
        cogs: number;
        profit: number;
        orders: number;
      }
    >();

    validFilteredOrders.forEach((o) => {
      const dt = new Date(o.createdAt);
      const validDt = !Number.isNaN(dt.getTime());
      let key = 'Unknown';
      let display = 'Unknown';
      let shortLabel = 'N/A';

      if (validDt) {
        if (chartStep === 'hours') {
          const hr = String(dt.getHours()).padStart(2, '0');
          key = `${hr}:00`;
          display = `${hr}:00 - ${hr}:59`;
          shortLabel = `${hr}:00`;
        } else {
          const y = dt.getFullYear();
          const m = String(dt.getMonth() + 1).padStart(2, '0');
          const d = String(dt.getDate()).padStart(2, '0');
          key = `${y}-${m}-${d}`;
          display = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          shortLabel = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      }

      const existing = buckets.get(key) || {
        sortKey: key,
        date: display,
        shortLabel,
        gross: 0,
        discounts: 0,
        net: 0,
        cogs: 0,
        profit: 0,
        orders: 0,
      };

      const disc = o.discount || 0;
      const oCogs = computeOrderCogs(o);
      existing.gross += o.total + disc;
      existing.discounts += disc;
      existing.net += o.total;
      existing.cogs += oCogs;
      existing.profit += o.total - oCogs;
      existing.orders += 1;

      buckets.set(key, existing);
    });

    return Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [validFilteredOrders, chartStep, recipeByMenuId]);

  // Live Sales by Salesperson / Waiter
  const salespersonData = useMemo(() => {
    return waiters.map((w) => {
      const wOrders = validFilteredOrders.filter(
        (o) => o.servingWaiterId === w.id || o.referralWaiterId === w.id
      );
      const grossSales = wOrders.reduce((s, o) => s + o.total + (o.discount || 0), 0);
      const discounts = wOrders.reduce((s, o) => s + (o.discount || 0), 0);
      const netSales = wOrders.reduce((s, o) => s + o.total, 0);
      const cogs = wOrders.reduce((s, o) => s + computeOrderCogs(o), 0);
      const paidOrders = wOrders.filter((o) => o.paymentStatus === 'paid');
      const commissionEarned = paidOrders.reduce(
        (s, o) => s + getOrderCommission(o, w.id).amount,
        0
      );
      const avgOrderSize = wOrders.length > 0 ? Math.round(netSales / wOrders.length) : 0;

      return {
        id: w.id,
        name: w.name,
        role: w.referralCode,
        ordersCount: wOrders.length,
        grossSales,
        discounts,
        netSales,
        cogs,
        commissionEarned,
        avgOrderSize,
        customerTips: 0,
        payoutStatus:
          wOrders.length === 0
            ? 'No Sales Yet'
            : commissionEarned > 0
            ? 'Commission Active'
            : 'Settled / Clear',
      };
    });
  }, [waiters, validFilteredOrders, recipeByMenuId, getOrderCommission]);

  // Live Sales by Order Type / Channel
  const orderTypeData = useMemo(() => {
    const channels: { type: string; code: Order['type'] }[] = [
      { type: 'Dine-in Service', code: 'dine_in' },
      { type: 'Takeaway / Pickup', code: 'pickup' },
      { type: 'Online Delivery', code: 'delivery' },
    ];
    const totalNetAll = validFilteredOrders.reduce((s, o) => s + o.total, 0);

    return channels.map((ch) => {
      const list = validFilteredOrders.filter((o) => o.type === ch.code);
      const discounts = list.reduce((s, o) => s + (o.discount || 0), 0);
      const net = list.reduce((s, o) => s + o.total, 0);
      const gross = net + discounts;
      const sharePct = totalNetAll > 0 ? Number(((net / totalNetAll) * 100).toFixed(1)) : 0;
      return {
        type: ch.type,
        code: ch.code,
        orders: list.length,
        gross,
        discounts,
        net,
        sharePct,
      };
    });
  }, [validFilteredOrders]);

  // Live Sales by Category & Dish
  const categoryData = useMemo(() => {
    const menuCatMap = new Map<string, string>();
    const catItemCounts = new Map<string, number>();

    menuItems.forEach((m) => {
      menuCatMap.set(m.id, m.category);
      catItemCounts.set(m.category, (catItemCounts.get(m.category) || 0) + 1);
    });

    const agg = new Map<
      string,
      { category: string; itemsCount: number; soldUnits: number; gross: number; cogs: number }
    >();

    menuItems.forEach((m) => {
      if (!agg.has(m.category)) {
        agg.set(m.category, {
          category: m.category,
          itemsCount: catItemCounts.get(m.category) || 0,
          soldUnits: 0,
          gross: 0,
          cogs: 0,
        });
      }
    });

    validFilteredOrders.forEach((ord) => {
      ord.items.forEach((it) => {
        if (it.status === 'rejected') return;
        const catName =
          menuCatMap.get(it.menuItemId) || (it.isCustomItem ? 'Custom / Off-Menu' : 'Other Dishes');
        const entry = agg.get(catName) || {
          category: catName,
          itemsCount: catItemCounts.get(catName) || 0,
          soldUnits: 0,
          gross: 0,
          cogs: 0,
        };
        const lineGross = it.price * it.quantity;
        const unitCogs = recipeByMenuId.get(it.menuItemId) || 0;
        entry.soldUnits += it.quantity;
        entry.gross += lineGross;
        entry.cogs += unitCogs * it.quantity;
        agg.set(catName, entry);
      });
    });

    return Array.from(agg.values())
      .filter((row) => row.soldUnits > 0 || row.itemsCount > 0)
      .map((row) => {
        const profit = row.gross - row.cogs;
        const margin = row.gross > 0 ? Number(((profit / row.gross) * 100).toFixed(1)) : 0;
        return { ...row, profit, margin };
      })
      .sort((a, b) => b.gross - a.gross);
  }, [validFilteredOrders, menuItems, recipeByMenuId]);

  // Live Sales by Payment Method
  const paymentMethodData = useMemo(() => {
    let cardAmt = 0;
    let cardCnt = 0;
    let cashAmt = 0;
    let cashCnt = 0;
    let mobileAmt = 0;
    let mobileCnt = 0;

    validFilteredOrders.forEach((ord) => {
      if (ord.payments && ord.payments.length > 0) {
        ord.payments.forEach((tx) => {
          if (tx.isRefund) return;
          if (tx.method === 'card') {
            cardAmt += tx.amount;
            cardCnt += 1;
          } else if (tx.method === 'cash') {
            cashAmt += tx.amount;
            cashCnt += 1;
          } else if (tx.method === 'mpesa' || tx.method === 'airtel') {
            mobileAmt += tx.amount;
            mobileCnt += 1;
          }
        });
      } else if ((ord.paidAmount || 0) > 0) {
        if (ord.paymentMethod === 'card') {
          cardAmt += ord.paidAmount;
          cardCnt += 1;
        } else if (ord.paymentMethod === 'cash') {
          cashAmt += ord.paidAmount;
          cashCnt += 1;
        } else if (ord.paymentMethod === 'mpesa' || ord.paymentMethod === 'airtel') {
          mobileAmt += ord.paidAmount;
          mobileCnt += 1;
        }
      }
    });

    const totalCollected = cardAmt + cashAmt + mobileAmt;
    const shareStr = (amt: number) =>
      totalCollected > 0 ? `${((amt / totalCollected) * 100).toFixed(1)}%` : '0.0%';

    return [
      {
        method: 'Credit / Debit Card',
        orders: cardCnt,
        gross: cardAmt,
        fee: Math.round(cardAmt * 0.015),
        share: shareStr(cardAmt),
      },
      {
        method: 'Cash Drawer',
        orders: cashCnt,
        gross: cashAmt,
        fee: 0,
        share: shareStr(cashAmt),
      },
      {
        method: 'Mobile Money (M-Pesa / Airtel)',
        orders: mobileCnt,
        gross: mobileAmt,
        fee: Math.round(mobileAmt * 0.01),
        share: shareStr(mobileAmt),
      },
    ];
  }, [validFilteredOrders]);

  // SVG Chart Dimensions & Dynamic Scaling
  const chartW = 900;
  const chartH = 220;
  const rawMaxGross = dailyData.reduce((mx, d) => Math.max(mx, d.gross), 0);
  const maxGross = rawMaxGross > 0 ? Math.ceil(rawMaxGross * 1.15) : 100000;

  const points = useMemo(() => {
    if (dailyData.length === 0) return [];
    return dailyData.map((d, index) => {
      const x =
        dailyData.length === 1
          ? chartW / 2
          : (index / (dailyData.length - 1)) * (chartW - 60) + 30;
      const y = chartH - (d.gross / maxGross) * (chartH - 40) - 20;
      return { x, y, data: d };
    });
  }, [dailyData, maxGross]);

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

  const chartBottomLabels = useMemo(() => {
    if (dailyData.length === 0) return [];
    if (dailyData.length <= 7) return dailyData.map((d) => d.shortLabel);
    const step = (dailyData.length - 1) / 6;
    return Array.from({ length: 7 }, (_, i) => dailyData[Math.round(i * step)].shortLabel);
  }, [dailyData]);

  // Live Today Operations & EOD Financial Reconciliation (computed directly from filteredOrders)
  const liveOps = useMemo(() => {
    const activeNonDraft = filteredOrders.filter(
      (o) => o.status !== 'draft' && o.status !== 'cancelled' && o.status !== 'rejected'
    );
    const drafts = filteredOrders.filter((o) => o.status === 'draft');
    const cancelled = filteredOrders.filter((o) => o.status === 'cancelled' || o.status === 'rejected');
    const outstandingOrders = activeNonDraft.filter(
      (o) => Math.max(0, o.total - (o.paidAmount || 0)) > 0
    );
    const totalSales = activeNonDraft.reduce((s, o) => s + o.total, 0);
    const totalCollected = activeNonDraft.reduce((s, o) => s + (o.paidAmount || 0), 0);
    const outstandingAmount = outstandingOrders.reduce(
      (s, o) => s + Math.max(0, o.total - (o.paidAmount || 0)),
      0
    );
    const draftAmount = drafts.reduce((s, o) => s + o.total, 0);
    const cancelledAmount = cancelled.reduce((s, o) => s + (o.originalAmount || o.total), 0);
    const customItemsCount = filteredOrders.reduce(
      (s, o) => s + o.items.filter((i) => i.isCustomItem).length,
      0
    );

    // Breakdown by tender method from Transaction records (fallback to paymentMethod when payments[] absent)
    let cashCollected = 0;
    let mpesaCollected = 0;
    let airtelCollected = 0;
    let cardCollected = 0;
    let refundsTotal = 0;
    let discountsTotal = 0;
    let rejectedItemsValue = 0;

    filteredOrders.forEach((ord) => {
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

    const visibleWaiters =
      activePersona === 'waiter' && selectedPersonaWaiter
        ? waiters.filter((w) => w.id === selectedPersonaWaiter.id)
        : waiters;

    const perWaiter = visibleWaiters.map((w) => {
      const wOrders = filteredOrders.filter(
        (o) => o.servingWaiterId === w.id || o.referralWaiterId === w.id
      );
      const wDrafts = wOrders.filter((o) => o.status === 'draft');
      const wInKitchen = wOrders.filter((o) =>
        ['sent_to_kitchen', 'accepted', 'preparing', 'ready'].includes(o.status)
      );
      const wServedUnpaid = wOrders.filter(
        (o) => o.status === 'served' && o.paymentStatus !== 'paid'
      );
      const wPaid = wOrders.filter(
        (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled'
      );
      const wCancelled = wOrders.filter(
        (o) => o.status === 'cancelled' || o.status === 'rejected'
      );
      const wCustomCount = wOrders.reduce(
        (s, o) => s + o.items.filter((i) => i.isCustomItem).length,
        0
      );
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
  }, [filteredOrders, waiters, activePersona, selectedPersonaWaiter, getOrderCommission]);

  // Export CSV handler
  const handleExportCsv = () => {
    let rows: string[][] = [];

    if (activeDimension === 'daily_trend') {
      rows = [
        ['Date', 'Gross Sales', 'Discounts', 'Net Sales', 'Cost of Goods', 'Gross Profit', 'Orders'],
        ...dailyData.map((d) => [
          d.date,
          formatRawNumber(d.gross).replace(/,/g, ''),
          formatRawNumber(d.discounts).replace(/,/g, ''),
          formatRawNumber(d.net).replace(/,/g, ''),
          formatRawNumber(d.cogs).replace(/,/g, ''),
          formatRawNumber(d.profit).replace(/,/g, ''),
          d.orders.toString(),
        ]),
      ];
    } else if (activeDimension === 'by_salesperson') {
      rows = [
        ['Salesperson', 'Code', 'Orders', 'Gross Sales', 'Discounts', 'Net Sales', 'Commission', 'Avg Order'],
        ...salespersonData.map((s) => [
          s.name,
          s.role,
          s.ordersCount.toString(),
          formatRawNumber(s.grossSales).replace(/,/g, ''),
          formatRawNumber(s.discounts).replace(/,/g, ''),
          formatRawNumber(s.netSales).replace(/,/g, ''),
          formatRawNumber(s.commissionEarned).replace(/,/g, ''),
          formatRawNumber(s.avgOrderSize).replace(/,/g, ''),
        ]),
      ];
    } else {
      rows = [
        ['Channel', 'Orders Count', 'Gross Sales', 'Discounts', 'Net Sales', 'Share %'],
        ...orderTypeData.map((o) => [
          o.type,
          o.orders.toString(),
          formatRawNumber(o.gross).replace(/,/g, ''),
          formatRawNumber(o.discounts).replace(/,/g, ''),
          formatRawNumber(o.net).replace(/,/g, ''),
          `${o.sharePct}%`,
        ]),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `RestaurantOS_${currentTenant.branchCode}_${activeDimension}_Report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ActivePersonaIcon = personaMeta[activePersona].icon;

  return (
    <div className="min-h-screen bg-neutral-100/80 text-neutral-900 font-sans pb-12">
      {/* ================= CLEAN GREEN SECTION HEADER WITH SINGLE ROLE SWITCH BUTTON ================= */}
      <div className="bg-[#43A047] text-white px-4 sm:px-6 h-15 flex items-center justify-between gap-4 shadow-xs sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveRole('cashier')}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors cursor-pointer shrink-0"
            title="Switch back to Cashier POS"
            aria-label="Back to Cashier POS"
          >
            <RotateCcw className="w-4 h-4 text-white" />
          </button>
          <div className="min-w-0 flex items-baseline gap-2.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              {personaMeta[activePersona].headerTitle}
            </h1>
            <span className="hidden md:inline text-xs font-medium text-white/85 truncate">
              {currentOrganization.name} ·{' '}
              {viewScope === 'hq_overview'
                ? `All ${tenants.length} Branches`
                : `${currentTenant.name} (${currentTenant.branchCode})`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {viewScope === 'branch' && (
            <button
              type="button"
              onClick={switchToHqOverview}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>Main HQ</span>
            </button>
          )}

          {/* Single Clean Role Switch Button */}
          <div className="relative" ref={roleSwitcherRef}>
            <button
              type="button"
              onClick={() => setIsRoleSwitcherOpen((prev) => !prev)}
              aria-expanded={isRoleSwitcherOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-neutral-900 hover:bg-neutral-100 text-xs font-bold shadow-xs whitespace-nowrap transition-colors cursor-pointer"
            >
              <ActivePersonaIcon className="w-4 h-4 text-[#2E7D32] shrink-0" />
              <span>{personaMeta[activePersona].shortLabel}</span>
              <ChevronDown
                className={`w-4 h-4 text-neutral-500 transition-transform duration-150 ${
                  isRoleSwitcherOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isRoleSwitcherOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-72 bg-white text-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 p-2 z-50 space-y-1"
              >
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                  Switch Dashboard Role
                </div>
                {(Object.keys(personaMeta) as PersonaView[]).map((roleKey) => {
                  const meta = personaMeta[roleKey];
                  const Icon = meta.icon;
                  const selected = activePersona === roleKey;
                  return (
                    <button
                      key={roleKey}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => handleSelectPersona(roleKey)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between gap-2.5 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
                          : 'hover:bg-neutral-50 text-neutral-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            selected
                              ? 'bg-[#43A047] text-white'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold leading-tight">{meta.label}</div>
                          <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
                            {meta.description}
                          </div>
                        </div>
                      </div>
                      {selected && <Check className="w-4 h-4 text-[#43A047] shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= ROLE-AWARE FILTER TOOLBAR ================= */}
      <div className="bg-white border-b border-neutral-200/90 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Functional Filters Left */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-700">
            {/* Live Date Range Selector */}
            <div className="flex items-center bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-xl px-3 py-1.5 font-medium transition-colors">
              <Calendar className="w-4 h-4 text-neutral-500 mr-2 shrink-0" />
              <button
                type="button"
                onClick={() => cycleDatePreset(-1)}
                className="hover:text-neutral-950 font-mono text-xs px-1 cursor-pointer"
                aria-label="Previous date range"
              >
                &lt;
              </button>
              <span className="font-semibold text-neutral-900 px-1.5 font-mono text-xs whitespace-nowrap">
                {dateRangeInfo.label}
              </span>
              <button
                type="button"
                onClick={() => cycleDatePreset(1)}
                className="hover:text-neutral-950 font-mono text-xs px-1 cursor-pointer"
                aria-label="Next date range"
              >
                &gt;
              </button>
            </div>

            {/* Shift Filter */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              aria-label="Shift filter"
              className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
            >
              <option value="all_day">All day</option>
              <option value="morning">Morning Shift (08:00 - 15:00)</option>
              <option value="dinner">Dinner Shift (15:00 - 23:30)</option>
            </select>

            {/* Branch Scope Filter */}
            <select
              value={viewScope === 'hq_overview' ? 'all_stores' : currentTenant.id}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedEmployeeFilter('all_employees');
                if (val === 'all_stores') {
                  switchToHqOverview();
                } else {
                  setCurrentTenantId(val);
                }
              }}
              aria-label="Branch scope filter"
              className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
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

            {/* Role-Aware Staff / Waiter Filter */}
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              aria-label="Role staff filter"
              className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
            >
              <option value="all_employees">
                {activePersona === 'waiter' && `All Waiters (${rolePersonOptions.length})`}
                {activePersona === 'cashier' && `All Cashiers (${rolePersonOptions.length})`}
                {activePersona === 'manager' && `All Operations Staff (${rolePersonOptions.length})`}
                {activePersona === 'boss' && `All Employees (${rolePersonOptions.length})`}
              </option>
              {rolePersonOptions.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </select>
          </div>

          {/* Order Tax Config (Right) */}
          {activePersona !== 'waiter' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs shrink-0">
              <Percent className="w-3.5 h-3.5 text-neutral-500" />
              <span className="font-semibold text-neutral-700">Order Tax:</span>
              <button
                type="button"
                onClick={() => setTaxEnabled(!taxEnabled)}
                className={`px-2.5 py-0.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
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
                  className="bg-white border border-neutral-200 rounded-lg px-2 py-0.5 text-xs font-mono font-bold text-neutral-800 outline-hidden cursor-pointer"
                  aria-label="VAT Rate Percentage"
                >
                  <option value={10}>10%</option>
                  <option value={15}>15%</option>
                  <option value={18}>18%</option>
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ================= ROLE-ADAPTED TOP COMMAND / SUMMARY SECTION ================= */}
        {activePersona === 'boss' && viewScope === 'hq_overview' ? (
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
        ) : activePersona === 'boss' ? (
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
        ) : activePersona === 'manager' ? (
          <div className="bg-white rounded-2xl border border-neutral-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Briefcase className="w-4 h-4 text-[#43A047]" />
                <span className="text-sm font-extrabold text-neutral-900">
                  Store Manager Operations &amp; Kitchen BOM Costing
                </span>
                <span className="text-xs text-neutral-500">
                  · {viewScope === 'hq_overview' ? `All ${tenants.length} Branches` : currentTenant.name}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Showing submitted kitchen &amp; service orders, food COGS margin, pending approvals ({approvalRequests.filter((r) => r.status === 'pending').length}), and active production batches ({productionLogs.filter((l) => l.status !== 'reversed').length}).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRole('manager')}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Package className="w-4 h-4" />
              <span>Open Inventory &amp; BOM</span>
            </button>
          </div>
        ) : activePersona === 'cashier' ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#43A047]" />
                <span className="text-sm font-extrabold text-neutral-900">
                  Cashier Register &amp; Settlement Audit
                </span>
                <span className="text-xs text-neutral-500">
                  · {viewScope === 'hq_overview' ? `All ${tenants.length} Branches` : `${currentTenant.name} (${currentTenant.branchCode})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveRole('cashier')}
                className="px-3.5 py-2 rounded-xl bg-[#43A047] hover:bg-[#388E3C] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Banknote className="w-4 h-4" />
                <span>Open Cashier POS</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-neutral-500">Cash Tender Collected</div>
                <div className="font-mono font-extrabold text-sm text-neutral-900 mt-1 tabular-nums">
                  {formatMoney(liveOps.cashCollected)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-neutral-500">M-Pesa &amp; Airtel</div>
                <div className="font-mono font-extrabold text-sm text-blue-700 mt-1 tabular-nums">
                  {formatMoney(liveOps.mpesaCollected + liveOps.airtelCollected)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="text-neutral-500">Card Settlements</div>
                <div className="font-mono font-extrabold text-sm text-neutral-900 mt-1 tabular-nums">
                  {formatMoney(liveOps.cardCollected)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-emerald-800 font-semibold">Expected Cash in Drawer</div>
                <div className="font-mono font-extrabold text-sm text-emerald-900 mt-1 tabular-nums">
                  {formatMoney(cashierShift.openingCash + liveOps.cashCollected - liveOps.refundsTotal)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCheck className="w-4 h-4 text-[#43A047]" />
                <span className="text-sm font-extrabold text-neutral-900">
                  {selectedPersonaWaiter
                    ? `${selectedPersonaWaiter.name} (${selectedPersonaWaiter.referralCode}) — Waiter Ledger`
                    : 'All Waiters — Attributed Sales & Commissions'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Commission rate:{' '}
                <strong className="text-neutral-800">
                  {defaultCommissionMode === 'percent'
                    ? `${defaultCommissionValue}% of paid net sales`
                    : `${formatMoney(defaultCommissionValue)} per paid order`}
                </strong>{' '}
                · Filtered to waiter-attributed orders across selected dates &amp; shift.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveRole('waiter')}
              className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Waiter Portal</span>
            </button>
          </div>
        )}

        {/* ================= LIVE TODAY OPERATIONS & ACCOUNTABILITY OVERVIEW (FILTERED) ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-neutral-200">
            <div className="text-[11px] text-neutral-500 font-medium">
              {activePersona === 'waiter' ? 'Waiter Live Sales' : 'Filtered Live Sales'}
            </div>
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
            <div className="text-[11px] text-amber-800 mt-0.5">
              {activePersona === 'cashier' || activePersona === 'manager'
                ? 'Excluded in counter view'
                : 'Visible in scope'}
            </div>
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

        {/* ================= 5 KPI CARDS STRIP ================= */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Gross sales Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Gross sales</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(baseKpi.grossSales)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium mt-1">
              {baseKpi.receiptsCount > 0 ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">{baseKpi.receiptsCount} settled/active tickets</span>
                </>
              ) : (
                <span>No sales recorded yet</span>
              )}
            </div>
          </div>

          {/* Refunds Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Refunds</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(baseKpi.refunds)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium mt-1">
              <span>{baseKpi.refunds > 0 ? 'Refunded transactions' : 'No refunds issued'}</span>
            </div>
          </div>

          {/* Discounts Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">Discounts</div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(baseKpi.discounts)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium mt-1">
              <span className={baseKpi.discounts > 0 ? 'text-rose-700' : 'text-neutral-400'}>
                {baseKpi.discounts > 0 ? 'Approved promos & courtesy' : 'No discounts applied'}
              </span>
            </div>
          </div>

          {/* Net sales / Collected Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="text-xs text-neutral-500 font-medium">
              {activePersona === 'cashier' ? 'Total Collected' : 'Net sales'}
            </div>
            <div className="text-lg sm:text-2xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
              {formatVal(activePersona === 'cashier' ? baseKpi.collectedTotal : baseKpi.netSales)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium mt-1">
              {(activePersona === 'cashier' ? baseKpi.collectedTotal : baseKpi.netSales) > 0 ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">
                    {activePersona === 'cashier' ? 'Settled payments' : 'Filtered net total'}
                  </span>
                </>
              ) : (
                <span>Awaiting first order</span>
              )}
            </div>
          </div>

          {/* Gross profit / Earned Commission / Outstanding Card */}
          <div className="bg-white rounded-xl p-4 border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow col-span-2 md:col-span-1">
            <div className="text-xs text-neutral-500 font-medium">
              {activePersona === 'waiter'
                ? 'Earned Commission'
                : activePersona === 'cashier'
                ? 'Outstanding Due'
                : 'Gross profit'}
            </div>
            <div
              className={`text-lg sm:text-2xl font-bold font-mono mt-1 tabular-nums ${
                activePersona === 'cashier' && baseKpi.outstandingTotal > 0
                  ? 'text-rose-700'
                  : 'text-[#43A047]'
              }`}
            >
              {formatVal(
                activePersona === 'waiter'
                  ? baseKpi.waiterCommission
                  : activePersona === 'cashier'
                  ? baseKpi.outstandingTotal
                  : baseKpi.grossProfit
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <span>
                {activePersona === 'waiter'
                  ? defaultCommissionMode === 'percent'
                    ? `${defaultCommissionValue}% paid net sales`
                    : `${formatMoney(defaultCommissionValue)} / paid order`
                  : activePersona === 'cashier'
                  ? baseKpi.outstandingTotal > 0
                    ? 'Open counter balances'
                    : 'All billed orders settled'
                  : `${baseKpi.marginPct}% food margin · COGS ${formatVal(baseKpi.cogs)}`}
              </span>
            </div>
          </div>
        </div>

        {/* ================= INTERACTIVE CHART VIEW ================= */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-4">
          {/* Chart Header & Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                {activePersona === 'waiter' ? 'Waiter Sales Trend' : 'Gross Sales Trend'}
              </h3>
              <p className="text-xs text-neutral-400">
                {dailyData.length > 0
                  ? `Live ${dateRangeInfo.label} performance across ${dailyData.length} active ${
                      chartStep === 'days' ? 'service days' : 'hours'
                    }`
                  : `No live sales recorded for ${dateRangeInfo.label} yet`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'area' | 'line' | 'bar')}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-hidden"
              >
                <option value="area">Area</option>
                <option value="line">Line</option>
                <option value="bar">Bar</option>
              </select>

              <select
                value={chartStep}
                onChange={(e) => setChartStep(e.target.value as 'days' | 'hours')}
                className="bg-neutral-100 border border-neutral-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-neutral-700 outline-hidden"
              >
                <option value="days">Days</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>

          {/* SVG Canvas Area / Line / Bar Chart */}
          <div className="relative w-full overflow-x-auto">
            {dailyData.length === 0 ? (
              <div className="h-44 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/70 flex flex-col items-center justify-center text-center px-4 space-y-1.5">
                <TrendingUp className="w-6 h-6 text-neutral-300" />
                <div className="text-xs font-bold text-neutral-700">
                  No sales activity in {currentTenant.name} for this filter yet
                </div>
                <p className="text-[11px] text-neutral-500 max-w-md">
                  Orders placed from Cashier POS, Waiter App, or Customer Portal will immediately chart here.
                </p>
              </div>
            ) : (
              <div className="min-w-[700px] sm:min-w-full">
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-56 sm:h-64 select-none"
                >
                  <defs>
                    <linearGradient id="loyverseGreenGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#43A047" stopOpacity="0.45" />
                      <stop offset="70%" stopColor="#81C784" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const valTzs = Math.round(maxGross * ratio);
                    const y = chartH - ratio * (chartH - 40) - 20;
                    const displayTick =
                      currency === 'USD'
                        ? `$${(valTzs / currentTenant.currencyRate).toFixed(0)}`
                        : valTzs === 0
                        ? 'TZS 0'
                        : valTzs >= 1000000
                        ? `TZS ${(valTzs / 1000000).toFixed(1)}M`
                        : `TZS ${Math.round(valTzs / 1000)}k`;
                    return (
                      <g key={ratio}>
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
                          {displayTick}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bar mode */}
                  {chartType === 'bar' &&
                    points.map((p, idx) => {
                      const barW = Math.max(12, Math.min(44, (chartW - 100) / Math.max(points.length, 1) * 0.6));
                      const barH = Math.max(2, chartH - 20 - p.y);
                      return (
                        <rect
                          key={idx}
                          x={p.x - barW / 2}
                          y={p.y}
                          width={barW}
                          height={barH}
                          rx="4"
                          fill={hoveredDataPoint?.date === p.data.date ? '#1B5E20' : '#43A047'}
                          className="cursor-pointer transition-colors"
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
                      );
                    })}

                  {/* Area & Line modes */}
                  {chartType === 'area' && <path d={svgAreaD} fill="url(#loyverseGreenGradient)" />}
                  {chartType !== 'bar' && points.length > 1 && (
                    <path
                      d={svgPathD}
                      fill="none"
                      stroke="#43A047"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points */}
                  {chartType !== 'bar' &&
                    points.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p.x}
                        cy={p.y}
                        r={hoveredDataPoint?.date === p.data.date ? 5 : 3.5}
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

                {/* Bottom Dynamic Date Labels */}
                <div className="flex justify-between px-4 pt-1 text-[10px] text-neutral-400 font-mono">
                  {chartBottomLabels.map((lbl, idx) => (
                    <span key={`${lbl}-${idx}`}>{lbl}</span>
                  ))}
                </div>
              </div>
            )}

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

          {/* ================= TABLE 1: DAILY SALES SUMMARY ================= */}
          {activeDimension === 'daily_trend' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-100/80 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-200 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">{chartStep === 'days' ? 'Date' : 'Hour Window'}</th>
                    <th className="py-3 px-4 text-right">Gross sales</th>
                    <th className="py-3 px-4 text-right">Discounts</th>
                    <th className="py-3 px-4 text-right">Net sales</th>
                    <th className="py-3 px-4 text-right">Cost of goods</th>
                    <th className="py-3 px-4 text-right">Gross profit</th>
                    <th className="py-3 px-4 text-right">Receipts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {dailyData.filter((d) => d.date.toLowerCase().includes(tableSearch.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center font-sans text-neutral-500">
                        No sales records match the current filter.
                      </td>
                    </tr>
                  ) : (
                    dailyData
                      .filter((d) => d.date.toLowerCase().includes(tableSearch.toLowerCase()))
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-medium text-neutral-900">
                            {row.date}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">{formatRawNumber(row.gross)}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-neutral-500">
                            {row.discounts > 0 ? `-${formatRawNumber(row.discounts)}` : '0'}
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
                      ))
                  )}
                </tbody>
                <tfoot className="bg-neutral-100 font-bold border-t border-neutral-200 font-mono text-neutral-900">
                  <tr>
                    <td className="py-3 px-4 font-sans">
                      Total ({dailyData.length} {chartStep === 'days' ? 'Days' : 'Hours'})
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatVal(baseKpi.grossSales)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-rose-700">
                      {baseKpi.discounts > 0 ? `-${formatVal(baseKpi.discounts)}` : formatVal(0)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatVal(baseKpi.netSales)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-neutral-600">
                      {formatVal(baseKpi.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums text-[#2E7D32]">
                      {formatVal(baseKpi.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-sans">
                      {baseKpi.receiptsCount.toLocaleString()}
                    </td>
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
                    <th className="py-3 px-4">Referral Code</th>
                    <th className="py-3 px-4 text-right">Orders Taken</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                    <th className="py-3 px-4 text-right">Earned Commission</th>
                    <th className="py-3 px-4 text-right">Customer Tips</th>
                    <th className="py-3 px-4 text-right">Avg Ticket</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-mono text-neutral-800">
                  {salespersonData.filter((sp) => sp.name.toLowerCase().includes(tableSearch.toLowerCase())).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 px-4 text-center font-sans text-neutral-500">
                        No waiters registered for this branch yet. Add waiters in Staff &amp; Payroll.
                      </td>
                    </tr>
                  ) : (
                    salespersonData
                      .filter((sp) => sp.name.toLowerCase().includes(tableSearch.toLowerCase()))
                      .map((sp) => (
                        <tr key={sp.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-neutral-900 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[11px]">
                              {sp.name[0] || '?'}
                            </div>
                            <span>{sp.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-neutral-500">{sp.role}</td>
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
                      ))
                  )}
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
                  {categoryData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 px-4 text-center font-sans text-neutral-500">
                        No menu categories or dish sales recorded for this branch yet.
                      </td>
                    </tr>
                  ) : (
                    categoryData.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 font-sans font-bold text-neutral-900">{cat.category}</td>
                        <td className="py-3 px-4 text-right font-sans">{cat.itemsCount}</td>
                        <td className="py-3 px-4 text-right font-sans font-semibold">{cat.soldUnits}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatVal(cat.gross)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-neutral-500">{formatVal(cat.cogs)}</td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-[#2E7D32]">{formatVal(cat.profit)}</td>
                        <td className="py-3 px-4 text-right font-sans font-bold text-emerald-700">{cat.margin}%</td>
                      </tr>
                    ))
                  )}
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
                  <span className="font-bold text-neutral-900">Active Shift Orders &amp; Service Coupons</span>
                  <span className="font-mono text-[11px] text-neutral-500">{validFilteredOrders.length} tickets</span>
                </div>
                <div className="divide-y divide-neutral-100 text-xs">
                  {validFilteredOrders.length === 0 ? (
                    <div className="px-4 py-6 text-center text-neutral-500">
                      No shift tickets match the active filter.
                    </div>
                  ) : (
                    validFilteredOrders.slice(0, 12).map((o) => (
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
                    ))
                  )}
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
                      {liveOps.perWaiter.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-6 px-4 text-center text-neutral-500">
                            No waiter accounts configured for {currentTenant.name} yet.
                          </td>
                        </tr>
                      ) : (
                        liveOps.perWaiter.map((row) => (
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
                      )))}
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
