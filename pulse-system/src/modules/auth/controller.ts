import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';

export class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, roleId } = req.body;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) throw new AppError('User already exists', 400);
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, firstName, lastName, roleId }
      });
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.roleId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      res.status(201).json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, roleId: user.roleId },
        token
      });
    } catch (error) { next(error); }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
      if (!user) throw new AppError('Invalid credentials', 401);
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new AppError('Invalid credentials', 401);
      await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role.name },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      res.json({
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name },
        token
      });
    } catch (error) { next(error); }
  };

  getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { role: { include: { permissions: true } }, employee: true }
      });
      if (!user) throw new AppError('User not found', 404);
      res.json({ user });
    } catch (error) { next(error); }
  };

  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, avatar } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { firstName, lastName, avatar }
      });
      res.json({ user });
    } catch (error) { next(error); }
  };
}
