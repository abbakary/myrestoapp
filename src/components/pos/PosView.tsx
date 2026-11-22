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
  Ticket,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, Order, PaymentMethod, OrderType, Role, KitchenStation, ModifierItem } from '../../types/restaurant';
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
    processPayment,
    updateOrderStatus,
    requestApproval,
    formatMoney,
    currency,
    toggleCurrency,
    taxEnabled,
    setTaxEnabled,
    taxRatePct,
    setTaxRatePct,
    cashierShift,
    activeRole,
    setActiveRole,
    waiters,
    preparedDishStocks,
    activeOperator,
  } = useRestaurant();

  // Active Category matching screenshot: 'Sweets', 'Fruits', 'Coffee & Tea', 'Breakfast', 'All Items'
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    menuItems.some((m) => m.category === 'Sweets' || m.category === 'Desserts') ? 'Sweets' : 'All Items'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  // Slide-over navigation drawer for restaurant modules
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState<boolean>(false);

  // Ticket settings & Order types: dine_in, pickup, delivery
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTable, setSelectedTable] = useState<string>(() => tables[0]?.number || 'Table 01');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [isTicketMenuOpen, setIsTicketMenuOpen] = useState<boolean>(false);
  const [isTableDropdownOpen, setIsTableDropdownOpen] = useState<boolean>(false);

  // Customer modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>(() => waiters[0]?.id || '');

  // Coupon & Orders lookup modal
  const [isCouponLookupOpen, setIsCouponLookupOpen] = useState<boolean>(false);
  const [couponSearchQuery, setCouponSearchQuery] = useState<string>('');
  const [cancelTargetOrder, setCancelTargetOrder] = useState<Order | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState<string>('');

  // Line item detail / modifier modal
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingItemNotes, setEditingItemNotes] = useState<string>('');
  const [editingItemExtraCharge, setEditingItemExtraCharge] = useState<number>(0);

  // Portion & Modifier pre-add picker modal (connects to variant/modifier BOM rules)
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [chosenPortion, setChosenPortion] = useState<{ name: string; priceDelta: number } | undefined>(undefined);
  const [chosenModifiers, setChosenModifiers] = useState<ModifierItem[]>([]);
  const [customizingQty, setCustomizingQty] = useState<number>(1);
  const [customizingNote, setCustomizingNote] = useState<string>('');

  // Custom Off-Menu Item modal
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState<boolean>(false);
  const [posCustomName, setPosCustomName] = useState<string>('');
  const [posCustomPrice, setPosCustomPrice] = useState<number>(15000);
  const [posCustomQty, setPosCustomQty] = useState<number>(1);
  const [posCustomStation, setPosCustomStation] = useState<KitchenStation>('grill');
  const [posCustomNote, setPosCustomNote] = useState<string>('');

  // Discount decision controls (in TZS for fixed, or % for percent)
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountReason, setDiscountReason] = useState<string>('Courtesy / Promo');
  const [showDiscountEditor, setShowDiscountEditor] = useState<boolean>(false);

  // Payment / Charge modal (in TZS, supports single & split tenders)
  const [isChargeModalOpen, setIsChargeModalOpen] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<Exclude<PaymentMethod, 'split'>>('cash');
  const [tenderCashTzs, setTenderCashTzs] = useState<number>(100000);
  const [singleTxRef, setSingleTxRef] = useState<string>('');
  const [isSplitPayment, setIsSplitPayment] = useState<boolean>(false);
  const [splitMethod1, setSplitMethod1] = useState<Exclude<PaymentMethod, 'split'>>('cash');
  const [splitAmount1, setSplitAmount1] = useState<number>(0);
  const [splitMethod2, setSplitMethod2] = useState<Exclude<PaymentMethod, 'split'>>('mpesa');
  const [splitRef2, setSplitRef2] = useState<string>('');
  const [lastProcessedOrder, setLastProcessedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Held tickets (stored in TZS)
  const [heldTickets, setHeldTickets] = useState<{ id: string; name: string; itemsCount: number; total: number; savedAt: string }[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Bottom categories matching screenshot
  const categoryTabs = [
    { id: 'Fruits', label: 'FRUITS' },
    { id: 'Sweets', label: 'SWEETS' },
    { id: 'Coffee & Tea', label: 'COFFEE & TEA' },
    { id: 'Breakfast', label: 'BREAKFAST' },
    { id: 'All Items', label: 'ALL ITEMS' },
  ];

  // Format line/ticket amount cleanly using global currency
  const formatPosNumber = (amountInTzs: number) => {
    return formatMoney(amountInTzs);
  };

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

  // Calculate ticket totals in TZS
  const grossSubtotalTzs = useMemo(() => {
    return cart.reduce((acc, ci) => {
      const unit = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0) + (ci.extraCharge || 0);
      const mods = ci.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0);
      return acc + (unit + mods) * ci.quantity;
    }, 0);
  }, [cart]);

  const calculatedDiscountTzs = useMemo(() => {
    if (cart.length === 0) return 0;
    if (discountType === 'percent') {
      return Math.round((grossSubtotalTzs * Math.min(100, Math.max(0, discountValue))) / 100);
    }
    return Math.min(grossSubtotalTzs, Math.max(0, Math.round(discountValue)));
  }, [grossSubtotalTzs, discountType, discountValue, cart.length]);

  const netSubtotalTzs = Math.max(0, grossSubtotalTzs - calculatedDiscountTzs);

  // Tax calculation respects global optional taxEnabled & taxRatePct
  const calculatedTaxTzs = useMemo(() => {
    if (cart.length === 0 || !taxEnabled) return 0;
    return Math.round(netSubtotalTzs * (taxRatePct / 100));
  }, [netSubtotalTzs, cart.length, taxEnabled, taxRatePct]);

  const deliveryFeeEffectiveTzs = orderType === 'delivery' ? currentTenant.deliveryFee : 0;

  const totalPayableTzs = Math.max(0, netSubtotalTzs + calculatedTaxTzs + deliveryFeeEffectiveTzs);

  // Calculate Change Due in TZS
  const changeDueTzs = Math.max(0, Math.round(tenderCashTzs - totalPayableTzs));

  // Add Item Click — open Portion/Modifier picker when item defines portions or modifiers
  const handleItemClick = (item: MenuItem) => {
    const hasPortions = Boolean(item.portions && item.portions.length > 0);
    const hasModifiers = Boolean(item.modifiers && item.modifiers.length > 0);
    if (hasPortions || hasModifiers) {
      const defaultPortion =
        item.portions?.find((p) => p.priceDelta === 0) || item.portions?.[0];
      setCustomizingItem(item);
      setChosenPortion(defaultPortion);
      setChosenModifiers([]);
      setCustomizingQty(1);
      setCustomizingNote('');
      return;
    }
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
    showToast(type === 'percent' ? `Applied ${val}% discount to Ticket` : `Applied ${formatMoney(val)} discount to Ticket`);
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
      total: totalPayableTzs,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHeldTickets((prev) => [newHeld, ...prev]);

    // Also dispatch to kitchen
    const createdOrder = submitOrder({
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
      taxRate: taxEnabled ? taxRatePct / 100 : 0,
      isTaxExempt: !taxEnabled,
    });

    clearCart();
    setDiscountValue(0);
    showToast(
      `Ticket held (#${newHeld.id}) · Coupon ${createdOrder.serviceCouponCode || ''} sent to Kitchen!`
    );
  };

  // Handle Charge / Settle Payment (supports single & split tenders)
  const handleProcessPayment = () => {
    if (cart.length === 0) return;

    if (isSplitPayment) {
      const amt1 = Math.min(totalPayableTzs, Math.max(0, Math.round(splitAmount1)));
      const amt2 = Math.max(0, totalPayableTzs - amt1);

      const createdOrder = submitOrder({
        type: orderType,
        tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
        customerName: customerName || `Guest (${orderType === 'dine_in' ? selectedTable : 'Walk-in'})`,
        customerPhone: customerPhone || undefined,
        referralWaiterId: selectedWaiterId,
        paymentMethod: 'split',
        markAsPaid: false,
        notes: `Settled via POS (Split: ${splitMethod1.toUpperCase()} + ${splitMethod2.toUpperCase()})`,
        discount: calculatedDiscountTzs,
        discountType: discountType,
        discountValue: discountValue,
        discountReason: discountReason,
        tax: calculatedTaxTzs,
        taxRate: taxEnabled ? taxRatePct / 100 : 0,
        isTaxExempt: !taxEnabled,
        actorName: 'Cashier POS',
        actorRole: 'cashier',
      });

      if (amt1 > 0) {
        processPayment(createdOrder.id, splitMethod1, amt1, {
          completeService: amt2 === 0,
          collectedBy: 'Cashier POS',
        });
      }
      if (amt2 > 0) {
        processPayment(createdOrder.id, splitMethod2, amt2, {
          completeService: true,
          collectedBy: 'Cashier POS',
          transactionRef: splitRef2.trim() || undefined,
        });
      }

      setLastProcessedOrder({
        ...createdOrder,
        paidAmount: totalPayableTzs,
        paymentStatus: 'paid',
        paymentMethod: 'split',
      });
    } else {
      const completedOrder = submitOrder({
        type: orderType,
        tableNumber: orderType === 'dine_in' ? selectedTable : undefined,
        customerName: customerName || `Guest (${orderType === 'dine_in' ? selectedTable : 'Walk-in'})`,
        customerPhone: customerPhone || undefined,
        referralWaiterId: selectedWaiterId,
        paymentMethod: selectedPaymentMethod,
        markAsPaid: true,
        notes: `Settled via POS · Tender: ${selectedPaymentMethod.toUpperCase()}${
          singleTxRef.trim() ? ` (Ref: ${singleTxRef.trim()})` : ''
        } · ${orderType.toUpperCase()}`,
        discount: calculatedDiscountTzs,
        discountType: discountType,
        discountValue: discountValue,
        discountReason: discountReason,
        tax: calculatedTaxTzs,
        taxRate: taxEnabled ? taxRatePct / 100 : 0,
        isTaxExempt: !taxEnabled,
        actorName: 'Cashier POS',
        actorRole: 'cashier',
      });

      setLastProcessedOrder(completedOrder);
    }

    setIsChargeModalOpen(false);
    setIsReceiptOpen(true);
    setDiscountValue(0);
    setCustomerName('');
    setCustomerPhone('');
    setSingleTxRef('');
    setSplitRef2('');
    setIsSplitPayment(false);
  };

  // Quick reset to sample ticket using live menu items
  const handleResetToDemoTicket = () => {
    if (menuItems.length === 0) {
      showToast('No menu items yet — create dishes in Inventory & BOM first.');
      return;
    }

    const sampleItems = [
      menuItems.find((i) => i.id === 'pos-pepperoni-pizza'),
      menuItems.find((i) => i.id === 'pos-caesar-salad'),
      menuItems.find((i) => i.id === 'pos-orange-juice'),
      menuItems.find((i) => i.id === 'pos-black-tea'),
      menuItems.find((i) => i.id === 'pos-sandwich'),
      menuItems.find((i) => i.id === 'pos-mango-dessert'),
    ].filter((item): item is MenuItem => Boolean(item));

    const itemsToAdd = sampleItems.length > 0 ? sampleItems : menuItems.slice(0, 4);

    clearCart();
    setTimeout(() => {
      itemsToAdd.forEach((item, idx) => {
        addToCart(item, undefined, [], '', idx === 1 ? 2 : 1);
      });
      setDiscountValue(0);
      setDiscountType('fixed');
      showToast('Loaded sample POS ticket!');
    }, 50);
  };

  // Line item price formatting
  const getLineItemTotal = (ci: (typeof cart)[0]) => {
    const unit = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0) + (ci.extraCharge || 0);
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

              {/* Coupon Lookup Modal Trigger */}
              <button
                onClick={() => setIsCouponLookupOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-400 hover:bg-amber-300 text-neutral-950 transition-colors cursor-pointer"
                title="Verify Service Coupon Code & Live Orders"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Coupons ({orders.filter((o) => o.status !== 'completed').length})</span>
              </button>

              {/* Fast currency toggle (TZS / USD) */}
              <button
                onClick={toggleCurrency}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                title={`Current: ${currency}. Click to switch between TZS and USD`}
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
                    const batchStock = preparedDishStocks.find((p) => p.menuItemId === item.id);

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

                        {/* Batch pool availability indicator */}
                        {batchStock && (
                          <div
                            className={`absolute top-1.5 left-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs border border-white/20 ${
                              batchStock.preparedPlatesAvailable <= 0
                                ? 'text-rose-300'
                                : batchStock.preparedPlatesAvailable <= 5
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {batchStock.preparedPlatesAvailable} left
                          </div>
                        )}

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
                          {(item.portions?.length || item.modifiers?.length) ? (
                            <span className="text-[9px] text-amber-300 font-semibold mt-0.5">
                              Options
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {/* Fallback if no matching items in category or empty menu */}
                  {filteredItems.length === 0 && (
                    <div className="col-span-full py-12 px-4 text-center text-neutral-500">
                      <Sparkles className="w-8 h-8 mx-auto text-neutral-400 mb-2" />
                      {menuItems.length === 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-neutral-700">
                            No menu items have been added for this restaurant yet
                          </p>
                          <p className="text-[11px] text-neutral-500 max-w-sm mx-auto">
                            Create dishes in Inventory &amp; Menu Builder or ring up an off-menu custom item right away.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setActiveRole('manager')}
                              className="px-3 py-1.5 rounded-lg bg-[#43A047] hover:bg-[#388E3C] text-white text-xs font-bold cursor-pointer"
                            >
                              Open Inventory &amp; Menu Builder
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCustomItemModalOpen(true)}
                              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold cursor-pointer"
                            >
                              + Add Custom Off-Menu Item
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-semibold">
                            {searchQuery
                              ? `No items found matching "${searchQuery}"`
                              : `No items in ${selectedCategory}`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSelectedCategory('All Items');
                            }}
                            className="mt-2 text-xs font-bold text-[#43A047] hover:underline cursor-pointer"
                          >
                            Show All Items
                          </button>
                        </>
                      )}
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

                  {/* Tile 5: Discount 5,000 TZS (Grey Price Tag tile) */}
                  <div
                    onClick={() => handleApplyDiscountTile(5000, 'fixed')}
                    className={`relative aspect-4/3 sm:aspect-square active:scale-97 border rounded-xl p-2 flex flex-col items-center justify-center cursor-pointer shadow-xs transition-all group ${
                      discountValue === 5000 && discountType === 'fixed'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-900'
                        : 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800'
                    }`}
                  >
                    {discountValue === 5000 && discountType === 'fixed' && (
                      <span className="absolute top-1 right-1 text-[9px] bg-emerald-600 text-white rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                    <div className="relative mb-1 flex items-center justify-center">
                      <Tag className={`w-6 h-6 transition-colors stroke-1.5 rotate-45 ${
                        discountValue === 5000 && discountType === 'fixed' ? 'text-emerald-600' : 'text-neutral-400 group-hover:text-neutral-600'
                      }`} />
                      <span className="absolute text-[8px] font-bold font-mono">5k</span>
                    </div>
                    <span className="text-[11px] sm:text-xs font-semibold">
                      {formatMoney(5000)} Off
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
                    <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in duration-100">
                      <button
                        onClick={() => {
                          setIsCustomItemModalOpen(true);
                          setIsTicketMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 font-semibold text-indigo-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Add Custom Off-Menu Item</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsCouponLookupOpen(true);
                          setIsTicketMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center gap-2 font-semibold text-amber-800"
                      >
                        <Ticket className="w-3.5 h-3.5 text-amber-600" />
                        <span>Verify Service Coupon</span>
                      </button>
                      <button
                        onClick={() => {
                          setTaxEnabled(!taxEnabled);
                          setIsTicketMenuOpen(false);
                          showToast(
                            !taxEnabled
                              ? `Tax enabled (${taxRatePct}% VAT across POS, Waiter & Customer)`
                              : 'Tax disabled across all carts & orders'
                          );
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center justify-between gap-2"
                      >
                        <span className="font-semibold">Optional Tax ({taxRatePct}% VAT)</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            taxEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {taxEnabled ? 'ON' : 'OFF'}
                        </span>
                      </button>
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
                        <span>Load Sample Ticket</span>
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
                      <span className="text-[10px] text-neutral-400 font-mono">
                        #{String(orders.length + 1).padStart(3, '0')}
                      </span>
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
                        Fee: +{formatMoney(currentTenant.deliveryFee)}
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
                      {menuItems.length > 0
                        ? 'Tap any food tile on the left to add items'
                        : 'Add menu items in Inventory & BOM or create a custom item'}
                    </p>
                    {menuItems.length > 0 && (
                      <button
                        onClick={handleResetToDemoTicket}
                        className="mt-2 text-xs font-bold text-[#43A047] hover:underline cursor-pointer"
                      >
                        Load Sample Ticket
                      </button>
                    )}
                  </div>
                ) : (
                  cart.map((ci, index) => {
                    const linePriceStr = getLineItemTotal(ci);
                    const isCustom = ci.isCustomItem || ci.menuItem.id.startsWith('custom-');

                    return (
                      <div
                        key={`${ci.menuItem.id}-${index}`}
                        onClick={() => {
                          setEditingItemIndex(index);
                          setEditingItemNotes(ci.customInstructions || ci.customerNotes || '');
                          setEditingItemExtraCharge(ci.extraCharge || 0);
                        }}
                        className="py-2.5 flex items-start justify-between gap-2.5 text-xs cursor-pointer hover:bg-neutral-50 px-1 rounded-md transition-colors group"
                      >
                        {!isCustom && ci.menuItem.image ? (
                          <img
                            src={ci.menuItem.image}
                            alt={ci.menuItem.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-200 bg-neutral-100"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg shrink-0 border border-indigo-200 bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}

                        {/* Full Item Name, Description & Prep Notes */}
                        <div className="flex-1 min-w-0 pr-2 space-y-0.5">
                          <div className="font-semibold text-neutral-800 leading-snug break-words flex items-center gap-1.5 flex-wrap">
                            <span>{ci.menuItem.name}</span>
                            <span className="text-neutral-500 font-normal">
                              × {ci.quantity}
                            </span>
                            {isCustom && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                Custom
                              </span>
                            )}
                          </div>
                          {isCustom && ci.menuItem.description && ci.menuItem.description !== ci.customInstructions && (
                            <div className="text-[10px] text-neutral-500 leading-snug break-words">
                              {ci.menuItem.description}
                            </div>
                          )}
                          {(ci.customInstructions || ci.customerNotes || (ci.extraCharge && ci.extraCharge > 0)) && (
                            <div className="text-[10px] text-amber-700 font-medium leading-snug break-words">
                              {ci.customInstructions || ci.customerNotes}
                              {ci.extraCharge && ci.extraCharge > 0 ? ` (+${formatMoney(ci.extraCharge)})` : ''}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          {(ci.customInstructions || ci.customerNotes) && (
                            <Clock className="w-3 h-3 text-neutral-400" />
                          )}
                          <span className="font-semibold tabular-nums text-neutral-900 font-mono text-xs sm:text-sm">
                            {linePriceStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* TOTALS & SUMMARY SECTION WITH OPTIONAL CONFIGURABLE TAX */}
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
                        {showDiscountEditor ? 'Close' : calculatedDiscountTzs > 0 ? 'Edit' : '+ Apply'}
                      </button>
                      {calculatedDiscountTzs > 0 && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          ({discountType === 'percent' ? `${discountValue}%` : formatMoney(discountValue)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono tabular-nums text-neutral-900 font-semibold">
                        {formatMoney(calculatedDiscountTzs)}
                      </span>
                      {calculatedDiscountTzs > 0 && (
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
                            TZS
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
                          { label: '5,000', val: 5000, type: 'fixed' as const },
                          { label: '10,000', val: 10000, type: 'fixed' as const },
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
                          <label className="text-[10px] text-neutral-500 block mb-0.5">
                            Custom ({discountType === 'percent' ? '%' : 'TZS'}):
                          </label>
                          <input
                            type="number"
                            min="0"
                            step={discountType === 'percent' ? 1 : 500}
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

                {/* 2. Optional Tax Row — ONLY displayed and included when Manager/Owner enables Tax */}
                {taxEnabled && (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-neutral-700">VAT ({taxRatePct}%)</span>
                    </div>
                    <span className="font-mono tabular-nums text-neutral-900 font-semibold">
                      {formatMoney(calculatedTaxTzs)}
                    </span>
                  </div>
                )}

                {/* 3. Delivery Fee Line (when orderType === 'delivery') */}
                {orderType === 'delivery' && (
                  <div className="flex justify-between items-center text-blue-700 font-medium">
                    <div className="flex items-center gap-1">
                      <span>🛵 Delivery Fee</span>
                      <span className="text-[10px] text-blue-500 font-mono">(Flat Rate)</span>
                    </div>
                    <span className="font-mono tabular-nums font-semibold">
                      {formatMoney(deliveryFeeEffectiveTzs)}
                    </span>
                  </div>
                )}

                {/* 4. Bold Total Line */}
                <div className="flex justify-between items-baseline pt-2 border-t border-neutral-200 text-neutral-900">
                  <span className="text-sm font-bold">Total</span>
                  <span className="text-base sm:text-lg font-bold font-mono tabular-nums">
                    {formatMoney(totalPayableTzs)}
                  </span>
                </div>
              </div>

              {/* BOTTOM DUAL GREEN ACTION BUTTONS: [ SAVE ] [ CHARGE ] */}
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
                    setTenderCashTzs(totalPayableTzs);
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
                      {formatMoney(ht.total)}
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
                Cashier: {activeOperator.name} · Shift opened {cashierShift.openedAt}
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
              <label className="text-xs font-semibold text-neutral-700">Modification / Kitchen Note:</label>
              <input
                type="text"
                placeholder="e.g. No onions, extra tomato sauce..."
                value={editingItemNotes}
                onChange={(e) => setEditingItemNotes(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-hidden focus:border-[#43A047]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700">Extra Ingredient Charge (TZS):</label>
              <input
                type="number"
                min={0}
                step={500}
                value={editingItemExtraCharge}
                onChange={(e) => setEditingItemExtraCharge(Number(e.target.value))}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-bold outline-hidden focus:border-[#43A047]"
              />
            </div>

            {/* Quick Note Presets */}
            <div className="flex flex-wrap gap-1">
              {['No onions', 'Extra spices', 'No cheese', 'Extra sauce', 'Cut in half'].map((note) => (
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
                  cart[editingItemIndex].customInstructions = editingItemNotes.trim();
                  cart[editingItemIndex].extraCharge = Math.max(0, Math.round(editingItemExtraCharge));
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

      {/* ================= CUSTOM OFF-MENU ITEM MODAL ================= */}
      {isCustomItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-neutral-200 space-y-3.5">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-neutral-900">Special Off-Menu Item</h3>
              </div>
              <button
                onClick={() => setIsCustomItemModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Description / Dish Name</label>
                <input
                  type="text"
                  value={posCustomName}
                  onChange={(e) => setPosCustomName(e.target.value)}
                  placeholder="e.g. Custom Half Chicken & Chips Combo"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Qty</label>
                  <input
                    type="number"
                    min={1}
                    value={posCustomQty}
                    onChange={(e) => setPosCustomQty(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Unit (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={posCustomPrice}
                    onChange={(e) => setPosCustomPrice(Number(e.target.value))}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Station</label>
                  <select
                    value={posCustomStation}
                    onChange={(e) => setPosCustomStation(e.target.value as KitchenStation)}
                    className="w-full p-2 bg-neutral-50 border border-neutral-200 rounded-lg font-semibold"
                  >
                    <option value="grill">Grill</option>
                    <option value="hot_kitchen">Main / Hot Kitchen</option>
                    <option value="drinks">Drinks / Bar</option>
                    <option value="cold_prep">Cold Prep</option>
                    <option value="dessert">Dessert</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Preparation Instructions</label>
                <input
                  type="text"
                  value={posCustomNote}
                  onChange={(e) => setPosCustomNote(e.target.value)}
                  placeholder="Only for this transaction..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!posCustomName.trim()) return;
                addToCart(
                  {
                    id: `custom-${Date.now()}`,
                    name: posCustomName.trim(),
                    category: 'Special',
                    description: posCustomNote.trim() || 'Special off-menu customer request',
                    price: Math.max(0, Math.round(posCustomPrice)),
                    image: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
                    preparationTimeMinutes: 15,
                    isAvailable: true,
                    station: posCustomStation,
                  },
                  undefined,
                  [],
                  posCustomNote.trim() || 'Off-menu custom order',
                  Math.max(1, Math.round(posCustomQty))
                );
                setPosCustomName('');
                setPosCustomNote('');
                setIsCustomItemModalOpen(false);
                showToast('Added custom off-menu item to ticket');
              }}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Add to Active Ticket
            </button>
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

      {/* ================= TENDER / CHARGE PAYMENT MODAL (SINGLE OR SPLIT) ================= */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-neutral-200 space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
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
                <div className="text-2xl font-extrabold font-mono text-emerald-400 tabular-nums">
                  {formatMoney(totalPayableTzs)}
                </div>
              </div>
              <div className="text-right text-xs text-neutral-400">
                <div>Items: {cart.reduce((sum, ci) => sum + ci.quantity, 0)}</div>
                {taxEnabled && (
                  <div className="text-emerald-400 font-mono">
                    VAT ({taxRatePct}%): {formatMoney(calculatedTaxTzs)}
                  </div>
                )}
              </div>
            </div>

            {/* Single vs Split Payment Toggle */}
            <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsSplitPayment(false)}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  !isSplitPayment ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                Single Payment
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSplitPayment(true);
                  setSplitAmount1(Math.round(totalPayableTzs / 2));
                }}
                className={`py-2 rounded-lg transition-colors cursor-pointer ${
                  isSplitPayment ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                Split Payment (2 Methods)
              </button>
            </div>

            {!isSplitPayment ? (
              <>
                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-2">Select Tender:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'cash', label: 'Cash', icon: Banknote },
                        { id: 'card', label: 'Credit Card', icon: CreditCard },
                        { id: 'mpesa', label: 'Scan / M-Pesa', icon: QrCode },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      const isSel = selectedPaymentMethod === m.id;

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(m.id)}
                          className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
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

                {selectedPaymentMethod !== 'cash' && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-neutral-700 block">
                      Transaction / Authorization Ref (Optional):
                    </label>
                    <input
                      type="text"
                      value={singleTxRef}
                      onChange={(e) => setSingleTxRef(e.target.value)}
                      placeholder="e.g. QK992014 or Card Auth #"
                      className="w-full p-2.5 text-xs font-mono bg-neutral-50 border border-neutral-200 rounded-xl"
                    />
                  </div>
                )}

                {/* Cash Tender Calculation & Quick Denomination Buttons in TZS */}
                {selectedPaymentMethod === 'cash' && (
                  <div className="space-y-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-700">Cash Received (TZS):</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-neutral-500 text-[11px]">TZS</span>
                        <input
                          type="number"
                          step={500}
                          min={totalPayableTzs}
                          value={tenderCashTzs}
                          onChange={(e) => setTenderCashTzs(Number(e.target.value))}
                          className="w-28 p-1.5 bg-white border border-neutral-300 rounded font-bold text-neutral-900 text-right"
                        />
                      </div>
                    </div>

                    {/* Quick TZS denomination buttons */}
                    <div className="flex gap-1.5 pt-1">
                      {[totalPayableTzs, 50000, 100000, 200000].map((amt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTenderCashTzs(amt)}
                          className={`flex-1 py-1.5 text-[11px] font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                            tenderCashTzs === amt
                              ? 'bg-[#43A047] text-white border-[#43A047]'
                              : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                          }`}
                        >
                          {idx === 0 ? 'Exact' : `${(amt / 1000).toFixed(0)}k`}
                        </button>
                      ))}
                    </div>

                    {/* Change Due Display */}
                    <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-xs">
                      <span className="text-neutral-600 font-semibold">Change to Return:</span>
                      <span className="text-sm font-bold font-mono text-emerald-700">
                        {formatMoney(changeDueTzs)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">1st Method</label>
                    <select
                      value={splitMethod1}
                      onChange={(e) => setSplitMethod1(e.target.value as Exclude<PaymentMethod, 'split'>)}
                      className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-bold"
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="airtel">Airtel Money</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">1st Amount (TZS)</label>
                    <input
                      type="number"
                      min={0}
                      max={totalPayableTzs}
                      step={500}
                      value={splitAmount1}
                      onChange={(e) => setSplitAmount1(Number(e.target.value))}
                      className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-200">
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">2nd Method</label>
                    <select
                      value={splitMethod2}
                      onChange={(e) => setSplitMethod2(e.target.value as Exclude<PaymentMethod, 'split'>)}
                      className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-bold"
                    >
                      <option value="mpesa">M-Pesa</option>
                      <option value="airtel">Airtel Money</option>
                      <option value="card">Card</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-600 block mb-1">Remaining Balance</label>
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg font-mono font-bold text-emerald-900">
                      {formatMoney(Math.max(0, totalPayableTzs - Math.min(totalPayableTzs, Math.max(0, splitAmount1))))}
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={splitRef2}
                  onChange={(e) => setSplitRef2(e.target.value)}
                  placeholder="2nd leg Transaction Ref (e.g. M-Pesa QK...)"
                  className="w-full p-2 bg-white border border-neutral-200 rounded-lg font-mono"
                />
              </div>
            )}

            {/* Settle Button */}
            <div className="pt-2">
              <button
                onClick={handleProcessPayment}
                className="w-full py-3 bg-[#43A047] hover:bg-[#388E3C] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Complete Payment &amp; Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SERVICE COUPON VERIFICATION & LIVE ORDERS MODAL ================= */}
      {isCouponLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Ticket className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm">Cashier Service Coupon &amp; Order Lookup</h3>
                  <p className="text-[11px] text-neutral-400">
                    Verify coupon codes, collect split/partial balances, or request controlled cancellation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCouponLookupOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg"
                aria-label="Close coupon lookup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-neutral-200 bg-neutral-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={couponSearchQuery}
                  onChange={(e) => setCouponSearchQuery(e.target.value)}
                  placeholder="Enter Service Coupon (e.g. SV-4827), KOT #, Order #, or Customer Name..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl font-mono focus:outline-none focus:border-[#43A047]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {orders
                .filter((o) => {
                  const q = couponSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  const coupon = (o.serviceCouponCode || `SV-${o.orderNumber.replace('#', '')}`).toLowerCase();
                  return (
                    coupon.includes(q) ||
                    o.orderNumber.toLowerCase().includes(q) ||
                    (o.kotNumber || '').toLowerCase().includes(q) ||
                    o.customerName.toLowerCase().includes(q) ||
                    (o.tableNumber || '').toLowerCase().includes(q)
                  );
                })
                .map((ord) => {
                  const coupon = ord.serviceCouponCode || `SV-${ord.orderNumber.replace('#', '')}`;
                  const isPaid = ord.paymentStatus === 'paid';
                  const remaining = Math.max(0, ord.total - (ord.paidAmount || 0));
                  const isCancelledOrDraft = ord.status === 'cancelled' || ord.status === 'draft' || ord.status === 'rejected';
                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-neutral-200 bg-white space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-xs bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                              {coupon}
                            </span>
                            <span className="font-mono font-bold text-xs text-neutral-900">
                              {ord.orderNumber}
                            </span>
                            {ord.kotNumber && (
                              <span className="font-mono text-[10px] font-bold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded">
                                {ord.kotNumber}
                              </span>
                            )}
                            <span className="text-[11px] text-neutral-500">
                              {ord.tableNumber || ord.type}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-700 font-medium mt-1">
                            {ord.customerName} · {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                          </div>
                          {ord.items.some((i) => i.customInstructions || i.isCustomItem) && (
                            <div className="text-[11px] text-amber-800 mt-0.5">
                              {ord.items
                                .filter((i) => i.customInstructions || i.isCustomItem)
                                .map((i) => `${i.name}: ${i.customInstructions || 'Off-Menu Custom'}`)
                                .join(' · ')}
                            </div>
                          )}
                          {ord.payments && ord.payments.length > 0 && (
                            <div className="text-[10px] font-mono text-blue-700 mt-1">
                              Paid entries: {ord.payments.map((p) => `${p.method.toUpperCase()} ${formatMoney(p.amount)}`).join(' + ')}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold font-mono text-neutral-900 tabular-nums">
                            {formatMoney(ord.total)}
                          </div>
                          {ord.paymentStatus === 'partial' && (
                            <div className="text-[11px] font-mono font-bold text-blue-700">
                              Bal: {formatMoney(remaining)}
                            </div>
                          )}
                          <div
                            className={`text-[10px] font-bold uppercase ${
                              isPaid ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {ord.paymentStatus} · {ord.status.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>

                      {cancelTargetOrder?.id === ord.id && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
                          <input
                            type="text"
                            value={cancelReasonDraft}
                            onChange={(e) => setCancelReasonDraft(e.target.value)}
                            placeholder="Reason for cancellation approval..."
                            className="w-full p-2 text-xs bg-white border border-rose-200 rounded-lg"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTargetOrder(null);
                                setCancelReasonDraft('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-neutral-600"
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              disabled={!cancelReasonDraft.trim()}
                              onClick={() => {
                                requestApproval({
                                  orderId: ord.id,
                                  actionType: 'cancel_order',
                                  requestedBy: `${activeOperator.name} (Cashier)`,
                                  requestedRole: 'cashier',
                                  details: `Cancel ${ord.orderNumber} (${formatMoney(ord.total)})`,
                                  amountImpact: ord.total,
                                  reason: cancelReasonDraft.trim(),
                                });
                                setCancelTargetOrder(null);
                                setCancelReasonDraft('');
                                showToast(`Cancellation approval sent to Manager for ${ord.orderNumber}`);
                              }}
                              className="px-3 py-1 bg-rose-600 text-white text-[11px] font-bold rounded-lg disabled:opacity-40 cursor-pointer"
                            >
                              Send Cancel Request
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 flex-wrap">
                        <button
                          onClick={() => {
                            setLastProcessedOrder(ord);
                            setIsReceiptOpen(true);
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg cursor-pointer"
                        >
                          View Receipt
                        </button>
                        {!isPaid && !isCancelledOrDraft && remaining > 0 && (
                          <>
                            <button
                              onClick={() => {
                                processPayment(ord.id, 'cash', remaining, { collectedBy: 'Cashier POS' });
                                showToast(`Settled ${formatMoney(remaining)} for ${ord.orderNumber} via Cash`);
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold bg-[#43A047] hover:bg-[#388E3C] text-white rounded-lg cursor-pointer"
                            >
                              Pay Cash ({formatMoney(remaining)})
                            </button>
                            <button
                              onClick={() => {
                                processPayment(ord.id, 'mpesa', remaining, {
                                  collectedBy: 'Cashier POS',
                                  transactionRef: `MP-${Date.now().toString().slice(-5)}`,
                                });
                                showToast(`Settled ${formatMoney(remaining)} for ${ord.orderNumber} via M-Pesa`);
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                            >
                              M-Pesa ({formatMoney(remaining)})
                            </button>
                          </>
                        )}
                        {ord.status !== 'completed' && !isCancelledOrDraft && (
                          <>
                            <button
                              onClick={() => setCancelTargetOrder(ord)}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer inline-flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Req Cancel</span>
                            </button>
                            <button
                              onClick={() => {
                                updateOrderStatus(ord.id, 'completed', 'Cashier POS');
                                showToast(`Order ${ord.orderNumber} (${coupon}) completed`);
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer"
                            >
                              Complete Service
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Portion & Modifier Selector Modal (links to variant/modifier BOM consumption) */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 overflow-hidden shadow-xl">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900">{customizingItem.name}</h3>
                <p className="text-[11px] text-neutral-500">
                  Base price: <span className="font-mono font-semibold">{formatPosNumber(customizingItem.price)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {customizingItem.portions && customizingItem.portions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                    Portion Size (BOM Scaled)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {customizingItem.portions.map((p) => {
                      const active = chosenPortion?.name === p.name;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setChosenPortion(p)}
                          className={`px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                            active
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <div>{p.name}</div>
                          <div className="text-[10px] font-mono text-neutral-500">
                            {p.priceDelta === 0
                              ? 'Standard'
                              : p.priceDelta > 0
                              ? `+${formatPosNumber(p.priceDelta)}`
                              : formatPosNumber(p.priceDelta)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {customizingItem.modifiers && customizingItem.modifiers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                    Kitchen Modifiers &amp; Extras
                  </div>
                  <div className="space-y-1.5">
                    {customizingItem.modifiers.map((mod) => {
                      const selected = chosenModifiers.some((m) => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() =>
                            setChosenModifiers((prev) =>
                              selected ? prev.filter((m) => m.id !== mod.id) : [...prev, mod]
                            )
                          }
                          className={`w-full px-3 py-2 rounded-lg border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            selected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                              : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <span>{mod.name}</span>
                          <span className="font-mono text-[11px]">
                            {mod.price > 0 ? `+${formatPosNumber(mod.price)}` : 'No charge'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Qty</label>
                  <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCustomizingQty((q) => Math.max(1, q - 1))}
                      className="px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-mono text-xs font-bold tabular-nums">
                      {customizingQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomizingQty((q) => q + 1)}
                      className="px-2.5 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Kitchen Note</label>
                  <input
                    type="text"
                    value={customizingNote}
                    onChange={(e) => setCustomizingNote(e.target.value)}
                    placeholder="e.g. Less spicy, serve hot"
                    className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-lg outline-hidden focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between gap-3">
              <div className="text-xs font-mono font-extrabold text-neutral-900 tabular-nums">
                {formatPosNumber(
                  (customizingItem.price +
                    (chosenPortion?.priceDelta || 0) +
                    chosenModifiers.reduce((s, m) => s + m.price, 0)) *
                    customizingQty
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizingItem(null)}
                  className="px-3 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    addToCart(
                      customizingItem,
                      chosenPortion,
                      chosenModifiers,
                      customizingNote.trim(),
                      customizingQty
                    );
                    setCustomizingItem(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#43A047] hover:bg-[#388E3C] text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Add to Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales / Tax Receipt Modal */}
      <ReceiptModal
        order={lastProcessedOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />
    </div>
  );
};
