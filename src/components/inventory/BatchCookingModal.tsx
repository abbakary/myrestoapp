import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowLeftRight,
  ShieldAlert,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe } from '../../types/restaurant';

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
    cookBatchProduction,
    createRequisitionForMissing,
    confirmStockTransferReceipt,
    stockMovements,
  } = useRestaurant();

  const [batchMultiplier, setBatchMultiplier] = useState<number>(1.0);
  const [actualPlatesInput, setActualPlatesInput] = useState<number>(recipe.batchYieldPlates || 100);
  const [chefName, setChefName] = useState<string>('Executive Chef Juma');
  const [isManagerOverride, setIsManagerOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [requisitionSuccessMessage, setRequisitionSuccessMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const isSemiStandardized = recipe.productionMethod === 'semi_standardized';
  const [adjustActualInputs, setAdjustActualInputs] = useState<boolean>(isSemiStandardized);
  const [actualInputs, setActualInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    setBatchMultiplier(1.0);
    setActualPlatesInput(recipe.batchYieldPlates || 100);
    setAdjustActualInputs(recipe.productionMethod === 'semi_standardized');
    setErrorBanner(null);
    setRequisitionSuccessMessage(null);
    setIsManagerOverride(false);
    setOverrideReason('');

    const defaults: Record<string, number> = {};
    recipe.ingredients.forEach((ri) => {
      if (!ri.isSubRecipe) {
        const stdQty = ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 1);
        defaults[ri.ingredientId] = Math.round(stdQty * 100) / 100;
      }
    });
    setActualInputs(defaults);
  }, [isOpen, recipe]);

  const handleScaleChange = (mult: number) => {
    setBatchMultiplier(mult);
    setActualPlatesInput(Math.round((recipe.batchYieldPlates || 100) * mult));
    const scaled: Record<string, number> = {};
    recipe.ingredients.forEach((ri) => {
      if (!ri.isSubRecipe) {
        const stdQty = (ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 1)) * mult;
        scaled[ri.ingredientId] = Math.round(stdQty * 100) / 100;
      }
    });
    setActualInputs(scaled);
  };

  const targetDish = menuItems.find((m) => m.id === recipe.menuItemId);
  const targetYield = Math.round((recipe.batchYieldPlates || 100) * batchMultiplier);
  const yieldUnitLabel = recipe.yieldUnit || (recipe.isSubRecipe ? 'grams' : 'plates');

  const validation = useMemo(() => {
    return validateBatchKitchenStock(
      recipe.id,
      batchMultiplier,
      adjustActualInputs ? actualInputs : undefined
    );
  }, [recipe.id, batchMultiplier, adjustActualInputs, actualInputs, ingredients, subRecipeBatches, validateBatchKitchenStock]);

  if (!isOpen) return null;

  const handleAutoRequisition = () => {
    setRequisitionSuccessMessage(null);
    setErrorBanner(null);
    const success = createRequisitionForMissing(
      validation.missingItems.filter((m) => !m.isSubRecipe),
      'Immediate Batch Cooking Requisition'
    );
    if (success) {
      setRequisitionSuccessMessage('Missing raw ingredients transferred from Main Store to Kitchen Floor.');
    } else {
      setErrorBanner('Could not complete automatic store requisition — check store stock or sub-recipe batch inventory.');
    }
  };

  const handleConfirmCook = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!validation.canCook && !isManagerOverride) {
      setErrorBanner('Cannot record batch: required ingredients or sub-recipes are short in Kitchen.');
      return;
    }

    if (isManagerOverride && !overrideReason.trim()) {
      setErrorBanner('Manager override requires an audit reason.');
      return;
    }

    const res = cookBatchProduction({
      recipeId: recipe.id,
      batches: batchMultiplier,
      actualPlatesProduced: actualPlatesInput || targetYield,
      actualInputs: adjustActualInputs ? actualInputs : undefined,
      chefName,
      managerOverride: isManagerOverride,
      overrideReason: isManagerOverride ? overrideReason : undefined,
    });

    if (res.success) {
      onClose();
    } else {
      setErrorBanner(res.error || 'Failed to record batch production.');
    }
  };

  const unitCostDisplay =
    actualPlatesInput > 0 ? validation.totalCost / actualPlatesInput : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-neutral-900">
                  {recipe.isSubRecipe ? 'Produce Sub-Recipe Batch' : 'Cook Production Batch'}
                </h2>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-mono text-neutral-600">
                  {recipe.code || recipe.id} · Base {recipe.batchYieldPlates} {yieldUnitLabel}
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
                {!recipe.isSubRecipe && targetDish ? ` · Menu Sell Price: ${formatMoney(targetDish.price)}` : ''}
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
              <button type="button" onClick={() => setErrorBanner(null)} className="text-red-700 hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Batch Scale & Semi-Standardized Toggle */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-neutral-900">Batch Scale</div>
              <p className="text-[11px] text-neutral-500">
                Deducts kitchen raw materials &amp; prepared sub-recipes upon confirmation
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[0.5, 1.0, 2.0].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => handleScaleChange(mult)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                    batchMultiplier === mult
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {mult}x ({Math.round((recipe.batchYieldPlates || 100) * mult)} {yieldUnitLabel})
                </button>
              ))}
            </div>
          </div>

          {/* Method 2 / Editable Actual Inputs Section */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold text-neutral-900">
                Ingredients &amp; Sub-Recipes Required ({recipe.ingredients.length})
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustActualInputs}
                  onChange={(e) => setAdjustActualInputs(e.target.checked)}
                  className="rounded text-orange-600 w-3.5 h-3.5"
                />
                <span>Adjust Actual Input Quantities</span>
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-2 px-3">Material / Sub-Recipe</th>
                    <th className="py-2 px-3 text-right">Standard Qty</th>
                    <th className="py-2 px-3 text-right">Actual Issued</th>
                    <th className="py-2 px-3 text-right">Kitchen / Pool Avail</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {recipe.ingredients.map((ri, idx) => {
                    const stdQty = (ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 1)) * batchMultiplier;
                    const missingRow = validation.missingItems.find((m) =>
                      ri.isSubRecipe ? m.subRecipeId === ri.subRecipeId : m.ingredientId === ri.ingredientId
                    );
                    const unit = missingRow?.unit || ri.batchUnit || 'units';
                    const actualVal = ri.isSubRecipe
                      ? stdQty
                      : adjustActualInputs
                      ? actualInputs[ri.ingredientId] ?? stdQty
                      : stdQty;
                    const sr = ri.isSubRecipe ? recipes.find((r) => r.id === ri.subRecipeId) : null;
                    const label = ri.isSubRecipe ? `${sr?.name || ri.subRecipeId} (Sub-Recipe)` : missingRow?.ingredientName || ri.ingredientId;

                    const isOk = !missingRow || missingRow.status === 'ok';
                    const matchingTransit = !ri.isSubRecipe && missingRow?.inTransitQty
                      ? stockMovements.find((m) => m.ingredientId === ri.ingredientId && m.transferStatus === 'in_transit')
                      : null;

                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-neutral-900">
                          <div>{label}</div>
                          {missingRow?.substituteIngredientName && !isOk && (
                            <div className="text-[11px] text-amber-700 font-normal">
                              Substitute available: {missingRow.substituteIngredientName} (
                              {(missingRow.substituteKitchenQty || 0).toLocaleString()} {unit})
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-600">
                          {stdQty.toLocaleString()} {unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {adjustActualInputs && !ri.isSubRecipe ? (
                            <input
                              type="number"
                              step="any"
                              min={0}
                              value={actualVal}
                              onChange={(e) =>
                                setActualInputs((prev) => ({
                                  ...prev,
                                  [ri.ingredientId]: Math.max(0, parseFloat(e.target.value) || 0),
                                }))
                              }
                              className="w-24 bg-neutral-50 border border-neutral-300 rounded px-2 py-1 text-right font-mono font-bold tabular-nums"
                            />
                          ) : (
                            <span className="font-bold text-neutral-900">
                              {actualVal.toLocaleString()} {unit}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-neutral-700">
                          {(missingRow?.availableKitchenQty ?? 0).toLocaleString()} {unit}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {isOk ? (
                            <span className="text-emerald-700 font-semibold">Ready</span>
                          ) : (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-red-700 font-bold">
                                Short {missingRow?.shortageQty.toLocaleString()} {unit}
                              </span>
                              {matchingTransit && (
                                <button
                                  type="button"
                                  onClick={() => confirmStockTransferReceipt(matchingTransit.id, chefName)}
                                  className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                                >
                                  Confirm Receipt
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

          {/* Shortage Requisition Bar */}
          {!validation.canCook && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Kitchen Stock Shortage Detected</div>
                  <p className="text-red-800 mt-0.5">
                    Transfer missing raw materials from Main Store before cooking, or produce required sub-recipe batches first.
                  </p>
                </div>
              </div>

              {validation.missingItems.some((m) => m.status !== 'ok' && !m.isSubRecipe && m.storeAvailableQty > 0) && (
                <button
                  type="button"
                  onClick={handleAutoRequisition}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Transfer Missing from Store</span>
                </button>
              )}
            </div>
          )}

          {requisitionSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{requisitionSuccessMessage}</span>
            </div>
          )}

          {/* Yield & Staff Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                <span>Actual Usable Output ({yieldUnitLabel})</span>
                <span className="text-[11px] text-neutral-500 font-mono">Target: {targetYield}</span>
              </label>
              <input
                type="number"
                min={1}
                value={actualPlatesInput}
                onChange={(e) => setActualPlatesInput(Math.max(1, parseInt(e.target.value) || targetYield))}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold tabular-nums"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Prepared / Cooked By</label>
              <input
                type="text"
                required
                value={chefName}
                onChange={(e) => setChefName(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
            </div>
          </div>

          {/* Manager Override */}
          {!validation.canCook && (
            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={isManagerOverride}
                  onChange={(e) => setIsManagerOverride(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <span>Manager Override (Log emergency production with pending transfer)</span>
              </label>

              {isManagerOverride && (
                <input
                  type="text"
                  required
                  placeholder="Mandatory audit reason..."
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
              <span className="text-[11px] font-semibold text-neutral-500">Total Batch COGS</span>
              <div className="text-sm font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                {formatMoney(validation.totalCost)}
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
                  ? `${((actualPlatesInput / Math.max(1, targetYield)) * 100).toFixed(0)}%`
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
              disabled={!validation.canCook && !isManagerOverride}
              className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap ${
                validation.canCook || isManagerOverride
                  ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Confirm Batch ({actualPlatesInput} {yieldUnitLabel})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
