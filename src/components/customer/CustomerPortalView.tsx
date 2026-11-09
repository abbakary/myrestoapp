import React, { useState } from 'react';
import {
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Search,
  Plus,
  Minus,
  Check,
  X,
  CreditCard,
  Smartphone,
  ChevronRight,
  Sparkles,
  UtensilsCrossed,
  Truck,
  Package,
} from 'lucide-react';
import { useRestaurant, CartItem } from '../../context/RestaurantContext';
import { MenuItem, ModifierItem, OrderType, PaymentMethod } from '../../types/restaurant';

export const CustomerPortalView: React.FC = () => {
  const {
    currentTenant,
    menuItems,
    cart,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    submitOrder,
    formatMoney,
    activeReferralCode,
    waiters,
    tables,
  } = useRestaurant();

  const [serviceType, setServiceType] = useState<OrderType>('dine_in');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);

  // Customization modal state
  const [customPortion, setCustomPortion] = useState<{ name: string; priceDelta: number } | undefined>(undefined);
  const [customModifiers, setCustomModifiers] = useState<ModifierItem[]>([]);
  const [customerInstructions, setCustomerInstructions] = useState<string>('');
  const [customQuantity, setCustomQuantity] = useState<number>(1);

  // Checkout modal state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('Table 03');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  // Customer promo discount & tax states
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; percent: number; discountAmt: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applyTax, setApplyTax] = useState<boolean>(true);

  const referralWaiter = waiters.find((w) => w.referralCode === activeReferralCode);

  const categories = [
    'All',
    'Special',
    'Chips',
    'Chickens',
    'Soups',
    'Desserts',
    'Drinks',
  ];

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    return matchesCat && matchesSearch;
  });

  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);
  const subtotal = cart.reduce((acc, ci) => {
    const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
    const modPrice = ci.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0);
    return acc + (unitPrice + modPrice) * ci.quantity;
  }, 0);

  // Custom Delivery Fee (can be set or adjusted by user/dispatcher)
  const [customerDeliveryFee, setCustomerDeliveryFee] = useState<number>(currentTenant.deliveryFee || 5000);

  // Apply promo discount
  const customerDiscount = appliedPromo ? Math.round((subtotal * appliedPromo.percent) / 100) : 0;
  const discountedSubtotal = Math.max(0, subtotal - customerDiscount);

  const deliveryFee = serviceType === 'delivery' ? Math.max(0, customerDeliveryFee) : 0;
  const tax = applyTax ? Math.round(discountedSubtotal * currentTenant.taxRate) : 0;
  const grandTotal = discountedSubtotal + deliveryFee + tax;

  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME10' || code === 'DISCOUNT10' || code === 'SAVANNA10') {
      const discountAmt = Math.round((subtotal * 10) / 100);
      setAppliedPromo({ code, percent: 10, discountAmt });
      setPromoCode('');
    } else if (code === 'VIP20' || code === 'CHIPS20') {
      const discountAmt = Math.round((subtotal * 20) / 100);
      setAppliedPromo({ code, percent: 20, discountAmt });
      setPromoCode('');
    } else {
      setPromoError('Invalid coupon. Try WELCOME10 or VIP20');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  const handleOpenCustomizer = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setCustomPortion(item.portions ? item.portions[0] : undefined);
    setCustomModifiers([]);
    setCustomerInstructions('');
    setCustomQuantity(1);
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
    setSelectedMenuItem(null);
    setIsCartOpen(true);
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
      customerName: customerName || 'Online Guest',
      customerPhone,
      deliveryAddress: serviceType === 'delivery' ? deliveryAddress : undefined,
      paymentMethod,
      referralWaiterId: referralWaiter?.id,
      notes: `Online portal order · Payment via ${paymentMethod.toUpperCase()}${appliedPromo ? ` · Promo: ${appliedPromo.code}` : ''}`,
      markAsPaid: paymentMethod !== 'cash',
      discount: customerDiscount,
      discountType: appliedPromo ? 'percent' : undefined,
      discountValue: appliedPromo ? appliedPromo.percent : undefined,
      discountReason: appliedPromo ? `Promo Coupon: ${appliedPromo.code}` : undefined,
      tax,
      isTaxExempt: !applyTax,
      deliveryFee,
    });

    setPlacedOrderNumber(order.orderNumber);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-24">
      {/* Waiter Referral Attribution Banner */}
      {referralWaiter && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white text-xs py-2 px-4 shadow-xs">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                Ordering with Host <strong>{referralWaiter.name}</strong> (Attribution Code: {referralWaiter.referralCode})
              </span>
            </div>
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-mono">
              VIP Guest Service Active
            </span>
          </div>
        </div>
      )}

      {/* Hero Banner (Matching Screenshot 4) */}
      <div className="relative h-64 sm:h-80 md:h-96 w-full overflow-hidden bg-neutral-900">
        <img
          src={currentTenant.bannerImage}
          alt={currentTenant.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 max-w-6xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="space-y-1 text-white">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentTenant.logo}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{currentTenant.name}</h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-xl">{currentTenant.tagline}</p>
            <div className="flex items-center gap-4 text-xs text-neutral-300 pt-2 flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTenant.operatingHours}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-xs">{currentTenant.address}</span>
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTenant.phone}</span>
              </span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/20 flex gap-1">
            <button
              onClick={() => setServiceType('dine_in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                serviceType === 'dine_in'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Dine-in</span>
            </button>

            <button
              onClick={() => setServiceType('pickup')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                serviceType === 'pickup'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pickup</span>
            </button>

            <button
              onClick={() => setServiceType('delivery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                serviceType === 'delivery'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Catalog View */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Placed Order Success Tracker Banner */}
        {placedOrderNumber && (
          <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-sm">Order Placed Successfully! Ref: {placedOrderNumber}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Your meal ticket is in the kitchen queue. Live KDS timer is running.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPlacedOrderNumber(null)}
              className="py-1.5 px-4 bg-white text-emerald-900 font-bold text-xs rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Order More Items
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search dishes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden border border-neutral-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
            >
              <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {item.tags && item.tags.length > 0 && (
                  <div className="absolute top-3 left-3 bg-neutral-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                    {item.tags[0]}
                  </div>
                )}
                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs font-mono">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>{item.preparationTimeMinutes}m</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 group-hover:text-amber-600 transition-colors">
                    {item.name}
                  </h3>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <span className="text-base font-extrabold text-neutral-900 font-mono tabular-nums">
                    {formatMoney(item.price)}
                  </span>

                  <button
                    onClick={() => handleOpenCustomizer(item)}
                    className="py-1.5 px-3.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Customize</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 animate-in slide-in-from-bottom duration-200">
          <div className="bg-neutral-950 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold text-sm">
                {cartCount}
              </div>
              <div>
                <div className="text-xs text-neutral-400">Total in Basket</div>
                <div className="text-sm font-bold font-mono text-white tabular-nums">
                  {formatMoney(grandTotal)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="py-2 px-5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <span>View Order & Pay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Item Customizer Modal */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 className="font-bold text-sm text-neutral-900">Customize: {selectedMenuItem.name}</h3>
              <button
                onClick={() => setSelectedMenuItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              {/* Portion Sizes */}
              {selectedMenuItem.portions && selectedMenuItem.portions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Choose Portion Size:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMenuItem.portions.map((portion) => (
                      <button
                        key={portion.name}
                        onClick={() => setCustomPortion(portion)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          customPortion?.name === portion.name
                            ? 'border-amber-500 bg-amber-50 text-amber-900'
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
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Choose Add-ons & Extras:
                  </div>
                  <div className="space-y-2">
                    {selectedMenuItem.modifiers.map((mod) => {
                      const isSelected = customModifiers.some((m) => m.id === mod.id);
                      return (
                        <div
                          key={mod.id}
                          onClick={() => handleToggleModifier(mod)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                              : 'border-neutral-200 hover:bg-neutral-50 text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'border-neutral-400'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </div>
                            <span>{mod.name}</span>
                          </div>
                          <span className="text-xs font-bold font-mono">+{formatMoney(mod.price)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special Cooking Instructions */}
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Kitchen Notes & Preferences:
                </div>
                <textarea
                  rows={2}
                  value={customerInstructions}
                  onChange={(e) => setCustomerInstructions(e.target.value)}
                  placeholder="e.g. No onions, less oil, extra spicy, sauce on the side..."
                  className="w-full p-2.5 text-xs border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-neutral-700">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold font-mono">{customQuantity}</span>
                  <button
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-neutral-500">Item Total:</div>
                <div className="text-sm font-bold font-mono text-neutral-900">
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
                className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden text-neutral-900 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">Review & Place Order</h3>
                <p className="text-xs text-neutral-500">Service: {serviceType.replace('_', ' ').toUpperCase()}</p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFinalCheckout} className="p-5 overflow-y-auto space-y-4">
              {/* Service details */}
              {serviceType === 'dine_in' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-neutral-600">Select Dining Table:</label>
                    <span className="text-[11px] text-neutral-400">
                      {tables.filter((t) => t.status === 'available').length} Open Tables
                    </span>
                  </div>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={`w-full p-2.5 text-xs font-bold border rounded-xl ${
                      tables.find((t) => t.number.toLowerCase() === tableNumber.toLowerCase())?.status !== 'available'
                        ? 'border-amber-400 bg-amber-50 text-amber-950'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                    }`}
                  >
                    {tables.map((t) => {
                      const isOpen = t.status === 'available';
                      return (
                        <option key={t.id} value={t.number}>
                          {t.number} — {t.status.toUpperCase()} ({t.capacity} Seats · {t.zone || 'Dining'})
                        </option>
                      );
                    })}
                  </select>

                  {tables.find((t) => t.number.toLowerCase() === tableNumber.toLowerCase())?.status !== 'available' && (
                    <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-xs text-amber-950 flex flex-col gap-1">
                      <span className="font-bold">⚠️ {tableNumber} is currently occupied/in-use.</span>
                      <p className="text-[11px] text-amber-800">
                        This table is currently occupied by guests. Please pick an open table:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const openTbl = tables.find((t) => t.status === 'available');
                          if (openTbl) setTableNumber(openTbl.number);
                        }}
                        className="text-left font-bold text-xs text-amber-950 underline mt-0.5"
                      >
                        Auto-select open table ({tables.find((t) => t.status === 'available')?.number || 'Table 01'})
                      </button>
                    </div>
                  )}
                </div>
              ) : serviceType === 'delivery' ? (
                <div className="space-y-3 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Delivery Address / Landmark:</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Mikocheni B, Mwai Kibaki Rd, House 14"
                      className="w-full p-2 text-xs bg-white border border-neutral-200 rounded-lg"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-950 flex items-center justify-between">
                      <span>Delivery Cost:</span>
                      <span className="text-[10px] text-emerald-700 font-mono">Customizable per zone</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={customerDeliveryFee}
                        onChange={(e) => setCustomerDeliveryFee(Number(e.target.value))}
                        className="w-full p-2 text-xs font-mono font-bold text-emerald-900 bg-white border border-emerald-300 rounded-lg"
                      />
                      <span className="text-xs font-bold font-mono text-neutral-600">TZS</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-blue-600" />
                    <span>Pickup / Takeaway Counter Service</span>
                  </span>
                  <p className="text-[11px] text-blue-800">
                    No table or delivery fee required. Your order will be packed and waiting at our reception pickup counter!
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600">Your Full Name:</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Karim Hassan"
                  className="w-full p-2 text-xs border border-neutral-200 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-600">Mobile Phone (M-Pesa / SMS Updates):</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +255 784 100 293"
                  className="w-full p-2 text-xs border border-neutral-200 rounded-lg"
                />
              </div>

              {/* Payment Methods */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-neutral-600">Select Payment Method:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mpesa')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'mpesa'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>M-Pesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'card'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 ${
                      paymentMethod === 'cash'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-neutral-200'
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4 text-emerald-600" />
                    <span>Pay at Desk</span>
                  </button>
                </div>
              </div>

              {/* Coupon / Promo Discount Section */}
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-orange-500" />
                    <span>Promo Coupon / Discount:</span>
                  </span>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="text-[10px] text-red-600 hover:text-red-800 font-bold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                    <div>
                      <span className="font-bold text-emerald-900 font-mono">
                        {appliedPromo.code} ({appliedPromo.percent}% OFF)
                      </span>
                      <p className="text-[10px] text-emerald-700">Coupon applied successfully</p>
                    </div>
                    <span className="font-bold font-mono text-emerald-800">
                      -{formatMoney(customerDiscount)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Try WELCOME10 or VIP20"
                        className="flex-1 p-2 text-xs bg-white border border-neutral-200 rounded-lg font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[11px] text-red-600 font-medium">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Cost Breakdown */}
              <div className="p-3 bg-neutral-50 rounded-xl space-y-1.5 text-xs border border-neutral-200">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Gross Subtotal:</span>
                  <span className="font-mono">{formatMoney(subtotal)}</span>
                </div>

                {customerDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedPromo?.percent}%):</span>
                    <span className="font-mono">-{formatMoney(customerDiscount)}</span>
                  </div>
                )}

                {deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Delivery Fee:</span>
                    <span className="font-mono">{formatMoney(deliveryFee)}</span>
                  </div>
                )}

                {/* Tax toggle / removal */}
                <div className="flex justify-between items-center py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-neutral-600">VAT (18%):</span>
                    <button
                      type="button"
                      onClick={() => setApplyTax(!applyTax)}
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold transition-colors ${
                        applyTax
                          ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                      title={applyTax ? 'Click to remove tax' : 'Click to apply VAT'}
                    >
                      {applyTax ? 'Remove' : '✓ Exempt (0%)'}
                    </button>
                  </div>
                  <span className={`font-mono ${!applyTax ? 'line-through text-neutral-400' : ''}`}>
                    {formatMoney(tax)}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700 font-mono text-base">{formatMoney(grandTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <span>Confirm & Place Order</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
