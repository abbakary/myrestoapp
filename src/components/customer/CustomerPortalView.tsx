import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Search,
  Plus,
  Minus,
  X,
  CreditCard,
  Smartphone,
  ChevronRight,
  UtensilsCrossed,
  Truck,
  Package,
  Store,
  Trash2,
  CheckCircle2,
  Tag,
  ArrowRight,
  UserCheck,
  Building2,
  Ticket,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, ModifierItem, OrderType, PaymentMethod } from '../../types/restaurant';
import { useMobileEnvironment } from '../../utils/mobileEnvironment';

type CustomerTab = 'menu' | 'cart' | 'orders' | 'info';

export const CustomerPortalView: React.FC = () => {
  const {
    tenants,
    currentTenant,
    setCurrentTenantId,
    menuItems,
    cart,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    submitOrder,
    orders,
    formatMoney,
    taxEnabled,
    taxRatePct,
    activeReferralCode,
    waiters,
    tables,
    currency,
    toggleCurrency,
    setActiveRole,
    isStandalonePortal,
    initialTableNumber,
  } = useRestaurant();

  const { isStandalonePortal: envStandalone } = useMobileEnvironment();
  const lockedStandalone = isStandalonePortal || envStandalone;

  const [activeTab, setActiveTab] = useState<CustomerTab>('menu');
  const [serviceType, setServiceType] = useState<OrderType>('dine_in');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Customization sheet state
  const [customPortion, setCustomPortion] = useState<{ name: string; priceDelta: number } | undefined>(undefined);
  const [customModifiers, setCustomModifiers] = useState<ModifierItem[]>([]);
  const [customerInstructions, setCustomerInstructions] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);

  // Checkout sheet state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>(() => {
    if (initialTableNumber) return initialTableNumber;
    const openTable = tables.find((t) => t.status === 'available') || tables[0];
    return openTable ? openTable.number : 'Table 01';
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [placedOrderIds, setPlacedOrderIds] = useState<string[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<{
    orderNumber: string;
    serviceCouponCode: string;
  } | null>(null);

  // Promo coupon state
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTableNumber) {
      setTableNumber(initialTableNumber);
      setServiceType('dine_in');
    }
  }, [initialTableNumber]);

  const referralWaiter = useMemo(() => {
    if (!activeReferralCode) return undefined;
    return waiters.find(
      (w) => w.referralCode.toLowerCase() === activeReferralCode.toLowerCase()
    );
  }, [waiters, activeReferralCode]);

  const availableItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems]
  );

  const categories = useMemo(() => {
    const cats = Array.from(new Set(availableItems.map((item) => item.category)));
    return ['All', ...cats];
  }, [availableItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return availableItems.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.description ? item.description.toLowerCase().includes(q) : false);
      return matchesCat && matchesSearch;
    });
  }, [availableItems, selectedCategory, searchQuery]);

  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = cart.reduce((acc, ci) => {
    const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
    const modPrice = ci.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0);
    return acc + (unitPrice + modPrice) * ci.quantity;
  }, 0);

  const customerDiscount = appliedPromo ? Math.round((subtotal * appliedPromo.percent) / 100) : 0;
  const discountedSubtotal = Math.max(0, subtotal - customerDiscount);
  const deliveryFee = serviceType === 'delivery' ? currentTenant.deliveryFee : 0;
  const tax = taxEnabled ? Math.round(discountedSubtotal * (taxRatePct / 100)) : 0;
  const grandTotal = discountedSubtotal + deliveryFee + tax;

  // Customer's tracked orders (orders placed in this session + active matching phone/referral orders)
  const customerOrders = useMemo(() => {
    const tracked = orders.filter(
      (o) =>
        placedOrderIds.includes(o.id) ||
        (customerPhone && o.customerPhone && o.customerPhone === customerPhone)
    );
    if (tracked.length > 0) return tracked;
    return orders.slice(0, 2);
  }, [orders, placedOrderIds, customerPhone]);

  const activeOrdersCount = customerOrders.filter(
    (o) => o.status !== 'completed' && o.status !== 'cancelled'
  ).length;

  const showToast = (msg: string) => {
    setAddedToast(msg);
    window.setTimeout(() => {
      setAddedToast((prev) => (prev === msg ? null : prev));
    }, 2200);
  };

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME10' || code === 'DISCOUNT10' || code === 'SAVANNA10') {
      setAppliedPromo({ code, percent: 10 });
      setPromoCode('');
    } else if (code === 'VIP20' || code === 'CHIPS20') {
      setAppliedPromo({ code, percent: 20 });
      setPromoCode('');
    } else {
      setPromoError('Invalid code. Try WELCOME10 or VIP20');
    }
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setCustomPortion(item.portions ? item.portions[0] : undefined);
    setCustomModifiers([]);
    setCustomerInstructions('');
    setCustomQuantity(1);
  };

  const handleQuickAdd = (item: MenuItem) => {
    if ((item.portions && item.portions.length > 0) || (item.modifiers && item.modifiers.length > 0)) {
      handleOpenCustomizer(item);
      return;
    }
    addToCart(item, undefined, [], '', 1);
    showToast(`Added ${item.name}`);
  };

  const handleAddCustomizedToCart = () => {
    if (!selectedMenuItem) return;
    addToCart(
      selectedMenuItem,
      customPortion,
      customModifiers,
      customerInstructions,
      customQuantity
    );
    const name = selectedMenuItem.name;
    setSelectedMenuItem(null);
    showToast(`Added ${customQuantity}x ${name}`);
  };

  const handleToggleModifier = (mod: ModifierItem) => {
    setCustomModifiers((prev) => {
      const exists = prev.find((m) => m.id === mod.id);
      if (exists) return prev.filter((m) => m.id !== mod.id);
      return [...prev, mod];
    });
  };

  const handleFinalCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const order = submitOrder({
      type: serviceType,
      tableNumber: serviceType === 'dine_in' ? tableNumber : undefined,
      customerName: customerName || 'Guest',
      customerPhone,
      deliveryAddress: serviceType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      referralWaiterId: referralWaiter?.id,
      notes: `Mobile order · ${paymentMethod.toUpperCase()}${appliedPromo ? ` · Promo: ${appliedPromo.code}` : ''}`,
      markAsPaid: paymentMethod !== 'cash',
      discount: customerDiscount,
      discountType: appliedPromo ? 'percent' : undefined,
      discountValue: appliedPromo ? appliedPromo.percent : undefined,
      discountReason: appliedPromo ? `Promo: ${appliedPromo.code}` : undefined,
      tax,
      taxRate: taxEnabled ? taxRatePct / 100 : 0,
      isTaxExempt: !taxEnabled,
      deliveryFee,
    });

    setPlacedOrderIds((prev) => [order.id, ...prev]);
    setLastPlacedOrder({
      orderNumber: order.orderNumber,
      serviceCouponCode: order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`,
    });
    setAppliedPromo(null);
    setIsCheckoutOpen(false);
    setActiveTab('orders');
  };

  const getOrderProgressStep = (status: string) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'sent_to_kitchen':
        return 1;
      case 'preparing':
        return 2;
      case 'ready':
      case 'served':
      case 'dispatched':
        return 3;
      case 'completed':
        return 4;
      default:
        return 1;
    }
  };

  const openTables = tables.filter((t) => t.status === 'available');

  return (
    <div className="h-[100dvh] md:h-auto md:min-h-screen bg-neutral-50 text-neutral-900 flex flex-col overflow-hidden md:overflow-visible">
      {/* Compact Flutter-Style Mobile AppBar / Desktop Top Bar with Centered Shop Name */}
      <header className="shrink-0 md:sticky md:top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 pt-safe">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-14 grid grid-cols-[80px_1fr_80px] items-center gap-2">
          {/* Left slot: back to ERP on mobile when not locked standalone, plus compact service badge */}
          <div className="flex items-center justify-start gap-1.5 min-w-0">
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
            <span className="text-[11px] font-semibold text-neutral-600 truncate">
              {serviceType === 'dine_in'
                ? tableNumber
                : serviceType === 'pickup'
                ? 'Pickup'
                : 'Delivery'}
            </span>
          </div>

          {/* Center slot: Centered & Well-Organized Restaurant/Shop Name */}
          <div className="flex flex-col items-center justify-center text-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 max-w-full">
              <span className="text-base sm:text-lg shrink-0" aria-hidden="true">{currentTenant.logo}</span>
              <h1 className="text-sm sm:text-base font-extrabold text-neutral-900 tracking-tight truncate">
                {currentTenant.name}
              </h1>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate max-w-full leading-tight">
              {referralWaiter
                ? `Host: ${referralWaiter.name.split(' ')[0]} · `
                : ''}
              {currentTenant.address.split(',').slice(-1)[0]?.trim() || 'Dar es Salaam'}
            </p>
          </div>

          {/* Right slot: Currency Switcher */}
          <div className="flex items-center justify-end shrink-0">
            <button
              onClick={toggleCurrency}
              className="min-h-[38px] px-2.5 text-xs font-mono font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
              aria-label="Toggle currency"
            >
              {currency}
            </button>
          </div>
        </div>

        {/* Desktop Centered Navigation Tabs (hidden on mobile where bottom nav stays pinned) */}
        <nav
          className="hidden md:flex items-center justify-center gap-8 text-sm font-semibold border-t border-neutral-100 px-6"
          aria-label="Customer Navigation"
        >
          {(
            [
              { id: 'menu', label: 'Menu' },
              { id: 'cart', label: `Cart${cartCount > 0 ? ` (${cartCount})` : ''}` },
              { id: 'orders', label: `Orders${activeOrdersCount > 0 ? ` (${activeOrdersCount})` : ''}` },
              { id: 'info', label: 'Restaurant Info' },
            ] as { id: CustomerTab; label: string }[]
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

      {/* Subtle Add-to-Cart Toast (positioned cleanly above bottom nav) */}
      {addedToast && (
        <div className="fixed bottom-20 md:bottom-6 inset-x-4 max-w-sm mx-auto z-40 pointer-events-auto">
          <div className="bg-neutral-900 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-semibold">
            <span className="truncate">{addedToast}</span>
            <button
              onClick={() => {
                setAddedToast(null);
                setActiveTab('cart');
              }}
              className="text-amber-400 hover:text-amber-300 font-bold whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              <span>View Cart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Content Area (ONLY this body scrolls on mobile while Header & Bottom Nav stay pinned) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain md:overflow-visible">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 pb-8 md:pb-10 space-y-5">
        {/* TAB 1: MENU */}
        {activeTab === 'menu' && (
          <>
            {/* Centered, Well-Organized Brand Hero Card */}
            <div className="relative rounded-2xl overflow-hidden bg-neutral-900 h-40 sm:h-52">
              <img
                src={currentTenant.bannerImage}
                alt={currentTenant.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
              <div className="absolute inset-0 p-4 sm:p-6 flex flex-col items-center justify-center text-center text-white space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl sm:text-2xl" aria-hidden="true">{currentTenant.logo}</span>
                  <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                    {currentTenant.name}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-white/90 font-medium max-w-lg line-clamp-2">
                  {currentTenant.tagline}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-amber-300 font-semibold pt-0.5">
                  <span>{currentTenant.operatingHours}</span>
                  {referralWaiter && (
                    <span className="flex items-center gap-1 text-white/90">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Host: {referralWaiter.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Service Type Segmented Control & Dine-In Table Picker */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-200/80 rounded-2xl">
                {(
                  [
                    { id: 'dine_in', label: 'Dine-in', icon: UtensilsCrossed },
                    { id: 'pickup', label: 'Pickup', icon: Package },
                    { id: 'delivery', label: 'Delivery', icon: Truck },
                  ] as const
                ).map((mode) => {
                  const Icon = mode.icon;
                  const active = serviceType === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setServiceType(mode.id)}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>

              {serviceType === 'dine_in' && (
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-3 min-h-[44px]">
                  <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">Table:</span>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="flex-1 bg-transparent text-xs font-bold text-neutral-900 focus:outline-none py-2"
                    aria-label="Select dining table"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.number}>
                        {t.number} ({t.status === 'available' ? `${t.capacity} seats` : t.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search & Horizontal Categories */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="search"
                  placeholder="Search dishes, drinks, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[44px] pl-10 pr-4 text-sm bg-white border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`min-h-[40px] px-4 text-xs font-bold rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-neutral-900 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items List (Mobile-friendly horizontal card) / Grid (Desktop) */}
            {filteredItems.length === 0 ? (
              availableItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-2.5">
                  <p className="text-sm font-bold text-neutral-800">
                    {currentTenant.name} hasn&apos;t published menu items yet
                  </p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Add dishes and set selling prices in Inventory &amp; BOM to publish them to your customer menu.
                  </p>
                  {!lockedStandalone && (
                    <button
                      type="button"
                      onClick={() => setActiveRole('manager')}
                      className="mt-2 min-h-[44px] px-5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Open Inventory &amp; Menu Builder
                    </button>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-2">
                  <p className="text-sm font-bold text-neutral-800">No dishes match your search</p>
                  <p className="text-xs text-neutral-500">Try clearing your search or selecting All categories.</p>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      setSearchQuery('');
                    }}
                    className="mt-2 min-h-[44px] px-5 bg-neutral-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Show All Dishes
                  </button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden flex sm:flex-col justify-between transition-shadow hover:shadow-sm"
                  >
                    {/* Image */}
                    <div
                      onClick={() => handleOpenCustomizer(item)}
                      className="w-28 h-28 sm:w-full sm:h-44 shrink-0 bg-neutral-100 overflow-hidden cursor-pointer relative"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                      <div
                        onClick={() => handleOpenCustomizer(item)}
                        className="cursor-pointer space-y-1"
                      >
                        <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{item.preparationTimeMinutes} min</span>
                        </div>
                        <h3 className="font-bold text-sm text-neutral-900 leading-snug line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-neutral-100">
                        <span className="text-sm sm:text-base font-extrabold text-neutral-900 font-mono tabular-nums">
                          {formatMoney(item.price)}
                        </span>

                        <button
                          onClick={() => handleQuickAdd(item)}
                          className="min-h-[44px] px-4 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: CART */}
        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-neutral-900">Your Basket</h2>
              <span className="text-xs font-mono text-neutral-500">
                {cartCount} {cartCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900">Your basket is empty</h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                  Browse fresh dishes, desserts, and drinks from the menu to start your order.
                </p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="min-h-[44px] px-6 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
                  {cart.map((ci, index) => {
                    const unitPrice =
                      ci.menuItem.price +
                      (ci.selectedPortion?.priceDelta || 0) +
                      ci.selectedModifiers.reduce((acc, m) => acc + m.price, 0);

                    return (
                      <div key={`${ci.menuItem.id}-${index}`} className="p-4 flex items-start gap-3">
                        <img
                          src={ci.menuItem.image}
                          alt={ci.menuItem.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-xl object-cover bg-neutral-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-neutral-900 truncate">
                              {ci.menuItem.name}
                            </h3>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="min-h-[36px] min-w-[36px] -mt-1 -mr-1 flex items-center justify-center text-neutral-400 hover:text-red-600 rounded-lg"
                              aria-label={`Remove ${ci.menuItem.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {(ci.selectedPortion || ci.selectedModifiers.length > 0 || ci.customerNotes) && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {[
                                ci.selectedPortion?.name,
                                ...ci.selectedModifiers.map((m) => `+${m.name}`),
                                ci.customerNotes,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm font-bold font-mono tabular-nums text-neutral-900">
                              {formatMoney(unitPrice * ci.quantity)}
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateCartItemQty(index, -1)}
                                className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center text-sm font-bold font-mono tabular-nums">
                                {ci.quantity}
                              </span>
                              <button
                                onClick={() => updateCartItemQty(index, 1)}
                                className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 cursor-pointer"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Promo Code */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-800">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-orange-600" />
                      <span>Promo Code</span>
                    </span>
                    {appliedPromo && (
                      <button
                        type="button"
                        onClick={() => setAppliedPromo(null)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {appliedPromo ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-900 font-mono">
                        {appliedPromo.code} · {appliedPromo.percent}% OFF
                      </span>
                      <span className="font-bold font-mono text-emerald-800">
                        -{formatMoney(customerDiscount)}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Enter code (WELCOME10 or VIP20)"
                          className="flex-1 min-h-[44px] px-3 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromo}
                          className="min-h-[44px] px-4 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                      {promoError && <p className="text-xs text-red-600">{promoError}</p>}
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums">{formatMoney(subtotal)}</span>
                  </div>
                  {customerDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Promo Discount</span>
                      <span className="font-mono tabular-nums">-{formatMoney(customerDiscount)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between text-neutral-600">
                      <span>Delivery Fee</span>
                      <span className="font-mono tabular-nums">{formatMoney(deliveryFee)}</span>
                    </div>
                  )}
                  {taxEnabled && (
                    <div className="flex justify-between text-neutral-600">
                      <span>VAT ({taxRatePct}%)</span>
                      <span className="font-mono tabular-nums">{formatMoney(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-100 text-sm font-extrabold text-neutral-900">
                    <span>Total</span>
                    <span className="font-mono text-base text-emerald-700 tabular-nums">
                      {formatMoney(grandTotal)}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full min-h-[48px] mt-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Checkout · {formatMoney(grandTotal)}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: LIVE ORDERS */}
        {activeTab === 'orders' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-neutral-900">Order Status</h2>
              <button
                onClick={() => setActiveTab('menu')}
                className="text-xs font-bold text-orange-600 hover:text-orange-700"
              >
                + Add More Items
              </button>
            </div>

            {lastPlacedOrder && (
              <div className="bg-emerald-700 text-white rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="text-sm font-bold">Order {lastPlacedOrder.orderNumber} Received</div>
                      <div className="text-xs text-emerald-100">
                        Sent to kitchen queue · Show this coupon code for fast service
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setLastPlacedOrder(null)}
                    className="p-2 text-emerald-100 hover:text-white"
                    aria-label="Dismiss order confirmation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-black/20 border border-white/20 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-emerald-100">
                    <Ticket className="w-4 h-4 text-amber-300" />
                    <span>Service Coupon Code</span>
                  </div>
                  <span className="font-mono font-extrabold text-base tracking-wider text-amber-300">
                    {lastPlacedOrder.serviceCouponCode}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {customerOrders.map((order) => {
                const step = getOrderProgressStep(order.status);
                const host = waiters.find((w) => w.id === order.referralWaiterId);
                const couponCode =
                  order.serviceCouponCode || `SV-${order.orderNumber.replace('#', '')}`;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-sm text-neutral-900">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {order.type === 'dine_in'
                              ? order.tableNumber || 'Dine-in'
                              : order.type === 'delivery'
                              ? 'Delivery'
                              : 'Pickup'}
                          </span>
                        </div>
                        {host && (
                          <p className="text-[11px] text-neutral-500 mt-0.5">
                            Served by {host.name}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold font-mono tabular-nums text-neutral-900">
                          {formatMoney(order.total)}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-700 capitalize">
                          {order.paymentStatus} · {order.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>

                    {/* Service Coupon Code Strip for Easy Counter / Waiter Service */}
                    <div className="bg-amber-50/90 border border-dashed border-amber-300 rounded-xl px-3.5 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-950">
                        <Ticket className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Service Coupon</span>
                      </div>
                      <span className="font-mono font-extrabold text-sm tracking-wider text-neutral-900">
                        {couponCode}
                      </span>
                    </div>

                    {/* Step Progress Tracker */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      {['Received', 'Cooking', 'Ready', 'Served'].map((label, idx) => {
                        const reached = step >= idx + 1;
                        return (
                          <div key={label} className="space-y-1">
                            <div
                              className={`h-1.5 rounded-full transition-colors ${
                                reached ? 'bg-emerald-500' : 'bg-neutral-200'
                              }`}
                            />
                            <div
                              className={`text-[10px] font-semibold text-center ${
                                reached ? 'text-neutral-900' : 'text-neutral-400'
                              }`}
                            >
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Items */}
                    <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex items-center justify-between text-neutral-700">
                          <span>
                            {it.quantity}x {it.name}
                          </span>
                          <span className="font-mono text-neutral-500 tabular-nums">
                            {formatMoney(it.price * it.quantity)}
                          </span>
                        </div>
                      ))}
                      {order.tax > 0 && (
                        <div className="flex items-center justify-between text-neutral-500 pt-1 border-t border-neutral-100">
                          <span>Incl. VAT</span>
                          <span className="font-mono tabular-nums">{formatMoney(order.tax)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: RESTAURANT INFO & ACCOUNT */}
        {activeTab === 'info' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-lg font-extrabold text-neutral-900">Restaurant & Preferences</h2>

            <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-2xl">
                  {currentTenant.logo}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900">{currentTenant.name}</h3>
                  <p className="text-xs text-neutral-500">{currentTenant.tagline}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 space-y-2.5 text-xs text-neutral-700">
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <span>{currentTenant.operatingHours}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                  <span>{currentTenant.address}</span>
                </div>
                <a
                  href={`tel:${currentTenant.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-2.5 text-orange-700 font-semibold min-h-[36px]"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{currentTenant.phone}</span>
                </a>
              </div>
            </div>

            {/* Saved Guest Details */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-neutral-900">My Contact Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Karim Hassan"
                    className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+255 784 100 293"
                    className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600 block mb-1">Default Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street, area or landmark"
                    className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Branch Selector */}
            {tenants.length > 1 && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5">
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-neutral-500" />
                  <span>Select Branch</span>
                </h3>
                <div className="space-y-2">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCurrentTenantId(t.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        t.id === currentTenant.id
                          ? 'border-orange-500 bg-orange-50/70 font-bold text-neutral-900'
                          : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{t.logo}</span>
                        <span>{t.name}</span>
                      </span>
                      {t.id === currentTenant.id && (
                        <span className="text-orange-600 font-bold">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Discreet Demo Switcher (only when not locked in standalone WebView) */}
            {!lockedStandalone && (
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-2.5">
                <h3 className="text-xs font-bold text-neutral-500">Switch App View</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActiveRole('waiter')}
                    className="min-h-[44px] px-3 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 cursor-pointer"
                  >
                    Waiter App
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
        aria-label="Mobile Bottom Navigation"
        className="md:hidden shrink-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {(
            [
              { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
              { id: 'cart', label: 'Cart', icon: ShoppingBag, badge: cartCount },
              { id: 'orders', label: 'Orders', icon: Clock, badge: activeOrdersCount },
              { id: 'info', label: 'Info', icon: Store },
            ] as { id: CustomerTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[]
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

      {/* Item Customizer Bottom Sheet (Mobile) / Modal (Desktop) */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 max-h-[88vh] flex flex-col pb-safe">
            <div className="sm:hidden w-10 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3" />

            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div className="min-w-0 pr-2">
                <h3 className="font-bold text-base text-neutral-900 truncate">{selectedMenuItem.name}</h3>
                <p className="text-xs text-neutral-500 font-mono">{formatMoney(selectedMenuItem.price)}</p>
              </div>
              <button
                onClick={() => setSelectedMenuItem(null)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-900 rounded-xl"
                aria-label="Close customizer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
              {selectedMenuItem.description && (
                <p className="text-xs text-neutral-600 leading-relaxed">{selectedMenuItem.description}</p>
              )}

              {/* Portion Sizes */}
              {selectedMenuItem.portions && selectedMenuItem.portions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-700">Portion Size</div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMenuItem.portions.map((portion) => (
                      <button
                        key={portion.name}
                        type="button"
                        onClick={() => setCustomPortion(portion)}
                        className={`min-h-[48px] p-3 rounded-xl border text-xs font-semibold text-left transition-colors ${
                          customPortion?.name === portion.name
                            ? 'border-orange-500 bg-orange-50 text-neutral-900'
                            : 'border-neutral-200 bg-white text-neutral-700'
                        }`}
                      >
                        <div>{portion.name}</div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          +{formatMoney(portion.priceDelta)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons / Modifiers */}
              {selectedMenuItem.modifiers && selectedMenuItem.modifiers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-700">Add-ons & Extras</div>
                  <div className="space-y-2">
                    {selectedMenuItem.modifiers.map((mod) => {
                      const isSelected = customModifiers.some((m) => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => handleToggleModifier(mod)}
                          className={`w-full min-h-[48px] flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                              : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                          }`}
                        >
                          <span className="text-xs font-semibold">{mod.name}</span>
                          <span className="text-xs font-bold font-mono">+{formatMoney(mod.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kitchen Instructions */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-700 block">Special Instructions</label>
                <textarea
                  rows={2}
                  value={customerInstructions}
                  onChange={(e) => setCustomerInstructions(e.target.value)}
                  placeholder="e.g. Less oil, extra spicy, sauce on the side..."
                  className="w-full p-3 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-neutral-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-11 h-11 rounded-xl border border-neutral-200 flex items-center justify-center"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold font-mono tabular-nums w-6 text-center">
                    {customQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-11 h-11 rounded-xl bg-neutral-900 text-white flex items-center justify-center"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-neutral-500">Item Total</div>
                <div className="text-base font-extrabold font-mono text-neutral-900 tabular-nums">
                  {formatMoney(
                    (selectedMenuItem.price +
                      (customPortion?.priceDelta || 0) +
                      customModifiers.reduce((acc, m) => acc + m.price, 0)) *
                      customQuantity
                  )}
                </div>
              </div>

              <button
                onClick={handleAddCustomizedToCart}
                className="min-h-[48px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Add to Basket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Bottom Sheet (Mobile) / Modal (Desktop) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 max-h-[90vh] flex flex-col pb-safe">
            <div className="sm:hidden w-10 h-1.5 bg-neutral-300 rounded-full mx-auto mt-3" />

            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-base text-neutral-900">Complete Order</h3>
                <p className="text-xs text-neutral-500 capitalize">
                  {serviceType.replace('_', ' ')}
                  {serviceType === 'dine_in' ? ` · ${tableNumber}` : ''}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-500 hover:text-neutral-900 rounded-xl"
                aria-label="Close checkout"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalCheckout} className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {serviceType === 'dine_in' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-neutral-700">Dining Table</label>
                    <span className="text-[11px] text-neutral-500">{openTables.length} open tables</span>
                  </div>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="w-full min-h-[44px] px-3 text-xs font-bold border border-neutral-200 bg-neutral-50 rounded-xl"
                  >
                    {tables.map((t) => (
                      <option key={t.id} value={t.number}>
                        {t.number} — {t.status} ({t.capacity} seats)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {serviceType === 'delivery' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Delivery Address / Landmark
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street address, building / floor, landmark"
                    className="w-full min-h-[44px] px-3 text-xs bg-white border border-neutral-200 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">Your Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Karim Hassan"
                  className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">
                  Mobile Number (M-Pesa / Updates)
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +255 784 100 293"
                  className="w-full min-h-[44px] px-3 text-xs border border-neutral-200 rounded-xl"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'cash', label: 'Pay at Desk', icon: UtensilsCrossed },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                        className={`min-h-[56px] p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          active
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                            : 'border-neutral-200 text-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-emerald-600" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Final Summary */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                {customerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Promo ({appliedPromo?.code})</span>
                    <span className="font-mono tabular-nums">-{formatMoney(customerDiscount)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>Delivery Fee</span>
                    <span className="font-mono tabular-nums">{formatMoney(deliveryFee)}</span>
                  </div>
                )}
                {taxEnabled && (
                  <div className="flex justify-between text-neutral-600">
                    <span>VAT ({taxRatePct}%)</span>
                    <span className="font-mono tabular-nums">{formatMoney(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Total to Pay</span>
                  <span className="font-mono text-emerald-700 tabular-nums">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Place Order · {formatMoney(grandTotal)}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
