import { Router } from 'express';
import { UploadController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new UploadController();

router.use(authenticate);
router.post('/', ctrl.upload);
router.get('/', ctrl.list);

export { router as uploadRouter };
