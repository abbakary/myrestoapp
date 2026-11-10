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
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order, Role } from '../../types/restaurant';

type ReportDimension =
  | 'daily_trend'
  | 'by_salesperson'
  | 'by_order_type'
  | 'by_category'
  | 'by_payment'
  | 'cashier_shift';

type PersonaView = 'boss' | 'manager' | 'cashier' | 'waiter';

export const OwnerDashboardView: React.FC = () => {
  const {
    currentTenant,
    tenants,
    setCurrentTenantId,
    orders,
    waiters,
    employees,
    cashierShift,
    formatMoney,
    currency,
    toggleCurrency,
    setActiveRole,
  } = useRestaurant();

  // User type / persona view selector as requested: "based on user types each must see their respective report"
  const [activePersona, setActivePersona] = useState<PersonaView>('boss');

  // Filter dimensions
  const [activeDimension, setActiveDimension] = useState<ReportDimension>('daily_trend');
  const [dateRangePreset, setDateRangePreset] = useState<string>('this_month');
  const [selectedShift, setSelectedShift] = useState<string>('all_day');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all_stores');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all_employees');
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
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white drop-shadow-xs">
            Sales summary
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Store Filter: All stores ▾ */}
            <div className="relative">
              <select
                value={selectedStoreFilter}
                onChange={(e) => setSelectedStoreFilter(e.target.value)}
                className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
              >
                <option value="all_stores">All stores</option>
                <option value="savanna">Savanna Flame Grill (Main)</option>
                <option value="kona">Kona Chips (Sinza)</option>
              </select>
            </div>

            {/* Employee Filter: All employees ▾ */}
            <div className="relative">
              <select
                value={selectedEmployeeFilter}
                onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                className="bg-neutral-100 hover:bg-neutral-200/70 border border-neutral-300/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-800 outline-hidden cursor-pointer"
              >
                <option value="all_employees">All employees</option>
                <option value="john">John Mwamba (Waiter)</option>
                <option value="sarah">Sarah Kimani (Waiter)</option>
                <option value="peter">Peter Masawe (Waiter)</option>
                <option value="tony">Tony Danza (Cashier)</option>
              </select>
            </div>
          </div>

          {/* Quick Info Badge based on Persona */}
          <div className="text-xs font-medium text-neutral-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {activePersona === 'boss' && 'Role: Executive Owner & Boss (Enterprise View)'}
              {activePersona === 'manager' && 'Role: Store Manager (Shift & Kitchen Costing)'}
              {activePersona === 'cashier' && 'Role: Cashier Terminal 01 (Register Audit)'}
              {activePersona === 'waiter' && 'Role: John Mwamba (5% Personal Commission)'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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
              <span>{activePersona === 'waiter' ? '5% attributed sales' : `${baseKpi.profitChangePct} (${baseKpi.marginPct}% margin)`}</span>
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
                        ${val}
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
                  Shift opened today at {cashierShift.openedAt} by Cashier Tony Danza. No void discrepancies detected.
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
    </div>
  );
};
