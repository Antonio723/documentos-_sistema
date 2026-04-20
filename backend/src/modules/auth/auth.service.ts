import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../shared/logger/logger';
import { UnauthorizedError } from '../../shared/errors/AppError';
import { JwtPayload, TokenPair } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { logAudit } from '../../shared/audit/audit.service';

export class AuthService {
  async login(dto: LoginDto, ip: string): Promise<{ tokens: TokenPair; user: object }> {
    const user = await prisma.user.findFirst({
      where: {
        email: dto.email,
        ...(dto.companyId ? { companyId: dto.companyId } : {}),
        isActive: true,
      },
      include: {
        company: { select: { id: true, name: true, isActive: true } },
        userRoles: { include: { role: { select: { id: true, name: true } } } },
      },
    });

    if (!user || !user.company.isActive) {
      logger.warn({ msg: 'Login failed - user not found or inactive', email: dto.email, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      logger.warn({ msg: 'Login failed - invalid password', email: dto.email, ip });
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = this.generateTokenPair(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(),
      },
    });

    logger.info({ msg: 'User logged in', userId: user.id, companyId: user.companyId, ip });

    void logAudit(
      { companyId: user.companyId, userId: user.id, userName: user.name, userEmail: user.email, ip },
      { action: 'login', resource: 'auth', resourceId: user.id },
    );

    return {
      tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isMaster: user.isMaster,
        company: user.company,
        roles: user.userRoles.map((ur) => ur.role),
      },
    };
  }

  async refresh(token: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: payload.id,
        refreshToken: token,
        isActive: true,
        refreshTokenExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Refresh token revoked or expired');
    }

    const tokens = this.generateTokenPair(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: tokens.refreshToken,
        refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, refreshTokenExpires: null },
    });
    logger.info({ msg: 'User logged out', userId });
  }

  private generateTokenPair(user: { id: string; email: string; companyId: string; isMaster: boolean }): TokenPair {
    const jwtPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      isMaster: user.isMaster,
    };

    const accessToken = jwt.sign(jwtPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(
      { ...jwtPayload, jti: crypto.randomUUID() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
    );

    return { accessToken, refreshToken, expiresIn: 900 };
  }
}
