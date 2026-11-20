import React, { useState, useMemo } from 'react';
import {
  Flame,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  ShoppingCart,
  Building2,
  ArrowDownCircle,
  Play,
  ClipboardCheck,
  PackageCheck,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe, ProductionOrder } from '../../types/restaurant';
import { formatScaledQuantity } from '../../utils/unitConversion';

interface ProductionOrdersPanelProps {
  onOpenBatchModal: (recipe: Recipe) => void;
  onFeedback: (type: 'success' | 'error', text: string) => void;
}

export const ProductionOrdersPanel: React.FC<ProductionOrdersPanelProps> = ({
  onOpenBatchModal,
  onFeedback,
}) => {
  const {
    recipes,
    ingredients,
    formatMoney,
    calculateScaledRequirements,
    createProductionOrder,
    advanceProductionOrderStage,
    cancelProductionOrder,
    productionOrders,
    purchaseRequests,
    updatePurchaseRequestStatus,
    branchTransfers,
    receiveBranchTransfer,
    resolveShortageViaPurchaseRequest,
    resolveShortageViaBranchTransfer,
    createRequisitionForMissing,
    preparedDishStocks,
    productionLogs,
    reverseProductionBatch,
    blockedCookingAttempts,
  } = useRestaurant();

  const producibleRecipes = useMemo(
    () => recipes.filter((r) => r.status !== 'archived' && r.status !== 'suspended'),
    [recipes]
  );

  const [calcRecipeId, setCalcRecipeId] = useState<string>(
    producibleRecipes[0]?.id || 'rec-wali-nyama'
  );
  const [targetPortions, setTargetPortions] = useState<number>(96);
  const [substituteOverrides, setSubstituteOverrides] = useState<Record<string, string>>({});
  const [assignedTo, setAssignedTo] = useState<string>('Chef Hamisi Juma');

  // Stage completion inline editor state
  const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
  const [actualOutputInput, setActualOutputInput] = useState<number>(0);
  const [wastageInput, setWastageInput] = useState<number>(0);
  const [wastageReasonInput, setWastageReasonInput] = useState<string>('');
  const [exceptionOrderId, setExceptionOrderId] = useState<string | null>(null);
  const [exceptionReasonInput, setExceptionReasonInput] = useState<string>('');

  // Batch reversal state
  const [reversingLogId, setReversingLogId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');

  const selectedCalcRecipe =
    recipes.find((r) => r.id === calcRecipeId) || producibleRecipes[0];

  const calcResult = useMemo(() => {
    if (!selectedCalcRecipe) return null;
    return calculateScaledRequirements([
      {
        recipeId: selectedCalcRecipe.id,
        portions: targetPortions,
        substituteOverrides,
      },
    ]);
  }, [selectedCalcRecipe, targetPortions, substituteOverrides, calculateScaledRequirements]);

  const yieldUnitLabel =
    selectedCalcRecipe?.yieldUnit || (selectedCalcRecipe?.isSubRecipe ? 'grams' : 'plates');

  const handleScheduleOrder = () => {
    if (!selectedCalcRecipe) return;
    const po = createProductionOrder({
      recipeId: selectedCalcRecipe.id,
      targetPortions,
      sourceType: 'manager_plan',
      productionModel: selectedCalcRecipe.productionModel || 'batch_production',
      assignedTo,
      substituteOverrides,
    });
    if (po) {
      onFeedback(
        'success',
        `Scheduled Production Order ${po.orderNumber} for ${po.targetPortions} ${po.yieldUnit} of ${po.recipeName}.`
      );
    }
  };

  const handleStageAdvance = (po: ProductionOrder, nextStage: ProductionOrder['status']) => {
    if (nextStage === 'completed') {
      setCompletingOrderId(po.id);
      setActualOutputInput(po.targetPortions);
      setWastageInput(0);
      setWastageReasonInput('');
      return;
    }

    const res = advanceProductionOrderStage(po.id, nextStage);
    if (res.success) {
      onFeedback('success', `${po.orderNumber} moved to ${nextStage.replace(/_/g, ' ')}.`);
    } else {
      onFeedback('error', res.error || 'Could not advance production order.');
      setExceptionOrderId(po.id);
      setExceptionReasonInput('');
    }
  };

  const handleCompleteSubmit = (po: ProductionOrder) => {
    const res = advanceProductionOrderStage(po.id, 'completed', {
      actualPortions: actualOutputInput || po.targetPortions,
      wastagePortions: wastageInput,
      wastageReason: wastageReasonInput || undefined,
      exceptionReason: exceptionOrderId === po.id ? exceptionReasonInput : undefined,
    });
    if (res.success) {
      setCompletingOrderId(null);
      setExceptionOrderId(null);
      onFeedback(
        'success',
        `Completed ${po.orderNumber}: recorded ${actualOutputInput || po.targetPortions} ${po.yieldUnit}.`
      );
    } else {
      onFeedback('error', res.error || 'Could not complete production order.');
      setExceptionOrderId(po.id);
    }
  };

  const handleTransferMissingFromStore = () => {
    if (!calcResult) return;
    const missing = calcResult.rows
      .filter((r) => !r.isSubRecipe && r.kitchenShortageQty > 0 && r.availableStoreQty > 0)
      .map((r) => ({
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        requiredQty: r.requiredQty,
        availableKitchenQty: r.availableKitchenQty,
        shortageQty: r.kitchenShortageQty,
        storeAvailableQty: r.availableStoreQty,
        unit: r.unit,
        status: r.availableKitchenQty <= 0 ? ('not_transferred' as const) : ('insufficient' as const),
      }));
    if (missing.length === 0) {
      onFeedback('error', 'No Store stock available to transfer for the missing ingredients.');
      return;
    }
    const ok = createRequisitionForMissing(
      missing,
      `Production Scaling Requisition (${targetPortions} ${yieldUnitLabel})`
    );
    if (ok) {
      onFeedback('success', 'Missing ingredients transferred from Main Store to Kitchen Floor.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Interactive Batch Production Scaling Calculator */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-neutral-900">
                Interactive Production Scaling &amp; Stock Feasibility Calculator
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Scale any recipe or sub-recipe to 1, 10, 50, 96, or 100+ portions, inspect stock &amp; reservations, and resolve shortages before issuing to kitchen.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {selectedCalcRecipe && (
              <>
                <button
                  type="button"
                  onClick={handleScheduleOrder}
                  className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer"
                >
                  + Schedule Production Order
                </button>
                <button
                  type="button"
                  onClick={() => onOpenBatchModal(selectedCalcRecipe)}
                  className="px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Cook Batch Now</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Target Recipe / Sub-Recipe
              </label>
              <select
                value={calcRecipeId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setCalcRecipeId(nextId);
                  setSubstituteOverrides({});
                  const rec = recipes.find((r) => r.id === nextId);
                  if (rec?.isSubRecipe) {
                    setTargetPortions(rec.batchYieldPlates || 40);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg font-semibold text-neutral-900"
              >
                {producibleRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code || r.id} · {r.name} {r.isSubRecipe ? '(Sub-Recipe)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-700">
                  Production Volume ({yieldUnitLabel})
                </label>
                <div className="flex items-center gap-1">
                  {[1, 10, 50, 96, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetPortions(preset)}
                      className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded cursor-pointer ${
                        targetPortions === preset
                          ? 'bg-orange-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={Math.max(200, (selectedCalcRecipe?.batchYieldPlates || 100) * 2)}
                  value={targetPortions}
                  onChange={(e) => setTargetPortions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="flex-1 accent-orange-600 cursor-pointer"
                />
                <input
                  type="number"
                  min={1}
                  value={targetPortions}
                  onChange={(e) => setTargetPortions(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-20 px-2 py-1.5 text-xs font-mono font-bold tabular-nums bg-white border border-neutral-300 rounded-lg text-right"
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Assigned Station Chef</label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-lg"
              />
            </div>
          </div>

          {/* Summary Telemetry Strip (Zero Pills) */}
          {calcResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-1 py-2 border-b border-neutral-100 text-xs">
              <div>
                <span className="text-neutral-500">Scaled Requirement</span>
                <div className="font-bold font-mono tabular-nums text-sm text-neutral-900 mt-0.5">
                  {targetPortions.toLocaleString()} {yieldUnitLabel}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Estimated Food Cost</span>
                <div className="font-bold font-mono tabular-nums text-sm text-neutral-900 mt-0.5">
                  {formatMoney(calcResult.totalEstimatedCost)}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Max Producible Now</span>
                <div
                  className={`font-bold font-mono tabular-nums text-sm mt-0.5 ${
                    calcResult.maxProduciblePortions >= targetPortions
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {calcResult.maxProduciblePortions.toLocaleString()} {yieldUnitLabel}
                </div>
              </div>
              <div>
                <span className="text-neutral-500">Feasibility Status</span>
                <div className="font-bold text-sm mt-0.5">
                  {calcResult.canProduceFromKitchen ? (
                    <span className="text-emerald-700">Ready in Kitchen</span>
                  ) : calcResult.canProduceWithStore ? (
                    <span className="text-amber-700">Store Transfer Needed</span>
                  ) : (
                    <span className="text-red-700">Stock Shortage</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scaled Requirements Table */}
          {calcResult && (
            <div className="overflow-x-auto border border-neutral-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Ingredient / Sub-Recipe</th>
                    <th className="py-2.5 px-3 text-right">Required Qty</th>
                    <th className="py-2.5 px-3 text-right">Kitchen / Pool</th>
                    <th className="py-2.5 px-3 text-right">Store Stock</th>
                    <th className="py-2.5 px-3 text-right">Unreserved Total</th>
                    <th className="py-2.5 px-3 text-right">Est. Cost</th>
                    <th className="py-2.5 px-3 text-right">Status &amp; Shortage Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {calcResult.rows.map((row) => {
                    const fmtReq = formatScaledQuantity(row.requiredQty, row.unit);
                    const fmtK = formatScaledQuantity(row.availableKitchenQty, row.unit);
                    const fmtS = formatScaledQuantity(row.availableStoreQty, row.unit);
                    const fmtTot = formatScaledQuantity(row.netUnreservedTotalQty, row.unit);

                    return (
                      <tr key={row.key} className={row.globalShortageQty > 0 ? 'bg-red-50/30' : ''}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-neutral-900">{row.ingredientName}</div>
                          {row.reservedQty > 0 && (
                            <div className="text-[11px] text-amber-700 font-mono">
                              Reserved: {row.reservedQty.toLocaleString()} {row.unit}
                            </div>
                          )}
                          {row.substituteIngredientId && row.status !== 'ok' && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800">
                              <span>
                                Approved Sub: {row.substituteIngredientName} (
                                {(row.substituteAvailableQty || 0).toLocaleString()} {row.unit})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSubstituteOverrides((prev) => ({
                                    ...prev,
                                    [row.ingredientId]: row.substituteIngredientId!,
                                  }));
                                  onFeedback(
                                    'success',
                                    `Substituted ${row.ingredientName} with ${row.substituteIngredientName}.`
                                  );
                                }}
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 rounded font-semibold cursor-pointer"
                              >
                                Apply Sub
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                          <div>{fmtReq.primary}</div>
                          {fmtReq.secondary && (
                            <div className="text-[11px] font-normal text-neutral-500">
                              ({fmtReq.secondary})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700">
                          {fmtK.primary}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-600">
                          {row.isSubRecipe ? '—' : fmtS.primary}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-800">
                          {fmtTot.primary}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-900">
                          {formatMoney(row.estimatedCost)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {row.status === 'ok' ? (
                            <span className="text-emerald-700 font-semibold">Available</span>
                          ) : row.status === 'kitchen_short_store_ok' ? (
                            <span className="text-amber-700 font-semibold">
                              Short in Kitchen ({formatScaledQuantity(row.kitchenShortageQty, row.unit).primary}) · Store OK
                            </span>
                          ) : (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-red-700 font-bold font-mono tabular-nums">
                                Shortage {formatScaledQuantity(row.globalShortageQty, row.unit).primary}
                              </span>
                              {!row.isSubRecipe && (
                                <div className="flex items-center gap-1 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const pr = resolveShortageViaPurchaseRequest({
                                        ingredientId: row.ingredientId,
                                        requestedQty: Math.ceil(row.globalShortageQty),
                                        reason: `Shortage for ${targetPortions} ${yieldUnitLabel} of ${selectedCalcRecipe?.name}`,
                                        linkedOrderRef: selectedCalcRecipe?.code,
                                      });
                                      if (pr) {
                                        onFeedback(
                                          'success',
                                          `Purchase Request ${pr.requestNumber} created for ${row.ingredientName}.`
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
                                          `Branch Transfer ${bt.transferNumber} requested for ${row.ingredientName}.`
                                        );
                                      }
                                    }}
                                    className="px-2 py-0.5 bg-white border border-neutral-300 text-neutral-800 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Building2 className="w-3 h-3" />
                                    <span>Branch</span>
                                  </button>
                                </div>
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
          )}

          {/* Calculator Action Resolution Strip */}
          {calcResult && !calcResult.canProduceFromKitchen && (
            <div className="flex items-center justify-between gap-3 flex-wrap p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Resolve shortages before production: transfer Store stock, scale down to max available, or order replenishment.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {calcResult.rows.some(
                  (r) => !r.isSubRecipe && r.kitchenShortageQty > 0 && r.availableStoreQty > 0
                ) && (
                  <button
                    type="button"
                    onClick={handleTransferMissingFromStore}
                    className="px-3 py-1.5 bg-neutral-900 text-white font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Transfer Store -&gt; Kitchen</span>
                  </button>
                )}
                {calcResult.maxProduciblePortions < targetPortions &&
                  calcResult.maxProduciblePortions > 0 && (
                    <button
                      type="button"
                      onClick={() => setTargetPortions(calcResult.maxProduciblePortions)}
                      className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      <span>
                        Reduce to {calcResult.maxProduciblePortions} {yieldUnitLabel}
                      </span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Production Orders Lifecycle Board */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Kitchen Production Orders ({productionOrders.length})
            </h3>
            <p className="text-xs text-neutral-500">
              Workflow: Planned -&gt; Stock Checked -&gt; Ingredients Issued -&gt; In Production -&gt; Completed (records actual output, wastage &amp; cost variance).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Order # &amp; Source</th>
                <th className="py-2.5 px-3">Recipe / Station</th>
                <th className="py-2.5 px-3 text-right">Target / Actual</th>
                <th className="py-2.5 px-3 text-right">Std vs Actual Cost</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-4 text-right">Next Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {productionOrders.map((po) => {
                const isDone = po.status === 'completed' || po.status === 'cancelled';
                const variance = po.costVariance ?? 0;

                return (
                  <React.Fragment key={po.id}>
                    <tr className={isDone ? 'bg-neutral-50/60' : 'hover:bg-neutral-50/70'}>
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-neutral-900">{po.orderNumber}</div>
                        <div className="text-[11px] text-neutral-500">
                          {po.cateringOrderNumber
                            ? `Catering ${po.cateringOrderNumber}`
                            : po.sourceType.replace(/_/g, ' ')}{' '}
                          · {po.scheduledFor}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">{po.recipeName}</div>
                        <div className="text-[11px] text-neutral-500 capitalize">
                          {po.station.replace(/_/g, ' ')} · {po.assignedTo}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-bold text-neutral-900">
                          {po.targetPortions.toLocaleString()} {po.yieldUnit}
                        </div>
                        {po.actualPortions !== undefined && (
                          <div className="text-[11px] text-emerald-700">
                            Actual: {po.actualPortions} {po.wastagePortions ? `(Waste ${po.wastagePortions})` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-neutral-900">
                          {formatMoney(po.standardCost)}
                        </div>
                        {po.actualCost !== undefined && (
                          <div
                            className={`text-[11px] ${
                              variance > 0
                                ? 'text-red-700'
                                : variance < 0
                                ? 'text-emerald-700'
                                : 'text-neutral-500'
                            }`}
                          >
                            Act: {formatMoney(po.actualCost)} (
                            {variance >= 0 ? `+${formatMoney(variance)}` : formatMoney(variance)})
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 capitalize font-semibold">
                        <span
                          className={
                            po.status === 'completed'
                              ? 'text-emerald-700'
                              : po.status === 'cancelled'
                              ? 'text-neutral-400'
                              : po.status === 'in_production'
                              ? 'text-orange-700'
                              : po.status === 'planned'
                              ? 'text-red-700'
                              : 'text-blue-700'
                          }
                        >
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {po.status === 'planned' && (
                            <button
                              type="button"
                              onClick={() => handleStageAdvance(po, 'stock_checked')}
                              className="px-2.5 py-1 bg-neutral-900 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <ClipboardCheck className="w-3 h-3" />
                              <span>Check Stock</span>
                            </button>
                          )}
                          {po.status === 'stock_checked' && (
                            <button
                              type="button"
                              onClick={() => handleStageAdvance(po, 'ingredients_issued')}
                              className="px-2.5 py-1 bg-blue-600 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Issue Ingredients</span>
                            </button>
                          )}
                          {po.status === 'ingredients_issued' && (
                            <button
                              type="button"
                              onClick={() => handleStageAdvance(po, 'in_production')}
                              className="px-2.5 py-1 bg-orange-600 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Play className="w-3 h-3" />
                              <span>Start Cooking</span>
                            </button>
                          )}
                          {po.status === 'in_production' && (
                            <button
                              type="button"
                              onClick={() => handleStageAdvance(po, 'completed')}
                              className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Complete &amp; Log Yield</span>
                            </button>
                          )}
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => {
                                cancelProductionOrder(po.id, 'Cancelled by kitchen manager');
                                onFeedback('success', `${po.orderNumber} cancelled.`);
                              }}
                              title="Cancel Production Order"
                              className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline Completion Form */}
                    {completingOrderId === po.id && (
                      <tr className="bg-emerald-50/50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap items-end gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700">
                                Actual Output ({po.yieldUnit})
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={actualOutputInput}
                                onChange={(e) =>
                                  setActualOutputInput(Math.max(1, parseInt(e.target.value, 10) || 1))
                                }
                                className="w-28 px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-neutral-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-neutral-700">
                                Wastage ({po.yieldUnit})
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={wastageInput}
                                onChange={(e) =>
                                  setWastageInput(Math.max(0, parseInt(e.target.value, 10) || 0))
                                }
                                className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-neutral-300 rounded-lg"
                              />
                            </div>
                            <div className="flex-1 min-w-[180px]">
                              <label className="block text-[11px] font-semibold text-neutral-700">
                                Wastage / Exception Notes
                              </label>
                              <input
                                type="text"
                                value={wastageReasonInput}
                                onChange={(e) => setWastageReasonInput(e.target.value)}
                                placeholder="Optional variance or trim loss notes..."
                                className="w-full px-2.5 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCompleteSubmit(po)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Confirm Output &amp; Deduct Stock
                              </button>
                              <button
                                type="button"
                                onClick={() => setCompletingOrderId(null)}
                                className="px-3 py-1.5 bg-white border border-neutral-300 text-neutral-700 text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Inline Exception Approval Prompt if stage failed */}
                    {exceptionOrderId === po.id && (
                      <tr className="bg-amber-50/70">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                            <input
                              type="text"
                              value={exceptionReasonInput}
                              onChange={(e) => setExceptionReasonInput(e.target.value)}
                              placeholder="Enter manager exception authorization reason to override stock check..."
                              className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!exceptionReasonInput.trim()) {
                                  onFeedback('error', 'Exception reason is mandatory.');
                                  return;
                                }
                                const nextStage =
                                  po.status === 'planned' ? 'stock_checked' : 'ingredients_issued';
                                const res = advanceProductionOrderStage(po.id, nextStage, {
                                  exceptionReason: exceptionReasonInput,
                                });
                                if (res.success) {
                                  setExceptionOrderId(null);
                                  onFeedback(
                                    'success',
                                    `${po.orderNumber} authorized via manager exception.`
                                  );
                                }
                              }}
                              className="px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Authorize Exception
                            </button>
                            <button
                              type="button"
                              onClick={() => setExceptionOrderId(null)}
                              className="px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
                            >
                              Dismiss
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Purchase Requests & Branch Transfers Queue */}
      {(purchaseRequests.length > 0 || branchTransfers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-900">
                Purchase Requisitions from Shortages ({purchaseRequests.length})
              </h4>
            </div>
            <div className="divide-y divide-neutral-100 text-xs max-h-60 overflow-y-auto">
              {purchaseRequests.map((pr) => (
                <div key={pr.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-900 truncate">
                      <span className="font-mono">{pr.requestNumber}</span> · {pr.ingredientName}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {pr.requestedQty.toLocaleString()} {pr.unit} · {formatMoney(pr.estimatedCost)} ·{' '}
                      <span className="capitalize font-semibold">{pr.status}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {pr.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => updatePurchaseRequestStatus(pr.id, 'ordered')}
                        className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-lg cursor-pointer"
                      >
                        Mark Ordered
                      </button>
                    )}
                    {(pr.status === 'pending' || pr.status === 'ordered') && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePurchaseRequestStatus(pr.id, 'received');
                          onFeedback(
                            'success',
                            `Received ${pr.requestedQty.toLocaleString()} ${pr.unit} of ${pr.ingredientName} into Main Store.`
                          );
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg cursor-pointer"
                      >
                        Receive Stock
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-900">
                Inter-Branch Stock Transfers ({branchTransfers.length})
              </h4>
            </div>
            <div className="divide-y divide-neutral-100 text-xs max-h-60 overflow-y-auto">
              {branchTransfers.map((bt) => (
                <div key={bt.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-900 truncate">
                      <span className="font-mono">{bt.transferNumber}</span> · {bt.ingredientName}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {bt.quantity.toLocaleString()} {bt.unit} from {bt.fromBranch} ·{' '}
                      <span className="capitalize font-semibold">{bt.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  {bt.status !== 'received' && (
                    <button
                      type="button"
                      onClick={() => {
                        receiveBranchTransfer(bt.id);
                        onFeedback(
                          'success',
                          `Received ${bt.quantity.toLocaleString()} ${bt.unit} of ${bt.ingredientName} from ${bt.fromBranch}.`
                        );
                      }}
                      className="px-2.5 py-1 bg-blue-600 text-white font-semibold rounded-lg shrink-0 cursor-pointer"
                    >
                      Receive Branch Stock
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Ready-to-Serve Prepared Dish Pool */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Ready-to-Serve Batch Dishes</h3>
          <p className="text-xs text-neutral-500">
            Finished batch pools ready for POS/Waiter/Customer sales. Orders decrement remaining portions without re-deducting raw stock.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {preparedDishStocks.map((dish) => {
            const linkedRec = recipes.find((r) => r.menuItemId === dish.menuItemId);
            return (
              <div key={dish.menuItemId} className="p-4 rounded-xl border border-neutral-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-neutral-900">{dish.dishName}</span>
                  <span
                    className={`text-xs font-semibold ${
                      dish.preparedPlatesAvailable === 0
                        ? 'text-red-700'
                        : dish.preparedPlatesAvailable <= 10
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {dish.preparedPlatesAvailable === 0
                      ? 'Sold Out'
                      : dish.preparedPlatesAvailable <= 10
                      ? 'Low'
                      : 'Ready'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900">
                    {dish.preparedPlatesAvailable}{' '}
                    <span className="text-xs font-sans font-normal text-neutral-500">plates left</span>
                  </div>
                  <div className="text-right text-[11px] font-mono tabular-nums text-neutral-500">
                    Cooked {dish.totalCookedToday} · Sold {dish.totalSoldToday}
                  </div>
                </div>
                {linkedRec && (
                  <button
                    type="button"
                    onClick={() => onOpenBatchModal(linkedRec)}
                    className="w-full py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer"
                  >
                    Cook New Batch
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Production Batch Ledger & Controlled Reversals */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-200">
          <h3 className="text-sm font-bold text-neutral-900">
            Production Batch Ledger &amp; Controlled Reversals
          </h3>
          <p className="text-xs text-neutral-500">
            Reversing a batch restores remaining ingredients to Kitchen Stock while preserving the immutable audit log.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-4">Batch #</th>
                <th className="py-2.5 px-3">Dish / Sub-Recipe</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Produced</th>
                <th className="py-2.5 px-3 text-right">Remaining</th>
                <th className="py-2.5 px-3 text-right">Batch COGS</th>
                <th className="py-2.5 px-3">Cooked By</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {productionLogs.map((log) => {
                const isReversed = log.status === 'reversed';
                return (
                  <React.Fragment key={log.id}>
                    <tr className={isReversed ? 'bg-neutral-50 text-neutral-400' : 'hover:bg-neutral-50/70'}>
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                        {log.batchNumber || log.id}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-neutral-900">{log.dishName}</div>
                        <div className="text-[11px] text-neutral-500">{log.timestamp}</div>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 capitalize">
                        {(log.productionType || 'batch_finished').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {log.actualPlatesProduced.toLocaleString()} {log.unitLabel || 'plates'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold">
                        {log.remainingPlates.toLocaleString()} {log.unitLabel || 'plates'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-neutral-900">
                        {formatMoney(log.totalCost)}
                      </td>
                      <td className="py-3 px-3 text-neutral-600">{log.cookedBy}</td>
                      <td className="py-3 px-4 text-right">
                        {isReversed ? (
                          <span className="text-red-700 font-semibold">
                            Reversed · {log.reversalReason}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReversingLogId(log.id);
                              setReversalReason('Incorrect batch entry / prep cancelled');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg whitespace-nowrap cursor-pointer"
                          >
                            Reverse Batch
                          </button>
                        )}
                      </td>
                    </tr>
                    {reversingLogId === log.id && (
                      <tr className="bg-red-50/60">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="flex-1 w-full">
                              <input
                                type="text"
                                value={reversalReason}
                                onChange={(e) => setReversalReason(e.target.value)}
                                placeholder="Enter mandatory audit reason for reversing this production batch..."
                                className="w-full px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg"
                              />
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const res = reverseProductionBatch(
                                    log.id,
                                    reversalReason,
                                    'David Kasambala (Manager)'
                                  );
                                  if (res.success) {
                                    setReversingLogId(null);
                                    onFeedback(
                                      'success',
                                      `Batch ${log.batchNumber || log.id} reversed with full audit trail.`
                                    );
                                  } else {
                                    onFeedback('error', res.error || 'Could not reverse batch.');
                                  }
                                }}
                                className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg cursor-pointer"
                              >
                                Confirm Controlled Reversal
                              </button>
                              <button
                                type="button"
                                onClick={() => setReversingLogId(null)}
                                className="px-3 py-1.5 text-xs font-semibold bg-white border border-neutral-300 text-neutral-700 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {blockedCookingAttempts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 space-y-2">
          <h4 className="text-xs font-bold text-neutral-900">
            Blocked Production Attempts ({blockedCookingAttempts.length})
          </h4>
          <div className="divide-y divide-neutral-100 text-xs">
            {blockedCookingAttempts.map((b) => (
              <div key={b.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <span className="font-semibold text-neutral-900">{b.dishName}</span> ·{' '}
                  <span className="text-neutral-500">{b.reason}</span>
                </div>
                <span className="font-mono text-neutral-500">{b.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
