import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signAccessToken } from '../utils/jwt';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Hasło powinno mieć co najmniej 8 znaków'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);

  const passwordHash = await hashPassword(payload.password);

  await prisma.user.create({
    data: {
      email: payload.email,
      passwordHash,
      role: UserRole.TECHNICIAN,
      isActive: false,
    },
  });

  return res.status(201).json({
    message: 'Konto zostało utworzone i oczekuje na zatwierdzenie przez administratora.',
  });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Użytkownik o podanym adresie e-mail już istnieje' });
    }

    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy e-mail lub hasło' });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ message: 'Konto oczekuje na zatwierdzenie przez administratora.' });
    }

    const isValidPassword = await verifyPassword(payload.password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Nieprawidłowy e-mail lub hasło' });
    }

    const token = signAccessToken(user);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
      accessToken: token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    return next(error);
  }
});

export default router;
