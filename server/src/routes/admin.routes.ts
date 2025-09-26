import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { hashPassword } from '../utils/password';
import { getSystemSettings, setAllowSelfRegistration } from '../services/systemSettings';

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

const listUsersQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'active']).default('pending'),
  search: z.string().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Hasło powinno mieć co najmniej 8 znaków'),
  role: z.nativeEnum(UserRole).default(UserRole.SERWISANT),
  isActive: z.boolean().optional(),
});

const registrationSettingsSchema = z.object({
  allowSelfRegistration: z.boolean(),
});

router.post('/users', async (req, res, next) => {
  try {
    const payload = createUserSchema.parse(req.body);

    const passwordHash = await hashPassword(payload.password);
    const shouldActivate = payload.isActive ?? true;

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        role: payload.role,
        isActive: shouldActivate,
        approvedAt: shouldActivate ? new Date() : null,
        approvedById: shouldActivate ? req.user?.id ?? null : null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        approvedAt: true,
        approvedBy: {
          select: { id: true, email: true },
        },
      },
    });

    return res.status(201).json({ user, message: 'Użytkownik został utworzony.' });
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

router.get('/settings/registration', async (_req, res, next) => {
  try {
    const settings = await getSystemSettings();
    return res.json({ allowSelfRegistration: settings.allowSelfRegistration });
  } catch (error) {
    return next(error);
  }
});

router.patch('/settings/registration', async (req, res, next) => {
  try {
    const payload = registrationSettingsSchema.parse(req.body);
    const settings = await setAllowSelfRegistration(payload.allowSelfRegistration);

    return res.json({
      allowSelfRegistration: settings.allowSelfRegistration,
      message: settings.allowSelfRegistration
        ? 'Samodzielna rejestracja została włączona.'
        : 'Samodzielna rejestracja została wyłączona.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    return next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { status, search } = listUsersQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {};

    if (status === 'pending') {
      where.isActive = false;
    } else if (status === 'active') {
      where.isActive = true;
    }

    if (search) {
      where.email = { contains: search };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ isActive: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        approvedAt: true,
        approvedBy: {
          select: { id: true, email: true },
        },
      },
    });

    return res.json({ items: users });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe parametry', details: error.flatten() });
    }

    return next(error);
  }
});

const approvePayloadSchema = z.object({
  approve: z.boolean().default(true),
});

router.patch('/users/:id/approval', async (req, res, next) => {
  try {
    const payload = approvePayloadSchema.parse(req.body);

    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }

    if (targetUser.id === req.user?.id) {
      return res
        .status(400)
        .json({ message: 'Nie możesz zmieniać statusu własnego konta administratora.' });
    }

    if (payload.approve) {
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: {
          isActive: true,
          approvedAt: new Date(),
          approvedById: req.user?.id,
        },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          approvedAt: true,
        },
      });

      return res.json({ user, message: 'Użytkownik został zatwierdzony.' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        approvedAt: null,
        approvedById: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        approvedAt: true,
      },
    });

    return res.json({ user, message: 'Użytkownik został dezaktywowany.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }

    return next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }

    if (targetUser.id === req.user?.id) {
      return res.status(400).json({ message: 'Nie możesz usuwać własnego konta administratora.' });
    }

    await prisma.user.delete({ where: { id: targetUser.id } });

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Użytkownik nie został znaleziony' });
    }

    return next(error);
  }
});

export default router;
