import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class EmployeeController {
  getAll = async (req: any, res: any, next: any) => {
    try {
      const { page = 1, limit = 20, department } = req.query;
      const where: any = {};
      
      // Права доступа
      if (req.user.role === 'manager') {
        const manager = await prisma.employee.findFirst({ where: { userId: req.user.id } });
        if (manager) where.department = manager.department;
      } else if (req.user.role === 'employee') {
        where.userId = req.user.id;
      }
      
      if (department && req.user.role !== 'employee') where.department = department;
      
      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          include: { user: { select: { email: true, firstName: true, lastName: true, avatar: true } } },
          skip: (+page - 1) * +limit,
          take: +limit
        }),
        prisma.employee.count({ where })
      ]);
      res.json({ employees, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
    } catch (error) { next(error); }
  };

  search = async (req: any, res: any, next: any) => {
    try {
      const { q } = req.query;
      if (!q) throw new AppError('Search query required', 400);
      
      let employees = await prisma.employee.findMany({ include: { user: true } });
      
      if (req.user.role === 'manager') {
        const manager = await prisma.employee.findFirst({ where: { userId: req.user.id } });
        if (manager) employees = employees.filter(e => e.department === manager.department);
      } else if (req.user.role === 'employee') {
        employees = employees.filter(e => e.userId === req.user.id);
      }
      
      const lowerQ = q.toLowerCase();
      employees = employees.filter(emp => 
        emp.position.toLowerCase().includes(lowerQ) ||
        emp.department.toLowerCase().includes(lowerQ) ||
        emp.skills.toLowerCase().includes(lowerQ) ||
        emp.user.firstName.toLowerCase().includes(lowerQ) ||
        emp.user.lastName.toLowerCase().includes(lowerQ)
      );
      
      res.json({ employees, count: employees.length });
    } catch (error) { next(error); }
  };

  getById = async (req: any, res: any, next: any) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id },
        include: { user: { select: { email: true, firstName: true, lastName: true, avatar: true, lastLoginAt: true, createdAt: true } } }
      });
      if (!employee) throw new AppError('Employee not found', 404);
      res.json({ employee });
    } catch (error) { next(error); }
  };

  create = async (req: any, res: any, next: any) => {
    try {
      if (req.user.role === 'employee') throw new AppError('Access denied', 403);
      const employee = await prisma.employee.create({ data: req.body, include: { user: true } });
      
      // Создаём уведомление
      await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Новый сотрудник',
          message: `${employee.user.firstName} ${employee.user.lastName} добавлен в отдел ${employee.department}`,
          type: 'employee_added'
        }
      });
      
      res.status(201).json({ employee });
    } catch (error) { next(error); }
  };

  update = async (req: any, res: any, next: any) => {
    try {
      if (req.user.role === 'employee') throw new AppError('Access denied', 403);
      const employee = await prisma.employee.update({
        where: { id: req.params.id },
        data: req.body,
        include: { user: true }
      });
      res.json({ employee });
    } catch (error) { next(error); }
  };

  delete = async (req: any, res: any, next: any) => {
    try {
      if (req.user.role !== 'director') throw new AppError('Access denied', 403);
      await prisma.employee.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { next(error); }
  };
}
