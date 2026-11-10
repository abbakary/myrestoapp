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
  History,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import { Recipe, RecipeIngredient, MenuItem, RecipeVersionHistoryItem } from '../../types/restaurant';

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
  isSubRecipe?: boolean;
  subRecipeId?: string;
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
    recipes,
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
  const [isSubRecipe, setIsSubRecipe] = useState<boolean>(recipe?.isSubRecipe || false);
  const [strictKitchenStockMode, setStrictKitchenStockMode] = useState<boolean>(false);
  const [blockedAlert, setBlockedAlert] = useState<{
    ingredientName: string;
    ingredientId: string;
    storeStock: number;
    unit: string;
  } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Available sub-recipes (recipes marked as isSubRecipe)
  const availableSubRecipes = recipes.filter((r) => r.isSubRecipe && r.id !== recipe?.id);

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
          isSubRecipe: ri.isSubRecipe,
          subRecipeId: ri.subRecipeId,
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
    // If strict mode is ON and ingredientId changed, check kitchen stock
    if (strictKitchenStockMode && updates.ingredientId && updates.ingredientId !== rows[index].ingredientId) {
      const ing = ingredients.find((i) => i.id === updates.ingredientId);
      if (ing && (ing.kitchenStockUnits ?? 0) <= 0) {
        setBlockedAlert({
          ingredientName: ing.name,
          ingredientId: ing.id,
          storeStock: ing.storeStockUnits ?? 0,
          unit: ing.consumptionUnit,
        });
        return; // Block change
      }
    }

    setRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleAddRow = (asSubRecipe = false) => {
    if (asSubRecipe && availableSubRecipes.length > 0) {
      const subRec = availableSubRecipes[0];
      setRows((prev) => [
        ...prev,
        {
          ingredientId: subRec.ingredients[0]?.ingredientId || 'ing-beef',
          batchQuantity: 1,
          batchUnit: 'batch',
          yieldPercentage: 100,
          isSubRecipe: true,
          subRecipeId: subRec.id,
          notes: `Sub-recipe: ${subRec.name} (Yield ${subRec.batchYieldPlates} plates)`,
        },
      ]);
      return;
    }

    const availableCandidates = strictKitchenStockMode
      ? ingredients.filter((i) => (i.kitchenStockUnits ?? 0) > 0 && !rows.some((r) => r.ingredientId === i.id))
      : ingredients.filter((i) => !rows.some((r) => r.ingredientId === i.id));

    if (strictKitchenStockMode && availableCandidates.length === 0) {
      setBlockedAlert({
        ingredientName: 'Any additional ingredients',
        ingredientId: '',
        storeStock: 0,
        unit: '',
      });
      return;
    }

    const firstAvailable = availableCandidates[0] || ingredients[0];

    if (strictKitchenStockMode && (firstAvailable.kitchenStockUnits ?? 0) <= 0) {
      setBlockedAlert({
        ingredientName: firstAvailable.name,
        ingredientId: firstAvailable.id,
        storeStock: firstAvailable.storeStockUnits ?? 0,
        unit: firstAvailable.consumptionUnit,
      });
      return;
    }

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

  // Quick transfer from store when blocked in strict mode
  const handleQuickTransferFromStore = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    const isWeight = ing.consumptionUnit === 'grams';
    const isVolume = ing.consumptionUnit === 'ml';
    const transferQty = isWeight || isVolume ? 10000 : 20;

    transferStock({
      ingredientId: ing.id,
      quantityUnits: Math.min(ing.storeStockUnits ?? transferQty, transferQty),
      fromLocation: 'main_store',
      toLocation: 'kitchen',
      reason: `Quick recipe formulation transfer: ${ing.name}`,
      shift: 'Recipe Prep',
    });

    setBlockedAlert(null);
  };

  // Restore past version from history
  const handleRestoreVersion = (historyItem: RecipeVersionHistoryItem) => {
    setBatchYieldPlates(historyItem.batchYieldPlates);
    setRecipeName(historyItem.name || '');
    setCookingMethod(historyItem.cookingMethod || 'on_sale_order');
    setPrepInstructions(historyItem.preparationInstructions || '');

    const restoredRows: EditableIngredientRow[] = historyItem.ingredients.map((ri) => {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      const rawBatchQty = ri.batchQuantity ?? ri.quantity * historyItem.batchYieldPlates;
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
        isSubRecipe: ri.isSubRecipe,
        subRecipeId: ri.subRecipeId,
      };
    });

    setRows(restoredRows);
    setShowHistoryModal(false);
  };

  // Deterministic Cost Rollup
  let totalPlateCost = 0;
  let totalBatchCost = 0;

  const calculatedRows = rows.map((row) => {
    // If this row is a sub-recipe
    if (row.isSubRecipe && row.subRecipeId) {
      const subRec = recipes.find((r) => r.id === row.subRecipeId);
      const subPlateCost = subRec?.ingredients.reduce((sum, si) => {
        const subIng = ingredients.find((i) => i.id === si.ingredientId);
        const uCost = subIng ? subIng.costPerPurchaseUnit / subIng.conversionRatio : 0;
        return sum + uCost * si.quantity;
      }, 0) || 1200;

      const lineCostPerPlate = Math.round(subPlateCost * (row.batchQuantity || 1));
      const lineBatchCost = Math.round(lineCostPerPlate * batchYieldPlates);

      totalPlateCost += lineCostPerPlate;
      totalBatchCost += lineBatchCost;

      return {
        ...row,
        ingredient: null,
        subRecipe: subRec,
        baseBatchQty: row.batchQuantity,
        perPlateDisplay: row.batchQuantity,
        perPlateBaseQty: row.batchQuantity,
        effectivePerPlateQty: row.batchQuantity,
        lineCostPerPlate,
        lineBatchCost,
        kitchenDisplay: 'Sub-Recipe Prep',
        storeDisplay: 'Prepared Daily',
        isTransferred: true,
        isSufficient: true,
      };
    }

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
      subRecipe: null,
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
      isSubRecipe: r.isSubRecipe,
      subRecipeId: r.subRecipeId,
      notes: r.notes || `${r.batchQuantity} ${r.batchUnit} batch ÷ ${batchYieldPlates} plates = ${r.perPlateDisplay.toFixed(3)} ${r.batchUnit} per plate`,
    }));

    const recipeId = recipe?.id || `rec-${Date.now()}`;
    const newVersion = recipe ? recipe.version + 1 : 1;

    const updatedRecipe: Recipe = {
      id: recipeId,
      menuItemId: isSubRecipe ? undefined : selectedMenuItemId,
      name: recipeName || targetDish?.name,
      batchYieldPlates,
      version: newVersion,
      cookingMethod,
      isSubRecipe,
      ingredients: recipeIngredients,
      preparationInstructions: prepInstructions,
      approvedBy: 'Executive Chef Juma',
      approvedAt: new Date().toISOString(),
      history: recipe?.history || [],
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-neutral-900">
                  Recipe Card (BOM Master Data)
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Version {recipe ? `v${recipe.version + 1} (Draft)` : 'v1'}
                </span>
                {isSubRecipe && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Sub-Recipe / Base
                  </span>
                )}
                {recipe?.history && recipe.history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <History className="w-3 h-3 text-neutral-600" />
                    <span>Version History ({recipe.history.length})</span>
                  </button>
                )}
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

        {/* Blocked Alert Banner (Matching exact user spec) */}
        {blockedAlert && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-red-900">
                  ❌ Cannot add {blockedAlert.ingredientName} to this recipe.
                </span>{' '}
                It has not been transferred to the Kitchen floor. Please request it from Main Store first.
                {blockedAlert.storeStock > 0 && (
                  <span className="block text-[11px] text-red-700 font-semibold mt-0.5">
                    Main Store has {blockedAlert.storeStock.toLocaleString()} {blockedAlert.unit} in reserve.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {blockedAlert.ingredientId && blockedAlert.storeStock > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickTransferFromStore(blockedAlert.ingredientId)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>Transfer from Store Now</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setBlockedAlert(null)}
                className="p-1.5 text-red-400 hover:text-red-700 rounded-lg hover:bg-red-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Strict Kitchen Stock Mode & Sub-Recipe Settings Bar */}
        <div className="mx-6 mt-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-800">
              <input
                type="checkbox"
                checked={strictKitchenStockMode}
                onChange={(e) => {
                  setStrictKitchenStockMode(e.target.checked);
                  setBlockedAlert(null);
                }}
                className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
              />
              <span>Strict Kitchen Stock Mode</span>
              <span className="text-[10px] font-normal text-neutral-500">
                (Blocks adding ingredients with 0 Kitchen stock)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
              <input
                type="checkbox"
                checked={isSubRecipe}
                onChange={(e) => setIsSubRecipe(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <span>Mark as Sub-Recipe / Base Dish</span>
              <span className="text-[10px] font-normal text-purple-600">
                (e.g. Beef Stew Base shared across Wali & Ugali)
              </span>
            </label>
          </div>

          <div className="text-[11px] text-neutral-500">
            {strictKitchenStockMode ? (
              <span className="text-orange-700 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Strict Kitchen Gatekeeper Active
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Recipe Formula Mode (Stock checked at cooking)
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveRecipeCard} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Header Metadata: Dish, Sell Price, Yield, Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4.5 bg-neutral-50 rounded-2xl border border-neutral-200">
            <div>
              <label className="text-xs font-semibold text-neutral-600">
                {isSubRecipe ? 'Sub-Recipe Name:' : 'Menu Item:'}
              </label>
              {isSubRecipe ? (
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Beef Stew Base"
                  className="w-full mt-1 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-neutral-900"
                />
              ) : (
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
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">
                {isSubRecipe ? 'Base Prep Valuation:' : 'Sell Price:'}
              </label>
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
            <div className="p-3.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-neutral-900">
                  Raw Ingredients Formulation ({rows.length} lines)
                </span>
                <span className="text-[11px] text-neutral-400">
                  Enter batch quantities as cook actually thinks
                </span>
              </div>

              <div className="flex items-center gap-2">
                {availableSubRecipes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAddRow(true)}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg transition-colors border border-purple-200"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Add Sub-Recipe</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAddRow(false)}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Ingredient Line</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100/70 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3">Ingredient / Sub-Recipe</th>
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
                      {/* Ingredient or Sub-Recipe Selector */}
                      <td className="py-2.5 px-3">
                        {row.isSubRecipe ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              Base
                            </span>
                            <select
                              value={row.subRecipeId}
                              onChange={(e) => handleUpdateRow(idx, { subRecipeId: e.target.value })}
                              className="w-44 text-xs font-bold bg-white border border-purple-300 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-purple-500"
                            >
                              {availableSubRecipes.map((sr) => (
                                <option key={sr.id} value={sr.id}>
                                  {sr.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
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
                        )}
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
                        {row.isSubRecipe ? (
                          <span className="text-xs font-mono text-purple-800 font-semibold">portion</span>
                        ) : (
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
                        )}
                      </td>

                      {/* Per Plate (Auto calculated by code) */}
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-950 bg-orange-50/30">
                        {row.perPlateDisplay.toFixed(3)} {row.batchUnit}
                        {!row.isSubRecipe && (
                          <span className="block text-[10px] text-neutral-400 font-normal">
                            ({row.effectivePerPlateQty.toFixed(1)} {row.ingredient?.consumptionUnit})
                          </span>
                        )}
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

        {/* Version History Drawer Modal */}
        {showHistoryModal && recipe?.history && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full border border-neutral-200 shadow-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-neutral-900">
                    Recipe Version History: {recipe.name}
                  </h3>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                Audit trail of changes made by chefs over time. If a chef adjusts ingredient batch quantities (e.g. rice 22kg to 20kg), previous version snapshots are preserved for costing accuracy.
              </p>

              <div className="space-y-3">
                {recipe.history.map((hist) => (
                  <div
                    key={hist.version}
                    className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                          v{hist.version}
                        </span>
                        <span className="text-xs font-bold text-neutral-900">
                          Yield: {hist.batchYieldPlates} plates
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {new Date(hist.archivedAt || hist.changedAt || Date.now()).toLocaleDateString()} by {hist.archivedBy || hist.changedBy || 'Chef'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(hist)}
                        className="px-2.5 py-1 text-xs font-bold text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore v{hist.version}</span>
                      </button>
                    </div>

                    <p className="text-xs text-neutral-700 italic">
                      "{hist.changeSummary}"
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-xl border border-neutral-100">
                      <div>
                        <span className="text-neutral-400">Plate Cost: </span>
                        <span className="font-mono font-bold text-blue-900">
                          {formatMoney(hist.totalCostPerPlate ?? hist.costPerPlate ?? 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-400">Food Cost %: </span>
                        <span className="font-mono font-bold text-emerald-800">
                          {hist.foodCostPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Ingredients summary */}
                    <div className="text-[11px] text-neutral-500 flex flex-wrap gap-2 pt-1 border-t border-neutral-200/60">
                      {hist.ingredients.map((hi, i) => {
                        const ing = ingredients.find((ingred) => ingred.id === hi.ingredientId);
                        return (
                          <span key={i} className="bg-neutral-100 px-2 py-0.5 rounded">
                            {ing?.name || hi.ingredientId}: {hi.batchQuantity ? (hi.batchQuantity / 1000).toFixed(1) : (hi.quantity / 1000).toFixed(1)} {hi.batchUnit || 'kg'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
