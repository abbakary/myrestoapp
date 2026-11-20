import { Router } from 'express';
import {
  asRecord,
  asyncHandler,
  optionalBoolean,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireEnum,
  requireNumber,
  requireString,
} from '../core/http.ts';
import { platformService } from '../services/platformService.ts';

export const providerRoutes = Router();

providerRoutes.get(
  '/provider/overview',
  asyncHandler(async (_req, res) => {
    res.json(platformService.getProviderOverview());
  })
);

providerRoutes.post(
  '/provider/tenants',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const created = platformService.createSaasTenant({
      orgName: requireString(body, 'orgName'),
      ownerName: requireString(body, 'ownerName'),
      ownerEmail: requireString(body, 'ownerEmail'),
      branchName: requireString(body, 'branchName'),
      branchCode: requireString(body, 'branchCode'),
      operatingModel: requireEnum(body, 'operatingModel', [
        'dine_in_restaurant',
        'fast_food_chips',
        'cafe_bistro',
      ]),
      phone: optionalString(body, 'phone') || '',
      address: optionalString(body, 'address') || '',
      plan: optionalString(body, 'plan'),
      status: optionalEnum(body, 'status', ['active', 'trial', 'suspended']),
      password: optionalString(body, 'password'),
      orgId: optionalString(body, 'orgId'),
      branchId: optionalString(body, 'branchId'),
      accountId: optionalString(body, 'accountId'),
    });
    res.status(201).json(created);
  })
);

providerRoutes.patch(
  '/provider/tenants/:orgId/status',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', ['active', 'trial', 'suspended']);
    res.json(platformService.updateTenantStatus(String(req.params.orgId), status));
  })
);

providerRoutes.patch(
  '/provider/tenants/:orgId/plan',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const plan = requireString(body, 'plan');
    res.json(platformService.updateTenantPlan(String(req.params.orgId), plan));
  })
);

providerRoutes.post(
  '/provider/tenants/:orgId/billing-paid',
  asyncHandler(async (req, res) => {
    res.json(platformService.markBillingPaid(String(req.params.orgId)));
  })
);

providerRoutes.post(
  '/provider/tenants/:orgId/inspect',
  asyncHandler(async (req, res) => {
    res.json(platformService.inspectTenant(String(req.params.orgId)));
  })
);

providerRoutes.post(
  '/provider/plans',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const plan = platformService.createPlan({
      name: requireString(body, 'name'),
      tagline: optionalString(body, 'tagline') || '',
      audience: optionalString(body, 'audience') || '',
      monthlyFeeTzs: requireNumber(body, 'monthlyFeeTzs', { min: 0 }),
      annualDiscountPct: optionalNumber(body, 'annualDiscountPct', { min: 0, max: 50 }) ?? 15,
      trialDays: optionalNumber(body, 'trialDays', { min: 0 }) ?? 14,
      maxBranches: requireNumber(body, 'maxBranches', { min: 1 }),
      maxStaffSeats: optionalNumber(body, 'maxStaffSeats', { min: 1 }) ?? 20,
      maxRecipes: optionalNumber(body, 'maxRecipes', { min: 10 }) ?? 100,
      includedModules: Array.isArray(body.includedModules)
        ? (body.includedModules as string[])
        : [],
      summary: optionalString(body, 'summary') || '',
      isFeatured: optionalBoolean(body, 'isFeatured'),
      isPublic: optionalBoolean(body, 'isPublic'),
    });
    res.status(201).json({ success: true, plan });
  })
);

providerRoutes.patch(
  '/provider/plans/:planId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(platformService.updatePlan(String(req.params.planId), body));
  })
);

providerRoutes.post(
  '/provider/plans/:planId/visibility',
  asyncHandler(async (req, res) => {
    res.json(platformService.togglePlanVisibility(String(req.params.planId)));
  })
);

providerRoutes.post(
  '/provider/plans/:planId/status',
  asyncHandler(async (req, res) => {
    res.json(platformService.togglePlanStatus(String(req.params.planId)));
  })
);

providerRoutes.post(
  '/provider/accounts',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const account = platformService.createAccount({
      id: optionalString(body, 'id'),
      name: requireString(body, 'name'),
      email: requireString(body, 'email'),
      password: requireString(body, 'password', 4),
      role: requireEnum(body, 'role', ['provider_admin', 'tenant_owner', 'branch_manager']),
      organizationId: optionalString(body, 'organizationId'),
      branchId: optionalString(body, 'branchId'),
      phone: optionalString(body, 'phone'),
    });
    res.status(201).json({ success: true, account });
  })
);

providerRoutes.patch(
  '/provider/accounts/:accountId/status',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const status = requireEnum(body, 'status', ['active', 'pending', 'suspended']);
    res.json(platformService.updateAccountStatus(String(req.params.accountId), status));
  })
);

providerRoutes.patch(
  '/provider/accounts/:accountId/role',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const role = requireEnum(body, 'role', ['provider_admin', 'tenant_owner', 'branch_manager']);
    res.json(platformService.updateAccountRole(String(req.params.accountId), role));
  })
);

providerRoutes.patch(
  '/provider/accounts/:accountId/password',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const newPassword = requireString(body, 'newPassword', 4);
    res.json(platformService.resetAccountPassword(String(req.params.accountId), newPassword));
  })
);

providerRoutes.post(
  '/provider/leads/:leadId/convert',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body || {});
    res.json(
      platformService.convertLeadToTenant(String(req.params.leadId), {
        orgId: optionalString(body, 'orgId'),
        branchId: optionalString(body, 'branchId'),
        accountId: optionalString(body, 'accountId'),
      })
    );
  })
);
