import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Volume2,
  VolumeX,
  Boxes,
  ArrowLeftRight,
  RefreshCw,
  Printer,
  Play,
  Check,
  LayoutGrid,
  ListFilter,
  History,
  Search,
  AlertTriangle,
  X,
  Utensils,
  Ban,
  Ticket,
  Store,
  ArrowLeft,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { KitchenStation, Order, OrderStatus } from '../../types/restaurant';

const STATION_LABELS: Record<string, string> = {
  all: 'All Stations',
  hot_kitchen: 'Main Kitchen',
  grill: 'Grill & Charcoal',
  drinks: 'Bar & Beverages',
  beverage: 'Beverage Bar',
  dessert: 'Dessert Station',
  pastry: 'Pastry & Bakery',
  bakery: 'Bakery',
  cold_prep: 'Cold Prep & Salad',
};

const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; classes: string }> = {
  draft: { label: 'Draft (Waiter)', classes: 'bg-slate-200 text-slate-800 border-slate-300' },
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-900 border-amber-300' },
  confirmed: { label: 'Confirmed', classes: 'bg-sky-100 text-sky-900 border-sky-300' },
  sent_to_kitchen: { label: 'New KOT', classes: 'bg-amber-100 text-amber-900 border-amber-300' },
  accepted: { label: 'Accepted', classes: 'bg-blue-100 text-blue-900 border-blue-300' },
  preparing: { label: 'Preparing', classes: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  ready: { label: 'Ready', classes: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  served: { label: 'Served', classes: 'bg-teal-100 text-teal-900 border-teal-300' },
  dispatched: { label: 'Dispatched', classes: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  completed: { label: 'Completed', classes: 'bg-emerald-200/70 text-emerald-950 border-emerald-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-rose-100 text-rose-900 border-rose-300' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-900 border-red-300' },
};

export const KitchenView: React.FC = () => {
  const {
    currentTenant,
    orders,
    updateOrderStatus,
    updateOrderItemStatus,
    rejectOrderItem,
    waiters,
    ingredients,
    transferStock,
    formatMoney,
    subRecipeBatches,
    bomDeductionPolicy,
    activeOperator,
  } = useRestaurant();

  const chefActor = activeOperator.name || 'Kitchen Chef';

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showServedHistory, setShowServedHistory] = useState(false);
  const [selectedStation, setSelectedStation] = useState<KitchenStation | 'all'>('all');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showStockBar, setShowStockBar] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [syncSeconds, setSyncSeconds] = useState(8);
  const [clockText, setClockText] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [noticeBanner, setNoticeBanner] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  // List & Tracking filters
  const [listSearch, setListSearch] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<string>('all');
  const [listWaiterFilter, setListWaiterFilter] = useState<string>('all');
  const [listTypeFilter, setListTypeFilter] = useState<string>('all');

  // Reject Item Modal (non-silent accountability)
  const [rejectModal, setRejectModal] = useState<{
    order: Order;
    itemIndex: number;
    itemName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('Out of ingredient stock');
  const [rejectStaff, setRejectStaff] = useState(chefActor);

  // Reprint KOT Modal
  const [reprintOrder, setReprintOrder] = useState<Order | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setSyncSeconds((prev) => (prev <= 1 ? 8 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const showNotice = (type: 'info' | 'error', text: string) => {
    setNoticeBanner({ type, text });
    setTimeout(() => setNoticeBanner(null), 4500);
  };

  const getElapsedMinutes = (createdAt: string) => {
    const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
    return Math.floor(diffMs / 60000);
  };

  const formatElapsedLabel = (createdAt: string) => {
    const mins = getElapsedMinutes(createdAt);
    if (mins <= 1) return 'Just now';
    return `${mins} min ago`;
  };

  const getOrderStationLabel = (order: Order) => {
    const stations = Array.from(new Set(order.items.map((i) => i.station)));
    if (stations.length === 0) return 'Main Kitchen';
    if (stations.length === 1) return STATION_LABELS[stations[0]] || 'Main Kitchen';
    return STATION_LABELS[stations[0]] || 'Main Kitchen';
  };

  const getWaiterName = (order: Order) => {
    const wId = order.servingWaiterId || order.referralWaiterId;
    return waiters.find((w) => w.id === wId)?.name || 'Counter / Guest';
  };

  // Board columns filtering
  const boardOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedStation !== 'all') {
        const hasStation = o.items.some((it) => it.station === selectedStation);
        if (!hasStation) return false;
      }
      return true;
    });
  }, [orders, selectedStation]);

  const pendingOrders = useMemo(
    () => boardOrders.filter((o) => o.status === 'sent_to_kitchen' || o.status === 'accepted' || o.status === 'pending' || o.status === 'confirmed'),
    [boardOrders]
  );

  const preparingOrders = useMemo(
    () => boardOrders.filter((o) => o.status === 'preparing'),
    [boardOrders]
  );

  const readyOrders = useMemo(
    () => boardOrders.filter((o) => o.status === 'ready'),
    [boardOrders]
  );

  // Comprehensive tracking list orders
  const filteredListOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (showServedHistory) {
        const isHistoryStatus =
          ord.status === 'served' ||
          ord.status === 'completed' ||
          ord.status === 'cancelled' ||
          ord.status === 'rejected';
        if (!isHistoryStatus) return false;
      }
      if (listStatusFilter !== 'all' && ord.status !== listStatusFilter) return false;
      if (listWaiterFilter !== 'all') {
        const wId = ord.servingWaiterId || ord.referralWaiterId;
        if (wId !== listWaiterFilter) return false;
      }
      if (selectedStation !== 'all' && !ord.items.some((it) => it.station === selectedStation)) {
        return false;
      }
      if (listTypeFilter === 'custom_only') {
        if (!ord.items.some((it) => it.isCustomItem || Boolean(it.customInstructions))) return false;
      } else if (listTypeFilter !== 'all' && ord.type !== listTypeFilter) {
        return false;
      }

      const q = listSearch.trim().toLowerCase();
      if (!q) return true;
      const kot = (ord.kotNumber || '').toLowerCase();
      const coupon = (ord.serviceCouponCode || '').toLowerCase();
      const waiterName = getWaiterName(ord).toLowerCase();
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        kot.includes(q) ||
        coupon.includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        (ord.tableNumber || '').toLowerCase().includes(q) ||
        waiterName.includes(q) ||
        ord.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [
    orders,
    showServedHistory,
    listStatusFilter,
    listWaiterFilter,
    selectedStation,
    listTypeFilter,
    listSearch,
    waiters,
  ]);

  const handleConfirmRejectItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModal || !rejectReason.trim()) return;
    rejectOrderItem(
      rejectModal.order.id,
      rejectModal.itemIndex,
      rejectStaff.trim() || chefActor,
      rejectReason.trim()
    );
    showNotice(
      'info',
      `Logged kitchen rejection for "${rejectModal.itemName}" on ${rejectModal.order.orderNumber} (Audit & Owner notified).`
    );
    setRejectModal(null);
  };

  const renderKotCard = (order: Order, columnType: 'pending' | 'preparing' | 'ready') => {
    const elapsed = getElapsedMinutes(order.createdAt);
    const isFresh = elapsed <= 2;
    const isLate = elapsed >= 15;
    const kotId = order.kotNumber || `KOT-${order.orderNumber.replace('#', '')}`;
    const coupon = order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`;
    const waiterName = getWaiterName(order);
    const stationLabel = getOrderStationLabel(order);
    const visibleItems =
      selectedStation === 'all'
        ? order.items
        : order.items.filter((it) => it.station === selectedStation);

    if (visibleItems.length === 0) return null;

    return (
      <div
        key={order.id}
        className="bg-white text-slate-900 rounded-xl shadow-sm border border-slate-200/90 p-3.5 space-y-2.5"
      >
        {/* Top Card Header matching FoodCourtX reference */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-extrabold font-mono text-slate-950 tracking-tight">
                {kotId}
              </span>
              {order.priority === 'rush' && (
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-extrabold uppercase">
                  RUSH
                </span>
              )}
              {order.priority === 'vip' && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                  VIP
                </span>
              )}
              {order.status === 'accepted' && (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                  Accepted
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 flex-wrap">
              <span className="font-mono font-semibold text-slate-700">Order {order.orderNumber}</span>
              <span>·</span>
              <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded">
                {coupon}
              </span>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tabular-nums shrink-0 ${
              isFresh
                ? 'bg-emerald-100 text-emerald-800'
                : isLate
                ? 'bg-rose-100 text-rose-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {formatElapsedLabel(order.createdAt)}
          </span>
        </div>

        {/* Table / Type / Waiter Meta */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
          <span className="font-bold text-slate-800">
            {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Takeaway')}
            {order.customerName ? ` · ${order.customerName}` : ''}
          </span>
          <span className="text-slate-500 font-medium truncate max-w-[130px]">
            Waiter: {waiterName.split(' ')[0]}
          </span>
        </div>

        {/* Inner Item List Box matching screenshot */}
        <div className="bg-slate-50/90 border border-slate-200/90 rounded-lg p-2.5 space-y-2">
          {order.items.map((it, idx) => {
            if (selectedStation !== 'all' && it.station !== selectedStation) return null;
            const isRejected = it.status === 'rejected';
            const isItemReady = it.status === 'ready' || it.status === 'served';

            return (
              <div
                key={idx}
                className={`text-xs rounded-md transition-colors ${
                  isRejected
                    ? 'bg-rose-50/80 border border-rose-200 p-1.5 text-rose-900'
                    : columnType === 'preparing' && isItemReady
                    ? 'bg-emerald-50 border border-emerald-200 p-1.5'
                    : 'py-0.5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`font-bold ${
                          isRejected ? 'line-through text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {it.quantity} x {it.name}
                      </span>
                      {it.isCustomItem && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-bold">
                          Special Custom
                        </span>
                      )}
                      {it.portion && (
                        <span className="text-[10px] text-slate-500 font-medium">({it.portion})</span>
                      )}
                    </div>

                    {it.selectedModifiers.length > 0 && (
                      <div className="text-[11px] text-slate-600 pl-3 mt-0.5">
                        {it.selectedModifiers.map((m) => `+ ${m.name}`).join(', ')}
                      </div>
                    )}

                    {(it.customInstructions || it.customerNotes) && (
                      <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-2 py-0.5 mt-1">
                        Prep: {it.customInstructions || it.customerNotes}
                      </div>
                    )}

                    {isRejected && (
                      <div className="text-[10px] font-semibold text-rose-700 mt-0.5">
                        Rejected by {it.rejectedBy}: {it.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Per-item controls when in Preparing or Pending */}
                  {!isRejected && (
                    <div className="flex items-center gap-1 shrink-0">
                      {columnType === 'preparing' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateOrderItemStatus(
                              order.id,
                              idx,
                              isItemReady ? 'preparing' : 'ready',
                              'Kitchen Station'
                            )
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                            isItemReady
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title="Toggle individual item readiness"
                        >
                          {isItemReady ? '✓ Ready' : 'Mark Ready'}
                        </button>
                      )}
                      {(columnType === 'pending' || columnType === 'preparing') && (
                        <button
                          type="button"
                          onClick={() => {
                            setRejectReason('Ingredient out of stock');
                            setRejectModal({ order, itemIndex: idx, itemName: it.name });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                          title="Reject / report unavailable item (logged to audit trail)"
                          aria-label={`Reject ${it.name}`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {order.notes && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[11px] text-slate-700 font-medium">
              <span className="font-bold text-slate-900">Note:</span> {order.notes}
            </div>
          )}
        </div>

        {/* Card Action Footer matching FoodCourtX layout */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {columnType === 'pending' && (
              <>
                {order.status === 'sent_to_kitchen' && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(order.id, 'accepted', chefActor, 'Accepted on KDS')}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold whitespace-nowrap cursor-pointer"
                  >
                    Accept
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => updateOrderStatus(order.id, 'preparing', chefActor, 'Started cooking')}
                  className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start</span>
                </button>
              </>
            )}

            {columnType === 'preparing' && (
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'ready', chefActor, 'All items ready on pass')}
                className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ready</span>
              </button>
            )}

            {columnType === 'ready' && (
              <button
                type="button"
                onClick={() => updateOrderStatus(order.id, 'served', 'Kitchen Pass', 'Handed to waiter / guest')}
                className="px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Serve</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setReprintOrder(order)}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Reprint</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span
              className={`text-[10px] font-semibold ${
                order.stockDeducted ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {order.stockDeducted
                ? 'Stock Deducted'
                : bomDeductionPolicy === 'on_kitchen_start'
                ? 'Deducts on Start'
                : 'Awaiting Deduction'}
            </span>
            <span className="text-[11px] font-medium text-slate-500 inline-flex items-center gap-1">
              <Utensils className="w-3 h-3 text-slate-400" />
              <span>{stationLabel}</span>
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#090E1A] text-slate-100 flex flex-col">
      {/* Top Dark KDS Single-Line Horizontal Navigation & Control Bar */}
      <div className="bg-[#0F172A] border-b border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        {/* Left: Brand Lockup + Station Selector + Board/List Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 shrink-0" title={currentTenant.name}>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-extrabold shadow-xs shrink-0">
              <ChefHat className="w-4 h-4" />
            </div>
            <h1 className="text-sm font-extrabold tracking-tight text-white whitespace-nowrap max-w-[155px] xl:max-w-[210px] truncate">
              {currentTenant.name}
            </h1>
            <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
              KDS
            </span>
          </div>

          {/* Station Dropdown */}
          <div className="flex items-center bg-[#1E293B] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs shrink-0">
            <Store className="w-3.5 h-3.5 text-emerald-400 mr-1.5 shrink-0" />
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value as KitchenStation | 'all')}
              className="bg-transparent text-slate-100 font-semibold outline-hidden cursor-pointer pr-1 whitespace-nowrap"
              aria-label="Filter kitchen station"
            >
              <option value="all" className="bg-slate-900">All Stations</option>
              <option value="hot_kitchen" className="bg-slate-900">Main Kitchen</option>
              <option value="grill" className="bg-slate-900">Grill & Charcoal</option>
              <option value="drinks" className="bg-slate-900">Bar & Drinks</option>
              <option value="beverage" className="bg-slate-900">Beverage Station</option>
              <option value="dessert" className="bg-slate-900">Dessert</option>
              <option value="pastry" className="bg-slate-900">Pastry</option>
              <option value="cold_prep" className="bg-slate-900">Cold Prep</option>
            </select>
          </div>

          {/* Board | List Segmented Switcher */}
          <div className="inline-flex items-center bg-[#1E293B] p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('board');
                setShowServedHistory(false);
                setShowStockBar(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                viewMode === 'board' && !showServedHistory && !showStockBar
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                setShowServedHistory(false);
                setShowStockBar(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                viewMode === 'list' && !showServedHistory && !showStockBar
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 shrink-0" />
              <span>List ({orders.length})</span>
            </button>
          </div>
        </div>

        {/* Right: Single Horizontal Row of Kitchen Action Buttons & Clock */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowStockBar((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              showStockBar
                ? 'bg-[#2563EB] text-white border-blue-500 shadow-xs'
                : 'bg-[#1E293B] text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-blue-300 shrink-0" />
            <span>Prep Stock</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSyncSeconds(8);
              showNotice('info', `Kitchen tickets synced with live Waiter & POS engine (${orders.length} records).`);
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1E293B] hover:bg-slate-800 text-slate-200 border border-slate-700 inline-flex items-center gap-1.5 font-mono tabular-nums whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Sync ({syncSeconds}s)</span>
          </button>

          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              audioEnabled
                ? 'bg-[#1E293B] text-slate-200 border-slate-700 hover:bg-slate-800'
                : 'bg-rose-950/60 text-rose-200 border-rose-800'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 shrink-0" />}
            <span>{audioEnabled ? 'Mute' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !showServedHistory;
              setShowServedHistory(next);
              setShowStockBar(false);
              if (next) setViewMode('list');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
              showServedHistory && !showStockBar
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-[#1E293B] text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5 shrink-0" />
            <span>Served History</span>
          </button>

          <div className="pl-2 text-xs font-mono font-bold text-slate-200 tabular-nums whitespace-nowrap shrink-0">
            {clockText}
          </div>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {noticeBanner && (
        <div
          className={`mx-4 sm:mx-5 mt-3 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            noticeBanner.type === 'error'
              ? 'bg-rose-950/90 border-rose-700 text-rose-100'
              : 'bg-emerald-950/90 border-emerald-700 text-emerald-100'
          }`}
        >
          <span>{noticeBanner.text}</span>
          <button
            type="button"
            onClick={() => setNoticeBanner(null)}
            className="text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE: PREP STOCK FULL VIEW OR KOT BOARD / LIST VIEW */}
      <div className="flex-1 p-4 sm:p-5 flex flex-col">
        {showStockBar ? (
          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
            {/* Full-Width Prep Stock Header & Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Boxes className="w-5 h-5 text-blue-400 shrink-0" />
                  <h2 className="text-base font-extrabold text-white tracking-tight">
                    Active Kitchen Floor Prep Stock
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    · Deducted automatically as dishes are cooked
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect full ingredient quantities on the Kitchen line vs Main Store reserves, and restock immediately without leaving the KDS.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search ingredient..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-[#0B1220] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 w-48 outline-hidden focus:border-blue-500"
                  />
                </div>

                <div className="inline-flex items-center bg-[#0B1220] p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setStockFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      stockFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({ingredients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockFilter('low')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                      stockFilter === 'low' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Low Stock
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStockBar(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to KOT Board</span>
                </button>
              </div>
            </div>

            {/* Prepared Sub-Recipe Batches Strip (Sauces & Pre-Prep Bases) */}
            {subRecipeBatches.filter((b) => b.status !== 'reversed').length > 0 && (
              <div className="space-y-2 pb-2 border-b border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Prepared Sub-Recipe Batches (Sauces, Marinades &amp; Bases)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Consumed by finished BOM dishes via FEFO without double-deducting raw materials
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {subRecipeBatches
                    .filter((b) => b.status !== 'reversed')
                    .map((batch) => (
                      <div
                        key={batch.id}
                        className="p-3 rounded-xl border border-slate-800 bg-[#0B1220] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {batch.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {batch.batchNumber} · Exp {batch.expiresAt.slice(0, 10)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-extrabold text-emerald-400 tabular-nums">
                            {batch.remainingQty.toLocaleString()} / {batch.producedQty.toLocaleString()} {batch.unit}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                            {formatMoney(Math.round(batch.costPerUnit))}/{batch.unit}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Full Readable Ingredient Cards Grid (Zero Name Truncation) */}
            {(() => {
              const filteredIngredients = ingredients.filter((ing) => {
                const kQty = ing.kitchenStockUnits ?? 0;
                const isLow = kQty <= Math.max(1, ing.minimumThreshold * 0.25);
                if (stockFilter === 'low' && !isLow) return false;
                const q = stockSearch.trim().toLowerCase();
                if (!q) return true;
                return (
                  ing.name.toLowerCase().includes(q) ||
                  (ing.category || '').toLowerCase().includes(q)
                );
              });

              if (filteredIngredients.length === 0) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center py-14 text-center border border-dashed border-slate-800 rounded-xl">
                    <p className="text-sm font-semibold text-slate-300">
                      No prep stock items match your filter.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStockSearch('');
                        setStockFilter('all');
                      }}
                      className="mt-3 px-4 py-2 rounded-lg text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white cursor-pointer"
                    >
                      Show All Ingredients
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredIngredients.map((ing) => {
                    const kQty = ing.kitchenStockUnits ?? 0;
                    const sQty = ing.storeStockUnits ?? 0;
                    const isLow = kQty <= Math.max(1, ing.minimumThreshold * 0.25);
                    const issueAmount = Math.min(sQty, Math.round(ing.conversionRatio * 0.2) || 10);

                    return (
                      <div
                        key={ing.id}
                        className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                          isLow
                            ? 'bg-amber-950/30 border-amber-500/60'
                            : 'bg-[#0B1220] border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-white leading-snug">
                              {ing.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {ing.category || 'Kitchen Ingredient'} · Min {ing.minimumThreshold.toLocaleString()} {ing.consumptionUnit}
                            </p>
                          </div>
                          <span
                            className={`text-[11px] font-bold whitespace-nowrap shrink-0 ${
                              isLow ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {isLow ? 'Low on Line' : 'Ready'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800/80 text-xs">
                          <div>
                            <div className="text-[11px] font-medium text-slate-400">
                              Kitchen Floor
                            </div>
                            <div className="font-mono font-extrabold text-sm text-white mt-0.5 tabular-nums">
                              {kQty.toLocaleString()}{' '}
                              <span className="text-[11px] font-semibold text-slate-300">
                                {ing.consumptionUnit}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-slate-400">
                              Main Store Reserve
                            </div>
                            <div className="font-mono font-bold text-sm text-slate-200 mt-0.5 tabular-nums">
                              {sQty.toLocaleString()}{' '}
                              <span className="text-[11px] font-normal text-slate-400">
                                {ing.consumptionUnit}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (issueAmount > 0) {
                              transferStock({
                                ingredientId: ing.id,
                                quantityUnits: issueAmount,
                                fromLocation: 'main_store',
                                toLocation: 'kitchen',
                                reason: 'Kitchen line chef live restock request',
                                shift: 'Kitchen Live Requisition',
                                recordedBy: chefActor,
                              });
                              showNotice(
                                'info',
                                `Issued +${issueAmount.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} to Kitchen line.`
                              );
                            } else {
                              showNotice(
                                'error',
                                `Main Store has zero reserve for ${ing.name}. Please ask Manager to receive supplier stock.`
                              );
                            }
                          }}
                          disabled={sQty <= 0}
                          className={`w-full py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                            sQty > 0
                              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {sQty > 0
                              ? `+ Restock (+${issueAmount.toLocaleString()} ${ing.consumptionUnit})`
                              : 'Main Store Empty'}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : viewMode === 'board' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
            {/* COLUMN 1: PENDING / NEW */}
            <div className="bg-[#111A2E] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  PENDING
                </h2>
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center tabular-nums">
                  {pendingOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {pendingOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No incoming orders waiting
                  </div>
                ) : (
                  pendingOrders.map((ord) => renderKotCard(ord, 'pending'))
                )}
              </div>
            </div>

            {/* COLUMN 2: PREPARING */}
            <div className="bg-[#111A2E] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  PREPARING
                </h2>
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center tabular-nums">
                  {preparingOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {preparingOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No orders currently cooking
                  </div>
                ) : (
                  preparingOrders.map((ord) => renderKotCard(ord, 'preparing'))
                )}
              </div>
            </div>

            {/* COLUMN 3: READY */}
            <div className="bg-[#111A2E] border border-slate-800/90 rounded-2xl p-3.5 flex flex-col space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  READY
                </h2>
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-mono font-extrabold text-xs flex items-center justify-center tabular-nums">
                  {readyOrders.length}
                </span>
              </div>

              <div className="space-y-3">
                {readyOrders.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No completed dishes waiting on pass
                  </div>
                ) : (
                  readyOrders.map((ord) => renderKotCard(ord, 'ready'))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* LIST & FULL ORDER TRACKING VIEW */
          <div className="bg-[#111A2E] border border-slate-800 rounded-2xl overflow-hidden space-y-0">
            {/* Multi-Filter Header Bar */}
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Search KOT, Order #, Coupon, Table, Dish..."
                    className="pl-8 pr-3 py-2 text-xs bg-[#0B1220] border border-slate-700 rounded-lg text-white placeholder:text-slate-500 w-64 outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={listStatusFilter}
                  onChange={(e) => setListStatusFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-[#0B1220] border border-slate-700 rounded-lg text-slate-200 font-semibold outline-hidden cursor-pointer"
                  aria-label="Filter by order status"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft (Waiter Saved)</option>
                  <option value="sent_to_kitchen">New KOT</option>
                  <option value="accepted">Accepted</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="served">Served</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                {/* Waiter Filter */}
                <select
                  value={listWaiterFilter}
                  onChange={(e) => setListWaiterFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-[#0B1220] border border-slate-700 rounded-lg text-slate-200 font-semibold outline-hidden cursor-pointer"
                  aria-label="Filter by waiter"
                >
                  <option value="all">All Waiters</option>
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      Waiter: {w.name}
                    </option>
                  ))}
                </select>

                {/* Order Type Filter */}
                <select
                  value={listTypeFilter}
                  onChange={(e) => setListTypeFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-[#0B1220] border border-slate-700 rounded-lg text-slate-200 font-semibold outline-hidden cursor-pointer"
                  aria-label="Filter by order type"
                >
                  <option value="all">All Types</option>
                  <option value="dine_in">Dine-In</option>
                  <option value="pickup">Takeaway / Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="custom_only">Customized & Off-Menu Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono font-bold text-slate-200 tabular-nums">
                  {filteredListOrders.length}
                </span>
                <span>orders matching filters</span>
                {showServedHistory && (
                  <button
                    type="button"
                    onClick={() => setShowServedHistory(false)}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                  >
                    Show Active Too
                  </button>
                )}
              </div>
            </div>

            {/* Clean White-Contrast High-Density Order Tracking Table */}
            <div className="bg-white text-slate-900 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">KOT / Order & Coupon</th>
                    <th className="py-3 px-4">Waiter & Table</th>
                    <th className="py-3 px-4">Items & Special Notes</th>
                    <th className="py-3 px-4">Kitchen Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Age / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredListOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No orders match your selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredListOrders.map((ord) => {
                      const statusMeta = STATUS_BADGE_MAP[ord.status] || STATUS_BADGE_MAP.pending;
                      const kotId = ord.kotNumber || `KOT-${ord.orderNumber.replace('#', '')}`;
                      const coupon = ord.serviceCouponCode || `SV-${ord.orderNumber.replace('#', '')}`;
                      const hasCustom = ord.items.some((i) => i.isCustomItem);
                      const hasRejected = ord.items.some((i) => i.status === 'rejected');

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/90 transition-colors">
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono font-extrabold text-slate-900">{kotId}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-slate-600">{ord.orderNumber}</span>
                              <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                {coupon}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top">
                            <div className="font-bold text-slate-900">{getWaiterName(ord)}</div>
                            <div className="text-[11px] text-slate-500">
                              {ord.tableNumber || ord.type.replace('_', ' ')} · {ord.customerName}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top max-w-md">
                            <div className="space-y-1">
                              {ord.items.map((it, idx) => (
                                <div key={idx} className="text-[11px] leading-snug">
                                  <span
                                    className={`font-semibold ${
                                      it.status === 'rejected'
                                        ? 'line-through text-rose-700'
                                        : 'text-slate-900'
                                    }`}
                                  >
                                    {it.quantity}x {it.name}
                                  </span>
                                  {it.isCustomItem && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-bold">
                                      Off-Menu
                                    </span>
                                  )}
                                  {it.customInstructions && (
                                    <span className="ml-1.5 text-amber-800 font-medium">
                                      ({it.customInstructions})
                                    </span>
                                  )}
                                  {it.status === 'rejected' && (
                                    <span className="ml-1.5 text-rose-700 font-bold">
                                      [Rejected: {it.rejectionReason}]
                                    </span>
                                  )}
                                </div>
                              ))}
                              {ord.notes && (
                                <div className="text-[10px] text-slate-500 italic">Note: {ord.notes}</div>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 align-top">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusMeta.classes}`}
                            >
                              {statusMeta.label}
                            </span>
                            {(hasCustom || hasRejected) && (
                              <div className="text-[10px] text-slate-500 mt-1">
                                {hasCustom ? 'Custom item' : ''}
                                {hasCustom && hasRejected ? ' · ' : ''}
                                {hasRejected ? 'Has rejected line' : ''}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                ord.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ord.paymentStatus === 'partial'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                            {ord.paidAmount > 0 && ord.paidAmount < ord.total && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                                Bal: {formatMoney(ord.total - ord.paidAmount)}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 align-top text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatMoney(ord.total)}
                          </td>

                          <td className="py-3 px-4 align-top text-right">
                            <div className="text-[11px] font-mono text-slate-500 mb-1.5 tabular-nums">
                              {formatElapsedLabel(ord.createdAt)}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {ord.status === 'sent_to_kitchen' && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(ord.id, 'preparing', chefActor)}
                                  className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Start
                                </button>
                              )}
                              {(ord.status === 'accepted' || ord.status === 'preparing') && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(ord.id, 'ready', chefActor)}
                                  className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Ready
                                </button>
                              )}
                              {ord.status === 'ready' && (
                                <button
                                  type="button"
                                  onClick={() => updateOrderStatus(ord.id, 'served', 'Kitchen Pass')}
                                  className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  Serve
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setReprintOrder(ord)}
                                className="px-2 py-1 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer"
                              >
                                KOT
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Kitchen Item Modal (Mandatory Reason & Audit Logging) */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmRejectItem}
            className="bg-white text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Reject Kitchen Item (Logged)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {rejectModal.order.kotNumber || rejectModal.order.orderNumber} · {rejectModal.itemName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              Rejected items are never deleted. They remain permanently visible in the audit log, waiter view, and owner reconciliation report.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kitchen Staff Name</label>
                <input
                  type="text"
                  required
                  value={rejectStaff}
                  onChange={(e) => setRejectStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Rejection Reason</label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white mb-2"
                >
                  <option value="Ingredient out of stock">Ingredient out of stock</option>
                  <option value="Equipment / grill station unavailable">Equipment / grill station unavailable</option>
                  <option value="Special guest recipe cannot be fulfilled">Special guest recipe cannot be fulfilled</option>
                  <option value="Customer requested cancellation before cooking">Customer requested cancellation before cooking</option>
                </select>
                <input
                  type="text"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter exact reason..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
              >
                Confirm Item Rejection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable KOT Ticket Preview Modal */}
      {reprintOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-sm">Kitchen Order Ticket (KOT)</span>
              </div>
              <button
                type="button"
                onClick={() => setReprintOrder(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="font-mono text-xs bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 space-y-2.5">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <div className="font-extrabold text-sm">{currentTenant.name}</div>
                <div className="text-[11px] text-slate-600">
                  {reprintOrder.kotNumber || `KOT-${reprintOrder.orderNumber.replace('#', '')}`} · {reprintOrder.orderNumber}
                </div>
                <div className="text-[11px] font-bold text-amber-900 mt-0.5">
                  COUPON: {reprintOrder.serviceCouponCode || `SV-${reprintOrder.orderNumber.replace('#', '')}`}
                </div>
              </div>

              <div className="flex justify-between text-[11px]">
                <span>Location: {reprintOrder.tableNumber || reprintOrder.type.toUpperCase()}</span>
                <span>Waiter: {getWaiterName(reprintOrder).split(' ')[0]}</span>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1.5">
                {reprintOrder.items.map((it, i) => (
                  <div key={i}>
                    <div className="font-bold">
                      {it.quantity} x {it.name} {it.status === 'rejected' ? '[REJECTED]' : ''}
                    </div>
                    {(it.customInstructions || it.customerNotes) && (
                      <div className="text-[10px] text-slate-700 pl-3">
                        * {it.customInstructions || it.customerNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {reprintOrder.notes && (
                <div className="text-[11px]">
                  <strong>Notes:</strong> {reprintOrder.notes}
                </div>
              )}

              <div className="text-center text-[10px] text-slate-500 pt-1">
                Submitted: {new Date(reprintOrder.createdAt).toLocaleTimeString()}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && typeof window.print === 'function') {
                    window.print();
                  }
                  setReprintOrder(null);
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print KOT Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
