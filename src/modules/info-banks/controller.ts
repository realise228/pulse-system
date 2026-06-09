import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class InfoBankController {
  create = async (req: any, res: any, next: any) => {
    try {
      const bank = await prisma.infoBank.create({
        data: { name: req.body.name, description: req.body.description, category: req.body.category, tags: req.body.tags || '', createdBy: req.user.id }
      });
      res.status(201).json({ bank });
    } catch (e) { next(e); }
  };

  getAll = async (req: any, res: any, next: any) => {
    try {
      const banks = await prisma.infoBank.findMany({ include: { _count: { select: { items: true } } }, orderBy: { updatedAt: 'desc' } });
      res.json({ banks });
    } catch (e) { next(e); }
  };

  searchAll = async (req: any, res: any, next: any) => {
    try {
      const q = (req.query.q || '').toString().toLowerCase();
      const banks = await prisma.infoBank.findMany({
        where: { OR: [{ name: { contains: q } }, { description: { contains: q } }, { tags: { contains: q } }] },
        include: { _count: { select: { items: true } } }
      });
      const items = await prisma.infoItem.findMany({
        where: { OR: [{ title: { contains: q } }, { content: { contains: q } }, { tags: { contains: q } }] },
        include: { bank: { select: { name: true } } }
      });
      res.json({ banks, items });
    } catch (e) { next(e); }
  };

  getById = async (req: any, res: any, next: any) => {
    try {
      const bank = await prisma.infoBank.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { updatedAt: 'desc' } } } });
      if (!bank) throw new AppError('Not found', 404);
      res.json({ bank });
    } catch (e) { next(e); }
  };

  updateBank = async (req: any, res: any, next: any) => {
    try {
      const bank = await prisma.infoBank.update({ where: { id: req.params.id }, data: { name: req.body.name, description: req.body.description, category: req.body.category, tags: req.body.tags } });
      res.json({ bank });
    } catch (e) { next(e); }
  };

  deleteBank = async (req: any, res: any, next: any) => {
    try {
      await prisma.infoItem.deleteMany({ where: { bankId: req.params.id } });
      await prisma.infoBank.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) { next(e); }
  };

  addItem = async (req: any, res: any, next: any) => {
    try {
      const item = await prisma.infoItem.create({ data: { bankId: req.params.id, title: req.body.title, content: req.body.content, tags: req.body.tags || '', createdBy: req.user.id } });
      res.status(201).json({ item });
    } catch (e) { next(e); }
  };

  updateItem = async (req: any, res: any, next: any) => {
    try {
      const item = await prisma.infoItem.update({ where: { id: req.params.itemId }, data: { title: req.body.title, content: req.body.content, tags: req.body.tags } });
      res.json({ item });
    } catch (e) { next(e); }
  };

  deleteItem = async (req: any, res: any, next: any) => {
    try {
      await prisma.infoItem.delete({ where: { id: req.params.itemId } });
      res.status(204).send();
    } catch (e) { next(e); }
  };
}
