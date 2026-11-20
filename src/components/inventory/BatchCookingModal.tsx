import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowLeftRight,
  ShieldAlert,
  ShoppingCart,
  Building2,
  SlidersHorizontal,
  ArrowDownCircle,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe } from '../../types/restaurant';
import { formatScaledQuantity } from '../../utils/unitConversion';

interface BatchCookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
}

export const BatchCookingModal: React.FC<BatchCookingModalProps> = ({
  isOpen,
  onClose,
  recipe,
}) => {
  const {
    ingredients,
    recipes,
    subRecipeBatches,
    menuItems,
    formatMoney,
    validateBatchKitchenStock,
    calculateScaledRequirements,
    cookBatchProduction,
    createRequisitionForMissing,
    resolveShortageViaPurchaseRequest,
    resolveShortageViaBranchTransfer,
    confirmStockTransferReceipt,
    stockMovements,
  } = useRestaurant();

  const baseYield = Math.max(1, recipe.batchYieldPlates || 1);
  const yieldUnitLabel = recipe.yieldUnit || (recipe.isSubRecipe ? 'grams' : 'plates');

  const [desiredOutput, setDesiredOutput] = useState<number>(baseYield);
  const [actualPlatesInput, setActualPlatesInput] = useState<number>(baseYield);
  const [chefName, setChefName] = useState<string>('Executive Chef Juma');
  const [isManagerOverride, setIsManagerOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [resolutionNotice, setResolutionNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isSemiStandardized = recipe.productionMethod === 'semi_standardized';
  const [adjustActualInputs, setAdjustActualInputs] = useState<boolean>(isSemiStandardized);
  const [actualInputs, setActualInputs] = useState<Record<string, number>>({});
  const [substituteOverrides, setSubstituteOverrides] = useState<Record<string, string>>({});

  const batchMultiplier = desiredOutput / baseYield;

  const syncActualInputsFromOutput = (
    targetQty: number,
    subs: Record<string, string> = substituteOverrides
  ) => {
    const mult = targetQty / baseYield;
    const defaults: Record<string, number> = {};
    recipe.ingredients.forEach((ri) => {
      if (!ri.isSubRecipe) {
        const effId = subs[ri.ingredientId] || ri.ingredientId;
        const stdQty = (ri.batchQuantity ?? ri.quantity * baseYield) * mult;
        defaults[effId] = Math.round(((defaults[effId] || 0) + stdQty) * 100) / 100;
      }
    });
    setActualInputs(defaults);
  };

  useEffect(() => {
    if (!isOpen) return;
    setDesiredOutput(baseYield);
    setActualPlatesInput(baseYield);
    setAdjustActualInputs(recipe.productionMethod === 'semi_standardized');
    setErrorBanner(null);
    setResolutionNotice(null);
    setIsManagerOverride(false);
    setOverrideReason('');
    setSubstituteOverrides({});
    syncActualInputsFromOutput(baseYield, {});
  }, [isOpen, recipe.id]);

  const handleOutputChange = (newQty: number) => {
    const cleanQty = Math.max(1, Math.round(newQty));
    setDesiredOutput(cleanQty);
    setActualPlatesInput(cleanQty);
    syncActualInputsFromOutput(cleanQty);
  };

  const targetDish = menuItems.find((m) => m.id === recipe.menuItemId);

  const scaled = useMemo(() => {
    return calculateScaledRequirements([
      {
        recipeId: recipe.id,
        portions: desiredOutput,
        substituteOverrides,
      },
    ]);
  }, [recipe.id, desiredOutput, substituteOverrides, calculateScaledRequirements]);

  const validation = useMemo(() => {
    return validateBatchKitchenStock(
      recipe.id,
      batchMultiplier,
      adjustActualInputs ? actualInputs : undefined
    );
  }, [
    recipe.id,
    batchMultiplier,
    adjustActualInputs,
    actualInputs,
    ingredients,
    subRecipeBatches,
    validateBatchKitchenStock,
  ]);

  if (!isOpen) return null;

  const hasSubstitutesApplied = Object.keys(substituteOverrides).length > 0;
  // When user switches to substitutes or adjusts inputs, evaluate kitchen readiness accordingly
  const effectiveCanCook = hasSubstitutesApplied
    ? scaled.canProduceFromKitchen
    : validation.canCook;

  const handleStoreTransfer = () => {
    setResolutionNotice(null);
    setErrorBanner(null);
    const missingForKitchen = scaled.rows
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

    if (missingForKitchen.length === 0) {
      setErrorBanner('No additional stock available in Main Store for the short ingredients.');
      return;
    }

    const success = createRequisitionForMissing(
      missingForKitchen,
      `Batch Production Requisition (${desiredOutput} ${yieldUnitLabel})`
    );
    if (success) {
      setResolutionNotice('Missing raw materials transferred from Main Store to Kitchen Floor.');
    } else {
      setErrorBanner('Could not complete automatic store requisition.');
    }
  };

  const handlePurchaseRequestForRow = (ingredientId: string, shortageQty: number, name: string) => {
    setErrorBanner(null);
    const pr = resolveShortageViaPurchaseRequest({
      ingredientId,
      requestedQty: Math.max(1, Math.ceil(shortageQty)),
      reason: `Batch shortage for ${desiredOutput} ${yieldUnitLabel} of ${recipe.name || recipe.id}`,
      linkedOrderRef: recipe.code || recipe.id,
      requestedBy: chefName,
    });
    if (pr) {
      setResolutionNotice(
        `Purchase Request ${pr.requestNumber} raised for ${pr.requestedQty.toLocaleString()} ${pr.unit} of ${name}.`
      );
    }
  };

  const handleBranchTransferForRow = (ingredientId: string, shortageQty: number, name: string) => {
    setErrorBanner(null);
    const bt = resolveShortageViaBranchTransfer({
      ingredientId,
      quantity: Math.max(1, Math.ceil(shortageQty)),
      fromBranch: 'Kariakoo Flagship Branch',
      requestedBy: chefName,
    });
    if (bt) {
      setResolutionNotice(
        `Inter-Branch Transfer ${bt.transferNumber} dispatched from Kariakoo Flagship for ${name}.`
      );
    }
  };

  const handleApplySubstitute = (originalIngId: string, substituteIngId: string) => {
    const next = { ...substituteOverrides, [originalIngId]: substituteIngId };
    setSubstituteOverrides(next);
    syncActualInputsFromOutput(desiredOutput, next);
    const subIng = ingredients.find((i) => i.id === substituteIngId);
    setResolutionNotice(`Applied approved substitute: ${subIng?.name || substituteIngId}.`);
  };

  const handleClearSubstitute = (originalIngId: string) => {
    const next = { ...substituteOverrides };
    delete next[originalIngId];
    setSubstituteOverrides(next);
    syncActualInputsFromOutput(desiredOutput, next);
  };

  const handleConfirmCook = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!effectiveCanCook && !isManagerOverride) {
      setErrorBanner(
        'Cannot complete production: resolve kitchen/pool shortages first or record an authorized Manager Exception.'
      );
      return;
    }

    if (isManagerOverride && !overrideReason.trim()) {
      setErrorBanner('Manager exception authorization requires an audit reason.');
      return;
    }

    // Build effective actualInputs if substitutes were applied so deduction uses substitute IDs
    let inputsPayload = adjustActualInputs ? actualInputs : undefined;
    if (hasSubstitutesApplied && !adjustActualInputs) {
      const subMap: Record<string, number> = {};
      recipe.ingredients.forEach((ri) => {
        if (!ri.isSubRecipe) {
          const effId = substituteOverrides[ri.ingredientId] || ri.ingredientId;
          const stdQty = (ri.batchQuantity ?? ri.quantity * baseYield) * batchMultiplier;
          subMap[effId] = (subMap[effId] || 0) + stdQty;
        }
      });
      inputsPayload = subMap;
    }

    const res = cookBatchProduction({
      recipeId: recipe.id,
      batches: batchMultiplier,
      actualPlatesProduced: actualPlatesInput || desiredOutput,
      actualInputs: inputsPayload,
      chefName,
      managerOverride: isManagerOverride || hasSubstitutesApplied,
      overrideReason: isManagerOverride
        ? overrideReason
        : hasSubstitutesApplied
        ? 'Approved ingredient substitution applied during batch production'
        : undefined,
    });

    if (res.success) {
      onClose();
    } else {
      setErrorBanner(res.error || 'Failed to record batch production.');
    }
  };

  const unitCostDisplay =
    actualPlatesInput > 0 ? scaled.totalEstimatedCost / actualPlatesInput : 0;

  const quickPresets = recipe.isSubRecipe
    ? [
        { label: '0.5x', qty: Math.max(1, Math.round(baseYield * 0.5)) },
        { label: '1x', qty: baseYield },
        { label: '2x', qty: baseYield * 2 },
      ]
    : Array.from(new Set([1, 10, 50, baseYield, 100]))
        .sort((a, b) => a - b)
        .slice(0, 5)
        .map((q) => ({ label: `${q}`, qty: q }));

  const sliderMax = recipe.isSubRecipe ? Math.max(baseYield * 3, 100) : Math.max(200, baseYield * 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-neutral-900">
                  {recipe.isSubRecipe ? 'Produce Sub-Recipe Batch' : 'Batch Production & Scaling'}
                </h2>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-mono text-neutral-600">
                  {recipe.code || recipe.id} · Std Yield {baseYield.toLocaleString()} {yieldUnitLabel}
                </span>
                {isSemiStandardized && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className="text-xs font-semibold text-amber-700">Semi-Standardized</span>
                  </>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5 truncate">
                {recipe.name || targetDish?.name}
                {!recipe.isSubRecipe && targetDish
                  ? ` · Menu Sell Price: ${formatMoney(targetDish.price)}`
                  : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmCook} className="p-6 space-y-5 overflow-y-auto">
          {errorBanner && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between gap-2">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-red-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {resolutionNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resolutionNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setResolutionNotice(null)}
                className="text-emerald-700 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Dynamic Scaling Calculator */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                  <span>Production Scaling Calculator</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Scale to any target quantity (e.g., 1, 10, 50, 96, or 100 {yieldUnitLabel}). Sub-recipes deduct from prepared pool only.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-neutral-600 whitespace-nowrap">
                  Target ({yieldUnitLabel}):
                </label>
                <input
                  type="number"
                  min={1}
                  value={desiredOutput}
                  onChange={(e) => handleOutputChange(parseInt(e.target.value, 10) || 1)}
                  className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold tabular-nums bg-white border border-neutral-300 rounded-lg text-right"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <input
                type="range"
                min={1}
                max={sliderMax}
                value={Math.min(sliderMax, desiredOutput)}
                onChange={(e) => handleOutputChange(parseInt(e.target.value, 10) || 1)}
                className="w-full sm:flex-1 accent-orange-600 cursor-pointer"
              />
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {quickPresets.map((p) => (
                  <button
                    key={p.qty}
                    type="button"
                    onClick={() => handleOutputChange(p.qty)}
                    className={`px-2.5 py-1 text-xs font-semibold font-mono tabular-nums rounded-lg whitespace-nowrap cursor-pointer ${
                      desiredOutput === p.qty
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {p.label} {recipe.isSubRecipe ? '' : 'pl'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scaled Ingredient & Sub-Recipe Check Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs font-bold text-neutral-900">
                Scaled Requirements ({scaled.rows.length} components · Max producible with current stock:{' '}
                <span className="font-mono tabular-nums text-neutral-900">
                  {scaled.maxProduciblePortions.toLocaleString()} {yieldUnitLabel}
                </span>
                )
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustActualInputs}
                  onChange={(e) => setAdjustActualInputs(e.target.checked)}
                  className="rounded text-orange-600 w-3.5 h-3.5"
                />
                <span>Adjust Actual Issued Qty</span>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2 px-3">Material / Sub-Recipe</th>
                    <th className="py-2 px-3 text-right">Required</th>
                    <th className="py-2 px-3 text-right">Actual Issued</th>
                    <th className="py-2 px-3 text-right">Kitchen / Pool</th>
                    <th className="py-2 px-3 text-right">Store (Unres.)</th>
                    <th className="py-2 px-3 text-right">Availability &amp; Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {scaled.rows.map((row) => {
                    const fmtReq = formatScaledQuantity(row.requiredQty, row.unit);
                    const fmtKitchen = formatScaledQuantity(row.availableKitchenQty, row.unit);
                    const fmtStore = formatScaledQuantity(row.availableStoreQty, row.unit);
                    const isKitchenOk = row.kitchenShortageQty <= 0;
                    const isGlobalOk = row.globalShortageQty <= 0;
                    const originalRi = recipe.ingredients.find(
                      (ri) =>
                        !ri.isSubRecipe &&
                        (ri.ingredientId === row.ingredientId ||
                          substituteOverrides[ri.ingredientId] === row.ingredientId)
                    );
                    const wasSubstitutedFrom =
                      originalRi && substituteOverrides[originalRi.ingredientId] === row.ingredientId
                        ? originalRi.ingredientId
                        : null;

                    const matchingTransit =
                      !row.isSubRecipe
                        ? stockMovements.find(
                            (m) =>
                              m.ingredientId === row.ingredientId && m.transferStatus === 'in_transit'
                          )
                        : null;

                    const actualVal = row.isSubRecipe
                      ? row.requiredQty
                      : adjustActualInputs
                      ? actualInputs[row.ingredientId] ?? row.requiredQty
                      : row.requiredQty;

                    return (
                      <tr key={row.key} className={!isKitchenOk ? 'bg-red-50/30' : ''}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-neutral-900">{row.ingredientName}</div>
                          {row.reservedQty > 0 && (
                            <div className="text-[11px] text-amber-700 font-mono">
                              Reserved elsewhere: {row.reservedQty.toLocaleString()} {row.unit}
                            </div>
                          )}
                          {wasSubstitutedFrom && (
                            <div className="text-[11px] text-emerald-700 flex items-center gap-1.5 mt-0.5">
                              <span>Substitute active</span>
                              <button
                                type="button"
                                onClick={() => handleClearSubstitute(wasSubstitutedFrom)}
                                className="underline text-neutral-600 hover:text-neutral-900 cursor-pointer"
                              >
                                Revert
                              </button>
                            </div>
                          )}
                          {!isKitchenOk && row.substituteIngredientId && !wasSubstitutedFrom && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-800">
                              <span>
                                Alt: {row.substituteIngredientName} (
                                {(row.substituteAvailableQty || 0).toLocaleString()} {row.unit})
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleApplySubstitute(row.ingredientId, row.substituteIngredientId!)
                                }
                                className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold rounded cursor-pointer"
                              >
                                Use Substitute
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          <div className="font-bold text-neutral-900">{fmtReq.primary}</div>
                          {fmtReq.secondary && (
                            <div className="text-[11px] text-neutral-500">({fmtReq.secondary})</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {adjustActualInputs && !row.isSubRecipe ? (
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={actualVal}
                              onChange={(e) =>
                                setActualInputs((prev) => ({
                                  ...prev,
                                  [row.ingredientId]: Math.max(0, parseFloat(e.target.value) || 0),
                                }))
                              }
                              className="w-24 bg-neutral-50 border border-neutral-300 rounded px-2 py-1 text-right font-mono font-bold tabular-nums"
                            />
                          ) : (
                            <span className="font-semibold text-neutral-900">{fmtReq.primary}</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-700">
                          <div>{fmtKitchen.primary}</div>
                          {fmtKitchen.secondary && (
                            <div className="text-[11px] text-neutral-400">({fmtKitchen.secondary})</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-neutral-600">
                          {row.isSubRecipe ? (
                            '—'
                          ) : (
                            <>
                              <div>{fmtStore.primary}</div>
                              {fmtStore.secondary && (
                                <div className="text-[11px] text-neutral-400">({fmtStore.secondary})</div>
                              )}
                            </>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          {isKitchenOk ? (
                            <span className="text-emerald-700 font-semibold">Available</span>
                          ) : (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-red-700 font-bold font-mono tabular-nums">
                                Short {formatScaledQuantity(row.kitchenShortageQty, row.unit).primary}
                              </span>
                              {!row.isSubRecipe && !isGlobalOk && (
                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePurchaseRequestForRow(
                                        row.ingredientId,
                                        row.globalShortageQty,
                                        row.ingredientName
                                      )
                                    }
                                    className="px-2 py-0.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    <span>Purchase Req</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleBranchTransferForRow(
                                        row.ingredientId,
                                        row.globalShortageQty,
                                        row.ingredientName
                                      )
                                    }
                                    className="px-2 py-0.5 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-800 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Building2 className="w-3 h-3" />
                                    <span>Branch Transfer</span>
                                  </button>
                                </div>
                              )}
                              {matchingTransit && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    confirmStockTransferReceipt(matchingTransit.id, chefName)
                                  }
                                  className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Confirm Transit Receipt
                                </button>
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

          {/* 4-Way Shortage Resolution Bar */}
          {!effectiveCanCook && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Shortage Resolution Required Before Production Completion
                  </div>
                  <p className="text-red-800 mt-0.5">
                    Resolve stock gaps by transferring from Main Store, reducing output to max producible capacity, applying an approved substitute, requesting a purchase/branch transfer, or authorizing an exception below.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {scaled.rows.some(
                  (r) => !r.isSubRecipe && r.kitchenShortageQty > 0 && r.availableStoreQty > 0
                ) && (
                  <button
                    type="button"
                    onClick={handleStoreTransfer}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Transfer Missing from Main Store</span>
                  </button>
                )}

                {scaled.maxProduciblePortions < desiredOutput && scaled.maxProduciblePortions > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOutputChange(scaled.maxProduciblePortions)}
                    className="px-3 py-1.5 bg-white border border-red-300 hover:bg-red-100 text-red-900 font-bold text-xs rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>
                      Reduce Output to Max Available ({scaled.maxProduciblePortions} {yieldUnitLabel})
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Yield & Staff Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                <span>Actual Usable Output ({yieldUnitLabel})</span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  Target: {desiredOutput}
                </span>
              </label>
              <input
                type="number"
                min={1}
                value={actualPlatesInput}
                onChange={(e) =>
                  setActualPlatesInput(Math.max(1, parseInt(e.target.value, 10) || desiredOutput))
                }
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Prepared / Cooked By
              </label>
              <input
                type="text"
                required
                value={chefName}
                onChange={(e) => setChefName(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>
          </div>

          {/* Manager Exception Override */}
          {!effectiveCanCook && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={isManagerOverride}
                  onChange={(e) => setIsManagerOverride(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <span>
                  Authorized Manager Exception (Log production with pending replenishment)
                </span>
              </label>

              {isManagerOverride && (
                <input
                  type="text"
                  required
                  placeholder="Mandatory audit reason for manager exception..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-neutral-300 rounded-lg text-neutral-900"
                />
              )}
            </div>
          )}

          {/* Cost Summary */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[11px] font-semibold text-neutral-500">Total Batch Food COGS</span>
              <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                {formatMoney(scaled.totalEstimatedCost)}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-neutral-500">
                Cost / {recipe.isSubRecipe ? yieldUnitLabel : 'Plate'}
              </span>
              <div className="text-sm font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                {recipe.isSubRecipe
                  ? `${unitCostDisplay.toFixed(2)} TZS`
                  : formatMoney(Math.round(unitCostDisplay))}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-neutral-500">
                {recipe.isSubRecipe ? 'Yield Ratio' : 'Food Cost %'}
              </span>
              <div className="text-sm font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                {recipe.isSubRecipe
                  ? `${((actualPlatesInput / Math.max(1, desiredOutput)) * 100).toFixed(0)}%`
                  : `${((unitCostDisplay / Math.max(1, targetDish?.price || 8000)) * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!effectiveCanCook && !isManagerOverride}
              className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap ${
                effectiveCanCook || isManagerOverride
                  ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>
                Confirm Production ({actualPlatesInput} {yieldUnitLabel})
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
