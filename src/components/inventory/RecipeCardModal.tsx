import React, { useState, useEffect, useMemo } from 'react';
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
  RotateCcw,
  BookOpen,
  Search,
  Sliders,
  ClipboardList,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useRestaurant } from '../../context/RestaurantContext';
import {
  Recipe,
  RecipeIngredient,
  RecipeVersionHistoryItem,
  ProductionMethod,
  ProductionModel,
  RecipeStatus,
  RecipeVariant,
  RecipeModifierRule,
  KitchenStation,
} from '../../types/restaurant';
import {
  convertQuantity,
  getCompatibleUnits,
  normalizeUnitName,
  suggestCatalogueItemDetails,
  parsePackagingSpec,
} from '../../utils/unitConversion';
import { Ingredient } from '../../types/restaurant';

interface RecipeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  defaultMenuItemId?: string;
  defaultIsSubRecipe?: boolean;
  onSaved?: (savedRecipe: Recipe) => void;
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

type ModalTab = 'basic' | 'bom' | 'portions' | 'sop' | 'costing';

export const RecipeCardModal: React.FC<RecipeCardModalProps> = ({
  isOpen,
  onClose,
  recipe,
  defaultMenuItemId,
  defaultIsSubRecipe = false,
  onSaved,
}) => {
  const {
    menuItems,
    ingredients,
    recipes,
    formatMoney,
    saveRecipe,
    transferStock,
    computeRecipeUnitCost,
    addNewIngredient,
    addMenuItem,
  } = useRestaurant();

  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const [linkMode, setLinkMode] = useState<'existing' | 'new_menu_item' | 'unlinked_standalone'>(
    recipe ? (recipe.menuItemId ? 'existing' : 'unlinked_standalone') : defaultMenuItemId ? 'existing' : 'new_menu_item'
  );
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>(
    recipe?.menuItemId || defaultMenuItemId || ''
  );
  const [newDishPrice, setNewDishPrice] = useState<number>(10000);
  const [recipeCode, setRecipeCode] = useState<string>(
    recipe?.code ||
      (defaultIsSubRecipe
        ? `SUB-00${recipes.filter((r) => r.isSubRecipe).length + 1}`
        : `RCP-00${recipes.length + 1}`)
  );
  const [recipeName, setRecipeName] = useState<string>(
    recipe?.name || (defaultIsSubRecipe ? 'Prepared Sauce Base' : '')
  );
  const [category, setCategory] = useState<string>(recipe?.category || 'Main Course');
  const [productionLocation, setProductionLocation] = useState<KitchenStation | 'prep_kitchen'>(
    recipe?.productionLocation || (defaultIsSubRecipe ? 'prep_kitchen' : 'hot_kitchen')
  );
  const [productionMethod, setProductionMethod] = useState<ProductionMethod>(
    recipe?.productionMethod || 'recipe_bom'
  );
  const [productionModel, setProductionModel] = useState<ProductionModel>(
    recipe?.productionModel || (defaultIsSubRecipe ? 'batch_production' : 'made_to_order')
  );
  const [status, setStatus] = useState<RecipeStatus>(recipe?.status || 'approved');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    recipe?.effectiveDate || new Date().toISOString().split('T')[0]
  );
  const [batchYieldPlates, setBatchYieldPlates] = useState<number>(recipe?.batchYieldPlates || 100);
  const [yieldUnit, setYieldUnit] = useState<string>(
    recipe?.yieldUnit || (defaultIsSubRecipe ? 'grams' : 'plates')
  );
  const [standardPortionSize, setStandardPortionSize] = useState<string>(
    recipe?.standardPortionSize || '1 Plate (350g)'
  );
  const [expectedYieldPct, setExpectedYieldPct] = useState<number>(recipe?.expectedYieldPct || 95);
  const [shelfLifeHours, setShelfLifeHours] = useState<number>(recipe?.shelfLifeHours || 24);
  const [cookingTemp, setCookingTemp] = useState<string>(recipe?.cookingTemp || '95°C');
  const [cookingTimeMins, setCookingTimeMins] = useState<number>(recipe?.cookingTimeMins || 35);
  const [foodSafetyNotes, setFoodSafetyNotes] = useState<string>(recipe?.foodSafetyNotes || '');
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
  const [changeSummaryInput, setChangeSummaryInput] = useState<string>('');

  // BOM search + inline new ingredient creator
  const [bomSearchQuery, setBomSearchQuery] = useState<string>('');
  const [entryMode, setEntryMode] = useState<'per_plate' | 'batch'>('batch');
  const [showInlineNewIng, setShowInlineNewIng] = useState<boolean>(false);
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngCategory, setNewIngCategory] = useState<NonNullable<Ingredient['category']>>('Dry Goods');
  const [newIngSupplier, setNewIngSupplier] = useState<string>('Kariakoo Grain & Spice Wholesalers');
  const [newIngPurchaseUnit, setNewIngPurchaseUnit] = useState<string>('5kg Pack');
  const [newIngConsumptionUnit, setNewIngConsumptionUnit] = useState<'grams' | 'ml' | 'pcs' | 'bottle'>('grams');
  const [newIngRatio, setNewIngRatio] = useState<number>(5000);
  const [newIngCost, setNewIngCost] = useState<number>(15000);
  const [newIngOpeningPacks, setNewIngOpeningPacks] = useState<number>(2);
  const [newIngInitialStock, setNewIngInitialStock] = useState<number>(10000);
  const [newIngPerPlateQty, setNewIngPerPlateQty] = useState<number>(50);
  const [newIngPresetHint, setNewIngPresetHint] = useState<string>('');
  const [newIngManualLock, setNewIngManualLock] = useState<{
    pack?: boolean;
    cost?: boolean;
    stock?: boolean;
    perPlate?: boolean;
  }>({});

  const [strictKitchenStockMode, setStrictKitchenStockMode] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [blockedAlert, setBlockedAlert] = useState<{
    ingredientName: string;
    ingredientId: string;
    storeStock: number;
    unit: string;
  } | null>(null);

  const [variants, setVariants] = useState<RecipeVariant[]>(recipe?.variants || []);
  const [modifierRules, setModifierRules] = useState<RecipeModifierRule[]>(recipe?.modifierRules || []);

  const availableSubRecipes = recipes.filter((r) => r.isSubRecipe && r.id !== recipe?.id);

  const buildRowsFromRecipe = (target?: Recipe | null): EditableIngredientRow[] => {
    if (target && target.ingredients && target.ingredients.length > 0) {
      return target.ingredients.map((ri) => {
        if (ri.isSubRecipe && ri.subRecipeId) {
          const batchQty =
            ri.batchQuantity ?? (ri.subRecipeQuantity || ri.quantity) * (target.batchYieldPlates || 1);
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
        const preferredUnit =
          ri.batchUnit ||
          (ing?.consumptionUnit === 'grams'
            ? rawBatchQty >= 1000
              ? 'kg'
              : 'g'
            : ing?.consumptionUnit === 'ml'
            ? rawBatchQty >= 1000
              ? 'L'
              : 'ml'
            : ing?.consumptionUnit || 'pcs');
        const displayQty = ing
          ? convertQuantity(rawBatchQty, ing.consumptionUnit, preferredUnit)
          : rawBatchQty;

        return {
          ingredientId: ri.ingredientId,
          batchQuantity: Number(displayQty.toFixed(3)),
          batchUnit: preferredUnit,
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
      { ingredientId: 'ing-salt', batchQuantity: 300, batchUnit: 'g', yieldPercentage: 100 },
    ];
  };

  const [rows, setRows] = useState<EditableIngredientRow[]>(() => buildRowsFromRecipe(recipe));

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('basic');
    setValidationError(null);
    setBlockedAlert(null);
    setBomSearchQuery('');
    setShowInlineNewIng(false);
    setChangeSummaryInput('');
    const unlinkedDishes = menuItems.filter(
      (m) => !recipes.some((r) => !r.isSubRecipe && r.menuItemId === m.id)
    );
    const initialLinkMode: 'existing' | 'new_menu_item' | 'unlinked_standalone' = recipe
      ? recipe.menuItemId
        ? 'existing'
        : 'unlinked_standalone'
      : defaultMenuItemId
      ? 'existing'
      : 'new_menu_item';
    const initialMenuId =
      recipe?.menuItemId || defaultMenuItemId || unlinkedDishes[0]?.id || '';
    const initialDishObj = menuItems.find((m) => m.id === initialMenuId);

    setLinkMode(initialLinkMode);
    setSelectedMenuItemId(initialMenuId);
    setNewDishPrice(initialDishObj?.price || 10000);
    setRecipeCode(
      recipe?.code ||
        (defaultIsSubRecipe
          ? `SUB-00${recipes.filter((r) => r.isSubRecipe).length + 1}`
          : `RCP-00${recipes.length + 1}`)
    );
    setRecipeName(
      recipe?.name ||
        (initialLinkMode === 'existing' ? initialDishObj?.name || '' : '') ||
        (defaultIsSubRecipe ? 'Prepared Sauce Base' : '')
    );
    setCategory(recipe?.category || initialDishObj?.category || 'Main Course');
    setProductionLocation(
      recipe?.productionLocation || (defaultIsSubRecipe ? 'prep_kitchen' : 'hot_kitchen')
    );
    setProductionMethod(recipe?.productionMethod || 'recipe_bom');
    setProductionModel(
      recipe?.productionModel ||
        (defaultIsSubRecipe
          ? 'batch_production'
          : recipe?.cookingMethod === 'batch_cooking'
          ? 'batch_production'
          : 'made_to_order')
    );
    setStatus(recipe?.status || 'approved');
    setEffectiveDate(recipe?.effectiveDate || new Date().toISOString().split('T')[0]);
    setBatchYieldPlates(recipe?.batchYieldPlates || (defaultIsSubRecipe ? 5000 : 100));
    setYieldUnit(recipe?.yieldUnit || (defaultIsSubRecipe ? 'grams' : 'plates'));
    setStandardPortionSize(recipe?.standardPortionSize || '1 Plate (350g)');
    setExpectedYieldPct(recipe?.expectedYieldPct || 95);
    setShelfLifeHours(recipe?.shelfLifeHours || 24);
    setCookingTemp(recipe?.cookingTemp || '95°C');
    setCookingTimeMins(recipe?.cookingTimeMins || 35);
    setFoodSafetyNotes(recipe?.foodSafetyNotes || '');
    setAllergensText((recipe?.allergens || []).join(', '));
    setCookingMethod(recipe?.cookingMethod || 'batch_cooking');
    setPrepInstructions(recipe?.preparationInstructions || '');
    setCookingInstructions(recipe?.cookingInstructions || '');
    setIsSubRecipe(recipe?.isSubRecipe ?? defaultIsSubRecipe);
    setVariants(recipe?.variants || []);
    setModifierRules(recipe?.modifierRules || []);
    setRows(buildRowsFromRecipe(recipe));
  }, [isOpen, recipe, defaultMenuItemId, defaultIsSubRecipe]);

  const filteredCatalogIngredients = useMemo(() => {
    const q = bomSearchQuery.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        i.supplier.toLowerCase().includes(q)
    );
  }, [ingredients, bomSearchQuery]);

  const filteredSubRecipes = useMemo(() => {
    const q = bomSearchQuery.trim().toLowerCase();
    if (!q) return availableSubRecipes;
    return availableSubRecipes.filter(
      (sr) =>
        (sr.name || '').toLowerCase().includes(q) ||
        (sr.code || '').toLowerCase().includes(q)
    );
  }, [availableSubRecipes, bomSearchQuery]);

  if (!isOpen) return null;

  const targetDish =
    linkMode === 'existing'
      ? menuItems.find((m) => m.id === selectedMenuItemId)
      : undefined;
  const sellPrice =
    linkMode === 'existing' ? (targetDish?.price || 8000) : Math.max(0, newDishPrice || 0);

  const unlinkedMenuItems = menuItems.filter(
    (m) => !recipes.some((r) => !r.isSubRecipe && r.menuItemId === m.id && r.id !== recipe?.id)
  );
  const linkedMenuItems = menuItems.filter((m) =>
    recipes.some((r) => !r.isSubRecipe && r.menuItemId === m.id && r.id !== recipe?.id)
  );
  const existingLinkedRecipe =
    linkMode === 'existing' && selectedMenuItemId
      ? recipes.find(
          (r) => !r.isSubRecipe && r.menuItemId === selectedMenuItemId && r.id !== recipe?.id
        )
      : undefined;

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

  const handleAddSpecificIngredient = (ingredientId: string) => {
    const ing = ingredients.find((i) => i.id === ingredientId);
    if (!ing) return;
    if (strictKitchenStockMode && (ing.kitchenStockUnits ?? 0) <= 0) {
      setBlockedAlert({
        ingredientName: ing.name,
        ingredientId: ing.id,
        storeStock: ing.storeStockUnits ?? 0,
        unit: ing.consumptionUnit,
      });
      return;
    }

    const defaultUnit =
      ing.consumptionUnit === 'grams' ? 'g' : ing.consumptionUnit === 'ml' ? 'ml' : ing.consumptionUnit;
    const defaultPerPlate = ing.consumptionUnit === 'grams' ? 100 : ing.consumptionUnit === 'ml' ? 25 : 1;

    setRows((prev) => [
      ...prev,
      {
        ingredientId: ing.id,
        batchQuantity: defaultPerPlate * (batchYieldPlates || 1),
        batchUnit: defaultUnit,
        yieldPercentage: 100,
      },
    ]);
  };

  const handleAddSpecificSubRecipe = (subRecipeId: string) => {
    const subRec = availableSubRecipes.find((sr) => sr.id === subRecipeId);
    if (!subRec) return;
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
  };

  const handleNewIngNameChange = (val: string) => {
    setNewIngName(val);
    if (!val.trim()) {
      setNewIngPresetHint('');
      setNewIngManualLock({});
      return;
    }
    const preset = suggestCatalogueItemDetails(val);
    setNewIngCategory(preset.category);
    setNewIngSupplier(preset.supplier);
    setNewIngPresetHint(preset.matchedLabel);

    let nextRatio = newIngRatio;
    if (!newIngManualLock.pack) {
      setNewIngPurchaseUnit(preset.purchaseUnit);
      setNewIngConsumptionUnit(preset.consumptionUnit);
      setNewIngRatio(preset.conversionRatio);
      nextRatio = preset.conversionRatio;
    }
    if (!newIngManualLock.cost) {
      setNewIngCost(preset.typicalCost);
    }
    if (!newIngManualLock.stock) {
      setNewIngOpeningPacks(preset.defaultOpeningPacks);
      setNewIngInitialStock(preset.defaultOpeningPacks * nextRatio);
    }
    if (!newIngManualLock.perPlate) {
      setNewIngPerPlateQty(preset.defaultPerPlateQty);
    }
  };

  const handleNewIngPurchaseUnitChange = (packText: string) => {
    setNewIngPurchaseUnit(packText);
    setNewIngManualLock((prev) => ({ ...prev, pack: true }));
    const parsed = parsePackagingSpec(packText);
    if (parsed) {
      setNewIngConsumptionUnit(parsed.consumptionUnit);
      setNewIngRatio(parsed.conversionRatio);
      if (!newIngManualLock.stock) {
        setNewIngInitialStock(Math.round(newIngOpeningPacks * parsed.conversionRatio));
      }
      setNewIngPresetHint(`Auto-parsed ${parsed.conversionRatio.toLocaleString()} ${parsed.consumptionUnit} per pack`);
    }
  };

  const handleNewIngRatioChange = (ratioVal: number) => {
    const cleanRatio = Math.max(1, ratioVal || 1);
    setNewIngRatio(cleanRatio);
    setNewIngManualLock((prev) => ({ ...prev, pack: true }));
    if (!newIngManualLock.stock) {
      setNewIngInitialStock(Math.round(newIngOpeningPacks * cleanRatio));
    }
  };

  const handleOpeningPacksChange = (packsVal: number) => {
    const cleanPacks = Math.max(0, packsVal || 0);
    setNewIngOpeningPacks(cleanPacks);
    setNewIngInitialStock(Math.round(cleanPacks * Math.max(1, newIngRatio)));
    setNewIngManualLock((prev) => ({ ...prev, stock: true }));
  };

  const handleOpeningBaseStockChange = (baseVal: number) => {
    const cleanBase = Math.max(0, baseVal || 0);
    setNewIngInitialStock(cleanBase);
    setNewIngOpeningPacks(Number((cleanBase / Math.max(1, newIngRatio)).toFixed(2)));
    setNewIngManualLock((prev) => ({ ...prev, stock: true }));
  };

  const handleCreateAndAttachIngredient = () => {
    if (!newIngName.trim()) return;
    const preset = suggestCatalogueItemDetails(newIngName);
    const created = addNewIngredient({
      name: newIngName.trim(),
      category: newIngCategory || preset.category,
      purchaseUnit: newIngPurchaseUnit.trim() || preset.purchaseUnit,
      consumptionUnit: newIngConsumptionUnit || preset.consumptionUnit,
      conversionRatio: Math.max(1, newIngRatio),
      costPerPurchaseUnit: Math.max(0, newIngCost),
      currentStockUnits: Math.max(0, newIngInitialStock),
      storeStockUnits: Math.max(0, newIngInitialStock),
      kitchenStockUnits: 0,
      minimumThreshold: Math.round(Math.max(100, newIngRatio * 0.5)),
      supplier: newIngSupplier.trim() || preset.supplier,
    });
    const unit =
      created.consumptionUnit === 'grams'
        ? 'g'
        : created.consumptionUnit === 'ml'
        ? 'ml'
        : created.consumptionUnit;
    const perPlate = Math.max(0.01, newIngPerPlateQty || preset.defaultPerPlateQty);
    setRows((prev) => [
      ...prev,
      {
        ingredientId: created.id,
        batchQuantity: Number((perPlate * (batchYieldPlates || 1)).toFixed(3)),
        batchUnit: unit,
        yieldPercentage: 100,
      },
    ]);
    setNewIngName('');
    setNewIngPresetHint('');
    setNewIngManualLock({});
    setShowInlineNewIng(false);
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
    if (historyItem.name) setRecipeName(historyItem.name);
    setCookingMethod(historyItem.cookingMethod || 'on_sale_order');
    if (historyItem.productionMethod) setProductionMethod(historyItem.productionMethod);
    if (historyItem.productionModel) setProductionModel(historyItem.productionModel);
    if (historyItem.preparationInstructions) setPrepInstructions(historyItem.preparationInstructions);
    if (historyItem.cookingInstructions) setCookingInstructions(historyItem.cookingInstructions);
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
    setChangeSummaryInput(`Restored formula from v${historyItem.version}`);
    setActiveTab('bom');
  };

  // Deterministic Cost Rollup (distinguishes Edible Portion vs Yield-Adjusted As-Purchased)
  let totalPlateCost = 0;
  let totalBatchCost = 0;

  const calculatedRows = rows.map((row) => {
    if (row.isSubRecipe && row.subRecipeId) {
      const subRec = recipes.find((r) => r.id === row.subRecipeId);
      const subCostInfo = subRec
        ? computeRecipeUnitCost(subRec.id)
        : { unitCost: 1200, batchCost: 1200, perPlateCost: 1200 };
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
        unitLabel: row.batchUnit,
      };
    }

    const ing = ingredients.find((i) => i.id === row.ingredientId);
    const unitCost = ing && ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const baseUnit = ing?.consumptionUnit || 'pcs';
    const baseBatchQty = convertQuantity(row.batchQuantity || 0, row.batchUnit, baseUnit);
    const perPlateBaseQty = batchYieldPlates > 0 ? baseBatchQty / batchYieldPlates : 0;
    const yieldFactor = Math.max(0.1, (row.yieldPercentage || 100) / 100);
    const effectivePerPlateQty = perPlateBaseQty / yieldFactor;

    const perPlateDisplay = convertQuantity(perPlateBaseQty, baseUnit, row.batchUnit);
    const lineCostPerPlate = effectivePerPlateQty * unitCost;
    const lineBatchCost = lineCostPerPlate * batchYieldPlates;

    totalPlateCost += lineCostPerPlate;
    totalBatchCost += lineBatchCost;

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
      unitLabel: baseUnit,
    };
  });

  const roundedPlateCost = Math.round(totalPlateCost);
  const roundedBatchCost = Math.round(totalBatchCost);
  const foodGrossProfit = Math.max(0, sellPrice - roundedPlateCost);
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
        unit: firstIng.consumptionUnit === 'grams' ? 'g' : firstIng.consumptionUnit,
        priceDelta: 2000,
      },
    ]);
  };

  const handleSaveRecipeCard = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!isSubRecipe && linkMode === 'new_menu_item' && !recipeName.trim()) {
      setValidationError('Please enter a Dish & Recipe Name for your new menu item.');
      setActiveTab('basic');
      return;
    }

    if (!isSubRecipe && linkMode === 'unlinked_standalone' && !recipeName.trim()) {
      setValidationError('Please enter a Recipe Name for this standalone recipe.');
      setActiveTab('basic');
      return;
    }

    if (!isSubRecipe && linkMode === 'existing' && !selectedMenuItemId) {
      setValidationError('Please select a Menu Item to link, or switch to New Menu Dish / Standalone.');
      setActiveTab('basic');
      return;
    }

    if (batchYieldPlates <= 0) {
      setValidationError('Batch yield must be greater than zero.');
      setActiveTab('basic');
      return;
    }

    if (productionMethod !== 'direct_stock' && rows.length === 0) {
      setValidationError('Please add at least one ingredient or sub-recipe line, or switch to Direct Stock.');
      setActiveTab('bom');
      return;
    }

    const recipeId = recipe?.id || `${isSubRecipe ? 'rec-sub-' : 'rec-'}${Date.now()}`;
    let finalMenuItemId: string | undefined = isSubRecipe
      ? undefined
      : linkMode === 'existing'
      ? selectedMenuItemId || undefined
      : undefined;

    if (!isSubRecipe && linkMode === 'new_menu_item') {
      const createdDish = addMenuItem({
        name: recipeName.trim(),
        category: category.trim() || 'Main Course',
        description: `${recipeName.trim()} (Prepared to standard BOM)`,
        price: Math.max(0, Math.round(newDishPrice || 0)),
        image: menuItems[0]?.image || '',
        preparationTimeMinutes: Math.max(5, cookingTimeMins || 15),
        isAvailable: true,
        station: productionLocation === 'prep_kitchen' ? 'hot_kitchen' : productionLocation,
        recipeId,
      });
      finalMenuItemId = createdDish.id;
    }

    const recipeIngredients: RecipeIngredient[] = calculatedRows.map((r) => ({
      ingredientId: r.isSubRecipe && r.subRecipeId ? r.subRecipeId : r.ingredientId,
      quantity: Math.round(r.effectivePerPlateQty * 1000) / 1000,
      batchQuantity: Math.round(r.baseBatchQty * 1000) / 1000,
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

    const newVersion = recipe ? recipe.version + 1 : 1;
    const parsedAllergens = allergensText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedRecipe: Recipe = {
      id: recipeId,
      code: recipeCode.trim() || undefined,
      menuItemId: finalMenuItemId,
      name: recipeName.trim() || targetDish?.name,
      category: category.trim() || undefined,
      productionLocation,
      productionMethod,
      productionModel,
      status,
      effectiveDate,
      standardPortionSize: standardPortionSize.trim() || undefined,
      yieldUnit,
      expectedYieldPct,
      shelfLifeHours,
      cookingTemp,
      cookingTimeMins,
      foodSafetyNotes: foodSafetyNotes.trim() || undefined,
      allergens: parsedAllergens,
      batchYieldPlates,
      version: newVersion,
      cookingMethod:
        isSubRecipe || productionModel === 'batch_production' || productionModel === 'buffet'
          ? 'batch_cooking'
          : 'on_sale_order',
      isSubRecipe,
      ingredients: recipeIngredients,
      variants: variants.length > 0 ? variants : undefined,
      modifierRules: modifierRules.length > 0 ? modifierRules : undefined,
      preparationInstructions: prepInstructions,
      cookingInstructions,
      approvedBy: status === 'approved' ? 'Executive Chef Juma' : recipe?.approvedBy,
      approvedAt:
        status === 'approved'
          ? `${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().substring(0, 5)}`
          : recipe?.approvedAt,
      history: recipe?.history || [],
    };

    saveRecipe(updatedRecipe, {
      recipeId,
      dishName: targetDish?.name || recipeName,
      rawInputText:
        changeSummaryInput.trim() ||
        `Recipe Card ${recipeCode}: ${recipeName} (${batchYieldPlates} ${yieldUnit} · ${productionModel})`,
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

    onSaved?.(updatedRecipe);
    onClose();
  };

  const TABS: { id: ModalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'basic', label: '1. Basic Information', icon: Info },
    { id: 'bom', label: `2. BOM Components (${rows.length})`, icon: Layers },
    { id: 'portions', label: `3. Portions & Modifiers (${variants.length + modifierRules.length})`, icon: Sliders },
    { id: 'sop', label: '4. Production SOP', icon: ClipboardList },
    { id: 'costing', label: '5. Costing & History', icon: TrendingUp },
  ];

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
                  {recipe ? `Edit Recipe Card · ${recipeName}` : 'New Standardized Recipe Card'}
                </h2>
                <span className="text-neutral-300">·</span>
                <span className="font-mono text-xs text-neutral-600 tabular-nums">
                  {recipeCode} · v{recipe ? recipe.version + 1 : 1}
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-xs font-semibold text-neutral-700 capitalize">
                  {status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Operational BOM specification with multi-level sub-recipes, yield loss, modifier stock rules, and Food Gross Profit analysis.
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

        {/* 5-Tab Navigation Bar */}
        <div className="px-6 pt-3 pb-2 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-white text-neutral-900 border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-orange-600" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Alerts */}
        {validationError && (
          <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold flex items-center justify-between">
            <span>{validationError}</span>
            <button type="button" onClick={() => setValidationError(null)} className="text-red-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {blockedAlert && (
          <div className="mx-6 mt-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <div>
                <span className="font-bold text-red-900">
                  Cannot add {blockedAlert.ingredientName} in Strict Kitchen Mode:
                </span>{' '}
                0 stock on Kitchen floor. Main Store has {blockedAlert.storeStock.toLocaleString()} {blockedAlert.unit}.
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
              <button type="button" onClick={() => setBlockedAlert(null)} className="p-1 text-red-500 hover:text-red-800">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveRecipeCard} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === 'basic' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-neutral-800">
                  <input
                    type="checkbox"
                    checked={isSubRecipe}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsSubRecipe(checked);
                      if (checked) {
                        setYieldUnit('portions');
                        setCookingMethod('batch_cooking');
                        setProductionModel('batch_production');
                        setProductionLocation('prep_kitchen');
                      } else {
                        setYieldUnit('plates');
                      }
                    }}
                    className="rounded text-orange-600 w-4 h-4"
                  />
                  <span>Sub-Recipe / Intermediate Preparation Base</span>
                </label>

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
                  <span>Require Kitchen Floor Stock When Adding Ingredients</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Recipe Code</label>
                  <input
                    type="text"
                    value={recipeCode}
                    onChange={(e) => setRecipeCode(e.target.value)}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-neutral-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  {isSubRecipe ? (
                    <>
                      <label className="text-xs font-semibold text-neutral-600">Sub-Recipe Name</label>
                      <input
                        type="text"
                        required
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        placeholder="e.g. Beef Stew Base (Sub-Recipe)"
                        className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                      />
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-neutral-600">
                          Menu Item Link &amp; Dish Setup
                        </label>
                        <div className="inline-flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setLinkMode('new_menu_item');
                              if (!recipe && targetDish && recipeName === targetDish.name) {
                                setRecipeName('');
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              linkMode === 'new_menu_item'
                                ? 'bg-white text-neutral-900 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            + Create New Menu Dish
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLinkMode('existing');
                              const fallbackId =
                                selectedMenuItemId || unlinkedMenuItems[0]?.id || menuItems[0]?.id || '';
                              setSelectedMenuItemId(fallbackId);
                              const d = menuItems.find((m) => m.id === fallbackId);
                              if (d && !recipeName.trim()) {
                                setRecipeName(d.name);
                                setCategory(d.category);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              linkMode === 'existing'
                                ? 'bg-white text-neutral-900 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            Link Existing Menu Item
                          </button>
                          <button
                            type="button"
                            onClick={() => setLinkMode('unlinked_standalone')}
                            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                              linkMode === 'unlinked_standalone'
                                ? 'bg-white text-neutral-900 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            Standalone (Unlinked)
                          </button>
                        </div>
                      </div>

                      {linkMode === 'new_menu_item' && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                required
                                value={recipeName}
                                onChange={(e) => setRecipeName(e.target.value)}
                                placeholder="New Dish & Recipe Name (e.g. Coconut Fish Curry)"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={newDishPrice}
                                onChange={(e) => setNewDishPrice(Math.max(0, Number(e.target.value) || 0))}
                                placeholder="Selling Price"
                                aria-label="POS Selling Price (TZS)"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3 pr-11 py-2 text-xs font-mono font-bold text-neutral-900 tabular-nums"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-neutral-500">
                                TZS
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Creates a new dish in the POS Menu with this selling price &amp; category and links this BOM automatically — existing dishes remain untouched.
                          </p>
                        </div>
                      )}

                      {linkMode === 'existing' && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                            >
                              {selectedMenuItemId === '' && (
                                <option value="" disabled>
                                  -- Choose a Menu Item --
                                </option>
                              )}
                              {unlinkedMenuItems.length > 0 && (
                                <optgroup label="Needs Recipe BOM (Unlinked Menu Items)">
                                  {unlinkedMenuItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({formatMoney(item.price)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {linkedMenuItems.length > 0 && (
                                <optgroup label="Already Has Recipe BOM (Updates Existing)">
                                  {linkedMenuItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.name} ({formatMoney(item.price)})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                            <input
                              type="text"
                              value={recipeName}
                              onChange={(e) => setRecipeName(e.target.value)}
                              placeholder="Recipe display title"
                              className="bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900"
                            />
                          </div>
                          {existingLinkedRecipe ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                              <span>
                                <strong>{targetDish?.name}</strong> already has recipe{' '}
                                <span className="font-mono font-bold">
                                  {existingLinkedRecipe.code || existingLinkedRecipe.id}
                                </span>
                                . Saving will update that existing recipe.
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkMode('new_menu_item');
                                  if (recipeName === targetDish?.name) setRecipeName('');
                                }}
                                className="px-2 py-1 rounded-md bg-white border border-amber-300 font-bold text-amber-900 hover:bg-amber-100 cursor-pointer whitespace-nowrap"
                              >
                                Switch to New Menu Dish
                              </button>
                            </div>
                          ) : (
                            <p className="text-[11px] text-neutral-500">
                              Links this BOM directly to the selected POS Menu Item so every order deducts stock accurately.
                            </p>
                          )}
                        </div>
                      )}

                      {linkMode === 'unlinked_standalone' && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="sm:col-span-2">
                              <input
                                type="text"
                                required
                                value={recipeName}
                                onChange={(e) => setRecipeName(e.target.value)}
                                placeholder="Standalone Recipe Name (e.g. Weekend Special Biryani Draft)"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                              />
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={newDishPrice}
                                onChange={(e) => setNewDishPrice(Math.max(0, Number(e.target.value) || 0))}
                                placeholder="Target Price"
                                aria-label="Target Price for Costing (TZS)"
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3 pr-11 py-2 text-xs font-mono font-bold text-neutral-900 tabular-nums"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-neutral-500">
                                TZS
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            Saves an internal / unlinked recipe card for costing, kitchen trials, or catering without adding it to the live POS Menu.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Production Station</label>
                  <select
                    value={productionLocation}
                    onChange={(e) => setProductionLocation(e.target.value as KitchenStation | 'prep_kitchen')}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900"
                  >
                    <option value="hot_kitchen">Hot Kitchen</option>
                    <option value="grill">Grill &amp; Charcoal</option>
                    <option value="prep_kitchen">Prep Kitchen (Sub-Recipes)</option>
                    <option value="cold_prep">Cold Prep</option>
                    <option value="pastry">Pastry / Bakery</option>
                    <option value="dessert">Dessert</option>
                    <option value="drinks">Bar &amp; Drinks</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Production Model</label>
                  <select
                    value={productionModel}
                    onChange={(e) => {
                      const val = e.target.value as ProductionModel;
                      setProductionModel(val);
                      setCookingMethod(val === 'made_to_order' ? 'on_sale_order' : 'batch_cooking');
                    }}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                  >
                    <option value="made_to_order">Made-to-Order (Deduct per POS Sale)</option>
                    <option value="batch_production">Advance Batch Production (Prep Pot / Pool)</option>
                    <option value="buffet">Buffet Production (Bulk Chafing Trays)</option>
                    <option value="catering">Catering / Customer-Site Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">BOM Costing Method</label>
                  <select
                    value={productionMethod}
                    onChange={(e) => setProductionMethod(e.target.value as ProductionMethod)}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900"
                  >
                    <option value="recipe_bom">Standardized Recipe BOM</option>
                    <option value="semi_standardized">Semi-Standardized (Adjustable Inputs)</option>
                    <option value="direct_stock">Direct Stock (No BOM)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Governance Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RecipeStatus)}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
                  >
                    <option value="draft">Draft (In Formulation)</option>
                    <option value="testing">Testing (Kitchen Trial)</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="approved">Approved (Active in POS &amp; Production)</option>
                    <option value="suspended">Suspended (Temporarily Blocked)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Effective Date</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Standard Batch Yield</label>
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
                  <label className="text-xs font-semibold text-neutral-600">Standard Serving Size</label>
                  <input
                    type="text"
                    value={standardPortionSize}
                    onChange={(e) => setStandardPortionSize(e.target.value)}
                    placeholder="e.g. 1 Plate (350g)"
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-600">Revision / Audit Note</label>
                  <input
                    type="text"
                    value={changeSummaryInput}
                    onChange={(e) => setChangeSummaryInput(e.target.value)}
                    placeholder="Reason for this version update..."
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOM COMPONENTS (Unlimited Lines, Searchable Picker, Inline Creation, Unit Conversion) */}
          {activeTab === 'bom' && (
            <div className="space-y-4">
              {/* Search & Quick Add Strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
                <div className="lg:col-span-2 border border-neutral-200 rounded-xl p-3 space-y-2.5 bg-neutral-50/70">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={bomSearchQuery}
                        onChange={(e) => setBomSearchQuery(e.target.value)}
                        placeholder="Search inventory ingredients or prepared sub-recipes to add..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-neutral-200 rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowInlineNewIng((v) => !v)}
                      className="px-3 py-2 text-xs font-semibold bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 rounded-lg whitespace-nowrap cursor-pointer"
                    >
                      + Create New Ingredient
                    </button>
                  </div>

                  {/* Quick-click Ingredient & Sub-Recipe Chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {filteredCatalogIngredients.slice(0, 12).map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => handleAddSpecificIngredient(ing.id)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-orange-50 hover:border-orange-300 text-neutral-800 border border-neutral-200 rounded-lg cursor-pointer"
                      >
                        + {ing.name} ({ing.consumptionUnit})
                      </button>
                    ))}
                    {!isSubRecipe &&
                      filteredSubRecipes.map((sr) => (
                        <button
                          key={sr.id}
                          type="button"
                          onClick={() => handleAddSpecificSubRecipe(sr.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>+ Sub-Recipe: {sr.name}</span>
                        </button>
                      ))}
                  </div>

                  {/* Inline Create New Ingredient Form */}
                  {showInlineNewIng && (() => {
                    const safeRatio = Math.max(1, newIngRatio || 1);
                    const unitCostBase = (newIngCost || 0) / safeRatio;
                    const openingValue = Math.round((newIngInitialStock || 0) * unitCostBase);
                    const lineCostPerPlate = Math.round((newIngPerPlateQty || 0) * unitCostBase);
                    const shortUnit =
                      newIngConsumptionUnit === 'grams'
                        ? 'g'
                        : newIngConsumptionUnit === 'ml'
                        ? 'ml'
                        : newIngConsumptionUnit;
                    const existingMatches =
                      newIngName.trim().length >= 2
                        ? ingredients
                            .filter((i) =>
                              i.name.toLowerCase().includes(newIngName.trim().toLowerCase())
                            )
                            .slice(0, 3)
                        : [];

                    return (
                      <div className="p-3.5 bg-white border border-neutral-200 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <div className="text-xs font-bold text-neutral-900">
                              Create &amp; Attach New Inventory Ingredient
                            </div>
                            <p className="text-[11px] text-neutral-500">
                              Type an ingredient name (or pack size like &quot;Coconut Milk 1L&quot;) to auto-fill packaging, unit conversions, and unit cost.
                            </p>
                          </div>
                          {newIngPresetHint && (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              {newIngPresetHint}
                            </span>
                          )}
                        </div>

                        {existingMatches.length > 0 && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-center justify-between gap-2 flex-wrap">
                            <span>
                              Already in inventory:{' '}
                              <strong>{existingMatches.map((m) => m.name).join(', ')}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                handleAddSpecificIngredient(existingMatches[0].id);
                                setShowInlineNewIng(false);
                                setNewIngName('');
                              }}
                              className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded cursor-pointer"
                            >
                              Attach Existing Instead
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs">
                          <div className="sm:col-span-4 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Ingredient Name
                            </label>
                            <input
                              type="text"
                              value={newIngName}
                              onChange={(e) => handleNewIngNameChange(e.target.value)}
                              placeholder="e.g. Coconut Milk, Pilau Masala, Cooking Oil 5L"
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 font-medium"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Category
                            </label>
                            <select
                              value={newIngCategory}
                              onChange={(e) =>
                                setNewIngCategory(e.target.value as NonNullable<Ingredient['category']>)
                              }
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                            >
                              <option value="Produce">Produce</option>
                              <option value="Meat & Seafood">Meat &amp; Seafood</option>
                              <option value="Dry Goods">Dry Goods</option>
                              <option value="Oils & Dairy">Oils &amp; Dairy</option>
                              <option value="Beverages">Beverages</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              How You Buy It (Pack)
                            </label>
                            <input
                              type="text"
                              value={newIngPurchaseUnit}
                              onChange={(e) => handleNewIngPurchaseUnitChange(e.target.value)}
                              placeholder="e.g. 400ml Can, 25kg Bag"
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Recipe &amp; Stock Unit
                            </label>
                            <select
                              value={newIngConsumptionUnit}
                              onChange={(e) => {
                                setNewIngConsumptionUnit(
                                  e.target.value as 'grams' | 'ml' | 'pcs' | 'bottle'
                                );
                                setNewIngManualLock((prev) => ({ ...prev, pack: true }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                            >
                              <option value="grams">grams (weight)</option>
                              <option value="ml">ml (liquid volume)</option>
                              <option value="pcs">pcs (count)</option>
                              <option value="bottle">bottle (units)</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Qty Inside 1 Pack ({shortUnit})
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={newIngRatio}
                              onChange={(e) => handleNewIngRatioChange(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-semibold tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Cost per Pack (TZS)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={newIngCost}
                              onChange={(e) => {
                                setNewIngCost(Math.max(0, Number(e.target.value) || 0));
                                setNewIngManualLock((prev) => ({ ...prev, cost: true }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-semibold tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Opening Packs in Store
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={newIngOpeningPacks}
                              onChange={(e) => handleOpeningPacksChange(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-semibold tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Total Opening Stock ({shortUnit})
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={newIngInitialStock}
                              onChange={(e) => handleOpeningBaseStockChange(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-semibold tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Qty Used per 1 {yieldUnit.replace(/s$/, '')} ({shortUnit})
                            </label>
                            <input
                              type="number"
                              min={0.01}
                              step="any"
                              value={newIngPerPlateQty}
                              onChange={(e) => {
                                setNewIngPerPlateQty(Math.max(0.01, parseFloat(e.target.value) || 0.01));
                                setNewIngManualLock((prev) => ({ ...prev, perPlate: true }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg font-mono font-semibold tabular-nums"
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="block text-[11px] font-semibold text-neutral-700">
                              Default Supplier
                            </label>
                            <input
                              type="text"
                              value={newIngSupplier}
                              onChange={(e) => setNewIngSupplier(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Live Auto-Calculated Preview Strip */}
                        <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                          <div className="space-y-0.5 text-neutral-700 font-mono tabular-nums">
                            <div>
                              <strong>Conversion:</strong> 1 × {newIngPurchaseUnit || 'Pack'} ={' '}
                              {safeRatio.toLocaleString()} {newIngConsumptionUnit} ·{' '}
                              <strong>Unit Cost:</strong> {unitCostBase.toFixed(2)} TZS/{shortUnit}
                              {(newIngConsumptionUnit === 'grams' || newIngConsumptionUnit === 'ml') &&
                                ` (${formatMoney(Math.round(unitCostBase * 1000))}/${
                                  newIngConsumptionUnit === 'grams' ? 'kg' : 'L'
                                })`}
                            </div>
                            <div className="text-neutral-600">
                              <strong>Opening Store Stock:</strong>{' '}
                              {newIngInitialStock.toLocaleString()} {shortUnit} ({newIngOpeningPacks} packs ·
                              Valued {formatMoney(openingValue)}) ·{' '}
                              <strong>Recipe Cost Impact:</strong> +{formatMoney(lineCostPerPlate)}/
                              {yieldUnit.replace(/s$/, '')}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowInlineNewIng(false)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateAndAttachIngredient}
                              disabled={!newIngName.trim()}
                              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg disabled:opacity-40 cursor-pointer whitespace-nowrap"
                            >
                              Save &amp; Add Line
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Live Cost & Entry Mode Box */}
                <div className="border border-neutral-200 rounded-xl p-3 space-y-2.5 bg-white">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">Quantity Input Mode</span>
                    <div className="flex p-0.5 bg-neutral-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setEntryMode('batch')}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                          entryMode === 'batch' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                        }`}
                      >
                        Per Batch ({batchYieldPlates})
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryMode('per_plate')}
                        className={`px-2 py-1 text-[11px] font-semibold rounded-md cursor-pointer ${
                          entryMode === 'per_plate' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                        }`}
                      >
                        Per 1 {yieldUnit.replace(/s$/, '')}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100 text-xs">
                    <div>
                      <span className="text-[11px] text-neutral-500">Unit Cost</span>
                      <div className="font-bold font-mono tabular-nums text-blue-700">
                        {isSubRecipe
                          ? `${(totalBatchCost / Math.max(1, batchYieldPlates)).toFixed(1)} TZS/${yieldUnit}`
                          : formatMoney(roundedPlateCost)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] text-neutral-500">Batch Cost</span>
                      <div className="font-bold font-mono tabular-nums text-neutral-900">
                        {formatMoney(roundedBatchCost)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unlimited BOM Lines Table */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200">
                      <tr>
                        <th className="py-2.5 px-3">Ingredient / Sub-Recipe</th>
                        <th className="py-2.5 px-3">
                          {entryMode === 'batch' ? `Batch Qty (${batchYieldPlates})` : 'Qty / Plate'}
                        </th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Yield %</th>
                        <th className="py-2.5 px-3">Purchase Req / Plate</th>
                        <th className="py-2.5 px-3">Substitute</th>
                        <th className="py-2.5 px-3 text-right">Plate Cost</th>
                        <th className="py-2.5 px-2 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {calculatedRows.map((row, idx) => {
                        const unitOptions = row.isSubRecipe
                          ? [row.batchUnit]
                          : getCompatibleUnits(row.ingredient?.consumptionUnit || 'pcs');
                        const displayEditQty =
                          entryMode === 'batch'
                            ? row.batchQuantity
                            : Number((row.batchQuantity / Math.max(1, batchYieldPlates)).toFixed(3));

                        return (
                          <tr key={idx} className="hover:bg-neutral-50/70">
                            <td className="py-2.5 px-3">
                              {row.isSubRecipe ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-orange-700 block">
                                    Sub-Recipe (Deducts Prep Pool Only)
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
                                    className="w-48 text-xs font-bold bg-white border border-neutral-300 rounded-lg px-2 py-1.5"
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
                                    const u =
                                      newIng?.consumptionUnit === 'grams'
                                        ? 'g'
                                        : newIng?.consumptionUnit === 'ml'
                                        ? 'ml'
                                        : newIng?.consumptionUnit || 'pcs';
                                    handleUpdateRow(idx, {
                                      ingredientId: e.target.value,
                                      batchUnit: u,
                                    });
                                  }}
                                  className="w-48 text-xs font-bold bg-white border border-neutral-200 rounded-lg px-2 py-1.5"
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
                                value={displayEditQty}
                                onChange={(e) => {
                                  const entered = parseFloat(e.target.value) || 0;
                                  const nextBatchQty =
                                    entryMode === 'batch' ? entered : entered * Math.max(1, batchYieldPlates);
                                  handleUpdateRow(idx, { batchQuantity: Number(nextBatchQty.toFixed(4)) });
                                }}
                                className="w-24 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right tabular-nums"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              {row.isSubRecipe ? (
                                <span className="font-mono text-neutral-700">{row.batchUnit}</span>
                              ) : (
                                <select
                                  value={normalizeUnitName(row.batchUnit)}
                                  onChange={(e) => {
                                    const nextUnit = e.target.value;
                                    const converted = convertQuantity(row.batchQuantity, row.batchUnit, nextUnit);
                                    handleUpdateRow(idx, {
                                      batchUnit: nextUnit,
                                      batchQuantity: Number(converted.toFixed(3)),
                                    });
                                  }}
                                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-mono"
                                >
                                  {unitOptions.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
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

                            <td className="py-2.5 px-3 font-mono tabular-nums text-neutral-700">
                              <div>
                                {row.effectivePerPlateQty.toFixed(row.effectivePerPlateQty < 10 ? 2 : 0)}{' '}
                                {row.isSubRecipe ? row.batchUnit : row.unitLabel}
                              </div>
                              {row.yieldPercentage < 100 && (
                                <div className="text-[10px] text-amber-700">
                                  EP {row.perPlateBaseQty.toFixed(1)} · {100 - row.yieldPercentage}% trim loss
                                </div>
                              )}
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PORTIONS & MODIFIERS */}
          {activeTab === 'portions' && (
            <div className="space-y-4">
              {isSubRecipe ? (
                <div className="p-6 text-center text-xs text-neutral-500 border border-neutral-200 rounded-xl">
                  Sub-recipes supply intermediate preparation pools and do not carry customer POS portion sizes or modifiers.
                </div>
              ) : (
                <>
                  <div className="border border-neutral-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900">Portion Size Multipliers</h4>
                        <p className="text-[11px] text-neutral-500">
                          Scale ingredient deductions automatically when POS selects Small, Regular, or Large portions.
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
                          <div key={v.id} className="py-2.5 flex flex-wrap items-center gap-3 text-xs">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x))
                                )
                              }
                              placeholder="Portion Name (e.g. Small)"
                              className="flex-1 min-w-[160px] bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-semibold"
                            />
                            <div className="flex items-center gap-1.5">
                              <span className="text-neutral-500">Scale Factor:</span>
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
                            <span className="font-mono text-neutral-700 tabular-nums w-32 text-right">
                              Est. Cost: {formatMoney(Math.round(roundedPlateCost * v.portionMultiplier))}
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
                        <h4 className="text-xs font-bold text-neutral-900">
                          POS Modifiers &amp; Incremental BOM Consumption
                        </h4>
                        <p className="text-[11px] text-neutral-500">
                          Each modifier controls both customer price delta AND exact kitchen stock added/removed (e.g. Extra Chicken, Boiled Egg, No Onions).
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
                        {modifierRules.map((mr, i) => {
                          const targetIng = ingredients.find((ing) => ing.id === mr.ingredientId);
                          const unitOpts = getCompatibleUnits(targetIng?.consumptionUnit || 'pcs');
                          return (
                            <div
                              key={mr.id}
                              className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                            >
                              <input
                                type="text"
                                value={mr.modifierName}
                                onChange={(e) =>
                                  setModifierRules((prev) =>
                                    prev.map((x, idx) => (idx === i ? { ...x, modifierName: e.target.value } : x))
                                  )
                                }
                                placeholder="Modifier label"
                                className="sm:col-span-3 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 font-semibold"
                              />
                              <select
                                value={mr.action}
                                onChange={(e) =>
                                  setModifierRules((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? { ...x, action: e.target.value as RecipeModifierRule['action'] }
                                        : x
                                    )
                                  )
                                }
                                className="sm:col-span-2 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5"
                              >
                                <option value="add">Add Stock (+)</option>
                                <option value="remove">Remove Stock (-)</option>
                              </select>
                              <select
                                value={mr.ingredientId}
                                onChange={(e) => {
                                  const ing = ingredients.find((x) => x.id === e.target.value);
                                  setModifierRules((prev) =>
                                    prev.map((x, idx) =>
                                      idx === i
                                        ? {
                                            ...x,
                                            ingredientId: e.target.value,
                                            unit:
                                              ing?.consumptionUnit === 'grams'
                                                ? 'g'
                                                : ing?.consumptionUnit === 'ml'
                                                ? 'ml'
                                                : ing?.consumptionUnit || 'pcs',
                                          }
                                        : x
                                    )
                                  );
                                }}
                                className="sm:col-span-3 bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-1.5"
                              >
                                {ingredients.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name}
                                  </option>
                                ))}
                              </select>
                              <div className="sm:col-span-2 flex items-center gap-1">
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
                                <select
                                  value={normalizeUnitName(mr.unit || targetIng?.consumptionUnit || 'pcs')}
                                  onChange={(e) =>
                                    setModifierRules((prev) =>
                                      prev.map((x, idx) => (idx === i ? { ...x, unit: e.target.value } : x))
                                    )
                                  }
                                  className="bg-neutral-50 border border-neutral-200 rounded-lg px-1.5 py-1.5 font-mono"
                                >
                                  {unitOpts.map((u) => (
                                    <option key={u} value={u}>
                                      {u}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2 flex items-center gap-1">
                                <input
                                  type="number"
                                  value={mr.priceDelta ?? 0}
                                  onChange={(e) =>
                                    setModifierRules((prev) =>
                                      prev.map((x, idx) =>
                                        idx === i ? { ...x, priceDelta: parseInt(e.target.value) || 0 } : x
                                      )
                                    )
                                  }
                                  placeholder="+Price TZS"
                                  title="Price adjustment (TZS)"
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
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: PRODUCTION SOP */}
          {activeTab === 'sop' && (
            <div className="space-y-4 border border-neutral-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Cooking Temperature</label>
                  <input
                    type="text"
                    value={cookingTemp}
                    onChange={(e) => setCookingTemp(e.target.value)}
                    placeholder="e.g. 95°C Simmer"
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Cook Time (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={cookingTimeMins}
                    onChange={(e) => setCookingTimeMins(Math.max(1, Number(e.target.value) || 15))}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Expected Yield (%)</label>
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
                  <label className="text-xs font-semibold text-neutral-600">Shelf Life (Hours)</label>
                  <input
                    type="number"
                    min={1}
                    value={shelfLifeHours}
                    onChange={(e) => setShelfLifeHours(Math.max(1, Number(e.target.value) || 24))}
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Preparation &amp; Mise-en-Place Steps</label>
                <textarea
                  rows={2}
                  value={prepInstructions}
                  onChange={(e) => setPrepInstructions(e.target.value)}
                  placeholder="Wash, trim, weigh sub-recipe portions..."
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">Cooking &amp; Plating Procedure</label>
                <textarea
                  rows={2}
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  placeholder="Cooking heat, order of assembly, scoop size..."
                  className="w-full p-2.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Food Safety &amp; Holding Notes</label>
                  <input
                    type="text"
                    value={foodSafetyNotes}
                    onChange={(e) => setFoodSafetyNotes(e.target.value)}
                    placeholder="e.g. Hold above 63°C; rapid-chill leftovers below 5°C"
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-600">Allergens (Comma separated)</label>
                  <input
                    type="text"
                    value={allergensText}
                    onChange={(e) => setAllergensText(e.target.value)}
                    placeholder="e.g. Dairy, Fish, Eggs"
                    className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: COSTING & HISTORY */}
          {activeTab === 'costing' && (
            <div className="space-y-5">
              {/* Cost & Food Gross Profit Rollup */}
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">Batch Ingredient Cost</span>
                    <div className="text-base font-bold font-mono tabular-nums text-neutral-900 mt-0.5">
                      {formatMoney(roundedBatchCost)}
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      For {batchYieldPlates.toLocaleString()} {yieldUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-neutral-500">
                      {isSubRecipe ? `Cost per ${yieldUnit}` : 'Cost per Plate'}
                    </span>
                    <div className="text-base font-bold font-mono tabular-nums text-blue-700 mt-0.5">
                      {isSubRecipe
                        ? `${(totalBatchCost / Math.max(1, batchYieldPlates)).toFixed(2)} TZS`
                        : formatMoney(roundedPlateCost)}
                    </div>
                    <span className="text-[11px] text-neutral-500">Yield-adjusted weighted avg</span>
                  </div>
                  {!isSubRecipe && (
                    <>
                      <div>
                        <span className="text-[11px] font-semibold text-neutral-500">Food Gross Profit</span>
                        <div className="text-base font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                          {formatMoney(foodGrossProfit)}
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          {linkMode === 'unlinked_standalone' ? 'Target: ' : 'Sell: '}
                          {formatMoney(sellPrice)}
                        </span>
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
                {!isSubRecipe && (
                  <p className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-200">
                    Note: <strong>Food Gross Profit</strong> measures Selling Price minus direct BOM Ingredient &amp; Sub-Recipe Cost. Packaging, kitchen labour, gas/power, and overheads are excluded.
                  </p>
                )}
              </div>

              {/* Ingredient Cost Share Breakdown */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-900">
                  Cost Breakdown by BOM Component
                </div>
                <div className="divide-y divide-neutral-100 text-xs">
                  {calculatedRows.map((row, i) => {
                    const sharePct = roundedBatchCost > 0 ? (row.lineBatchCost / roundedBatchCost) * 100 : 0;
                    return (
                      <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-neutral-900 truncate">
                            {row.isSubRecipe ? row.subRecipe?.name : row.ingredient?.name}
                          </div>
                          <div className="text-[11px] text-neutral-500 font-mono tabular-nums">
                            {row.perPlateDisplay.toFixed(row.perPlateDisplay < 10 ? 2 : 0)} {row.batchUnit} / serving ·{' '}
                            {sharePct.toFixed(1)}% of cost
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums">
                          <div className="font-bold text-neutral-900">{formatMoney(row.lineCostPerPlate)} / plate</div>
                          <div className="text-[11px] text-neutral-500">{formatMoney(row.lineBatchCost)} / batch</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Version History & Cost Comparison */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                    <History className="w-4 h-4 text-orange-600" />
                    <span>Version History &amp; Approval Audit Trail</span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-500">
                    Current Draft: v{recipe ? recipe.version + 1 : 1}
                  </span>
                </div>

                {!recipe?.history || recipe.history.length === 0 ? (
                  <p className="p-4 text-xs text-neutral-500">
                    No prior archived versions yet. Saving changes will archive the previous version automatically.
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100">
                    {recipe.history.map((hist) => (
                      <div key={hist.version} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="font-mono">
                            <span className="font-bold text-neutral-900">v{hist.version}</span>
                            <span className="mx-1.5 text-neutral-300">·</span>
                            <span className="text-neutral-700">Yield {hist.batchYieldPlates}</span>
                            <span className="mx-1.5 text-neutral-300">·</span>
                            <span className="text-neutral-500">
                              {hist.changedAt} by {hist.changedBy}
                            </span>
                          </div>
                          <p className="text-neutral-700">{hist.changeSummary}</p>
                          <div className="font-mono text-neutral-500 tabular-nums">
                            Unit Cost: {formatMoney(hist.totalCostPerPlate ?? hist.costPerPlate ?? 0)} · Food Cost:{' '}
                            {hist.foodCostPercentage.toFixed(1)}%
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(hist)}
                          className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 rounded-lg inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore v{hist.version}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-neutral-200">
            <div className="text-xs text-neutral-500 font-mono tabular-nums">
              {isSubRecipe
                ? `Sub-Recipe Cost: ${(totalBatchCost / Math.max(1, batchYieldPlates)).toFixed(2)} TZS/${yieldUnit}`
                : `Plate Cost ${formatMoney(roundedPlateCost)} · Food Gross Profit ${formatMoney(foodGrossProfit)}`}
            </div>
            <div className="flex items-center gap-2.5">
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
          </div>
        </form>
      </div>
    </div>
  );
};
