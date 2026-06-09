import { Router } from 'express';
import { AnalyticsController } from './controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();
const controller = new AnalyticsController();
router.use(authenticate);
router.get('/dashboards', controller.getDashboards);
router.post('/dashboards', authorize('director', 'manager'), controller.createDashboard);
router.get('/dashboards/:id', controller.getDashboard);
router.post('/dashboards/:id/widgets', controller.addWidget);
router.get('/data/:source', controller.getDataSource);
export { router as analyticsRouter };
