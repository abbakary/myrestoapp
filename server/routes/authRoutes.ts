import { Router } from 'express';
import {
  asRecord,
  asyncHandler,
  optionalNumber,
  optionalString,
  requireEnum,
  requireString,
} from '../core/http.ts';
import { platformService } from '../services/platformService.ts';

export const authRoutes = Router();

authRoutes.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const email = requireString(body, 'email');
    const password = requireString(body, 'password');
    const result = platformService.loginWithCredentials(email, password);
    res.json(result);
  })
);

authRoutes.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const result = platformService.registerTenantAccount({
      orgId: optionalString(body, 'orgId'),
      branchId: optionalString(body, 'branchId'),
      accountId: optionalString(body, 'accountId'),
      orgName: requireString(body, 'orgName'),
      ownerName: requireString(body, 'ownerName'),
      ownerEmail: requireString(body, 'ownerEmail'),
      password: requireString(body, 'password', 4),
      plan: optionalString(body, 'plan') || 'Growth',
      operatingModel: requireEnum(body, 'operatingModel', [
        'dine_in_restaurant',
        'fast_food_chips',
        'cafe_bistro',
      ]),
      branchName: requireString(body, 'branchName'),
      branchCode: requireString(body, 'branchCode'),
      phone: optionalString(body, 'phone') || '',
      address: optionalString(body, 'address') || '',
    });
    res.status(201).json({ success: true, ...result });
  })
);

authRoutes.post(
  '/auth/quick-launch',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const preset = requireEnum(body, 'preset', [
      'provider',
      'savanna_hq',
      'kona_hq',
      'cashier_pos',
    ]);
    res.json(platformService.quickLaunchWorkspace(preset));
  })
);

authRoutes.post(
  '/auth/logout',
  asyncHandler(async (_req, res) => {
    res.json({ success: true });
  })
);

authRoutes.get(
  '/public/plans',
  asyncHandler(async (_req, res) => {
    res.json(platformService.getPublicPlans());
  })
);

authRoutes.post(
  '/public/leads',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const lead = platformService.submitLeadInquiry({
      id: optionalString(body, 'id'),
      companyName: requireString(body, 'companyName'),
      contactName: requireString(body, 'contactName'),
      email: requireString(body, 'email'),
      phone: optionalString(body, 'phone') || '',
      branchesCount: optionalNumber(body, 'branchesCount', { min: 1 }) || 1,
      planInterest: optionalString(body, 'planInterest') || 'Growth',
      notes: optionalString(body, 'notes') || '',
    });
    res.status(201).json(lead);
  })
);
