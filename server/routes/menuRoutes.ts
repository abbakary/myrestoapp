import { Router } from 'express';
import type { MenuItem } from '../../src/types/restaurant.ts';
import {
  asRecord,
  asyncHandler,
  optionalBoolean,
  optionalNumber,
  optionalString,
  requireEnum,
  requireNumber,
  requireString,
} from '../core/http.ts';
import { inventoryService } from '../services/inventoryService.ts';

export const menuRoutes = Router();

menuRoutes.get(
  '/branches/:branchId/menu',
  asyncHandler(async (req, res) => {
    res.json(inventoryService.listMenu(String(req.params.branchId)));
  })
);

menuRoutes.post(
  '/branches/:branchId/menu',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    const created = inventoryService.addMenuItem(String(req.params.branchId), {
      id: optionalString(body, 'id'),
      name: requireString(body, 'name'),
      category: requireString(body, 'category'),
      description: optionalString(body, 'description'),
      price: requireNumber(body, 'price', { min: 0 }),
      image: optionalString(body, 'image') || '/src/assets/images/dish_burger_roastbeef_1794223269419.jpg',
      preparationTimeMinutes: optionalNumber(body, 'preparationTimeMinutes', { min: 1 }) ?? 15,
      isAvailable: optionalBoolean(body, 'isAvailable') ?? true,
      station: requireEnum(body, 'station', [
        'hot_kitchen',
        'grill',
        'drinks',
        'bakery',
        'dessert',
        'pastry',
        'cold_prep',
        'beverage',
      ]),
      portions: Array.isArray(body.portions) ? (body.portions as MenuItem['portions']) : undefined,
      modifiers: Array.isArray(body.modifiers) ? (body.modifiers as MenuItem['modifiers']) : undefined,
      recipeId: optionalString(body, 'recipeId'),
      tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
    });
    res.status(201).json(created);
  })
);

menuRoutes.patch(
  '/branches/:branchId/menu/:itemId',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    res.json(
      inventoryService.updateMenuItem(
        String(req.params.branchId),
        String(req.params.itemId),
        body as Partial<MenuItem>
      )
    );
  })
);

menuRoutes.delete(
  '/branches/:branchId/menu/:itemId',
  asyncHandler(async (req, res) => {
    res.json(inventoryService.deleteMenuItem(String(req.params.branchId), String(req.params.itemId)));
  })
);

menuRoutes.post(
  '/branches/:branchId/menu/:itemId/toggle-availability',
  asyncHandler(async (req, res) => {
    res.json(
      inventoryService.toggleMenuItemAvailability(
        String(req.params.branchId),
        String(req.params.itemId)
      )
    );
  })
);
