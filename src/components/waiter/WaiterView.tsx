import React, { useState, useMemo } from 'react';
import {
  QrCode,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  Plus,
  Minus,
  ExternalLink,
  Home,
  ClipboardList,
  LayoutGrid,
  Wallet,
  Share2,
  X,
  Search,
  ChefHat,
  UtensilsCrossed,
  Ticket,
  Banknote,
  Smartphone,
  CreditCard,
  Sparkles,
  SlidersHorizontal,
  ShieldAlert,
  FileEdit,
  Send,
  Ban,
  Flame,
  FastForward,
} from 'lucide-react';
import { useRestaurant, CartItem } from '../../context/RestaurantContext';
import { QrCodeModal } from '../common/QrCodeModal';
import { MenuItem, Order, OrderType, PaymentMethod, KitchenStation } from '../../types/restaurant';
import { shareOrCopyLink, useMobileEnvironment } from '../../utils/mobileEnvironment';

type WaiterTab = 'home' | 'orders' | 'tables' | 'earnings';

export const WaiterView: React.FC = () => {
  const {
    currentTenant,
    waiters,
    activeWaiterId,
    setActiveWaiterId,
    calculateWaiterStats,
    tables,
    menuItems,
    submitOrder,
    submitDraftToKitchen,
    updateOrderStatus,
    fastForwardOrderToServed,
    updateTableStatus,
    processPayment,
    requestApproval,
    formatMoney,
    taxEnabled,
    taxRatePct,
    currency,
    toggleCurrency,
    setActiveRole,
    setReferralCode,
    isStandalonePortal,
    defaultCommissionMode,
    defaultCommissionValue,
    getOrderCommission,
  } = useRestaurant();

  const { isStandalonePortal: envStandalone } = useMobileEnvironment();
  const lockedStandalone = isStandalonePortal || envStandalone;

  const [activeTab, setActiveTab] = useState<WaiterTab>('home');
  const [orderFilter, setOrderFilter] = useState<'all' | 'draft' | 'active' | 'ready' | 'completed' | 'cancelled'>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('All');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [blockedTableNotice, setBlockedTableNotice] = useState<string | null>(null);
  const [tableActionNotice, setTableActionNotice] = useState<string | null>(null);
  const [noticePayOrderId, setNoticePayOrderId] = useState<string | null>(null);

  // Fast Waiter Collect Payment & Complete Service Sheet (supports partial/split + ref)
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentMethodDraft, setPaymentMethodDraft] = useState<Exclude<PaymentMethod, 'split'>>('cash');
  const [amountToCollect, setAmountToCollect] = useState<number>(0);
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [txRefDraft, setTxRefDraft] = useState<string>('');
  const [completeServiceOnPay, setCompleteServiceOnPay] = useState<boolean>(true);

  // Controlled Approval Request Modal (Discount / Cancel Order - no silent deletes)
  const [approvalOrder, setApprovalOrder] = useState<Order | null>(null);
  const [approvalType, setApprovalType] = useState<'discount' | 'cancel_order'>('discount');
  const [approvalDiscountType, setApprovalDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [approvalDiscountValue, setApprovalDiscountValue] = useState<number>(10);
  const [approvalReason, setApprovalReason] = useState<string>('');

  // Quick Table / Takeaway / Delivery 3-Type Order Sheet state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftOrderType, setDraftOrderType] = useState<OrderType>('dine_in');
  const [draftPriority, setDraftPriority] = useState<'normal' | 'rush' | 'vip'>('normal');
  const [orderTableNumber, setOrderTableNumber] = useState<string>(() => tables[0]?.number || 'Table 01');
  const [orderGuestName, setOrderGuestName] = useState<string>('');
  const [orderGuestPhone, setOrderGuestPhone] = useState<string>('');
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [orderPayTiming, setOrderPayTiming] = useState<'later' | 'cash' | 'mpesa'>('later');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [draftItems, setDraftItems] = useState<CartItem[]>([]);
  const [expandedCustomizeIdx, setExpandedCustomizeIdx] = useState<number | null>(null);

  // Mode C: Special / Custom Off-Menu Item inline builder
  const [showCustomItemBuilder, setShowCustomItemBuilder] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(15000);
  const [customStation, setCustomStation] = useState<KitchenStation>('grill');
  const [customPrepNote, setCustomPrepNote] = useState('');

  const currentWaiter = waiters.find((w) => w.id === activeWaiterId) || waiters[0];
  const stats = calculateWaiterStats(currentWaiter?.id || '');

  // Real deep link pointing to the running app's Customer Portal with waiter attribution
  const personalLink = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.restaurantos.io';
    const code = (currentWaiter?.referralCode || 'waiter').toLowerCase();
    return `${origin}/?portal=customer&w=${encodeURIComponent(code)}&tenant=${encodeURIComponent(currentTenant.id)}`;
  }, [currentWaiter?.referralCode, currentTenant.id]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalLink);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleShareLink = async () => {
    if (!currentWaiter) return;
    const result = await shareOrCopyLink({
      title: `${currentTenant.name} — Order Menu`,
      text: `Order directly with ${currentWaiter.name} at ${currentTenant.name}:`,
      url: personalLink,
    });
    if (result === 'shared' || result === 'copied') {
      setShareStatus(result);
      setTimeout(() => setShareStatus('idle'), 2200);
    }
  };

  const handleOpenCustomerPortal = () => {
    if (currentWaiter) {
      setReferralCode(currentWaiter.referralCode);
    }
    setActiveRole('customer');
  };

  const draftsCount = useMemo(
    () => stats.myOrders.filter((o) => o.status === 'draft').length,
    [stats.myOrders]
  );

  const filteredOrders = useMemo(() => {
    return stats.myOrders.filter((ord) => {
      if (orderFilter === 'all') return true;
      if (orderFilter === 'draft') return ord.status === 'draft';
      if (orderFilter === 'active') {
        return (
          ord.status === 'pending' ||
          ord.status === 'confirmed' ||
          ord.status === 'sent_to_kitchen' ||
          ord.status === 'accepted' ||
          ord.status === 'preparing'
        );
      }
      if (orderFilter === 'ready') {
        return ord.status === 'ready' || ord.status === 'served';
      }
      if (orderFilter === 'completed') {
        return ord.status === 'completed';
      }
      if (orderFilter === 'cancelled') {
        return ord.status === 'cancelled' || ord.status === 'rejected';
      }
      return true;
    });
  }, [stats.myOrders, orderFilter]);

  const readyToServeCount = stats.myOrders.filter((o) => o.status === 'ready').length;

  const zones = useMemo(() => {
    const unique = Array.from(new Set(tables.map((t) => t.zone || 'Main Dining')));
    return ['All', ...unique];
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (zoneFilter === 'All') return tables;
    return tables.filter((t) => (t.zone || 'Main Dining') === zoneFilter);
  }, [tables, zoneFilter]);

  // Quick Order Sheet helpers
  const openNewOrderForTable = (tblNumber?: string) => {
    if (!currentWaiter) return;
    const targetTable =
      tblNumber ||
      tables.find((t) => t.assignedWaiterId === currentWaiter.id && t.status === 'occupied')?.number ||
      tables.find((t) => t.status === 'available')?.number ||
      tables[0]?.number ||
      'Table 01';
    setEditingDraftId(null);
    setDraftOrderType('dine_in');
    setDraftPriority('normal');
    setOrderTableNumber(targetTable);
    setOrderGuestName('');
    setOrderGuestPhone('');
    setOrderDeliveryAddress('');
    setOrderNotes('');
    setOrderPayTiming('later');
    setOrderSearch('');
    setDraftItems([]);
    setExpandedCustomizeIdx(null);
    setShowCustomItemBuilder(false);
    setIsNewOrderOpen(true);
  };

  const openEditDraftSheet = (draft: Order) => {
    setEditingDraftId(draft.id);
    setDraftOrderType(draft.type);
    setDraftPriority(draft.priority || 'normal');
    setOrderTableNumber(draft.tableNumber || 'Table 01');
    setOrderGuestName(draft.customerName || '');
    setOrderGuestPhone(draft.customerPhone || '');
    setOrderDeliveryAddress(draft.deliveryAddress || '');
    setOrderNotes(draft.notes || '');
    setOrderPayTiming('later');
    setOrderSearch('');
    setExpandedCustomizeIdx(null);
    setShowCustomItemBuilder(false);
    setDraftItems(
      draft.items.map((it) => {
        const foundMenu = menuItems.find((m) => m.id === it.menuItemId);
        const basePrice = foundMenu
          ? foundMenu.price
          : Math.max(0, it.price - (it.extraCharge || 0));
        const syntheticItem: MenuItem = foundMenu || {
          id: it.menuItemId,
          name: it.name,
          category: 'Special',
          description: it.customInstructions || 'Special off-menu customer request',
          price: basePrice,
          image: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
          preparationTimeMinutes: 15,
          isAvailable: true,
          station: it.station,
        };
        return {
          menuItem: syntheticItem,
          quantity: it.quantity,
          selectedPortion: it.portion
            ? foundMenu?.portions?.find((p) => p.name === it.portion) || {
                name: it.portion,
                priceDelta: 0,
              }
            : undefined,
          selectedModifiers: it.selectedModifiers || [],
          customerNotes: it.customerNotes,
          customInstructions: it.customInstructions,
          extraCharge: it.extraCharge,
          isCustomItem: it.isCustomItem || it.menuItemId.startsWith('custom-'),
        };
      })
    );
    setIsNewOrderOpen(true);
  };

  const openPaymentSheet = (order: Order) => {
    const remaining = Math.max(0, order.total - (order.paidAmount || 0));
    setPaymentOrder(order);
    setPaymentMethodDraft('cash');
    setAmountToCollect(remaining);
    setCashTendered(remaining);
    setTxRefDraft('');
    setCompleteServiceOnPay(true);
  };

  const handleFastServeToServed = (order: Order) => {
    if (!currentWaiter) return;
    const ok = fastForwardOrderToServed(order.id, currentWaiter.name);
    if (!ok) return;
    const isUnpaid = order.paymentStatus !== 'paid';
    setNoticePayOrderId(isUnpaid ? order.id : null);
    setTableActionNotice(
      isUnpaid
        ? `${order.orderNumber} processed all statuses up to Served — ready to continue to Paid.`
        : `${order.orderNumber} processed all statuses up to Served.`
    );
    setTimeout(() => {
      setTableActionNotice(null);
      setNoticePayOrderId(null);
    }, 6500);
  };

  const handleConfirmWaiterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentOrder || !currentWaiter) return;
    const remaining = Math.max(0, paymentOrder.total - (paymentOrder.paidAmount || 0));
    const collectAmt = Math.min(remaining, Math.max(1, Math.round(amountToCollect)));
    if (remaining <= 0 || collectAmt <= 0) return;

    const willComplete = collectAmt >= remaining && completeServiceOnPay;
    processPayment(paymentOrder.id, paymentMethodDraft, collectAmt, {
      completeService: willComplete,
      collectedBy: `Waiter ${currentWaiter.name}`,
      transactionRef: txRefDraft.trim() || undefined,
    });

    const changeDue =
      paymentMethodDraft === 'cash' ? Math.max(0, cashTendered - collectAmt) : 0;
    const coupon =
      paymentOrder.serviceCouponCode || `SV-${paymentOrder.orderNumber.replace('#', '')}`;
    const balanceLeft = Math.max(0, remaining - collectAmt);

    setTableActionNotice(
      `${balanceLeft > 0 ? 'Partial Payment' : 'Paid'} ${formatMoney(collectAmt)} (${paymentMethodDraft.toUpperCase()}) for ${paymentOrder.orderNumber} · Coupon ${coupon}${
        balanceLeft > 0 ? ` · Balance Left: ${formatMoney(balanceLeft)}` : ''
      }${changeDue > 0 ? ` · Change: ${formatMoney(changeDue)}` : ''}${willComplete ? ' · Service Completed!' : ''}`
    );
    setPaymentOrder(null);
    setTimeout(() => setTableActionNotice(null), 5000);
  };

  const addDraftItem = (item: MenuItem) => {
    setDraftItems((prev) => {
      const idx = prev.findIndex(
        (ci) =>
          ci.menuItem.id === item.id &&
          !ci.isCustomItem &&
          !ci.customInstructions &&
          !(ci.extraCharge && ci.extraCharge > 0)
      );
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { menuItem: item, quantity: 1, selectedModifiers: [] }];
    });
  };

  const updateDraftLineQty = (index: number, delta: number) => {
    setDraftItems((prev) =>
      prev
        .map((ci, idx) => (idx === index ? { ...ci, quantity: ci.quantity + delta } : ci))
        .filter((ci) => ci.quantity > 0)
    );
  };

  const updateDraftLineCustomization = (
    index: number,
    patch: { customInstructions?: string; extraCharge?: number; selectedPortion?: { name: string; priceDelta: number } }
  ) => {
    setDraftItems((prev) =>
      prev.map((ci, idx) => (idx === index ? { ...ci, ...patch } : ci))
    );
  };

  const handleAddCustomOffMenuItem = () => {
    if (!customName.trim() || customPrice < 0 || customQty <= 0) return;
    const synthetic: MenuItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: customName.trim(),
      category: 'Special',
      description: customPrepNote.trim() || 'Special off-menu customer request',
      price: Math.round(customPrice),
      image: '',
      preparationTimeMinutes: 18,
      isAvailable: true,
      station: customStation,
    };
    setDraftItems((prev) => [
      ...prev,
      {
        menuItem: synthetic,
        quantity: Math.max(1, Math.round(customQty)),
        selectedModifiers: [],
        customInstructions: customPrepNote.trim() || 'Custom preparation (off-menu)',
        isCustomItem: true,
      },
    ]);
    setCustomName('');
    setCustomQty(1);
    setCustomPrice(15000);
    setCustomPrepNote('');
    setShowCustomItemBuilder(false);
  };

  const draftSubtotal = draftItems.reduce((acc, ci) => {
    const unit = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0) + (ci.extraCharge || 0);
    return acc + unit * ci.quantity;
  }, 0);
  const draftDeliveryFee = draftOrderType === 'delivery' ? currentTenant.deliveryFee : 0;
  const draftTax = taxEnabled ? Math.round(draftSubtotal * (taxRatePct / 100)) : 0;
  const draftTotal = draftSubtotal + draftTax + draftDeliveryFee;

  const submitWaiterOrderAction = (asDraft: boolean) => {
    if (draftItems.length === 0 || !currentWaiter) return;

    const paidNow = !asDraft && orderPayTiming !== 'later';
    const newOrder = submitOrder({
      type: draftOrderType,
      tableNumber: draftOrderType === 'dine_in' ? orderTableNumber : undefined,
      customerName:
        orderGuestName.trim() ||
        (draftOrderType === 'dine_in' ? `${orderTableNumber} Guest` : 'Walk-in Guest'),
      customerPhone: orderGuestPhone.trim() || undefined,
      deliveryAddress: draftOrderType === 'delivery' ? orderDeliveryAddress.trim() || currentTenant.address : undefined,
      servingWaiterId: currentWaiter.id,
      referralWaiterId: currentWaiter.id,
      notes: orderNotes.trim() || `Table order by ${currentWaiter.name}`,
      markAsPaid: paidNow,
      paymentMethod: paidNow ? orderPayTiming : undefined,
      asDraft,
      existingDraftId: editingDraftId || undefined,
      priority: draftPriority,
      deliveryFee: draftDeliveryFee,
      tax: draftTax,
      taxRate: taxEnabled ? taxRatePct / 100 : 0,
      isTaxExempt: !taxEnabled,
      customItems: draftItems,
      actorName: currentWaiter.name,
      actorRole: 'waiter',
    });

    setIsNewOrderOpen(false);
    setEditingDraftId(null);
    setDraftItems([]);
    setActiveTab('orders');
    setOrderFilter(asDraft ? 'draft' : 'all');
    setTableActionNotice(
      asDraft
        ? `Draft ${newOrder.orderNumber} saved (${formatMoney(newOrder.total)}). Visible to Manager & Owner.`
        : `Ticket ${newOrder.orderNumber} (${newOrder.kotNumber || ''}) · Coupon ${newOrder.serviceCouponCode || ''}${
            paidNow ? ` · Paid ${orderPayTiming.toUpperCase()}` : ''
          } sent to Kitchen.`
    );
    setTimeout(() => setTableActionNotice(null), 5000);
  };

  const handleSubmitWaiterOrder = (e: React.FormEvent) => {
    e.preventDefault();
    submitWaiterOrderAction(false);
  };

  const handleSendApprovalRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalOrder || !approvalReason.trim() || !currentWaiter) return;
    const impact =
      approvalType === 'cancel_order'
        ? approvalOrder.total
        : approvalDiscountType === 'percent'
        ? Math.round(approvalOrder.subtotal * (Math.min(100, Math.max(0, approvalDiscountValue)) / 100))
        : Math.min(approvalOrder.subtotal, Math.max(0, Math.round(approvalDiscountValue)));

    requestApproval({
      orderId: approvalOrder.id,
      actionType: approvalType,
      requestedBy: currentWaiter.name,
      requestedRole: 'waiter',
      details:
        approvalType === 'cancel_order'
          ? `Cancel ${approvalOrder.orderNumber} (${formatMoney(approvalOrder.total)})`
          : `${
              approvalDiscountType === 'percent'
                ? `${approvalDiscountValue}%`
                : formatMoney(approvalDiscountValue)
            } discount on ${approvalOrder.orderNumber}`,
      amountImpact: impact,
      reason: approvalReason.trim(),
      payload:
        approvalType === 'discount'
          ? { discountType: approvalDiscountType, discountValue: approvalDiscountValue }
          : undefined,
    });

    setTableActionNotice(
      `Approval request sent to Manager for ${approvalOrder.orderNumber}. All order records remain preserved.`
    );
    setApprovalOrder(null);
    setApprovalReason('');
    setTimeout(() => setTableActionNotice(null), 5000);
  };

  const filteredMenuForOrder = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return menuItems.filter(
      (m) =>
        m.isAvailable &&
        (!q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
    );
  }, [menuItems, orderSearch]);

  const commissionOrders = stats.myOrders.filter(
    (o) => o.paymentStatus === 'paid' && o.status !== 'cancelled'
  );

  if (!currentWaiter) {
    return (
      <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base" aria-hidden="true">{currentTenant.logo}</span>
            <h1 className="text-sm sm:text-base font-extrabold text-neutral-900 truncate">
              {currentTenant.name} · Waiter Portal
            </h1>
          </div>
          {!lockedStandalone && (
            <button
              type="button"
              onClick={() => setActiveRole('owner')}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold cursor-pointer"
            >
              Back to Dashboard
            </button>
          )}
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 max-w-md w-full text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h2 className="text-base font-extrabold text-neutral-900">No Waiters Configured Yet</h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              {currentTenant.name} has no waiter profiles registered yet. Add waiters in Staff &amp; Payroll to generate personal referral QR links and track commission.
            </p>
            {!lockedStandalone && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveRole('reception')}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
                >
                  Open Staff &amp; Payroll
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRole('cashier')}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 text-xs font-bold cursor-pointer"
                >
                  Open Cashier POS
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen bg-neutral-50 text-neutral-900 flex flex-col overflow-hidden md:overflow-visible">
      {/* Compact Flutter-Style Waiter AppBar with Centered Restaurant Name */}
      <header className="shrink-0 md:sticky md:top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 pt-safe">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Left: optional mobile Back-to-ERP + Waiter identity */}
          <div className="flex items-center gap-2 min-w-0">
            {!lockedStandalone && (
              <button
                type="button"
                onClick={() => setActiveRole('owner')}
                className="md:hidden px-2 py-1 text-[11px] font-bold bg-neutral-900 text-white rounded-lg shrink-0 cursor-pointer"
                title="Back to Main Dashboard"
              >
                ERP
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {currentWaiter.name.charAt(0)}
            </div>
            <div className="min-w-0 hidden xs:block sm:block">
              <div className="text-xs font-bold text-neutral-900 truncate leading-tight">
                {currentWaiter.name.split(' ')[0]}
              </div>
              <div className="text-[10px] text-neutral-500 truncate font-mono">
                {currentWaiter.referralCode}
              </div>
            </div>
          </div>

          {/* Center: Centered & Well-Organized Restaurant / Shop Name */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 px-1">
            <div className="flex items-center justify-center gap-1.5 max-w-[180px] sm:max-w-xs">
              <span className="text-base shrink-0" aria-hidden="true">{currentTenant.logo}</span>
              <h1 className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight truncate">
                {currentTenant.name}
              </h1>
            </div>
            <p className="text-[10px] text-neutral-500 truncate leading-tight">
              Waiter Portal · {currentWaiter.name}
            </p>
          </div>

          {/* Right: Currency + QR */}
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            <button
              onClick={toggleCurrency}
              className="min-h-[38px] px-2.5 text-xs font-mono font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle currency"
            >
              {currency}
            </button>
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="min-h-[38px] min-w-[38px] flex items-center justify-center bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl transition-colors cursor-pointer"
              aria-label="Show My QR Code"
              title="Show Table Stand QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Desktop Centered Navigation Tabs (hidden on mobile where bottom nav stays pinned) */}
        <nav
          className="hidden md:flex items-center justify-center gap-8 text-sm font-semibold border-t border-neutral-100 px-6"
          aria-label="Waiter Navigation"
        >
          {(
            [
              { id: 'home', label: 'Home' },
              { id: 'orders', label: `Orders${stats.pendingOrdersCount > 0 ? ` (${stats.pendingOrdersCount})` : ''}` },
              { id: 'tables', label: 'Tables' },
              { id: 'earnings', label: 'Earnings' },
            ] as { id: WaiterTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Scrollable Body (ONLY this region scrolls on mobile while Header & Bottom Nav stay pinned) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain md:overflow-visible">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 pb-8 md:pb-10 space-y-5">
        {tableActionNotice && (
          <div className="bg-emerald-600 text-white text-xs font-semibold px-4 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
            <span>{tableActionNotice}</span>
            <div className="flex items-center gap-2 shrink-0">
              {noticePayOrderId && (() => {
                const payTarget = stats.myOrders.find(
                  (o) => o.id === noticePayOrderId && o.paymentStatus !== 'paid'
                );
                if (!payTarget) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      openPaymentSheet(payTarget);
                      setTableActionNotice(null);
                      setNoticePayOrderId(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-extrabold text-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Continue to Pay</span>
                  </button>
                );
              })()}
              <button
                onClick={() => {
                  setTableActionNotice(null);
                  setNoticePayOrderId(null);
                }}
                className="p-1 text-emerald-100 hover:text-white cursor-pointer"
                aria-label="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <>
            {/* 2x2 Mobile KPI Grid -> 4-col on Desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90">
                <div className="text-xs font-medium text-neutral-500">Today's Sales</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                  {formatMoney(stats.todaySales)}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  {stats.completedOrdersCount} settled tickets
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90">
                <div className="text-xs font-medium text-neutral-500">Earned (5%)</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700 mt-1 tabular-nums">
                  {formatMoney(stats.earnedCommission)}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Pending: {formatMoney(stats.pendingCommission)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90">
                <div className="text-xs font-medium text-neutral-500">Active Tickets</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-600 mt-1 tabular-nums">
                  {stats.pendingOrdersCount}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {readyToServeCount > 0 ? `${readyToServeCount} ready on pass` : 'Kitchen in progress'}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-neutral-200/90">
                <div className="text-xs font-medium text-neutral-500">Total My Orders</div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-neutral-900 mt-1 tabular-nums">
                  {stats.myOrders.length}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">Assigned & referred</div>
              </div>
            </div>

            {/* Quick Action Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => openNewOrderForTable()}
                className="min-h-[52px] px-4 py-3 bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Take New Table Order</span>
              </button>

              <button
                onClick={() => setIsQrModalOpen(true)}
                className="min-h-[52px] px-4 py-3 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <QrCode className="w-5 h-5 text-amber-600" />
                <span>Show Table QR Stand</span>
              </button>
            </div>

            {/* Personal Referral Link Card */}
            <div className="bg-neutral-900 text-white rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-amber-400">Personal Order Link</div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Share link with guests to earn 5% commission
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Orders placed via your QR or link automatically route to your active tickets and commission ledger.
                </p>
              </div>

              <div className="px-3 py-2.5 bg-neutral-950/70 rounded-xl border border-neutral-800 text-xs font-mono text-emerald-400 truncate">
                {personalLink}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleShareLink}
                  className="min-h-[44px] px-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{shareStatus === 'shared' ? 'Shared' : 'Share'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="min-h-[44px] px-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {shareStatus === 'copied' ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{shareStatus === 'copied' ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleOpenCustomerPortal}
                  className="min-h-[44px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Preview</span>
                </button>
              </div>
            </div>

            {/* Active Tickets Preview */}
            <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Needs Attention</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                >
                  View All ({stats.myOrders.length})
                </button>
              </div>

              {stats.myOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  All assigned orders are settled. Tap "Take New Table Order" or share your QR link.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {stats.myOrders
                    .filter((o) => o.status !== 'completed' && o.status !== 'cancelled')
                    .slice(0, 3)
                    .map((order) => (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs flex-wrap">
                            <span className="font-mono font-extrabold text-neutral-900">
                              {order.orderNumber}
                            </span>
                            <span className="font-mono font-bold text-[11px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                              {order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`}
                            </span>
                            <span className="text-neutral-500">
                              {order.tableNumber || order.type}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-600 mt-1 leading-snug break-words">
                            {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {order.status !== 'draft' &&
                            order.status !== 'served' &&
                            order.status !== 'completed' &&
                            order.status !== 'cancelled' &&
                            order.status !== 'rejected' && (
                              <button
                                type="button"
                                onClick={() => handleFastServeToServed(order)}
                                title="Process all kitchen statuses up to Served (helps busy kitchen)"
                                className="min-h-[40px] px-3 bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-xl shrink-0 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                              >
                                {order.status !== 'ready' && <FastForward className="w-3.5 h-3.5" />}
                                <span>{order.status === 'ready' ? 'Serve' : 'Process → Served'}</span>
                              </button>
                            )}

                          {order.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => openPaymentSheet(order)}
                              className="min-h-[40px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Pay</span>
                            </button>
                          )}

                          {order.paymentStatus === 'paid' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'completed', currentWaiter.name)}
                              className="min-h-[40px] px-3 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer whitespace-nowrap"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-neutral-900">My Orders</h2>
              <button
                onClick={() => openNewOrderForTable()}
                className="min-h-[44px] px-4 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {(
                [
                  { id: 'all', label: `All (${stats.myOrders.length})` },
                  { id: 'draft', label: `Drafts (${draftsCount})` },
                  { id: 'active', label: 'In Kitchen' },
                  { id: 'ready', label: 'Ready / Served' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOrderFilter(tab.id)}
                  className={`min-h-[40px] px-4 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    orderFilter === tab.id
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-2">
                <p className="text-sm font-bold text-neutral-800">No orders in this filter</p>
                <p className="text-xs text-neutral-500">
                  Take a table order, save a draft, or share your personal link to receive guest orders.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {filteredOrders.map((order) => {
                  const isDraft = order.status === 'draft';
                  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';
                  const isReady = order.status === 'ready';
                  const isPaid = order.paymentStatus === 'paid';
                  const remainingBalance = Math.max(0, order.total - (order.paidAmount || 0));
                  const orderComm = getOrderCommission(order, currentWaiter.id);

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border p-4 space-y-3 flex flex-col justify-between ${
                        isDraft
                          ? 'border-amber-300 bg-amber-50/20'
                          : isCancelled
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-neutral-200/90'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-extrabold text-sm text-neutral-900">
                                {order.orderNumber}
                              </span>
                              {order.kotNumber && (
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                  {order.kotNumber}
                                </span>
                              )}
                              {order.priority && order.priority !== 'normal' && (
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded inline-flex items-center gap-0.5 ${
                                    order.priority === 'vip'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  <Flame className="w-2.5 h-2.5" />
                                  {order.priority}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-neutral-600">
                                {order.tableNumber || (order.type === 'delivery' ? 'Delivery' : 'Takeaway')}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">
                              {order.customerName}
                              {order.referralWaiterId === currentWaiter.id
                                ? ` · ${
                                    orderComm.mode === 'percent'
                                      ? `${orderComm.value}%`
                                      : formatMoney(orderComm.value)
                                  } Commission`
                                : ''}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div
                              className={`text-xs font-bold capitalize ${
                                isDraft
                                  ? 'text-amber-700'
                                  : isCancelled
                                  ? 'text-rose-700'
                                  : 'text-neutral-900'
                              }`}
                            >
                              {isDraft ? 'Saved Draft' : order.status.replace(/_/g, ' ')}
                            </div>
                            <div
                              className={`text-[11px] font-semibold uppercase ${
                                isPaid
                                  ? 'text-emerald-700'
                                  : order.paymentStatus === 'partial'
                                  ? 'text-blue-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {order.paymentStatus}
                            </div>
                          </div>
                        </div>

                        {/* Service Coupon Code Strip */}
                        <div className="bg-amber-50/90 border border-dashed border-amber-300 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-semibold text-amber-950">
                            <Ticket className="w-3.5 h-3.5 text-amber-700" />
                            <span>Coupon Code</span>
                          </span>
                          <span className="font-mono font-extrabold tracking-wider text-neutral-900">
                            {order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`}
                          </span>
                        </div>

                        <div className="divide-y divide-neutral-100 border-t border-b border-neutral-100 py-1 text-xs">
                          {order.items.map((it, idx) => {
                            const matchedMenu = !it.isCustomItem
                              ? menuItems.find((m) => m.id === it.menuItemId)
                              : undefined;
                            return (
                              <div key={idx} className="py-2.5 flex items-start gap-2.5">
                                {matchedMenu?.image ? (
                                  <img
                                    src={matchedMenu.image}
                                    alt={it.name}
                                    referrerPolicy="no-referrer"
                                    className="w-11 h-11 rounded-xl object-cover shrink-0 border border-neutral-200 bg-neutral-100"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-xl shrink-0 border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`font-semibold leading-snug break-words ${
                                          it.status === 'rejected'
                                            ? 'line-through text-neutral-400'
                                            : 'text-neutral-900'
                                        }`}
                                      >
                                        {it.quantity}x {it.name}
                                      </span>
                                      {it.isCustomItem && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          Off-Menu Special
                                        </span>
                                      )}
                                      {it.status === 'rejected' ? (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                                          Rejected
                                        </span>
                                      ) : (
                                        <span className="text-[11px] text-neutral-400 capitalize">
                                          {it.status}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-mono tabular-nums text-neutral-700 font-semibold shrink-0">
                                      {formatMoney((it.price + (it.extraCharge || 0)) * it.quantity)}
                                    </span>
                                  </div>
                                  {(it.customInstructions || it.customerNotes || (it.extraCharge && it.extraCharge > 0)) && (
                                    <div className="text-[11px] text-amber-800 bg-amber-50/70 px-2 py-0.5 rounded-md break-words">
                                      {it.customInstructions || it.customerNotes}
                                      {it.extraCharge && it.extraCharge > 0
                                        ? ` (+${formatMoney(it.extraCharge)} extra)`
                                        : ''}
                                    </div>
                                  )}
                                  {it.status === 'rejected' && it.rejectionReason && (
                                    <div className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-medium break-words">
                                      Kitchen Note: {it.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {order.notes && (
                          <div className="text-[11px] text-neutral-600 bg-neutral-50 rounded-lg px-2.5 py-1.5">
                            <span className="font-bold">Instructions:</span> {order.notes}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-neutral-500">
                              Order Total{order.tax > 0 ? ` (incl. ${formatMoney(order.tax)} VAT)` : ''}
                            </div>
                            <div className="text-sm font-extrabold font-mono tabular-nums text-neutral-900">
                              {formatMoney(order.total)}
                            </div>
                            {order.paymentStatus === 'partial' && (
                              <div className="text-[11px] font-mono text-blue-700 font-semibold">
                                Paid {formatMoney(order.paidAmount)} · Bal {formatMoney(remainingBalance)}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {isDraft && (
                              <>
                                <button
                                  onClick={() => openEditDraftSheet(order)}
                                  className="min-h-[42px] px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  <FileEdit className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    submitDraftToKitchen(order.id, currentWaiter.name);
                                    setTableActionNotice(
                                      `Draft ${order.orderNumber} sent to Kitchen (${order.kotNumber || ''}).`
                                    );
                                    setTimeout(() => setTableActionNotice(null), 4000);
                                  }}
                                  className="min-h-[42px] px-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Send to Kitchen</span>
                                </button>
                              </>
                            )}

                            {!isDraft &&
                              !isCancelled &&
                              order.status !== 'served' &&
                              order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleFastServeToServed(order)}
                                  title="Process all kitchen statuses up to Served (helps busy kitchen)"
                                  className="min-h-[42px] px-3.5 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                                >
                                  {!isReady && <FastForward className="w-3.5 h-3.5" />}
                                  <span>{isReady ? 'Serve' : 'Process → Served'}</span>
                                </button>
                              )}

                            {!isDraft && !isCancelled && !isPaid && order.status !== 'completed' && (
                              <button
                                onClick={() => openPaymentSheet(order)}
                                className="min-h-[42px] px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <Banknote className="w-4 h-4" />
                                <span>{order.paidAmount > 0 ? 'Collect Bal' : 'Take Payment'}</span>
                              </button>
                            )}

                            {isPaid && order.status !== 'completed' && !isCancelled && !isDraft && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'completed', currentWaiter.name)}
                                className="min-h-[42px] px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Complete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {!isCancelled && order.status !== 'completed' && (
                          <div className="flex justify-end border-t border-neutral-100 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovalOrder(order);
                                setApprovalType(isDraft ? 'cancel_order' : 'discount');
                                setApprovalDiscountType('percent');
                                setApprovalDiscountValue(10);
                                setApprovalReason('');
                              }}
                              className="text-[11px] font-semibold text-neutral-500 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Request Discount / Cancel Approval</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TABLES */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-neutral-900">Floor Tables</h2>
                <p className="text-xs text-neutral-500">Tap an open table to seat guests or take an order</p>
              </div>
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {zones.map((zone) => (
                <button
                  key={zone}
                  onClick={() => setZoneFilter(zone)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    zoneFilter === zone
                      ? 'bg-neutral-900 text-white'
                      : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {zone}
                </button>
              ))}
            </div>

            {blockedTableNotice && (
              <div className="bg-amber-50 border border-amber-300 text-amber-950 text-xs px-4 py-3 rounded-2xl flex items-center justify-between gap-3">
                <span>{blockedTableNotice}</span>
                <button
                  onClick={() => setBlockedTableNotice(null)}
                  className="font-bold text-amber-900 shrink-0 min-h-[36px] px-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredTables.map((table) => {
                const isAssignedToMe = table.assignedWaiterId === currentWaiter.id;
                const isAvailable = table.status === 'available';
                const tableOrder = table.currentOrderId
                  ? stats.myOrders.find((o) => o.id === table.currentOrderId)
                  : undefined;

                let cardStyle = 'bg-white border-emerald-300 text-neutral-900 hover:bg-emerald-50/40';
                if (table.status === 'occupied') {
                  cardStyle = 'bg-amber-50/60 border-amber-300 text-amber-950';
                } else if (table.status === 'billing') {
                  cardStyle = 'bg-blue-50/60 border-blue-300 text-blue-950';
                } else if (table.status === 'reserved') {
                  cardStyle = 'bg-neutral-100 border-neutral-300 text-neutral-600';
                }

                return (
                  <div
                    key={table.id}
                    className={`min-h-[112px] p-4 rounded-2xl border text-left transition-colors flex flex-col justify-between gap-2 ${cardStyle} ${
                      isAssignedToMe ? 'ring-2 ring-emerald-500' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isAvailable) {
                          setBlockedTableNotice(null);
                          updateTableStatus(table.id, 'occupied', currentWaiter.id);
                          openNewOrderForTable(table.number);
                          return;
                        }
                        if (isAssignedToMe && table.status === 'occupied') {
                          setBlockedTableNotice(null);
                          openNewOrderForTable(table.number);
                          return;
                        }
                        if (tableOrder && tableOrder.paymentStatus !== 'paid') {
                          setBlockedTableNotice(null);
                          openPaymentSheet(tableOrder);
                          return;
                        }
                        setBlockedTableNotice(
                          `${table.number} is currently ${table.status.toUpperCase()} and cannot be reassigned until cleared.`
                        );
                      }}
                      className="w-full text-left flex-1 flex flex-col justify-between cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-extrabold">{table.number}</span>
                        <span className="text-[11px] font-mono text-neutral-500">{table.capacity} seats</span>
                      </div>

                      <div className="space-y-1 mt-2">
                        <div className="text-[11px] text-neutral-500 truncate">
                          {table.zone || 'Main Dining'}
                        </div>
                        <div className="text-xs font-bold capitalize flex items-center justify-between">
                          <span>{table.status}</span>
                          {isAssignedToMe && (
                            <span className="text-[10px] font-semibold text-emerald-700">Mine</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {tableOrder && tableOrder.paymentStatus !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => openPaymentSheet(tableOrder)}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Take Pay ({formatMoney(tableOrder.total)})</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: EARNINGS & PROFILE */}
        {activeTab === 'earnings' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-lg font-extrabold text-neutral-900">Commission & Profile</h2>

            {/* Commission Breakdown */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-neutral-500">Total Earned Commission (Paid Orders)</div>
                  <div className="text-2xl font-extrabold font-mono text-emerald-700 tabular-nums mt-0.5">
                    {formatMoney(stats.earnedCommission)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-neutral-500">Rate (Manager Set)</div>
                  <div className="text-sm font-bold font-mono text-neutral-900">
                    {defaultCommissionMode === 'percent'
                      ? `${defaultCommissionValue}% of net sales`
                      : `${formatMoney(defaultCommissionValue)} / paid order`}
                  </div>
                </div>
              </div>

              {stats.unpaidOrdersCount > 0 && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                  <span>
                    {stats.unpaidOrdersCount} unpaid order{stats.unpaidOrdersCount > 1 ? 's' : ''} awaiting payment
                  </span>
                  <span className="font-mono font-bold tabular-nums">
                    +{formatMoney(stats.unpaidProjectedCommission)} on pay
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs">
                <div>
                  <div className="text-neutral-500">Paid Out</div>
                  <div className="font-mono font-bold text-neutral-900 text-sm mt-0.5 tabular-nums">
                    {formatMoney(stats.paidCommission)}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Pending Settlement</div>
                  <div className="font-mono font-bold text-blue-700 text-sm mt-0.5 tabular-nums">
                    {formatMoney(stats.pendingCommission)}
                  </div>
                </div>
              </div>
            </div>

            {/* Commission Ledger */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900">Commission Ledger (Paid Orders)</h3>
                <span className="text-xs text-neutral-500">{commissionOrders.length} paid orders</span>
              </div>

              {commissionOrders.length === 0 ? (
                <p className="p-6 text-center text-xs text-neutral-500">
                  No paid orders yet for this shift.
                </p>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {commissionOrders.map((ord) => {
                    const resolved = getOrderCommission(ord, currentWaiter.id);
                    const netSale = Math.max(0, ord.subtotal - (ord.discount || 0));
                    return (
                      <div key={ord.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-neutral-900 truncate">
                            {ord.orderNumber} · {ord.serviceCouponCode || `SV-${ord.orderNumber.replace('#', '')}`} · {ord.tableNumber || ord.type}
                          </div>
                          <div className="text-neutral-500">
                            Net sale: {formatMoney(netSale)} ·{' '}
                            <span className="font-semibold text-neutral-700">
                              {resolved.mode === 'percent'
                                ? `${resolved.value}%`
                                : `${formatMoney(resolved.value)} fixed`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-700 tabular-nums shrink-0">
                          +{formatMoney(resolved.amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Switch Waiter Device Profile */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900">Active Waiter Account</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {waiters.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => setActiveWaiterId(w.id)}
                    className={`min-h-[48px] px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      w.id === currentWaiter.id
                        ? 'border-orange-500 bg-orange-50 text-neutral-900 font-bold'
                        : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <div className="text-xs truncate">{w.name}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{w.referralCode}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Discreet Workspace Switcher (hidden when locked in standalone WebView) */}
            {!lockedStandalone && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-neutral-500">Switch App View</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveRole('customer')}
                    className="min-h-[44px] px-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
                  >
                    Customer App
                  </button>
                  <button
                    onClick={() => setActiveRole('cashier')}
                    className="min-h-[44px] px-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
                  >
                    Back Office ERP
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Pinned Flutter-Style Bottom Navigation Bar (Always visible while content scrolls) */}
      <nav
        aria-label="Waiter Bottom Navigation"
        className="md:hidden shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {(
            [
              { id: 'home', label: 'Home', icon: Home },
              { id: 'orders', label: 'Orders', icon: ClipboardList, badge: stats.pendingOrdersCount },
              { id: 'tables', label: 'Tables', icon: LayoutGrid },
              { id: 'earnings', label: 'Earnings', icon: Wallet },
            ] as { id: WaiterTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[]
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-full flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                  isActive ? 'text-orange-600' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <div className="relative">
                  <Icon className="w-[22px] h-[22px]" />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-orange-600 text-white text-[10px] font-bold font-mono rounded-full flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Flexible 3-Type Order Pad Bottom Sheet (Standard, Customized, Off-Menu Special + Save Draft) */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 max-h-[92dvh] sm:max-h-[88dvh] flex flex-col pb-safe">
            <div className="sm:hidden w-10 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3 shrink-0" />

            <div className="shrink-0 flex items-center justify-between p-4 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-base text-neutral-900">
                  {editingDraftId ? 'Edit Saved Draft Order' : 'New Customer Order'}
                </h3>
                <p className="text-xs text-neutral-500">
                  Waiter: {currentWaiter.name} · Standard, Customized &amp; Off-Menu Special Items
                </p>
              </div>
              <button
                onClick={() => setIsNewOrderOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-900 rounded-xl"
                aria-label="Close order pad"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWaiterOrder} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="p-4 space-y-3.5 overflow-y-auto flex-1 min-h-0">
                {/* Order Channel & Priority */}
                <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1 rounded-xl">
                  {(
                    [
                      { id: 'dine_in', label: 'Dine-In' },
                      { id: 'pickup', label: 'Takeaway' },
                      { id: 'delivery', label: 'Delivery' },
                    ] as const
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setDraftOrderType(ch.id)}
                      className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        draftOrderType === ch.id
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {draftOrderType === 'dine_in' ? (
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Table</label>
                      <select
                        value={orderTableNumber}
                        onChange={(e) => setOrderTableNumber(e.target.value)}
                        className="w-full min-h-[44px] px-3 text-xs font-bold border border-neutral-200 bg-neutral-50 rounded-xl"
                      >
                        {tables.map((t) => (
                          <option key={t.id} value={t.number}>
                            {t.number} ({t.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Phone</label>
                      <input
                        type="tel"
                        value={orderGuestPhone}
                        onChange={(e) => setOrderGuestPhone(e.target.value)}
                        placeholder="+255 7..."
                        className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Guest Name</label>
                    <input
                      type="text"
                      value={orderGuestName}
                      onChange={(e) => setOrderGuestName(e.target.value)}
                      placeholder="Guest name"
                      className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Priority</label>
                    <select
                      value={draftPriority}
                      onChange={(e) => setDraftPriority(e.target.value as 'normal' | 'rush' | 'vip')}
                      className="w-full min-h-[44px] px-3 text-xs font-bold border border-neutral-200 bg-neutral-50 rounded-xl"
                    >
                      <option value="normal">Normal</option>
                      <option value="rush">Rush Ticket</option>
                      <option value="vip">VIP Guest</option>
                    </select>
                  </div>
                </div>

                {draftOrderType === 'delivery' && (
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                      Delivery Address (+{formatMoney(currentTenant.deliveryFee)})
                    </label>
                    <input
                      type="text"
                      value={orderDeliveryAddress}
                      onChange={(e) => setOrderDeliveryAddress(e.target.value)}
                      placeholder="Street, plot or landmark..."
                      className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                    />
                  </div>
                )}

                {/* Mode C Trigger: Add Special Off-Menu Custom Item */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Special / Off-Menu Customer Request</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCustomItemBuilder((prev) => !prev)}
                      className="min-h-[34px] px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      {showCustomItemBuilder ? 'Close' : '+ Custom Item'}
                    </button>
                  </div>

                  {showCustomItemBuilder && (
                    <div className="space-y-2 pt-1 border-t border-indigo-200/70">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Item name (e.g. Special Family Chicken Platter)"
                        className="w-full min-h-[40px] px-3 text-xs bg-white border border-indigo-200 rounded-lg"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={customQty}
                            onChange={(e) => setCustomQty(Number(e.target.value))}
                            className="w-full min-h-[38px] px-2.5 text-xs font-mono font-bold bg-white border border-indigo-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">Price (TZS)</label>
                          <input
                            type="number"
                            min={0}
                            step={500}
                            value={customPrice}
                            onChange={(e) => setCustomPrice(Number(e.target.value))}
                            className="w-full min-h-[38px] px-2.5 text-xs font-mono font-bold bg-white border border-indigo-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-indigo-900 block mb-0.5">Station</label>
                          <select
                            value={customStation}
                            onChange={(e) => setCustomStation(e.target.value as KitchenStation)}
                            className="w-full min-h-[38px] px-2 text-xs font-semibold bg-white border border-indigo-200 rounded-lg"
                          >
                            <option value="grill">Grill</option>
                            <option value="hot_kitchen">Main / Hot Kitchen</option>
                            <option value="drinks">Drinks / Bar</option>
                            <option value="cold_prep">Cold Prep</option>
                            <option value="dessert">Dessert</option>
                          </select>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={customPrepNote}
                        onChange={(e) => setCustomPrepNote(e.target.value)}
                        placeholder="Preparation instructions (e.g. Extra spices, serve separately)"
                        className="w-full min-h-[40px] px-3 text-xs bg-white border border-indigo-200 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomOffMenuItem}
                        disabled={!customName.trim()}
                        className="w-full min-h-[40px] rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
                      >
                        Add Off-Menu Line to This Order Only
                      </button>
                    </div>
                  )}
                </div>

                {/* Selected Draft Lines with Mode B Inline Customization */}
                {draftItems.length > 0 && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                      <span>Order Lines ({draftItems.reduce((s, i) => s + i.quantity, 0)})</span>
                      <span className="text-[11px] font-normal text-neutral-500">Tap Customize to modify prep or extra price</span>
                    </div>
                    <div className="space-y-2.5">
                      {draftItems.map((ci, idx) => {
                        const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0) + (ci.extraCharge || 0);
                        const isExpanded = expandedCustomizeIdx === idx;
                        const hasPhoto = !ci.isCustomItem && Boolean(ci.menuItem.image);
                        return (
                          <div key={`${ci.menuItem.id}-${idx}`} className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2.5">
                            <div className="flex items-start gap-3">
                              {hasPhoto ? (
                                <img
                                  src={ci.menuItem.image}
                                  alt={ci.menuItem.name}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-neutral-200 bg-neutral-100"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl shrink-0 border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                  <Sparkles className="w-5 h-5" />
                                </div>
                              )}

                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug break-words">
                                      {ci.menuItem.name}
                                    </span>
                                    {ci.isCustomItem && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 shrink-0">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-mono font-extrabold text-neutral-900 tabular-nums shrink-0">
                                    {formatMoney(unitPrice * ci.quantity)}
                                  </span>
                                </div>

                                {ci.isCustomItem && ci.menuItem.description && ci.menuItem.description !== ci.customInstructions && (
                                  <p className="text-[11px] text-neutral-500 leading-snug break-words">
                                    {ci.menuItem.description}
                                  </p>
                                )}

                                <div className="text-[11px] font-mono text-neutral-500 tabular-nums">
                                  {ci.quantity} × {formatMoney(unitPrice)}
                                  {ci.extraCharge && ci.extraCharge > 0
                                    ? ` (incl. +${formatMoney(ci.extraCharge)} extra)`
                                    : ''}
                                </div>

                                {ci.customInstructions && (
                                  <div className="text-[11px] text-amber-800 font-medium bg-amber-50/70 px-2 py-0.5 rounded-md break-words">
                                    Prep note: {ci.customInstructions}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                              <button
                                type="button"
                                onClick={() => setExpandedCustomizeIdx(isExpanded ? null : idx)}
                                className={`min-h-[36px] px-3 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                                  isExpanded || ci.customInstructions || (ci.extraCharge && ci.extraCharge > 0)
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                                }`}
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Customize</span>
                              </button>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateDraftLineQty(idx, -1)}
                                  className="w-9 h-9 rounded-lg border border-neutral-200 hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
                                  aria-label={`Decrease quantity of ${ci.menuItem.name}`}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="min-w-[24px] text-center font-mono text-xs font-bold tabular-nums">
                                  {ci.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateDraftLineQty(idx, 1)}
                                  className="w-9 h-9 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center cursor-pointer"
                                  aria-label={`Increase quantity of ${ci.menuItem.name}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="pt-2 border-t border-neutral-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                                    Modification / Prep Note
                                  </label>
                                  <input
                                    type="text"
                                    value={ci.customInstructions || ''}
                                    onChange={(e) =>
                                      updateDraftLineCustomization(idx, { customInstructions: e.target.value })
                                    }
                                    placeholder="e.g. No onions, extra tomato sauce..."
                                    className="w-full min-h-[36px] px-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-neutral-500 block mb-0.5">
                                    Extra Charge (TZS)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={ci.extraCharge || 0}
                                    onChange={(e) =>
                                      updateDraftLineCustomization(idx, { extraCharge: Number(e.target.value) })
                                    }
                                    className="w-full min-h-[36px] px-2.5 text-xs font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-lg"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dish Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search standard menu items..."
                    className="w-full min-h-[44px] pl-9 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>

                {/* Menu Picker List with Item Images & Full Descriptions */}
                <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl max-h-64 overflow-y-auto">
                  {filteredMenuForOrder.map((item) => {
                    const countInDraft = draftItems
                      .filter((d) => d.menuItem.id === item.id)
                      .reduce((s, d) => s + d.quantity, 0);
                    return (
                      <div key={item.id} className="p-3 flex items-start gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-neutral-200 bg-neutral-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl shrink-0 border border-neutral-200 bg-neutral-100 text-neutral-400 flex items-center justify-center">
                            <UtensilsCrossed className="w-5 h-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-0.5 self-center">
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug break-words">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-neutral-700 font-mono font-semibold tabular-nums pt-0.5">
                            {formatMoney(item.price)} · {item.category}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addDraftItem(item)}
                          className="min-h-[40px] px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold rounded-lg shrink-0 self-center cursor-pointer"
                        >
                          {countInDraft > 0 ? `+ Add (${countInDraft})` : '+ Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Overall Order Instructions</label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Serve chicken separately from chips..."
                      className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Payment Collection</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'later', label: 'Tab / Later' },
                          { id: 'cash', label: 'Paid Cash' },
                          { id: 'mpesa', label: 'Paid M-Pesa' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setOrderPayTiming(opt.id)}
                          className={`min-h-[44px] px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                            orderPayTiming === opt.id
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                <div>
                  <div className="text-[11px] text-neutral-500">
                    {draftItems.reduce((a, b) => a + b.quantity, 0)} items
                    {taxEnabled && draftItems.length > 0
                      ? ` · incl. VAT (${taxRatePct}%): ${formatMoney(draftTax)}`
                      : ''}
                  </div>
                  <div className="text-base font-extrabold font-mono text-neutral-900 tabular-nums">
                    {formatMoney(draftTotal)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={draftItems.length === 0}
                    onClick={() => submitWaiterOrderAction(true)}
                    className="min-h-[48px] px-4 bg-white hover:bg-neutral-100 border border-neutral-300 disabled:opacity-40 text-neutral-900 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileEdit className="w-4 h-4" />
                    <span>Save Draft</span>
                  </button>
                  <button
                    type="submit"
                    disabled={draftItems.length === 0}
                    className="flex-1 sm:flex-initial min-h-[48px] px-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>{orderPayTiming === 'later' ? 'Send to Kitchen' : 'Collect & Send'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fast Waiter Partial/Split Payment & Service Completion Bottom Sheet */}
      {paymentOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 max-h-[92dvh] sm:max-h-[88dvh] flex flex-col pb-safe">
            <div className="sm:hidden w-10 h-1.5 bg-neutral-300 rounded-full mx-auto mt-2.5 shrink-0" />

            <div className="shrink-0 px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h3 className="text-base font-extrabold text-neutral-900 truncate">
                  Collect Payment · {paymentOrder.orderNumber}
                </h3>
                <p className="text-xs text-neutral-500 truncate">
                  Coupon {paymentOrder.serviceCouponCode || `SV-${paymentOrder.orderNumber.replace('#', '')}`} ·{' '}
                  {paymentOrder.tableNumber || paymentOrder.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentOrder(null)}
                className="w-10 h-10 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const remaining = Math.max(0, paymentOrder.total - (paymentOrder.paidAmount || 0));
              const collectNow = Math.min(remaining, Math.max(0, amountToCollect || 0));
              const changeDue =
                paymentMethodDraft === 'cash' ? Math.max(0, cashTendered - collectNow) : 0;

              return (
                <form
                  onSubmit={handleConfirmWaiterPayment}
                  className="flex-1 min-h-0 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5">
                    <div className="p-3.5 rounded-2xl bg-neutral-900 text-white flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-neutral-300">Remaining Balance</div>
                        <div className="text-xl sm:text-2xl font-extrabold font-mono tabular-nums mt-0.5">
                          {formatMoney(remaining)}
                        </div>
                        {paymentOrder.paidAmount > 0 && (
                          <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                            Already Paid: {formatMoney(paymentOrder.paidAmount)} / {formatMoney(paymentOrder.total)}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white/15">
                        {paymentOrder.tableNumber || paymentOrder.type.replace('_', ' ')}
                      </span>
                    </div>

                    {paymentOrder.payments && paymentOrder.payments.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] space-y-1">
                        <div className="font-bold text-blue-950">Recorded Payments (Split Ledger)</div>
                        {paymentOrder.payments.map((p) => (
                          <div key={p.id} className="flex justify-between text-blue-900 font-mono">
                            <span>
                              {p.method.toUpperCase()} {p.transactionRef ? `(${p.transactionRef})` : ''}
                            </span>
                            <span className="font-bold">{formatMoney(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Partial / Full Collect Amount */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-bold text-neutral-700">Amount Collecting Now (TZS)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setAmountToCollect(remaining);
                            setCashTendered(remaining);
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          Full ({formatMoney(remaining)})
                        </button>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={remaining}
                        value={amountToCollect}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setAmountToCollect(v);
                          if (paymentMethodDraft === 'cash') setCashTendered(v);
                        }}
                        className="w-full min-h-[42px] px-3 text-sm font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-700 block">Payment Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { id: 'cash', label: 'Cash', icon: Banknote },
                            { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                            { id: 'airtel', label: 'Airtel Money', icon: Smartphone },
                            { id: 'card', label: 'Card / POS', icon: CreditCard },
                          ] as const
                        ).map((pm) => {
                          const Icon = pm.icon;
                          const active = paymentMethodDraft === pm.id;
                          return (
                            <button
                              key={pm.id}
                              type="button"
                              onClick={() => {
                                setPaymentMethodDraft(pm.id);
                                if (pm.id === 'cash' && cashTendered < collectNow) {
                                  setCashTendered(collectNow);
                                }
                              }}
                              className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              <Icon className="w-4 h-4 shrink-0" />
                              <span>{pm.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {paymentMethodDraft !== 'cash' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-700 block">
                          Transaction / Receipt Ref (Optional)
                        </label>
                        <input
                          type="text"
                          value={txRefDraft}
                          onChange={(e) => setTxRefDraft(e.target.value)}
                          placeholder="e.g. QK882104 or POS slip #"
                          className="w-full min-h-[42px] px-3 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-xl"
                        />
                      </div>
                    )}

                    {paymentMethodDraft === 'cash' && (
                      <div className="space-y-2 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                        <div className="flex items-center justify-between text-xs">
                          <label className="font-bold text-neutral-700">Cash Tendered (TZS)</label>
                          <span className="font-mono font-bold text-emerald-700">
                            Change: {formatMoney(changeDue)}
                          </span>
                        </div>
                        <input
                          type="number"
                          min={collectNow}
                          value={cashTendered}
                          onChange={(e) => setCashTendered(Number(e.target.value))}
                          className="w-full min-h-[42px] px-3 text-sm font-mono font-bold bg-white border border-neutral-200 rounded-xl outline-hidden focus:ring-2 focus:ring-emerald-600"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[collectNow, 50000, 100000, 200000]
                            .filter((v, idx, arr) => v >= collectNow && arr.indexOf(v) === idx)
                            .map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setCashTendered(preset)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border cursor-pointer ${
                                  cashTendered === preset
                                    ? 'bg-neutral-900 text-white border-neutral-900'
                                    : 'bg-white text-neutral-700 border-neutral-200'
                                }`}
                              >
                                {preset === collectNow ? 'Exact' : formatMoney(preset)}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {collectNow >= remaining && (
                      <label className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={completeServiceOnPay}
                          onChange={(e) => setCompleteServiceOnPay(e.target.checked)}
                          className="w-4 h-4 accent-emerald-600 rounded shrink-0"
                        />
                        <span className="font-semibold text-emerald-950">
                          Complete service &amp; release table immediately after full payment
                        </span>
                      </label>
                    )}
                  </div>

                  <div className="shrink-0 p-4 bg-neutral-50 border-t border-neutral-100">
                    <button
                      type="submit"
                      className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>
                        {collectNow >= remaining && completeServiceOnPay
                          ? `Confirm ${formatMoney(collectNow)} & Complete`
                          : `Record ${formatMoney(collectNow)}`}
                      </span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Controlled Manager Approval Request Bottom Sheet (Discount / Cancel) */}
      {approvalOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-200 max-h-[90dvh] flex flex-col pb-safe">
            <div className="shrink-0 px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-900">
                    Manager Approval · {approvalOrder.orderNumber}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    All discounts &amp; cancellations require manager review and audit trail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalOrder(null)}
                className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendApprovalRequest} className="p-5 space-y-3.5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalType('discount')}
                  className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
                    approvalType === 'discount'
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                  }`}
                >
                  Request Discount
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalType('cancel_order')}
                  className={`min-h-[42px] rounded-xl border text-xs font-bold cursor-pointer ${
                    approvalType === 'cancel_order'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                  }`}
                >
                  Cancel Order
                </button>
              </div>

              {approvalType === 'discount' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Type</label>
                    <select
                      value={approvalDiscountType}
                      onChange={(e) => setApprovalDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="w-full min-h-[42px] px-3 text-xs border border-neutral-200 rounded-xl bg-neutral-50 font-semibold"
                    >
                      <option value="percent">% Percentage</option>
                      <option value="fixed">Fixed TZS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                      Amount ({approvalDiscountType === 'percent' ? '%' : 'TZS'})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={approvalDiscountValue}
                      onChange={(e) => setApprovalDiscountValue(Number(e.target.value))}
                      className="w-full min-h-[42px] px-3 text-xs font-mono font-bold border border-neutral-200 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-neutral-600 block mb-1">
                  Mandatory Reason (Logged to Owner Audit Trail)
                </label>
                <textarea
                  required
                  rows={2}
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder="e.g. Guest changed mind before kitchen started / VIP regular discount"
                  className="w-full p-3 text-xs border border-neutral-200 rounded-xl bg-neutral-50"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[46px] bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Submit Request to Manager
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Stand Generator Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={`${currentWaiter.name}'s Table Stand QR`}
        subtitle="Scan to open the mobile Customer Menu attributed to you"
        targetUrl={personalLink}
        badgeLabel={`TABLE ORDER · WAITER ${currentWaiter.name.toUpperCase()}`}
      />
    </div>
  );
};
