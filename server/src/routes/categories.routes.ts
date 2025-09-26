import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nazwa jest wymagana')
    .transform((value) => value.trim()),
  description: z
    .string()
    .max(1_000, 'Opis może mieć maksymalnie 1000 znaków')
    .transform((value) => value.trim())
    .optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const listCategoriesSchema = z.object({
  search: z.string().optional(),
  includeStats: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

type CategoryWithCount = Prisma.CategoryGetPayload<{ include: { _count: true } }>;

function serializeCategory(category: CategoryWithCount) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    partsCount: category._count?.parts ?? 0,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const params = listCategoriesSchema.parse(req.query);

    const where: Prisma.CategoryWhereInput = {};

    if (params.search) {
      const searchTerm = params.search.trim();
      where.OR = [
        { name: { contains: searchTerm } },
        { description: { contains: searchTerm } },
      ];
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: true },
    });

    const items = params.includeStats ? categories.map((category) => serializeCategory(category)) : categories;

    return res.json({ items });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe parametry', details: error.flatten() });
    }

    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        _count: true,
        parts: {
          select: {
            id: true,
            catalogNumber: true,
            name: true,
            currentQuantity: true,
            minimumQuantity: true,
            updatedAt: true,
          },
          orderBy: { name: 'asc' },
          take: 20,
        },
      },
    });

    if (!category) {
      return res.status(404).json({ message: 'Kategoria nie została znaleziona' });
    }

    return res.json({
      category: serializeCategory(category),
      parts: category.parts,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, authorize(UserRole.SERWISANT, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = createCategorySchema.parse(req.body);
    const category = await prisma.category.create({
      data: payload,
      include: { _count: true },
    });
    return res.status(201).json({ category: serializeCategory(category) });
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

router.patch('/:id', authenticate, authorize(UserRole.SERWISANT, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = updateCategorySchema.parse(req.body);

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: payload,
      include: { _count: true },
    });

    return res.json({ category: serializeCategory(category) });
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

router.delete('/:id', authenticate, authorize(UserRole.SERWISANT, UserRole.ADMIN), async (req, res, next) => {
  try {
    const categoryId = req.params.id;

    const partsCount = await prisma.part.count({ where: { categoryId, isDeleted: false } });
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
