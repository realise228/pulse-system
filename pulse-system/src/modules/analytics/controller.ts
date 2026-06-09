import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class AnalyticsController {
  getDashboards = async (req: any, res: any, next: any) => {
    try {
      const dashboards = await prisma.analyticsDashboard.findMany({ include: { widgets: true } });
      res.json({ dashboards });
    } catch (error) { next(error); }
  };

  createDashboard = async (req: any, res: any, next: any) => {
    try {
      const dashboard = await prisma.analyticsDashboard.create({
        data: { name: req.body.name, createdBy: req.user.id, config: req.body.config || {} }
      });
      res.status(201).json({ dashboard });
    } catch (error) { next(error); }
  };

  getDashboard = async (req: any, res: any, next: any) => {
    try {
      const dashboard = await prisma.analyticsDashboard.findUnique({
        where: { id: req.params.id }, include: { widgets: true }
      });
      if (!dashboard) throw new AppError('Dashboard not found', 404);
      res.json({ dashboard });
    } catch (error) { next(error); }
  };

  addWidget = async (req: any, res: any, next: any) => {
    try {
      const widget = await prisma.analyticsWidget.create({
        data: {
          dashboardId: req.params.id, type: req.body.type, title: req.body.title,
          config: req.body.config, position: req.body.position, dataSource: req.body.dataSource
        }
      });
      res.status(201).json({ widget });
    } catch (error) { next(error); }
  };

  getDataSource = async (req: any, res: any, next: any) => {
    try {
      const { source } = req.params;
      let data: any[] = [];
      switch (source) {
        case 'employees-by-department':
          data = await prisma.$queryRaw`SELECT department, COUNT(*) as count FROM employees GROUP BY department`;
          break;
        case 'employees-by-position':
          data = await prisma.$queryRaw`SELECT position, COUNT(*) as count FROM employees GROUP BY position`;
          break;
        case 'recent-hires':
          data = await prisma.employee.findMany({
            orderBy: { hireDate: 'desc' }, take: 10, include: { user: true }
          });
          break;
        case 'chats-activity':
          data = await prisma.$queryRaw`
            SELECT c.name, COUNT(cm.id) as message_count, MAX(cm."createdAt") as last_activity
            FROM chats c LEFT JOIN chat_messages cm ON c.id = cm."chatId"
            GROUP BY c.id, c.name ORDER BY last_activity DESC
          `;
          break;
        default:
          throw new AppError('Unknown data source', 400);
      }
      res.json({ source, data });
    } catch (error) { next(error); }
  };
}
