import React, { useState, useMemo } from 'react';
import {
  Flame,
  ChefHat,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeftRight,
  ShieldAlert,
  Layers,
  Scale,
  Sparkles,
  Info,
  Clock,
  Warehouse,
  Store,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe, MissingStockItem } from '../../types/restaurant';

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
    menuItems,
    formatMoney,
    validateBatchKitchenStock,
    cookBatchProduction,
    createRequisitionForMissing,
  } = useRestaurant();

  const [batchMultiplier, setBatchMultiplier] = useState<number>(1.0);
  const [actualPlatesInput, setActualPlatesInput] = useState<number>(recipe.batchYieldPlates || 100);
  const [chefName, setChefName] = useState<string>('Executive Chef Juma');
  const [isManagerOverride, setIsManagerOverride] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [requisitionSuccessMessage, setRequisitionSuccessMessage] = useState<string | null>(null);

  const targetDish = menuItems.find((m) => m.id === recipe.menuItemId);
  const targetYield = Math.round((recipe.batchYieldPlates || 100) * batchMultiplier);

  // Validate Kitchen Stock in real-time
  const validation = useMemo(() => {
    return validateBatchKitchenStock(recipe.id, batchMultiplier);
  }, [recipe.id, batchMultiplier, ingredients, validateBatchKitchenStock]);

  if (!isOpen) return null;

  const missingItems = validation.missingItems.filter((m) => m.status !== 'ok');

  // Handle One-Click Requisition
  const handleAutoRequisition = () => {
    setRequisitionSuccessMessage(null);
    const success = createRequisitionForMissing(validation.missingItems, 'Immediate Batch Cooking Requisition');
    if (success) {
      setRequisitionSuccessMessage('Stock successfully transferred from Main Store to Kitchen Floor!');
    }
  };

  // Handle Cook Batch
  const handleConfirmCook = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.canCook && !isManagerOverride) {
      alert('Cannot cook batch: raw ingredients are missing or not transferred to Kitchen.');
      return;
    }

    if (isManagerOverride && !overrideReason.trim()) {
      alert('Manager override requires a mandatory audit reason (e.g. Emergency shift stock transfer paper pending).');
      return;
    }

    const res = cookBatchProduction({
      recipeId: recipe.id,
      batches: batchMultiplier,
      actualPlatesProduced: actualPlatesInput || targetYield,
      chefName,
      managerOverride: isManagerOverride,
      overrideReason: isManagerOverride ? overrideReason : undefined,
    });

    if (res.success) {
      onClose();
    } else {
      alert(res.error || 'Failed to record batch production.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-orange-50 via-amber-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-neutral-900">
                  Cook Batch Production (Kitchen Pot / Buffet)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                  Batch: {recipe.batchYieldPlates} Plates Base
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Menu Item: <strong className="text-neutral-900">{recipe.name || targetDish?.name}</strong> · Sell Price: {formatMoney(targetDish?.price || 8000)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirmCook} className="p-6 space-y-5">
          {/* Batch Multiplier Controls */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-neutral-800">Select Batch Scale:</span>
              <p className="text-[11px] text-neutral-500">Cooks bulk pot and deducts real raw stock from Kitchen</p>
            </div>

            <div className="flex items-center gap-1.5">
              {[0.5, 1.0, 2.0].map((mult) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => {
                    setBatchMultiplier(mult);
                    setActualPlatesInput(Math.round((recipe.batchYieldPlates || 100) * mult));
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    batchMultiplier === mult
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {mult} Batch ({Math.round((recipe.batchYieldPlates || 100) * mult)} plates)
                </button>
              ))}
            </div>
          </div>

          {/* BLOCKING VALIDATION ALERT (Exact requirement from User) */}
          {!validation.canCook && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4.5 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <h3 className="text-sm font-extrabold">
                  Cannot cook {batchMultiplier} batch of {recipe.name || 'Dish'}. Missing items in Kitchen:
                </h3>
              </div>

              {/* Multi-item breakdown */}
              <div className="bg-white rounded-xl p-3 border border-red-200 divide-y divide-red-100 text-xs">
                {validation.missingItems.map((item, idx) => {
                  const isNotTransferred = item.status === 'not_transferred';
                  const isInsufficient = item.status === 'insufficient';
                  const isOk = item.status === 'ok';

                  // Format to human-friendly display units (e.g. grams -> kg)
                  const displayReq = item.unit === 'grams' ? `${item.requiredQty / 1000} kg` : item.unit === 'ml' ? `${item.requiredQty / 1000} L` : `${item.requiredQty} ${item.unit}`;
                  const displayAvail = item.unit === 'grams' ? `${item.availableKitchenQty / 1000} kg` : item.unit === 'ml' ? `${item.availableKitchenQty / 1000} L` : `${item.availableKitchenQty} ${item.unit}`;
                  const displayShort = item.unit === 'grams' ? `${item.shortageQty / 1000} kg` : item.unit === 'ml' ? `${item.shortageQty / 1000} L` : `${item.shortageQty} ${item.unit}`;
                  const displayStore = item.unit === 'grams' ? `${item.storeAvailableQty / 1000} kg` : item.unit === 'ml' ? `${item.storeAvailableQty / 1000} L` : `${item.storeAvailableQty} ${item.unit}`;

                  return (
                    <div key={idx} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{item.ingredientName}</span>
                      </div>

                      <div className="font-mono text-xs">
                        {isNotTransferred && (
                          <span className="text-red-700 font-bold">
                            required {displayReq}, available {displayAvail} <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">(Not transferred to Kitchen)</span>
                          </span>
                        )}

                        {isInsufficient && (
                          <span className="text-amber-800 font-bold">
                            required {displayReq}, available {displayAvail} <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold">(Short by {displayShort})</span>
                          </span>
                        )}

                        {isOk && (
                          <span className="text-emerald-700 font-semibold">
                            OK (available {displayAvail} in Kitchen)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action: Create Requisition */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-red-700 font-medium">
                  Rule: Raw stock must be formally transferred from <strong>Main Storage</strong> to <strong>Kitchen Floor</strong> before cooking.
                </p>

                <button
                  type="button"
                  onClick={handleAutoRequisition}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Create Requisition for Missing Items</span>
                </button>
              </div>

              {requisitionSuccessMessage && (
                <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{requisitionSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Validation Passed Card */}
          {validation.canCook && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <div className="font-bold">All {validation.missingItems.length} ingredients are transferred & available in Kitchen!</div>
                <p className="text-emerald-700">
                  Ready to cook {targetYield} plates of {recipe.name}. Total raw batch cost: <strong>{formatMoney(validation.totalCost)}</strong> ({formatMoney(Math.round(validation.totalCost / targetYield))} per plate).
                </p>
              </div>
            </div>
          )}

          {/* Real-life Case 1: Actual Yield Variance (e.g. 95 plates instead of 100) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center justify-between">
                <span>Actual Plates Produced:</span>
                <span className="text-[10px] text-neutral-400">Target: {targetYield}</span>
              </label>
              <input
                type="number"
                min={1}
                value={actualPlatesInput}
                onChange={(e) => setActualPlatesInput(parseInt(e.target.value) || targetYield)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl font-mono font-bold"
              />
              <span className="text-[10px] text-neutral-400">
                If kitchen produces 90 or 95 plates, system recalculates real cost per plate for this batch.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Executive Chef on Shift:</label>
              <input
                type="text"
                required
                value={chefName}
                onChange={(e) => setChefName(e.target.value)}
                className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
              />
              <span className="text-[10px] text-neutral-400">
                Records responsible staff member in production ledger.
              </span>
            </div>
          </div>

          {/* Manager Override Checkbox (Optional fallback rule from User) */}
          {!validation.canCook && (
            <div className="p-3.5 bg-neutral-100 rounded-2xl border border-neutral-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                <input
                  type="checkbox"
                  checked={isManagerOverride}
                  onChange={(e) => setIsManagerOverride(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <ShieldAlert className="w-4 h-4 text-orange-600" />
                <span>Manager Permission Override (Emergency cooking with stock transfer pending)</span>
              </label>

              {isManagerOverride && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    required
                    placeholder="Enter mandatory audit reason (e.g. Emergency shift lunch rush, storekeeper paper pending)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full p-2 text-xs bg-white border border-neutral-300 rounded-xl text-neutral-900"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Logged in Master Audit Trail. Transfer must be completed immediately after shift.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Cost Rollup Preview */}
          <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Batch COGS</span>
              <div className="text-sm font-extrabold font-mono text-neutral-900">
                {formatMoney(validation.totalCost)}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Cost / Plate</span>
              <div className="text-sm font-extrabold font-mono text-blue-700">
                {formatMoney(actualPlatesInput > 0 ? Math.round(validation.totalCost / actualPlatesInput) : 0)}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Food Cost %</span>
              <div className="text-sm font-extrabold font-mono text-emerald-700">
                {(
                  ((validation.totalCost / (actualPlatesInput || targetYield)) /
                    (targetDish?.price || 8000)) *
                  100
                ).toFixed(1)}
                %
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!validation.canCook && !isManagerOverride}
              className={`px-6 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 ${
                validation.canCook || isManagerOverride
                  ? 'bg-orange-600 hover:bg-orange-700 text-white cursor-pointer active:scale-95'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>
                Confirm Batch ({actualPlatesInput} plates) & Deduct Kitchen Stock
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
