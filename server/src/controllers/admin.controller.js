import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../utils/httpError.js';
import * as products from '../services/admin.products.service.js';
import * as orders from '../services/admin.orders.service.js';
import * as store from '../services/admin.store.service.js';
import * as cloud from '../services/cloudinary.service.js';
import { logFromRequest } from '../services/activity.service.js';

/** Every handler here sits behind requireAuth + requireRole (see routes/admin.routes.js). */
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const csv = (res, filename, text) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(text);
};

/* Dashboard */
export const getDashboard = asyncHandler(async (req, res) =>
  ok(res, await store.dashboard(req.query.range ?? '7d'))
);

/* Products */
export const listProducts = asyncHandler(async (req, res) =>
  ok(res, await products.listProductsAdmin(req.query))
);
export const getProduct = asyncHandler(async (req, res) =>
  ok(res, await products.getProductAdmin(req.params.id))
);
export const createProduct = asyncHandler(async (req, res) =>
  ok(res, await products.createProduct(req, req.body), 201)
);
export const updateProduct = asyncHandler(async (req, res) =>
  ok(res, await products.updateProduct(req, req.params.id, req.body))
);
export const setProductStatus = asyncHandler(async (req, res) =>
  ok(res, await products.setProductStatus(req, req.params.id, req.body.status))
);
export const patchVariant = asyncHandler(async (req, res) =>
  ok(res, await products.patchVariant(req, req.params.id, req.params.variantId, req.body))
);
export const deleteProduct = asyncHandler(async (req, res) =>
  ok(res, await products.removeProduct(req, req.params.id))
);
export const bulkPrice = asyncHandler(async (req, res) =>
  ok(res, await products.bulkPriceUpdate(req, req.body, { dryRun: req.query.dryRun === true }))
);

/* Uploads */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Choose an image to upload');
  ok(res, await cloud.uploadImage(req.file.buffer), 201);
});
export const deleteImage = asyncHandler(async (req, res) => {
  if (!req.query.publicId) throw new HttpError(400, 'publicId is required');
  await cloud.deleteImage(String(req.query.publicId));
  await logFromRequest(req, { action: 'delete', entity: 'image', entityId: req.query.publicId });
  ok(res, { deleted: true });
});

/* Orders */
export const listOrders = asyncHandler(async (req, res) => {
  const data = await orders.listOrders(req.query);
  if (req.query.format === 'csv') return csv(res, 'orders.csv', data.csv);
  return ok(res, data);
});
export const getOrder = asyncHandler(async (req, res) =>
  ok(res, await orders.getOrderAdmin(req.params.id))
);
export const setOrderStatus = asyncHandler(async (req, res) =>
  ok(res, await orders.changeStatus(req, req.params.id, req.body))
);
export const setOrderNotes = asyncHandler(async (req, res) =>
  ok(res, await orders.addNote(req, req.params.id, req.body.adminNotes))
);
export const setOrderAddress = asyncHandler(async (req, res) =>
  ok(res, await orders.editAddress(req, req.params.id, req.body))
);
export const refundOrder = asyncHandler(async (req, res) =>
  ok(
    res,
    await orders.refundOrder(req, req.params.id, {
      amountNaira: req.body.amount,
      reason: req.body.reason,
      restock: req.body.restock,
    }),
    201
  )
);

/* Payments */
export const listPayments = asyncHandler(async (req, res) =>
  ok(res, await store.listPayments(req.query))
);
export const reverifyPayment = asyncHandler(async (req, res) =>
  ok(res, await store.reverifyPayment(req, req.params.reference))
);

/* Customers */
export const listCustomers = asyncHandler(async (req, res) =>
  ok(res, await store.listCustomers(req.query))
);
export const getCustomer = asyncHandler(async (req, res) =>
  ok(res, await store.getCustomer(req.params.email))
);

/* Delivery zones */
export const listZones = asyncHandler(async (_req, res) => ok(res, await store.listZones()));
export const createZone = asyncHandler(async (req, res) =>
  ok(res, await store.createZone(req, req.body), 201)
);
export const updateZone = asyncHandler(async (req, res) =>
  ok(res, await store.updateZone(req, req.params.id, req.body))
);
export const deleteZone = asyncHandler(async (req, res) =>
  ok(res, await store.deleteZone(req, req.params.id))
);
export const bulkZoneFee = asyncHandler(async (req, res) =>
  ok(res, await store.bulkZoneFee(req, req.body))
);

/* Coupons */
export const listCoupons = asyncHandler(async (_req, res) => ok(res, await store.listCoupons()));
export const createCoupon = asyncHandler(async (req, res) =>
  ok(res, await store.createCoupon(req, req.body), 201)
);
export const updateCoupon = asyncHandler(async (req, res) =>
  ok(res, await store.updateCoupon(req, req.params.id, req.body))
);

/* Settings and marketing */
export const getSettings = asyncHandler(async (_req, res) => ok(res, await store.getSettings()));
export const putSettings = asyncHandler(async (req, res) =>
  ok(res, await store.updateSettings(req, req.body))
);
export const putMarketing = asyncHandler(async (req, res) =>
  ok(res, await store.updateMarketing(req, req.body))
);

/* Staff */
export const listStaff = asyncHandler(async (_req, res) => ok(res, await store.listStaff()));
export const inviteStaff = asyncHandler(async (req, res) =>
  ok(res, await store.inviteStaff(req, req.body), 201)
);
export const updateStaff = asyncHandler(async (req, res) =>
  ok(res, await store.updateStaff(req, req.params.id, req.body))
);

/* Activity and subscribers */
export const listActivity = asyncHandler(async (req, res) =>
  ok(res, await store.listActivity(req.query))
);
export const listSubscribers = asyncHandler(async (req, res) => {
  const data = await store.listSubscribers(req.query);
  if (req.query.format === 'csv') return csv(res, 'subscribers.csv', data.csv);
  return ok(res, data);
});

/* Catalogue setup */
export const listCatalogue = (kind) =>
  asyncHandler(async (_req, res) => ok(res, await store.listCatalogue(kind)));
export const createCatalogue = (kind) =>
  asyncHandler(async (req, res) => ok(res, await store.createCatalogue(req, kind, req.body), 201));
export const updateCatalogue = (kind) =>
  asyncHandler(async (req, res) =>
    ok(res, await store.updateCatalogue(req, kind, req.params.id, req.body))
  );
export const deleteCatalogue = (kind) =>
  asyncHandler(async (req, res) => ok(res, await store.deleteCatalogue(req, kind, req.params.id)));
