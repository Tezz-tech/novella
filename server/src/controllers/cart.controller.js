import { asyncHandler } from '../middleware/asyncHandler.js';
import { quoteCart } from '../services/pricing.service.js';

/** POST /api/cart/quote: server-priced cart. Amounts in the body are never read. */
export const postCartQuote = asyncHandler(async (req, res) => {
  const data = await quoteCart(req.body);
  res.json({ success: true, data });
});
