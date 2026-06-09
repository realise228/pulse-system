import { Router } from 'express';
import { SearchController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new SearchController();
router.use(authenticate);
router.get('/', controller.globalSearch);
router.get('/reindex', controller.reindex);
export { router as searchRouter };
