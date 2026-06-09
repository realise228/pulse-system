import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class InfoBankController {
  create = async (req: any, res: any, next: any) => {
    try {
      const bank = await prisma.infoBank.create({
        data: {
          name: req.body.name, description: req.body.description,
          category: req.body.category, tags: req.body.tags || [],
          createdBy: req.user.id
        }
      });
      res.status(201).json({ bank });
    } catch (error) { next(error); }
  };

  getAll = async (req: any, res: any, next: any) => {
    try {
      const { category, tag } = req.query;
      const where: any = {};
      if (category) where.category = category;
      if (tag) where.tags = { has: tag };
      const banks = await prisma.infoBank.findMany({
        where, include: { _count: { select: { items: true } } }
      });
      res.json({ banks });
    } catch (error) { next(error); }
  };

  getById = async (req: any, res: any, next: any) => {
    try {
      const bank = await prisma.infoBank.findUnique({
        where: { id: req.params.id }, include: { items: { orderBy: { updatedAt: 'desc' } } }
      });
      if (!bank) throw new AppError('Info bank not found', 404);
      res.json({ bank });
    } catch (error) { next(error); }
  };

  addItem = async (req: any, res: any, next: any) => {
    try {
      const item = await prisma.infoItem.create({
        data: {
          bankId: req.params.id, title: req.body.title,
          content: req.body.content, tags: req.body.tags || [],
          createdBy: req.user.id
        }
      });
      res.status(201).json({ item });
    } catch (error) { next(error); }
  };

  updateItem = async (req: any, res: any, next: any) => {
    try {
      const item = await prisma.infoItem.update({
        where: { id: req.params.itemId }, data: req.body
      });
      res.json({ item });
    } catch (error) { next(error); }
  };

  deleteItem = async (req: any, res: any, next: any) => {
    try {
      await prisma.infoItem.delete({ where: { id: req.params.itemId } });
      res.status(204).send();
    } catch (error) { next(error); }
  };
}
