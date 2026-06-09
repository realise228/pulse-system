import { Router } from 'express';
import { CrmController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new CrmController();
router.use(authenticate);
router.post('/templates', authorize('director', 'manager'), controller.createTemplate);
router.get('/templates', controller.getTemplates);
router.get('/templates/:id', controller.getTemplate);
router.put('/templates/:id/modules', authorize('director', 'manager'), controller.addModule);
router.post('/templates/:id/export', controller.exportTo1C);
router.get('/exports', controller.getExports);
router.get('/exports/:id/download', controller.downloadExport);
export { router as crmRouter };
