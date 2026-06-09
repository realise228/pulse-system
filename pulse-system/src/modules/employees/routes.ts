import { Router } from 'express';
import { EmployeeController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new EmployeeController();
router.use(authenticate);
router.get('/', controller.getAll);
router.get('/search', controller.search);
router.get('/:id', controller.getById);
router.post('/', authorize('director', 'manager'), controller.create);
router.put('/:id', authorize('director', 'manager'), controller.update);
router.delete('/:id', authorize('director'), controller.delete);
export { router as employeeRouter };
