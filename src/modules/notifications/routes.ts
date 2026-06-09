import { Router } from 'express';
import { NotificationController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new NotificationController();

router.use(authenticate);
router.get('/', ctrl.getAll);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);
router.delete('/:id', ctrl.delete);

export { router as notificationRouter };
