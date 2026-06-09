import { Router } from 'express';
import { EmployeeController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const ctrl = new EmployeeController();

router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/search', ctrl.search);
router.get('/:id', ctrl.getById);
router.post('/', authorize('director', 'manager'), ctrl.create);
router.put('/:id', authorize('director', 'manager'), ctrl.update);
router.delete('/:id', authorize('director'), ctrl.delete);

export { router as employeeRouter };
