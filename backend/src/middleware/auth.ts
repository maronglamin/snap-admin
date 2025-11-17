import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../types';

const prisma = new PrismaClient();

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      include: {
        operatorEntity: {
          include: {
            role: true
          }
        }
      }
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or admin account is inactive.',
      });
    }

    // Transform admin data to match our custom type
    const adminData = {
      id: admin.id,
      email: admin.email,
      password: admin.password,
      name: admin.name,
      username: admin.username,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      operatorEntityId: admin.operatorEntityId,
      operatorEntityName: admin.operatorEntity.name,
      roleName: admin.operatorEntity.role.name,
    };

    req.user = adminData;

    // Sliding expiration: proactively issue a fresh token on every authenticated request
    try {
      const newToken = jwt.sign(
        { 
          id: admin.id,
          email: admin.email,
          username: admin.username,
          role: admin.operatorEntity.role.name,
          entityId: admin.operatorEntityId
        },
        process.env.JWT_SECRET as string,
        { expiresIn: process.env.JWT_EXPIRES_IN || '30m' } as any
      );
      res.setHeader('x-token', newToken);
    } catch {
      // Non-fatal: continue without renewal header
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token.',
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    if (!req.user.roleName || !roles.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
}; 