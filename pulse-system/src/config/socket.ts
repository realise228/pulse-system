import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './index';

export const setupSocketIO = (io: SocketIOServer) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.data.user.id}`);
    socket.join(`user:${socket.data.user.id}`);

    socket.on('join-chat', (chatId: string) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave-chat', (chatId: string) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('chat-message', (data: any) => {
      io.to(`chat:${data.chatId}`).emit('new-message', {
        ...data,
        userId: socket.data.user.id,
        timestamp: new Date()
      });
    });

    socket.on('typing', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('user-typing', {
        userId: socket.data.user.id,
        chatId
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.data.user.id}`);
    });
  });
};
