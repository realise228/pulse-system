import { Router } from 'express';
import { ChatController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
const ctrl = new ChatController();

router.use(authenticate);
router.post('/', ctrl.createChat);
router.get('/', ctrl.getUserChats);
router.get('/:id', ctrl.getChatById);
router.delete('/:id', ctrl.deleteChat);
router.post('/:id/members', ctrl.addMember);
router.delete('/:id/members/:userId', ctrl.removeMember);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/messages', ctrl.sendMessage);

export { router as chatRouter };
