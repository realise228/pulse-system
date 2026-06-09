import { Router } from 'express';
import { AnalyticsController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const ctrl = new AnalyticsController();

router.use(authenticate);
router.get('/dashboards', ctrl.getDashboards);
router.post('/dashboards', authorize('director', 'manager'), ctrl.createDashboard);
router.get('/dashboards/:id', ctrl.getDashboard);
router.post('/dashboards/:id/widgets', ctrl.addWidget);
router.get('/data/:source', ctrl.getDataSource);

export { router as analyticsRouter };
