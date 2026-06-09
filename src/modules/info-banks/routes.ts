import { Router } from 'express';
import { InfoBankController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const ctrl = new InfoBankController();
router.use(authenticate);
router.post('/', ctrl.create);
router.get('/', ctrl.getAll);
router.get('/search', ctrl.searchAll);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.updateBank);
router.delete('/:id', ctrl.deleteBank);
router.post('/:id/items', ctrl.addItem);
router.put('/items/:itemId', ctrl.updateItem);
router.delete('/items/:itemId', ctrl.deleteItem);
export { router as infoBankRouter };
