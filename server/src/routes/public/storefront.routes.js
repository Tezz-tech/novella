import { Router } from 'express';
import { getSettings, getDeliveryZones } from '../../controllers/storefront.controller.js';

const router = Router();

router.get('/settings/public', getSettings);
router.get('/delivery-zones', getDeliveryZones);

export default router;
