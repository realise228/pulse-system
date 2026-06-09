import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ChatController {
  createChat = async (req: any, res: any, next: any) => {
    try {
      const { name, description, memberIds } = req.body;
      const chat = await prisma.chat.create({
        data: {
          name, description, createdBy: req.user.id,
          members: { create: (memberIds || []).map((userId: string) => ({ userId })) }
        },
        include: { members: { include: { user: true } } }
      });
      res.status(201).json({ chat });
    } catch (error) { next(error); }
  };

  getUserChats = async (req: any, res: any, next: any) => {
    try {
      const chats = await prisma.chat.findMany({
        where: { members: { some: { userId: req.user.id } } },
        include: { members: { include: { user: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } }
      });
      res.json({ chats });
    } catch (error) { next(error); }
  };

  getChatById = async (req: any, res: any, next: any) => {
    try {
      const chat = await prisma.chat.findUnique({
        where: { id: req.params.id },
        include: { members: { include: { user: true } }, messages: { take: 50, orderBy: { createdAt: 'asc' }, include: { user: { select: { firstName: true, lastName: true, avatar: true } } } } }
      });
      if (!chat) throw new AppError('Chat not found', 404);
      res.json({ chat });
    } catch (error) { next(error); }
  };

  deleteChat = async (req: any, res: any, next: any) => {
    try {
      await prisma.chat.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (error) { next(error); }
  };

  addMember = async (req: any, res: any, next: any) => {
    try {
      const member = await prisma.chatMember.create({
        data: { chatId: req.params.id, userId: req.body.userId },
        include: { user: true }
      });
      res.status(201).json({ member });
    } catch (error) { next(error); }
  };

  removeMember = async (req: any, res: any, next: any) => {
    try {
      await prisma.chatMember.deleteMany({
        where: { chatId: req.params.id, userId: req.params.userId }
      });
      res.status(204).send();
    } catch (error) { next(error); }
  };

  getMessages = async (req: any, res: any, next: any) => {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { chatId: req.params.id },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } },
        orderBy: { createdAt: 'asc' }
      });
      res.json({ messages });
    } catch (error) { next(error); }
  };

  sendMessage = async (req: any, res: any, next: any) => {
    try {
      const message = await prisma.chatMessage.create({
        data: { chatId: req.params.id, userId: req.user.id, content: req.body.content, type: req.body.type || 'text' },
        include: { user: { select: { firstName: true, lastName: true, avatar: true } } }
      });
      res.status(201).json({ message });
    } catch (error) { next(error); }
  };
}
