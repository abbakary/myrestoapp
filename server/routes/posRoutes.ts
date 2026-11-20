import { Router } from 'express';
import type { BranchCartItem } from '../../src/data/saasSeeds.ts';
import type {
  AppNotification,
  OrderStatus,
  Role,
  Table,
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
import { orderService } from '../services/orderService.ts';

export const posRoutes = Router();

posRoutes.get(
  '/branches/:branchId/orders',
  asyncHandler(async (req, res) => {
    res.json(orderService.listOrders(String(req.params.branchId)));
  })
);

posRoutes.post(
  '/branches/:branchId/orders',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const order = orderService.submitOrder(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      type: requireEnum(body, 'type', ['dine_in', 'pickup', 'delivery']),
      tableNumber: optionalString(body, 'tableNumber'),
      customerName: optionalString(body, 'customerName') || 'Guest Customer',
      customerPhone: optionalString(body, 'customerPhone'),
      deliveryAddress: optionalString(body, 'deliveryAddress'),
      paymentMethod: optionalEnum(body, 'paymentMethod', [
        'cash',
        'mpesa',
        'airtel',
        'card',
        'bank_transfer',
        'split',
      ]),
      referralWaiterId: optionalString(body, 'referralWaiterId'),
      servingWaiterId: optionalString(body, 'servingWaiterId'),
      notes: optionalString(body, 'notes'),
      markAsPaid: optionalBoolean(body, 'markAsPaid'),
      asDraft: optionalBoolean(body, 'asDraft'),
      existingDraftId: optionalString(body, 'existingDraftId'),
      priority: optionalEnum(body, 'priority', ['normal', 'rush', 'vip']),
      discount: optionalNumber(body, 'discount', { min: 0 }),
      discountType: optionalEnum(body, 'discountType', ['percent', 'fixed']),
      discountValue: optionalNumber(body, 'discountValue', { min: 0 }),
      discountReason: optionalString(body, 'discountReason'),
      tax: optionalNumber(body, 'tax', { min: 0 }),
      taxRate: optionalNumber(body, 'taxRate', { min: 0 }),
      isTaxExempt: optionalBoolean(body, 'isTaxExempt'),
      deliveryFee: optionalNumber(body, 'deliveryFee', { min: 0 }),
      donation: optionalNumber(body, 'donation', { min: 0 }),
      customItems: Array.isArray(body.customItems)
        ? (body.customItems as BranchCartItem[])
        : undefined,
      actorName: optionalString(body, 'actorName'),
      actorRole: optionalEnum(body, 'actorRole', [
        'owner',
        'manager',
        'cashier',
        'reception',
        'waiter',
        'kitchen',
        'customer',
      ]),
      activeReferralCode: optionalString(body, 'activeReferralCode') ?? null,
    });
    res.status(201).json(order);
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/dispatch',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      orderService.submitDraftToKitchen(
        String(req.params.branchId),
        String(req.params.orderId),
        optionalString(body, 'actorName')
      )
    );
  })
);

posRoutes.patch(
  '/branches/:branchId/orders/:orderId/status',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', [
      'draft',
      'pending',
      'confirmed',
      'sent_to_kitchen',
      'accepted',
      'preparing',
      'ready',
      'served',
      'dispatched',
      'completed',
      'cancelled',
      'rejected',
    ] as const) as OrderStatus;
    res.json(
      orderService.updateOrderStatus(
        String(req.params.branchId),
        String(req.params.orderId),
        status,
        optionalString(body, 'actorName'),
        optionalString(body, 'note'),
        optionalEnum(body, 'actorRole', [
          'owner',
          'manager',
          'cashier',
          'reception',
          'waiter',
          'kitchen',
          'customer',
        ]) as Role | undefined
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/fast-forward',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      orderService.fastForwardOrderToServed(
        String(req.params.branchId),
        String(req.params.orderId),
        optionalString(body, 'actorName')
      )
    );
  })
);

posRoutes.patch(
  '/branches/:branchId/orders/:orderId/items/:itemIndex/status',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const itemStatus = requireEnum(body, 'itemStatus', [
      'pending',
      'accepted',
      'preparing',
      'ready',
      'served',
      'rejected',
    ]);
    res.json(
      orderService.updateOrderItemStatus(
        String(req.params.branchId),
        String(req.params.orderId),
        Number(req.params.itemIndex),
        itemStatus,
        optionalString(body, 'actorName')
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/items/:itemIndex/reject',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.rejectOrderItem(
        String(req.params.branchId),
        String(req.params.orderId),
        Number(req.params.itemIndex),
        requireString(body, 'kitchenStaff'),
        requireString(body, 'reason')
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/payments',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const method = requireEnum(body, 'method', [
      'cash',
      'mpesa',
      'airtel',
      'card',
      'bank_transfer',
    ]);
    const amount = requireNumber(body, 'amount', { min: 1 });
    res.json(
      orderService.processPayment(
        String(req.params.branchId),
        String(req.params.orderId),
        method,
        amount,
        {
          completeService: optionalBoolean(body, 'completeService'),
          collectedBy: optionalString(body, 'collectedBy'),
          transactionRef: optionalString(body, 'transactionRef'),
          isRefund: optionalBoolean(body, 'isRefund'),
        }
      )
    );
  })
);

posRoutes.patch(
  '/branches/:branchId/orders/:orderId/commission',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.updateOrderCommission(
        String(req.params.branchId),
        String(req.params.orderId),
        requireEnum(body, 'mode', ['percent', 'fixed']),
        requireNumber(body, 'value', { min: 0 }),
        optionalString(body, 'configuredBy'),
        optionalString(body, 'waiterId')
      )
    );
  })
);

posRoutes.patch(
  '/branches/:branchId/orders/:orderId/waiter',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.assignOrderWaiter(
        String(req.params.branchId),
        String(req.params.orderId),
        optionalString(body, 'waiterId') || ''
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/cancel',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.cancelOrderControlled(
        String(req.params.branchId),
        String(req.params.orderId),
        requireString(body, 'reason'),
        requireString(body, 'actor'),
        optionalString(body, 'approvedBy')
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/orders/:orderId/items/:itemIndex/promote',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.status(201).json(
      orderService.promoteCustomItemToMenu(
        String(req.params.branchId),
        String(req.params.orderId),
        Number(req.params.itemIndex),
        optionalString(body, 'category'),
        optionalString(body, 'id')
      )
    );
  })
);

posRoutes.post(
  '/branches/:branchId/approvals',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const reqEntry = orderService.requestApproval(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      orderId: requireString(body, 'orderId'),
      actionType: requireEnum(body, 'actionType', [
        'discount',
        'void_item',
        'price_change',
        'cancel_order',
        'refund',
      ]),
      requestedBy: requireString(body, 'requestedBy'),
      requestedRole: requireEnum(body, 'requestedRole', [
        'owner',
        'manager',
        'cashier',
        'reception',
        'waiter',
        'kitchen',
        'customer',
      ]),
      details: requireString(body, 'details'),
      amountImpact: requireNumber(body, 'amountImpact'),
      reason: requireString(body, 'reason'),
      payload:
        body.payload && typeof body.payload === 'object'
          ? (body.payload as Record<string, unknown>)
          : undefined,
    });
    res.status(201).json(reqEntry);
  })
);

posRoutes.post(
  '/branches/:branchId/approvals/:requestId/review',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.reviewApprovalRequest(
        String(req.params.branchId),
        String(req.params.requestId),
        Boolean(body.approve),
        optionalString(body, 'managerName')
      )
    );
  })
);

posRoutes.get(
  '/branches/:branchId/discrepancies',
  asyncHandler(async (req, res) => {
    res.json(orderService.listDiscrepancies(String(req.params.branchId)));
  })
);

posRoutes.put(
  '/branches/:branchId/cart',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const items = requireArray<BranchCartItem>(body, 'cart');
    res.json(orderService.updateCart(String(req.params.branchId), items));
  })
);

posRoutes.patch(
  '/branches/:branchId/settings',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.updateBranchSettings(String(req.params.branchId), {
        taxEnabled: optionalBoolean(body, 'taxEnabled'),
        taxRatePct: optionalNumber(body, 'taxRatePct', { min: 0, max: 100 }),
        defaultCommissionMode: optionalEnum(body, 'defaultCommissionMode', ['percent', 'fixed']),
        defaultCommissionValue: optionalNumber(body, 'defaultCommissionValue', { min: 0 }),
        bomDeductionPolicy: optionalEnum(body, 'bomDeductionPolicy', [
          'on_kitchen_start',
          'on_order_submit',
          'on_payment',
        ]),
      })
    );
  })
);

posRoutes.get(
  '/branches/:branchId/tables',
  asyncHandler(async (req, res) => {
    res.json(orderService.listTables(String(req.params.branchId)));
  })
);

posRoutes.post(
  '/branches/:branchId/tables',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const tbl = orderService.addTable(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      number: requireString(body, 'number'),
      capacity: requireNumber(body, 'capacity', { min: 1 }),
      zone: optionalEnum(body, 'zone', ['Main Dining', 'Terrace & Patio', 'VIP Lounge', 'Bar Area']),
      status: optionalEnum(body, 'status', ['available', 'occupied', 'reserved', 'billing']) || 'available',
      currentOrderId: optionalString(body, 'currentOrderId'),
      assignedWaiterId: optionalString(body, 'assignedWaiterId'),
    });
    res.status(201).json(tbl);
  })
);

posRoutes.patch(
  '/branches/:branchId/tables/:tableId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      orderService.updateTable(String(req.params.branchId), String(req.params.tableId), body as Partial<Table>)
    );
  })
);

posRoutes.delete(
  '/branches/:branchId/tables/:tableId',
  asyncHandler(async (req, res) => {
    res.json(orderService.deleteTable(String(req.params.branchId), String(req.params.tableId)));
  })
);

posRoutes.post(
  '/branches/:branchId/tables/:tableId/release',
  asyncHandler(async (req, res) => {
    res.json(orderService.releaseTable(String(req.params.branchId), String(req.params.tableId)));
  })
);

posRoutes.post(
  '/branches/:branchId/notifications',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const n = orderService.addNotification(
      String(req.params.branchId),
      body as Omit<AppNotification, 'id' | 'timestamp' | 'read'>
    );
    res.status(201).json(n);
  })
);

posRoutes.post(
  '/branches/:branchId/notifications/:notificationId/read',
  asyncHandler(async (req, res) => {
    res.json(
      orderService.markNotificationRead(String(req.params.branchId), String(req.params.notificationId))
    );
  })
);

posRoutes.post(
  '/branches/:branchId/notifications/read-all',
  asyncHandler(async (req, res) => {
    res.json(orderService.markAllNotificationsRead(String(req.params.branchId)));
  })
);

posRoutes.delete(
  '/branches/:branchId/notifications/:notificationId',
  asyncHandler(async (req, res) => {
    res.json(
      orderService.clearNotification(String(req.params.branchId), String(req.params.notificationId))
    );
  })
);
