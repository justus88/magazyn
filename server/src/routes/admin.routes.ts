import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

const listUsersQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'active']).default('pending'),
  search: z.string().optional(),
});

router.get('/users', async (req, res, next) => {
  try {
    const { status, search } = listUsersQuerySchema.parse(req.query);

    const where: Prisma.UserWhereInput = {
      role: { not: UserRole.ADMIN },
    };

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

    if (targetUser.role === UserRole.ADMIN) {
      return res.status(400).json({ message: 'Nie można zmieniać statusu kont administratorów.' });
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

    if (targetUser.role === UserRole.ADMIN) {
      return res.status(400).json({ message: 'Nie można usuwać kont administratorów.' });
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
