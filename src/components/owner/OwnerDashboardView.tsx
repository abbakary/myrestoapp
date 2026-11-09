import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Users,
  Award,
  Calendar,
  Layers,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  Download,
  Smartphone,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';

export const OwnerDashboardView: React.FC = () => {
  const {
    currentTenant,
    orders,
    waiters,
    calculateWaiterStats,
    formatMoney,
    currency,
    setActiveRole,
  } = useRestaurant();

  const [timeRange, setTimeRange] = useState<'today' | 'this_week' | 'this_month' | 'year'>('year');
  const [showMobileDeviceMockup, setShowMobileDeviceMockup] = useState(false);

  // Exact figures matching image_84342e49.png:
  // "Total earning $ 5,595,325"
  const totalEarningUsd = 5595325;
  const grossSalesTzs = totalEarningUsd * currentTenant.currencyRate;
  const cogsTzs = Math.round(grossSalesTzs * 0.288); // 28.8% food cost
  const grossProfitTzs = grossSalesTzs - cogsTzs;
  const opexTzs = Math.round(grossSalesTzs * 0.218);
  const netProfitTzs = grossProfitTzs - opexTzs;
  const netMarginPct = 3.8; // "+3.8% ↑" in image_84342e49.png

  // Chart data matching image_84342e49.png (Sales Figures 0 - 800 range)
  const salesFigures = [
    { month: 'Jan', bars: 200, line: 420 },
    { month: 'Feb', bars: 300, line: 550 },
    { month: 'Mar', bars: 250, line: 480 },
    { month: 'Apr', bars: 410, line: 620 },
    { month: 'May', bars: 380, line: 530 },
    { month: 'Jun', bars: 470, line: 490 },
    { month: 'Jul', bars: 520, line: 580 },
    { month: 'Aug', bars: 440, line: 650 },
    { month: 'Sep', bars: 580, line: 710 },
    { month: 'Oct', bars: 660, line: 780 },
    { month: 'Nov', bars: 720, line: 810 },
    { month: 'Dec', bars: 790, line: 850 },
  ];

  // Products sale bars
  const productSaleBars = [30, 45, 60, 40, 85, 70, 95, 65, 80, 50, 75, 90];

  // Last Transactions from image_84342e49.png
  const lastTransactions = [
    {
      id: 'tx-1',
      name: 'Lavash Roll Wrap',
      date: '20/01/2026',
      amount: 45000,
      image: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
      status: 'Completed',
    },
    {
      id: 'tx-2',
      name: 'Meat Soup Bowl Special',
      date: '21/01/2026',
      amount: 32000,
      image: '/src/assets/images/dish_seafood_platter_1794223269678.jpg',
      status: 'Completed',
    },
    {
      id: 'tx-3',
      name: 'Grilled Salmon Steak',
      date: '22/01/2026',
      amount: 78000,
      image: '/src/assets/images/dish_grilled_salmon_1794223268825.jpg',
      status: 'Completed',
    },
    {
      id: 'tx-4',
      name: 'Classic Chips Mayai Deluxe',
      date: '23/01/2026',
      amount: 26000,
      image: '/src/assets/images/dish_chips_mayai_1794223268664.jpg',
      status: 'Completed',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-100/70 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner with Device Mockup Launcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
            Executive Overview & Sales Growth
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time multi-tenant restaurant financials, products sales & waiter referral conversions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileDeviceMockup(!showMobileDeviceMockup)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-950 bg-orange-100 hover:bg-orange-200 border border-orange-200 rounded-xl transition-colors shadow-xs"
          >
            <Smartphone className="w-3.5 h-3.5 text-orange-600" />
            <span>{showMobileDeviceMockup ? 'Hide Phone Frame' : 'Show Mobile App Frames'}</span>
          </button>

          <button
            onClick={() => alert('Executive P&L summary exported as CSV.')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export BI</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Total Earning Card & Sales Figures (Directly matching image_84342e49.png) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: Total Earning Orange Card with View More and Smooth Wave */}
        <div className="lg:col-span-5 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-500 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90 tracking-wide">
                Total earning
              </span>
              <div className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Total Earning Figure */}
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono">
              {currency === 'USD' ? `$ 5,595,325` : formatMoney(grossSalesTzs)}
            </div>

            {/* View More White Pill Button matching image_84342e49.png */}
            <div className="pt-2">
              <button
                onClick={() => setActiveRole('cashier')}
                className="py-2 px-5 bg-white text-orange-600 hover:bg-orange-50 text-xs font-extrabold rounded-full transition-all shadow-sm hover:shadow"
              >
                View more
              </button>
            </div>
          </div>

          {/* Bottom Wave & Total Profit +3.8% ↑ matching screenshot */}
          <div className="relative z-10 pt-8 mt-6">
            <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
              <span>Total Profit</span>
              <span className="flex items-center gap-1 text-white font-mono text-sm">
                +3.8% ↑
              </span>
            </div>

            {/* Smooth glowing SVG wave curve */}
            <div className="w-full h-16 relative">
              <svg
                viewBox="0 0 300 70"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <path
                  d="M 0 50 Q 50 15, 100 40 T 200 20 T 300 10 L 300 70 L 0 70 Z"
                  fill="rgba(255, 255, 255, 0.25)"
                />
                <path
                  d="M 0 50 Q 50 15, 100 40 T 200 20 T 300 10"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Right Card: Sales Figures Chart matching image_84342e49.png */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Sales Figures</h2>
              <span className="text-xs text-neutral-400">Monthly revenue volume & transaction cadence</span>
            </div>
            <span className="text-xs font-mono font-semibold text-neutral-400">2024-2025</span>
          </div>

          {/* Dual Bar + Line Chart */}
          <div className="relative pt-6 flex-1 min-h-[220px] flex flex-col justify-end">
            {/* Horizontal Grid lines 800, 600, 400, 200, 0 */}
            <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none text-[10px] text-neutral-300 font-mono">
              <div className="border-b border-dashed border-neutral-100 pb-0.5 flex justify-between">
                <span>800</span>
              </div>
              <div className="border-b border-dashed border-neutral-100 pb-0.5 flex justify-between">
                <span>600</span>
              </div>
              <div className="border-b border-dashed border-neutral-100 pb-0.5 flex justify-between">
                <span>400</span>
              </div>
              <div className="border-b border-dashed border-neutral-100 pb-0.5 flex justify-between">
                <span>200</span>
              </div>
              <div className="border-b border-neutral-200 flex justify-between text-neutral-400">
                <span>0</span>
              </div>
            </div>

            {/* Bars with Line Overlay */}
            <div className="relative z-10 flex items-end justify-between gap-1.5 sm:gap-3 pl-8 pr-2 h-44">
              {salesFigures.map((item, idx) => {
                const barHeight = (item.bars / 800) * 100;
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Hover tooltips */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 text-white text-[10px] font-mono py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {item.bars}k sales · {item.line} orders
                    </div>

                    {/* Bar */}
                    <div className="w-full max-w-[22px] bg-neutral-100/80 rounded-t-sm h-36 flex items-end">
                      <div
                        style={{ height: `${barHeight}%` }}
                        className="w-full bg-orange-500 rounded-t-sm group-hover:bg-orange-600 transition-all"
                      />
                    </div>

                    {/* Black dot connected in visualization */}
                    <div
                      className="absolute w-2 h-2 rounded-full bg-neutral-900 ring-2 ring-white shadow-xs z-10 transition-transform group-hover:scale-125"
                      style={{ bottom: `${(item.line / 900) * 120 + 32}px` }}
                    />

                    <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-900">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Products Sale & Last Transactions (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Products Sale Card (image_84342e49.png bottom-left) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900">Products Sale</h3>
            <span className="text-xs font-mono font-semibold text-neutral-400">500 products</span>
          </div>

          <p className="text-xs text-neutral-500">
            Real-time movement across top appetizers, grilled meats, and signature beverage lines
          </p>

          {/* Light peach / orange bars matching screenshot */}
          <div className="h-36 flex items-end justify-between gap-2 pt-4 px-2">
            {productSaleBars.map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="w-full max-w-[32px] bg-neutral-50 rounded-t-lg h-32 flex items-end">
                  <div
                    style={{ height: `${val}%` }}
                    className="w-full bg-orange-300 hover:bg-orange-400 rounded-t-lg transition-all"
                  />
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">P{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Last Transactions Card (image_84342e49.png bottom-right) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-base font-bold text-neutral-900">Last Transactions</h3>
            <button
              onClick={() => setActiveRole('cashier')}
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 5).map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-neutral-50 transition-colors border border-neutral-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-orange-700 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                    {ord.orderNumber.replace('#', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-900 line-clamp-1">{ord.customerName}</h4>
                      {ord.discount > 0 && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Disc: -{formatMoney(ord.discount)}
                        </span>
                      )}
                      {ord.isTaxExempt && (
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                          Tax Exempt
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {ord.tableNumber || (ord.type === 'delivery' ? 'Delivery' : 'Takeaway')} · {ord.items.length} items
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-neutral-900">
                    {formatMoney(ord.total)}
                  </span>
                  <div className="text-[9px] text-emerald-600 font-semibold uppercase">
                    {ord.paymentStatus} · {ord.paymentMethod || 'CASH'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Mobile Device Phone Mockup Frame (Directly matching image_84342e49.png) */}
      {showMobileDeviceMockup && (
        <div className="bg-neutral-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Live App Preview Mockups
              </span>
              <h3 className="text-lg font-bold text-white">
                Customer Mobile Ordering & Waiter Tracking Apps
              </h3>
            </div>
            <button
              onClick={() => setShowMobileDeviceMockup(false)}
              className="text-xs text-neutral-400 hover:text-white px-3 py-1 bg-neutral-800 rounded-lg"
            >
              Close Mockup View
            </button>
          </div>

          {/* Two phone frames side-by-side matching image_84342e49.png */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center justify-center max-w-4xl mx-auto py-4">
            {/* Phone 1: The Pizza Store Mobile Menu */}
            <div className="mx-auto w-[290px] h-[580px] bg-neutral-950 rounded-[44px] border-4 border-neutral-700 shadow-2xl p-3 flex flex-col justify-between overflow-hidden relative">
              {/* Dynamic Island */}
              <div className="w-24 h-5 bg-black rounded-full mx-auto mb-2 shrink-0 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-neutral-900 mr-2" />
              </div>

              {/* Mobile Screen Content */}
              <div className="bg-white text-neutral-900 rounded-[32px] p-4 flex-1 flex flex-col overflow-y-auto space-y-3">
                <div className="flex items-center justify-between pb-1 border-b">
                  <span className="text-xs font-bold">The Pizza Store</span>
                  <span className="text-[10px] text-orange-600 font-semibold">View Info</span>
                </div>

                {/* Filter tags */}
                <div className="flex gap-1 text-[9px] font-semibold overflow-x-auto">
                  <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800">SPICY</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">VALUE MEALS</span>
                  <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">DESSERTS</span>
                </div>

                {/* Sample items */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="p-2 border rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold">MCSPICY PANEER</div>
                      <div className="text-[10px] text-neutral-500 font-mono">GYD 165.00</div>
                    </div>
                    <button className="px-2.5 py-1 text-[10px] bg-orange-500 text-white font-bold rounded-lg">
                      ADD
                    </button>
                  </div>

                  <div className="p-2 border rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold">BIGSPICY CHICKEN WRAP</div>
                      <div className="text-[10px] text-neutral-500 font-mono">GYD 185.00</div>
                    </div>
                    <button className="px-2.5 py-1 text-[10px] bg-orange-500 text-white font-bold rounded-lg">
                      ADD
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-2">
                  <button
                    onClick={() => setActiveRole('customer')}
                    className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
                  >
                    Launch Customer Portal
                  </button>
                </div>
              </div>
            </div>

            {/* Phone 2: Delivery & Track Delivery Screen */}
            <div className="mx-auto w-[290px] h-[580px] bg-neutral-950 rounded-[44px] border-4 border-neutral-700 shadow-2xl p-3 flex flex-col justify-between overflow-hidden relative">
              {/* Dynamic Island */}
              <div className="w-24 h-5 bg-black rounded-full mx-auto mb-2 shrink-0" />

              {/* Mobile Screen Content */}
              <div className="bg-white text-neutral-900 rounded-[32px] p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">DELIVERY TO:</span>
                    <span className="text-[10px] text-neutral-500">Masaki, Plot 42</span>
                  </div>

                  {/* 3 Step delivery guide from screenshot */}
                  <div className="bg-neutral-900 text-white rounded-2xl p-4 text-xs space-y-2 text-center">
                    <div className="font-bold text-orange-400">1. Choose Restaurant</div>
                    <div className="font-bold text-neutral-300">2. Select Food</div>
                    <div className="font-bold text-emerald-400">3. Pay & Track Delivery</div>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border text-xs space-y-1">
                    <span className="font-bold">Assigned Waiter Host:</span>
                    <p className="text-[11px] text-neutral-500">
                      John Mwamba is tracking your order in the kitchen pass.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveRole('waiter')}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Open Waiter Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Waiter Leaderboard Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-neutral-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Waiter Sales & Commission Performance</h3>
            <p className="text-xs text-neutral-500">
              Comparative analysis of orders served, personal link conversions, and earned sales incentives
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            5% Net Policy
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-bold border-y border-neutral-100">
              <tr>
                <th className="py-2.5 px-3">Waiter Name</th>
                <th className="py-2.5 px-3">Referral Code</th>
                <th className="py-2.5 px-3">Orders Handled</th>
                <th className="py-2.5 px-3">Gross Sales Generated</th>
                <th className="py-2.5 px-3">Average Order Value (AOV)</th>
                <th className="py-2.5 px-3 text-right">Earned Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {waiters.map((waiter, idx) => {
                const sampleSales = idx === 0 ? 1500000 : idx === 1 ? 1200000 : 900000;
                const sampleOrders = idx === 0 ? 120 : idx === 1 ? 95 : 80;
                const aov = Math.round(sampleSales / sampleOrders);
                const commission = Math.round(sampleSales * 0.05);

                return (
                  <tr key={waiter.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-900">{waiter.name}</div>
                      <div className="text-[10px] text-neutral-400">{waiter.email}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-orange-600">
                      {waiter.referralCode}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-neutral-800">
                      {sampleOrders} orders
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                      {formatMoney(sampleSales)}
                    </td>
                    <td className="py-3 px-3 font-mono text-neutral-600">
                      {formatMoney(aov)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-right text-orange-600 text-sm">
                      {formatMoney(commission)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
