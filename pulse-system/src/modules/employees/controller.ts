import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class EmployeeController {
  getAll = async (req: any, res: any, next: any) => {
    try {
      const { department, position, page = 1, limit = 20 } = req.query;
      const where: any = {};
      if (department) where.department = department;
      if (position) where.position = position;
      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where, include: { user: { select: { email: true, firstName: true, lastName: true, avatar: true } } },
          skip: (+page - 1) * +limit, take: +limit
        }),
        prisma.employee.count({ where })
      ]);
      res.json({ employees, pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / +limit) } });
    } catch (error) { next(error); }
  };

  search = async (req: any, res: any, next: any) => {
    try {
      const { q } = req.query;
      if (!q) throw new AppError('Search query is required', 400);
      const employees = await prisma.employee.findMany({
        where: {
          OR: [
            { position: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
            { skills: { has: q } },
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } }
          ]
        },
        include: { user: true }
      });
      res.json({ employees, count: employees.length });
    } catch (error) { next(error); }
  };

  getById = async (req: any, res: any, next: any) => {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: req.params.id }, include: { user: true }
      });
      if (!employee) throw new AppError('Employee not found', 404);
      res.json({ employee });
    } catch (error) { next(error); }
  };

  create = async (req: any, res: any, next: any) => {
    try {
      const employee = await prisma.employee.create({ data: req.body, include: { user: true } });
      res.status(201).json({ employee });
    } catch (error) { next(error); }
  };

  update = async (req: any, res: any, next: any) => {
    try {
      const employee = await prisma.employee.update({
        where: { id: req.params.id }, data: req.body, include: { user: true }
      });
      res.json({ employee });
    } catch (error) { next(error); }
  };

  delete = async (req: any, res: any, next: any) => {
    try {
      await prisma.employee.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { next(error); }
  };
}
