import { Router } from 'express';
import { SearchController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new SearchController();

router.use(authenticate);
router.get('/', ctrl.globalSearch);

export { router as searchRouter };
