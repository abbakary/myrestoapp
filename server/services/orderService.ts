import type { BranchCartItem, BranchWorkspaceStore } from '../../src/data/saasSeeds.ts';
import type {
  AppNotification,
  ApprovalRequest,
  BomDeductionPolicy,
  CommissionMode,
  MenuItem,
  Order,
  OrderAdjustment,
  OrderItemStatus,
  OrderStatus,
  OrderStatusHistoryItem,
  OrderType,
  PaymentMethod,
  PaymentTransaction,
  Role,
  Table,
} from '../../src/types/restaurant.ts';
import { computeDiscrepanciesPure } from '../../src/shared/analyticsEngine.ts';
import { deductStockForOrderLinesPure } from '../../src/shared/costingEngine.ts';
import { createId, formatTzs, sanitizeCartItems } from '../../src/shared/helpers.ts';
import { HttpError } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

function applyOrderStockDeduction(
  store: BranchWorkspaceStore,
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    portion?: string;
    selectedModifiers?: BranchCartItem['selectedModifiers'];
    customerNotes?: string;
    customInstructions?: string;
    status?: OrderItemStatus;
  }>,
  orderNumber: string,
  stageLabel: string
) {
  const result = deductStockForOrderLinesPure({
    orderItems: items,
    orderNumber,
    stageLabel,
    recipes: store.recipes,
    ingredients: store.ingredients,
    stockLots: store.stockLots,
    subRecipeBatches: store.subRecipeBatches,
    preparedDishStocks: store.preparedDishStocks,
    productionLogs: store.productionLogs,
    stockMovements: store.stockMovements,
    notifications: store.notifications,
  });
  store.ingredients = result.ingredients;
  store.stockLots = result.stockLots;
  store.subRecipeBatches = result.subRecipeBatches;
  store.preparedDishStocks = result.preparedDishStocks;
  store.productionLogs = result.productionLogs;
  store.stockMovements = result.stockMovements;
  store.notifications = result.notifications;
}

export const orderService = {
  listOrders(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return store.orders;
  },

  submitOrder(
    branchId: string,
    params: {
      id?: string;
      type: OrderType;
      tableNumber?: string;
      customerName: string;
      customerPhone?: string;
      deliveryAddress?: string;
      paymentMethod?: PaymentMethod;
      referralWaiterId?: string;
      servingWaiterId?: string;
      notes?: string;
      markAsPaid?: boolean;
      asDraft?: boolean;
      existingDraftId?: string;
      priority?: 'normal' | 'rush' | 'vip';
      discount?: number;
      discountType?: 'percent' | 'fixed';
      discountValue?: number;
      discountReason?: string;
      tax?: number;
      taxRate?: number;
      isTaxExempt?: boolean;
      deliveryFee?: number;
      donation?: number;
      customItems?: BranchCartItem[];
      actorName?: string;
      actorRole?: Role;
      activeReferralCode?: string | null;
    }
  ): Order {
    const tenant = storeRepo.getBranchOrThrow(branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const rawSourceItems = params.customItems ?? store.cart;
    const sourceItems = sanitizeCartItems(rawSourceItems, store.menuItems);
    if (!sourceItems || sourceItems.length === 0) {
      throw new HttpError(422, 'Order must contain at least one item.', 'EMPTY_ORDER');
    }

    let subtotal = 0;
    const items = sourceItems.map((ci) => {
      const unitPrice = (ci.menuItem?.price ?? 0) + (ci.selectedPortion?.priceDelta || 0);
      const modifiersSum = (ci.selectedModifiers || []).reduce((acc, m) => acc + (m?.price ?? 0), 0);
      const extraCharge = Math.max(0, Math.round(ci.extraCharge || 0));
      const totalItemPrice = unitPrice + modifiersSum + extraCharge;
      subtotal += totalItemPrice * ci.quantity;

      return {
        menuItemId: ci.menuItem.id,
        name: ci.menuItem.name,
        price: totalItemPrice,
        quantity: ci.quantity,
        portion: ci.selectedPortion?.name,
        selectedModifiers: ci.selectedModifiers || [],
        customerNotes: ci.customerNotes,
        customInstructions: ci.customInstructions,
        extraCharge: extraCharge > 0 ? extraCharge : undefined,
        isCustomItem: ci.isCustomItem || ci.menuItem.id.startsWith('custom-'),
        station: ci.menuItem.station,
        status: 'pending' as const,
      };
    });

    const discountAmount = Math.max(0, Math.min(subtotal, Math.round(params.discount ?? 0)));
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const effectiveRate = store.taxEnabled ? (params.taxRate !== undefined ? params.taxRate : store.taxRatePct / 100) : 0;
    let tax = 0;
    const isExempt = !store.taxEnabled || Boolean(params.isTaxExempt);
    if (!isExempt) {
      tax = params.tax !== undefined ? Math.max(0, Math.round(params.tax)) : Math.round(discountedSubtotal * effectiveRate);
    }

    let deliveryFee = 0;
    if (params.type === 'delivery') {
      deliveryFee = params.deliveryFee !== undefined ? Math.max(0, Math.round(params.deliveryFee)) : tenant.deliveryFee;
    }
    const donation = params.donation !== undefined ? params.donation : 0;
    const total = Math.max(0, discountedSubtotal + tax + deliveryFee + donation);

    const existingDraft = params.existingDraftId
      ? store.orders.find((o) => o.id === params.existingDraftId)
      : undefined;
    const nextOrderNum = existingDraft?.orderNumber || `#F00${store.orders.length + 27}`;
    const nextKotNum = existingDraft?.kotNumber || `KOT-${Math.floor(154650 + store.orders.length * 3 + Math.random() * 9)}`;
    const branchPrefix = tenant.branchCode?.split('-')[1] || (tenant.id === 'tenant-kona-chips' ? 'KC' : 'SV');
    const existingCodes = new Set(store.orders.map((o) => o.serviceCouponCode).filter(Boolean));
    let serviceCouponCode =
      existingDraft?.serviceCouponCode || `${branchPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingDraft?.serviceCouponCode) {
      while (existingCodes.has(serviceCouponCode)) {
        serviceCouponCode = `${branchPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const defaultCommAmount =
      store.defaultCommissionMode === 'percent'
        ? Math.round(discountedSubtotal * (Math.max(0, Math.min(100, store.defaultCommissionValue)) / 100))
        : Math.max(0, Math.round(store.defaultCommissionValue));

    const nowIso = new Date().toISOString();
    const actor =
      params.actorName ||
      (params.servingWaiterId ? store.waiters.find((w) => w.id === params.servingWaiterId)?.name || 'Staff' : 'POS / Guest');
    const actorRole: Role = params.actorRole || (params.servingWaiterId ? 'waiter' : 'cashier');
    const targetStatus: OrderStatus = params.asDraft ? 'draft' : 'sent_to_kitchen';
    const orderId = existingDraft?.id || params.id || `ord-${Date.now()}`;

    const initialPayments: PaymentTransaction[] =
      params.markAsPaid && total > 0
        ? [
            {
              id: `pay-${Date.now()}`,
              orderId,
              method: (params.paymentMethod && params.paymentMethod !== 'split'
                ? params.paymentMethod
                : 'cash') as Exclude<PaymentMethod, 'split'>,
              amount: total,
              receivedBy: actor,
              timestamp: nowIso,
            },
          ]
        : existingDraft?.payments || [];

    const shouldDeductNow =
      !params.asDraft &&
      (store.bomDeductionPolicy === 'on_order_submit' ||
        (store.bomDeductionPolicy === 'on_payment' && Boolean(params.markAsPaid)));

    const resolvedReferralWaiterId =
      params.referralWaiterId ||
      (params.activeReferralCode
        ? store.waiters.find((w) => w.referralCode === params.activeReferralCode)?.id || store.waiters[0]?.id
        : undefined);

    const newOrder: Order = {
      id: orderId,
      orderNumber: nextOrderNum,
      kotNumber: nextKotNum,
      serviceCouponCode,
      tenantId: tenant.id,
      type: params.type,
      priority: params.priority || 'normal',
      tableNumber: params.tableNumber,
      customerName: params.customerName || 'Guest Customer',
      customerPhone: params.customerPhone,
      deliveryAddress: params.deliveryAddress,
      items,
      status: targetStatus,
      paymentStatus: params.markAsPaid ? 'paid' : 'unpaid',
      paymentMethod: params.paymentMethod,
      referralWaiterId: resolvedReferralWaiterId,
      servingWaiterId: params.servingWaiterId,
      subtotal,
      originalAmount: existingDraft?.originalAmount ?? total,
      discount: discountAmount,
      discountType: params.discountType,
      discountValue: params.discountValue,
      discountReason: params.discountReason,
      tax,
      taxRate: isExempt ? 0 : effectiveRate,
      isTaxExempt: isExempt,
      deliveryFee,
      donation,
      total,
      paidAmount: params.markAsPaid ? total : existingDraft?.paidAmount || 0,
      payments: initialPayments,
      adjustments: existingDraft?.adjustments || [],
      statusHistory: [
        ...(existingDraft?.statusHistory || []),
        {
          status: targetStatus,
          actor,
          note: params.asDraft
            ? 'Saved draft order (visible to management)'
            : existingDraft
            ? 'Submitted saved draft to Kitchen'
            : 'Order created and sent to Kitchen',
          timestamp: nowIso,
        },
      ],
      commissionMode: store.defaultCommissionMode,
      commissionValue: store.defaultCommissionValue,
      commissionAmount: defaultCommAmount,
      commissionConfiguredBy:
        store.defaultCommissionMode === 'percent'
          ? `Auto Rule (${store.defaultCommissionValue}% Net)`
          : `Auto Rule (${formatTzs(store.defaultCommissionValue)} Fixed)`,
      commissionUpdatedAt: nowIso,
      stockDeducted: shouldDeductNow || existingDraft?.stockDeducted || false,
      stockDeductionStage: shouldDeductNow
        ? store.bomDeductionPolicy === 'on_payment'
          ? 'On Payment'
          : 'Order Submit'
        : existingDraft?.stockDeductionStage,
      notes: params.notes,
      createdAt: existingDraft?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    if (existingDraft) {
      store.orders = store.orders.map((o) => (o.id === existingDraft.id ? newOrder : o));
    } else {
      store.orders.unshift(newOrder);
    }

    if (params.type === 'dine_in' && params.tableNumber && !params.asDraft) {
      store.tables.forEach((t) => {
        if (t.number.toLowerCase() === params.tableNumber?.toLowerCase()) {
          t.status = 'occupied';
          t.currentOrderId = newOrder.id;
          t.assignedWaiterId = params.servingWaiterId;
        }
      });
    }

    if (!params.asDraft) {
      if (shouldDeductNow && !existingDraft?.stockDeducted) {
        applyOrderStockDeduction(
          store,
          sourceItems.map((ci) => ({
            menuItemId: ci.menuItem.id,
            name: ci.menuItem.name,
            quantity: ci.quantity,
            portion: ci.selectedPortion?.name,
            selectedModifiers: ci.selectedModifiers,
            customerNotes: ci.customerNotes,
            customInstructions: ci.customInstructions,
          })),
          nextOrderNum,
          'Order Submit'
        );
      }
      store.notifications.unshift({
        id: createId('notif'),
        title: `New Order ${nextOrderNum} (${serviceCouponCode})`,
        message: `${
          params.type === 'dine_in' ? `Table ${params.tableNumber}` : params.type.toUpperCase()
        } - ${items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
        type: 'order',
        timestamp: nowIso,
        read: false,
        actionRole: 'kitchen',
        actionLabel: 'Open KDS Ticket',
      });
    } else {
      store.notifications.unshift({
        id: createId('notif'),
        title: `Waiter Draft Saved: ${nextOrderNum}`,
        message: `${actor} saved a draft (${formatTzs(total)}) for ${
          params.tableNumber || params.customerName
        }. Visible for accountability.`,
        type: 'order',
        timestamp: nowIso,
        read: false,
        actionRole: 'manager',
        actionLabel: 'Review Drafts',
      });
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      actor,
      actorRole,
      action: params.asDraft ? 'DRAFT_SAVED' : 'ORDER_SUBMITTED',
      details: `${params.asDraft ? 'Draft saved' : 'Sent to kitchen'} (${items.length} line items, ${formatTzs(
        total
      )})${items.some((i) => i.isCustomItem) ? ' · Contains Custom Off-Menu Item' : ''}`,
      timestamp: nowIso,
    });

    if (!params.customItems) {
      store.cart = [];
    }

    storeRepo.commit();
    return newOrder;
  },

  submitDraftToKitchen(branchId: string, orderId: string, actorName = 'Waiter') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const draft = store.orders.find((o) => o.id === orderId);
    if (!draft) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');
    if (draft.status !== 'draft') throw new HttpError(409, 'Order is not a draft.', 'NOT_A_DRAFT');

    const nowIso = new Date().toISOString();
    const deductNow = !draft.stockDeducted && store.bomDeductionPolicy === 'on_order_submit';

    draft.status = 'sent_to_kitchen';
    draft.stockDeducted = draft.stockDeducted || deductNow;
    draft.stockDeductionStage = deductNow ? 'Order Submit' : draft.stockDeductionStage;
    draft.updatedAt = nowIso;
    draft.statusHistory = [
      ...(draft.statusHistory || []),
      {
        status: 'sent_to_kitchen',
        actor: actorName,
        note: 'Draft submitted to Kitchen KDS',
        timestamp: nowIso,
      },
    ];

    if (deductNow) {
      applyOrderStockDeduction(store, draft.items, draft.orderNumber, 'Draft Dispatch');
    }

    if (draft.type === 'dine_in' && draft.tableNumber) {
      store.tables.forEach((t) => {
        if (t.number.toLowerCase() === draft.tableNumber?.toLowerCase()) {
          t.status = 'occupied';
          t.currentOrderId = draft.id;
          t.assignedWaiterId = draft.servingWaiterId;
        }
      });
    }

    store.notifications.unshift({
      id: createId('notif'),
      title: `Draft Dispatched: ${draft.orderNumber}`,
      message: `${draft.kotNumber || draft.orderNumber} sent to Kitchen by ${actorName}.`,
      type: 'order',
      timestamp: nowIso,
      read: false,
      actionRole: 'kitchen',
      actionLabel: 'Open KDS',
    });

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: draft.id,
      orderNumber: draft.orderNumber,
      actor: actorName,
      actorRole: 'waiter',
      action: 'DRAFT_DISPATCHED_TO_KITCHEN',
      details: `Converted draft ${draft.orderNumber} (${draft.kotNumber || ''}) into live Kitchen KOT.`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return draft;
  },

  updateOrderStatus(
    branchId: string,
    orderId: string,
    status: OrderStatus,
    actorName = 'Kitchen / Floor Staff',
    note?: string,
    actorRole: Role = 'kitchen'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');

    const nowIso = new Date().toISOString();
    const shouldDeductOnKitchenTransition =
      !target.stockDeducted &&
      store.bomDeductionPolicy === 'on_kitchen_start' &&
      ['accepted', 'preparing', 'ready', 'served', 'completed'].includes(status);

    if (shouldDeductOnKitchenTransition) {
      applyOrderStockDeduction(store, target.items, target.orderNumber, `Kitchen ${status}`);
    }

    let updatedItems = target.items;
    if (status === 'accepted') {
      updatedItems = target.items.map((it) => (it.status === 'pending' ? { ...it, status: 'accepted' as const } : it));
    } else if (status === 'ready') {
      updatedItems = target.items.map((it) => (it.status !== 'rejected' ? { ...it, status: 'ready' as const } : it));
    } else if (status === 'served') {
      updatedItems = target.items.map((it) => (it.status !== 'rejected' ? { ...it, status: 'served' as const } : it));
    } else if (status === 'preparing') {
      updatedItems = target.items.map((it) => ({
        ...it,
        status: it.status === 'pending' || it.status === 'accepted' ? 'preparing' : it.status,
      }));
    }

    if (status === 'ready' && target.status !== 'ready') {
      store.notifications.unshift({
        id: createId('notif'),
        title: `Order Ready: ${target.orderNumber}`,
        message: `${target.tableNumber || target.customerName} dishes are ready on the pass!`,
        type: 'kitchen',
        timestamp: nowIso,
        read: false,
        actionRole: 'cashier',
        actionLabel: 'View POS Counter',
      });
    }

    const prevStatus = target.status;
    target.status = status;
    target.items = updatedItems;
    target.stockDeducted = target.stockDeducted || shouldDeductOnKitchenTransition;
    if (shouldDeductOnKitchenTransition && !target.stockDeductionStage) {
      target.stockDeductionStage = `Kitchen ${status}`;
    }
    target.updatedAt = nowIso;
    target.statusHistory = [...(target.statusHistory || []), { status, actor: actorName, note, timestamp: nowIso }];

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor: actorName,
      actorRole,
      action: `STATUS_${status.toUpperCase()}`,
      details: `Order ${target.orderNumber} moved from ${prevStatus} to ${status}${
        shouldDeductOnKitchenTransition ? ' · BOM Stock Deducted' : ''
      }${note ? ` (${note})` : ''}.`,
      timestamp: nowIso,
    });

    if (['completed', 'cancelled', 'rejected'].includes(status) && target.tableNumber) {
      store.tables.forEach((t) => {
        if (t.number.toLowerCase() === target.tableNumber?.toLowerCase()) {
          t.status = 'available';
          t.currentOrderId = undefined;
        }
      });
    }

    storeRepo.commit();
    return target;
  },

  fastForwardOrderToServed(branchId: string, orderId: string, actorName = 'Waiter') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');
    if (['draft', 'cancelled', 'rejected', 'served', 'completed'].includes(target.status)) {
      throw new HttpError(409, `Order in status "${target.status}" cannot be fast-forwarded.`, 'INVALID_STATUS');
    }

    const nowIso = new Date().toISOString();
    const pipeline: OrderStatus[] = ['accepted', 'preparing', 'ready', 'served'];
    const currentIdx = pipeline.indexOf(target.status);
    const stepsToRecord: OrderStatus[] = currentIdx >= 0 ? pipeline.slice(currentIdx + 1) : pipeline;

    const shouldDeductNow =
      !target.stockDeducted &&
      (store.bomDeductionPolicy === 'on_kitchen_start' || store.bomDeductionPolicy === 'on_order_submit');

    if (shouldDeductNow) {
      applyOrderStockDeduction(store, target.items, target.orderNumber, 'Waiter Fast-Serve');
    }

    const newHistoryEntries: OrderStatusHistoryItem[] = stepsToRecord.map((stage) => ({
      status: stage,
      actor: `${actorName} (Waiter Assist)`,
      note:
        stage === 'served'
          ? 'Processed all kitchen stages up to Served (kitchen busy assist)'
          : 'Auto-advanced via Waiter Fast-Serve',
      timestamp: nowIso,
    }));

    const prevStatus = target.status;
    target.status = 'served';
    target.items = target.items.map((it) => (it.status !== 'rejected' ? { ...it, status: 'served' as const } : it));
    target.stockDeducted = target.stockDeducted || shouldDeductNow;
    if (shouldDeductNow && !target.stockDeductionStage) {
      target.stockDeductionStage = 'Waiter Fast-Serve';
    }
    target.updatedAt = nowIso;
    target.statusHistory = [...(target.statusHistory || []), ...newHistoryEntries];

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor: actorName,
      actorRole: 'waiter',
      action: 'WAITER_FAST_FORWARD_SERVED',
      details: `Order ${target.orderNumber} fast-processed from ${prevStatus} through ${stepsToRecord.join(
        ' → '
      )} by ${actorName}${shouldDeductNow ? ' · BOM Stock Deducted' : ''}.`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return target;
  },

  updateOrderItemStatus(
    branchId: string,
    orderId: string,
    itemIndex: number,
    itemStatus: OrderItemStatus,
    actorName = 'Kitchen Staff'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target || !target.items[itemIndex]) {
      throw new HttpError(404, 'Order or order item not found.', 'ITEM_NOT_FOUND');
    }

    const nowIso = new Date().toISOString();
    const shouldDeductNow =
      !target.stockDeducted &&
      store.bomDeductionPolicy === 'on_kitchen_start' &&
      ['accepted', 'preparing', 'ready', 'served'].includes(itemStatus);

    if (shouldDeductNow) {
      applyOrderStockDeduction(store, target.items, target.orderNumber, `Kitchen ${itemStatus}`);
    }

    target.items[itemIndex] = { ...target.items[itemIndex], status: itemStatus };
    const activeItems = target.items.filter((it) => it.status !== 'rejected');
    const allReady = activeItems.length > 0 && activeItems.every((it) => it.status === 'ready' || it.status === 'served');
    const anyPreparing = activeItems.some((it) => it.status === 'preparing');
    const anyAccepted = activeItems.some((it) => it.status === 'accepted');
    const newOrderStatus: OrderStatus =
      activeItems.length === 0
        ? 'rejected'
        : allReady
        ? 'ready'
        : anyPreparing
        ? 'preparing'
        : anyAccepted && target.status === 'sent_to_kitchen'
        ? 'accepted'
        : target.status;

    if (newOrderStatus !== target.status) {
      target.statusHistory = [
        ...(target.statusHistory || []),
        {
          status: newOrderStatus,
          actor: actorName,
          note: `Item "${target.items[itemIndex]?.name}" marked ${itemStatus}`,
          timestamp: nowIso,
        },
      ];
    }

    target.status = newOrderStatus;
    target.stockDeducted = target.stockDeducted || shouldDeductNow;
    if (shouldDeductNow && !target.stockDeductionStage) {
      target.stockDeductionStage = `Kitchen ${itemStatus}`;
    }
    target.updatedAt = nowIso;

    storeRepo.commit();
    return target;
  },

  rejectOrderItem(branchId: string, orderId: string, itemIndex: number, kitchenStaff: string, reason: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target || !target.items[itemIndex]) {
      throw new HttpError(404, 'Order or order item not found.', 'ITEM_NOT_FOUND');
    }

    const nowIso = new Date().toISOString();
    const rejectedItem = target.items[itemIndex];
    const deductionAmount = rejectedItem.price * rejectedItem.quantity;

    target.items[itemIndex] = {
      ...rejectedItem,
      status: 'rejected',
      rejectionReason: reason,
      rejectedBy: kitchenStaff,
      rejectedAt: nowIso,
    };

    const activeItems = target.items.filter((it) => it.status !== 'rejected');
    const newSubtotal = activeItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const discountedSub = Math.max(0, newSubtotal - (target.discount || 0));
    const newTax = target.isTaxExempt ? 0 : Math.round(discountedSub * (target.taxRate || 0));
    const newTotal = Math.max(0, discountedSub + newTax + (target.deliveryFee || 0) + (target.donation || 0));
    const newStatus: OrderStatus = activeItems.length === 0 ? 'rejected' : target.status;

    const adjustment: OrderAdjustment = {
      id: createId('adj'),
      orderId: target.id,
      type: 'void_item',
      originalAmount: target.total,
      newAmount: newTotal,
      difference: newTotal - target.total,
      reason: `Kitchen rejected ${rejectedItem.quantity}x ${rejectedItem.name}: ${reason}`,
      requestedBy: kitchenStaff,
      approvedBy: 'Kitchen Exception Log',
      status: 'approved',
      timestamp: nowIso,
    };

    target.subtotal = newSubtotal;
    target.tax = newTax;
    target.total = newTotal;
    target.status = newStatus;
    target.adjustments = [...(target.adjustments || []), adjustment];
    target.statusHistory = [
      ...(target.statusHistory || []),
      {
        status: newStatus,
        actor: kitchenStaff,
        note: `Rejected ${rejectedItem.name}: ${reason}`,
        timestamp: nowIso,
      },
    ];
    target.updatedAt = nowIso;

    store.notifications.unshift({
      id: createId('notif'),
      title: `Kitchen Rejected Item (${target.orderNumber})`,
      message: `${kitchenStaff} rejected ${rejectedItem.quantity}x ${rejectedItem.name} (${formatTzs(
        deductionAmount
      )}). Reason: ${reason}`,
      type: 'kitchen',
      timestamp: nowIso,
      read: false,
      actionRole: 'manager',
      actionLabel: 'Inspect Audit Log',
    });

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor: kitchenStaff,
      actorRole: 'kitchen',
      action: 'KITCHEN_ITEM_REJECTED',
      details: `Marked ${rejectedItem.quantity}x ${rejectedItem.name} as REJECTED (-${formatTzs(
        deductionAmount
      )}). Reason: ${reason}`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return target;
  },

  processPayment(
    branchId: string,
    orderId: string,
    method: Exclude<PaymentMethod, 'split'>,
    amount: number,
    options?: {
      completeService?: boolean;
      collectedBy?: string;
      transactionRef?: string;
      isRefund?: boolean;
      actorRole?: Role;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const targetOrder = store.orders.find((o) => o.id === orderId);
    if (!targetOrder) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');

    const nowIso = new Date().toISOString();
    const delta = options?.isRefund ? -Math.abs(amount) : Math.abs(amount);
    const willBeFullyPaid = (targetOrder.paidAmount || 0) + delta >= targetOrder.total;
    const collector = options?.collectedBy || 'Cashier / POS';

    const tx: PaymentTransaction = {
      id: createId('pay'),
      orderId,
      method,
      amount: Math.abs(amount),
      receivedBy: collector,
      transactionRef: options?.transactionRef,
      timestamp: nowIso,
      isRefund: options?.isRefund,
    };

    const shouldDeductOnPayNow =
      !options?.isRefund &&
      !targetOrder.stockDeducted &&
      willBeFullyPaid &&
      (store.bomDeductionPolicy === 'on_payment' ||
        (Boolean(options?.completeService) && store.bomDeductionPolicy === 'on_kitchen_start'));

    if (shouldDeductOnPayNow) {
      applyOrderStockDeduction(
        store,
        targetOrder.items,
        targetOrder.orderNumber,
        store.bomDeductionPolicy === 'on_payment' ? 'On Payment' : 'Service Completion'
      );
    }

    const newPaidAmount = Math.max(0, (targetOrder.paidAmount || 0) + delta);
    const isFullyPaid = newPaidAmount >= targetOrder.total && targetOrder.total > 0;
    const updatedPayments = [...(targetOrder.payments || []), tx];
    const distinctMethods = Array.from(new Set(updatedPayments.filter((p) => !p.isRefund).map((p) => p.method)));
    const resolvedMethod: PaymentMethod = distinctMethods.length > 1 ? 'split' : method;

    const netSales = Math.max(0, targetOrder.subtotal - (targetOrder.discount || 0));
    const mode = targetOrder.commissionMode ?? store.defaultCommissionMode;
    const val = targetOrder.commissionValue ?? store.defaultCommissionValue;
    const computedComm =
      targetOrder.commissionAmount !== undefined
        ? targetOrder.commissionAmount
        : mode === 'percent'
        ? Math.round(netSales * (Math.max(0, Math.min(100, val)) / 100))
        : Math.max(0, Math.round(val));

    const nextStatus: OrderStatus =
      isFullyPaid && options?.completeService
        ? 'completed'
        : isFullyPaid && targetOrder.status === 'ready'
        ? 'served'
        : targetOrder.status;

    targetOrder.paymentStatus =
      options?.isRefund && newPaidAmount === 0
        ? 'refunded'
        : isFullyPaid
        ? 'paid'
        : newPaidAmount > 0
        ? 'partial'
        : 'unpaid';
    targetOrder.paymentMethod = resolvedMethod;
    targetOrder.paidAmount = newPaidAmount;
    targetOrder.payments = updatedPayments;
    targetOrder.status = nextStatus;
    if (isFullyPaid && options?.completeService) {
      targetOrder.items = targetOrder.items.map((it) =>
        it.status !== 'rejected' ? { ...it, status: 'served' as const } : it
      );
    }
    targetOrder.stockDeducted = targetOrder.stockDeducted || shouldDeductOnPayNow;
    if (shouldDeductOnPayNow && !targetOrder.stockDeductionStage) {
      targetOrder.stockDeductionStage =
        store.bomDeductionPolicy === 'on_payment' ? 'On Payment' : 'Service Completion';
    }
    targetOrder.commissionMode = mode;
    targetOrder.commissionValue = val;
    targetOrder.commissionAmount = computedComm;
    targetOrder.commissionConfiguredBy =
      targetOrder.commissionConfiguredBy ||
      (mode === 'percent' ? `Auto Rule (${val}% Net)` : `Auto Rule (${formatTzs(val)} Fixed)`);
    targetOrder.updatedAt = nowIso;

    if (options?.completeService && willBeFullyPaid && targetOrder.tableNumber) {
      store.tables.forEach((t) => {
        if (t.number.toLowerCase() === targetOrder.tableNumber?.toLowerCase()) {
          t.status = 'available';
          t.currentOrderId = undefined;
          t.assignedWaiterId = undefined;
        }
      });
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      actor: collector,
      actorRole: options?.actorRole || 'cashier',
      action: options?.isRefund ? 'REFUND_RECORDED' : 'PAYMENT_COLLECTED',
      details: `${options?.isRefund ? 'Refunded' : 'Collected'} ${formatTzs(Math.abs(amount))} via ${method.toUpperCase()}${
        options?.transactionRef ? ` (Ref: ${options.transactionRef})` : ''
      }`,
      timestamp: nowIso,
    });

    if (options?.collectedBy) {
      store.notifications.unshift({
        id: createId('notif'),
        title: `Payment Collected (${targetOrder.orderNumber})`,
        message: `${options.collectedBy} collected ${formatTzs(amount)} via ${method.toUpperCase()} for Coupon ${
          targetOrder.serviceCouponCode || targetOrder.orderNumber
        }${options.completeService && willBeFullyPaid ? ' & completed service' : ''}.`,
        type: 'order',
        timestamp: nowIso,
        read: false,
        actionRole: 'cashier',
        actionLabel: 'View Shift',
      });
    }

    const signedAmt = options?.isRefund ? -Math.abs(amount) : Math.abs(amount);
    if (method === 'cash') {
      store.cashierShift.cashSales += signedAmt;
      store.cashierShift.expectedCash += signedAmt;
    } else if (method === 'mpesa' || method === 'airtel') {
      store.cashierShift.mpesaSales += signedAmt;
    } else if (method === 'card') {
      store.cashierShift.cardSales += signedAmt;
    }

    storeRepo.commit();
    return { order: targetOrder, cashierShift: store.cashierShift, transaction: tx };
  },

  updateOrderCommission(
    branchId: string,
    orderId: string,
    mode: CommissionMode,
    value: number,
    configuredBy = 'Manager',
    waiterId?: string
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ord = store.orders.find((o) => o.id === orderId);
    if (!ord) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');

    const cleanValue =
      mode === 'percent'
        ? Math.max(0, Math.min(100, Number(value) || 0))
        : Math.max(0, Math.round(Number(value) || 0));
    const netSales = Math.max(0, ord.subtotal - (ord.discount || 0));
    const amount = mode === 'percent' ? Math.round(netSales * (cleanValue / 100)) : cleanValue;

    if (waiterId !== undefined) ord.servingWaiterId = waiterId || undefined;
    ord.commissionMode = mode;
    ord.commissionValue = cleanValue;
    ord.commissionAmount = amount;
    ord.commissionConfiguredBy = configuredBy;
    ord.commissionUpdatedAt = new Date().toISOString();
    ord.updatedAt = new Date().toISOString();

    storeRepo.commit();
    return ord;
  },

  assignOrderWaiter(branchId: string, orderId: string, waiterId: string, actorRole: Role = 'reception') {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ord = store.orders.find((o) => o.id === orderId);
    if (!ord) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');
    const waiter = store.waiters.find((w) => w.id === waiterId);

    ord.servingWaiterId = waiterId || undefined;
    ord.updatedAt = new Date().toISOString();
    if (waiter) {
      store.auditLogs.unshift({
        id: createId('aud'),
        orderId,
        actor: 'Reception Desk',
        actorRole,
        action: 'WAITER_ASSIGNED',
        details: `Assigned waiter ${waiter.name} to order`,
        timestamp: new Date().toISOString(),
      });
    }
    storeRepo.commit();
    return ord;
  },

  cancelOrderControlled(
    branchId: string,
    orderId: string,
    reason: string,
    actor: string,
    approvedBy = 'Branch Manager',
    actorRole: Role = 'manager'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.orders.find((o) => o.id === orderId);
    if (!target) throw new HttpError(404, `Order "${orderId}" not found.`, 'ORDER_NOT_FOUND');
    if (target.status === 'cancelled') return target;

    const nowIso = new Date().toISOString();
    if (target.stockDeducted && !target.reversedStock) {
      const recoverableBatchItems = target.items.filter((it) => {
        if (it.status === 'rejected' || it.status === 'served') return false;
        const r = store.recipes.find((rec) => rec.menuItemId === it.menuItemId);
        return r?.cookingMethod === 'batch_cooking';
      });
      if (recoverableBatchItems.length > 0) {
        store.preparedDishStocks = store.preparedDishStocks.map((p) => {
          const matchQty = recoverableBatchItems
            .filter((bi) => bi.menuItemId === p.menuItemId)
            .reduce((s, bi) => s + bi.quantity, 0);
          if (matchQty <= 0) return p;
          return {
            ...p,
            preparedPlatesAvailable: p.preparedPlatesAvailable + matchQty,
            totalSoldToday: Math.max(0, p.totalSoldToday - matchQty),
            status: 'ready',
          };
        });
      }
    }

    const adj: OrderAdjustment = {
      id: createId('adj'),
      orderId: target.id,
      type: 'cancellation',
      originalAmount: target.total,
      newAmount: 0,
      difference: -target.total,
      reason,
      requestedBy: actor,
      approvedBy,
      status: 'approved',
      timestamp: nowIso,
    };

    target.status = 'cancelled';
    target.reversedStock = target.stockDeducted ? true : target.reversedStock;
    target.adjustments = [...(target.adjustments || []), adj];
    target.cancellationRecord = {
      cancelledBy: actor,
      approvedBy,
      reason,
      timestamp: nowIso,
    };
    target.statusHistory = [
      ...(target.statusHistory || []),
      {
        status: 'cancelled',
        actor,
        note: `Cancelled (${reason}) · Approved by ${approvedBy}${
          !target.stockDeducted ? ' · No stock deducted yet' : ''
        }`,
        timestamp: nowIso,
      },
    ];
    target.updatedAt = nowIso;

    if (target.tableNumber) {
      store.tables.forEach((t) => {
        if (t.number.toLowerCase() === target.tableNumber?.toLowerCase()) {
          t.status = 'available';
          t.currentOrderId = undefined;
          t.assignedWaiterId = undefined;
        }
      });
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: target.id,
      orderNumber: target.orderNumber,
      actor,
      actorRole,
      action: 'ORDER_CANCELLED_CONTROLLED',
      details: `Order ${target.orderNumber} (${formatTzs(target.total)}) marked cancelled (record retained). Reason: ${reason}. Approved by: ${approvedBy}.`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return target;
  },

  promoteCustomItemToMenu(
    branchId: string,
    orderId: string,
    itemIndex: number,
    category = 'Special',
    promotedMenuItemId?: string
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ord = store.orders.find((o) => o.id === orderId);
    const item = ord?.items[itemIndex];
    if (!ord || !item) throw new HttpError(404, 'Order or item not found.', 'ITEM_NOT_FOUND');

    const newMenuItem: MenuItem = {
      id: promotedMenuItemId || createId('menu-promoted'),
      name: item.name,
      category,
      description: item.customInstructions || 'Promoted from waiter special customer order.',
      price: item.price,
      image: '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
      preparationTimeMinutes: 15,
      isAvailable: true,
      station: item.station,
      tags: ['Manager Promoted', 'Chef Special'],
    };

    store.menuItems.unshift(newMenuItem);
    ord.items[itemIndex] = { ...item, promotedToMenuId: newMenuItem.id };

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: ord.id,
      orderNumber: ord.orderNumber,
      actor: 'Manager / Owner',
      actorRole: 'manager',
      action: 'CUSTOM_ITEM_PROMOTED_TO_MENU',
      details: `Added custom order item "${item.name}" (${formatTzs(item.price)}) from ${ord.orderNumber} into permanent ${category} menu.`,
      timestamp: new Date().toISOString(),
    });

    storeRepo.commit();
    return newMenuItem;
  },

  requestApproval(
    branchId: string,
    params: {
      id?: string;
      orderId: string;
      actionType: ApprovalRequest['actionType'];
      requestedBy: string;
      requestedRole: Role;
      details: string;
      amountImpact: number;
      reason: string;
      payload?: ApprovalRequest['payload'];
    }
  ): ApprovalRequest {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const ord = store.orders.find((o) => o.id === params.orderId);
    const nowIso = new Date().toISOString();
    const newReq: ApprovalRequest = {
      id: params.id || createId('apr'),
      orderId: params.orderId,
      orderNumber: ord?.orderNumber || '#F0000',
      actionType: params.actionType,
      requestedBy: params.requestedBy,
      requestedRole: params.requestedRole,
      details: params.details,
      amountImpact: params.amountImpact,
      reason: params.reason,
      status: 'pending',
      createdAt: nowIso,
      payload: params.payload,
    };
    store.approvalRequests.unshift(newReq);

    store.notifications.unshift({
      id: createId('notif'),
      title: `Approval Required: ${params.actionType.replace('_', ' ').toUpperCase()}`,
      message: `${params.requestedBy} requested ${params.details} on ${newReq.orderNumber}. Reason: ${params.reason}`,
      type: 'order',
      timestamp: nowIso,
      read: false,
      actionRole: 'manager',
      actionLabel: 'Review Approvals',
    });

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: params.orderId,
      orderNumber: newReq.orderNumber,
      actor: params.requestedBy,
      actorRole: params.requestedRole,
      action: 'APPROVAL_REQUESTED',
      details: `${params.actionType.toUpperCase()} (${formatTzs(params.amountImpact)}): ${params.details} · Reason: ${
        params.reason
      }`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return newReq;
  },

  reviewApprovalRequest(
    branchId: string,
    requestId: string,
    approve: boolean,
    managerName = 'Branch Manager'
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const req = store.approvalRequests.find((r) => r.id === requestId);
    if (!req) throw new HttpError(404, `Approval request "${requestId}" not found.`, 'APPROVAL_NOT_FOUND');
    if (req.status !== 'pending') return req;

    const nowIso = new Date().toISOString();
    req.status = approve ? 'approved' : 'rejected';
    req.reviewedBy = managerName;
    req.reviewedAt = nowIso;

    if (approve) {
      if (req.actionType === 'cancel_order') {
        this.cancelOrderControlled(branchId, req.orderId, req.reason, req.requestedBy, managerName);
      } else if (req.actionType === 'discount') {
        const ord = store.orders.find((o) => o.id === req.orderId);
        if (ord) {
          const discType = req.payload?.discountType || 'fixed';
          const discVal = req.payload?.discountValue ?? req.amountImpact;
          const discountAmount =
            discType === 'percent'
              ? Math.round(ord.subtotal * (Math.min(100, Math.max(0, discVal)) / 100))
              : Math.min(ord.subtotal, Math.max(0, Math.round(discVal)));
          const discountedSub = Math.max(0, ord.subtotal - discountAmount);
          const newTax = ord.isTaxExempt ? 0 : Math.round(discountedSub * (ord.taxRate || 0));
          const newTotal = Math.max(0, discountedSub + newTax + (ord.deliveryFee || 0) + (ord.donation || 0));
          const adj: OrderAdjustment = {
            id: createId('adj'),
            orderId: ord.id,
            type: 'discount',
            originalAmount: ord.total,
            newAmount: newTotal,
            difference: newTotal - ord.total,
            reason: req.reason,
            requestedBy: req.requestedBy,
            approvedBy: managerName,
            status: 'approved',
            timestamp: nowIso,
          };
          ord.discount = discountAmount;
          ord.discountType = discType;
          ord.discountValue = discVal;
          ord.discountReason = req.reason;
          ord.tax = newTax;
          ord.total = newTotal;
          ord.adjustments = [...(ord.adjustments || []), adj];
          ord.updatedAt = nowIso;
        }
      }
    }

    store.auditLogs.unshift({
      id: createId('aud'),
      orderId: req.orderId,
      orderNumber: req.orderNumber,
      actor: managerName,
      actorRole: 'manager',
      action: approve ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
      details: `${approve ? 'Approved' : 'Rejected'} ${req.actionType} request by ${req.requestedBy} for ${
        req.orderNumber
      } (${req.details}).`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return req;
  },

  listDiscrepancies(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    return computeDiscrepanciesPure(store.orders, store.approvalRequests);
  },

  updateCart(branchId: string, cart: BranchCartItem[]) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.cart = sanitizeCartItems(cart, store.menuItems);
    storeRepo.commit();
    return store.cart;
  },

  updateBranchSettings(
    branchId: string,
    patch: {
      taxEnabled?: boolean;
      taxRatePct?: number;
      defaultCommissionMode?: CommissionMode;
      defaultCommissionValue?: number;
      bomDeductionPolicy?: BomDeductionPolicy;
    }
  ) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    if (patch.taxEnabled !== undefined) store.taxEnabled = patch.taxEnabled;
    if (patch.taxRatePct !== undefined) store.taxRatePct = patch.taxRatePct;
    if (patch.bomDeductionPolicy !== undefined) store.bomDeductionPolicy = patch.bomDeductionPolicy;
    if (patch.defaultCommissionMode !== undefined && patch.defaultCommissionValue !== undefined) {
      const cleanVal =
        patch.defaultCommissionMode === 'percent'
          ? Math.max(0, Math.min(100, Number(patch.defaultCommissionValue) || 0))
          : Math.max(0, Math.round(Number(patch.defaultCommissionValue) || 0));
      store.defaultCommissionMode = patch.defaultCommissionMode;
      store.defaultCommissionValue = cleanVal;
      if (patch.defaultCommissionMode === 'percent') {
        store.waiters.forEach((w) => {
          w.commissionRate = cleanVal / 100;
        });
      }
    }
    storeRepo.commit();
    return {
      taxEnabled: store.taxEnabled,
      taxRatePct: store.taxRatePct,
      defaultCommissionMode: store.defaultCommissionMode,
      defaultCommissionValue: store.defaultCommissionValue,
      bomDeductionPolicy: store.bomDeductionPolicy,
    };
  },

  listTables(branchId: string) {
    return storeRepo.getBranchStoreOrThrow(branchId).tables;
  },

  addTable(branchId: string, data: Omit<Table, 'id'> & { id?: string }): Table {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const newTable: Table = { ...data, id: data.id || createId('tbl') };
    store.tables.push(newTable);
    storeRepo.commit();
    return newTable;
  },

  updateTable(branchId: string, tableId: string, updates: Partial<Table>) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const idx = store.tables.findIndex((t) => t.id === tableId);
    if (idx === -1) throw new HttpError(404, `Table "${tableId}" not found.`, 'TABLE_NOT_FOUND');
    store.tables[idx] = { ...store.tables[idx], ...updates, id: tableId };
    storeRepo.commit();
    return store.tables[idx];
  },

  deleteTable(branchId: string, tableId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.tables = store.tables.filter((t) => t.id !== tableId);
    storeRepo.commit();
    return { deleted: true };
  },

  releaseTable(branchId: string, tableId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const tbl = store.tables.find((t) => t.id === tableId);
    if (!tbl) throw new HttpError(404, `Table "${tableId}" not found.`, 'TABLE_NOT_FOUND');
    tbl.status = 'available';
    tbl.currentOrderId = undefined;
    storeRepo.commit();
    return tbl;
  },

  addNotification(branchId: string, notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const entry: AppNotification = {
      ...notif,
      id: createId('notif'),
      timestamp: new Date().toISOString(),
      read: false,
    };
    store.notifications.unshift(entry);
    storeRepo.commit();
    return entry;
  },

  markNotificationRead(branchId: string, notificationId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.notifications.find((n) => n.id === notificationId);
    if (target) target.read = true;
    storeRepo.commit();
    return target;
  },

  markAllNotificationsRead(branchId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.notifications.forEach((n) => {
      n.read = true;
    });
    storeRepo.commit();
    return { ok: true };
  },

  clearNotification(branchId: string, notificationId: string) {
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    store.notifications = store.notifications.filter((n) => n.id !== notificationId);
    storeRepo.commit();
    return { ok: true };
  },
};
