import { Router } from 'express';
import { Prisma, StockMovementType, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const dateCoerce = z
  .union([z.string(), z.date()])
  .transform((value) => {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  })
  .optional();

const createMovementSchema = z.object({
  partId: z.string().uuid({ message: 'Nieprawidłowy identyfikator części' }),
  movementType: z.nativeEnum(StockMovementType),
  quantity: z.coerce.number(),
  movementDate: dateCoerce,
  deliveryDate: dateCoerce,
  usageDate: dateCoerce,
  referenceCode: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

const listMovementsSchema = z.object({
  partId: z.string().uuid().optional(),
  movementType: z.nativeEnum(StockMovementType).optional(),
  startDate: dateCoerce,
  endDate: dateCoerce,
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(200).optional(),
});

type MovementWithRelations = Prisma.StockMovementGetPayload<{
  include: {
    part: {
      select: {
        id: true;
        name: true;
        catalogNumber: true;
      };
    };
    performedBy: {
      select: {
        id: true;
        email: true;
        role: true;
      };
    };
  };
}>;

function serializeMovement(movement: MovementWithRelations) {
  return {
    id: movement.id,
    movementType: movement.movementType,
    quantity: Number(movement.quantity),
    movementDate: movement.movementDate,
    deliveryDate: movement.deliveryDate,
    usageDate: movement.usageDate,
    referenceCode: movement.referenceCode,
    notes: movement.notes,
    part: movement.part,
    performedBy: movement.performedBy
      ? {
          id: movement.performedBy.id,
          email: movement.performedBy.email,
          role: movement.performedBy.role,
        }
      : null,
    createdAt: movement.createdAt,
    updatedAt: movement.updatedAt,
  };
}

router.get('/', authenticate, async (req, res, next) => {
  try {
    const params = listMovementsSchema.parse(req.query);

    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 25, 200);
    const skip = (page - 1) * pageSize;

    const where: Prisma.StockMovementWhereInput = {};

    if (params.partId) {
      where.partId = params.partId;
    }

    if (params.movementType) {
      where.movementType = params.movementType;
    }

    if (params.startDate || params.endDate) {
      where.movementDate = {};
      if (params.startDate) {
        where.movementDate.gte = params.startDate;
      }
      if (params.endDate) {
        where.movementDate.lte = params.endDate;
      }
    }

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          part: {
            select: {
              id: true,
              name: true,
              catalogNumber: true,
            },
          },
          performedBy: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { movementDate: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return res.json({
      items: items.map(serializeMovement),
      pagination: {
        total,
        page,
        pageSize,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Nieprawidłowe parametry', details: error.flatten() });
    }

    return next(error);
  }
});

router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN),
  async (req, res, next) => {
    try {
      const payload = createMovementSchema.parse(req.body);

      if (!Number.isFinite(payload.quantity) || payload.quantity === 0) {
        return res.status(400).json({ message: 'Ilość musi być różna od zera' });
      }

      const result = await prisma.$transaction(async (tx) => {
        const part = await tx.part.findUnique({ where: { id: payload.partId } });
        if (!part) {
          throw new Error('PART_NOT_FOUND');
        }

        const currentQuantity = new Prisma.Decimal(part.currentQuantity);
        const movementQuantity = new Prisma.Decimal(payload.quantity);
        let newQuantity = currentQuantity;

        switch (payload.movementType) {
          case StockMovementType.DELIVERY:
            if (movementQuantity.lessThanOrEqualTo(0)) {
              throw new Error('INVALID_QUANTITY');
            }
            newQuantity = currentQuantity.plus(movementQuantity);
            break;
          case StockMovementType.USAGE:
            if (movementQuantity.lessThanOrEqualTo(0)) {
              throw new Error('INVALID_QUANTITY');
            }
            if (currentQuantity.minus(movementQuantity).lessThan(0)) {
              throw new Error('QUANTITY_BELOW_ZERO');
            }
            newQuantity = currentQuantity.minus(movementQuantity);
            break;
          case StockMovementType.ADJUSTMENT:
            newQuantity = currentQuantity.plus(movementQuantity);
            if (newQuantity.lessThan(0)) {
              throw new Error('QUANTITY_BELOW_ZERO');
            }
            break;
          default:
        }

        const updatedPart = await tx.part.update({
          where: { id: part.id },
          data: { currentQuantity: newQuantity },
        });

        const movement = await tx.stockMovement.create({
          data: {
            partId: updatedPart.id,
            movementType: payload.movementType,
            quantity: movementQuantity,
            movementDate: payload.movementDate ?? new Date(),
            deliveryDate: payload.deliveryDate,
            usageDate: payload.usageDate,
            referenceCode: payload.referenceCode,
            notes: payload.notes,
            performedById: req.user?.id ?? null,
          },
          include: {
            part: {
              select: {
                id: true,
                name: true,
                catalogNumber: true,
              },
            },
            performedBy: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });

        return { movement, part: updatedPart };
      });

      return res.status(201).json({
        movement: serializeMovement(result.movement),
        partCurrentQuantity: Number(result.part.currentQuantity),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          return res.status(400).json({ message: 'Podana część nie istnieje' });
        }
      }

      if (error instanceof Error) {
        if (error.message === 'PART_NOT_FOUND') {
          return res.status(404).json({ message: 'Część nie została znaleziona' });
        }
        if (error.message === 'INVALID_QUANTITY') {
          return res.status(400).json({ message: 'Ilość musi być dodatnia' });
        }
        if (error.message === 'QUANTITY_BELOW_ZERO') {
          return res.status(400).json({ message: 'Operacja spowodowałaby ujemny stan magazynowy' });
        }
      }

      return next(error);
    }
  },
);

export default router;
