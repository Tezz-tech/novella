import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { HttpError } from '../utils/httpError.js';
import * as v from '../validators/admin.validators.js';
import * as c from '../controllers/admin.controller.js';

/**
 * Admin API (docs/03 role matrix):
 *   staff  : view everything, update orders and products, edit stock and prices, catalogue
 *   admin  : + bulk prices, refunds, re-verify, coupons, delivery zones, marketing, activity, subscribers
 *   owner  : + store settings and staff management
 */
const router = Router();

const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    cb(
      ALLOWED_IMAGE.includes(file.mimetype)
        ? null
        : new HttpError(400, 'Use a JPG, PNG or WebP image')
    ),
});

router.use(requireAuth, requireRole('staff', 'admin', 'owner'));
const adminUp = requireRole('admin', 'owner');
const ownerOnly = requireRole('owner');
const idParam = validate(v.idParam, 'params');

router.get('/dashboard', c.getDashboard);

// Products
router.get('/products', validate(v.productListQuery, 'query'), c.listProducts);
router.post('/products', validate(v.productBody), c.createProduct);
router.patch(
  '/products/bulk-price',
  adminUp,
  validate(v.dryRunQuery, 'query'),
  validate(v.bulkPriceBody),
  c.bulkPrice
);
router.get('/products/:id', idParam, c.getProduct);
router.put('/products/:id', idParam, validate(v.productBody), c.updateProduct);
router.patch('/products/:id/status', idParam, validate(v.productStatusBody), c.setProductStatus);
router.patch(
  '/products/:id/variants/:variantId',
  validate(v.variantParams, 'params'),
  validate(v.variantPatchBody),
  c.patchVariant
);
router.delete('/products/:id', idParam, c.deleteProduct);

// Images (Cloudinary)
router.post('/uploads/image', upload.single('file'), c.uploadImage);
router.delete('/uploads/image', c.deleteImage);

// Orders
router.get('/orders', validate(v.orderListQuery, 'query'), c.listOrders);
router.get('/orders/:id', idParam, c.getOrder);
router.patch('/orders/:id/status', idParam, validate(v.orderStatusBody), c.setOrderStatus);
router.patch('/orders/:id/notes', idParam, validate(v.orderNotesBody), c.setOrderNotes);
router.patch('/orders/:id/address', idParam, validate(v.orderAddressBody), c.setOrderAddress);
router.post('/orders/:id/refund', adminUp, idParam, validate(v.refundBody), c.refundOrder);

// Payments
router.get('/payments', validate(v.paymentListQuery, 'query'), c.listPayments);
router.post(
  '/payments/:reference/reverify',
  adminUp,
  validate(v.referenceParam, 'params'),
  c.reverifyPayment
);

// Customers
router.get('/customers', validate(v.customerListQuery, 'query'), c.listCustomers);
router.get('/customers/:email', validate(v.emailParam, 'params'), c.getCustomer);

// Delivery zones
router.get('/delivery-zones', adminUp, c.listZones);
router.post('/delivery-zones', adminUp, validate(v.zoneBody), c.createZone);
router.post('/delivery-zones/bulk-fee', adminUp, validate(v.bulkZoneBody), c.bulkZoneFee);
router.put('/delivery-zones/:id', adminUp, idParam, validate(v.zoneUpdateBody), c.updateZone);
router.delete('/delivery-zones/:id', adminUp, idParam, c.deleteZone);

// Coupons
router.get('/coupons', adminUp, c.listCoupons);
router.post('/coupons', adminUp, validate(v.couponBody), c.createCoupon);
router.put('/coupons/:id', adminUp, idParam, validate(v.couponUpdateBody), c.updateCoupon);

// Settings and marketing
router.get('/settings', c.getSettings);
router.put('/settings', ownerOnly, validate(v.settingsBody), c.putSettings);
router.put('/marketing', adminUp, validate(v.marketingBody), c.putMarketing);

// Staff (owner only)
router.get('/staff', ownerOnly, c.listStaff);
router.post('/staff', ownerOnly, validate(v.staffInviteBody), c.inviteStaff);
router.patch('/staff/:id', ownerOnly, idParam, validate(v.staffUpdateBody), c.updateStaff);

// Activity and subscribers
router.get('/activity', adminUp, validate(v.activityQuery, 'query'), c.listActivity);
router.get('/subscribers', adminUp, validate(v.subscriberQuery, 'query'), c.listSubscribers);

// Catalogue setup
for (const kind of ['category', 'brand']) {
  const path = kind === 'category' ? '/categories' : '/brands';
  router.get(path, c.listCatalogue(kind === 'category' ? 'category' : 'brand'));
  router.post(path, validate(v.catalogueBody[kind]), c.createCatalogue(kind));
  router.put(
    `${path}/:id`,
    idParam,
    validate(v.catalogueBody[kind].partial()),
    c.updateCatalogue(kind)
  );
  router.delete(`${path}/:id`, idParam, c.deleteCatalogue(kind));
}

export default router;
