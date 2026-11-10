import React, { useState } from 'react';
import {
  Search,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Receipt,
  Trash2,
  Users,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Tag,
  Percent,
  ToggleLeft,
  ToggleRight,
  X,
  Truck,
  Package,
  Utensils,
  Flame,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { MenuItem, Order, PaymentMethod, OrderType } from '../../types/restaurant';
import { ReceiptModal } from '../common/ReceiptModal';

export const PosView: React.FC = () => {
  const {
    currentTenant,
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
    formatMoney,
    cashierShift,
    preparedDishStocks,
    recipes,
  } = useRestaurant();

  const [selectedCategory, setSelectedCategory] = useState<string>('All Menu');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [orderTypeTab, setOrderTypeTab] = useState<'all' | 'dine_in' | 'wait_list' | 'take_away' | 'served'>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastProcessedOrder, setLastProcessedOrder] = useState<Order | null>(null);
  const [guestCount, setGuestCount] = useState<number>(2);
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('Table 03');
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);

  // Cart service mode: Dine-in, Takeaway/Pickup, or Delivery
  const [cartServiceType, setCartServiceType] = useState<OrderType>('dine_in');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  const [deliveryAddressInput, setDeliveryAddressInput] = useState<string>('');
  const [deliveryFeeAmount, setDeliveryFeeAmount] = useState<number>(currentTenant.deliveryFee || 5000);

  // Cart discount and tax controls
  const [applyTax, setApplyTax] = useState<boolean>(true);
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('Staff / VIP Courtesy');

  // Dynamic categories with counts
  const categories = [
    { name: 'All Menu', count: menuItems.length },
    { name: 'Special', count: menuItems.filter((i) => i.category === 'Special').length },
    { name: 'Chips', count: menuItems.filter((i) => i.category === 'Chips').length },
    { name: 'Soups', count: menuItems.filter((i) => i.category === 'Soups').length },
    { name: 'Chickens', count: menuItems.filter((i) => i.category === 'Chickens').length },
    { name: 'Desserts', count: menuItems.filter((i) => i.category === 'Desserts').length },
    { name: 'Drinks', count: menuItems.filter((i) => i.category === 'Drinks').length },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All Menu' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description ? item.description.toLowerCase().includes(searchQuery.toLowerCase()) : false);
    return matchesCat && matchesSearch;
  });

  // Calculate cart metrics with dynamic discount & tax toggles (NO donation)
  const cartSubtotal = cart.reduce((acc, ci) => {
    const unitPrice = ci.menuItem.price + (ci.selectedPortion?.priceDelta || 0);
    const modPrice = ci.selectedModifiers.reduce((mAcc, m) => mAcc + m.price, 0);
    return acc + (unitPrice + modPrice) * ci.quantity;
  }, 0);

  // Discount calculation
  const calculatedDiscount = Math.min(
    cartSubtotal,
    discountType === 'percent'
      ? Math.round(cartSubtotal * (Math.max(0, Math.min(100, discountValue)) / 100))
      : Math.max(0, discountValue)
  );

  const discountedCartSubtotal = Math.max(0, cartSubtotal - calculatedDiscount);

  // Tax calculation (optional toggle: 18% VAT or 0% when tax removed)
  const cartTax = applyTax ? Math.round(discountedCartSubtotal * currentTenant.taxRate) : 0;
  
  // Delivery Fee calculation (applicable only when Delivery service type is active)
  const cartDeliveryFee = cartServiceType === 'delivery' ? Math.max(0, deliveryFeeAmount) : 0;
  
  // Total calculation (Donation has been removed as requested)
  const cartTotal = discountedCartSubtotal + cartTax + cartDeliveryFee;

  // Active orders carousel list
  const activeOrders = orders.slice(0, 6);

  const handleProcessCartPayment = () => {
    if (cart.length === 0) return;

    let defaultCustName = `Walk-in Guest (${guestCount} People)`;
    if (customerNameInput.trim()) {
      defaultCustName = customerNameInput.trim();
    } else if (cartServiceType === 'pickup') {
      defaultCustName = 'Takeaway Customer';
    } else if (cartServiceType === 'delivery') {
      defaultCustName = 'Delivery Recipient';
    }

    const newOrder = submitOrder({
      type: cartServiceType,
      tableNumber: cartServiceType === 'dine_in' ? selectedTableNumber : undefined,
      customerName: defaultCustName,
      customerPhone: customerPhoneInput.trim() || undefined,
      deliveryAddress: cartServiceType === 'delivery' ? deliveryAddressInput.trim() || 'Customer Delivery Address' : undefined,
      paymentMethod: selectedPaymentMethod,
      markAsPaid: true,
      notes: `POS Cashier billing · ${cartServiceType.toUpperCase()} · ${selectedPaymentMethod.toUpperCase()}${calculatedDiscount > 0 ? ` · Disc: ${formatMoney(calculatedDiscount)}` : ''}`,
      discount: calculatedDiscount,
      discountType: calculatedDiscount > 0 ? discountType : undefined,
      discountValue: calculatedDiscount > 0 ? discountValue : undefined,
      discountReason: calculatedDiscount > 0 ? discountReason : undefined,
      tax: cartTax,
      isTaxExempt: !applyTax,
      deliveryFee: cartDeliveryFee,
      donation: 0,
    });

    setLastProcessedOrder(newOrder);
    setIsReceiptOpen(true);
    // Reset inputs for subsequent orders
    setDiscountValue(0);
    setShowDiscountInput(false);
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setDeliveryAddressInput('');
  };

  const handleSettleExistingOrder = (order: Order) => {
    processPayment(order.id, selectedPaymentMethod, order.total - (order.paidAmount || 0));
    setLastProcessedOrder({ ...order, paymentStatus: 'paid', paidAmount: order.total });
    setIsReceiptOpen(true);
    setSelectedOrderForPayment(null);
  };

  // Find quantity of an item currently in the cart
  const getItemCartQty = (itemId: string) => {
    const found = cart.find((ci) => ci.menuItem.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-neutral-100 flex flex-col lg:flex-row">
      {/* Main POS Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
        {/* Top Order Types Tabs (Matching Screenshot) */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-neutral-200 pb-3">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
            {[
              { id: 'all', label: 'All', count: '78' },
              { id: 'dine_in', label: 'Dine in', count: '04' },
              { id: 'wait_list', label: 'Wait List', count: '03' },
              { id: 'take_away', label: 'Take Away', count: '12' },
              { id: 'served', label: 'Served', count: '59' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOrderTypeTab(tab.id as any)}
                className={`flex items-center gap-1.5 pb-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                  orderTypeTab === tab.id
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[11px] text-neutral-400 font-mono">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shift Register: {formatMoney(cashierShift.expectedCash)}</span>
            </button>
          </div>
        </div>

        {/* Live Orders Carousel Cards (Matching Screenshot) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Active Live Orders & Kitchen Status
              </span>
            </div>
            <span className="text-xs text-neutral-400">Click any ticket to inspect & settle</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {activeOrders.map((ord, idx) => {
              const totalItemsCount = ord.items.reduce((sum, it) => sum + it.quantity, 0);
              const isSelected = selectedOrderForPayment?.id === ord.id;

              // Color badges matching screenshot (green In Kitchen, orange Wait list, purple Ready)
              let statusBadgeBg = 'bg-emerald-100 text-emerald-800';
              let statusLabel = 'In Kitchen';
              if (ord.status === 'ready') {
                statusBadgeBg = 'bg-purple-100 text-purple-800';
                statusLabel = 'Ready';
              } else if (ord.status === 'sent_to_kitchen') {
                statusBadgeBg = 'bg-amber-100 text-amber-800';
                statusLabel = 'Wait List';
              } else if (ord.status === 'served' || ord.status === 'completed') {
                statusBadgeBg = 'bg-blue-100 text-blue-800';
                statusLabel = 'Served';
              }

              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderForPayment(isSelected ? null : ord)}
                  className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer relative shadow-xs hover:border-emerald-300 ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                      : 'border-neutral-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-800 mb-1">
                    <span>Order {ord.orderNumber}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {idx * 3 + 2} mins ago
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-500 mb-3 flex items-center justify-between">
                    <span>{ord.tableNumber || (ord.type === 'delivery' ? 'Delivery' : 'Takeaway')}</span>
                    <span className="font-mono">Item: {totalItemsCount}X</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                    <span className="text-xs font-semibold tabular-nums text-neutral-900">
                      {formatMoney(ord.total)}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusBadgeBg}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Food Menu Header & Category Navigation */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Food Menu</h2>
              <p className="text-xs text-neutral-500">Tap cards or click [+] to add dishes directly to customer ticket</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search dish or recipe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedCategory === cat.name
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <span>{cat.name}</span>
                <span className="text-[10px] opacity-75 font-mono">({cat.count})</span>
              </button>
            ))}
          </div>

          {/* Dishes Grid (Matching Screenshot Dribbble aesthetic) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => {
              const currentQty = getItemCartQty(item.id);
              const cartIndex = cart.findIndex((ci) => ci.menuItem.id === item.id);

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow group"
                >
                  {/* Circular Plate Food Image */}
                  <div className="relative w-full flex items-center justify-center py-2">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 shadow-sm border border-neutral-100 relative">
                      <img
                        src={item.image}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Stylized fallback
                          (e.target as HTMLImageElement).src = '/src/assets/images/dish_chips_mayai_1794223268664.jpg';
                        }}
                      />
                    </div>
                  </div>

                  {/* Title & Batch Prep Stock Badge */}
                  <div className="text-center mt-2">
                    <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-1">
                      {item.name}
                    </h3>
                    {(() => {
                      const recipe = recipes.find((r) => r.menuItemId === item.id);
                      const prepStock = preparedDishStocks.find((p) => p.menuItemId === item.id);
                      const isBatchCook = item.cookingMethod === 'batch_cooking' || recipe?.cookingMethod === 'batch_cooking';

                      if (isBatchCook) {
                        const count = prepStock?.preparedPlatesAvailable ?? 0;
                        return (
                          <div className="mt-1 flex items-center justify-center">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 font-bold ${
                                count > 10
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : count > 0
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              <Flame className="w-2.5 h-2.5 text-orange-500" />
                              <span>{count > 0 ? `${count} plates ready` : '0 ready (Batch cook needed)'}</span>
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div className="mt-1 flex items-center justify-center">
                          <span className="text-[10px] text-neutral-400 font-medium">
                            Made to order
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Price & Quantity Stepper (Emerald Accent) */}
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-100">
                    <div className="text-sm font-bold text-neutral-900 tabular-nums">
                      {formatMoney(item.price)}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentQty > 0 && (
                        <button
                          onClick={() => updateCartItemQty(cartIndex, -1)}
                          className="w-7 h-7 rounded-lg border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <span className="w-5 text-center text-xs font-bold text-neutral-800 font-mono">
                        {currentQty}
                      </span>

                      <button
                        onClick={() => addToCart(item)}
                        className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar: Active Ticket & Payment Processing (Matching Screenshot) */}
      <div className="w-full lg:w-96 bg-white border-l border-neutral-200 flex flex-col justify-between shrink-0">
        <div className="p-5 border-b border-neutral-100 space-y-3">
          {/* Header & Seating info */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Order ID:</div>
              <div className="text-base font-extrabold text-neutral-900 font-mono">
                {selectedOrderForPayment ? selectedOrderForPayment.orderNumber : '#F0030'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span>{guestCount} People</span>
              </div>
            </div>
          </div>

          {/* Service Mode Selector: Dine-in, Pickup / Takeaway, Delivery */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCartServiceType('dine_in')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                cartServiceType === 'dine_in'
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-orange-500" />
              <span>Dine-in</span>
            </button>

            <button
              type="button"
              onClick={() => setCartServiceType('pickup')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                cartServiceType === 'pickup'
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-blue-500" />
              <span>Takeaway</span>
            </button>

            <button
              type="button"
              onClick={() => setCartServiceType('delivery')}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                cartServiceType === 'delivery'
                  ? 'bg-white text-neutral-900 shadow-xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Delivery</span>
            </button>
          </div>

          {/* Conditional Options by Service Mode */}
          {cartServiceType === 'dine_in' ? (
            /* Table Selector with In-Use Guard */
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Assigned Seating:</span>
                <select
                  value={selectedTableNumber}
                  onChange={(e) => setSelectedTableNumber(e.target.value)}
                  className={`font-bold text-xs border rounded-lg px-2 py-1 ${
                    tables.find((t) => t.number === selectedTableNumber)?.status !== 'available'
                      ? 'border-amber-400 bg-amber-50 text-amber-950'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-900'
                  }`}
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.number}>
                      {t.number} — {t.status.toUpperCase()} ({t.capacity} seats)
                    </option>
                  ))}
                </select>
              </div>

              {tables.find((t) => t.number === selectedTableNumber)?.status !== 'available' && (
                <div className="p-2 rounded-lg bg-amber-100/90 border border-amber-300 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                  <span>⚠️ {selectedTableNumber} is In Use.</span>
                  <button
                    type="button"
                    onClick={() => {
                      const firstAvail = tables.find((t) => t.status === 'available');
                      if (firstAvail) setSelectedTableNumber(firstAvail.number);
                    }}
                    className="underline font-bold text-amber-950 shrink-0"
                  >
                    Auto-Select Open Table
                  </button>
                </div>
              )}
            </div>
          ) : cartServiceType === 'pickup' ? (
            /* Pickup Customer Details */
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 font-semibold">Customer Name:</label>
                  <input
                    type="text"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full p-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 font-semibold">Phone / WhatsApp:</label>
                  <input
                    type="tel"
                    value={customerPhoneInput}
                    onChange={(e) => setCustomerPhoneInput(e.target.value)}
                    placeholder="+255 7..."
                    className="w-full p-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Delivery Details with Editable Delivery Fee */
            <div className="space-y-2 pt-1 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-emerald-900 font-semibold">Recipient Name:</label>
                  <input
                    type="text"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    placeholder="e.g. Amina Salum"
                    className="w-full p-1.5 text-xs bg-white border border-neutral-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-emerald-900 font-semibold">Delivery Cost (TZS):</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={deliveryFeeAmount}
                    onChange={(e) => setDeliveryFeeAmount(Number(e.target.value))}
                    className="w-full p-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-mono font-bold text-emerald-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-emerald-900 font-semibold">Delivery Address / Landmark:</label>
                <input
                  type="text"
                  value={deliveryAddressInput}
                  onChange={(e) => setDeliveryAddressInput(e.target.value)}
                  placeholder="e.g. Mikocheni B, Mwai Kibaki Rd, House 14B"
                  className="w-full p-1.5 text-xs bg-white border border-neutral-200 rounded-lg"
                />
              </div>
            </div>
          )}
        </div>

        {/* Ordered Items List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 max-h-[40vh] lg:max-h-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Ordered Items
            </span>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-red-600 hover:text-red-700 font-semibold"
              >
                Clear All
              </button>
            )}
          </div>

          {/* If inspecting an existing order */}
          {selectedOrderForPayment ? (
            <div className="space-y-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex justify-between items-center">
                <span>Inspecting Order: {selectedOrderForPayment.orderNumber}</span>
                <button
                  onClick={() => setSelectedOrderForPayment(null)}
                  className="text-amber-700 underline font-semibold text-[11px]"
                >
                  Return to Cart
                </button>
              </div>

              {selectedOrderForPayment.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-neutral-800">
                      {item.quantity}x {item.name}
                    </span>
                    <div className="text-[10px] text-neutral-400">Station: {item.station}</div>
                  </div>
                  <span className="font-bold font-mono text-neutral-900">
                    {formatMoney(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-300 stroke-1" />
              <p className="text-xs">No items in active ticket yet.</p>
              <p className="text-[11px] text-neutral-400">Tap [+] on any menu item above to build this ticket.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((ci, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100"
                >
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-neutral-900 leading-snug">
                      {ci.quantity}x {ci.menuItem.name}
                    </div>
                    {ci.selectedModifiers.map((m) => (
                      <div key={m.id} className="text-[10px] text-neutral-400 pl-4">
                        + {m.name} ({formatMoney(m.price)})
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-neutral-900">
                      {formatMoney(ci.menuItem.price * ci.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="p-1 text-neutral-400 hover:text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Totals & Payment Method Section (Matching Screenshot) */}
        <div className="p-5 bg-neutral-50/70 border-t border-neutral-200 space-y-4">
          {/* Subtotal, Discount, Tax, Donation, Total */}
          <div className="space-y-2 text-xs text-neutral-600">
            {/* Gross Subtotal */}
            <div className="flex justify-between items-center">
              <span>Gross Subtotal:</span>
              <span className="font-mono tabular-nums font-semibold text-neutral-900">
                {formatMoney(selectedOrderForPayment ? selectedOrderForPayment.subtotal : cartSubtotal)}
              </span>
            </div>

            {/* Discount Manager / Toggler (Active cart mode) */}
            {!selectedOrderForPayment ? (
              <div className="bg-white p-2.5 rounded-xl border border-neutral-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-neutral-700 font-semibold">
                    <Tag className="w-3.5 h-3.5 text-orange-500" />
                    <span>Bill Discount:</span>
                  </div>

                  {calculatedDiscount > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-mono font-bold">
                        -{formatMoney(calculatedDiscount)}
                      </span>
                      <button
                        onClick={() => {
                          setDiscountValue(0);
                          setShowDiscountInput(false);
                        }}
                        className="text-[10px] text-red-600 hover:text-red-800 font-bold px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100"
                        title="Remove discount"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDiscountInput(!showDiscountInput)}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 hover:underline"
                    >
                      {showDiscountInput ? 'Cancel' : '+ Add Discount'}
                    </button>
                  )}
                </div>

                {showDiscountInput && (
                  <div className="pt-2 border-t border-neutral-100 space-y-2 animate-in fade-in duration-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDiscountType('percent')}
                        className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg border text-center transition-colors ${
                          discountType === 'percent'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('fixed')}
                        className={`flex-1 py-1 px-2 text-[11px] font-bold rounded-lg border text-center transition-colors ${
                          discountType === 'fixed'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200'
                        }`}
                      >
                        Fixed Amount (Cash)
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-neutral-400 font-medium">
                          {discountType === 'percent' ? 'Discount %:' : 'Discount Amount:'}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={discountType === 'percent' ? 100 : cartSubtotal}
                          value={discountValue || ''}
                          onChange={(e) => setDiscountValue(Number(e.target.value))}
                          placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5000'}
                          className="w-full p-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-neutral-400 font-medium">Reason / Note:</label>
                        <select
                          value={discountReason}
                          onChange={(e) => setDiscountReason(e.target.value)}
                          className="w-full p-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-700"
                        >
                          <option value="Staff / Courtesy">Staff / Courtesy</option>
                          <option value="VIP Regular">VIP Regular</option>
                          <option value="Promotional Campaign">Promotional Campaign</option>
                          <option value="Manager Discretion">Manager Discretion</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    {discountType === 'percent' && (
                      <div className="flex gap-1 pt-1">
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setDiscountValue(pct)}
                            className="flex-1 py-0.5 text-[10px] font-mono font-bold bg-neutral-100 hover:bg-orange-100 text-neutral-700 hover:text-orange-900 rounded"
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : selectedOrderForPayment.discount > 0 ? (
              <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 p-2 rounded-lg font-semibold">
                <span>
                  Discount Applied {selectedOrderForPayment.discountType === 'percent' ? `(${selectedOrderForPayment.discountValue}%)` : ''}:
                </span>
                <span className="font-mono tabular-nums">-{formatMoney(selectedOrderForPayment.discount)}</span>
              </div>
            ) : null}

            {/* Net Amount if discount is present */}
            {(calculatedDiscount > 0 || (selectedOrderForPayment && selectedOrderForPayment.discount > 0)) && (
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>Net Subtotal:</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(
                    selectedOrderForPayment
                      ? Math.max(0, selectedOrderForPayment.subtotal - selectedOrderForPayment.discount)
                      : discountedCartSubtotal
                  )}
                </span>
              </div>
            )}

            {/* Tax Setting / Removal Option */}
            <div className="flex items-center justify-between py-1 border-t border-neutral-100">
              <div className="flex items-center gap-1.5">
                <span>VAT (18%):</span>
                {!selectedOrderForPayment && (
                  <button
                    type="button"
                    onClick={() => setApplyTax(!applyTax)}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                      applyTax
                        ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                    title={applyTax ? 'Click to remove tax (Tax Exempt)' : 'Click to apply 18% standard VAT'}
                  >
                    {applyTax ? 'Remove Tax' : '✓ Tax Exempt (0%)'}
                  </button>
                )}
              </div>
              <span className={`font-mono tabular-nums ${!applyTax && !selectedOrderForPayment ? 'line-through text-neutral-400' : ''}`}>
                {formatMoney(
                  selectedOrderForPayment
                    ? selectedOrderForPayment.tax
                    : cartTax
                )}
              </span>
            </div>

            {/* Delivery Charge row (shown if delivery order or existing order with delivery fee) */}
            {((!selectedOrderForPayment && cartServiceType === 'delivery') ||
              (selectedOrderForPayment && selectedOrderForPayment.deliveryFee > 0)) && (
              <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/70 p-1.5 rounded-lg font-semibold">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Delivery Cost:</span>
                </span>
                <span className="font-mono tabular-nums">
                  +{formatMoney(
                    selectedOrderForPayment
                      ? selectedOrderForPayment.deliveryFee
                      : cartDeliveryFee
                  )}
                </span>
              </div>
            )}

            {/* Total Payable */}
            <div className="flex justify-between text-sm font-extrabold text-neutral-900 pt-2 border-t border-neutral-200">
              <span>Total Payable:</span>
              <span className="text-emerald-700 font-mono tabular-nums text-base">
                {formatMoney(selectedOrderForPayment ? selectedOrderForPayment.total : cartTotal)}
              </span>
            </div>
          </div>

          {/* Payment Method Selector (Cash, Card, Scan / M-Pesa) */}
          <div>
            <div className="text-[11px] font-semibold text-neutral-500 mb-2">Payment Method</div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedPaymentMethod === 'cash'
                    ? 'border-emerald-600 bg-white text-emerald-800 shadow-xs'
                    : 'border-neutral-200 bg-white/70 text-neutral-600 hover:bg-white'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Cash</span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod('card')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedPaymentMethod === 'card'
                    ? 'border-emerald-600 bg-white text-emerald-800 shadow-xs'
                    : 'border-neutral-200 bg-white/70 text-neutral-600 hover:bg-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Card</span>
              </button>

              <button
                onClick={() => setSelectedPaymentMethod('mpesa')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  selectedPaymentMethod === 'mpesa'
                    ? 'border-emerald-600 bg-white text-emerald-800 shadow-xs'
                    : 'border-neutral-200 bg-white/70 text-neutral-600 hover:bg-white'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Scan / M-Pesa</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button (Process Payment in Vibrant Emerald) */}
          {selectedOrderForPayment ? (
            <button
              onClick={() => handleSettleExistingOrder(selectedOrderForPayment)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Settle Payment ({formatMoney(selectedOrderForPayment.total)})</span>
            </button>
          ) : (
            <button
              disabled={cart.length === 0}
              onClick={handleProcessCartPayment}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white transition-colors shadow-md flex items-center justify-center gap-2 ${
                cart.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                  : 'bg-neutral-300 cursor-not-allowed opacity-75'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Process Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Cashier Shift Drawer / Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-neutral-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-neutral-900">Cashier Shift & Reconciliation</h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Shift Started:</span>
                <span className="font-semibold">{cashierShift.openedAt}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Opening Float:</span>
                <span className="font-mono font-semibold">{formatMoney(cashierShift.openingCash)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Cash Sales:</span>
                <span className="font-mono font-semibold text-emerald-700">+{formatMoney(cashierShift.cashSales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Mobile Money (M-Pesa):</span>
                <span className="font-mono font-semibold text-blue-700">+{formatMoney(cashierShift.mpesaSales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-100">
                <span className="text-neutral-500">Card Terminal Sales:</span>
                <span className="font-mono font-semibold">+{formatMoney(cashierShift.cardSales)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-neutral-900 border-t border-neutral-200">
                <span>Expected Drawer Cash:</span>
                <span className="font-mono text-emerald-700">{formatMoney(cashierShift.expectedCash)}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="w-full py-2.5 px-4 bg-neutral-900 text-white font-semibold text-xs rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Verify & Keep Shift Open
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
