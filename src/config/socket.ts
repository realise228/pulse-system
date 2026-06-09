import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './index';

interface OnlineUser {
  userId: string;
  socketId: string;
}

const onlineUsers: OnlineUser[] = [];

export const setupSocketIO = (io: Server) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.data.user = jwt.verify(token, config.jwt.secret);
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    console.log(`[WS] User connected: ${socket.data.user.email}`);
    
    onlineUsers.push({ userId, socketId: socket.id });
    socket.join(`user:${userId}`);
    io.emit('users:online', onlineUsers.length);

    // Присоединение к чату
    socket.on('chat:join', (chatId: string) => {
      socket.join(`chat:${chatId}`);
      socket.emit('chat:joined', { chatId });
    });

    // Покинуть чат
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    // Новое сообщение
    socket.on('chat:message', (data: { chatId: string; content: string; type?: string }) => {
      const message = {
        ...data,
        userId,
        userName: socket.data.user.email,
        timestamp: new Date().toISOString()
      };
      io.to(`chat:${data.chatId}`).emit('chat:new-message', message);
    });

    // Печатает...
    socket.on('chat:typing', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('chat:user-typing', {
        userId,
        userName: socket.data.user.email
      });
    });

    // Уведомление
    socket.on('notification:send', (data: { userId: string; title: string; message: string }) => {
      io.to(`user:${data.userId}`).emit('notification:new', {
        title: data.title,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    // Отключение
    socket.on('disconnect', () => {
      const idx = onlineUsers.findIndex(u => u.socketId === socket.id);
      if (idx !== -1) onlineUsers.splice(idx, 1);
      io.emit('users:online', onlineUsers.length);
      console.log(`[WS] User disconnected: ${socket.data.user.email}`);
    });
  });

  return io;
};
