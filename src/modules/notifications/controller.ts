import prisma from '../../config/database';

export class NotificationController {
  getAll = async (req: any, res: any, next: any) => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      const unread = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
      res.json({ notifications, unread });
    } catch (e) { next(e); }
  };

  markRead = async (req: any, res: any, next: any) => {
    try {
      await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
      res.json({ ok: true });
    } catch (e) { next(e); }
  };

  markAllRead = async (req: any, res: any, next: any) => {
    try {
      await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
      res.json({ ok: true });
    } catch (e) { next(e); }
  };

  delete = async (req: any, res: any, next: any) => {
    try {
      await prisma.notification.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (e) { next(e); }
  };
}
