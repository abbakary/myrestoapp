import { Router } from 'express';
import type {
  BlockedCookingAttempt,
  BomAuditLog,
  CateringOrder,
  CateringOrderStatus,
  Ingredient,
  MissingStockItem,
  ProductionModel,
  ProductionOrder,
  ProductionOrderStatus,
  PurchaseRequest,
  Recipe,
} from '../../src/types/restaurant.ts';
import {
  asRecord,
  asyncHandler,
  optionalBoolean,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireArray,
  requireEnum,
  requireNumber,
  requireString,
} from '../core/http.ts';
import { inventoryService } from '../services/inventoryService.ts';

export const inventoryRoutes = Router();

inventoryRoutes.get(
  '/branches/:branchId/inventory',
  asyncHandler(async (req, res) => {
    res.json(inventoryService.listInventory(String(req.params.branchId)));
  })
);

inventoryRoutes.post(
  '/branches/:branchId/ingredients',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const ing = inventoryService.addNewIngredient(
      String(req.params.branchId),
      body as Omit<Ingredient, 'id'> & { id?: string }
    );
    res.status(201).json(ing);
  })
);

inventoryRoutes.patch(
  '/branches/:branchId/ingredients/:ingredientId/stock',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.updateStock(
        String(req.params.branchId),
        String(req.params.ingredientId),
        requireNumber(body, 'deltaUnits')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/ingredients/:ingredientId/intake',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.recordStockIntake(String(req.params.branchId), {
        ingredientId: String(req.params.ingredientId),
        quantityUnits: requireNumber(body, 'quantityUnits', { min: 0.01 }),
        cost: requireNumber(body, 'cost', { min: 0 }),
        supplier: optionalString(body, 'supplier') || '',
        invoiceRef: optionalString(body, 'invoiceRef') || '',
        expiryDate: optionalString(body, 'expiryDate'),
      })
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/ingredients/:ingredientId/wastage',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.recordWastage(String(req.params.branchId), {
        ingredientId: String(req.params.ingredientId),
        quantityUnits: requireNumber(body, 'quantityUnits', { min: 0.01 }),
        reason: optionalString(body, 'reason') || '',
        location: optionalEnum(body, 'location', ['kitchen', 'main_store']),
      })
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/ingredients/:ingredientId/direct-consumption',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.recordDirectConsumption(String(req.params.branchId), {
        ingredientId: String(req.params.ingredientId),
        quantityUnits: requireNumber(body, 'quantityUnits', { min: 0.01 }),
        location: requireEnum(body, 'location', ['kitchen', 'main_store']),
        reason: optionalString(body, 'reason') || '',
        recordedBy: optionalString(body, 'recordedBy'),
      })
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/transfers',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.transferStock(String(req.params.branchId), {
        id: optionalString(body, 'id'),
        ingredientId: requireString(body, 'ingredientId'),
        quantityUnits: requireNumber(body, 'quantityUnits', { min: 0.01 }),
        fromLocation: requireEnum(body, 'fromLocation', ['main_store', 'kitchen']),
        toLocation: requireEnum(body, 'toLocation', ['main_store', 'kitchen']),
        reason: optionalString(body, 'reason') || '',
        shift: optionalString(body, 'shift'),
        recordedBy: optionalString(body, 'recordedBy'),
        requireKitchenConfirmation: optionalBoolean(body, 'requireKitchenConfirmation'),
      })
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/transfers/:movementId/confirm',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      inventoryService.confirmStockTransferReceipt(
        String(req.params.branchId),
        String(req.params.movementId),
        optionalString(body, 'receivedBy')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/transfers/:movementId/reject',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      inventoryService.rejectStockTransfer(
        String(req.params.branchId),
        String(req.params.movementId),
        optionalString(body, 'reason')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/transfers/return-all-kitchen',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      inventoryService.returnAllKitchenStockToStore(
        String(req.params.branchId),
        optionalString(body, 'staffName')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/recipes',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const recipe = body.recipe as Recipe;
    const auditLog = body.auditLog as Omit<BomAuditLog, 'id' | 'timestamp'> | undefined;
    res.status(201).json(inventoryService.saveRecipe(String(req.params.branchId), recipe, auditLog));
  })
);

inventoryRoutes.delete(
  '/branches/:branchId/recipes/:recipeId',
  asyncHandler(async (req, res) => {
    res.json(inventoryService.deleteRecipe(String(req.params.branchId), String(req.params.recipeId)));
  })
);

inventoryRoutes.patch(
  '/branches/:branchId/recipes/:recipeId/status',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', [
      'draft',
      'testing',
      'pending_approval',
      'approved',
      'suspended',
      'archived',
    ]);
    res.json(
      inventoryService.updateRecipeStatus(
        String(req.params.branchId),
        String(req.params.recipeId),
        status,
        optionalString(body, 'actor'),
        optionalString(body, 'note')
      )
    );
  })
);

inventoryRoutes.get(
  '/branches/:branchId/bom/cost/:recipeId',
  asyncHandler(async (req, res) => {
    res.json(
      inventoryService.computeRecipeUnitCost(String(req.params.branchId), String(req.params.recipeId))
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/bom/scale',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const items = requireArray<{
      recipeId?: string;
      menuItemId?: string;
      portions: number;
      portionName?: string;
      modifierNames?: string[];
      substituteOverrides?: Record<string, string>;
    }>(body, 'items');
    res.json(inventoryService.calculateScaledRequirements(String(req.params.branchId), items));
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/validate',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.validateBatchKitchenStock(
        String(req.params.branchId),
        requireString(body, 'recipeId'),
        optionalNumber(body, 'batches', { min: 0.1 }) ?? 1,
        (body.actualInputs as Record<string, number>) || undefined
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/cook',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.cookBatchProduction(String(req.params.branchId), {
        id: optionalString(body, 'id'),
        batchNumber: optionalString(body, 'batchNumber'),
        recipeId: requireString(body, 'recipeId'),
        batches: requireNumber(body, 'batches', { min: 0.1 }),
        actualPlatesProduced: optionalNumber(body, 'actualPlatesProduced', { min: 1 }),
        actualInputs: (body.actualInputs as Record<string, number>) || undefined,
        chefName: optionalString(body, 'chefName'),
        managerOverride: optionalBoolean(body, 'managerOverride'),
        overrideReason: optionalString(body, 'overrideReason'),
      })
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/:logId/reverse',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.reverseProductionBatch(
        String(req.params.branchId),
        String(req.params.logId),
        requireString(body, 'reason'),
        optionalString(body, 'actor')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/leftovers',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.handleLeftoverPreparedPlates(
        String(req.params.branchId),
        requireString(body, 'menuItemId'),
        requireNumber(body, 'platesCount', { min: 1 }),
        requireEnum(body, 'action', ['return_to_store', 'log_as_waste']),
        optionalString(body, 'reason')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/blocked-attempts',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.status(201).json(
      inventoryService.logBlockedCookingAttempt(
        String(req.params.branchId),
        body as Omit<BlockedCookingAttempt, 'id' | 'timestamp'>
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production/requisition-missing',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const missingItems = requireArray<MissingStockItem>(body, 'missingItems');
    res.json(
      inventoryService.createRequisitionForMissing(
        String(req.params.branchId),
        missingItems,
        optionalString(body, 'shift')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production-orders',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const po = inventoryService.createProductionOrder(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      recipeId: requireString(body, 'recipeId'),
      targetPortions: requireNumber(body, 'targetPortions', { min: 1 }),
      sourceType: optionalEnum(body, 'sourceType', [
        'pos_sale',
        'catering',
        'manager_plan',
        'forecast',
        'buffet',
      ]) as ProductionOrder['sourceType'] | undefined,
      productionModel: optionalEnum(body, 'productionModel', [
        'made_to_order',
        'batch_production',
        'buffet',
        'catering',
      ]) as ProductionModel | undefined,
      assignedTo: optionalString(body, 'assignedTo'),
      scheduledFor: optionalString(body, 'scheduledFor'),
      cateringOrderId: optionalString(body, 'cateringOrderId'),
      cateringOrderNumber: optionalString(body, 'cateringOrderNumber'),
      substituteOverrides: (body.substituteOverrides as Record<string, string>) || undefined,
    });
    res.status(201).json(po);
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production-orders/:orderId/stage',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const nextStage = requireEnum(body, 'nextStage', [
      'planned',
      'stock_checked',
      'ingredients_issued',
      'in_production',
      'completed',
      'cancelled',
      'reversed',
    ]) as ProductionOrderStatus;
    res.json(
      inventoryService.advanceProductionOrderStage(
        String(req.params.branchId),
        String(req.params.orderId),
        nextStage,
        (body.options as Record<string, unknown>) || undefined
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/production-orders/:orderId/cancel',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.cancelProductionOrder(
        String(req.params.branchId),
        String(req.params.orderId),
        requireString(body, 'reason'),
        optionalString(body, 'actor')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/purchase-requests',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const pr = inventoryService.resolveShortageViaPurchaseRequest(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      ingredientId: requireString(body, 'ingredientId'),
      requestedQty: requireNumber(body, 'requestedQty', { min: 1 }),
      reason: requireString(body, 'reason'),
      linkedOrderRef: optionalString(body, 'linkedOrderRef'),
      requestedBy: optionalString(body, 'requestedBy'),
    });
    res.status(201).json(pr);
  })
);

inventoryRoutes.patch(
  '/branches/:branchId/purchase-requests/:requestId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', [
      'pending',
      'approved',
      'ordered',
      'received',
    ]) as PurchaseRequest['status'];
    res.json(
      inventoryService.updatePurchaseRequestStatus(
        String(req.params.branchId),
        String(req.params.requestId),
        status
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/branch-transfers',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const bt = inventoryService.resolveShortageViaBranchTransfer(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      ingredientId: requireString(body, 'ingredientId'),
      quantity: requireNumber(body, 'quantity', { min: 1 }),
      fromBranch: requireString(body, 'fromBranch'),
      requestedBy: optionalString(body, 'requestedBy'),
    });
    res.status(201).json(bt);
  })
);

inventoryRoutes.post(
  '/branches/:branchId/branch-transfers/:transferId/receive',
  asyncHandler(async (req, res) => {
    res.json(
      inventoryService.receiveBranchTransfer(
        String(req.params.branchId),
        String(req.params.transferId)
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/catering-orders',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const cat = inventoryService.createCateringOrder(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      eventName: requireString(body, 'eventName'),
      eventType: requireEnum(body, 'eventType', [
        'corporate',
        'wedding',
        'school',
        'private',
        'other',
      ]) as CateringOrder['eventType'],
      customerName: requireString(body, 'customerName'),
      customerPhone: optionalString(body, 'customerPhone') || '',
      siteLocation: optionalString(body, 'siteLocation') || '',
      eventDate: requireString(body, 'eventDate'),
      items: requireArray<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>(
        body,
        'items'
      ),
      depositPaid: optionalNumber(body, 'depositPaid', { min: 0 }),
      notes: optionalString(body, 'notes'),
    });
    res.status(201).json(cat);
  })
);

inventoryRoutes.post(
  '/branches/:branchId/catering-orders/:orderId/reserve',
  asyncHandler(async (req, res) => {
    res.json(
      inventoryService.reserveCateringIngredients(
        String(req.params.branchId),
        String(req.params.orderId)
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/catering-orders/:orderId/production-plan',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    const poIds = Array.isArray(body.poIds) ? (body.poIds as string[]) : undefined;
    res.status(201).json(
      inventoryService.generateCateringProductionPlan(
        String(req.params.branchId),
        String(req.params.orderId),
        poIds
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/catering-orders/:orderId/fulfillment',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.recordCateringFulfillment(
        String(req.params.branchId),
        String(req.params.orderId),
        (body.fulfilledByMenuId as Record<string, number>) || {},
        optionalEnum(body, 'nextStatus', [
          'draft',
          'confirmed',
          'ingredients_reserved',
          'in_production',
          'partial_fulfilled',
          'completed',
          'invoiced',
          'cancelled',
        ]) as CateringOrderStatus | undefined
      )
    );
  })
);

inventoryRoutes.patch(
  '/branches/:branchId/catering-orders/:orderId/amend',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.amendCateringOrder(
        String(req.params.branchId),
        String(req.params.orderId),
        requireArray<{ menuItemId: string; quantity: number; portion?: string; notes?: string }>(
          body,
          'items'
        ),
        optionalString(body, 'note') || ''
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/catering-orders/:orderId/invoice',
  asyncHandler(async (req, res) => {
    res.json(
      inventoryService.generateCateringInvoice(
        String(req.params.branchId),
        String(req.params.orderId)
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/reconciliation/recompute',
  asyncHandler(async (req, res) => {
    res.json(inventoryService.recomputeDailyVariance(String(req.params.branchId)));
  })
);

inventoryRoutes.patch(
  '/branches/:branchId/reconciliation/:ingredientId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.updateDailyReconciliationCount(
        String(req.params.branchId),
        String(req.params.ingredientId),
        requireNumber(body, 'actualCount', { min: 0 }),
        optionalString(body, 'notes')
      )
    );
  })
);

inventoryRoutes.post(
  '/branches/:branchId/reconciliation/commit',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      inventoryService.commitDailyReconciliation(
        String(req.params.branchId),
        optionalString(body, 'staffName')
      )
    );
  })
);
