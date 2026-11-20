import { createStarterBranchStore } from '../../src/data/saasSeeds.ts';
import type {
  EmailMessage,
  PurchaseRequest,
  RestaurantTenant,
} from '../../src/types/restaurant.ts';
import { computeBranchMetricsSummaryPure } from '../../src/shared/analyticsEngine.ts';
import { createId, slugify, todayDateStr } from '../../src/shared/helpers.ts';
import { HttpError } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

export const branchService = {
  listOrgBranches(orgId: string) {
    storeRepo.getOrgOrThrow(orgId);
    return storeRepo.getState().allBranches.filter((b) => b.organizationId === orgId);
  },

  createBranch(
    orgId: string,
    params: {
      id?: string;
      name: string;
      branchCode: string;
      operatingModel: RestaurantTenant['operatingModel'];
      phone?: string;
      email?: string;
      managerName?: string;
      address?: string;
      cloneCatalogFromCurrent?: boolean;
      sourceBranchId?: string;
    }
  ): RestaurantTenant {
    const state = storeRepo.getState();
    const org = storeRepo.getOrgOrThrow(orgId);
    const orgBranches = state.allBranches.filter((b) => b.organizationId === orgId);

    if (orgBranches.length >= org.maxBranches) {
      throw new HttpError(
        403,
        `Branch quota reached (${orgBranches.length}/${org.maxBranches}) for ${org.plan} plan.`,
        'BRANCH_QUOTA_EXCEEDED'
      );
    }

    const cleanCode = params.branchCode.trim().toUpperCase() || `BR-${orgBranches.length + 1}`;
    const slug = slugify(params.name, cleanCode.toLowerCase());
    const branchId = params.id || `branch-${org.slug}-${Date.now()}`;
    const branchEmail = params.email?.trim() || `${cleanCode.toLowerCase()}@${org.domain}`;
    const refBranch =
      (params.sourceBranchId && orgBranches.find((b) => b.id === params.sourceBranchId)) ||
      orgBranches.find((b) => b.isHqBranch) ||
      orgBranches[0];

    const newBranch: RestaurantTenant = {
      id: branchId,
      organizationId: org.id,
      branchCode: cleanCode,
      isHqBranch: false,
      status: 'active',
      name: params.name.trim(),
      slug,
      tagline: `${org.name} · ${params.name.trim()}`,
      operatingModel: params.operatingModel,
      phone: params.phone?.trim() || '+255 700 000 000',
      email: branchEmail,
      managerName: params.managerName?.trim() || 'Branch Manager',
      managerEmail: branchEmail,
      address: params.address?.trim() || 'Dar es Salaam, Tanzania',
      operatingHours: '09:00 AM – 11:00 PM (Daily)',
      logo: org.logo,
      bannerImage: refBranch?.bannerImage || '/src/assets/images/hero_restaurant_dining_1794223268333.jpg',
      currency: org.currency,
      currencyRate: org.currencyRate,
      taxRate: 0.18,
      deliveryFee: 4000,
    };

    const sourceStore =
      params.cloneCatalogFromCurrent !== false && refBranch
        ? state.branchStores[refBranch.id]
        : undefined;
    const starterStore = createStarterBranchStore(newBranch, org, sourceStore);

    state.allBranches.push(newBranch);
    state.branchStores[branchId] = starterStore;
    storeRepo.commit();
    return newBranch;
  },

  toggleBranchStatus(orgId: string, branchId: string) {
    const branch = storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    branch.status = branch.status === 'active' ? 'maintenance' : 'active';
    storeRepo.commit();
    return branch;
  },

  getHqOverview(orgId: string) {
    const org = storeRepo.getOrgOrThrow(orgId);
    const state = storeRepo.getState();
    const orgBranches = state.allBranches.filter((b) => b.organizationId === orgId);

    const branchMetricsSummaries = orgBranches.map((b) =>
      computeBranchMetricsSummaryPure(b, state.branchStores[b.id])
    );
    const hqAllOrders = orgBranches
      .flatMap((b) =>
        (state.branchStores[b.id]?.orders || []).map((o) => ({
          ...o,
          branchId: b.id,
          branchName: b.name,
        }))
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const hqAllApprovals = orgBranches.flatMap((b) =>
      (state.branchStores[b.id]?.approvalRequests || []).map((a) => ({
        ...a,
        branchId: b.id,
        branchName: b.name,
      }))
    );
    const hqAllPurchaseRequests = orgBranches.flatMap((b) =>
      (state.branchStores[b.id]?.purchaseRequests || []).map((p) => ({
        ...p,
        branchId: b.id,
        branchName: b.name,
      }))
    );
    const hqAllBranchTransfers = orgBranches.flatMap((b) =>
      (state.branchStores[b.id]?.branchTransfers || []).map((t) => ({
        ...t,
        branchId: b.id,
        branchName: b.name,
      }))
    );

    return {
      organization: org,
      quota: {
        used: orgBranches.length,
        max: org.maxBranches || 1,
        remaining: Math.max(0, (org.maxBranches || 1) - orgBranches.length),
        isAtLimit: orgBranches.length >= (org.maxBranches || 1),
      },
      branchMetricsSummaries,
      hqAllOrders,
      hqAllApprovals,
      hqAllPurchaseRequests,
      hqAllBranchTransfers,
    };
  },

  hqReviewApproval(
    orgId: string,
    branchId: string,
    requestId: string,
    approve: boolean,
    managerName?: string
  ) {
    const org = storeRepo.getOrgOrThrow(orgId);
    storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const req = store.approvalRequests.find((a) => a.id === requestId);
    if (!req) throw new HttpError(404, `Approval request "${requestId}" not found.`, 'APPROVAL_NOT_FOUND');
    if (req.status !== 'pending') {
      throw new HttpError(409, 'Approval request already reviewed.', 'ALREADY_REVIEWED');
    }

    const reviewer = managerName || `${org.ownerName} (Main HQ)`;
    const nowIso = new Date().toISOString();
    req.status = approve ? 'approved' : 'rejected';
    req.reviewedBy = reviewer;
    req.reviewedAt = nowIso;

    if (approve && req.actionType === 'discount' && req.payload) {
      const ord = store.orders.find((o) => o.id === req.orderId);
      if (ord) {
        const disc =
          req.payload.discountType === 'percent'
            ? Math.round(ord.subtotal * ((req.payload.discountValue || 0) / 100))
            : req.payload.discountValue || 0;
        const discountedSub = Math.max(0, ord.subtotal - disc);
        ord.discount = disc;
        ord.discountType = req.payload.discountType;
        ord.discountValue = req.payload.discountValue;
        ord.discountReason = `${req.reason} (Approved by HQ)`;
        ord.total = Math.max(0, discountedSub + ord.tax + ord.deliveryFee + ord.donation);
        ord.updatedAt = nowIso;
      }
    } else if (approve && req.actionType === 'cancel_order') {
      const ord = store.orders.find((o) => o.id === req.orderId);
      if (ord) {
        ord.status = 'cancelled';
        ord.cancellationRecord = {
          cancelledBy: req.requestedBy,
          approvedBy: reviewer,
          reason: req.reason,
          timestamp: nowIso,
        };
        ord.updatedAt = nowIso;
      }
    }

    store.auditLogs.unshift({
      id: createId('aud-hq'),
      orderId: req.orderId,
      orderNumber: req.orderNumber,
      actor: reviewer,
      actorRole: 'owner',
      action: approve ? 'HQ_APPROVAL_GRANTED' : 'HQ_APPROVAL_REJECTED',
      details: `${approve ? 'Approved' : 'Rejected'} ${req.actionType} on ${req.orderNumber}: ${req.details}`,
      timestamp: nowIso,
    });

    storeRepo.commit();
    return req;
  },

  hqDispatchBranchTransfer(
    orgId: string,
    params: {
      fromBranchId: string;
      toBranchId: string;
      ingredientId: string;
      quantityUnits: number;
      actor?: string;
    }
  ) {
    const org = storeRepo.getOrgOrThrow(orgId);
    const fromBranch = storeRepo.getBranchInOrgOrThrow(orgId, params.fromBranchId);
    const toBranch = storeRepo.getBranchInOrgOrThrow(orgId, params.toBranchId);
    if (fromBranch.id === toBranch.id) {
      throw new HttpError(422, 'Select two distinct branches within your organization.', 'VALIDATION_ERROR');
    }

    const sourceStore = storeRepo.getBranchStoreOrThrow(fromBranch.id);
    const destStore = storeRepo.getBranchStoreOrThrow(toBranch.id);
    const srcIng = sourceStore.ingredients.find((i) => i.id === params.ingredientId);
    if (!srcIng || params.quantityUnits <= 0) {
      throw new HttpError(422, 'Select a valid ingredient and positive quantity.', 'VALIDATION_ERROR');
    }
    if (srcIng.storeStockUnits < params.quantityUnits) {
      throw new HttpError(
        409,
        `${fromBranch.name} only has ${srcIng.storeStockUnits.toLocaleString()} ${srcIng.consumptionUnit} in Main Store.`,
        'INSUFFICIENT_STORE_STOCK'
      );
    }

    const actor = params.actor || `${org.ownerName} (Main HQ)`;
    const transferNum = `HQ-BTR-${Date.now().toString().slice(-4)}`;
    const unitCost = srcIng.conversionRatio > 0 ? srcIng.costPerPurchaseUnit / srcIng.conversionRatio : 0;
    const costImpact = Math.round(params.quantityUnits * unitCost);
    const today = todayDateStr();

    srcIng.storeStockUnits = Math.max(0, srcIng.storeStockUnits - params.quantityUnits);
    srcIng.currentStockUnits = Math.max(0, srcIng.currentStockUnits - params.quantityUnits);
    sourceStore.stockMovements.unshift({
      id: createId('sm-hq-out'),
      ingredientId: srcIng.id,
      ingredientName: srcIng.name,
      type: 'stock_transfer',
      quantityDelta: -params.quantityUnits,
      unit: srcIng.consumptionUnit,
      costImpact,
      date: today,
      reference: transferNum,
      reason: `HQ Inter-Branch Dispatch to ${toBranch.name}`,
      recordedBy: actor,
      sourceLocation: 'main_store',
      transferStatus: 'received',
    });

    const destExisting = destStore.ingredients.find(
      (i) => i.id === srcIng.id || i.name.toLowerCase() === srcIng.name.toLowerCase()
    );
    if (destExisting) {
      destExisting.storeStockUnits += params.quantityUnits;
      destExisting.currentStockUnits += params.quantityUnits;
    } else {
      destStore.ingredients.push({
        ...srcIng,
        storeStockUnits: params.quantityUnits,
        kitchenStockUnits: 0,
        currentStockUnits: params.quantityUnits,
        reservedStockUnits: 0,
      });
    }

    destStore.stockMovements.unshift({
      id: createId('sm-hq-in'),
      ingredientId: srcIng.id,
      ingredientName: srcIng.name,
      type: 'stock_transfer',
      quantityDelta: params.quantityUnits,
      unit: srcIng.consumptionUnit,
      costImpact,
      date: today,
      reference: transferNum,
      reason: `HQ Inter-Branch Transfer received from ${fromBranch.name}`,
      recordedBy: actor,
      destinationLocation: 'main_store',
      transferStatus: 'received',
      receivedAt: new Date().toLocaleTimeString(),
      receivedBy: toBranch.managerName,
    });

    destStore.branchTransfers.unshift({
      id: createId('bt-hq'),
      transferNumber: transferNum,
      fromBranch: fromBranch.name,
      toBranch: toBranch.name,
      ingredientId: srcIng.id,
      ingredientName: srcIng.name,
      quantity: params.quantityUnits,
      unit: srcIng.consumptionUnit,
      status: 'received',
      requestedBy: actor,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });

    destStore.notifications.unshift({
      id: createId('notif-hq-trf'),
      title: `HQ Stock Transfer Received (${transferNum})`,
      message: `Main HQ transferred ${params.quantityUnits.toLocaleString()} ${srcIng.consumptionUnit} of ${srcIng.name} from ${fromBranch.branchCode} to ${toBranch.branchCode}.`,
      type: 'transfer',
      timestamp: new Date().toISOString(),
      read: false,
      actionRole: 'manager',
      actionLabel: 'Inspect Inventory',
    });

    storeRepo.commit();
    return {
      success: true,
      message: `Dispatched ${params.quantityUnits.toLocaleString()} ${srcIng.consumptionUnit} of ${srcIng.name} from ${fromBranch.branchCode} to ${toBranch.branchCode}.`,
    };
  },

  hqUpdatePurchaseRequestStatus(
    orgId: string,
    branchId: string,
    requestId: string,
    nextStatus: PurchaseRequest['status']
  ) {
    storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const req = store.purchaseRequests.find((p) => p.id === requestId);
    if (!req) {
      throw new HttpError(404, `Purchase request "${requestId}" not found.`, 'PURCHASE_REQUEST_NOT_FOUND');
    }
    const prevStatus = req.status;
    req.status = nextStatus;
    if (nextStatus === 'received' && prevStatus !== 'received') {
      const ing = store.ingredients.find((i) => i.id === req.ingredientId);
      if (ing) {
        ing.storeStockUnits += req.requestedQty;
        ing.currentStockUnits += req.requestedQty;
      }
    }
    storeRepo.commit();
    return req;
  },

  listEmails(orgId: string, branchId?: string) {
    storeRepo.getOrgOrThrow(orgId);
    const state = storeRepo.getState();
    const orgBranches = state.allBranches.filter((b) => b.organizationId === orgId);
    const targetBranches = branchId ? orgBranches.filter((b) => b.id === branchId) : orgBranches;
    return targetBranches
      .flatMap((b) => state.branchStores[b.id]?.emails || [])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  sendEmail(
    orgId: string,
    params: {
      id?: string;
      senderBranchId?: string;
      fromName?: string;
      fromEmail?: string;
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      category?: EmailMessage['category'];
      priority?: EmailMessage['priority'];
      broadcastAllBranches?: boolean;
      relatedRef?: string;
      isHq?: boolean;
    }
  ): EmailMessage {
    const org = storeRepo.getOrgOrThrow(orgId);
    const state = storeRepo.getState();
    const orgBranches = state.allBranches.filter((b) => b.organizationId === orgId);
    const senderBranch =
      (params.senderBranchId && orgBranches.find((b) => b.id === params.senderBranchId)) ||
      orgBranches.find((b) => b.isHqBranch) ||
      orgBranches[0];
    if (!senderBranch) {
      throw new HttpError(404, 'Organization has no branches to dispatch mail from.', 'BRANCH_NOT_FOUND');
    }

    const cleanTo = params.broadcastAllBranches
      ? orgBranches.map((b) => b.email)
      : params.to.map((e) => e.trim()).filter(Boolean);
    const nowIso = new Date().toISOString();

    const sentMsg: EmailMessage = {
      id: params.id || createId('mail-sent'),
      organizationId: org.id,
      branchId: senderBranch.id,
      branchName: params.isHq ? `${org.name} Main HQ` : senderBranch.name,
      fromName: params.fromName || org.ownerName,
      fromEmail: params.fromEmail || org.ownerEmail,
      to: cleanTo,
      cc: params.cc,
      subject: params.subject.trim(),
      body: params.body.trim(),
      folder: 'sent',
      category: params.category || (params.isHq ? 'hq_directive' : 'branch_ops'),
      priority: params.priority || 'normal',
      read: true,
      starred: false,
      timestamp: nowIso,
      relatedRef: params.relatedRef,
    };

    const senderStore = storeRepo.getBranchStoreOrThrow(senderBranch.id);
    senderStore.emails.unshift(sentMsg);

    const lowerTargets = new Set(cleanTo.map((t) => t.toLowerCase()));
    orgBranches.forEach((b) => {
      const matchesBranch =
        params.broadcastAllBranches ||
        lowerTargets.has(b.email.toLowerCase()) ||
        lowerTargets.has(b.managerEmail.toLowerCase()) ||
        (b.isHqBranch &&
          (lowerTargets.has(org.hqEmail.toLowerCase()) || lowerTargets.has(org.ownerEmail.toLowerCase())));

      if (matchesBranch && b.id !== senderBranch.id) {
        const bStore = storeRepo.getBranchStoreOrThrow(b.id);
        bStore.emails.unshift({
          ...sentMsg,
          id: `mail-in-${Date.now()}-${b.branchCode}`,
          branchId: b.id,
          branchName: b.name,
          folder: 'inbox',
          read: false,
        });
        bStore.notifications.unshift({
          id: `notif-mail-${Date.now()}-${b.branchCode}`,
          title: `New Email: ${sentMsg.subject}`,
          message: `From ${sentMsg.fromName} (${sentMsg.fromEmail})`,
          type: 'order',
          timestamp: nowIso,
          read: false,
          actionRole: 'owner',
          actionLabel: 'Open Mail',
        });
      }
    });

    storeRepo.commit();
    return sentMsg;
  },

  markEmailRead(orgId: string, branchId: string, emailId: string, read = true) {
    storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.emails.find((e) => e.id === emailId);
    if (!target) throw new HttpError(404, `Email "${emailId}" not found.`, 'EMAIL_NOT_FOUND');
    target.read = read;
    storeRepo.commit();
    return target;
  },

  toggleEmailStar(orgId: string, branchId: string, emailId: string) {
    storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const target = store.emails.find((e) => e.id === emailId);
    if (!target) throw new HttpError(404, `Email "${emailId}" not found.`, 'EMAIL_NOT_FOUND');
    target.starred = !target.starred;
    storeRepo.commit();
    return target;
  },

  deleteEmail(orgId: string, branchId: string, emailId: string) {
    storeRepo.getBranchInOrgOrThrow(orgId, branchId);
    const store = storeRepo.getBranchStoreOrThrow(branchId);
    const before = store.emails.length;
    store.emails = store.emails.filter((e) => e.id !== emailId);
    if (store.emails.length === before) {
      throw new HttpError(404, `Email "${emailId}" not found.`, 'EMAIL_NOT_FOUND');
    }
    storeRepo.commit();
    return { deleted: true };
  },
};
