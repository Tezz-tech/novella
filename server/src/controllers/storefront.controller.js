import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPublicSettings, listDeliveryZones } from '../services/storefront.service.js';

export const getSettings = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await getPublicSettings() });
});

export const getDeliveryZones = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await listDeliveryZones() });
});
