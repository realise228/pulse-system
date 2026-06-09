import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/routes';
import { employeeRouter } from './modules/employees/routes';
import { chatRouter } from './modules/chats/routes';
import { analyticsRouter } from './modules/analytics/routes';
import { crmRouter } from './modules/crm-generator/routes';
import { infoBankRouter } from './modules/info-banks/routes';
import { searchRouter } from './modules/search/routes';
import { setupSocketIO } from './config/socket';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/chats', chatRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/crm', crmRouter);
app.use('/api/info-banks', infoBankRouter);
app.use('/api/search', searchRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);
setupSocketIO(io);

httpServer.listen(config.port, () => {
  console.log(`🚀 Pulse System running on port ${config.port}`);
});

export { app, io };
