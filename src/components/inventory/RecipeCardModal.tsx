import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  ChefHat,
  Warehouse,
  History,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Recipe,
  RecipeIngredient,
  RecipeVersionHistoryItem,
  ProductionMethod,
  RecipeStatus,
  RecipeVariant,
  RecipeModifierRule,
  KitchenStation,
} from '../../types/restaurant';

interface RecipeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  defaultMenuItemId?: string;
  defaultIsSubRecipe?: boolean;
}

interface EditableIngredientRow {
  ingredientId: string;
  batchQuantity: number;
  batchUnit: string;
  yieldPercentage: number;
  notes?: string;
  isSubRecipe?: boolean;
  subRecipeId?: string;
  subRecipeQuantity?: number;
  subRecipeUnit?: string;
  substituteIngredientId?: string;
  isOptional?: boolean;
}

export const RecipeCardModal: React.FC<RecipeCardModalProps> = ({
  isOpen,
  onClose,
  recipe,
  defaultMenuItemId,
  defaultIsSubRecipe = false,
}) => {
  const {
    menuItems,
    ingredients,
    recipes,
    formatMoney,
    saveRecipe,
    transferStock,
    computeRecipeUnitCost,
  } = useRestaurant();

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(
    recipe?.menuItemId || defaultMenuItemId || menuItems[0]?.id || ''
  );
  const [recipeCode, setRecipeCode] = useState<string>(
    recipe?.code || (defaultIsSubRecipe ? `SUB-00${recipes.filter((r) => r.isSubRecipe).length + 1}` : `RCP-00${recipes.length + 1}`)
  );
  const [recipeName, setRecipeName] = useState<string>(
    recipe?.name || (defaultIsSubRecipe ? 'Prepared Sauce Base' : 'Wali Nyama (Beef Stew with Rice)')
  );
  const [category, setCategory] = useState<string>(recipe?.category || 'Main Course');
  const [productionLocation, setProductionLocation] = useState<KitchenStation | 'prep_kitchen'>(
    recipe?.productionLocation || (defaultIsSubRecipe ? 'prep_kitchen' : 'hot_kitchen')
  );
  const [productionMethod, setProductionMethod] = useState<ProductionMethod>(
    recipe?.productionMethod || 'recipe_bom'
  );
  const [status, setStatus] = useState<RecipeStatus>(recipe?.status || 'approved');
  const [batchYieldPlates, setBatchYieldPlates] = useState<number>(recipe?.batchYieldPlates || 100);
  const [yieldUnit, setYieldUnit] = useState<string>(
    recipe?.yieldUnit || (defaultIsSubRecipe ? 'grams' : 'plates')
  );
  const [standardPortionSize, setStandardPortionSize] = useState<string>(
    recipe?.standardPortionSize || '1 Plate (350g)'
  );
  const [expectedYieldPct, setExpectedYieldPct] = useState<number>(recipe?.expectedYieldPct || 95);
  const [shelfLifeHours, setShelfLifeHours] = useState<number>(recipe?.shelfLifeHours || 24);
  const [allergensText, setAllergensText] = useState<string>((recipe?.allergens || []).join(', '));

  const [cookingMethod, setCookingMethod] = useState<'batch_cooking' | 'on_sale_order'>(
    recipe?.cookingMethod || 'batch_cooking'
  );
  const [prepInstructions, setPrepInstructions] = useState<string>(
    recipe?.preparationInstructions || ''
  );
  const [cookingInstructions, setCookingInstructions] = useState<string>(
    recipe?.cookingInstructions || ''
  );
  const [isSubRecipe, setIsSubRecipe] = useState<boolean>(recipe?.isSubRecipe ?? defaultIsSubRecipe);
  const [strictKitchenStockMode, setStrictKitchenStockMode] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [blockedAlert, setBlockedAlert] = useState<{
    ingredientName: string;
    ingredientId: string;
    storeStock: number;
    unit: string;
  } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'ingredients' | 'variants' | 'sop'>('ingredients');

  const [variants, setVariants] = useState<RecipeVariant[]>(recipe?.variants || []);
  const [modifierRules, setModifierRules] = useState<RecipeModifierRule[]>(recipe?.modifierRules || []);

  const availableSubRecipes = recipes.filter((r) => r.isSubRecipe && r.id !== recipe?.id);

  const buildRowsFromRecipe = (target?: Recipe | null): EditableIngredientRow[] => {
    if (target && target.ingredients && target.ingredients.length > 0) {
      return target.ingredients.map((ri) => {
        if (ri.isSubRecipe && ri.subRecipeId) {
          const batchQty = ri.batchQuantity ?? (ri.subRecipeQuantity || ri.quantity) * (target.batchYieldPlates || 1);
          return {
            ingredientId: ri.ingredientId,
            batchQuantity: batchQty,
            batchUnit: ri.batchUnit || ri.subRecipeUnit || 'portions',
            yieldPercentage: ri.yieldPercentage || 100,
            notes: ri.notes,
            isSubRecipe: true,
            subRecipeId: ri.subRecipeId,
            subRecipeQuantity: ri.subRecipeQuantity || ri.quantity,
            subRecipeUnit: ri.subRecipeUnit || 'portions',
            isOptional: ri.isOptional,
          };
        }

        const ing = ingredients.find((i) => i.id === ri.ingredientId);
        const rawBatchQty = ri.batchQuantity ?? ri.quantity * (target.batchYieldPlates || 100);
        const isWeight = ing?.consumptionUnit === 'grams';
        const isVolume = ing?.consumptionUnit === 'ml';
        const displayBatch =
          ri.batchUnit === 'g' || ri.batchUnit === 'ml'
            ? rawBatchQty
            : isWeight || isVolume
            ? rawBatchQty / 1000
            : rawBatchQty;
        const displayUnit =
          ri.batchUnit || (isWeight ? 'kg' : isVolume ? 'L' : ing?.consumptionUnit || 'pcs');

        return {
          ingredientId: ri.ingredientId,
          batchQuantity: Number(displayBatch.toFixed(3)),
          batchUnit: displayUnit,
          yieldPercentage: ri.yieldPercentage || 100,
          notes: ri.notes,
          substituteIngredientId: ri.substituteIngredientId,
          isOptional: ri.isOptional,
        };
      });
    }

    return [
      { ingredientId: 'ing-rice', batchQuantity: 20, batchUnit: 'kg', yieldPercentage: 100 },
      { ingredientId: 'ing-beef', batchQuantity: 15, batchUnit: 'kg', yieldPercentage: 90 },
      { ingredientId: 'ing-oil', batchQuantity: 2, batchUnit: 'L', yieldPercentage: 100 },
      { ingredientId: 'ing-onions', batchQuantity: 3, batchUnit: 'kg', yieldPercentage: 90 },
      { ingredientId: 'ing-tomatoes', batchQuantity: 2, batchUnit: 'kg', yieldPercentage: 92 },
      { ingredientId: 'ing-salt', batchQuantity: 0.3, batchUnit: 'kg', yieldPercentage: 100 },
    ];
  };

  const [rows, setRows] = useState<EditableIngredientRow[]>(() => buildRowsFromRecipe(recipe));

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    setBlockedAlert(null);
    setSelectedMenuItemId(recipe?.menuItemId || defaultMenuItemId || menuItems[0]?.id || '');
    setRecipeCode(
      recipe?.code ||
        (defaultIsSubRecipe
          ? `SUB-00${recipes.filter((r) => r.isSubRecipe).length + 1}`
          : `RCP-00${recipes.length + 1}`)
    );
    setRecipeName(
      recipe?.name ||
        menuItems.find((m) => m.id === defaultMenuItemId)?.name ||
        (defaultIsSubRecipe ? 'Prepared Sauce Base' : 'Standardized Dish Recipe')
    );
    setCategory(recipe?.category || 'Main Course');
    setProductionLocation(recipe?.productionLocation || (defaultIsSubRecipe ? 'prep_kitchen' : 'hot_kitchen'));
    setProductionMethod(recipe?.productionMethod || 'recipe_bom');
    setStatus(recipe?.status || 'approved');
    setBatchYieldPlates(recipe?.batchYieldPlates || (defaultIsSubRecipe ? 5000 : 100));
    setYieldUnit(recipe?.yieldUnit || (defaultIsSubRecipe ? 'grams' : 'plates'));
    setStandardPortionSize(recipe?.standardPortionSize || '1 Plate (350g)');
    setExpectedYieldPct(recipe?.expectedYieldPct || 95);
    setShelfLifeHours(recipe?.shelfLifeHours || 24);
    setAllergensText((recipe?.allergens || []).join(', '));
    setCookingMethod(recipe?.cookingMethod || 'batch_cooking');
    setPrepInstructions(recipe?.preparationInstructions || '');
    setCookingInstructions(recipe?.cookingInstructions || '');
    setIsSubRecipe(recipe?.isSubRecipe ?? defaultIsSubRecipe);
    setVariants(recipe?.variants || []);
    setModifierRules(recipe?.modifierRules || []);
    setRows(buildRowsFromRecipe(recipe));
  }, [isOpen, recipe, defaultMenuItemId, defaultIsSubRecipe]);

  if (!isOpen) return null;

  const targetDish = menuItems.find((m) => m.id === selectedMenuItemId);
  const sellPrice = targetDish?.price || 8000;

  const handleUpdateRow = (index: number, updates: Partial<EditableIngredientRow>) => {
    if (strictKitchenStockMode && updates.ingredientId && updates.ingredientId !== rows[index].ingredientId) {
      const ing = ingredients.find((i) => i.id === updates.ingredientId);
      if (ing && (ing.kitchenStockUnits ?? 0) <= 0) {
        setBlockedAlert({
          ingredientName: ing.name,
          ingredientId: ing.id,
          storeStock: ing.storeStockUnits ?? 0,
          unit: ing.consumptionUnit,
        });
        return;
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
      const defaultPerPortion = subRec.yieldUnit === 'grams' ? 50 : 1;
      setRows((prev) => [
        ...prev,
        {
          ingredientId: subRec.id,
          batchQuantity: defaultPerPortion * (batchYieldPlates || 1),
          batchUnit: subRec.yieldUnit || 'portions',
          yieldPercentage: 100,
          isSubRecipe: true,
          subRecipeId: subRec.id,
          subRecipeQuantity: defaultPerPortion,
          subRecipeUnit: subRec.yieldUnit || 'portions',
          notes: `Sub-recipe: ${subRec.name}`,
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

    if (strictKitchenStockMode && firstAvailable && (firstAvailable.kitchenStockUnits ?? 0) <= 0) {
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

  const handleRestoreVersion = (historyItem: RecipeVersionHistoryItem) => {
    setBatchYieldPlates(historyItem.batchYieldPlates);
    setRecipeName(historyItem.name || '');
    setCookingMethod(historyItem.cookingMethod || 'on_sale_order');
    if (historyItem.productionMethod) setProductionMethod(historyItem.productionMethod);
    setPrepInstructions(historyItem.preparationInstructions || '');
    setCookingInstructions(historyItem.cookingInstructions || '');
    setRows(
      buildRowsFromRecipe({
        ...(recipe || {
          id: 'temp',
          batchYieldPlates: historyItem.batchYieldPlates,
          version: historyItem.version,
          cookingMethod: historyItem.cookingMethod || 'on_sale_order',
          ingredients: historyItem.ingredients,
        }),
        ingredients: historyItem.ingredients,
        batchYieldPlates: historyItem.batchYieldPlates,
      })
    );
    setShowHistoryModal(false);
  };

  // Deterministic Cost Rollup
  let totalPlateCost = 0;
  let totalBatchCost = 0;

  const calculatedRows = rows.map((row) => {
    if (row.isSubRecipe && row.subRecipeId) {
      const subRec = recipes.find((r) => r.id === row.subRecipeId);
      const subCostInfo = subRec ? computeRecipeUnitCost(subRec.id) : { unitCost: 1200, batchCost: 1200, perPlateCost: 1200 };
      const perServingQty = batchYieldPlates > 0 ? (row.batchQuantity || 0) / batchYieldPlates : 0;
      const lineCostPerPlate = subCostInfo.unitCost * perServingQty;
      const lineBatchCost = subCostInfo.unitCost * (row.batchQuantity || 0);

      totalPlateCost += lineCostPerPlate;
      totalBatchCost += lineBatchCost;

      return {
        ...row,
        ingredient: null,
        subRecipe: subRec,
        baseBatchQty: row.batchQuantity,
        perPlateDisplay: perServingQty,
        perPlateBaseQty: perServingQty,
        effectivePerPlateQty: perServingQty,
        lineCostPerPlate: Math.round(lineCostPerPlate),
        lineBatchCost: Math.round(lineBatchCost),
        kitchenDisplay: 'Sub-Recipe',
        storeDisplay: 'Prepared Pool',
        isTransferred: true,
        isSufficient: true,
      };
    }

    const ing = ingredients.find((i) => i.id === row.ingredientId);
    const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const isWeight = ing?.consumptionUnit === 'grams';
    const isVolume = ing?.consumptionUnit === 'ml';

    const multiplier = (isWeight && row.batchUnit === 'kg') || (isVolume && row.batchUnit === 'L') ? 1000 : 1;
    const baseBatchQty = row.batchQuantity * multiplier;

    const perPlateBaseQty = batchYieldPlates > 0 ? baseBatchQty / batchYieldPlates : 0;
    const yieldFactor = Math.max(0.1, (row.yieldPercentage || 100) / 100);
    const effectivePerPlateQty = perPlateBaseQty / yieldFactor;

    const perPlateDisplay = isWeight || isVolume ? perPlateBaseQty / 1000 : perPlateBaseQty;
    const lineCostPerPlate = effectivePerPlateQty * unitCost;
    const lineBatchCost = lineCostPerPlate * batchYieldPlates;

    totalPlateCost += lineCostPerPlate;
    totalBatchCost += lineBatchCost;

    const kitchenStockBase = ing?.kitchenStockUnits ?? 0;
    const storeStockBase = ing?.storeStockUnits ?? 0;
    const kitchenDisplay = isWeight || isVolume ? (kitchenStockBase / 1000).toFixed(1) : kitchenStockBase;
    const storeDisplay = isWeight || isVolume ? (storeStockBase / 1000).toFixed(1) : storeStockBase;

    return {
      ...row,
      ingredient: ing,
      subRecipe: null,
      baseBatchQty,
      perPlateDisplay,
      perPlateBaseQty,
      effectivePerPlateQty,
      lineCostPerPlate: Math.round(lineCostPerPlate),
      lineBatchCost: Math.round(lineBatchCost),
      kitchenDisplay,
      storeDisplay,
      isTransferred: kitchenStockBase > 0,
      isSufficient: kitchenStockBase >= baseBatchQty,
    };
  });

  const roundedPlateCost = Math.round(totalPlateCost);
  const roundedBatchCost = Math.round(totalBatchCost);
  const grossContribution = Math.max(0, sellPrice - roundedPlateCost);
  const foodCostPercentage = sellPrice > 0 ? (roundedPlateCost / sellPrice) * 100 : 0;

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}`,
        name: prev.length === 0 ? 'Small' : prev.length === 1 ? 'Large' : `Portion ${prev.length + 1}`,
        portionMultiplier: prev.length === 0 ? 0.75 : 1.35,
      },
    ]);
  };

  const handleAddModifierRule = () => {
    const firstIng = ingredients[0];
    if (!firstIng) return;
    setModifierRules((prev) => [
      ...prev,
      {
        id: `mod-${Date.now()}`,
        modifierName: 'Extra Portion',
        action: 'add',
        ingredientId: firstIng.id,
        quantityDelta: firstIng.consumptionUnit === 'grams' ? 50 : 1,
      },
    ]);
  };

  const handleSaveRecipeCard = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (batchYieldPlates <= 0) {
      setValidationError('Recipe yield must be greater than zero.');
      return;
    }

    if (productionMethod !== 'direct_stock' && rows.length === 0) {
      setValidationError('Please add at least one ingredient or sub-recipe line, or switch Method to Direct Stock Consumption.');
      return;
    }

    const recipeIngredients: RecipeIngredient[] = calculatedRows.map((r) => ({
      ingredientId: r.isSubRecipe && r.subRecipeId ? r.subRecipeId : r.ingredientId,
      quantity: Math.round(r.effectivePerPlateQty * 1000) / 1000,
      batchQuantity: r.baseBatchQty,
      batchUnit: r.batchUnit,
      yieldPercentage: r.yieldPercentage,
      isSubRecipe: r.isSubRecipe,
      subRecipeId: r.subRecipeId,
      subRecipeQuantity: r.isSubRecipe ? Math.round(r.effectivePerPlateQty * 1000) / 1000 : undefined,
      subRecipeUnit: r.isSubRecipe ? r.batchUnit : undefined,
      substituteIngredientId: r.substituteIngredientId || undefined,
      isOptional: r.isOptional,
      notes:
        r.notes ||
        `${r.batchQuantity} ${r.batchUnit} batch / ${batchYieldPlates} ${yieldUnit}`,
    }));

    const recipeId = recipe?.id || `${isSubRecipe ? 'rec-sub-' : 'rec-'}${Date.now()}`;
    const newVersion = recipe ? recipe.version + 1 : 1;

    const parsedAllergens = allergensText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedRecipe: Recipe = {
      id: recipeId,
      code: recipeCode.trim() || undefined,
      menuItemId: isSubRecipe ? undefined : selectedMenuItemId,
      name: recipeName || targetDish?.name,
      category: category.trim() || undefined,
      productionLocation,
      productionMethod,
      status,
      standardPortionSize: standardPortionSize.trim() || undefined,
      yieldUnit,
      expectedYieldPct,
      shelfLifeHours,
      allergens: parsedAllergens,
      batchYieldPlates,
      version: newVersion,
      cookingMethod: isSubRecipe ? 'batch_cooking' : cookingMethod,
      isSubRecipe,
      ingredients: recipeIngredients,
      variants: variants.length > 0 ? variants : undefined,
      modifierRules: modifierRules.length > 0 ? modifierRules : undefined,
      preparationInstructions: prepInstructions,
      cookingInstructions,
      approvedBy: status === 'approved' ? 'Executive Chef Juma' : undefined,
      approvedAt: status === 'approved' ? new Date().toISOString() : undefined,
      history: recipe?.history || [],
    };

    saveRecipe(updatedRecipe, {
      recipeId,
      dishName: targetDish?.name || recipeName,
      rawInputText: `Recipe Card ${recipeCode}: ${recipeName} (${batchYieldPlates} ${yieldUnit} · ${productionMethod})`,
      suggestedIngredientsCount: recipeIngredients.length,
      approvedIngredientsCount: recipeIngredients.length,
      avgConfidence: 100,
      anomaliesDetected:
        !isSubRecipe && foodCostPercentage > 45
          ? [`High food cost % (${foodCostPercentage.toFixed(1)}%)`]
          : [],
      approvedBy: 'Executive Chef Juma',
      totalCostPerPlate: roundedPlateCost,
      foodCostPercentage,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
              <ChefHat className="w-4 h-4 text-orange-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <h2 className="font-bold text-neutral-900">
                  Standardized Recipe Card
                </h2>
                <span className="text-neutral-300">·</span>
                <span className="font-mono text-xs text-neutral-600">
                  {recipeCode} · v{recipe ? recipe.version + 1 : 1}
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-semibold text-neutral-700 capitalize">
                  {isSubRecipe ? 'Sub-Recipe Base' : productionMethod.replace('_', ' ')}
                </span>
                {recipe?.history && recipe.history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="ml-2 text-xs font-semibold text-orange-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>History ({recipe.history.length})</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Defines standard quantities, sub-recipes, edible yield %, portion variants, and SOP instructions.
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

        {/* Inline Validation Error */}
        {validationError && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between">
            <span>{validationError}</span>
            <button type="button" onClick={() => setValidationError(null)} className="text-red-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Blocked Alert Banner */}
        {blockedAlert && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-red-900">
                  Cannot add {blockedAlert.ingredientName} to this recipe:
                </span>{' '}
                0 stock on the Kitchen floor. Main Store has {blockedAlert.storeStock.toLocaleString()} {blockedAlert.unit}.
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {blockedAlert.ingredientId && blockedAlert.storeStock > 0 && (
                <button
                  type="button"
                  onClick={() => handleQuickTransferFromStore(blockedAlert.ingredientId)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 whitespace-nowrap cursor-pointer"
                >
                  <Warehouse className="w-3.5 h-3.5" />
                  <span>Transfer from Store</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setBlockedAlert(null)}
                className="p-1 text-red-500 hover:text-red-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Settings Strip */}
        <div className="mx-6 mt-3 px-4 py-2.5 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-5 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-800">
              <input
                type="checkbox"
                checked={strictKitchenStockMode}
                onChange={(e) => {
                  setStrictKitchenStockMode(e.target.checked);
                  setBlockedAlert(null);
                }}
                className="rounded text-orange-600 w-4 h-4"
              />
              <span>Strict Kitchen Stock Check</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-800">
              <input
                type="checkbox"
                checked={isSubRecipe}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsSubRecipe(checked);
                  if (checked) {
                    setYieldUnit('grams');
                    setCookingMethod('batch_cooking');
                    setProductionLocation('prep_kitchen');
                  } else {
                    setYieldUnit('plates');
                  }
                }}
                className="rounded text-orange-600 w-4 h-4"
              />
              <span>Sub-Recipe / Intermediate Prep Base</span>
            </label>
          </div>

          <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
            {strictKitchenStockMode ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Kitchen Stock Gatekeeper Active</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Standard Formula Mode (Validated at Prep)</span>
              </>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveRecipeCard} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Row 1: Identity & Operational Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-neutral-600">Recipe Code</label>
              <input
                type="text"
                value={recipeCode}
                onChange={(e) => setRecipeCode(e.target.value)}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">
                {isSubRecipe ? 'Sub-Recipe Name' : 'Linked Menu Dish'}
              </label>
              {isSubRecipe ? (
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. House Tomato Sauce Base"
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                />
              ) : (
                <select
                  value={selectedMenuItemId}
                  onChange={(e) => {
                    setSelectedMenuItemId(e.target.value);
                    const d = menuItems.find((m) => m.id === e.target.value);
                    if (d) {
                      setRecipeName(d.name);
                      setCategory(d.category);
                    }
                  }}
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
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
              <label className="text-xs font-semibold text-neutral-600">Production Method</label>
              <select
                value={productionMethod}
                onChange={(e) => setProductionMethod(e.target.value as ProductionMethod)}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
              >
                <option value="recipe_bom">Method 1: Standardized Recipe BOM</option>
                <option value="semi_standardized">Method 2: Semi-Standardized (Adjustable)</option>
                <option value="direct_stock">Method 3: Direct Stock (No BOM)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Approval Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RecipeStatus)}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
              >
                <option value="approved">Approved (Production Active)</option>
                <option value="testing">Testing (Kitchen Trial)</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Row 2: Yield, Portioning, Station, Deduction */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="text-xs font-semibold text-neutral-600">Batch Yield Qty</label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  required
                  value={batchYieldPlates}
                  onChange={(e) => setBatchYieldPlates(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-2 text-xs font-bold font-mono tabular-nums"
                />
                <select
                  value={yieldUnit}
                  onChange={(e) => setYieldUnit(e.target.value)}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-2 text-xs font-mono"
                >
                  <option value="plates">plates</option>
                  <option value="portions">portions</option>
                  <option value="grams">grams</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Standard Portion Size</label>
              <input
                type="text"
                value={standardPortionSize}
                onChange={(e) => setStandardPortionSize(e.target.value)}
                placeholder="e.g. 1 Plate (350g)"
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Kitchen Workflow</label>
              <select
                value={isSubRecipe ? 'batch_cooking' : cookingMethod}
                disabled={isSubRecipe}
                onChange={(e) => setCookingMethod(e.target.value as 'batch_cooking' | 'on_sale_order')}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 disabled:opacity-60"
              >
                <option value="batch_cooking">Batch Prep (Pot / Buffet Pool)</option>
                <option value="on_sale_order">Made-to-Order (On Sale)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-600">Prep Station</label>
              <select
                value={productionLocation}
                onChange={(e) => setProductionLocation(e.target.value as KitchenStation | 'prep_kitchen')}
                className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900"
              >
                <option value="hot_kitchen">Hot Kitchen</option>
                <option value="grill">Grill &amp; Charcoal</option>
                <option value="prep_kitchen">Prep Kitchen</option>
                <option value="cold_prep">Cold Prep</option>
                <option value="dessert">Pastry / Dessert</option>
                <option value="drinks">Bar &amp; Drinks</option>
              </select>
            </div>
          </div>

          {/* Section Segmented Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setActiveSection('ingredients')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                activeSection === 'ingredients' ? 'bg-white text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Ingredients &amp; Sub-Recipes ({rows.length})
            </button>
            {!isSubRecipe && (
              <button
                type="button"
                onClick={() => setActiveSection('variants')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                  activeSection === 'variants' ? 'bg-white text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Portion Variants &amp; Modifiers ({variants.length + modifierRules.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveSection('sop')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap cursor-pointer ${
                activeSection === 'sop' ? 'bg-white text-neutral-900' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              SOP, Yield &amp; Allergens
            </button>
          </div>

          {/* SECTION 1: Ingredients & Sub-Recipes Table */}
          {activeSection === 'ingredients' && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-neutral-900">
                    Bill of Materials ({rows.length} lines)
                  </span>
                  <span className="text-neutral-500">
                    · Sub-recipes deduct prepared stock, never double-deducting raw ingredients
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {!isSubRecipe && availableSubRecipes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAddRow(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-neutral-100 text-neutral-800 rounded-lg border border-neutral-300 whitespace-nowrap cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                      <span>+ Sub-Recipe</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleAddRow(false)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Raw Ingredient</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="py-2.5 px-3">Ingredient / Sub-Recipe</th>
                      <th className="py-2.5 px-3">Batch Qty</th>
                      <th className="py-2.5 px-3">Unit</th>
                      <th className="py-2.5 px-3">Yield %</th>
                      <th className="py-2.5 px-3">Per Unit</th>
                      <th className="py-2.5 px-3">Substitute</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-2 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {calculatedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50/70">
                        <td className="py-2.5 px-3">
                          {row.isSubRecipe ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase text-orange-700 block">
                                Sub-Recipe Base
                              </span>
                              <select
                                value={row.subRecipeId}
                                onChange={(e) => {
                                  const sr = recipes.find((r) => r.id === e.target.value);
                                  handleUpdateRow(idx, {
                                    subRecipeId: e.target.value,
                                    ingredientId: e.target.value,
                                    batchUnit: sr?.yieldUnit || 'portions',
                                  });
                                }}
                                className="w-44 text-xs font-bold bg-white border border-neutral-300 rounded-lg px-2 py-1.5"
                              >
                                {availableSubRecipes.map((sr) => (
                                  <option key={sr.id} value={sr.id}>
                                    {sr.name} ({sr.code || 'SUB'})
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
                              className="w-44 text-xs font-bold bg-white border border-neutral-200 rounded-lg px-2 py-1.5"
                            >
                              {ingredients.map((ing) => (
                                <option key={ing.id} value={ing.id}>
                                  {ing.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="any"
                            min={0.001}
                            required
                            value={row.batchQuantity}
                            onChange={(e) =>
                              handleUpdateRow(idx, { batchQuantity: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right tabular-nums"
                          />
                        </td>

                        <td className="py-2.5 px-3">
                          {row.isSubRecipe ? (
                            <span className="font-mono text-neutral-700">{row.batchUnit}</span>
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
                              <option value="bottle">bottle</option>
                            </select>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min={10}
                            max={100}
                            disabled={row.isSubRecipe}
                            value={row.yieldPercentage}
                            onChange={(e) =>
                              handleUpdateRow(idx, {
                                yieldPercentage: Math.min(100, Math.max(10, parseInt(e.target.value) || 100)),
                              })
                            }
                            className="w-16 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono text-right tabular-nums disabled:opacity-50"
                          />
                        </td>

                        <td className="py-2.5 px-3 font-mono tabular-nums text-neutral-800">
                          {row.perPlateDisplay.toFixed(row.isSubRecipe ? 2 : 3)} {row.batchUnit}
                        </td>

                        <td className="py-2.5 px-3">
                          {!row.isSubRecipe ? (
                            <select
                              value={row.substituteIngredientId || ''}
                              onChange={(e) =>
                                handleUpdateRow(idx, { substituteIngredientId: e.target.value || undefined })
                              }
                              className="w-32 text-[11px] bg-white border border-neutral-200 rounded-lg px-1.5 py-1 text-neutral-700"
                            >
                              <option value="">None</option>
                              {ingredients
                                .filter((i) => i.id !== row.ingredientId)
                                .map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-[11px] text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-bold text-right tabular-nums text-neutral-900">
                          {formatMoney(row.lineCostPerPlate)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                            aria-label="Remove line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Costing Rollup Row */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">Batch COGS</span>
                  <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                    {formatMoney(roundedBatchCost)}
                  </div>
                  <span className="text-[11px] text-neutral-500">
                    For {batchYieldPlates.toLocaleString()} {yieldUnit}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {isSubRecipe ? 'Cost per Gram / Unit' : 'Cost per Plate'}
                  </span>
                  <div className="text-base font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                    {isSubRecipe
                      ? `${(totalBatchCost / Math.max(1, batchYieldPlates)).toFixed(2)} TZS / ${yieldUnit}`
                      : formatMoney(roundedPlateCost)}
                  </div>
                  <span className="text-[11px] text-neutral-500">Live weighted-avg price</span>
                </div>

                {!isSubRecipe && (
                  <>
                    <div>
                      <span className="text-[11px] font-semibold text-neutral-500">Gross Profit</span>
                      <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                        {formatMoney(grossContribution)}
                      </div>
                      <span className="text-[11px] text-neutral-500">Sell: {formatMoney(sellPrice)}</span>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-neutral-500">Food Cost %</span>
                      <div
                        className={`text-base font-bold font-mono tabular-nums mt-0.5 ${
                          foodCostPercentage <= 35
                            ? 'text-emerald-700'
                            : foodCostPercentage <= 45
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {foodCostPercentage.toFixed(1)}%
                      </div>
                      <span className="text-[11px] text-neutral-500">Target: 28% – 35%</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: Portion Variants & Modifier Rules */}
          {activeSection === 'variants' && !isSubRecipe && (
            <div className="space-y-4">
              <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Portion Size Multipliers</h4>
                    <p className="text-[11px] text-neutral-500">
                      Automatically scale BOM deductions when cashiers or waiters select Small, Regular, or Large portions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    + Add Variant
                  </button>
                </div>

                {variants.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-2">
                    No portion variants configured yet (uses standard 1.0x recipe).
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {variants.map((v, i) => (
                      <div key={v.id} className="py-2 flex items-center gap-3 text-xs">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) =>
                            setVariants((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                          }
                          placeholder="Portion Name (e.g. Small)"
                          className="flex-1 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-semibold"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className="text-neutral-500">Multiplier:</span>
                          <input
                            type="number"
                            step="0.05"
                            min={0.1}
                            value={v.portionMultiplier}
                            onChange={(e) =>
                              setVariants((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, portionMultiplier: parseFloat(e.target.value) || 1 } : x
                                )
                              )
                            }
                            className="w-20 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-mono font-bold text-right tabular-nums"
                          />
                          <span className="text-neutral-500 font-mono">x</span>
                        </div>
                        <span className="font-mono text-neutral-600 tabular-nums w-28 text-right">
                          ~{formatMoney(Math.round(roundedPlateCost * v.portionMultiplier))}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Order Modifier Stock Rules</h4>
                    <p className="text-[11px] text-neutral-500">
                      Link POS modifiers like &ldquo;Extra Chicken&rdquo; or &ldquo;No Onions&rdquo; directly to ingredient additions or exclusions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddModifierRule}
                    className="px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    + Add Modifier Rule
                  </button>
                </div>

                {modifierRules.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-2">No modifier stock rules attached.</p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {modifierRules.map((mr, i) => (
                      <div key={mr.id} className="py-2 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center text-xs">
                        <input
                          type="text"
                          value={mr.modifierName}
                          onChange={(e) =>
                            setModifierRules((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, modifierName: e.target.value } : x))
                            )
                          }
                          placeholder="Modifier label"
                          className="sm:col-span-2 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-semibold"
                        />
                        <select
                          value={mr.action}
                          onChange={(e) =>
                            setModifierRules((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, action: e.target.value as RecipeModifierRule['action'] } : x
                              )
                            )
                          }
                          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5"
                        >
                          <option value="add">Add (+)</option>
                          <option value="remove">Remove (-)</option>
                        </select>
                        <select
                          value={mr.ingredientId}
                          onChange={(e) =>
                            setModifierRules((prev) =>
                              prev.map((x, idx) => (idx === i ? { ...x, ingredientId: e.target.value } : x))
                            )
                          }
                          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5"
                        >
                          {ingredients.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={mr.quantityDelta}
                            onChange={(e) =>
                              setModifierRules((prev) =>
                                prev.map((x, idx) =>
                                  idx === i ? { ...x, quantityDelta: parseFloat(e.target.value) || 0 } : x
                                )
                              )
                            }
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5 font-mono text-right tabular-nums"
                          />
                          <button
                            type="button"
                            onClick={() => setModifierRules((prev) => prev.filter((_, idx) => idx !== i))}
                            className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: SOP, Yield & Allergens */}
          {activeSection === 'sop' && (
            <div className="space-y-4 border border-neutral-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Expected Production Yield (%)</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={expectedYieldPct}
                    onChange={(e) => setExpectedYieldPct(Math.min(100, Math.max(10, Number(e.target.value) || 95)))}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Batch Shelf Life (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={shelfLifeHours}
                    onChange={(e) => setShelfLifeHours(Math.max(1, Number(e.target.value) || 24))}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Allergens (Comma separated)</label>
                  <input
                    type="text"
                    value={allergensText}
                    onChange={(e) => setAllergensText(e.target.value)}
                    placeholder="e.g. Dairy, Fish, Shellfish"
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Preparation Instructions</label>
                <textarea
                  rows={2}
                  value={prepInstructions}
                  onChange={(e) => setPrepInstructions(e.target.value)}
                  placeholder="Mise en place steps: wash, peel, weigh sub-recipe portions..."
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Cooking &amp; Plating Instructions</label>
                <textarea
                  rows={2}
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  placeholder="Temperatures, cook time, garnish, portioning scoop..."
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl whitespace-nowrap cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Save Recipe Card</span>
            </button>
          </div>
        </form>

        {/* Version History Modal */}
        {showHistoryModal && recipe?.history && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-sm text-neutral-900">
                    Version History · {recipe.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {recipe.history.map((hist) => (
                  <div key={hist.version} className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-mono font-bold text-neutral-900">v{hist.version}</span>
                        <span className="mx-1.5 text-neutral-400">·</span>
                        <span className="font-semibold text-neutral-800">
                          Yield {hist.batchYieldPlates}
                        </span>
                        <span className="mx-1.5 text-neutral-400">·</span>
                        <span className="text-neutral-500">
                          {new Date(hist.archivedAt || hist.changedAt || Date.now()).toLocaleDateString()} by{' '}
                          {hist.archivedBy || hist.changedBy || 'Chef'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(hist)}
                        className="px-2.5 py-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore v{hist.version}</span>
                      </button>
                    </div>
                    <p className="text-xs text-neutral-700">{hist.changeSummary}</p>
                    <div className="text-xs font-mono text-neutral-600 tabular-nums">
                      Unit Cost: {formatMoney(hist.totalCostPerPlate ?? hist.costPerPlate ?? 0)} · Food Cost:{' '}
                      {hist.foodCostPercentage.toFixed(1)}%
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
