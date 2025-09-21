import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  description: z.string().max(1_000).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ items: categories });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({ data: payload });
    return res.status(201).json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Kategoria o tej nazwie już istnieje' });
    }

    return next(error);
  }
});

router.patch('/:id', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = updateCategorySchema.parse(req.body);

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: payload,
    });

    return res.json({ category });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Kategoria nie została znaleziona' });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Kategoria o tej nazwie już istnieje' });
    }

    return next(error);
  }
});

router.delete('/:id', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    const partsCount = await prisma.part.count({ where: { categoryId } });
    if (partsCount > 0) {
      return res
        .status(400)
        .json({ message: 'Nie można usunąć kategorii, która jest przypisana do istniejących części' });
    }

    await prisma.category.delete({ where: { id: categoryId } });

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Kategoria nie została znaleziona' });
    }

    return next(error);
  }
});

export default router;
