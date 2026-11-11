import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { cartQuoteBody } from '../../validators/cart.validators.js';
import { postCartQuote } from '../../controllers/cart.controller.js';

const router = Router();

router.post('/quote', validate(cartQuoteBody, 'body'), postCartQuote);

export default router;
