import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

const ACCESS_TOKEN_TTL = '1h';

export function signAccessToken(data: { id: string; email: string; role: UserRole }) {
  const payload: AuthTokenPayload = {
    sub: data.id,
    email: data.email,
    role: data.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  return decoded as AuthTokenPayload;
}
