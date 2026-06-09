import { Router } from 'express';
import { ExportController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new ExportController();

router.use(authenticate);
router.post('/employees', ctrl.exportEmployees);

export { router as exportRouter };
