import { config } from '../../config';
import prisma from '../../config/database';

export class SearchController {
  globalSearch = async (req: any, res: any, next: any) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: 'Search query required' });

      const lowerQ = q.toLowerCase();

      const allEmployees = await prisma.employee.findMany({
        include: { user: { select: { email: true, firstName: true, lastName: true } } }
      });

      const filteredEmployees = allEmployees.filter(emp =>
        emp.position.toLowerCase().includes(lowerQ) ||
        emp.department.toLowerCase().includes(lowerQ) ||
        emp.user.firstName.toLowerCase().includes(lowerQ) ||
        emp.user.lastName.toLowerCase().includes(lowerQ) ||
        emp.user.email.toLowerCase().includes(lowerQ)
      );

      const allInfoItems = await prisma.infoItem.findMany({
        include: { bank: { select: { name: true } } }
      });

      const filteredItems = allInfoItems.filter(item =>
        item.title.toLowerCase().includes(lowerQ) ||
        item.content.toLowerCase().includes(lowerQ) ||
        item.tags.toLowerCase().includes(lowerQ)
      );

      res.json({
        query: q,
        results: {
          employees: { count: filteredEmployees.length, items: filteredEmployees.slice(0, 20) },
          infoItems: { count: filteredItems.length, items: filteredItems.slice(0, 20) }
        }
      });
    } catch (error) { next(error); }
  };
}
