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
        data: { name: req.body.name, createdBy: req.user.id, config: req.body.config || '{}' }
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
          config: req.body.config || '{}', position: req.body.position || '{}', dataSource: req.body.dataSource
        }
      });
      res.status(201).json({ widget });
    } catch (error) { next(error); }
  };

  getDataSource = async (req: any, res: any, next: any) => {
    try {
      const { source } = req.params;
      let data: any[] = [];
      
      if (source === 'employees-by-department') {
        const employees = await prisma.employee.findMany();
        const grouped: any = {};
        employees.forEach(emp => {
          grouped[emp.department] = (grouped[emp.department] || 0) + 1;
        });
        data = Object.entries(grouped).map(([department, count]) => ({ department, count }));
      } else if (source === 'employees-by-position') {
        const employees = await prisma.employee.findMany();
        const grouped: any = {};
        employees.forEach(emp => {
          grouped[emp.position] = (grouped[emp.position] || 0) + 1;
        });
        data = Object.entries(grouped).map(([position, count]) => ({ position, count }));
      } else if (source === 'recent-hires') {
        data = await prisma.employee.findMany({
          orderBy: { hireDate: 'desc' },
          take: 10,
          include: { user: true }
        });
      } else {
        throw new AppError('Unknown data source', 400);
      }
      
      res.json({ source, data });
    } catch (error) { next(error); }
  };
}
