import { Router } from 'express';
import { InfoBankController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new InfoBankController();
router.use(authenticate);
router.post('/', authorize('director', 'manager'), controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/:id/items', controller.addItem);
router.put('/items/:itemId', controller.updateItem);
router.delete('/items/:itemId', controller.deleteItem);
export { router as infoBankRouter };
