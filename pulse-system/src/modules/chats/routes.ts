import { Router } from 'express';
import { ChatController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const controller = new ChatController();
router.use(authenticate);
router.post('/', controller.createChat);
router.get('/', controller.getUserChats);
router.get('/:id', controller.getChatById);
router.post('/:id/members', controller.addMember);
router.delete('/:id/members/:userId', controller.removeMember);
router.get('/:id/messages', controller.getMessages);
router.post('/:id/messages', controller.sendMessage);
export { router as chatRouter };
