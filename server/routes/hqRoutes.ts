import { Router } from 'express';
import {
  asRecord,
  asyncHandler,
  optionalBoolean,
  optionalEnum,
  optionalString,
  requireEnum,
  requireNumber,
  requireString,
} from '../core/http.ts';
import { branchService } from '../services/branchService.ts';

// Helper inline since http.ts uses optionalBoolean
function parseApproveFlag(body: Record<string, unknown>): boolean {
  const val = body.approve;
  if (typeof val === 'boolean') return val;
  return Boolean(val);
}

export const hqRoutes = Router();

hqRoutes.get(
  '/orgs/:orgId/branches',
  asyncHandler(async (req, res) => {
    res.json(branchService.listOrgBranches(String(req.params.orgId)));
  })
);

hqRoutes.post(
  '/orgs/:orgId/branches',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const branch = branchService.createBranch(String(req.params.orgId), {
      id: optionalString(body, 'id'),
      name: requireString(body, 'name'),
      branchCode: requireString(body, 'branchCode'),
      operatingModel: requireEnum(body, 'operatingModel', [
        'dine_in_restaurant',
        'fast_food_chips',
        'cafe_bistro',
      ]),
      phone: optionalString(body, 'phone'),
      email: optionalString(body, 'email'),
      managerName: optionalString(body, 'managerName'),
      address: optionalString(body, 'address'),
      cloneCatalogFromCurrent: optionalBoolean(body, 'cloneCatalogFromCurrent'),
      sourceBranchId: optionalString(body, 'sourceBranchId'),
    });
    res.status(201).json(branch);
  })
);

hqRoutes.post(
  '/orgs/:orgId/branches/:branchId/toggle-status',
  asyncHandler(async (req, res) => {
    res.json(branchService.toggleBranchStatus(String(req.params.orgId), String(req.params.branchId)));
  })
);

hqRoutes.get(
  '/orgs/:orgId/hq/overview',
  asyncHandler(async (req, res) => {
    res.json(branchService.getHqOverview(String(req.params.orgId)));
  })
);

hqRoutes.post(
  '/orgs/:orgId/hq/approvals/:branchId/:requestId/review',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      branchService.hqReviewApproval(
        String(req.params.orgId),
        String(req.params.branchId),
        String(req.params.requestId),
        parseApproveFlag(body),
        optionalString(body, 'managerName')
      )
    );
  })
);

hqRoutes.post(
  '/orgs/:orgId/hq/transfers',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      branchService.hqDispatchBranchTransfer(String(req.params.orgId), {
        fromBranchId: requireString(body, 'fromBranchId'),
        toBranchId: requireString(body, 'toBranchId'),
        ingredientId: requireString(body, 'ingredientId'),
        quantityUnits: requireNumber(body, 'quantityUnits', { min: 0.01 }),
        actor: optionalString(body, 'actor'),
      })
    );
  })
);

hqRoutes.patch(
  '/orgs/:orgId/hq/purchase-requests/:branchId/:requestId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', ['pending', 'approved', 'ordered', 'received']);
    res.json(
      branchService.hqUpdatePurchaseRequestStatus(
        String(req.params.orgId),
        String(req.params.branchId),
        String(req.params.requestId),
        status
      )
    );
  })
);

hqRoutes.get(
  '/orgs/:orgId/emails',
  asyncHandler(async (req, res) => {
    const branchId = typeof req.query.branchId === 'string' ? req.query.branchId : undefined;
    res.json(branchService.listEmails(String(req.params.orgId), branchId));
  })
);

hqRoutes.post(
  '/orgs/:orgId/emails',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const mail = branchService.sendEmail(String(req.params.orgId), {
      id: optionalString(body, 'id'),
      senderBranchId: optionalString(body, 'senderBranchId'),
      fromName: optionalString(body, 'fromName'),
      fromEmail: optionalString(body, 'fromEmail'),
      to: Array.isArray(body.to) ? (body.to as string[]) : [],
      cc: Array.isArray(body.cc) ? (body.cc as string[]) : undefined,
      subject: requireString(body, 'subject'),
      body: requireString(body, 'body'),
      category: optionalEnum(body, 'category', [
        'hq_directive',
        'supplier',
        'customer',
        'catering',
        'branch_ops',
        'payroll',
      ]),
      priority: optionalEnum(body, 'priority', ['normal', 'urgent']),
      broadcastAllBranches: optionalBoolean(body, 'broadcastAllBranches'),
      relatedRef: optionalString(body, 'relatedRef'),
      isHq: optionalBoolean(body, 'isHq'),
    });
    res.status(201).json(mail);
  })
);

hqRoutes.patch(
  '/orgs/:orgId/emails/:branchId/:emailId/read',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const read = optionalBoolean(body, 'read') ?? true;
    res.json(
      branchService.markEmailRead(
        String(req.params.orgId),
        String(req.params.branchId),
        String(req.params.emailId),
        read
      )
    );
  })
);

hqRoutes.post(
  '/orgs/:orgId/emails/:branchId/:emailId/star',
  asyncHandler(async (req, res) => {
    res.json(
      branchService.toggleEmailStar(
        String(req.params.orgId),
        String(req.params.branchId),
        String(req.params.emailId)
      )
    );
  })
);

hqRoutes.delete(
  '/orgs/:orgId/emails/:branchId/:emailId',
  asyncHandler(async (req, res) => {
    res.json(
      branchService.deleteEmail(
        String(req.params.orgId),
        String(req.params.branchId),
        String(req.params.emailId)
      )
    );
  })
);
