import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  Info,
  Layers,
  ChefHat,
  Warehouse,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe, RecipeIngredient, MenuItem } from '../../types/restaurant';

interface RecipeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  defaultMenuItemId?: string;
}

interface EditableIngredientRow {
  ingredientId: string;
  batchQuantity: number;
  batchUnit: string;
  yieldPercentage: number;
  notes?: string;
}

export const RecipeCardModal: React.FC<RecipeCardModalProps> = ({
  isOpen,
  onClose,
  recipe,
  defaultMenuItemId,
}) => {
  const {
    menuItems,
    ingredients,
    formatMoney,
    saveRecipe,
    transferStock,
  } = useRestaurant();

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(
    recipe?.menuItemId || defaultMenuItemId || menuItems[0]?.id || ''
  );
  const [recipeName, setRecipeName] = useState<string>(
    recipe?.name || 'Wali Nyama (Beef Stew with Rice)'
  );
  const [batchYieldPlates, setBatchYieldPlates] = useState<number>(
    recipe?.batchYieldPlates || 100
  );
  const [cookingMethod, setCookingMethod] = useState<'batch_cooking' | 'on_sale_order'>(
    recipe?.cookingMethod || 'batch_cooking'
  );
  const [prepInstructions, setPrepInstructions] = useState<string>(
    recipe?.preparationInstructions || ''
  );
  const [version, setVersion] = useState<number>(recipe?.version || 1);

  // Rows of ingredients with batch quantities
  const [rows, setRows] = useState<EditableIngredientRow[]>(() => {
    if (recipe && recipe.ingredients && recipe.ingredients.length > 0) {
      return recipe.ingredients.map((ri) => {
        const ing = ingredients.find((i) => i.id === ri.ingredientId);
        // Default batch quantity: either stored batchQuantity, or ri.quantity * batchYieldPlates
        const rawBatchQty = ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 100);
        // Convert to display unit (e.g. grams -> kg)
        const isWeight = ing?.consumptionUnit === 'grams';
        const isVolume = ing?.consumptionUnit === 'ml';
        const displayBatch = isWeight || isVolume ? rawBatchQty / 1000 : rawBatchQty;
        const displayUnit = ri.batchUnit || (isWeight ? 'kg' : isVolume ? 'L' : ing?.consumptionUnit || 'pcs');

        return {
          ingredientId: ri.ingredientId,
          batchQuantity: displayBatch,
          batchUnit: displayUnit,
          yieldPercentage: ri.yieldPercentage || 100,
          notes: ri.notes,
        };
      });
    }

    // Default template matching user specification: Wali Nyama (Rice, Beef, Oil, Onions, Tomatoes, Salt)
    return [
      { ingredientId: 'ing-rice', batchQuantity: 20, batchUnit: 'kg', yieldPercentage: 100 },
      { ingredientId: 'ing-beef', batchQuantity: 15, batchUnit: 'kg', yieldPercentage: 90 },
      { ingredientId: 'ing-oil', batchQuantity: 2, batchUnit: 'L', yieldPercentage: 100 },
      { ingredientId: 'ing-onions', batchQuantity: 3, batchUnit: 'kg', yieldPercentage: 90 },
      { ingredientId: 'ing-tomatoes', batchQuantity: 2, batchUnit: 'kg', yieldPercentage: 92 },
      { ingredientId: 'ing-salt', batchQuantity: 0.3, batchUnit: 'kg', yieldPercentage: 100 },
    ];
  });

  if (!isOpen) return null;

  const targetDish = menuItems.find((m) => m.id === selectedMenuItemId);
  const sellPrice = targetDish?.price || 8000;

  // Row update handlers
  const handleUpdateRow = (index: number, updates: Partial<EditableIngredientRow>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleAddRow = () => {
    const firstAvailable = ingredients.find(
      (i) => !rows.some((r) => r.ingredientId === i.id)
    ) || ingredients[0];

    const isWeight = firstAvailable?.consumptionUnit === 'grams';
    const isVolume = firstAvailable?.consumptionUnit === 'ml';

    setRows((prev) => [
      ...prev,
      {
        ingredientId: firstAvailable?.id || 'ing-potatoes',
        batchQuantity: 1,
        batchUnit: isWeight ? 'kg' : isVolume ? 'L' : firstAvailable?.consumptionUnit || 'pcs',
        yieldPercentage: 100,
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Deterministic Cost Rollup
  let totalPlateCost = 0;
  let totalBatchCost = 0;

  const calculatedRows = rows.map((row) => {
    const ing = ingredients.find((i) => i.id === row.ingredientId);
    const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0; // cost per gram/ml/pc
    const isWeight = ing?.consumptionUnit === 'grams';
    const isVolume = ing?.consumptionUnit === 'ml';

    // Normalize batch qty to base consumption unit
    const multiplier = (isWeight && row.batchUnit === 'kg') || (isVolume && row.batchUnit === 'L') ? 1000 : 1;
    const baseBatchQty = row.batchQuantity * multiplier;

    // Per-plate auto-calculated: baseBatchQty / batchYieldPlates
    const perPlateBaseQty = batchYieldPlates > 0 ? baseBatchQty / batchYieldPlates : 0;
    const yieldFactor = Math.max(0.1, (row.yieldPercentage || 100) / 100);
    const effectivePerPlateQty = perPlateBaseQty / yieldFactor;

    // Display per-plate quantity
    const perPlateDisplay = isWeight || isVolume ? perPlateBaseQty / 1000 : perPlateBaseQty;
    const lineCostPerPlate = Math.round(effectivePerPlateQty * unitCost);
    const lineBatchCost = Math.round(lineCostPerPlate * batchYieldPlates);

    totalPlateCost += lineCostPerPlate;
    totalBatchCost += lineBatchCost;

    // Live kitchen and store stock
    const kitchenStockBase = ing?.kitchenStockUnits ?? 0;
    const storeStockBase = ing?.storeStockUnits ?? 0;
    const kitchenDisplay = isWeight || isVolume ? (kitchenStockBase / 1000).toFixed(1) : kitchenStockBase;
    const storeDisplay = isWeight || isVolume ? (storeStockBase / 1000).toFixed(1) : storeStockBase;

    // Kitchen readiness check for this batch
    const isTransferred = kitchenStockBase > 0;
    const isSufficient = kitchenStockBase >= baseBatchQty;

    return {
      ...row,
      ingredient: ing,
      baseBatchQty,
      perPlateDisplay,
      perPlateBaseQty,
      effectivePerPlateQty,
      lineCostPerPlate,
      lineBatchCost,
      kitchenDisplay,
      storeDisplay,
      isTransferred,
      isSufficient,
    };
  });

  const grossContribution = Math.max(0, sellPrice - totalPlateCost);
  const foodCostPercentage = sellPrice > 0 ? (totalPlateCost / sellPrice) * 100 : 0;

  // Handle Save
  const handleSaveRecipeCard = (e: React.FormEvent) => {
    e.preventDefault();

    if (batchYieldPlates <= 0) {
      alert('Recipe yield is mandatory. Please enter number of plates per batch (e.g. 100).');
      return;
    }

    if (rows.length === 0) {
      alert('Please add at least one raw ingredient from the catalogue.');
      return;
    }

    const recipeIngredients: RecipeIngredient[] = calculatedRows.map((r) => ({
      ingredientId: r.ingredientId,
      quantity: Math.round(r.effectivePerPlateQty * 10) / 10, // consumption unit per plate
      batchQuantity: r.baseBatchQty, // base unit per batch
      batchUnit: r.batchUnit,
      yieldPercentage: r.yieldPercentage,
      notes: r.notes || `${r.batchQuantity} ${r.batchUnit} batch ÷ ${batchYieldPlates} plates = ${r.perPlateDisplay.toFixed(3)} ${r.batchUnit} per plate`,
    }));

    const recipeId = recipe?.id || `rec-${Date.now()}`;
    const newVersion = recipe ? recipe.version + 1 : 1;

    const updatedRecipe: Recipe = {
      id: recipeId,
      menuItemId: selectedMenuItemId,
      name: recipeName || targetDish?.name,
      batchYieldPlates,
      version: newVersion,
      cookingMethod,
      ingredients: recipeIngredients,
      preparationInstructions: prepInstructions,
      approvedBy: 'Executive Chef Juma',
      approvedAt: new Date().toISOString(),
    };

    saveRecipe(updatedRecipe, {
      recipeId,
      dishName: targetDish?.name || recipeName,
      rawInputText: `Manual Recipe Card: ${recipeName} (${batchYieldPlates} plates batch)`,
      suggestedIngredientsCount: recipeIngredients.length,
      approvedIngredientsCount: recipeIngredients.length,
      avgConfidence: 100,
      anomaliesDetected: foodCostPercentage > 45 ? [`High food cost % (${foodCostPercentage.toFixed(1)}%)`] : [],
      approvedBy: 'Executive Chef Juma',
      totalCostPerPlate: totalPlateCost,
      foodCostPercentage,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-neutral-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-100 flex items-center justify-between bg-gradient-to-r from-orange-50/60 via-amber-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
              <ChefHat className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-neutral-900">
                  Recipe Card (BOM Master Data)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Version {recipe ? `v${recipe.version + 1} (Draft)` : 'v1'}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Formula: Batch raw ingredients ÷ Recipe Yield plates = Per-plate usage driving stock deduction & costing.
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

        {/* Form Body */}
        <form onSubmit={handleSaveRecipeCard} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Header Metadata: Dish, Sell Price, Yield, Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200">
            <div>
              <label className="text-xs font-semibold text-neutral-600">Menu Item:</label>
              <select
                value={selectedMenuItemId}
                onChange={(e) => {
                  setSelectedMenuItemId(e.target.value);
                  const d = menuItems.find((m) => m.id === e.target.value);
                  if (d) setRecipeName(d.name);
                }}
                className="w-full mt-1 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-900"
              >
                {menuItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Sell Price:</label>
              <div className="mt-1 text-sm font-extrabold font-mono text-neutral-900 py-1.5 px-3 bg-white border border-neutral-200 rounded-xl">
                {formatMoney(sellPrice)}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600 flex items-center justify-between">
                <span>Recipe Yield (Batch):</span>
                <span className="text-[10px] text-orange-600 font-bold">Mandatory</span>
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  required
                  value={batchYieldPlates}
                  onChange={(e) => setBatchYieldPlates(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-center"
                />
                <span className="text-xs text-neutral-500 font-bold">plates</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Stock Deduction Mode:</label>
              <select
                value={cookingMethod}
                onChange={(e) => setCookingMethod(e.target.value as any)}
                className="w-full mt-1 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-900"
              >
                <option value="batch_cooking">Batch Cooking (Big Pot/Buffet)</option>
                <option value="on_sale_order">On Sale (Made-to-Order)</option>
              </select>
            </div>
          </div>

          {/* Recipe Card Table matching User Spec */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs space-y-0">
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Raw Ingredients Formulation ({rows.length} lines)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Enter batch quantities as cook actually thinks
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient Line</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Ingredient</th>
                    <th className="py-2.5 px-3">Qty (Batch)</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Per Plate (Auto)</th>
                    <th className="py-2.5 px-3">Kitchen Stock</th>
                    <th className="py-2.5 px-3">Store Stock</th>
                    <th className="py-2.5 px-3 text-right">Cost / Plate</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {calculatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Ingredient Selector */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.ingredientId}
                          onChange={(e) => {
                            const newIng = ingredients.find((i) => i.id === e.target.value);
                            const isWeight = newIng?.consumptionUnit === 'grams';
                            const isVolume = newIng?.consumptionUnit === 'ml';
                            handleUpdateRow(idx, {
                              ingredientId: e.target.value,
                              batchUnit: isWeight ? 'kg' : isVolume ? 'L' : newIng?.consumptionUnit || 'pcs',
                            });
                          }}
                          className="w-48 text-xs font-bold bg-white border border-neutral-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-orange-500"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Qty (Batch) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          step="any"
                          min={0.001}
                          required
                          value={row.batchQuantity}
                          onChange={(e) =>
                            handleUpdateRow(idx, {
                              batchQuantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.batchUnit}
                          onChange={(e) => handleUpdateRow(idx, { batchUnit: e.target.value })}
                          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono"
                        >
                          <option value="kg">kg</option>
                          <option value="L">L</option>
                          <option value="g">g</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </td>

                      {/* Per Plate (Auto calculated by code) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-950 bg-orange-50/30">
                        {row.perPlateDisplay.toFixed(3)} {row.batchUnit}
                        <span className="block text-[10px] text-neutral-400 font-normal">
                          ({row.effectivePerPlateQty.toFixed(1)} {row.ingredient?.consumptionUnit})
                        </span>
                      </td>

                      {/* Kitchen Stock Live Indicator */}
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            !row.isTransferred
                              ? 'bg-red-100 text-red-800'
                              : !row.isSufficient
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {row.kitchenDisplay} {row.batchUnit}
                          {!row.isTransferred && ' (0 in Kitchen)'}
                          {row.isTransferred && !row.isSufficient && ' (Short)'}
                        </span>
                      </td>

                      {/* Store Stock Live */}
                      <td className="py-2.5 px-3 font-mono text-neutral-600">
                        {row.storeDisplay} {row.batchUnit}
                      </td>

                      {/* Cost / Plate */}
                      <td className="py-2.5 px-3 font-mono font-bold text-right text-neutral-900">
                        {formatMoney(row.lineCostPerPlate)}
                      </td>

                      {/* Remove */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="p-1 text-neutral-300 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Rollup Banner */}
            <div className="p-4 bg-neutral-50/70 border-t border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-neutral-500">Total Batch COGS</span>
                <div className="text-base font-extrabold font-mono text-neutral-900 mt-0.5">
                  {formatMoney(totalBatchCost)}
                </div>
                <span className="text-[10px] text-neutral-400">For {batchYieldPlates} plates</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-500">Per Plate Cost</span>
                <div className="text-base font-extrabold font-mono text-blue-700 mt-0.5">
                  {formatMoney(totalPlateCost)}
                </div>
                <span className="text-[10px] text-neutral-400">Direct ingredient usage</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-500">Gross Margin</span>
                <div className="text-base font-extrabold font-mono text-emerald-700 mt-0.5">
                  {formatMoney(grossContribution)}
                </div>
                <span className="text-[10px] text-neutral-400">Profit per plate</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-neutral-500">Food Cost %</span>
                <div
                  className={`text-base font-extrabold font-mono mt-0.5 ${
                    foodCostPercentage <= 35
                      ? 'text-emerald-700'
                      : foodCostPercentage <= 45
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {foodCostPercentage.toFixed(1)}%
                </div>
                <span className="text-[10px] text-neutral-400">Target: 28% – 35%</span>
              </div>
            </div>
          </div>

          {/* Preparation Instructions */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700">Preparation Instructions:</label>
            <textarea
              rows={2}
              value={prepInstructions}
              onChange={(e) => setPrepInstructions(e.target.value)}
              placeholder="e.g. Wash rice, steam in cooker. Brown onions in oil, simmer beef tenderloin with tomatoes for 1.5 hours."
              className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Save Recipe Card (BOM Master Data)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
