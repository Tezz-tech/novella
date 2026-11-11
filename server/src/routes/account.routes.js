import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  profileBody,
  addressBody,
  addressUpdateBody,
  wishlistBody,
  idParam,
  orderParam,
} from '../validators/account.validators.js';
import * as c from '../controllers/account.controller.js';

/** Everything here needs a logged-in customer. */
const router = Router();
router.use(requireAuth);

router.get('/profile', c.getProfile);
router.put('/profile', validate(profileBody), c.putProfile);

router.get('/addresses', c.getAddresses);
router.post('/addresses', validate(addressBody), c.postAddress);
router.put(
  '/addresses/:id',
  validate(idParam, 'params'),
  validate(addressUpdateBody),
  c.putAddress
);
router.delete('/addresses/:id', validate(idParam, 'params'), c.deleteAddress);

router.get('/wishlist', c.getWishlist);
router.put('/wishlist', validate(wishlistBody), c.putWishlist);

router.get('/orders', c.getOrders);
router.get('/orders/:orderNumber', validate(orderParam, 'params'), c.getOrder);

export default router;
