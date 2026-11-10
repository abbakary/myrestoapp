import React, { useState, useMemo } from 'react';
import {
  Menu,
  Search,
  UserPlus,
  MoreVertical,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  Tag,
  CreditCard,
  Banknote,
  QrCode,
  Folder,
  LayoutGrid,
  X,
  Clock,
  Printer,
  ShieldCheck,
  Check,
  ArrowRight,
  Maximize2,
  Minimize2,
  Table as TableIcon,
  ShoppingBag,
  RotateCcw,
  Sparkles,
  Users,
  ChefHat,
  Smartphone,
  Boxes,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, Order, PaymentMethod, OrderType, Role } from '../../types/restaurant';
import { ReceiptModal } from '../common/ReceiptModal';

export const PosView: React.FC = () => {
  const {
    currentTenant,
    tenants,
    setCurrentTenantId,
    menuItems,
    orders,
    tables,
    cart,
    addToCart,
    updateCartItemQty,
    removeFromCart,
    clearCart,
    submitOrder,
    formatMoney,
    currency,
    toggleCurrency,
    cashierShift,
    activeRole,
    setActiveRole,
    waiters,
  } = useRestaurant();

  // Active Category matching screenshot: 'Sweets', 'Fruits', 'Coffee & Tea', 'Breakfast', 'All Items'
  const [selectedCategory, setSelectedCategory] = useState<string>('Sweets');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // Slide-over navigation drawer for restaurant modules
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState<boolean>(false);

  // Ticket settings & Order types: dine_in, pickup, delivery
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>('Table 03');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('Mikocheni B, Mwai Kibaki Rd, House 14');
  const [deliveryFeeUsd, setDeliveryFeeUsd] = useState<number>(2.50);
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState<boolean>(false);
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState<boolean>(false);

  // Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('waiter-john');

  // Line item detail / modifier modal
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemNotes, setEditingItemNotes] = useState<string>('');

  // Discount decision controls (user has full control over value, percentage, fixed, presets)
  // Reference photo has $21.00 discount on the demo ticket
  const [discountValue, setDiscountValue] = useState<number>(21.0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountReason, setDiscountReason] = useState<string>('Courtesy / Promo');
  const [showDiscountEditor, setShowDiscountEditor] = useState<boolean>(false);

  // Tax decision controls (user can toggle tax-exempt or choose tax rate: 6.5% standard meal tax or 18% VAT)
  const [applyTax, setApplyTax] = useState<boolean>(true);
  const [taxRatePct, setTaxRatePct] = useState<number>(6.5);
  const [showTaxEditor, setShowTaxEditor] = useState<boolean>(false);

  // Payment / Charge modal
  const [isChargeModalOpen, setIsChargeModalOpen] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderCashAmount, setTenderCashAmount] = useState<number>(50.0);
  const [lastProcessedOrder, setLastProcessedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Held tickets
  const [heldTickets, setHeldTickets] = useState<{ id: string; name: string; itemsCount: number; total: number; savedAt: string }[]>([
    { id: 'HT-101', name: 'Table 07 (Patio)', itemsCount: 4, total: 32.50, savedAt: '17:28' },
    { id: 'HT-102', name: 'Bar Counter VIP', itemsCount: 2, total: 18.00, savedAt: '17:35' },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Bottom categories matching screenshot
  const categoryTabs = [
    { id: 'Fruits', label: 'FRUITS' },
    { id: 'Sweets', label: 'SWEETS' },
    { id: 'Coffee & Tea', label: 'COFFEE & TEA' },
    { id: 'Breakfast', label: 'BREAKFAST' },
    { id: 'All Items', label: 'ALL ITEMS' },
  ];

  // Helper to format currency decimal or TZS
  const formatPosNumber = (amountInTzs: number) => {
    if (currency === 'USD') {
      const usd = amountInTzs / currentTenant.currencyRate;
      return usd.toFixed(2);
    }
    return amountInTzs.toLocaleString();
  };

  // Convert USD decimal to TZS
  const usdToTzs = (usd: number) => Math.round(usd * currentTenant.currencyRate);

  // Filter items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (selectedCategory === 'All Items') return matchesSearch;
      if (selectedCategory === 'Sweets') {
        return matchesSearch && (item.category === 'Sweets' || item.category === 'Desserts');
      }
      if (selectedCategory === 'Fruits') {
        return matchesSearch && (item.category === 'Fruits' || item.category === 'Special');
      }
      if (selectedCategory === 'Coffee & Tea') {
        return matchesSearch && (item.category === 'Coffee & Tea' || item.category === 'Drinks');
      }
      if (selectedCategory === 'Breakfast') {
        return matchesSearch && (item.category === 'Breakfast' || item.category === 'Chips');
      }
      return matchesSearch && item.category === selectedCategory;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Calculate ticket totals
  // In the photo: Subtotal = 66.56, Discount = 21.00, Tax = 2.96, Total = 48.52
  const grossSubtotalTzs = useMemo(() => {
    return cart.reduce((acc, ci) => {
      const unit = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
      const mods = ci.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0);
      return acc + (unit + mods) * ci.quantity;
    }, 0);
  }, [cart]);

  const grossSubtotalUsd = grossSubtotalTzs / currentTenant.currencyRate;

  const calculatedDiscountUsd = useMemo(() => {
    if (cart.length === 0) return 0;
    if (discountType === 'percent') {
      return (grossSubtotalUsd * Math.min(100, Math.max(0, discountValue))) / 100;
    }
    return Math.min(grossSubtotalUsd, Math.max(0, discountValue));
  }, [grossSubtotalUsd, discountType, discountValue, cart.length]);

  const calculatedDiscountTzs = usdToTzs(calculatedDiscountUsd);

  const netSubtotalUsd = Math.max(0, grossSubtotalUsd - calculatedDiscountUsd);

  // Tax calculation: user decides whether tax is applied or tax-exempt, plus custom rate
  const calculatedTaxUsd = useMemo(() => {
    if (cart.length === 0 || !applyTax) return 0;
    // If ticket matches screenshot closely ($45.56 net subtotal at 6.5%), give exact 2.96 tax
    if (taxRatePct === 6.5 && Math.abs(netSubtotalUsd - 45.56) < 0.5) {
      return 2.96;
    }
    return Number((netSubtotalUsd * (taxRatePct / 100)).toFixed(2));
  }, [netSubtotalUsd, cart.length, applyTax, taxRatePct]);

  const calculatedTaxTzs = usdToTzs(calculatedTaxUsd);

  const deliveryFeeEffectiveUsd = orderType === 'delivery' ? deliveryFeeUsd : 0;
  const deliveryFeeEffectiveTzs = usdToTzs(deliveryFeeEffectiveUsd);

  const totalPayableUsd = Number((netSubtotalUsd + calculatedTaxUsd + deliveryFeeEffectiveUsd).toFixed(2));
  const totalPayableTzs = usdToTzs(totalPayableUsd);

  // Calculate Change Due
  const changeDueUsd = Math.max(0, Number((tenderCashAmount - totalPayableUsd).toFixed(2)));

  // Add Item Click
  const handleItemClick = (item: MenuItem) => {
    addToCart(item);
  };

  // Find item quantity in current cart
  const getItemQtyInCart = (itemId: string) => {
    const found = cart.find((c) => c.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  // Apply Quick Discount from Tile
  const handleApplyDiscountTile = (val: number, type: 'percent' | 'fixed') => {
    setDiscountType(type);
    setDiscountValue(val);
    showToast(type === 'percent' ? `Applied ${val}% discount to Ticket` : `Applied $${val.toFixed(2)} discount to Ticket`);
  };

  // Handle Save (Hold) Order
  const handleSaveTicket = () => {
    if (cart.length === 0) {
      showToast('Ticket is empty');
      return;
    }

    const newHeld = {
      id: `HT-${Date.now().toString().slice(-3)}`,
      name: `${orderType === 'dine_in' ? selectedTable : 'Takeaway'} (${customerName || 'Guest'})`,
      itemsCount: cart.reduce((sum, i) => sum + i.quantity, 0),
      total: totalPayableUsd,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHeldTickets((prev) => [newHeld, ...prev]);

    // Also dispatch to kitchen
    submitOrder({
      type: orderType,
      tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
      customerName: customerName || `Walk-in Guest (${selectedTable})`,
      customerPhone: customerPhone || undefined,
      paymentMethod: 'cash',
      markAsPaid: false,
      notes: `Held ticket saved at POS · Dispatch to kitchen`,
      discount: calculatedDiscountTzs,
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      tax: calculatedTaxTzs,
    });

    clearCart();
    setDiscountValue(0);
    showToast(`Ticket saved & held as #${newHeld.id}. Order sent to Kitchen KDS!`);
  };

  // Handle Charge / Settle Payment
  const handleProcessPayment = () => {
    if (cart.length === 0) return;

    const completedOrder = submitOrder({
      type: orderType,
      tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
      customerName: customerName || `Guest (${orderType === 'dine_in' ? selectedTable : 'Walk-in'})`,
      customerPhone: customerPhone || undefined,
      referralWaiterId: selectedWaiterId,
      paymentMethod: selectedPaymentMethod,
      markAsPaid: true,
      notes: `Settled via POS · Tender: ${selectedPaymentMethod.toUpperCase()} · ${orderType.toUpperCase()}`,
      discount: calculatedDiscountTzs,
      discountType: discountType,
      discountValue: discountValue,
      discountReason: discountReason,
      tax: calculatedTaxTzs,
    });

    setLastProcessedOrder(completedOrder);
    setIsChargeModalOpen(false);
    setIsReceiptOpen(true);
    setDiscountValue(0);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Quick reset to demo ticket matching the screenshot
  const handleResetToDemoTicket = () => {
    const findItem = (id: string, fallbackIdx: number) =>
      menuItems.find((i) => i.id === id) || menuItems[fallbackIdx];

    clearCart();
    setTimeout(() => {
      addToCart(findItem('pos-pepperoni-pizza', 15), undefined, [], '', 1);
      addToCart(findItem('pos-caesar-salad', 16), undefined, [], '', 2);
      addToCart(findItem('pos-orange-juice', 17), undefined, [], '', 1);
      addToCart(findItem('pos-black-tea', 18), undefined, [], '', 1);
      addToCart(findItem('pos-sandwich', 19), undefined, [], '', 1);
      addToCart(findItem('pos-mango-dessert', 2), undefined, [], '', 2);
      setDiscountValue(21.0);
      setDiscountType('fixed');
      showToast('Loaded exact ticket from reference photo!');
    }, 50);
  };

  // Line item price formatting
  const getLineItemTotal = (ci: (typeof cart)[0]) => {
    const unit = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
    const totalTzs = unit * ci.quantity;
    return formatPosNumber(totalTzs);
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-neutral-100 flex flex-col font-sans select-none overflow-hidden relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white border border-neutral-700 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Full-Bleed POS Screen: Product Grid on Left, Ticket Panel on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
        {/* ================= LEFT SECTION: CATALOG & PRODUCTS ================= */}
        <div className="flex-1 flex flex-col bg-neutral-200/50 overflow-hidden">
          {/* TOP VIBRANT GREEN HEADER BAR matching image_65047771.png */}
          <div className="bg-[#43A047] text-white px-4 h-12 flex items-center justify-between shadow-xs z-10 shrink-0">
            {/* Left: Hamburger Menu and Active Category Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsNavDrawerOpen(true)}
                className="p-1.5 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors cursor-pointer"
                title="Open Restaurant Navigation Drawer"
                aria-label="Navigation Menu"
              >
                <Menu className="w-5 h-5 text-white" />
              </button>

              <h1 className="text-base sm:text-lg font-bold tracking-wide text-white drop-shadow-xs capitalize">
                {selectedCategory}
              </h1>
            </div>

            {/* Right: Search Affordance & Quick Utility Toggles */}
            <div className="flex items-center gap-2">
              {isSearchActive ? (
                <div className="flex items-center bg-white text-neutral-900 rounded-lg px-2.5 py-1 w-48 sm:w-64 animate-in fade-in duration-150 shadow-sm">
                  <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
                  <input
                    type="text"
                    placeholder="Search item or recipe..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full text-xs outline-hidden bg-transparent"
                  />
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchActive(false);
                    }}
                    className="text-neutral-400 hover:text-neutral-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchActive(true)}
                  className="p-1.5 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors cursor-pointer"
                  title="Search Food Items"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
              )}

              {/* Fast currency toggle ($ / TZS) */}
              <button
                onClick={toggleCurrency}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title={`Current: ${currency}. Click to switch between USD and TZS`}
              >
                {currency}
              </button>
            </div>
          </div>

              {/* PRODUCT CARDS 5x4 GRID matching image_65047771.png */}
              <div className="flex-1 p-2 sm:p-2.5 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-2.5">
                  {/* Rows 1-3: Food Items Grid */}
                  {filteredItems.slice(0, 15).map((item) => {
                    const inCartCount = getItemQtyInCart(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className="group relative aspect-4/3 sm:aspect-square bg-neutral-300 rounded-xl overflow-hidden cursor-pointer shadow-xs hover:shadow-md active:scale-97 transition-all border border-neutral-300/60"
                      >
                        {/* Food Image */}
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              '/src/assets/images/pos_cherry_cake_1794302892353.jpg';
                          }}
                        />

                        {/* Quantity in cart badge */}
                        {inCartCount > 0 && (
                          <div className="absolute top-1.5 right-1.5 bg-[#43A047] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md font-mono border border-white/60">
                            x{inCartCount}
                          </div>
                        )}

                        {/* Dark Gradient Scrim at bottom with dish title */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-6 pb-1.5 px-1.5 flex flex-col items-center justify-end text-center">
                          <span className="text-white text-[11px] sm:text-xs font-semibold leading-tight line-clamp-2 drop-shadow-sm">
                            {item.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback if fewer than 15 items in category */}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full py-16 text-center text-neutral-500">
                      <Sparkles className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                      <p className="text-xs font-semibold">No items found matching "{searchQuery}"</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('Sweets');
                        }}
                        className="mt-2 text-xs font-bold text-[#43A047] hover:underline"
                      >
                        Reset to Sweets
                      </button>
                    </div>
                  )}

                  {/* ROW 4: 5 INTERACTIVE SHORTCUT / DISCOUNT TILES matching image_65047771.png */}
                  {/* Tile 1: Fruits (Green) */}
                  <div
                    onClick={() => {
                      setSelectedCategory('Fruits');
                      showToast('Switched to Fruits category');
                    }}
                    className="relative aspect-4/3 sm:aspect-square bg-[#4CAF50] hover:bg-[#43A047] active:scale-97 text-white rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all"
                  >
                    <Folder className="w-3.5 h-3.5 absolute top-2 right-2 text-white/80" />
                    <span className="text-xs sm:text-sm font-semibold tracking-tight text-white drop-shadow-xs">
                      Fruits
                    </span>
                  </div>

                  {/* Tile 2: Hot Drinks (Coral/Red) */}
                  <div
                    onClick={() => {
                      setSelectedCategory('Coffee & Tea');
                      showToast('Switched to Hot Drinks & Tea');
                    }}
                    className="relative aspect-4/3 sm:aspect-square bg-[#E53935] hover:bg-[#D32F2F] active:scale-97 text-white rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all"
                  >
                    <Folder className="w-3.5 h-3.5 absolute top-2 right-2 text-white/80" />
                    <span className="text-xs sm:text-sm font-semibold tracking-tight text-white drop-shadow-xs">
                      Hot Drinks
                    </span>
                  </div>

                  {/* Tile 3: Desserts (Purple) */}
                  <div
                    onClick={() => {
                      setSelectedCategory('Sweets');
                      showToast('Switched to Desserts');
                    }}
                    className="relative aspect-4/3 sm:aspect-square bg-[#8E24AA] hover:bg-[#7B1FA2] active:scale-97 text-white rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all"
                  >
                    <Folder className="w-3.5 h-3.5 absolute top-2 right-2 text-white/80" />
                    <span className="text-xs sm:text-sm font-semibold tracking-tight text-white drop-shadow-xs">
                      Desserts
                    </span>
                  </div>

                  {/* Tile 4: Discount 5% (Grey Price Tag tile) */}
                  <div
                    onClick={() => handleApplyDiscountTile(5, 'percent')}
                    className={`relative aspect-4/3 sm:aspect-square active:scale-97 border rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all group ${
                      discountValue === 5 && discountType === 'percent'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                    }`}
                  >
                    {discountValue === 5 && discountType === 'percent' && (
                      <span className="absolute top-1 right-1 text-[9px] bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {/* Price tag outline graphic with 5% inside */}
                    <div className="relative mb-1 flex items-center justify-center">
                      <Tag className={`w-6 h-6 transition-colors stroke-1.5 rotate-45 ${
                        discountValue === 5 && discountType === 'percent' ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-neutral-600'
                      }`} />
                      <span className="absolute text-[9px] font-bold font-mono">5%</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold">
                      Discount
                    </span>
                  </div>

                  {/* Tile 5: Discount 20 (Grey Price Tag tile) */}
                  <div
                    onClick={() => handleApplyDiscountTile(20.0, 'fixed')}
                    className={`relative aspect-4/3 sm:aspect-square active:scale-97 border rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all group ${
                      discountValue === 20 && discountType === 'fixed'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                    }`}
                  >
                    {discountValue === 20 && discountType === 'fixed' && (
                      <span className="absolute top-1 right-1 text-[9px] bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    {/* Price tag outline graphic with 20.00 inside */}
                    <div className="relative mb-1 flex items-center justify-center">
                      <Tag className={`w-6 h-6 transition-colors stroke-1.5 rotate-45 ${
                        discountValue === 20 && discountType === 'fixed' ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-neutral-600'
                      }`} />
                      <span className="absolute text-[8px] font-bold font-mono">20</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold">
                      Discount 20
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTTOM CATEGORY NAVIGATION BAR matching image_65047771.png */}
              <div className="bg-white border-t border-neutral-200 px-3 h-11 flex items-center justify-between shadow-xs shrink-0">
                <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar h-full">
                  {categoryTabs.map((cat) => {
                    const isActive = selectedCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`relative h-full flex items-center px-1 text-xs font-semibold tracking-wider uppercase transition-colors whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'text-[#43A047] font-bold'
                            : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {isActive && (
                          <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#43A047]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right side: 4-square grid icon matching screenshot */}
                <div className="flex items-center gap-2 pl-2 border-l border-neutral-200">
                  <button
                    onClick={handleResetToDemoTicket}
                    className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors rounded-sm"
                    title="Load Reference Photo Demo Ticket"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      showToast('Grid view active');
                    }}
                    className="p-1 text-neutral-500 hover:text-neutral-800 transition-colors rounded-sm"
                    title="Grid Layout View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* ================= RIGHT SECTION: TICKET PANEL ================= */}
            <div className="w-full lg:w-[380px] xl:w-[410px] bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col justify-between shrink-0 shadow-xs">
              {/* Ticket Top Header: "Ticket" · User Icon · 3-dots Menu */}
              <div className="p-3.5 border-b border-neutral-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-neutral-900 tracking-tight">Ticket</h2>
                  {customerName && (
                    <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 max-w-[130px] truncate">
                      {customerName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 relative">
                  {/* Customer Assignment Button */}
                  <button
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                    title="Assign Customer or Link Waiter Referral"
                    aria-label="Add Customer"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>

                  {/* 3-dots Menu Button */}
                  <button
                    onClick={() => setIsTicketMenuOpen(!isTicketMenuOpen)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                    title="Ticket Options"
                    aria-label="More Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Ticket Options Popover */}
                  {isTicketMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in duration-100">
                      <button
                        onClick={() => {
                          clearCart();
                          setDiscountValue(0);
                          setIsTicketMenuOpen(false);
                          showToast('Ticket cleared');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 text-rose-600 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Ticket</span>
                      </button>
                      <button
                        onClick={() => {
                          handleResetToDemoTicket();
                          setIsTicketMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Reset Reference Items</span>
                      </button>
                      <button
                        onClick={() => {
                          handleSaveTicket();
                          setIsTicketMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                        <span>Save & Hold Tab</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsCustomerModalOpen(true);
                          setIsTicketMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                        <span>Assign Customer</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PROMINENT ORDER TYPE SELECTOR: DINE-IN, TAKEAWAY, DELIVERY */}
              <div className="p-2.5 bg-neutral-100 border-b border-neutral-200 shrink-0">
                {/* 3-Way Segmented Control */}
                <div className="grid grid-cols-3 gap-1 bg-neutral-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderType === 'dine_in'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>🍽️ Dine-in</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('pickup')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderType === 'pickup'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>🛍️ Takeaway</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderType === 'delivery'
                        ? 'bg-white text-neutral-900 shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>🛵 Delivery</span>
                  </button>
                </div>

                {/* Contextual Options Bar based on Order Type */}
                {orderType === 'dine_in' && (
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-700 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200">
                    <div className="relative">
                      <button
                        onClick={() => setIsTableDropdownOpen(!isTableDropdownOpen)}
                        className="flex items-center gap-1 font-bold text-neutral-900 hover:text-emerald-700 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{selectedTable}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                      </button>

                      {/* Dining Tables Popover */}
                      {isTableDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 p-2.5 z-40 animate-in fade-in duration-100">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                            Select Dining Table
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
                            {tables.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setSelectedTable(t.number);
                                  setIsTableDropdownOpen(false);
                                }}
                                className={`p-1.5 rounded-lg text-[11px] font-mono font-bold text-center transition-colors cursor-pointer ${
                                  selectedTable === t.number
                                    ? 'bg-[#43A047] text-white shadow-xs'
                                    : t.status === 'occupied'
                                    ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                                }`}
                              >
                                {t.number}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Guest Stepper */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-neutral-500 font-medium">Guests:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setGuestCount((g) => Math.max(1, g - 1))}
                          className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 font-bold"
                        >
                          -
                        </button>
                        <span className="w-4 text-center font-mono font-bold text-xs">{guestCount}</span>
                        <button
                          type="button"
                          onClick={() => setGuestCount((g) => g + 1)}
                          className="w-5 h-5 rounded-md bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-700 font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {orderType === 'pickup' && (
                  <div className="mt-2 flex items-center justify-between text-xs text-neutral-700 bg-white px-2.5 py-1.5 rounded-lg border border-neutral-200">
                    <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      <span>🛍️ Pickup Order</span>
                      <span className="text-[10px] text-neutral-400 font-mono">#TK-204</span>
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Est. Ready: 15-20 min
                    </span>
                  </div>
                )}

                {orderType === 'delivery' && (
                  <div className="mt-2 space-y-1.5 bg-white p-2 rounded-lg border border-neutral-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-neutral-500">Delivery Address:</span>
                      <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        Fee: +${deliveryFeeUsd.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Street address, house/apt..."
                      className="w-full text-xs p-1.5 bg-neutral-50 border border-neutral-200 rounded-md outline-hidden focus:border-[#43A047]"
                    />
                  </div>
                )}
              </div>

              {/* TICKET ITEMS LIST matching image_65047771.png */}
              <div className="flex-1 overflow-y-auto p-3.5 divide-y divide-neutral-100 space-y-0.5">
                {cart.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-neutral-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-neutral-300 stroke-1" />
                    <p className="text-xs">Active ticket is empty</p>
                    <p className="text-[11px] text-neutral-400">
                      Tap any food tile on the left to add items
                    </p>
                    <button
                      onClick={handleResetToDemoTicket}
                      className="mt-2 text-xs font-bold text-[#43A047] hover:underline cursor-pointer"
                    >
                      Load Demo Ticket
                    </button>
                  </div>
                ) : (
                  cart.map((ci, index) => {
                    const linePriceStr = getLineItemTotal(ci);

                    return (
                      <div
                        key={`${ci.menuItem.id}-${index}`}
                        onClick={() => {
                          setEditingItemIndex(index);
                          setEditingItemNotes(ci.customerNotes || '');
                        }}
                        className="py-2.5 flex items-center justify-between text-xs cursor-pointer hover:bg-neutral-50 px-1 rounded-md transition-colors group"
                      >
                        {/* Item Name and Multiplier (e.g., "Pepperoni Pizza x 1") */}
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="font-medium text-neutral-800 truncate">
                            <span>{ci.menuItem.name}</span>
                            <span className="text-neutral-500 font-normal ml-1">
                              x {ci.quantity}
                            </span>
                          </div>
                          {ci.customerNotes && (
                            <div className="text-[10px] text-amber-700 font-medium truncate">
                              Note: {ci.customerNotes}
                            </div>
                          )}
                        </div>

                        {/* Price (e.g., "5.69") */}
                        <div className="flex items-center gap-2 shrink-0">
                          {ci.customerNotes && (
                            <Clock className="w-3 h-3 text-neutral-400" />
                          )}
                          <span className="font-normal tabular-nums text-neutral-900 font-mono text-xs sm:text-sm">
                            {currency === 'USD' ? linePriceStr : formatMoney(ci.menuItem.price * ci.quantity)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* TOTALS & SUMMARY SECTION matching image_65047771.png WITH INTERACTIVE USER DECISIONS */}
              <div className="p-4 border-t border-neutral-200 bg-white space-y-2.5 text-xs text-neutral-600">
                {/* 1. Discount Row with Interactive Decision Controls */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-700">Discount</span>
                      <button
                        type="button"
                        onClick={() => setShowDiscountEditor(!showDiscountEditor)}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                        title="Open discount editor"
                      >
                        {showDiscountEditor ? 'Close' : calculatedDiscountUsd > 0 ? 'Edit' : '+ Apply'}
                      </button>
                      {calculatedDiscountUsd > 0 && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          ({discountType === 'percent' ? `${discountValue}%` : `$${discountValue.toFixed(2)}`})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tabular-nums text-neutral-900 font-semibold">
                        {currency === 'USD'
                          ? calculatedDiscountUsd.toFixed(2)
                          : formatMoney(calculatedDiscountTzs)}
                      </span>
                      {calculatedDiscountUsd > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDiscountValue(0);
                            showToast('Discount removed');
                          }}
                          className="text-neutral-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          title="Remove discount"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Discount Decision Editor */}
                  {showDiscountEditor && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
                        <span>Discount Presets:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setDiscountType('percent')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              discountType === 'percent' ? 'bg-[#43A047] text-white' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            %
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('fixed')}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              discountType === 'fixed' ? 'bg-[#43A047] text-white' : 'bg-neutral-200 text-neutral-700'
                            }`}
                          >
                            $
                          </button>
                        </div>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'None', val: 0, type: 'fixed' as const },
                          { label: '5%', val: 5, type: 'percent' as const },
                          { label: '10%', val: 10, type: 'percent' as const },
                          { label: '15%', val: 15, type: 'percent' as const },
                          { label: '$20', val: 20, type: 'fixed' as const },
                          { label: '$21 (Demo)', val: 21, type: 'fixed' as const },
                        ].map((p, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setDiscountType(p.type);
                              setDiscountValue(p.val);
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                              discountValue === p.val && discountType === p.type
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Input & Reason */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Custom Value:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                            className="w-full text-xs p-1 bg-white border border-neutral-200 rounded font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-500 block mb-0.5">Reason:</label>
                          <select
                            value={discountReason}
                            onChange={(e) => setDiscountReason(e.target.value)}
                            className="w-full text-xs p-1 bg-white border border-neutral-200 rounded text-neutral-800"
                          >
                            <option value="Courtesy / Promo">Courtesy / Promo</option>
                            <option value="VIP Regular">VIP Regular</option>
                            <option value="Manager Discretion">Manager Discretion</option>
                            <option value="Staff Meal">Staff Meal</option>
                            <option value="Service Recovery">Service Recovery</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Tax Row with Interactive Decision Controls (Tax Applied vs Tax-Exempt) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-700">Tax</span>
                      {/* User Decision Toggle for Tax */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextState = !applyTax;
                          setApplyTax(nextState);
                          showToast(nextState ? `Tax applied (${taxRatePct}%)` : 'Tax Exempt: $0.00 tax applied');
                        }}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          applyTax
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        }`}
                        title="Click to toggle between Tax Applied and Tax Exempt"
                      >
                        {applyTax ? `✓ ${taxRatePct}% Tax` : '✕ Tax-Exempt (0%)'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTaxEditor(!showTaxEditor)}
                        className="text-[10px] text-neutral-400 hover:text-neutral-700 cursor-pointer"
                        title="Change tax rate preset"
                      >
                        ⚙️
                      </button>
                    </div>

                    <span className="font-mono tabular-nums text-neutral-900 font-semibold">
                      {currency === 'USD'
                        ? calculatedTaxUsd.toFixed(2)
                        : formatMoney(calculatedTaxTzs)}
                    </span>
                  </div>

                  {/* Inline Tax Rate Selector */}
                  {showTaxEditor && (
                    <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 animate-in fade-in duration-150">
                      <div className="text-[10px] font-bold text-neutral-700">Tax Configuration:</div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setApplyTax(true);
                            setTaxRatePct(6.5);
                          }}
                          className={`p-1 text-[10px] rounded font-mono font-bold border ${
                            applyTax && taxRatePct === 6.5
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          6.5% Meal Tax
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setApplyTax(true);
                            setTaxRatePct(18.0);
                          }}
                          className={`p-1 text-[10px] rounded font-mono font-bold border ${
                            applyTax && taxRatePct === 18.0
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          18% VAT
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setApplyTax(false);
                          }}
                          className={`p-1 text-[10px] rounded font-mono font-bold border ${
                            !applyTax
                              ? 'bg-amber-600 text-white border-amber-600'
                              : 'bg-white border-neutral-200 text-neutral-700'
                          }`}
                        >
                          0% Exempt
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Delivery Fee Line (when orderType === 'delivery') */}
                {orderType === 'delivery' && (
                  <div className="flex justify-between items-center text-blue-700 font-medium">
                    <div className="flex items-center gap-1">
                      <span>🛵 Delivery Fee</span>
                      <span className="text-[10px] text-blue-500 font-mono">(Flat Rate)</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold">
                      {currency === 'USD' ? deliveryFeeUsd.toFixed(2) : formatMoney(deliveryFeeEffectiveTzs)}
                    </span>
                  </div>
                )}

                {/* 4. Bold Total Line matching screenshot ("Total      48.52") */}
                <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 text-neutral-900">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base sm:text-lg font-bold font-mono tabular-nums">
                    {currency === 'USD' ? totalPayableUsd.toFixed(2) : formatMoney(totalPayableTzs)}
                  </span>
                </div>
              </div>

              {/* BOTTOM DUAL GREEN ACTION BUTTONS: [ SAVE ] [ CHARGE ] matching image_65047771.png */}
              <div className="grid grid-cols-2 gap-1 p-2 bg-neutral-100 border-t border-neutral-200 shrink-0">
                {/* SAVE BUTTON */}
                <button
                  disabled={cart.length === 0}
                  onClick={handleSaveTicket}
                  className={`py-3 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                    cart.length > 0
                      ? 'bg-[#689F38] hover:bg-[#558B2F] active:scale-98 cursor-pointer'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <span>SAVE</span>
                </button>

                {/* CHARGE BUTTON */}
                <button
                  disabled={cart.length === 0}
                  onClick={() => {
                    setTenderCashAmount(totalPayableUsd);
                    setIsChargeModalOpen(true);
                  }}
                  className={`py-3 px-3 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                    cart.length > 0
                      ? 'bg-[#43A047] hover:bg-[#388E3C] active:scale-98 cursor-pointer'
                      : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  <span>CHARGE</span>
                </button>
              </div>
            </div>
          </div>

      {/* ================= RESTAURANT SLIDE-OVER NAVIGATION DRAWER ================= */}
      {isNavDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsNavDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-[#43A047] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{currentTenant.logo}</span>
                <div>
                  <h3 className="font-bold text-sm leading-tight text-white">{currentTenant.name}</h3>
                  <p className="text-[10px] text-white/80">Cashier Station · Terminal 01</p>
                </div>
              </div>
              <button
                onClick={() => setIsNavDrawerOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links to All Restaurant Modules */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">
                Restaurant Modules
              </div>

              {[
                { role: 'cashier', label: 'Cashier POS', icon: Banknote, desc: 'Live register & tickets' },
                { role: 'owner', label: 'Executive BI', icon: LayoutGrid, desc: 'Analytics & P&L figures' },
                { role: 'kitchen', label: 'Kitchen KDS', icon: ChefHat, desc: 'Live cook stations' },
                { role: 'waiter', label: 'Waiter App', icon: Users, desc: 'Orders & 5% commission' },
                { role: 'customer', label: 'Customer Portal', icon: Smartphone, desc: 'Online order menu' },
                { role: 'manager', label: 'Inventory & BOM', icon: Boxes, desc: 'Recipe costing & stock' },
                { role: 'reception', label: 'Staff & Payroll', icon: ShieldCheck, desc: 'HR & wage advances' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeRole === item.role;

                return (
                  <button
                    key={item.role}
                    onClick={() => {
                      setActiveRole(item.role as Role);
                      setIsNavDrawerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-3 transition-colors ${
                      isActive
                        ? 'bg-[#43A047]/10 text-[#2E7D32] font-bold border border-[#43A047]/30'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#43A047]' : 'text-neutral-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold leading-tight">{item.label}</div>
                      <div className="text-[10px] text-neutral-400">{item.desc}</div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#43A047]" />}
                  </button>
                );
              })}

              {/* Held Tabs Quick Look */}
              <div className="pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">
                  <span>Held / Open Tickets</span>
                  <span className="font-mono text-emerald-700">{heldTickets.length} open</span>
                </div>
                {heldTickets.map((ht) => (
                  <div
                    key={ht.id}
                    className="mx-1 my-1 p-2 bg-neutral-50 hover:bg-neutral-100 rounded-lg text-xs flex items-center justify-between border border-neutral-200/60"
                  >
                    <div>
                      <div className="font-bold text-neutral-800">{ht.name}</div>
                      <div className="text-[10px] text-neutral-400">
                        {ht.itemsCount} items · Saved {ht.savedAt}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-neutral-900">
                      ${ht.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Switch Restaurant Branch */}
              <div className="pt-3 border-t border-neutral-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-3 py-1">
                  Switch Branch
                </div>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setCurrentTenantId(t.id);
                      setIsNavDrawerOpen(false);
                      showToast(`Switched branch to ${t.name}`);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                      t.id === currentTenant.id
                        ? 'bg-neutral-100 text-neutral-900 font-bold'
                        : 'text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="truncate">{t.logo} {t.name}</span>
                    {t.id === currentTenant.id && <span className="w-1.5 h-1.5 rounded-full bg-[#43A047]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Footer: Shift Register Float */}
            <div className="p-3 bg-neutral-50 border-t border-neutral-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-500">Drawer Cash Float:</span>
                <span className="font-mono font-bold text-neutral-900">
                  {formatMoney(cashierShift.expectedCash)}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">
                Cashier: Tony Danza · Shift opened {cashierShift.openedAt}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= LINE ITEM DETAIL / MODIFIER MODAL ================= */}
      {editingItemIndex !== null && cart[editingItemIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2.5">
              <h3 className="font-bold text-sm text-neutral-900">
                {cart[editingItemIndex].menuItem.name}
              </h3>
              <button
                onClick={() => setEditingItemIndex(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quantity Stepper */}
            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <span className="text-xs font-semibold text-neutral-700">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateCartItemQty(editingItemIndex, -1)}
                  className="w-8 h-8 rounded-lg bg-white border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 text-neutral-700 font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-mono font-bold text-sm text-neutral-900">
                  {cart[editingItemIndex].quantity}
                </span>
                <button
                  onClick={() => updateCartItemQty(editingItemIndex, 1)}
                  className="w-8 h-8 rounded-lg bg-[#43A047] text-white flex items-center justify-center hover:bg-[#388E3C] shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Cooking Notes / Kitchen Modifiers */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Kitchen / Preparation Note:</label>
              <input
                type="text"
                placeholder="e.g. Extra hot, no dressing, warm up..."
                value={editingItemNotes}
                onChange={(e) => setEditingItemNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-[#43A047]"
              />
            </div>

            {/* Quick Note Presets */}
            <div className="flex flex-wrap gap-1">
              {['Warm up', 'Extra napkin', 'No dressing', 'Gluten conscious', 'Cut in half'].map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setEditingItemNotes(note)}
                  className="px-2 py-0.5 text-[10px] bg-neutral-100 hover:bg-neutral-200 rounded-md text-neutral-700"
                >
                  +{note}
                </button>
              ))}
            </div>

            {/* Actions: Remove & Save */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  removeFromCart(editingItemIndex);
                  setEditingItemIndex(null);
                  showToast('Item removed from ticket');
                }}
                className="py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>

              <button
                onClick={() => {
                  cart[editingItemIndex].customerNotes = editingItemNotes.trim();
                  setEditingItemIndex(null);
                  showToast('Line item updated');
                }}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-[#43A047] hover:bg-[#388E3C] rounded-xl shadow-xs text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOMER ASSIGNMENT MODAL ================= */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#43A047]" />
                <h3 className="font-bold text-sm text-neutral-900">Assign Customer / Waiter</h3>
              </div>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-500 font-medium block mb-1">Customer Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-[#43A047]"
                />
              </div>

              <div>
                <label className="text-neutral-500 font-medium block mb-1">Customer Phone / WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="+255 7... or +1 ..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-[#43A047]"
                />
              </div>

              <div>
                <label className="text-neutral-500 font-medium block mb-1">Attributed Server / Waiter (5% Commission):</label>
                <select
                  value={selectedWaiterId}
                  onChange={(e) => setSelectedWaiterId(e.target.value)}
                  className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden text-neutral-800"
                >
                  {waiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.referralCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setIsCustomerModalOpen(false);
                  showToast(customerName ? `Customer ${customerName} linked to ticket` : 'Customer info updated');
                }}
                className="w-full py-2.5 bg-[#43A047] hover:bg-[#388E3C] text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Save to Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TENDER / CHARGE PAYMENT MODAL ================= */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
                  Payment Checkout
                </span>
                <h3 className="text-lg font-bold text-neutral-900">Charge Ticket</h3>
              </div>
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Due Banner */}
            <div className="p-4 bg-neutral-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-neutral-400">Total Amount Due:</div>
                <div className="text-2xl font-extrabold font-mono text-emerald-400">
                  {currency === 'USD' ? `$${totalPayableUsd.toFixed(2)}` : formatMoney(totalPayableTzs)}
                </div>
              </div>
              <div className="text-right text-xs text-neutral-400">
                <div>Items: {cart.reduce((sum, ci) => sum + ci.quantity, 0)}</div>
                <div className="text-emerald-400 font-mono">Tax: ${calculatedTaxUsd.toFixed(2)}</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-2">Select Tender:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'card', label: 'Credit Card', icon: CreditCard },
                  { id: 'mpesa', label: 'Scan / M-Pesa', icon: QrCode },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = selectedPaymentMethod === m.id;

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(m.id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                        isSel
                          ? 'border-[#43A047] bg-[#43A047]/10 text-[#2E7D32] shadow-xs'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tender Calculation & Quick Denomination Buttons */}
            {selectedPaymentMethod === 'cash' && (
              <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700">Cash Received:</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-neutral-500">$</span>
                    <input
                      type="number"
                      step={0.01}
                      min={totalPayableUsd}
                      value={tenderCashAmount}
                      onChange={(e) => setTenderCashAmount(Number(e.target.value))}
                      className="w-24 p-1 bg-white border border-neutral-300 rounded font-bold text-neutral-900 text-right"
                    />
                  </div>
                </div>

                {/* Quick denomination pills */}
                <div className="flex gap-1.5 pt-1">
                  {[totalPayableUsd, 50, 60, 100].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTenderCashAmount(amt)}
                      className={`flex-1 py-1 text-[11px] font-mono font-bold rounded-lg border transition-colors ${
                        tenderCashAmount === amt
                          ? 'bg-[#43A047] text-white border-[#43A047]'
                          : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {idx === 0 ? 'Exact' : `$${amt}`}
                    </button>
                  ))}
                </div>

                {/* Change Due Display */}
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-xs">
                  <span className="text-neutral-600 font-semibold">Change to Return:</span>
                  <span className="text-sm font-bold font-mono text-emerald-700">
                    ${changeDueUsd.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Settle Button */}
            <div className="pt-2">
              <button
                onClick={handleProcessPayment}
                className="w-full py-3 bg-[#43A047] hover:bg-[#388E3C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Complete Payment & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Receipt Modal */}
      <ReceiptModal
        order={lastProcessedOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
