import { Router } from 'express';
import { CrmController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new CrmController();

router.use(authenticate);
router.post('/templates', ctrl.createTemplate);
router.get('/templates', ctrl.getTemplates);
router.get('/templates/:id', ctrl.getTemplate);
router.put('/templates/:id', ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);
router.post('/templates/:id/export', ctrl.exportTo1C);
router.get('/templates/:id/export', ctrl.downloadExportFile);
router.get('/exports', ctrl.getExports);

export { router as crmRouter };
