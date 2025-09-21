import { Router } from 'express';
import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const numberField = z.coerce.number().min(0).optional();
const categoryIdField = z
  .preprocess((value) => (value === '' || value === null ? undefined : value), z.string().uuid().optional());

const createPartSchema = z.object({
  catalogNumber: z.string().min(1, 'Numer katalogowy jest wymagany'),
  name: z.string().min(1, 'Nazwa jest wymagana'),
  description: z.string().max(2000).optional(),
  manufacturer: z.string().max(255).optional(),
  categoryId: categoryIdField,
  unit: z.string().max(32).optional(),
  minimumQuantity: numberField,
  currentQuantity: numberField,
  storageLocation: z.string().max(255).optional(),
  barcode: z.string().max(255).optional(),
});

const updatePartSchema = createPartSchema.partial();

function serializePart(part: Prisma.PartGetPayload<{ include: { category: true } }>) {
  return {
    id: part.id,
    catalogNumber: part.catalogNumber,
    name: part.name,
    description: part.description,
    manufacturer: part.manufacturer,
    categoryId: part.categoryId,
    category: part.category?.name ?? null,
    unit: part.unit,
    minimumQuantity: part.minimumQuantity !== null ? Number(part.minimumQuantity) : null,
    currentQuantity: Number(part.currentQuantity),
    storageLocation: part.storageLocation,
    barcode: part.barcode,
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

    const part = await prisma.part.create({
      data: {
        catalogNumber: payload.catalogNumber,
        name: payload.name,
        description: payload.description,
        manufacturer: payload.manufacturer,
        categoryId: payload.categoryId,
        unit: payload.unit,
        minimumQuantity: payload.minimumQuantity,
        currentQuantity: payload.currentQuantity ?? 0,
        storageLocation: payload.storageLocation,
        barcode: payload.barcode,
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

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: {
        ...payload,
        currentQuantity: payload.currentQuantity ?? undefined,
        minimumQuantity: payload.minimumQuantity ?? undefined,
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
    await prisma.part.delete({ where: { id: req.params.id } });
    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ message: 'Część nie została znaleziona' });
    }

    return next(error);
  }
});

export default router;
