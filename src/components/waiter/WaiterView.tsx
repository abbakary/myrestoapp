import React, { useState } from 'react';
import {
  Share2,
  QrCode,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  Utensils,
  Plus,
  Send,
  MessageCircle,
  Users,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { QrCodeModal } from '../common/QrCodeModal';

export const WaiterView: React.FC = () => {
  const {
    currentTenant,
    waiters,
    activeWaiterId,
    setActiveWaiterId,
    calculateWaiterStats,
    tables,
    orders,
    updateOrderStatus,
    updateTableStatus,
    formatMoney,
    setActiveRole,
    setReferralCode,
  } = useRestaurant();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<string>('Table 03');
  const [selectedTab, setSelectedTab] = useState<'overview' | 'orders' | 'tables' | 'commission'>('overview');
  const [blockedTableNotice, setBlockedTableNotice] = useState<string | null>(null);

  const currentWaiter = waiters.find((w) => w.id === activeWaiterId) || waiters[0];
  const stats = calculateWaiterStats(currentWaiter.id);

  // Waiter personal link
  const personalLink = `https://${currentTenant.slug}.restaurantos.io/w/${currentWaiter.referralCode.toLowerCase()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSimulateCustomerVisit = () => {
    setReferralCode(currentWaiter.referralCode);
    setActiveRole('customer');
  };

  const handleRequestBill = (orderId: string) => {
    updateOrderStatus(orderId, 'ready');
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Waiter Switcher */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {currentWaiter.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-neutral-900">{currentWaiter.name}</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                {currentWaiter.referralCode}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Waiter & Sales Ambassador · 5% Commission on Completed Net Sales
            </p>
          </div>
        </div>

        {/* Switch Waiter Persona & Quick Tab Links */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 font-medium">Switch Persona:</span>
          {waiters.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWaiterId(w.id)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                w.id === currentWaiter.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {w.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Differentiating Feature: Personal Ordering Link & QR Card (Screenshot 3 Reference) */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-neutral-800">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-md text-[11px] font-semibold tracking-wide uppercase">
              <Utensils className="w-3.5 h-3.5" />
              <span>Personal Sales Attribution Engine</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Share Your Personal Order Link & Earn Commission
            </h2>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Customers who order using your personal link or table QR code are permanently attributed to your account.
              Orders appear directly on your dashboard, in the kitchen KDS, and calculate your 5% sales bonus upon completion.
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs font-mono text-emerald-400 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-700/60">
              <span className="truncate">{personalLink}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 w-full lg:w-auto shrink-0">
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition-colors flex items-center justify-center gap-1.5"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied to Clipboard' : 'Copy Link'}</span>
            </button>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              <span>Generate Stand QR</span>
            </button>

            <button
              onClick={handleSimulateCustomerVisit}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Test Customer View</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip (Matching System Spec Table 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">My Orders</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
            {stats.myOrders.length}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Assigned & referred</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">Today's Sales</div>
          <div className="text-xl font-bold font-mono text-neutral-900 mt-1 tabular-nums">
            {formatMoney(stats.todaySales)}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Completed orders</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">Pending Orders</div>
          <div className="text-xl font-bold font-mono text-amber-600 mt-1 tabular-nums">
            {stats.pendingOrdersCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">In prep / waiting</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">Completed Orders</div>
          <div className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {stats.completedOrdersCount}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Served & settled</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">Total Earned</div>
          <div className="text-xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {formatMoney(stats.earnedCommission)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">5% net policy</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-neutral-500">Pending Settlement</div>
          <div className="text-xl font-bold font-mono text-blue-600 mt-1 tabular-nums">
            {formatMoney(stats.pendingCommission)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Awaiting payout</div>
        </div>
      </div>

      {/* Main Waiter Work Area: Active Table Map & Assigned Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assigned Orders & Kitchen Prep Watch */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Assigned Customer Tickets</h3>
                <p className="text-xs text-neutral-500">Live order status, kitchen prep & bill requests</p>
              </div>
              <button
                onClick={() => setActiveRole('cashier')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Take New Order</span>
              </button>
            </div>

            {stats.myOrders.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-xs">
                No orders currently assigned to this waiter. Share your referral link or assign a table.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.myOrders.map((order) => {
                  const isReady = order.status === 'ready';
                  const isPreparing = order.status === 'preparing' || order.status === 'sent_to_kitchen';
                  const isPaid = order.paymentStatus === 'paid';

                  return (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm text-neutral-900">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs font-semibold text-neutral-600 bg-neutral-200 px-2 py-0.5 rounded">
                            {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Pickup')}
                          </span>
                          {order.referralWaiterId === currentWaiter.id && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              Direct Referral (5% Comm)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isReady
                                ? 'bg-purple-100 text-purple-800'
                                : isPreparing
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {order.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-white rounded-lg border border-neutral-200/70"
                          >
                            <div>
                              <span className="font-semibold text-neutral-800">
                                {it.quantity}x {it.name}
                              </span>
                              <div className="text-[10px] text-neutral-400 capitalize">
                                Status: {it.status}
                              </div>
                            </div>
                            <span className="font-mono tabular-nums text-neutral-600">
                              {formatMoney(it.price * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80 text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-500">
                            Total: <strong className="font-mono text-neutral-900">{formatMoney(order.total)}</strong>
                          </span>
                          {order.discount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Disc: -{formatMoney(order.discount)}
                            </span>
                          )}
                          {order.isTaxExempt && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                              Tax Exempt
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isReady && !isPaid && (
                            <button
                              onClick={() => handleRequestBill(order.id)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs transition-colors"
                            >
                              Serve & Request Bill
                            </button>
                          )}
                          {isReady && isPaid && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                            >
                              Mark Table Completed
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Floor Tables Map & Assignment */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-neutral-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Floor Table Layout</h3>
                <p className="text-xs text-neutral-500">Tap table to assign or take order</p>
              </div>
            </div>

            {blockedTableNotice && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs px-3 py-2 rounded-xl flex items-center justify-between">
                <span>{blockedTableNotice}</span>
                <button
                  onClick={() => setBlockedTableNotice(null)}
                  className="font-bold text-amber-800 hover:text-amber-950 text-xs ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {tables.map((table) => {
                const isAssignedToMe = table.assignedWaiterId === currentWaiter.id;
                const isBusy = table.status !== 'available';
                let statusBg = 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 cursor-pointer';
                if (table.status === 'occupied') {
                  statusBg = 'bg-amber-50 border-amber-300 text-amber-900 cursor-not-allowed opacity-90';
                } else if (table.status === 'billing') {
                  statusBg = 'bg-blue-50 border-blue-300 text-blue-900 cursor-not-allowed opacity-90';
                } else if (table.status === 'reserved') {
                  statusBg = 'bg-neutral-100 border-neutral-300 text-neutral-600 cursor-not-allowed opacity-85';
                }

                return (
                  <button
                    key={table.id}
                    onClick={() => {
                      if (isBusy) {
                        setBlockedTableNotice(
                          `⚠️ ${table.number} is currently "${table.status.toUpperCase()}". It cannot be newly assigned or selected until cleared!`
                        );
                        return;
                      }
                      setBlockedTableNotice(null);
                      updateTableStatus(table.id, 'occupied', currentWaiter.id);
                    }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-1 relative ${statusBg} ${
                      isAssignedToMe ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <span className="text-xs font-bold">{table.number}</span>
                    <span className="text-[10px] opacity-75 font-mono">{table.capacity} Seats</span>
                    <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                      table.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                      table.status === 'occupied' ? 'bg-amber-200 text-amber-900' :
                      table.status === 'billing' ? 'bg-blue-200 text-blue-900' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {table.status}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Billing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Stand Generator Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`${currentWaiter.name}'s Table Stand QR`}
        subtitle="Place this tent card on your assigned tables or badge"
        targetUrl={personalLink}
        badgeLabel={`TABLE ORDER · WAITER ${currentWaiter.name.toUpperCase()}`}
      />
    </div>
  );
};
