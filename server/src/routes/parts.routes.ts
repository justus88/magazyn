import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const INTEGER_UNITS = new Set(['szt', 'szt.', 'pcs', 'pc']);

function requiresIntegerUnit(unit?: string | null) {
  if (!unit) {
    return false;
  }
  return INTEGER_UNITS.has(unit.trim().toLowerCase());
}

const numberField = z.coerce.number().min(0).optional();
const categoryIdField = z
  .preprocess((value) => (value === '' || value === null ? undefined : value), z.string().uuid().optional());

const createPartSchema = z.object({
  catalogNumber: z.string().min(1, 'Numer katalogowy jest wymagany'),
  name: z.string().min(1, 'Nazwa jest wymagana'),
  description: z.string().max(2000).optional(),
  categoryId: categoryIdField,
  unit: z.string().max(32).optional(),
  minimumQuantity: numberField,
  currentQuantity: numberField,
  storageLocation: z.string().max(255).optional(),
});

const updatePartSchema = createPartSchema.partial();

function serializePart(part: Prisma.PartGetPayload<{ include: { category: true } }>) {
  return {
    id: part.id,
    catalogNumber: part.catalogNumber,
    name: part.name,
    description: part.description,
    categoryId: part.categoryId,
    category: part.category?.name ?? null,
    unit: part.unit,
    minimumQuantity: part.minimumQuantity !== null ? Number(part.minimumQuantity) : null,
    currentQuantity: Number(part.currentQuantity),
    storageLocation: part.storageLocation,
    createdAt: part.createdAt,
    updatedAt: part.updatedAt,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    const page = Number.parseInt((req.query.page as string) ?? '1', 10) || 1;
    const pageSize = Math.min(Number.parseInt((req.query.pageSize as string) ?? '25', 10) || 25, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { catalogNumber: { contains: search } },
        { description: { contains: search } },
        { category: { name: { contains: search } } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [items, total] = await Promise.all([
      prisma.part.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.part.count({ where }),
    ]);

    const serialized = items.map(serializePart);

    return res.json({
      items: serialized,
      pagination: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const part = await prisma.part.findUnique({
      where: { id: req.params.id },
      include: {
        category: true,
        stockLevels: {
          orderBy: { receivedDate: 'desc' },
        },
        movements: {
          include: {
            performedBy: {
              select: { id: true, email: true, role: true },
            },
          },
          orderBy: { movementDate: 'desc' },
          take: 25,
        },
      },
    });

    if (!part) {
      return res.status(404).json({ message: 'Część nie została znaleziona' });
    }

    return res.json({
      part: serializePart(part),
      stockLevels: part.stockLevels.map((level) => ({
        id: level.id,
        quantity: Number(level.quantity),
        batchNumber: level.batchNumber,
        receivedDate: level.receivedDate,
        expiresAt: level.expiresAt,
        location: level.location,
        createdAt: level.createdAt,
        updatedAt: level.updatedAt,
      })),
      movements: part.movements.map((movement) => ({
        id: movement.id,
        movementType: movement.movementType,
        quantity: Number(movement.quantity),
        movementDate: movement.movementDate,
        deliveryDate: movement.deliveryDate,
        usageDate: movement.usageDate,
        referenceCode: movement.referenceCode,
        notes: movement.notes,
        performedBy: movement.performedBy
          ? {
              id: movement.performedBy.id,
              email: movement.performedBy.email,
              role: movement.performedBy.role,
            }
          : null,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = createPartSchema.parse(req.body);

    const unitNormalized = payload.unit ? payload.unit.trim().toLowerCase() : null;
    const mustBeInteger = requiresIntegerUnit(unitNormalized);

    const minimumQuantity =
      payload.minimumQuantity !== undefined ? payload.minimumQuantity : null;
    const currentQuantity = payload.currentQuantity ?? 0;

    if (mustBeInteger) {
      if (minimumQuantity !== null && !Number.isInteger(minimumQuantity)) {
        return res
          .status(400)
          .json({ message: 'Dla jednostki "szt" wartość minimalna musi być liczbą całkowitą.' });
      }
      if (!Number.isInteger(currentQuantity)) {
        return res
          .status(400)
          .json({ message: 'Dla jednostki "szt" bieżąca ilość musi być liczbą całkowitą.' });
      }
    }

    const part = await prisma.part.create({
      data: {
        catalogNumber: payload.catalogNumber.trim(),
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        categoryId: payload.categoryId,
        unit: unitNormalized,
        minimumQuantity,
        currentQuantity,
        storageLocation: payload.storageLocation?.trim() || null,
      },
      include: { category: true },
    });

    return res.status(201).json({ part: serializePart(part) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Istnieje już część o podanym numerze katalogowym lub kodzie kreskowym' });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(400).json({ message: 'Podana kategoria nie istnieje' });
    }

    return next(error);
  }
});

router.patch('/:id', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    const payload = updatePartSchema.parse(req.body);

    const existing = await prisma.part.findUnique({
      where: { id: req.params.id },
      select: { unit: true },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Część nie została znaleziona' });
    }

    const currentUnit = existing.unit ? existing.unit.trim().toLowerCase() : null;
    const requestedUnit =
      payload.unit !== undefined ? payload.unit?.trim().toLowerCase() || null : currentUnit;
    const mustBeInteger = requiresIntegerUnit(requestedUnit);

    if (mustBeInteger) {
      if (payload.minimumQuantity !== undefined && payload.minimumQuantity !== null && !Number.isInteger(payload.minimumQuantity)) {
        return res
          .status(400)
          .json({ message: 'Dla jednostki "szt" wartość minimalna musi być liczbą całkowitą.' });
      }
      if (payload.currentQuantity !== undefined && payload.currentQuantity !== null && !Number.isInteger(payload.currentQuantity)) {
        return res
          .status(400)
          .json({ message: 'Dla jednostki "szt" bieżąca ilość musi być liczbą całkowitą.' });
      }
    }

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: {
        catalogNumber: payload.catalogNumber?.trim(),
        name: payload.name?.trim(),
        description:
          payload.description !== undefined ? payload.description?.trim() || null : undefined,
        categoryId: payload.categoryId,
        unit: payload.unit !== undefined ? requestedUnit : undefined,
        minimumQuantity: payload.minimumQuantity ?? undefined,
        currentQuantity: payload.currentQuantity ?? undefined,
        storageLocation:
          payload.storageLocation !== undefined
            ? payload.storageLocation?.trim() || null
            : undefined,
      },
      include: { category: true },
    });

    return res.json({ part: serializePart(part) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Część nie została znaleziona' });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Istnieje już część o podanym numerze katalogowym lub kodzie kreskowym' });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(400).json({ message: 'Podana kategoria nie istnieje' });
    }

    return next(error);
  }
});

router.delete('/:id', authenticate, authorize(UserRole.MANAGER, UserRole.ADMIN), async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { partId: req.params.id } });
      await tx.stockLevel.deleteMany({ where: { partId: req.params.id } });
      await tx.part.delete({ where: { id: req.params.id } });
    });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Część nie została znaleziona' });
    }

    return next(error);
  }
});

export default router;
