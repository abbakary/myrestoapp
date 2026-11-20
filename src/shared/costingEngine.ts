import type {
  AppNotification,
  Ingredient,
  MenuItem,
  MissingStockItem,
  ModifierItem,
  MovementType,
  OrderItemStatus,
  PreparedDishStock,
  ProductionLog,
  Recipe,
  StockBatchLot,
  StockMovement,
  SubRecipeStockBatch,
} from '../types/restaurant.ts';
import { convertQuantity } from '../utils/unitConversion.ts';
import { createId, todayDateStr } from './helpers.ts';
import type { ScaledRequirementRow, ScaledRequirementsResult } from './types.ts';

export function computeRecipeUnitCostPure(
  recipeId: string,
  recipes: Recipe[],
  ingredients: Ingredient[],
  subRecipeBatches: SubRecipeStockBatch[],
  visited: Set<string> = new Set()
): { batchCost: number; unitCost: number; perPlateCost: number } {
  if (visited.has(recipeId)) return { batchCost: 0, unitCost: 0, perPlateCost: 0 };
  const nextVisited = new Set(visited);
  nextVisited.add(recipeId);

  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) return { batchCost: 0, unitCost: 0, perPlateCost: 0 };

  const yieldQty = Math.max(1, recipe.batchYieldPlates || 1);
  let batchCost = 0;

  recipe.ingredients.forEach((ri) => {
    const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);
    if (ri.isSubRecipe && ri.subRecipeId) {
      const subQtyForBatch = ri.subRecipeQuantity ?? ri.batchQuantity ?? ri.quantity * yieldQty;
      const activeSubBatches = subRecipeBatches.filter(
        (sb) => sb.subRecipeId === ri.subRecipeId && sb.status !== 'reversed' && sb.remainingQty > 0
      );
      const subUnitCost =
        activeSubBatches.length > 0
          ? activeSubBatches[0].costPerUnit
          : computeRecipeUnitCostPure(ri.subRecipeId, recipes, ingredients, subRecipeBatches, nextVisited).unitCost;
      batchCost += (subQtyForBatch / yieldFactor) * subUnitCost;
    } else {
      const ing = ingredients.find((i) => i.id === ri.ingredientId);
      if (ing && ing.conversionRatio > 0) {
        const ingUnitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
        const batchQty = ri.batchQuantity ?? ri.quantity * yieldQty;
        batchCost += (batchQty / yieldFactor) * ingUnitCost;
      }
    }
  });

  const roundedBatch = Math.round(batchCost);
  const unitCost = batchCost / yieldQty;
  return {
    batchCost: roundedBatch,
    unitCost,
    perPlateCost: Math.round(unitCost),
  };
}

export function consumeStockLotsPure(
  stockLots: StockBatchLot[],
  ingredientId: string,
  qtyToDeduct: number,
  location: 'kitchen' | 'main_store'
): StockBatchLot[] {
  if (qtyToDeduct <= 0) return stockLots;
  let remaining = qtyToDeduct;
  const matchingIds = stockLots
    .filter((lot) => lot.ingredientId === ingredientId && lot.location === location && lot.remainingQty > 0)
    .sort((a, b) => {
      if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      return a.receivedDate.localeCompare(b.receivedDate);
    })
    .map((l) => l.id);

  const deductions = new Map<string, number>();
  for (const lotId of matchingIds) {
    if (remaining <= 0) break;
    const lot = stockLots.find((l) => l.id === lotId);
    if (!lot) continue;
    const take = Math.min(lot.remainingQty, remaining);
    deductions.set(lotId, take);
    remaining -= take;
  }

  if (deductions.size === 0) return stockLots;
  return stockLots.map((lot) => {
    const take = deductions.get(lot.id);
    return take ? { ...lot, remainingQty: Math.max(0, lot.remainingQty - take) } : lot;
  });
}

export function validateBatchKitchenStockPure(
  recipeId: string,
  batches: number,
  recipes: Recipe[],
  ingredients: Ingredient[],
  stockMovements: StockMovement[],
  subRecipeBatches: SubRecipeStockBatch[],
  actualInputs?: Record<string, number>
): {
  canCook: boolean;
  missingItems: MissingStockItem[];
  totalCost: number;
  targetYieldPlates: number;
} {
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) {
    return { canCook: false, missingItems: [], totalCost: 0, targetYieldPlates: 0 };
  }

  const multiplier = Math.max(0.1, batches || 1);
  const targetYieldPlates = Math.round((recipe.batchYieldPlates || 1) * multiplier);
  let totalCost = 0;

  const missingItems: MissingStockItem[] = recipe.ingredients.map((ri) => {
    const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);

    if (ri.isSubRecipe && ri.subRecipeId) {
      const subRec = recipes.find((r) => r.id === ri.subRecipeId);
      const subName = subRec?.name || 'Prepared Sub-Recipe';
      const subUnit = ri.subRecipeUnit || subRec?.yieldUnit || 'portions';
      const baseSubReq =
        (ri.subRecipeQuantity ?? ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 1)) * multiplier;
      const standardReq = Math.round(baseSubReq / yieldFactor);
      const requiredQty =
        actualInputs && actualInputs[ri.subRecipeId] !== undefined
          ? Math.max(0, Math.round(actualInputs[ri.subRecipeId]))
          : standardReq;

      const availableSubBatches = subRecipeBatches.filter(
        (sb) =>
          sb.subRecipeId === ri.subRecipeId &&
          sb.remainingQty > 0 &&
          sb.status !== 'reversed' &&
          sb.status !== 'expired'
      );
      const availableKitchenQty = Math.round(availableSubBatches.reduce((sum, sb) => sum + sb.remainingQty, 0));
      const subUnitCost =
        availableSubBatches.length > 0
          ? availableSubBatches[0].costPerUnit
          : computeRecipeUnitCostPure(ri.subRecipeId, recipes, ingredients, subRecipeBatches).unitCost;

      totalCost += Math.round(requiredQty * subUnitCost);

      let status: 'not_transferred' | 'insufficient' | 'ok' = 'ok';
      let shortageQty = 0;
      if (availableKitchenQty <= 0) {
        status = 'not_transferred';
        shortageQty = requiredQty;
      } else if (availableKitchenQty < requiredQty) {
        status = 'insufficient';
        shortageQty = requiredQty - availableKitchenQty;
      }

      return {
        ingredientId: ri.subRecipeId,
        ingredientName: `${subName} (Prepared Sub-Recipe)`,
        requiredQty,
        availableKitchenQty,
        storeAvailableQty: 0,
        inTransitQty: 0,
        unit: subUnit,
        status,
        shortageQty,
        isSubRecipe: true,
        subRecipeId: ri.subRecipeId,
      };
    }

    const ing = ingredients.find((i) => i.id === ri.ingredientId);
    const ingredientName = ing ? ing.name : 'Unknown Ingredient';
    const unit = ing ? ing.consumptionUnit : 'units';
    const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;

    const rawRequired = (ri.batchQuantity ?? ri.quantity * (recipe.batchYieldPlates || 1)) * multiplier;
    const standardReq = Math.round(rawRequired / yieldFactor);
    const requiredQty =
      actualInputs && actualInputs[ri.ingredientId] !== undefined
        ? Math.max(0, Math.round(actualInputs[ri.ingredientId]))
        : standardReq;

    const availableKitchenQty = ing?.kitchenStockUnits ?? 0;
    const storeAvailableQty = ing?.storeStockUnits ?? 0;
    const inTransitQty = stockMovements
      .filter((m) => m.ingredientId === ri.ingredientId && m.transferStatus === 'in_transit')
      .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

    const subIng = ri.substituteIngredientId
      ? ingredients.find((i) => i.id === ri.substituteIngredientId)
      : undefined;

    totalCost += Math.round(requiredQty * unitCost);

    let status: 'not_transferred' | 'insufficient' | 'ok' = 'ok';
    let shortageQty = 0;
    if (availableKitchenQty <= 0) {
      status = 'not_transferred';
      shortageQty = requiredQty;
    } else if (availableKitchenQty < requiredQty) {
      status = 'insufficient';
      shortageQty = requiredQty - availableKitchenQty;
    }

    return {
      ingredientId: ri.ingredientId,
      ingredientName,
      requiredQty,
      availableKitchenQty,
      storeAvailableQty,
      inTransitQty,
      unit,
      status,
      shortageQty,
      substituteIngredientId: subIng?.id,
      substituteIngredientName: subIng?.name,
      substituteKitchenQty: subIng?.kitchenStockUnits ?? 0,
    };
  });

  return {
    canCook: missingItems.every((item) => item.status === 'ok'),
    missingItems,
    totalCost,
    targetYieldPlates,
  };
}

export function calculateScaledRequirementsPure(
  items: Array<{
    recipeId?: string;
    menuItemId?: string;
    portions: number;
    portionName?: string;
    modifierNames?: string[];
    substituteOverrides?: Record<string, string>;
  }>,
  recipes: Recipe[],
  _menuItems: MenuItem[],
  ingredients: Ingredient[],
  subRecipeBatches: SubRecipeStockBatch[]
): ScaledRequirementsResult {
  const rawAccumulator = new Map<
    string,
    { requiredQty: number; substituteOverrideId?: string; defaultSubstituteId?: string }
  >();
  const subAccumulator = new Map<string, { requiredQty: number; unit: string }>();

  items.forEach((item) => {
    const portions = Math.max(0, item.portions || 0);
    if (portions <= 0) return;

    const recipe =
      (item.recipeId ? recipes.find((r) => r.id === item.recipeId) : undefined) ||
      (item.menuItemId ? recipes.find((r) => r.menuItemId === item.menuItemId) : undefined);

    if (!recipe) {
      if (item.menuItemId === 'menu-soda-bottle') {
        const cur = rawAccumulator.get('ing-soda') || { requiredQty: 0 };
        rawAccumulator.set('ing-soda', { ...cur, requiredQty: cur.requiredQty + portions });
      }
      return;
    }

    const batchYield = Math.max(1, recipe.batchYieldPlates || 1);
    const variant = item.portionName
      ? recipe.variants?.find((v) => v.name.toLowerCase() === item.portionName?.toLowerCase())
      : undefined;
    const portionMultiplier = variant?.portionMultiplier ?? 1;

    recipe.ingredients.forEach((ri) => {
      const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);

      if (ri.isSubRecipe && ri.subRecipeId) {
        const perUnit = ri.subRecipeQuantity && batchYield > 0 ? ri.subRecipeQuantity / batchYield : ri.quantity;
        const totalSubQty = ((perUnit * portionMultiplier) / yieldFactor) * portions;
        const sr = recipes.find((r) => r.id === ri.subRecipeId);
        const cur = subAccumulator.get(ri.subRecipeId) || {
          requiredQty: 0,
          unit: ri.subRecipeUnit || sr?.yieldUnit || 'portions',
        };
        subAccumulator.set(ri.subRecipeId, {
          ...cur,
          requiredQty: cur.requiredQty + totalSubQty,
        });
        return;
      }

      const override = variant?.ingredientOverrides?.find((ov) => ov.ingredientId === ri.ingredientId);
      const perUnit = override
        ? override.quantity
        : (ri.batchQuantity !== undefined ? ri.batchQuantity / batchYield : ri.quantity) * portionMultiplier;
      const totalRaw = (perUnit / yieldFactor) * portions;
      const chosenId = item.substituteOverrides?.[ri.ingredientId] || ri.ingredientId;
      const cur = rawAccumulator.get(chosenId) || {
        requiredQty: 0,
        defaultSubstituteId: ri.substituteIngredientId,
        substituteOverrideId: item.substituteOverrides?.[ri.ingredientId],
      };
      rawAccumulator.set(chosenId, {
        ...cur,
        requiredQty: cur.requiredQty + totalRaw,
      });
    });

    const modLowers = (item.modifierNames || []).map((m) => m.toLowerCase());
    (recipe.modifierRules || []).forEach((rule) => {
      const ruleLower = rule.modifierName.toLowerCase();
      if (!modLowers.some((m) => m.includes(ruleLower) || ruleLower.includes(m))) return;
      const targetIng = ingredients.find((i) => i.id === rule.ingredientId);
      const deltaInBase =
        targetIng && rule.unit ? convertQuantity(rule.quantityDelta, rule.unit, targetIng.consumptionUnit) : rule.quantityDelta;
      const cur = rawAccumulator.get(rule.ingredientId) || { requiredQty: 0 };
      if (rule.action === 'add') {
        rawAccumulator.set(rule.ingredientId, {
          ...cur,
          requiredQty: cur.requiredQty + deltaInBase * portions,
        });
      } else if (rule.action === 'remove') {
        rawAccumulator.set(rule.ingredientId, {
          ...cur,
          requiredQty: Math.max(0, cur.requiredQty - deltaInBase * portions),
        });
      }
    });
  });

  const rows: ScaledRequirementRow[] = [];

  subAccumulator.forEach((entry, subRecipeId) => {
    const subRec = recipes.find((r) => r.id === subRecipeId);
    const activeBatches = subRecipeBatches.filter(
      (sb) => sb.subRecipeId === subRecipeId && sb.remainingQty > 0 && sb.status !== 'reversed' && sb.status !== 'expired'
    );
    const availPool = Math.round(activeBatches.reduce((s, b) => s + b.remainingQty, 0) * 100) / 100;
    const unitCost =
      activeBatches.length > 0
        ? activeBatches[0].costPerUnit
        : computeRecipeUnitCostPure(subRecipeId, recipes, ingredients, subRecipeBatches).unitCost;
    const requiredQty = Math.round(entry.requiredQty * 100) / 100;
    const shortage = Math.max(0, Math.round((requiredQty - availPool) * 100) / 100);

    rows.push({
      key: `sub:${subRecipeId}`,
      ingredientId: subRecipeId,
      ingredientName: `${subRec?.name || subRecipeId} (Sub-Recipe Pool)`,
      isSubRecipe: true,
      subRecipeId,
      requiredQty,
      unit: entry.unit,
      availableKitchenQty: availPool,
      availableStoreQty: 0,
      reservedQty: 0,
      totalAvailableQty: availPool,
      netUnreservedTotalQty: availPool,
      kitchenShortageQty: shortage,
      globalShortageQty: shortage,
      status: shortage <= 0 ? 'ok' : 'shortage',
      unitCost,
      estimatedCost: Math.round(requiredQty * unitCost),
    });
  });

  rawAccumulator.forEach((entry, ingId) => {
    const ing = ingredients.find((i) => i.id === ingId);
    if (!ing) return;
    const requiredQty = Math.round(entry.requiredQty);
    const availKitchen = ing.kitchenStockUnits ?? 0;
    const availStore = ing.storeStockUnits ?? 0;
    const reservedQty = ing.reservedStockUnits ?? 0;
    const totalAvail = availKitchen + availStore;
    const netUnreserved = Math.max(0, totalAvail - reservedQty);
    const kitchenShortage = Math.max(0, requiredQty - availKitchen);
    const globalShortage = Math.max(0, requiredQty - netUnreserved);
    const unitCost = ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const subIng = entry.defaultSubstituteId ? ingredients.find((i) => i.id === entry.defaultSubstituteId) : undefined;

    rows.push({
      key: `raw:${ingId}`,
      ingredientId: ingId,
      ingredientName: ing.name,
      isSubRecipe: false,
      requiredQty,
      unit: ing.consumptionUnit,
      availableKitchenQty: availKitchen,
      availableStoreQty: availStore,
      reservedQty,
      totalAvailableQty: totalAvail,
      netUnreservedTotalQty: netUnreserved,
      kitchenShortageQty: kitchenShortage,
      globalShortageQty: globalShortage,
      status: kitchenShortage <= 0 && globalShortage <= 0 ? 'ok' : globalShortage <= 0 ? 'kitchen_short_store_ok' : 'shortage',
      unitCost,
      estimatedCost: Math.round(requiredQty * unitCost),
      substituteIngredientId: subIng?.id,
      substituteIngredientName: subIng?.name,
      substituteAvailableQty: subIng ? subIng.currentStockUnits : undefined,
    });
  });

  const totalPortions = items.reduce((s, it) => s + Math.max(0, it.portions || 0), 0);
  let maxProducible = totalPortions > 0 ? Infinity : 0;
  if (totalPortions > 0) {
    rows.forEach((r) => {
      if (r.requiredQty > 0) {
        const ratio = r.netUnreservedTotalQty / r.requiredQty;
        const cap = Math.floor(totalPortions * ratio);
        if (cap < maxProducible) maxProducible = cap;
      }
    });
  }
  if (!Number.isFinite(maxProducible)) maxProducible = totalPortions;

  return {
    rows,
    canProduceFromKitchen: rows.every((r) => r.kitchenShortageQty <= 0),
    canProduceWithStore: rows.every((r) => r.globalShortageQty <= 0),
    totalEstimatedCost: rows.reduce((s, r) => s + r.estimatedCost, 0),
    maxProduciblePortions: Math.max(0, maxProducible),
  };
}

export interface DeductOrderStockInput {
  orderItems: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    portion?: string;
    selectedModifiers?: ModifierItem[];
    customerNotes?: string;
    customInstructions?: string;
    status?: OrderItemStatus;
  }>;
  orderNumber: string;
  stageLabel: string;
  recipes: Recipe[];
  ingredients: Ingredient[];
  stockLots: StockBatchLot[];
  subRecipeBatches: SubRecipeStockBatch[];
  preparedDishStocks: PreparedDishStock[];
  productionLogs: ProductionLog[];
  stockMovements: StockMovement[];
  notifications: AppNotification[];
}

export function deductStockForOrderLinesPure(input: DeductOrderStockInput) {
  const newMovements: StockMovement[] = [];
  const lowKitchenAlerts: string[] = [];
  const subRecipeDeductions: { subRecipeId: string; qty: number; dishName: string }[] = [];
  const batchPlateDeductions: { menuItemId: string; qty: number }[] = [];
  const ingredientDeductions: { ingredientId: string; qty: number; reason: string; type: MovementType }[] = [];

  const activeLines = input.orderItems.filter((li) => li.status !== 'rejected');

  activeLines.forEach((li) => {
    const recipe = input.recipes.find((r) => r.menuItemId === li.menuItemId);

    if (!recipe) {
      if (li.menuItemId === 'menu-soda-bottle' || li.name.toLowerCase().includes('soda')) {
        ingredientDeductions.push({
          ingredientId: 'ing-soda',
          qty: li.quantity,
          reason: `Direct stock consumption (${li.quantity}x ${li.name} · ${input.stageLabel})`,
          type: 'direct_consumption',
        });
      }
      return;
    }

    if (recipe.status === 'archived' || recipe.status === 'suspended') return;

    if (recipe.cookingMethod === 'batch_cooking') {
      const variant = li.portion
        ? recipe.variants?.find((v) => v.name.toLowerCase() === li.portion?.toLowerCase())
        : undefined;
      const plateScale = variant ? (variant.portionMultiplier >= 1.4 ? 1.5 : 1) : 1;
      batchPlateDeductions.push({
        menuItemId: li.menuItemId,
        qty: Math.round(li.quantity * plateScale * 10) / 10,
      });
      return;
    }

    const variant = li.portion
      ? recipe.variants?.find((v) => v.name.toLowerCase() === li.portion?.toLowerCase())
      : undefined;
    const portionMultiplier = variant?.portionMultiplier ?? 1.0;
    const combinedNotes = `${li.customerNotes || ''} ${li.customInstructions || ''}`.toLowerCase();
    const modNames = (li.selectedModifiers || []).map((m) => m.name.toLowerCase());
    const perLineRawQty = new Map<string, number>();

    recipe.ingredients.forEach((ri) => {
      const override = variant?.ingredientOverrides?.find((ov) => ov.ingredientId === ri.ingredientId);
      const yieldFactor = Math.max(0.1, (ri.yieldPercentage || 100) / 100);

      if (ri.isSubRecipe && ri.subRecipeId) {
        const perPlateSubQty =
          (ri.subRecipeQuantity && recipe.batchYieldPlates > 0
            ? ri.subRecipeQuantity / recipe.batchYieldPlates
            : ri.quantity) * portionMultiplier;
        const totalSubQty = Math.round((perPlateSubQty / yieldFactor) * li.quantity * 100) / 100;
        if (totalSubQty > 0) {
          subRecipeDeductions.push({
            subRecipeId: ri.subRecipeId,
            qty: totalSubQty,
            dishName: `${li.quantity}x ${li.name}${li.portion ? ` (${li.portion})` : ''}`,
          });
        }
        return;
      }

      const basePerPlate = override ? override.quantity : ri.quantity * portionMultiplier;
      const grossPerPlate = basePerPlate / yieldFactor;
      const totalQty = grossPerPlate * li.quantity;

      const primaryIng = input.ingredients.find((i) => i.id === ri.ingredientId);
      let targetIngId = ri.ingredientId;
      if (primaryIng && (primaryIng.kitchenStockUnits ?? 0) < totalQty && ri.substituteIngredientId) {
        const subIng = input.ingredients.find((i) => i.id === ri.substituteIngredientId);
        if (subIng && (subIng.kitchenStockUnits ?? 0) >= totalQty) {
          targetIngId = subIng.id;
        }
      }
      perLineRawQty.set(targetIngId, (perLineRawQty.get(targetIngId) || 0) + totalQty);
    });

    (recipe.modifierRules || []).forEach((rule) => {
      const ruleLower = rule.modifierName.toLowerCase();
      const isTriggered =
        modNames.some((mn) => mn.includes(ruleLower) || ruleLower.includes(mn)) || combinedNotes.includes(ruleLower);
      if (!isTriggered) return;

      const targetIng = input.ingredients.find((i) => i.id === rule.ingredientId);
      const deltaInBase =
        targetIng && rule.unit ? convertQuantity(rule.quantityDelta, rule.unit, targetIng.consumptionUnit) : rule.quantityDelta;

      if (rule.action === 'add') {
        perLineRawQty.set(rule.ingredientId, (perLineRawQty.get(rule.ingredientId) || 0) + deltaInBase * li.quantity);
      } else if (rule.action === 'remove') {
        const cur = perLineRawQty.get(rule.ingredientId) || 0;
        perLineRawQty.set(rule.ingredientId, Math.max(0, cur - deltaInBase * li.quantity));
      } else if (rule.action === 'substitute' && rule.substituteIngredientId) {
        const cur = perLineRawQty.get(rule.ingredientId) || 0;
        const removed = Math.min(cur, deltaInBase * li.quantity);
        perLineRawQty.set(rule.ingredientId, Math.max(0, cur - removed));
        perLineRawQty.set(rule.substituteIngredientId, (perLineRawQty.get(rule.substituteIngredientId) || 0) + removed);
      }
    });

    perLineRawQty.forEach((rawQty, ingId) => {
      const rounded = Math.round(rawQty);
      if (rounded > 0) {
        ingredientDeductions.push({
          ingredientId: ingId,
          qty: rounded,
          reason: `BOM consumption for ${li.quantity}x ${li.name}${li.portion ? ` (${li.portion})` : ''} · ${input.stageLabel}`,
          type: 'kitchen_consumption',
        });
      }
    });
  });

  let nextPreparedDishStocks = input.preparedDishStocks;
  let nextProductionLogs = input.productionLogs;
  if (batchPlateDeductions.length > 0) {
    nextPreparedDishStocks = input.preparedDishStocks.map((p) => {
      const match = batchPlateDeductions.filter((b) => b.menuItemId === p.menuItemId);
      if (match.length === 0) return p;
      const sumQty = match.reduce((s, b) => s + b.qty, 0);
      const newAvailable = Math.max(0, p.preparedPlatesAvailable - sumQty);
      return {
        ...p,
        preparedPlatesAvailable: newAvailable,
        totalSoldToday: p.totalSoldToday + sumQty,
        status: newAvailable === 0 ? 'out_of_stock' : newAvailable <= 10 ? 'low' : 'ready',
      };
    });

    const remainingNeed = new Map<string, number>();
    batchPlateDeductions.forEach((b) => {
      remainingNeed.set(b.menuItemId, (remainingNeed.get(b.menuItemId) || 0) + b.qty);
    });
    nextProductionLogs = input.productionLogs.map((pl) => {
      if (pl.status === 'reversed' || pl.productionType === 'sub_recipe') return pl;
      const need = remainingNeed.get(pl.menuItemId) || 0;
      if (need <= 0 || pl.remainingPlates <= 0) return pl;
      const take = Math.min(pl.remainingPlates, need);
      remainingNeed.set(pl.menuItemId, need - take);
      return {
        ...pl,
        remainingPlates: Math.max(0, pl.remainingPlates - take),
      };
    });
  }

  let nextSubRecipeBatches = input.subRecipeBatches;
  if (subRecipeDeductions.length > 0) {
    const todayStr = todayDateStr();
    nextSubRecipeBatches = input.subRecipeBatches.map((b) => ({ ...b }));
    subRecipeDeductions.forEach((ded) => {
      let rem = ded.qty;
      const candidates = nextSubRecipeBatches
        .filter((b) => b.subRecipeId === ded.subRecipeId && b.remainingQty > 0 && b.status !== 'reversed' && b.status !== 'expired')
        .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
      for (const batch of candidates) {
        if (rem <= 0) break;
        const take = Math.min(batch.remainingQty, rem);
        batch.remainingQty = Math.round((batch.remainingQty - take) * 100) / 100;
        batch.status =
          batch.remainingQty <= 0 ? 'consumed' : batch.remainingQty <= batch.producedQty * 0.2 ? 'low' : 'available';
        rem -= take;
        newMovements.push({
          id: createId('sm-sub'),
          ingredientId: batch.subRecipeId,
          ingredientName: `${batch.name} [Sub-Recipe]`,
          type: 'kitchen_consumption',
          quantityDelta: -take,
          unit: batch.unit,
          costImpact: Math.round(take * batch.costPerUnit),
          date: todayStr,
          reference: `Order ${input.orderNumber}`,
          batchNumber: batch.batchNumber,
          recipeId: batch.subRecipeId,
          reason: `Sub-recipe batch deduction for ${ded.dishName} (${input.stageLabel})`,
          recordedBy: 'Auto Kitchen BOM Engine',
          sourceLocation: 'kitchen',
        });
      }
    });
  }

  let nextIngredients = input.ingredients;
  let nextStockLots = input.stockLots;
  if (ingredientDeductions.length > 0) {
    nextIngredients = [...input.ingredients];
    ingredientDeductions.forEach((ded) => {
      const ingIndex = nextIngredients.findIndex((ing) => ing.id === ded.ingredientId);
      if (ingIndex === -1) return;
      const ing = nextIngredients[ingIndex];
      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      const currentKitchen = ing.kitchenStockUnits ?? 0;
      const currentStore = ing.storeStockUnits ?? Math.max(0, ing.currentStockUnits - currentKitchen);

      let newKitchen = currentKitchen - ded.qty;
      let newStore = currentStore;

      if (newKitchen < 0) {
        const deficit = -newKitchen;
        newStore = Math.max(0, currentStore - deficit);
        newKitchen = 0;
        lowKitchenAlerts.push(`${ing.name} (Kitchen line ran out, drawn from Store)`);
        nextStockLots = consumeStockLotsPure(nextStockLots, ing.id, currentKitchen, 'kitchen');
        nextStockLots = consumeStockLotsPure(nextStockLots, ing.id, deficit, 'main_store');
      } else {
        nextStockLots = consumeStockLotsPure(nextStockLots, ing.id, ded.qty, 'kitchen');
        if (newKitchen <= ing.minimumThreshold * 0.25) {
          lowKitchenAlerts.push(`${ing.name} (${newKitchen.toLocaleString()} ${ing.consumptionUnit} left in kitchen)`);
        }
      }

      nextIngredients[ingIndex] = {
        ...ing,
        kitchenStockUnits: newKitchen,
        storeStockUnits: newStore,
        currentStockUnits: Math.max(0, newKitchen + newStore),
      };

      newMovements.push({
        id: createId('sm'),
        ingredientId: ing.id,
        ingredientName: ing.name,
        type: ded.type,
        quantityDelta: -ded.qty,
        unit: ing.consumptionUnit,
        costImpact: Math.round(unitCost * ded.qty),
        date: todayDateStr(),
        reference: `Order ${input.orderNumber}`,
        reason: ded.reason,
        recordedBy: 'Auto Kitchen BOM Engine',
        sourceLocation: 'kitchen',
      });
    });
  }

  const nextStockMovements = newMovements.length > 0 ? [...newMovements, ...input.stockMovements] : input.stockMovements;
  let nextNotifications = input.notifications;
  if (lowKitchenAlerts.length > 0) {
    nextNotifications = [
      {
        id: createId('notif'),
        title: 'Kitchen Line Stock Running Low',
        message: `Replenishment needed: ${lowKitchenAlerts.slice(0, 2).join('; ')}. Use Transfer Module to issue from Main Store.`,
        type: 'stock',
        timestamp: new Date().toISOString(),
        read: false,
        actionRole: 'manager',
        actionLabel: 'Transfer Stock',
      },
      ...nextNotifications,
    ];
  }

  return {
    ingredients: nextIngredients,
    stockLots: nextStockLots,
    subRecipeBatches: nextSubRecipeBatches,
    preparedDishStocks: nextPreparedDishStocks,
    productionLogs: nextProductionLogs,
    stockMovements: nextStockMovements,
    notifications: nextNotifications,
  };
}
