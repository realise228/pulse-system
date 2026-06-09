import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(__dirname, '..', '..', '..', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, 'avatar-' + (req as any).user.id + '-' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('avatar');

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, roleId } = req.body;
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) throw new AppError('User already exists', 400);
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({ data: { email, password: hashedPassword, firstName, lastName, roleId } });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.roleId }, config.jwt.secret, { expiresIn: '24h' } as any);
      res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName }, token });
    } catch (error) { next(error); }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
      if (!user) throw new AppError('Invalid credentials', 401);
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new AppError('Invalid credentials', 401);
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role.name }, config.jwt.secret, { expiresIn: '24h' } as any);
      res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar, role: user.role.name }, token });
    } catch (error) { next(error); }
  };

  getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { role: { include: { permissions: true } }, employee: true }
      });
      if (!user) throw new AppError('User not found', 404);
      res.json({ user });
    } catch (error) { next(error); }
  };

  updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName } = req.body;
      const user = await prisma.user.update({ where: { id: req.user.id }, data: { firstName, lastName } });
      res.json({ user });
    } catch (error) { next(error); }
  };

  uploadAvatar = (req: AuthRequest, res: Response, next: NextFunction) => {
    avatarUpload(req, res, async (err: any) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file' });
      const avatarUrl = '/uploads/avatars/' + req.file.filename;
      const user = await prisma.user.update({ where: { id: req.user.id }, data: { avatar: avatarUrl } });
      res.json({ avatar: avatarUrl });
    });
  };
}
