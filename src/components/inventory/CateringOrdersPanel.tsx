import React, { useState, useMemo } from 'react';
import {
  Calendar,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Lock,
  ChefHat,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ShoppingCart,
  Building2,
  Edit3,
  X,
  Printer,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { CateringOrder } from '../../types/restaurant';
import { formatScaledQuantity } from '../../utils/unitConversion';

interface CateringOrdersPanelProps {
  onFeedback: (type: 'success' | 'error', text: string) => void;
  onSwitchToProductionTab?: () => void;
}

export const CateringOrdersPanel: React.FC<CateringOrdersPanelProps> = ({
  onFeedback,
  onSwitchToProductionTab,
}) => {
  const {
    cateringOrders,
    menuItems,
    productionOrders,
    currentTenant,
    formatMoney,
    calculateScaledRequirements,
    createCateringOrder,
    reserveCateringIngredients,
    generateCateringProductionPlan,
    recordCateringFulfillment,
    amendCateringOrder,
    generateCateringInvoice,
    resolveShortageViaPurchaseRequest,
    resolveShortageViaBranchTransfer,
  } = useRestaurant();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    cateringOrders[0]?.id || ''
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [amendReason, setAmendReason] = useState('Client updated headcount');
  const [amendItemsDraft, setAmendItemsDraft] = useState<
    Array<{ menuItemId: string; quantity: number; portion?: string }>
  >([]);
  const [fulfillmentDraft, setFulfillmentDraft] = useState<Record<string, number>>({});
  const [invoicePreviewOrder, setInvoicePreviewOrder] = useState<CateringOrder | null>(null);

  // New Catering Order Form State
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<CateringOrder['eventType']>('corporate');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+255 713 ');
  const [siteLocation, setSiteLocation] = useState('');
  const [eventDate, setEventDate] = useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [depositPaid, setDepositPaid] = useState<number>(0);
  const [eventNotes, setEventNotes] = useState('');
  const [newOrderItems, setNewOrderItems] = useState<
    Array<{ menuItemId: string; quantity: number }>
  >([
    { menuItemId: menuItems[0]?.id || 'menu-wali-nyama', quantity: 30 },
    { menuItemId: menuItems[1]?.id || 'menu-chicken-biryani', quantity: 20 },
  ]);

  const activeOrder =
    cateringOrders.find((c) => c.id === selectedOrderId) || cateringOrders[0] || null;

  const consolidatedScaled = useMemo(() => {
    if (!activeOrder) return null;
    return calculateScaledRequirements(
      activeOrder.items.map((it) => ({
        recipeId: it.recipeId,
        menuItemId: it.menuItemId,
        portions: it.quantity,
        portionName: it.portion,
      }))
    );
  }, [activeOrder, calculateScaledRequirements]);

  const linkedProductionOrders = useMemo(() => {
    if (!activeOrder) return [];
    return productionOrders.filter((po) => po.cateringOrderId === activeOrder.id);
  }, [activeOrder, productionOrders]);

  const handleOpenCreateModal = () => {
    setEventName('');
    setCustomerName('');
    setCustomerPhone('+255 713 ');
    setSiteLocation('');
    setDepositPaid(0);
    setEventNotes('');
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newOrderItems.filter((it) => it.quantity > 0 && it.menuItemId);
    if (!eventName.trim() || !customerName.trim() || validItems.length === 0) {
      onFeedback('error', 'Enter event name, customer name, and at least one menu item.');
      return;
    }

    const created = createCateringOrder({
      eventName: eventName.trim(),
      eventType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      siteLocation: siteLocation.trim() || 'Dar es Salaam Site',
      eventDate,
      items: validItems,
      depositPaid: Math.max(0, depositPaid),
      notes: eventNotes.trim() || undefined,
    });
    setSelectedOrderId(created.id);
    setIsCreateModalOpen(false);
    onFeedback(
      'success',
      `Created catering order ${created.orderNumber} (${created.items.reduce(
        (s, i) => s + i.quantity,
        0
      )} total portions).`
    );
  };

  const handleStartAmend = () => {
    if (!activeOrder) return;
    setAmendItemsDraft(
      activeOrder.items.map((it) => ({
        menuItemId: it.menuItemId,
        quantity: it.quantity,
        portion: it.portion,
      }))
    );
    setAmendReason('Client updated event quantities');
    setIsAmending(true);
  };

  const handleSaveAmend = () => {
    if (!activeOrder) return;
    amendCateringOrder(activeOrder.id, amendItemsDraft, amendReason);
    setIsAmending(false);
    onFeedback(
      'success',
      `Amended ${activeOrder.orderNumber}: BOM requirements & Food Gross Profit recalculated.`
    );
  };

  const handleReserve = () => {
    if (!activeOrder) return;
    const res = reserveCateringIngredients(activeOrder.id);
    onFeedback(res.success ? 'success' : 'error', res.message);
  };

  const handleGenerateProductionPlan = () => {
    if (!activeOrder) return;
    const created = generateCateringProductionPlan(activeOrder.id);
    if (created.length > 0) {
      onFeedback(
        'success',
        `Issued ${created.length} station-level Kitchen Production Orders for ${activeOrder.orderNumber}.`
      );
    } else {
      onFeedback(
        'error',
        'No recipe-linked items found to schedule kitchen production orders.'
      );
    }
  };

  const handleSaveFulfillment = () => {
    if (!activeOrder) return;
    const merged: Record<string, number> = {};
    activeOrder.items.forEach((it) => {
      merged[it.menuItemId] =
        fulfillmentDraft[it.menuItemId] !== undefined
          ? fulfillmentDraft[it.menuItemId]
          : it.fulfilledQuantity;
    });
    recordCateringFulfillment(activeOrder.id, merged);
    setFulfillmentDraft({});
    onFeedback('success', `Saved fulfillment progress for ${activeOrder.orderNumber}.`);
  };

  const handleGenerateInvoice = () => {
    if (!activeOrder) return;
    const inv = generateCateringInvoice(activeOrder.id);
    setInvoicePreviewOrder({ ...activeOrder, invoiceNumber: activeOrder.invoiceNumber || inv, status: 'invoiced' });
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">
            Customer Site Orders &amp; Catering Production Management
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Consolidate multi-dish event BOMs, reserve stock against regular POS sales, generate station production plans, track partial fulfillment, and issue client invoices.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Catering / Site Order</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left List of Catering Orders */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-4 border border-neutral-200 space-y-2.5 self-start">
          <div className="text-xs font-bold text-neutral-900 px-1">
            Scheduled Events &amp; Site Orders ({cateringOrders.length})
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {cateringOrders.map((co) => {
              const isSelected = activeOrder?.id === co.id;
              const totalPlates = co.items.reduce((s, i) => s + i.quantity, 0);
              const fulfilledPlates = co.items.reduce((s, i) => s + i.fulfilledQuantity, 0);

              return (
                <button
                  key={co.id}
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(co.id);
                    setIsAmending(false);
                    setFulfillmentDraft({});
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/40'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-neutral-500">
                      {co.orderNumber}
                    </span>
                    <span
                      className={`text-[11px] font-semibold capitalize ${
                        co.status === 'completed' || co.status === 'invoiced'
                          ? 'text-emerald-700'
                          : co.status === 'in_production' || co.status === 'ingredients_reserved'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {co.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-neutral-900 mt-1 truncate">
                    {co.eventName}
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                    {co.customerName} · {co.eventDate}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100 text-[11px] font-mono tabular-nums">
                    <span className="text-neutral-600">
                      {fulfilledPlates}/{totalPlates} portions
                    </span>
                    <span className="font-bold text-neutral-900">
                      {formatMoney(co.totalRevenue)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8 space-y-5">
          {activeOrder ? (
            <div className="bg-white rounded-2xl p-6 border border-neutral-200 space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-neutral-500">
                    {activeOrder.orderNumber} · {activeOrder.eventType.toUpperCase()} ·{' '}
                    <span className="capitalize font-semibold text-neutral-800">
                      {activeOrder.status.replace(/_/g, ' ')}
                    </span>
                    {activeOrder.invoiceNumber && ` · Invoice ${activeOrder.invoiceNumber}`}
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900">{activeOrder.eventName}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      {activeOrder.eventDate}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      {activeOrder.siteLocation}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      {activeOrder.customerName} ({activeOrder.customerPhone})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleReserve}
                    disabled={Boolean(activeOrder.reservedIngredients?.length)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeOrder.reservedIngredients?.length
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {activeOrder.reservedIngredients?.length
                        ? 'Ingredients Reserved'
                        : 'Reserve Ingredients'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateProductionPlan}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Issue Kitchen Production Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="px-3 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {activeOrder.invoiceNumber ? 'View Invoice' : 'Generate Invoice'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Financial Rollup (Strictly labeled Food Gross Profit) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">Event Revenue</span>
                  <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                    {formatMoney(activeOrder.totalRevenue)}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    Deposit: {formatMoney(activeOrder.depositPaid)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Estimated Food Cost
                  </span>
                  <div className="text-base font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                    {formatMoney(activeOrder.estimatedFoodCost)}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    Food Cost: {activeOrder.foodCostPercentage}%
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    Food Gross Profit
                  </span>
                  <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {formatMoney(activeOrder.foodGrossProfit)}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Excl. packaging, labour &amp; transport
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">Balance Due</span>
                  <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                    {formatMoney(Math.max(0, activeOrder.totalRevenue - activeOrder.depositPaid))}
                  </div>
                </div>
              </div>

              {/* Event Dishes & Fulfillment / Amendment */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-bold text-neutral-900">
                    Event Dish Schedule &amp; Partial Fulfillment ({activeOrder.items.length} items)
                  </h5>
                  <div className="flex items-center gap-2">
                    {!isAmending ? (
                      <button
                        type="button"
                        onClick={handleStartAmend}
                        className="px-2.5 py-1 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Amend Quantities</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsAmending(false)}
                        className="px-2.5 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg cursor-pointer"
                      >
                        Cancel Amend
                      </button>
                    )}
                    {!isAmending && (
                      <button
                        type="button"
                        onClick={handleSaveFulfillment}
                        className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                      >
                        Save Fulfillment
                      </button>
                    )}
                  </div>
                </div>

                {isAmending ? (
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                    <div className="space-y-2">
                      {amendItemsDraft.map((item, idx) => {
                        const dish = menuItems.find((m) => m.id === item.menuItemId);
                        return (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <select
                              value={item.menuItemId}
                              onChange={(e) =>
                                setAmendItemsDraft((prev) =>
                                  prev.map((x, i) =>
                                    i === idx ? { ...x, menuItemId: e.target.value } : x
                                  )
                                )
                              }
                              className="col-span-7 px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg font-semibold"
                            >
                              {menuItems.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({formatMoney(m.price)})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                setAmendItemsDraft((prev) =>
                                  prev.map((x, i) =>
                                    i === idx
                                      ? { ...x, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }
                                      : x
                                  )
                                )
                              }
                              className="col-span-3 px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-neutral-300 rounded-lg text-right"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setAmendItemsDraft((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="col-span-2 p-1.5 text-neutral-400 hover:text-red-600 justify-self-end cursor-pointer"
                              title={`Remove ${dish?.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setAmendItemsDraft((prev) => [
                            ...prev,
                            { menuItemId: menuItems[0]?.id || '', quantity: 10 },
                          ])
                        }
                        className="px-2.5 py-1 text-xs font-semibold bg-white border border-neutral-300 rounded-lg cursor-pointer"
                      >
                        + Add Dish Line
                      </button>

                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                          type="text"
                          value={amendReason}
                          onChange={(e) => setAmendReason(e.target.value)}
                          placeholder="Reason for amendment..."
                          className="px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg w-56"
                        />
                        <button
                          type="button"
                          onClick={handleSaveAmend}
                          className="px-3.5 py-1.5 text-xs font-bold bg-neutral-900 text-white rounded-lg cursor-pointer"
                        >
                          Apply Amendment
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-2 px-3">Dish / Beverage</th>
                          <th className="py-2 px-3 text-right">Ordered</th>
                          <th className="py-2 px-3 text-right">Fulfilled</th>
                          <th className="py-2 px-3 text-right">Unit Price</th>
                          <th className="py-2 px-3 text-right">Food Cost / Unit</th>
                          <th className="py-2 px-3 text-right">Line Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {activeOrder.items.map((it) => {
                          const curFulfilled =
                            fulfillmentDraft[it.menuItemId] !== undefined
                              ? fulfillmentDraft[it.menuItemId]
                              : it.fulfilledQuantity;
                          return (
                            <tr key={it.menuItemId}>
                              <td className="py-2.5 px-3 font-semibold text-neutral-900">
                                {it.name}
                                {!it.recipeId && (
                                  <span className="text-[11px] font-normal text-neutral-500 ml-1.5">
                                    (Direct Stock)
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                                {it.quantity}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={it.quantity}
                                  value={curFulfilled}
                                  onChange={(e) =>
                                    setFulfillmentDraft((prev) => ({
                                      ...prev,
                                      [it.menuItemId]: Math.min(
                                        it.quantity,
                                        Math.max(0, parseInt(e.target.value, 10) || 0)
                                      ),
                                    }))
                                  }
                                  className="w-16 px-2 py-1 text-xs font-mono font-bold tabular-nums text-right bg-neutral-50 border border-neutral-300 rounded"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700">
                                {formatMoney(it.unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-600">
                                {formatMoney(it.unitCost)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                                {formatMoney(it.unitPrice * it.quantity)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Consolidated Multi-Dish BOM Requirements */}
              {consolidatedScaled && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-neutral-900">
                      Consolidated Ingredient &amp; Sub-Recipe Rollup ({consolidatedScaled.rows.length} shared materials)
                    </h5>
                    <span
                      className={`text-xs font-semibold ${
                        consolidatedScaled.canProduceWithStore
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }`}
                    >
                      {consolidatedScaled.canProduceWithStore
                        ? 'All unreserved stock sufficient'
                        : 'Action needed on shortages'}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                        <tr>
                          <th className="py-2 px-3">Consolidated Ingredient / Sub-Recipe</th>
                          <th className="py-2 px-3 text-right">Total Required</th>
                          <th className="py-2 px-3 text-right">Unreserved Avail</th>
                          <th className="py-2 px-3 text-right">Est. Cost</th>
                          <th className="py-2 px-3 text-right">Status &amp; Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {consolidatedScaled.rows.map((row) => {
                          const fmtReq = formatScaledQuantity(row.requiredQty, row.unit);
                          const fmtAvail = formatScaledQuantity(
                            row.netUnreservedTotalQty,
                            row.unit
                          );
                          return (
                            <tr
                              key={row.key}
                              className={row.globalShortageQty > 0 ? 'bg-red-50/30' : ''}
                            >
                              <td className="py-2 px-3 font-semibold text-neutral-900">
                                {row.ingredientName}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums font-bold">
                                {fmtReq.primary}
                                {fmtReq.secondary && (
                                  <span className="text-neutral-500 font-normal ml-1">
                                    ({fmtReq.secondary})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-700">
                                {fmtAvail.primary}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatMoney(row.estimatedCost)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {row.globalShortageQty <= 0 ? (
                                  <span className="text-emerald-700 font-semibold">Covered</span>
                                ) : (
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <span className="text-red-700 font-bold font-mono">
                                      Short {formatScaledQuantity(row.globalShortageQty, row.unit).primary}
                                    </span>
                                    {!row.isSubRecipe && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const pr = resolveShortageViaPurchaseRequest({
                                              ingredientId: row.ingredientId,
                                              requestedQty: Math.ceil(row.globalShortageQty),
                                              reason: `Catering ${activeOrder.orderNumber}: ${activeOrder.eventName}`,
                                              linkedOrderRef: activeOrder.orderNumber,
                                            });
                                            if (pr) {
                                              onFeedback(
                                                'success',
                                                `Purchase Request ${pr.requestNumber} raised for ${row.ingredientName}.`
                                              );
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-neutral-900 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <ShoppingCart className="w-3 h-3" />
                                          <span>Buy</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const bt = resolveShortageViaBranchTransfer({
                                              ingredientId: row.ingredientId,
                                              quantity: Math.ceil(row.globalShortageQty),
                                              fromBranch: 'Kariakoo Flagship Branch',
                                            });
                                            if (bt) {
                                              onFeedback(
                                                'success',
                                                `Branch Transfer ${bt.transferNumber} dispatched.`
                                              );
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-white border border-neutral-300 text-neutral-800 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          <Building2 className="w-3 h-3" />
                                          <span>Branch</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Linked Kitchen Production Orders & Amendment Trail */}
              {(linkedProductionOrders.length > 0 ||
                (activeOrder.amendments && activeOrder.amendments.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-neutral-200 text-xs">
                  {linkedProductionOrders.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900">
                          Linked Kitchen Production Orders ({linkedProductionOrders.length})
                        </span>
                        {onSwitchToProductionTab && (
                          <button
                            type="button"
                            onClick={onSwitchToProductionTab}
                            className="text-orange-600 hover:underline font-semibold cursor-pointer"
                          >
                            Manage in Production Tab -&gt;
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
                        {linkedProductionOrders.map((po) => (
                          <div
                            key={po.id}
                            className="px-3 py-2 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-mono font-bold text-neutral-900">
                                {po.orderNumber}
                              </span>{' '}
                              · {po.recipeName}
                            </div>
                            <span className="capitalize font-semibold text-blue-700">
                              {po.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeOrder.amendments && activeOrder.amendments.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-neutral-900">
                        Event Amendment Log ({activeOrder.amendments.length})
                      </div>
                      <div className="divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
                        {activeOrder.amendments.map((am) => (
                          <div key={am.id} className="px-3 py-2">
                            <div className="font-semibold text-neutral-800">{am.summary}</div>
                            <div className="text-[11px] text-neutral-500">
                              {am.actor} · {am.timestamp}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 border border-neutral-200 text-center text-xs text-neutral-500">
              Select a catering order or create a new customer site event to manage its consolidated BOM and production plan.
            </div>
          )}
        </div>
      </div>

      {/* Create New Catering Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-900">
                New Customer Site / Catering Order
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-semibold text-neutral-700">Event / Order Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NSSF Annual Staff Luncheon"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) =>
                      setEventType(e.target.value as CateringOrder['eventType'])
                    }
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  >
                    <option value="corporate">Corporate Catering</option>
                    <option value="wedding">Wedding / Banquet</option>
                    <option value="school">School / Institutional</option>
                    <option value="private">Private / Site Event</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Event Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Client / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amina Hassan"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Delivery / Site Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Posta Tower Floor 6, Dar es Salaam"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Deposit Paid (TZS)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositPaid}
                    onChange={(e) => setDepositPaid(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900">Dishes &amp; Quantities</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewOrderItems((prev) => [
                        ...prev,
                        { menuItemId: menuItems[0]?.id || '', quantity: 10 },
                      ])
                    }
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-lg cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {newOrderItems.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={row.menuItemId}
                      onChange={(e) =>
                        setNewOrderItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, menuItemId: e.target.value } : it
                          )
                        )
                      }
                      className="col-span-8 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-semibold"
                    >
                      {menuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({formatMoney(m.price)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        setNewOrderItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? { ...it, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) }
                              : it
                          )
                        )
                      }
                      className="col-span-3 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold text-right"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setNewOrderItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="col-span-1 p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Special Instructions / Notes</label>
                <textarea
                  rows={2}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Chafing dishes, serving windows, dietary notes..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl cursor-pointer"
              >
                Save Catering Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Client Invoice Modal (no window.open) */}
      {invoicePreviewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-neutral-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-neutral-900">
                CLIENT INVOICE · {invoicePreviewOrder.invoiceNumber || 'DRAFT'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInvoicePreviewOrder(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-base font-extrabold text-neutral-900">
                    {currentTenant.name}
                  </div>
                  <div className="text-neutral-500 mt-0.5">
                    {currentTenant.address} · {currentTenant.phone}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-neutral-900">
                    {invoicePreviewOrder.invoiceNumber}
                  </div>
                  <div className="text-neutral-500">Order {invoicePreviewOrder.orderNumber}</div>
                  <div className="text-neutral-500">Event {invoicePreviewOrder.eventDate}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-neutral-500 font-semibold">Billed To</div>
                  <div className="font-bold text-neutral-900 mt-0.5">
                    {invoicePreviewOrder.customerName}
                  </div>
                  <div className="text-neutral-600">{invoicePreviewOrder.customerPhone}</div>
                </div>
                <div>
                  <div className="text-neutral-500 font-semibold">Event &amp; Site</div>
                  <div className="font-bold text-neutral-900 mt-0.5">
                    {invoicePreviewOrder.eventName}
                  </div>
                  <div className="text-neutral-600">{invoicePreviewOrder.siteLocation}</div>
                </div>
              </div>

              <table className="w-full text-left border-t border-b border-neutral-200">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold">
                  <tr>
                    <th className="py-2 px-2">Item Description</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Unit Price</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {invoicePreviewOrder.items.map((it) => (
                    <tr key={it.menuItemId}>
                      <td className="py-2 px-2 font-semibold text-neutral-900">{it.name}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{it.quantity}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">
                        {formatMoney(it.unitPrice)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums font-bold">
                        {formatMoney(it.unitPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col items-end space-y-1 font-mono tabular-nums">
                <div className="flex justify-between w-56 text-neutral-600">
                  <span>Subtotal:</span>
                  <span>{formatMoney(invoicePreviewOrder.totalRevenue)}</span>
                </div>
                <div className="flex justify-between w-56 text-emerald-700">
                  <span>Deposit Paid:</span>
                  <span>-{formatMoney(invoicePreviewOrder.depositPaid)}</span>
                </div>
                <div className="flex justify-between w-56 text-sm font-extrabold text-neutral-900 pt-1 border-t border-neutral-200">
                  <span>Balance Due:</span>
                  <span>
                    {formatMoney(
                      Math.max(0, invoicePreviewOrder.totalRevenue - invoicePreviewOrder.depositPaid)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
