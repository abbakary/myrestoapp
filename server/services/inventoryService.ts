import type {
  BlockedCookingAttempt,
  BomAuditLog,
  BranchTransferRequest,
  CateringOrder,
  CateringOrderItem,
  CateringOrderStatus,
  DailyReconciliationItem,
  Ingredient,
  MenuItem,
  MissingStockItem,
  ProductionLog,
  ProductionModel,
  ProductionOrder,
  ProductionOrderStatus,
  PurchaseRequest,
  Recipe,
  RecipeStatus,
  RecipeVersionHistoryItem,
  StockBatchLot,
  StockMovement,
  SubRecipeStockBatch,
} from '../../src/types/restaurant.ts';
import {
  calculateScaledRequirementsPure,
  computeRecipeUnitCostPure,
  consumeStockLotsPure,
  validateBatchKitchenStockPure,
} from '../../src/shared/costingEngine.ts';
import { createId, formatTzs, nowTimeStr, nowTimestampStr, todayDateStr } from '../../src/shared/helpers.ts';
import { HttpError } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

export const inventoryService = {
  // -------- MENU --------
  listMenu(branchId: string) {
    return storeRepo.getBranchStoreOrThrow(branchId).menuItems;
  },

  addMenuItem(branchId: string, itemData: Omit<MenuItem, 'id'> & { id?: string }): MenuItem {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const newItem: MenuItem = { ...itemData, id: itemData.id || createId('menu') };
    store.menuItems.unshift(newItem);
    storeRepo.commit();
    return newItem;
  },

  updateMenuItem(branchId: string, itemId: string, updatedItem: Partial<MenuItem>): MenuItem {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const idx = store.menuItems.findIndex((i) => i.id === itemId);
    if (idx === -1) throw new HttpError(404, `Menu item "${itemId}" not found.`, 'MENU_ITEM_NOT_FOUND');
    store.menuItems[idx] = { ...store.menuItems[idx], ...updatedItem, id: itemId };
    storeRepo.commit();
    return store.menuItems[idx];
  },

  deleteMenuItem(branchId: string, itemId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.menuItems = store.menuItems.filter((i) => i.id !== itemId);
    storeRepo.commit();
    return { deleted: true };
  },

  toggleMenuItemAvailability(branchId: string, itemId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const item = store.menuItems.find((i) => i.id === itemId);
    if (!item) throw new HttpError(404, `Menu item "${itemId}" not found.`, 'MENU_ITEM_NOT_FOUND');
    item.isAvailable = !item.isAvailable;
    storeRepo.commit();
    return item;
  },

  // -------- INGREDIENTS & STOCK LEDGER --------
  listInventory(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return {
      ingredients: store.ingredients,
      stockMovements: store.stockMovements,
      stockLots: store.stockLots,
      subRecipeBatches: store.subRecipeBatches,
      recipes: store.recipes,
      bomAuditLogs: store.bomAuditLogs,
      productionLogs: store.productionLogs,
      preparedDishStocks: store.preparedDishStocks,
      blockedCookingAttempts: store.blockedCookingAttempts,
      dailyReconciliations: store.dailyReconciliations,
      productionOrders: store.productionOrders,
      cateringOrders: store.cateringOrders,
      purchaseRequests: store.purchaseRequests,
      branchTransfers: store.branchTransfers,
    };
  },

  addNewIngredient(branchId: string, ingData: Omit<Ingredient, 'id'> & { id?: string }): Ingredient {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const sStock = ingData.storeStockUnits !== undefined ? ingData.storeStockUnits : ingData.currentStockUnits;
    const kStock = ingData.kitchenStockUnits !== undefined ? ingData.kitchenStockUnits : 0;
    const newIng: Ingredient = {
      ...ingData,
      id: ingData.id || createId('ing'),
      storeStockUnits: sStock,
      kitchenStockUnits: kStock,
      currentStockUnits: sStock + kStock,
    };
    store.ingredients.push(newIng);

    if (newIng.currentStockUnits > 0) {
      store.stockMovements.unshift({
        id: createId('sm'),
        ingredientId: newIng.id,
        ingredientName: newIng.name,
        type: 'purchase_intake',
        quantityDelta: newIng.currentStockUnits,
        unit: newIng.consumptionUnit,
        costImpact: Math.round((newIng.costPerPurchaseUnit / newIng.conversionRatio) * newIng.currentStockUnits),
        date: todayDateStr(),
        reference: 'Initial Opening Balance',
        reason: 'New raw ingredient catalogued into Main Storage',
        recordedBy: 'David Kasambala (Manager)',
        destinationLocation: 'main_store',
      });
    }

    store.notifications.unshift({
      id: createId('notif'),
      title: 'New Raw Ingredient Added',
      message: `${newIng.name} catalogued with ${newIng.currentStockUnits.toLocaleString()} ${
        newIng.consumptionUnit
      } initial stock.`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    storeRepo.commit();
    return newIng;
  },

  updateStock(branchId: string, ingredientId: string, deltaUnits: number) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === ingredientId);
    if (!ing) throw new HttpError(404, `Ingredient "${ingredientId}" not found.`, 'INGREDIENT_NOT_FOUND');

    const newTotal = Math.max(0, ing.currentStockUnits + deltaUnits);
    const currentKitchen = ing.kitchenStockUnits ?? 0;
    const newStore = Math.max(0, newTotal - currentKitchen);
    ing.currentStockUnits = newTotal;
    ing.storeStockUnits = newStore;
    ing.kitchenStockUnits = currentKitchen;
    storeRepo.commit();
    return ing;
  },

  recordStockIntake(
    branchId: string,
    params: {
      ingredientId: string;
      quantityUnits: number;
      cost: number;
      supplier: string;
      invoiceRef: string;
      expiryDate?: string;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing) throw new HttpError(404, `Ingredient "${params.ingredientId}" not found.`, 'INGREDIENT_NOT_FOUND');
    if (params.quantityUnits <= 0) throw new HttpError(422, 'Quantity must be > 0.', 'VALIDATION_ERROR');

    const todayStr = todayDateStr();
    const incomingUnitCost =
      params.quantityUnits > 0 && params.cost > 0
        ? params.cost / params.quantityUnits
        : ing.costPerPurchaseUnit / ing.conversionRatio;
    const existingQty = Math.max(0, ing.currentStockUnits);
    const existingUnitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const weightedUnitCost =
      existingQty + params.quantityUnits > 0
        ? (existingQty * existingUnitCost + params.quantityUnits * incomingUnitCost) / (existingQty + params.quantityUnits)
        : incomingUnitCost;
    const updatedCostPerPurchase = Math.round(weightedUnitCost * ing.conversionRatio);

    const updatedStore = (ing.storeStockUnits ?? 0) + params.quantityUnits;
    const kStock = ing.kitchenStockUnits ?? 0;
    ing.storeStockUnits = updatedStore;
    ing.kitchenStockUnits = kStock;
    ing.currentStockUnits = updatedStore + kStock;
    ing.costPerPurchaseUnit = updatedCostPerPurchase;
    ing.lastUnitCost = Math.round(incomingUnitCost * 100) / 100;

    const computedExpiry =
      params.expiryDate ||
      (ing.shelfLifeDays ? new Date(Date.now() + ing.shelfLifeDays * 86400000).toISOString().split('T')[0] : undefined);
    const lotNumber = `LOT-${ing.id.replace('ing-', '').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newLot: StockBatchLot = {
      id: createId('lot'),
      ingredientId: ing.id,
      lotNumber,
      location: 'main_store',
      initialQty: params.quantityUnits,
      remainingQty: params.quantityUnits,
      unit: ing.consumptionUnit,
      unitCost: Math.round(incomingUnitCost * 100) / 100,
      receivedDate: todayStr,
      expiryDate: computedExpiry,
      supplier: params.supplier || ing.supplier,
      invoiceRef: params.invoiceRef || `PO-${Math.floor(10000 + Math.random() * 90000)}`,
    };
    store.stockLots.unshift(newLot);

    const movement: StockMovement = {
      id: createId('sm'),
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'purchase_intake',
      quantityDelta: params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: params.cost,
      date: todayStr,
      reference: params.invoiceRef || newLot.invoiceRef,
      batchNumber: lotNumber,
      reason: `Received into Main Store from ${params.supplier || ing.supplier} (Weighted Avg recalculated to ${formatTzs(
        updatedCostPerPurchase
      )} / ${ing.purchaseUnit})`,
      recordedBy: 'David Kasambala (Manager)',
      destinationLocation: 'main_store',
    };
    store.stockMovements.unshift(movement);

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Goods Received & Recipe Costs Synced',
      message: `+${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} (${lotNumber}) received. Unit cost recalculated for live BOM recipes.`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Store Inventory',
    });

    storeRepo.commit();
    return { ingredient: ing, lot: newLot, movement };
  },

  recordWastage(
    branchId: string,
    params: {
      ingredientId: string;
      quantityUnits: number;
      reason: string;
      location?: 'kitchen' | 'main_store';
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing) throw new HttpError(404, `Ingredient "${params.ingredientId}" not found.`, 'INGREDIENT_NOT_FOUND');

    const location = params.location || 'kitchen';
    store.stockLots = consumeStockLotsPure(store.stockLots, params.ingredientId, params.quantityUnits, location);

    if (location === 'kitchen') {
      ing.kitchenStockUnits = Math.max(0, (ing.kitchenStockUnits ?? 0) - params.quantityUnits);
    } else {
      ing.storeStockUnits = Math.max(0, (ing.storeStockUnits ?? 0) - params.quantityUnits);
    }
    ing.currentStockUnits = (ing.kitchenStockUnits ?? 0) + (ing.storeStockUnits ?? 0);

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const movement: StockMovement = {
      id: createId('sm'),
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'wastage_spoilage',
      quantityDelta: -params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: Math.round(unitCost * params.quantityUnits),
      date: todayDateStr(),
      reference: `WST-${Math.floor(1000 + Math.random() * 9000)}`,
      reason:
        params.reason ||
        (location === 'kitchen' ? 'Kitchen prep waste or line loss' : 'Main store humidity or spoilage'),
      recordedBy: 'David Kasambala (Manager)',
      sourceLocation: location,
    };
    store.stockMovements.unshift(movement);

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Wastage Recorded',
      message: `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} ${ing.name} logged as waste (${
        params.reason
      }) from ${location === 'kitchen' ? 'Kitchen' : 'Main Store'}.`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Spoilage Log',
    });

    storeRepo.commit();
    return { ingredient: ing, movement };
  },

  recordDirectConsumption(
    branchId: string,
    params: {
      ingredientId: string;
      quantityUnits: number;
      location: 'kitchen' | 'main_store';
      reason: string;
      recordedBy?: string;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.quantityUnits <= 0) {
      throw new HttpError(422, 'Valid ingredient and positive quantity required.', 'VALIDATION_ERROR');
    }
    const available = params.location === 'kitchen' ? ing.kitchenStockUnits ?? 0 : ing.storeStockUnits ?? 0;
    if (params.quantityUnits > available) {
      throw new HttpError(409, `Insufficient stock in ${params.location}.`, 'INSUFFICIENT_STOCK');
    }

    store.stockLots = consumeStockLotsPure(store.stockLots, params.ingredientId, params.quantityUnits, params.location);
    if (params.location === 'kitchen') {
      ing.kitchenStockUnits = Math.max(0, (ing.kitchenStockUnits ?? 0) - params.quantityUnits);
    } else {
      ing.storeStockUnits = Math.max(0, (ing.storeStockUnits ?? 0) - params.quantityUnits);
    }
    ing.currentStockUnits = (ing.kitchenStockUnits ?? 0) + (ing.storeStockUnits ?? 0);

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const costImpact = Math.round(unitCost * params.quantityUnits);
    const movement: StockMovement = {
      id: createId('sm-dir'),
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'direct_consumption',
      quantityDelta: -params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact,
      date: todayDateStr(),
      reference: `DIR-${Math.floor(1000 + Math.random() * 9000)}`,
      reason: params.reason || 'Direct operational consumption (Non-BOM)',
      recordedBy: params.recordedBy || 'Chef Hamisi Juma',
      sourceLocation: params.location,
    };
    store.stockMovements.unshift(movement);

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Direct Stock Consumption Logged',
      message: `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} consumed directly (${formatTzs(
        costImpact
      )}).`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    storeRepo.commit();
    return { success: true, ingredient: ing, movement };
  },

  // -------- TRANSFERS --------
  transferStock(
    branchId: string,
    params: {
      id?: string;
      ingredientId: string;
      quantityUnits: number;
      fromLocation: 'main_store' | 'kitchen';
      toLocation: 'main_store' | 'kitchen';
      reason: string;
      shift?: string;
      recordedBy?: string;
      requireKitchenConfirmation?: boolean;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing) throw new HttpError(404, `Ingredient "${params.ingredientId}" not found.`, 'INGREDIENT_NOT_FOUND');

    const available = params.fromLocation === 'main_store' ? ing.storeStockUnits ?? 0 : ing.kitchenStockUnits ?? 0;
    if (params.quantityUnits <= 0 || params.quantityUnits > available) {
      throw new HttpError(409, 'Insufficient stock in source location.', 'INSUFFICIENT_STOCK');
    }

    const isToKitchen = params.toLocation === 'kitchen' && params.fromLocation === 'main_store';
    const needsConfirmation = isToKitchen && (params.requireKitchenConfirmation ?? false);

    if (isToKitchen) {
      ing.storeStockUnits = Math.max(0, (ing.storeStockUnits ?? 0) - params.quantityUnits);
      if (!needsConfirmation) {
        ing.kitchenStockUnits = (ing.kitchenStockUnits ?? 0) + params.quantityUnits;
      }
    } else if (params.fromLocation === 'kitchen' && params.toLocation === 'main_store') {
      ing.kitchenStockUnits = Math.max(0, (ing.kitchenStockUnits ?? 0) - params.quantityUnits);
      ing.storeStockUnits = (ing.storeStockUnits ?? 0) + params.quantityUnits;
    }
    ing.currentStockUnits = (ing.storeStockUnits ?? 0) + (ing.kitchenStockUnits ?? 0);

    const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
    const movement: StockMovement = {
      id: params.id || createId('sm'),
      ingredientId: ing.id,
      ingredientName: ing.name,
      type: 'stock_transfer',
      quantityDelta: isToKitchen ? params.quantityUnits : -params.quantityUnits,
      unit: ing.consumptionUnit,
      costImpact: Math.round(unitCost * params.quantityUnits),
      date: todayDateStr(),
      reference: isToKitchen
        ? `TRF-ISSUE-${Math.floor(1000 + Math.random() * 9000)}`
        : `TRF-RETURN-${Math.floor(1000 + Math.random() * 9000)}`,
      reason:
        params.reason ||
        (isToKitchen
          ? `Day operation prep requisition (${params.shift || 'Daily Shift'})`
          : 'End-of-day return from kitchen line to main storage'),
      recordedBy: params.recordedBy || 'David Kasambala (Manager)',
      sourceLocation: params.fromLocation,
      destinationLocation: params.toLocation,
      transferStatus: needsConfirmation ? 'in_transit' : 'received',
      receivedAt: needsConfirmation ? undefined : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      receivedBy: needsConfirmation ? undefined : 'Kitchen Floor Staff',
    };
    store.stockMovements.unshift(movement);

    store.notifications.unshift({
      id: createId('notif'),
      title: needsConfirmation
        ? 'Requisition Dispatched (In Transit)'
        : isToKitchen
        ? 'Stock Issued to Kitchen'
        : 'Stock Returned to Store',
      message: needsConfirmation
        ? `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} is in transit to Kitchen.`
        : `${params.quantityUnits.toLocaleString()} ${ing.consumptionUnit} of ${ing.name} ${
            isToKitchen ? 'transferred to Kitchen' : 'returned to Store'
          }.`,
      type: 'transfer',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: needsConfirmation ? 'kitchen' : 'manager',
      actionLabel: needsConfirmation ? 'Confirm Kitchen Receipt' : 'View Stock Balances',
    });

    storeRepo.commit();
    return { success: true, ingredient: ing, movement };
  },

  confirmStockTransferReceipt(branchId: string, movementId: string, receivedBy = 'Chef Hamisi Juma') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const movement = store.stockMovements.find((m) => m.id === movementId);
    if (!movement || movement.transferStatus !== 'in_transit') {
      throw new HttpError(404, 'In-transit stock movement not found.', 'TRANSFER_NOT_FOUND');
    }
    const ing = store.ingredients.find((i) => i.id === movement.ingredientId);
    if (!ing) throw new HttpError(404, 'Ingredient not found.', 'INGREDIENT_NOT_FOUND');

    const transferQty = Math.abs(movement.quantityDelta);
    ing.kitchenStockUnits = (ing.kitchenStockUnits ?? 0) + transferQty;
    ing.currentStockUnits = (ing.storeStockUnits ?? 0) + ing.kitchenStockUnits;

    movement.transferStatus = 'received';
    movement.receivedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    movement.receivedBy = receivedBy;

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Kitchen Confirmed Stock Receipt',
      message: `${receivedBy} verified and accepted ${transferQty.toLocaleString()} ${ing.consumptionUnit} of ${ing.name}.`,
      type: 'transfer',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Stock',
    });

    storeRepo.commit();
    return { success: true, movement, ingredient: ing };
  },

  rejectStockTransfer(
    branchId: string,
    movementId: string,
    reason = 'Kitchen refused delivery or wrong specification'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const movement = store.stockMovements.find((m) => m.id === movementId);
    if (!movement || movement.transferStatus !== 'in_transit') {
      throw new HttpError(404, 'In-transit stock movement not found.', 'TRANSFER_NOT_FOUND');
    }
    const ing = store.ingredients.find((i) => i.id === movement.ingredientId);
    if (ing) {
      const transferQty = Math.abs(movement.quantityDelta);
      ing.storeStockUnits = (ing.storeStockUnits ?? 0) + transferQty;
      ing.currentStockUnits = ing.storeStockUnits + (ing.kitchenStockUnits ?? 0);
    }
    movement.transferStatus = 'rejected';
    movement.reason = `${movement.reason} [REJECTED: ${reason}]`;
    storeRepo.commit();
    return { success: true, movement };
  },

  returnAllKitchenStockToStore(branchId: string, staffName?: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const today = todayDateStr();
    const newMovements: StockMovement[] = [];
    let itemsReturnedCount = 0;

    store.ingredients.forEach((ing) => {
      const kQty = ing.kitchenStockUnits ?? 0;
      if (kQty > 0) {
        itemsReturnedCount++;
        const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
        newMovements.push({
          id: createId('sm'),
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'stock_transfer',
          quantityDelta: -kQty,
          unit: ing.consumptionUnit,
          costImpact: Math.round(unitCost * kQty),
          date: today,
          reference: `TRF-CLOSE-${Math.floor(1000 + Math.random() * 9000)}`,
          reason: 'Daily Shift Close: All kitchen prep stock returned to Main Storage Room',
          recordedBy: staffName || 'David Kasambala (Manager)',
          sourceLocation: 'kitchen',
          destinationLocation: 'main_store',
        });
        ing.storeStockUnits = (ing.storeStockUnits ?? 0) + kQty;
        ing.kitchenStockUnits = 0;
        ing.currentStockUnits = ing.storeStockUnits;
      }
    });

    if (newMovements.length > 0) {
      store.stockMovements = [...newMovements, ...store.stockMovements];
      store.notifications.unshift({
        id: createId('notif'),
        title: 'Daily Shift Close Completed',
        message: `All ${itemsReturnedCount} kitchen ingredients reconciled and returned to Main Store.`,
        type: 'transfer',
        timestamp: new Date().toISOString(),
        read: false,
        actionRole: 'manager',
        actionLabel: 'View Final Stock',
      });
      storeRepo.commit();
    }

    return { itemsReturnedCount, movements: newMovements };
  },

  // -------- RECIPES & BOM --------
  saveRecipe(branchId: string, recipe: Recipe, auditLog?: Omit<BomAuditLog, 'id' | 'timestamp'>) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const index = store.recipes.findIndex(
      (r) => r.id === recipe.id || (recipe.menuItemId && r.menuItemId === recipe.menuItemId)
    );
    const updatedRecipe = { ...recipe };

    if (index >= 0) {
      const existing = store.recipes[index];
      const historyItem: RecipeVersionHistoryItem = {
        version: existing.version || 1,
        changedAt: nowTimestampStr(),
        changedBy: recipe.approvedBy || 'Executive Chef Juma',
        changeSummary: `Version ${existing.version || 1} archived upon update (${
          existing.ingredients?.length || 0
        } ingredients, ${existing.batchYieldPlates || 100} plates batch)`,
        batchYieldPlates: existing.batchYieldPlates || 100,
        ingredients: existing.ingredients || [],
        totalBatchCost: (existing.ingredients || []).reduce((s, ri) => {
          const ing = store.ingredients.find((i) => i.id === ri.ingredientId);
          const c = ing
            ? (ing.costPerPurchaseUnit / ing.conversionRatio) *
              (ri.batchQuantity ?? ri.quantity * (existing.batchYieldPlates || 1))
            : 0;
          return s + c;
        }, 0),
        costPerPlate: 0,
        foodCostPercentage: 0,
      };
      updatedRecipe.history = [historyItem, ...(existing.history || [])];
      updatedRecipe.version = (existing.version || 1) + 1;
      store.recipes[index] = updatedRecipe;
    } else {
      store.recipes.unshift(updatedRecipe);
    }

    if (recipe.menuItemId) {
      store.menuItems.forEach((item) => {
        if (item.id === recipe.menuItemId) item.recipeId = recipe.id;
      });
    }

    if (auditLog) {
      store.bomAuditLogs.unshift({
        ...auditLog,
        id: createId('bom-log'),
        timestamp: nowTimestampStr(),
      });
    }

    store.notifications.unshift({
      id: createId('notif'),
      title: 'BOM Recipe Approved & Saved',
      message: `Bill of Materials for "${recipe.name || 'Menu Dish'}" saved (v${updatedRecipe.version || 1}).`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Recipe BOM',
    });

    storeRepo.commit();
    return updatedRecipe;
  },

  deleteRecipe(branchId: string, recipeId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.recipes = store.recipes.filter((r) => r.id !== recipeId);
    store.menuItems.forEach((item) => {
      if (item.recipeId === recipeId) item.recipeId = undefined;
    });
    storeRepo.commit();
    return { deleted: true };
  },

  updateRecipeStatus(branchId: string, recipeId: string, status: RecipeStatus, actor = 'Executive Chef Juma', note?: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const r = store.recipes.find((rec) => rec.id === recipeId);
    if (!r) throw new HttpError(404, `Recipe "${recipeId}" not found.`, 'RECIPE_NOT_FOUND');

    const nowStr = nowTimestampStr();
    const costInfo = computeRecipeUnitCostPure(r.id, store.recipes, store.ingredients, store.subRecipeBatches);
    const linkedDish = store.menuItems.find((m) => m.id === r.menuItemId);
    const sellPrice = linkedDish?.price || 0;
    const hist: RecipeVersionHistoryItem = {
      version: r.version,
      changedAt: nowStr,
      changedBy: actor,
      changeSummary: note || `Governance status updated from ${r.status || 'approved'} to ${status}`,
      batchYieldPlates: r.batchYieldPlates,
      ingredients: r.ingredients,
      totalBatchCost: costInfo.batchCost,
      costPerPlate: costInfo.perPlateCost,
      foodCostPercentage: sellPrice > 0 ? (costInfo.perPlateCost / sellPrice) * 100 : 0,
      sellingPrice: sellPrice,
      foodGrossProfit: Math.max(0, sellPrice - costInfo.perPlateCost),
      status,
      name: r.name,
      productionMethod: r.productionMethod,
      productionModel: r.productionModel,
    };

    r.status = status;
    if (status === 'approved') {
      r.approvedBy = actor;
      r.approvedAt = nowStr;
    }
    r.history = [hist, ...(r.history || [])];

    store.auditLogs.unshift({
      id: createId('aud'),
      actor,
      actorRole: 'manager',
      action: 'RECIPE_STATUS_CHANGED',
      details: `Recipe ${recipeId} transitioned to "${status}". ${note || ''}`,
      timestamp: new Date().toISOString(),
    });
    storeRepo.commit();
    return r;
  },

  computeRecipeUnitCost(branchId: string, recipeId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return computeRecipeUnitCostPure(recipeId, store.recipes, store.ingredients, store.subRecipeBatches);
  },

  calculateScaledRequirements(
    branchId: string,
    items: Array<{
      recipeId?: string;
      menuItemId?: string;
      portions: number;
      portionName?: string;
      modifierNames?: string[];
      substituteOverrides?: Record<string, string>;
    }>
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return calculateScaledRequirementsPure(items, store.recipes, store.menuItems, store.ingredients, store.subRecipeBatches);
  },

  // -------- BATCH PRODUCTION --------
  validateBatchKitchenStock(
    branchId: string,
    recipeId: string,
    batches = 1,
    actualInputs?: Record<string, number>
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return validateBatchKitchenStockPure(
      recipeId,
      batches,
      store.recipes,
      store.ingredients,
      store.stockMovements,
      store.subRecipeBatches,
      actualInputs
    );
  },

  cookBatchProduction(
    branchId: string,
    params: {
      id?: string;
      batchNumber?: string;
      recipeId: string;
      batches: number;
      actualPlatesProduced?: number;
      actualInputs?: Record<string, number>;
      chefName?: string;
      managerOverride?: boolean;
      overrideReason?: string;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const recipe = store.recipes.find((r) => r.id === params.recipeId);
    if (!recipe) return { success: false, error: 'Recipe not found in Master Data' };

    const validation = validateBatchKitchenStockPure(
      params.recipeId,
      params.batches,
      store.recipes,
      store.ingredients,
      store.stockMovements,
      store.subRecipeBatches,
      params.actualInputs
    );
    const stdValidation = params.actualInputs
      ? validateBatchKitchenStockPure(
          params.recipeId,
          params.batches,
          store.recipes,
          store.ingredients,
          store.stockMovements,
          store.subRecipeBatches
        )
      : validation;

    if (!validation.canCook && !params.managerOverride) {
      const blockedReasons = validation.missingItems
        .filter((m) => m.status !== 'ok')
        .map(
          (m) =>
            `${m.ingredientName}: required ${m.requiredQty.toLocaleString()} ${
              m.unit
            }, available ${m.availableKitchenQty.toLocaleString()} ${m.unit}`
        )
        .join('; ');
      const blockedAttempt: BlockedCookingAttempt = {
        id: createId('block'),
        recipeId: recipe.id,
        dishName: recipe.name || 'Dish',
        batches: params.batches,
        attemptedBy: params.chefName || 'Executive Chef Juma',
        timestamp: nowTimestampStr(),
        missingItems: validation.missingItems.filter((m) => m.status !== 'ok'),
        reason: `Cannot cook ${params.batches} batch of ${recipe.name}. Missing items: ${blockedReasons}`,
        resolution: 'requisition_created',
      };
      store.blockedCookingAttempts.unshift(blockedAttempt);
      store.notifications.unshift({
        id: createId('notif'),
        title: 'Batch Cooking Blocked',
        message: `Attempt to cook ${recipe.name} blocked: missing raw stock or sub-recipe batch in Kitchen.`,
        type: 'kitchen',
        timestamp: new Date().toISOString(),
        read: false,
        actionRole: 'manager',
        actionLabel: 'View Blocked Logs',
      });
      storeRepo.commit();
      return { success: false, error: blockedAttempt.reason };
    }

    const actualOutputQty = params.actualPlatesProduced || validation.targetYieldPlates;
    const costPerUnit = actualOutputQty > 0 ? validation.totalCost / actualOutputQty : 0;
    const costPerPlate = Math.round(costPerUnit);
    const today = todayDateStr();
    const timestampStr = nowTimestampStr();
    const expiryDt = recipe.shelfLifeHours
      ? new Date(Date.now() + recipe.shelfLifeHours * 3600000).toISOString().replace('T', ' ').substring(0, 16)
      : undefined;
    const batchNumber =
      params.batchNumber ||
      `${recipe.isSubRecipe ? 'SUB' : 'BATCH'}-${(recipe.code || recipe.id.slice(-3))
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 4)
        .toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const consumedDetails: ProductionLog['ingredientsConsumed'] = [];
    const inputAdjustments: NonNullable<ProductionLog['actualInputAdjustments']> = [];
    const newMovements: StockMovement[] = [];

    const rawRequirements = validation.missingItems.filter((m) => !m.isSubRecipe);
    const subRequirements = validation.missingItems.filter((m) => m.isSubRecipe && m.subRecipeId);

    validation.missingItems.forEach((req, idx) => {
      const stdReq = stdValidation.missingItems[idx]?.requiredQty ?? req.requiredQty;
      if (stdReq !== req.requiredQty) {
        inputAdjustments.push({
          ingredientId: req.ingredientId,
          ingredientName: req.ingredientName,
          standardQty: stdReq,
          actualQty: req.requiredQty,
          unit: req.unit,
        });
      }
    });

    if (subRequirements.length > 0) {
      subRequirements.forEach((req) => {
        let rem = req.requiredQty;
        const candidates = store.subRecipeBatches
          .filter(
            (b) =>
              b.subRecipeId === req.subRecipeId &&
              b.remainingQty > 0 &&
              b.status !== 'reversed' &&
              b.status !== 'expired'
          )
          .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
        let subLineCost = 0;
        for (const sb of candidates) {
          if (rem <= 0) break;
          const take = Math.min(sb.remainingQty, rem);
          sb.remainingQty = Math.round((sb.remainingQty - take) * 100) / 100;
          sb.status =
            sb.remainingQty <= 0 ? 'consumed' : sb.remainingQty <= sb.producedQty * 0.2 ? 'low' : 'available';
          subLineCost += Math.round(take * sb.costPerUnit);
          rem -= take;
        }
        consumedDetails.push({
          ingredientId: req.ingredientId,
          ingredientName: req.ingredientName,
          quantity: req.requiredQty,
          unit: req.unit,
          cost: subLineCost,
          isSubRecipe: true,
          subRecipeId: req.subRecipeId,
        });
        newMovements.push({
          id: createId('sm-prod-sub'),
          ingredientId: req.ingredientId,
          ingredientName: req.ingredientName,
          type: 'production_issue',
          quantityDelta: -req.requiredQty,
          unit: req.unit,
          costImpact: subLineCost,
          date: today,
          reference: batchNumber,
          batchNumber,
          recipeId: recipe.id,
          reason: `Issued prepared sub-recipe into ${batchNumber} (${recipe.name})`,
          recordedBy: params.chefName || 'Executive Chef Juma',
          sourceLocation: 'kitchen',
        });
      });
    }

    if (rawRequirements.length > 0) {
      rawRequirements.forEach((req) => {
        const ing = store.ingredients.find((item) => item.id === req.ingredientId);
        if (!ing) return;
        const kStock = Math.max(0, (ing.kitchenStockUnits ?? 0) - req.requiredQty);
        const sStock = ing.storeStockUnits ?? 0;
        const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
        const lineCost = Math.round(unitCost * req.requiredQty);

        store.stockLots = consumeStockLotsPure(store.stockLots, ing.id, req.requiredQty, 'kitchen');
        consumedDetails.push({
          ingredientId: ing.id,
          ingredientName: ing.name,
          quantity: req.requiredQty,
          unit: ing.consumptionUnit,
          cost: lineCost,
        });
        ing.kitchenStockUnits = kStock;
        ing.currentStockUnits = kStock + sStock;
        newMovements.push({
          id: createId('sm'),
          ingredientId: ing.id,
          ingredientName: ing.name,
          type: 'production_issue',
          quantityDelta: -req.requiredQty,
          unit: ing.consumptionUnit,
          costImpact: lineCost,
          date: today,
          reference: batchNumber,
          batchNumber,
          recipeId: recipe.id,
          reason: `Batch production ${batchNumber} (${actualOutputQty.toLocaleString()} ${
            recipe.yieldUnit || 'plates'
          }) of ${recipe.name || 'Dish'}`,
          recordedBy: params.chefName || 'Executive Chef Juma',
          sourceLocation: 'kitchen',
        });
      });
    }

    const targetMenuItemId = recipe.menuItemId || recipe.id;
    if (recipe.isSubRecipe) {
      const outputUnit = recipe.yieldUnit || 'grams';
      const newSubBatch: SubRecipeStockBatch = {
        id: createId('subb'),
        batchNumber,
        subRecipeId: recipe.id,
        name: recipe.name || 'Prepared Sub-Recipe',
        producedQty: actualOutputQty,
        remainingQty: actualOutputQty,
        unit: outputUnit,
        totalCost: validation.totalCost,
        costPerUnit: Math.round(costPerUnit * 100) / 100,
        preparedAt: timestampStr,
        expiresAt: expiryDt || `${today} 23:59`,
        preparedBy: params.chefName || 'Executive Chef Juma',
        status: 'available',
      };
      store.subRecipeBatches.unshift(newSubBatch);
      newMovements.push({
        id: createId('sm-out'),
        ingredientId: recipe.id,
        ingredientName: `${recipe.name} [Prepared Sub-Recipe]`,
        type: 'production_output',
        quantityDelta: actualOutputQty,
        unit: outputUnit,
        costImpact: validation.totalCost,
        date: today,
        reference: batchNumber,
        batchNumber,
        recipeId: recipe.id,
        reason: `Produced sub-recipe batch ${batchNumber} (${formatTzs(Math.round(costPerUnit * 100) / 100)}/${outputUnit})`,
        recordedBy: params.chefName || 'Executive Chef Juma',
        destinationLocation: 'kitchen',
      });
    } else {
      const existingDish = store.preparedDishStocks.find((p) => p.menuItemId === targetMenuItemId);
      if (existingDish) {
        existingDish.preparedPlatesAvailable += actualOutputQty;
        existingDish.totalCookedToday += actualOutputQty;
        existingDish.lastCookedAt = timestampStr;
        existingDish.status = 'ready';
      } else {
        store.preparedDishStocks.unshift({
          menuItemId: targetMenuItemId,
          dishName: recipe.name || 'Dish',
          preparedPlatesAvailable: actualOutputQty,
          totalCookedToday: actualOutputQty,
          totalSoldToday: 0,
          lastCookedAt: timestampStr,
          status: 'ready',
        });
      }
    }

    if (newMovements.length > 0) {
      store.stockMovements = [...newMovements, ...store.stockMovements];
    }

    const newProdLog: ProductionLog = {
      id: params.id || createId('prod'),
      batchNumber,
      recipeId: recipe.id,
      recipeVersion: recipe.version,
      menuItemId: targetMenuItemId,
      dishName: recipe.name || 'Dish',
      productionType: recipe.isSubRecipe
        ? 'sub_recipe'
        : recipe.productionMethod === 'semi_standardized'
        ? 'semi_standardized'
        : 'batch_finished',
      batchesCooked: params.batches,
      targetYieldPlates: validation.targetYieldPlates,
      actualPlatesProduced: actualOutputQty,
      unitLabel: recipe.yieldUnit || 'plates',
      totalCost: validation.totalCost,
      costPerPlate,
      cookedBy: params.chefName || 'Executive Chef Juma',
      timestamp: timestampStr,
      expiryDate: expiryDt,
      remainingPlates: actualOutputQty,
      status: 'completed',
      ingredientsConsumed: consumedDetails,
      actualInputAdjustments: inputAdjustments.length > 0 ? inputAdjustments : undefined,
      managerOverride: params.managerOverride,
      overrideReason: params.overrideReason,
    };
    store.productionLogs.unshift(newProdLog);

    store.notifications.unshift({
      id: createId('notif'),
      title: recipe.isSubRecipe ? 'Sub-Recipe Batch Prepared' : 'Batch Production Complete',
      message: `${batchNumber}: Produced ${actualOutputQty.toLocaleString()} ${recipe.yieldUnit || 'plates'} of ${
        recipe.name
      }.`,
      type: 'kitchen',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'kitchen',
      actionLabel: 'View Production Batches',
    });

    storeRepo.commit();
    return { success: true, log: newProdLog };
  },

  reverseProductionBatch(
    branchId: string,
    productionLogId: string,
    reason: string,
    actor = 'David Kasambala (Manager)'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const log = store.productionLogs.find((l) => l.id === productionLogId);
    if (!log) return { success: false, error: 'Production log not found.' };
    if (log.status === 'reversed') return { success: false, error: 'Batch has already been reversed.' };

    const today = todayDateStr();
    const nowStr = nowTimestampStr();
    let recoverableRatio = 1;

    if (log.productionType === 'sub_recipe') {
      const subBatch = store.subRecipeBatches.find((sb) => sb.batchNumber === log.batchNumber);
      if (subBatch && subBatch.producedQty > 0) {
        recoverableRatio = subBatch.remainingQty / subBatch.producedQty;
        subBatch.remainingQty = 0;
        subBatch.status = 'reversed';
      }
    } else {
      const unSold = Math.max(0, log.remainingPlates);
      recoverableRatio = log.actualPlatesProduced > 0 ? unSold / log.actualPlatesProduced : 0;
      if (unSold > 0) {
        store.preparedDishStocks.forEach((p) => {
          if (p.menuItemId !== log.menuItemId) return;
          const nextAvail = Math.max(0, p.preparedPlatesAvailable - unSold);
          p.preparedPlatesAvailable = nextAvail;
          p.totalCookedToday = Math.max(0, p.totalCookedToday - unSold);
          p.status = nextAvail === 0 ? 'out_of_stock' : nextAvail <= 10 ? 'low' : 'ready';
        });
      }
    }

    const reversalMovements: StockMovement[] = [];
    if (recoverableRatio > 0) {
      log.ingredientsConsumed.forEach((ic) => {
        const restoreQty = Math.round(ic.quantity * recoverableRatio);
        if (restoreQty <= 0) return;
        if (ic.isSubRecipe && ic.subRecipeId) {
          store.subRecipeBatches.forEach((sb) => {
            if (sb.subRecipeId === ic.subRecipeId && sb.status !== 'reversed') {
              sb.remainingQty += restoreQty;
              sb.status = 'available';
            }
          });
        } else {
          const ing = store.ingredients.find((item) => item.id === ic.ingredientId);
          if (ing) {
            ing.kitchenStockUnits = (ing.kitchenStockUnits ?? 0) + restoreQty;
            ing.currentStockUnits = ing.kitchenStockUnits + (ing.storeStockUnits ?? 0);
          }
        }
        reversalMovements.push({
          id: createId('sm-rev'),
          ingredientId: ic.ingredientId,
          ingredientName: ic.ingredientName,
          type: 'production_reversal',
          quantityDelta: restoreQty,
          unit: ic.unit,
          costImpact: Math.round(ic.cost * recoverableRatio),
          date: today,
          reference: log.batchNumber || log.id,
          batchNumber: log.batchNumber,
          recipeId: log.recipeId,
          reason: `Controlled batch reversal (${Math.round(recoverableRatio * 100)}% unused): ${reason}`,
          recordedBy: actor,
          destinationLocation: 'kitchen',
          isReversed: true,
        });
      });
    }

    if (reversalMovements.length > 0) {
      store.stockMovements = [...reversalMovements, ...store.stockMovements];
    }

    log.remainingPlates = 0;
    log.status = 'reversed';
    log.reversedAt = nowStr;
    log.reversedBy = actor;
    log.reversalReason = reason;

    store.auditLogs.unshift({
      id: createId('aud'),
      actor,
      actorRole: 'manager',
      action: 'PRODUCTION_BATCH_REVERSED',
      details: `Controlled reversal of ${log.batchNumber || log.dishName} (${Math.round(
        recoverableRatio * 100
      )}% unused output restored). Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    });

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Production Batch Reversed',
      message: `${log.batchNumber || log.dishName} reversed by ${actor}. Audit trail preserved.`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Movement Ledger',
    });

    storeRepo.commit();
    return { success: true, log };
  },

  createRequisitionForMissing(branchId: string, missingItems: MissingStockItem[], shift = 'Daily Operation Prep') {
    const shortages = missingItems.filter((m) => m.status !== 'ok' && !m.isSubRecipe);
    if (shortages.length === 0) return { success: true, transfersDone: 0 };

    let transfersDone = 0;
    shortages.forEach((item) => {
      const store = storeRepo.getBranchStoreOrThrow(branchId);
      const ing = store.ingredients.find((i) => i.id === item.ingredientId);
      const availableInStore = ing ? ing.storeStockUnits ?? 0 : item.storeAvailableQty;
      const transferQty = Math.min(item.shortageQty, availableInStore);
      if (transferQty > 0) {
        this.transferStock(branchId, {
          ingredientId: item.ingredientId,
          quantityUnits: transferQty,
          fromLocation: 'main_store',
          toLocation: 'kitchen',
          reason: `Requisition for missing ${item.ingredientName} (short by ${item.shortageQty} ${item.unit})`,
          shift,
          recordedBy: 'Kitchen Requisition Engine',
        });
        transfersDone++;
      }
    });
    return { success: transfersDone > 0, transfersDone };
  },

  handleLeftoverPreparedPlates(
    branchId: string,
    menuItemId: string,
    platesCount: number,
    action: 'return_to_store' | 'log_as_waste',
    reason?: string
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const dish = store.preparedDishStocks.find((p) => p.menuItemId === menuItemId);
    if (!dish || platesCount <= 0 || platesCount > dish.preparedPlatesAvailable) {
      throw new HttpError(409, 'Invalid leftover plates count.', 'INVALID_QUANTITY');
    }
    const recipe = store.recipes.find((r) => r.menuItemId === menuItemId);
    const latestLog = store.productionLogs.find(
      (pl) => pl.menuItemId === menuItemId && pl.status !== 'reversed' && pl.costPerPlate > 0
    );
    const cogsPerPlate =
      latestLog?.costPerPlate ||
      (recipe ? computeRecipeUnitCostPure(recipe.id, store.recipes, store.ingredients, store.subRecipeBatches).perPlateCost : 2500);
    const totalImpact = Math.round(platesCount * cogsPerPlate);

    dish.preparedPlatesAvailable = Math.max(0, dish.preparedPlatesAvailable - platesCount);
    if (dish.preparedPlatesAvailable === 0) dish.status = 'out_of_stock';

    if (action === 'log_as_waste') {
      store.stockMovements.unshift({
        id: createId('sm-leftover'),
        ingredientId: recipe?.ingredients[0]?.ingredientId || 'ing-rice',
        ingredientName: `${dish.dishName} (Prepared Batch Food)`,
        type: 'wastage_spoilage',
        quantityDelta: -platesCount,
        unit: 'plates',
        costImpact: totalImpact,
        date: todayDateStr(),
        reference: `WST-LEFTOVER-${platesCount}P`,
        reason: reason || 'End-of-day unsold batch leftover discard',
        recordedBy: 'Executive Chef Juma',
        sourceLocation: 'kitchen',
      });
      store.notifications.unshift({
        id: createId('notif'),
        title: 'Leftovers Logged as Waste',
        message: `${platesCount} unsold plates of ${dish.dishName} logged as waste (${formatTzs(totalImpact)} impact).`,
        type: 'stock',
        timestamp: new Date().toISOString(),
        read: false,
        actionRole: 'manager',
        actionLabel: 'View Spoilage',
      });
    } else {
      store.notifications.unshift({
        id: createId('notif'),
        title: 'Leftovers Returned to Store',
        message: `${platesCount} plates of ${dish.dishName} chilled and returned to cold room buffer storage.`,
        type: 'transfer',
        timestamp: new Date().toISOString(),
        read: false,
        actionRole: 'kitchen',
        actionLabel: 'View Prepared Plates',
      });
    }

    storeRepo.commit();
    return { success: true, dish };
  },

  logBlockedCookingAttempt(branchId: string, attempt: Omit<BlockedCookingAttempt, 'id' | 'timestamp'>) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const entry: BlockedCookingAttempt = {
      ...attempt,
      id: createId('block'),
      timestamp: nowTimestampStr(),
    };
    store.blockedCookingAttempts.unshift(entry);
    storeRepo.commit();
    return entry;
  },

  // -------- PRODUCTION ORDERS --------
  createProductionOrder(
    branchId: string,
    params: {
      id?: string;
      recipeId: string;
      targetPortions: number;
      sourceType?: ProductionOrder['sourceType'];
      productionModel?: ProductionModel;
      assignedTo?: string;
      scheduledFor?: string;
      cateringOrderId?: string;
      cateringOrderNumber?: string;
      substituteOverrides?: Record<string, string>;
    }
  ): ProductionOrder {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const recipe = store.recipes.find((r) => r.id === params.recipeId);
    if (!recipe || params.targetPortions <= 0) {
      throw new HttpError(422, 'Valid recipeId and positive targetPortions required.', 'VALIDATION_ERROR');
    }

    const scaled = calculateScaledRequirementsPure(
      [
        {
          recipeId: recipe.id,
          portions: params.targetPortions,
          substituteOverrides: params.substituteOverrides,
        },
      ],
      store.recipes,
      store.menuItems,
      store.ingredients,
      store.subRecipeBatches
    );

    const nowStr = nowTimestampStr();
    const newOrder: ProductionOrder = {
      id: params.id || createId('po-kit'),
      orderNumber: `PRD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      sourceType: params.sourceType || 'manager_plan',
      cateringOrderId: params.cateringOrderId,
      cateringOrderNumber: params.cateringOrderNumber,
      recipeId: recipe.id,
      recipeCode: recipe.code,
      recipeName: recipe.name || 'Standard Recipe',
      isSubRecipe: recipe.isSubRecipe,
      productionModel:
        params.productionModel ||
        recipe.productionModel ||
        (recipe.cookingMethod === 'batch_cooking' ? 'batch_production' : 'made_to_order'),
      station: recipe.productionLocation || 'hot_kitchen',
      targetPortions: params.targetPortions,
      yieldUnit: recipe.yieldUnit || (recipe.isSubRecipe ? 'grams' : 'plates'),
      status: scaled.canProduceWithStore ? 'stock_checked' : 'planned',
      standardCost: scaled.totalEstimatedCost,
      assignedTo: params.assignedTo || 'Chef Hamisi Juma',
      scheduledFor: params.scheduledFor || `Today · ${nowTimeStr()}`,
      createdBy: 'David Kasambala (Manager)',
      createdAt: nowStr,
      stockCheckedAt: scaled.canProduceWithStore ? nowStr : undefined,
      lines: scaled.rows.map((r) => ({
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        isSubRecipe: r.isSubRecipe,
        subRecipeId: r.subRecipeId,
        standardQty: r.requiredQty,
        actualQty: r.requiredQty,
        unit: r.unit,
        unitCost: r.unitCost,
      })),
    };

    store.productionOrders.unshift(newOrder);
    store.notifications.unshift({
      id: createId('notif'),
      title: `Production Order ${newOrder.orderNumber}`,
      message: `Scheduled ${newOrder.targetPortions} ${newOrder.yieldUnit} of ${newOrder.recipeName}.`,
      type: 'kitchen',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'kitchen',
      actionLabel: 'Open Production Orders',
    });

    storeRepo.commit();
    return newOrder;
  },

  advanceProductionOrderStage(
    branchId: string,
    orderId: string,
    nextStage: ProductionOrderStatus,
    options?: {
      actualPortions?: number;
      wastagePortions?: number;
      wastageReason?: string;
      actualLineQtys?: Record<string, number>;
      exceptionReason?: string;
      actor?: string;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const order = store.productionOrders.find((po) => po.id === orderId);
    if (!order) return { success: false, error: 'Production order not found.' };

    const actor = options?.actor || 'Executive Chef Juma';
    const nowStr = nowTimestampStr();

    if (nextStage === 'stock_checked') {
      const scaled = calculateScaledRequirementsPure(
        [{ recipeId: order.recipeId, portions: order.targetPortions }],
        store.recipes,
        store.menuItems,
        store.ingredients,
        store.subRecipeBatches
      );
      if (!scaled.canProduceWithStore && !options?.exceptionReason) {
        return {
          success: false,
          error: 'Stock shortage detected. Resolve via Store Transfer, Purchase Request, Substitute, or Manager Exception.',
        };
      }
      order.status = 'stock_checked';
      order.stockCheckedAt = nowStr;
      if (options?.exceptionReason) {
        order.exceptionApprovedBy = actor;
        order.exceptionReason = options.exceptionReason;
      }
      storeRepo.commit();
      return { success: true, order };
    }

    if (nextStage === 'ingredients_issued') {
      const scaled = calculateScaledRequirementsPure(
        [{ recipeId: order.recipeId, portions: order.targetPortions }],
        store.recipes,
        store.menuItems,
        store.ingredients,
        store.subRecipeBatches
      );
      if (!scaled.canProduceWithStore && !options?.exceptionReason) {
        return { success: false, error: 'Insufficient total stock (Store + Kitchen) to issue ingredients.' };
      }
      scaled.rows
        .filter((r) => !r.isSubRecipe && r.kitchenShortageQty > 0 && r.availableStoreQty > 0)
        .forEach((r) => {
          const transferAmt = Math.min(r.kitchenShortageQty, r.availableStoreQty);
          if (transferAmt > 0) {
            this.transferStock(branchId, {
              ingredientId: r.ingredientId,
              quantityUnits: transferAmt,
              fromLocation: 'main_store',
              toLocation: 'kitchen',
              reason: `Issued for Production Order ${order.orderNumber} (${order.recipeName})`,
              shift: 'Production Issue',
              recordedBy: actor,
            });
          }
        });
      order.status = 'ingredients_issued';
      order.ingredientsIssuedAt = nowStr;
      if (options?.exceptionReason) {
        order.exceptionApprovedBy = actor;
        order.exceptionReason = options.exceptionReason;
      }
      storeRepo.commit();
      return { success: true, order };
    }

    if (nextStage === 'in_production') {
      order.status = 'in_production';
      storeRepo.commit();
      return { success: true, order };
    }

    if (nextStage === 'completed') {
      const recipe = store.recipes.find((r) => r.id === order.recipeId);
      if (!recipe) return { success: false, error: 'Linked recipe missing.' };
      const batches = order.targetPortions / Math.max(1, recipe.batchYieldPlates || 1);
      const actualPortions = options?.actualPortions ?? order.targetPortions;
      const wastagePortions = options?.wastagePortions ?? 0;

      const cookRes = this.cookBatchProduction(branchId, {
        recipeId: recipe.id,
        batches,
        actualPlatesProduced: actualPortions,
        actualInputs: options?.actualLineQtys,
        chefName: actor,
        managerOverride: Boolean(options?.exceptionReason || order.exceptionReason),
        overrideReason: options?.exceptionReason || order.exceptionReason,
      });

      if (!cookRes.success) {
        return { success: false, error: cookRes.error || 'Could not complete production order.' };
      }

      const actualCost = cookRes.log?.totalCost ?? order.standardCost;
      order.status = 'completed';
      order.actualPortions = actualPortions;
      order.wastagePortions = wastagePortions;
      order.wastageReason = options?.wastageReason;
      order.actualCost = actualCost;
      order.costVariance = actualCost - order.standardCost;
      order.completedAt = nowStr;
      order.lines = order.lines.map((ln) => ({
        ...ln,
        actualQty:
          options?.actualLineQtys && options.actualLineQtys[ln.ingredientId] !== undefined
            ? options.actualLineQtys[ln.ingredientId]
            : ln.standardQty,
      }));

      if (wastagePortions > 0 && recipe.menuItemId) {
        this.handleLeftoverPreparedPlates(
          branchId,
          recipe.menuItemId,
          Math.min(wastagePortions, actualPortions),
          'log_as_waste',
          options?.wastageReason || `Production loss on ${order.orderNumber}`
        );
      }

      storeRepo.commit();
      return { success: true, order };
    }

    order.status = nextStage;
    storeRepo.commit();
    return { success: true, order };
  },

  cancelProductionOrder(branchId: string, orderId: string, reason: string, actor = 'David Kasambala') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const po = store.productionOrders.find((p) => p.id === orderId);
    if (!po) throw new HttpError(404, `Production order "${orderId}" not found.`, 'PRODUCTION_ORDER_NOT_FOUND');
    po.status = 'cancelled';
    po.exceptionApprovedBy = actor;
    po.exceptionReason = reason;
    storeRepo.commit();
    return po;
  },

  // -------- SHORTAGES & CATERING --------
  resolveShortageViaPurchaseRequest(
    branchId: string,
    params: {
      id?: string;
      ingredientId: string;
      requestedQty: number;
      reason: string;
      linkedOrderRef?: string;
      requestedBy?: string;
    }
  ): PurchaseRequest {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.requestedQty <= 0) {
      throw new HttpError(422, 'Valid ingredient and positive quantity required.', 'VALIDATION_ERROR');
    }
    const unitCost = ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const pr: PurchaseRequest = {
      id: params.id || createId('pr'),
      requestNumber: `PR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      ingredientId: ing.id,
      ingredientName: ing.name,
      requestedQty: Math.round(params.requestedQty),
      unit: ing.consumptionUnit,
      estimatedCost: Math.round(params.requestedQty * unitCost),
      supplier: ing.supplier,
      reason: params.reason,
      linkedOrderRef: params.linkedOrderRef,
      status: 'pending',
      requestedBy: params.requestedBy || 'Executive Chef Juma',
      createdAt: nowTimestampStr(),
    };
    store.purchaseRequests.unshift(pr);
    store.notifications.unshift({
      id: createId('notif'),
      title: `Purchase Requisition ${pr.requestNumber}`,
      message: `Requested ${pr.requestedQty.toLocaleString()} ${pr.unit} of ${pr.ingredientName} (${formatTzs(
        pr.estimatedCost
      )}).`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'Review Purchase Request',
    });
    storeRepo.commit();
    return pr;
  },

  updatePurchaseRequestStatus(branchId: string, requestId: string, status: PurchaseRequest['status']) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.purchaseRequests.find((p) => p.id === requestId);
    if (!target) throw new HttpError(404, `Purchase request "${requestId}" not found.`, 'PR_NOT_FOUND');
    target.status = status;
    if (status === 'received') {
      this.recordStockIntake(branchId, {
        ingredientId: target.ingredientId,
        quantityUnits: target.requestedQty,
        cost: target.estimatedCost,
        supplier: target.supplier,
        invoiceRef: target.requestNumber,
      });
    } else {
      storeRepo.commit();
    }
    return target;
  },

  resolveShortageViaBranchTransfer(
    branchId: string,
    params: { id?: string; ingredientId: string; quantity: number; fromBranch: string; requestedBy?: string }
  ): BranchTransferRequest {
    const tenant = storeRepo.getBranchOrThrow(branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ing = store.ingredients.find((i) => i.id === params.ingredientId);
    if (!ing || params.quantity <= 0) {
      throw new HttpError(422, 'Valid ingredient and positive quantity required.', 'VALIDATION_ERROR');
    }
    const bt: BranchTransferRequest = {
      id: params.id || createId('bt'),
      transferNumber: `BTR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      fromBranch: params.fromBranch,
      toBranch: tenant.name,
      ingredientId: ing.id,
      ingredientName: ing.name,
      quantity: Math.round(params.quantity),
      unit: ing.consumptionUnit,
      status: 'in_transit',
      requestedBy: params.requestedBy || 'David Kasambala (Manager)',
      createdAt: nowTimestampStr(),
    };
    store.branchTransfers.unshift(bt);
    store.notifications.unshift({
      id: createId('notif'),
      title: `Inter-Branch Transfer ${bt.transferNumber}`,
      message: `${bt.quantity.toLocaleString()} ${bt.unit} of ${bt.ingredientName} dispatched from ${bt.fromBranch}.`,
      type: 'transfer',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'Receive Transfer',
    });
    storeRepo.commit();
    return bt;
  },

  receiveBranchTransfer(branchId: string, transferId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const bt = store.branchTransfers.find((b) => b.id === transferId);
    if (!bt || bt.status === 'received') {
      throw new HttpError(404, 'Pending branch transfer not found.', 'TRANSFER_NOT_FOUND');
    }
    bt.status = 'received';
    const ing = store.ingredients.find((i) => i.id === bt.ingredientId);
    if (ing) {
      const unitCost = ing.conversionRatio > 0 ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
      this.recordStockIntake(branchId, {
        ingredientId: ing.id,
        quantityUnits: bt.quantity,
        cost: Math.round(bt.quantity * unitCost),
        supplier: `Branch Transfer (${bt.fromBranch})`,
        invoiceRef: bt.transferNumber,
      });
    } else {
      storeRepo.commit();
    }
    return bt;
  },

  createCateringOrder(
    branchId: string,
    params: {
      id?: string;
      eventName: string;
      eventType: CateringOrder['eventType'];
      customerName: string;
      customerPhone: string;
      siteLocation: string;
      eventDate: string;
      items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>;
      depositPaid?: number;
      notes?: string;
    }
  ): CateringOrder {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const nowStr = nowTimestampStr();
    const builtItems: CateringOrderItem[] = params.items
      .filter((it) => it.quantity > 0)
      .map((it) => {
        const dish = store.menuItems.find((m) => m.id === it.menuItemId);
        const rec = store.recipes.find((r) => r.menuItemId === it.menuItemId);
        const unitCost = rec
          ? computeRecipeUnitCostPure(rec.id, store.recipes, store.ingredients, store.subRecipeBatches).perPlateCost
          : it.menuItemId === 'menu-soda-bottle'
          ? 917
          : Math.round((dish?.price || 0) * 0.35);
        return {
          menuItemId: it.menuItemId,
          recipeId: rec?.id,
          name: dish?.name || 'Catering Item',
          quantity: it.quantity,
          fulfilledQuantity: 0,
          unitPrice: dish?.price || 0,
          unitCost,
          portion: it.portion,
          notes: it.notes,
        };
      });

    const totalRevenue = builtItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const estimatedFoodCost = builtItems.reduce((s, it) => s + it.unitCost * it.quantity, 0);
    const foodGrossProfit = Math.max(0, totalRevenue - estimatedFoodCost);
    const foodCostPercentage = totalRevenue > 0 ? (estimatedFoodCost / totalRevenue) * 100 : 0;

    const newCat: CateringOrder = {
      id: params.id || createId('cat'),
      orderNumber: `CAT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      eventName: params.eventName,
      eventType: params.eventType,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      siteLocation: params.siteLocation,
      eventDate: params.eventDate,
      status: 'confirmed',
      items: builtItems,
      totalRevenue,
      estimatedFoodCost,
      foodGrossProfit,
      foodCostPercentage: Math.round(foodCostPercentage * 10) / 10,
      depositPaid: params.depositPaid || 0,
      notes: params.notes,
      createdBy: 'David Kasambala (Manager)',
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    store.cateringOrders.unshift(newCat);
    store.notifications.unshift({
      id: createId('notif'),
      title: `Catering Order ${newCat.orderNumber}`,
      message: `${newCat.eventName} (${builtItems.reduce((s, i) => s + i.quantity, 0)} items) scheduled for ${
        newCat.eventDate
      }.`,
      type: 'order',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'Plan Kitchen Production',
    });

    storeRepo.commit();
    return newCat;
  },

  reserveCateringIngredients(branchId: string, cateringOrderId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const order = store.cateringOrders.find((c) => c.id === cateringOrderId);
    if (!order) return { success: false, message: 'Catering order not found.' };
    if (order.reservedIngredients && order.reservedIngredients.length > 0) {
      return { success: true, message: 'Ingredients already reserved for this event.', order };
    }

    const scaled = calculateScaledRequirementsPure(
      order.items.map((it) => ({
        recipeId: it.recipeId,
        menuItemId: it.menuItemId,
        portions: it.quantity,
        portionName: it.portion,
      })),
      store.recipes,
      store.menuItems,
      store.ingredients,
      store.subRecipeBatches
    );

    if (!scaled.canProduceWithStore) {
      return {
        success: false,
        message: 'Insufficient unreserved stock for one or more ingredients. Resolve shortages or create purchase request first.',
      };
    }

    const rawReservations = scaled.rows.filter((r) => !r.isSubRecipe && r.requiredQty > 0);
    store.ingredients.forEach((ing) => {
      const match = rawReservations.find((r) => r.ingredientId === ing.id);
      if (match) {
        ing.reservedStockUnits = (ing.reservedStockUnits ?? 0) + match.requiredQty;
      }
    });

    if (order.status === 'confirmed' || order.status === 'draft') {
      order.status = 'ingredients_reserved';
    }
    order.reservedIngredients = rawReservations.map((r) => ({
      ingredientId: r.ingredientId,
      ingredientName: r.ingredientName,
      qty: r.requiredQty,
      unit: r.unit,
    }));
    order.updatedAt = nowTimestampStr();
    storeRepo.commit();

    return {
      success: true,
      message: `Reserved ${rawReservations.length} consolidated ingredients for ${order.orderNumber}.`,
      order,
    };
  },

  generateCateringProductionPlan(branchId: string, cateringOrderId: string, poIds?: string[]) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const order = store.cateringOrders.find((c) => c.id === cateringOrderId);
    if (!order) throw new HttpError(404, `Catering order "${cateringOrderId}" not found.`, 'CATERING_NOT_FOUND');

    const created: ProductionOrder[] = [];
    let poIdx = 0;
    order.items.forEach((it) => {
      if (!it.recipeId) return;
      const po = this.createProductionOrder(branchId, {
        id: poIds?.[poIdx++],
        recipeId: it.recipeId,
        targetPortions: it.quantity,
        sourceType: 'catering',
        productionModel: 'catering',
        scheduledFor: `${order.eventDate} · ${order.eventName}`,
        cateringOrderId: order.id,
        cateringOrderNumber: order.orderNumber,
      });
      created.push(po);
    });

    if (created.length > 0) {
      order.status = 'in_production';
      order.productionOrderIds = [...(order.productionOrderIds || []), ...created.map((p) => p.id)];
      order.updatedAt = nowTimestampStr();
      storeRepo.commit();
    }
    return created;
  },

  recordCateringFulfillment(
    branchId: string,
    cateringOrderId: string,
    fulfilledByMenuId: Record<string, number>,
    nextStatus?: CateringOrderStatus
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const order = store.cateringOrders.find((c) => c.id === cateringOrderId);
    if (!order) throw new HttpError(404, `Catering order "${cateringOrderId}" not found.`, 'CATERING_NOT_FOUND');

    order.items = order.items.map((it) => ({
      ...it,
      fulfilledQuantity:
        fulfilledByMenuId[it.menuItemId] !== undefined
          ? Math.min(it.quantity, Math.max(0, fulfilledByMenuId[it.menuItemId]))
          : it.fulfilledQuantity,
    }));

    const allDone = order.items.every((it) => it.fulfilledQuantity >= it.quantity);
    const someDone = order.items.some((it) => it.fulfilledQuantity > 0);
    const derivedStatus: CateringOrderStatus =
      nextStatus || (allDone ? 'completed' : someDone ? 'partial_fulfilled' : order.status);

    if (derivedStatus === 'completed' && order.reservedIngredients && order.reservedIngredients.length > 0) {
      store.ingredients.forEach((ing) => {
        const resMatch = order.reservedIngredients?.find((r) => r.ingredientId === ing.id);
        if (resMatch) {
          ing.reservedStockUnits = Math.max(0, (ing.reservedStockUnits ?? 0) - resMatch.qty);
        }
      });
    }

    order.status = derivedStatus;
    order.updatedAt = nowTimestampStr();
    storeRepo.commit();
    return order;
  },

  amendCateringOrder(
    branchId: string,
    cateringOrderId: string,
    items: Array<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>,
    note: string
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const c = store.cateringOrders.find((cat) => cat.id === cateringOrderId);
    if (!c) throw new HttpError(404, `Catering order "${cateringOrderId}" not found.`, 'CATERING_NOT_FOUND');

    const nowStr = nowTimestampStr();
    const builtItems: CateringOrderItem[] = items
      .filter((it) => it.quantity > 0)
      .map((it) => {
        const existing = c.items.find((e) => e.menuItemId === it.menuItemId);
        const dish = store.menuItems.find((m) => m.id === it.menuItemId);
        const rec = store.recipes.find((r) => r.menuItemId === it.menuItemId);
        const unitCost = rec
          ? computeRecipeUnitCostPure(rec.id, store.recipes, store.ingredients, store.subRecipeBatches).perPlateCost
          : it.menuItemId === 'menu-soda-bottle'
          ? 917
          : Math.round((dish?.price || 0) * 0.35);
        return {
          menuItemId: it.menuItemId,
          recipeId: rec?.id,
          name: dish?.name || existing?.name || 'Catering Item',
          quantity: it.quantity,
          fulfilledQuantity: Math.min(it.quantity, existing?.fulfilledQuantity || 0),
          unitPrice: dish?.price || existing?.unitPrice || 0,
          unitCost,
          portion: it.portion,
          notes: it.notes,
        };
      });

    const totalRevenue = builtItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const estimatedFoodCost = builtItems.reduce((s, it) => s + it.unitCost * it.quantity, 0);
    const foodGrossProfit = Math.max(0, totalRevenue - estimatedFoodCost);
    const foodCostPercentage = totalRevenue > 0 ? (estimatedFoodCost / totalRevenue) * 100 : 0;

    c.items = builtItems;
    c.totalRevenue = totalRevenue;
    c.estimatedFoodCost = estimatedFoodCost;
    c.foodGrossProfit = foodGrossProfit;
    c.foodCostPercentage = Math.round(foodCostPercentage * 10) / 10;
    c.amendments = [
      {
        id: createId('amd'),
        summary: note || 'Amended event quantities',
        timestamp: nowStr,
        actor: 'David Kasambala (Manager)',
      },
      ...(c.amendments || []),
    ];
    c.updatedAt = nowStr;
    storeRepo.commit();
    return c;
  },

  generateCateringInvoice(branchId: string, cateringOrderId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const c = store.cateringOrders.find((cat) => cat.id === cateringOrderId);
    if (!c) throw new HttpError(404, `Catering order "${cateringOrderId}" not found.`, 'CATERING_NOT_FOUND');

    const invNum = c.invoiceNumber || `INV-CAT-${Math.floor(10000 + Math.random() * 89999)}`;
    c.invoiceNumber = invNum;
    c.status = 'invoiced';
    c.updatedAt = nowTimestampStr();
    storeRepo.commit();
    return { invoiceNumber: invNum, order: c };
  },

  // -------- DAILY RECONCILIATION --------
  recomputeDailyVariance(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const today = todayDateStr();
    const existingMap = new Map(store.dailyReconciliations.map((item) => [item.ingredientId, item]));

    store.dailyReconciliations = store.ingredients.slice(0, 8).map((ing) => {
      const existing = existingMap.get(ing.id);
      const unitCost = ing.costPerPurchaseUnit / ing.conversionRatio;
      const transferredToday = store.stockMovements
        .filter(
          (m) =>
            m.ingredientId === ing.id &&
            m.type === 'stock_transfer' &&
            m.destinationLocation === 'kitchen' &&
            m.date === today
        )
        .reduce((s, m) => s + Math.abs(m.quantityDelta), 0);
      const theoreticalToday = store.stockMovements
        .filter(
          (m) =>
            m.ingredientId === ing.id &&
            (m.type === 'kitchen_consumption' || m.type === 'production_issue' || m.type === 'direct_consumption') &&
            m.date === today
        )
        .reduce((s, m) => s + Math.abs(m.quantityDelta), 0);

      const opening =
        existing?.openingKitchenStock ?? Math.max(0, (ing.kitchenStockUnits ?? 0) + theoreticalToday - transferredToday);
      const expectedClosing = Math.max(0, opening + transferredToday - theoreticalToday);
      const actualCounted = existing?.actualCountedStock ?? ing.kitchenStockUnits ?? expectedClosing;
      const varianceQty = actualCounted - expectedClosing;
      const varianceCost = Math.round(Math.abs(varianceQty) * unitCost);
      let varianceType: DailyReconciliationItem['varianceType'] = 'match';
      if (varianceQty < 0) {
        varianceType =
          Math.abs(varianceQty) > Math.max(1, expectedClosing) * 0.1 ? 'unaccounted_loss' : 'over_portioning';
      } else if (varianceQty > 0) {
        varianceType = 'surplus';
      }

      return {
        ingredientId: ing.id,
        ingredientName: ing.name,
        unit: ing.consumptionUnit,
        openingKitchenStock: opening,
        transferredToKitchen: transferredToday || (existing?.transferredToKitchen ?? 0),
        theoreticalUsage: theoreticalToday || (existing?.theoreticalUsage ?? 0),
        actualUsage: Math.max(
          0,
          opening + (transferredToday || (existing?.transferredToKitchen ?? 0)) - actualCounted
        ),
        expectedClosingStock: expectedClosing,
        actualCountedStock: actualCounted,
        varianceQty,
        varianceCost,
        varianceType,
        status: existing?.status ?? 'pending',
        notes: existing?.notes,
      };
    });

    storeRepo.commit();
    return store.dailyReconciliations;
  },

  updateDailyReconciliationCount(branchId: string, ingredientId: string, actualCount: number, notes?: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const item = store.dailyReconciliations.find((d) => d.ingredientId === ingredientId);
    if (!item) throw new HttpError(404, `Reconciliation item "${ingredientId}" not found.`, 'RECON_NOT_FOUND');

    const varianceQty = actualCount - item.expectedClosingStock;
    const ing = store.ingredients.find((i) => i.id === ingredientId);
    const unitCost = ing ? ing.costPerPurchaseUnit / ing.conversionRatio : 0;
    const varianceCost = Math.round(Math.abs(varianceQty) * unitCost);
    let varianceType: DailyReconciliationItem['varianceType'] = 'match';
    if (varianceQty < 0) {
      varianceType =
        Math.abs(varianceQty) > Math.max(1, item.expectedClosingStock) * 0.1 ? 'unaccounted_loss' : 'over_portioning';
    } else if (varianceQty > 0) {
      varianceType = 'surplus';
    }

    item.actualCountedStock = actualCount;
    item.actualUsage = Math.max(0, item.openingKitchenStock + item.transferredToKitchen - actualCount);
    item.varianceQty = varianceQty;
    item.varianceCost = varianceCost;
    item.varianceType = varianceType;
    if (notes !== undefined) item.notes = notes;

    storeRepo.commit();
    return item;
  },

  commitDailyReconciliation(branchId: string, staffName = 'David Kasambala (Manager)') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    let totalVariance = 0;
    const newMovements: StockMovement[] = [];
    const today = todayDateStr();

    const countedMap = new Map(store.dailyReconciliations.map((d) => [d.ingredientId, d.actualCountedStock]));
    store.ingredients.forEach((ing) => {
      const counted = countedMap.get(ing.id);
      if (counted !== undefined) {
        const sStock = ing.storeStockUnits ?? 0;
        ing.kitchenStockUnits = Math.max(0, counted);
        ing.currentStockUnits = ing.kitchenStockUnits + sStock;
      }
    });

    store.dailyReconciliations = store.dailyReconciliations.map((item) => {
      totalVariance += item.varianceCost;
      if (item.varianceQty !== 0) {
        newMovements.push({
          id: `sm-${Date.now()}-${item.ingredientId}`,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredientName,
          type: 'reconciliation_adjustment',
          quantityDelta: item.varianceQty,
          unit: item.unit,
          costImpact: item.varianceCost,
          date: today,
          reference: `RECON-${today}`,
          reason: `Physical closing variance (${item.varianceType.replace(/_/g, ' ')}): ${
            item.notes || 'End-of-day stock count'
          }`,
          recordedBy: staffName,
          sourceLocation: 'kitchen',
        });
      }
      return { ...item, status: 'reconciled' };
    });

    if (newMovements.length > 0) {
      store.stockMovements = [...newMovements, ...store.stockMovements];
    }

    store.notifications.unshift({
      id: createId('notif'),
      title: 'Daily Stock Reconciliation Committed',
      message: `Physical closing counts synced by ${staffName}. Variance impact: ${formatTzs(totalVariance)}.`,
      type: 'stock',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'View Audit Ledger',
    });

    storeRepo.commit();
    return { success: true, totalVarianceCost: totalVariance, items: store.dailyReconciliations };
  },
};
