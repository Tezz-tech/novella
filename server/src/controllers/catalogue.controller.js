import { asyncHandler } from '../middleware/asyncHandler.js';
import { listProducts, getProductDetail, suggestProducts } from '../services/catalogue.service.js';
import { listCategories, listBrands } from '../services/storefront.service.js';

// Each handler receives already-validated input (see routes), so these stay thin.
export const getProducts = asyncHandler(async (req, res) => {
  const data = await listProducts(req.query);
  res.json({ success: true, data });
});

export const getProduct = asyncHandler(async (req, res) => {
  const data = await getProductDetail(req.params.slug);
  res.json({ success: true, data });
});

export const getSuggestions = asyncHandler(async (req, res) => {
  const data = await suggestProducts(req.query.q);
  res.json({ success: true, data });
});

export const getCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await listCategories() });
});

export const getBrands = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await listBrands() });
});
