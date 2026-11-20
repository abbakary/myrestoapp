import { Router } from 'express';
import { asyncHandler } from '../core/http.ts';
import { storeRepo } from '../core/store.ts';

export const systemRoutes = Router();

systemRoutes.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const state = storeRepo.getState();
    res.json({
      status: 'ok',
      service: 'RestaurantOS API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      tenantsCount: state.organizations.length,
      branchesCount: state.allBranches.length,
    });
  })
);

systemRoutes.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    res.json(storeRepo.getState());
  })
);

systemRoutes.post(
  '/reset',
  asyncHandler(async (_req, res) => {
    const state = storeRepo.reset();
    res.json({ reset: true, state });
  })
);
