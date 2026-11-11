import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  productListQuery,
  suggestQuery,
  slugParams,
} from '../../validators/catalogue.validators.js';
import { getProducts, getProduct, getSuggestions } from '../../controllers/catalogue.controller.js';

const router = Router();

router.get('/', validate(productListQuery, 'query'), getProducts);
// Declared before "/:slug" so "search" is never read as a product slug.
router.get('/search/suggest', validate(suggestQuery, 'query'), getSuggestions);
router.get('/:slug', validate(slugParams, 'params'), getProduct);

export default router;
