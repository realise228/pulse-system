import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/routes';
import { employeeRouter } from './modules/employees/routes';
import { chatRouter } from './modules/chats/routes';
import { analyticsRouter } from './modules/analytics/routes';
import { crmRouter } from './modules/crm-generator/routes';
import { infoBankRouter } from './modules/info-banks/routes';
import { searchRouter } from './modules/search/routes';
import { uploadRouter } from './modules/upload/routes';
import { notificationRouter } from './modules/notifications/routes';
import { exportRouter } from './modules/export/routes';
import { setupSocketIO } from './config/socket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/chats', chatRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/info-banks', infoBankRouter);
app.use('/api/search', searchRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/export', exportRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

app.use(errorHandler);
setupSocketIO(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`PULSE running on port ${PORT}`);
});

export { app, io };
