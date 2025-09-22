import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import { z } from 'zod';
import { Prisma, StockMovementType, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const INTEGER_UNITS = new Set(['szt', 'szt.', 'pcs', 'pc']);

function requiresIntegerUnit(unit?: string | null) {
  if (!unit) {
    return false;
  }
  return INTEGER_UNITS.has(unit.trim().toLowerCase());
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/[\s.\/]/g, '');
}

function selectColumn(keys: string[], candidates: string[]): string | null {
  const normalized = keys.map((key) => ({ key, normalized: normalizeKey(key) }));
  for (const candidate of candidates) {
    const candidateNorm = normalizeKey(candidate);
    const match = normalized.find((entry) => entry.normalized === candidateNorm);
    if (match) {
      return match.key;
    }
  }
  // fallback: contains
  for (const candidate of candidates) {
    const candidateNorm = normalizeKey(candidate);
    const match = normalized.find((entry) => entry.normalized.includes(candidateNorm));
    if (match) {
      return match.key;
    }
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : value;
  }
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.');
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeCatalogNumber(value: string) {
  return value.trim().toLowerCase();
}

const SHEET_PRIORITY = ['RawData', 'Format', 'Header'];

const applyAdjustmentsSchema = z.object({
  adjustments: z.array(
    z.object({
      partId: z.string().uuid(),
      catalogNumber: z.string().min(1),
      fileQuantity: z.number(),
    }),
  ),
});

router.post(
  '/alstom',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Brak pliku w żądaniu (pole "file").' });
      }

      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = SHEET_PRIORITY.find((name) => workbook.SheetNames.includes(name)) ?? workbook.SheetNames[0];

      if (!sheetName) {
        return res.status(400).json({ message: 'Plik nie zawiera arkuszy z danymi.' });
      }

      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) {
        return res.status(400).json({ message: `Nie znaleziono arkusza ${sheetName}.` });
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });

      if (rawRows.length === 0) {
        return res.status(400).json({ message: 'Arkusz nie zawiera danych.' });
      }

      const firstRow = rawRows[0]!;
      const firstRowKeys = Object.keys(firstRow);
      const materialCol = selectColumn(firstRowKeys, ['Materiał', 'Material', 'Numer']);
      const nameCol = selectColumn(firstRowKeys, ['Krótki tekst mat.', 'Krótki tekst mat', 'Nazwa', 'Opis']);
      const unitCol = selectColumn(firstRowKeys, ['Podst. jedn. miary', 'Jednostka']);
      const qtyCol = selectColumn(firstRowKeys, ['Nieogranicz.wykorz.', 'Nieograniczony zapas', 'Unrestricted-use stock']);

      if (!materialCol || !qtyCol) {
        return res.status(400).json({ message: 'Brakuje kolumny numeru materiału lub ilości w pliku.' });
      }

      const excelItems = rawRows
        .map((row) => {
          const materialRaw = row[materialCol];
          if (!materialRaw) {
            return null;
          }
          const catalogNumber = String(materialRaw).trim();
          if (!catalogNumber) {
            return null;
          }

          const quantity = parseNumber(row[qtyCol]);
          if (quantity === null) {
            return null;
          }

          const rawUnit = unitCol ? String(row[unitCol] ?? '').trim() : '';
          const unit = rawUnit ? rawUnit.toLowerCase() : null;
          const name = nameCol ? String(row[nameCol] ?? '').trim() || null : null;

          return {
            catalogNumber,
            name,
            unit,
            quantity,
          };
        })
        .filter((item): item is { catalogNumber: string; name: string | null; unit: string | null; quantity: number } => item !== null);

      if (excelItems.length === 0) {
        return res.status(400).json({ message: 'Nie udało się odczytać żadnych pozycji z pliku.' });
      }

      const excelMap = new Map(
        excelItems.map((item) => [normalizeCatalogNumber(item.catalogNumber), item]),
      );

      const systemParts = await prisma.part.findMany({
        select: {
          id: true,
          catalogNumber: true,
          name: true,
          unit: true,
          currentQuantity: true,
        },
      });

      const systemMap = new Map(
        systemParts.map((part) => [normalizeCatalogNumber(part.catalogNumber), part]),
      );

      const matchedCatalogs = new Set<string>();

      const missingInSystem: Array<{ catalogNumber: string; name: string | null; unit: string | null; quantity: number }> = [];
      const unitMismatches: Array<{
        catalogNumber: string;
        systemUnit: string | null;
        fileUnit: string | null;
      }> = [];
      const quantityDifferences: Array<{
        partId: string;
        catalogNumber: string;
        name: string | null;
        unit: string | null;
        systemQuantity: number;
        fileQuantity: number;
        difference: number;
      }> = [];
      const nameDifferences: Array<{
        catalogNumber: string;
        systemName: string | null;
        fileName: string | null;
      }> = [];

      for (const [key, item] of excelMap.entries()) {
        const systemPart = systemMap.get(key);
        if (!systemPart) {
          missingInSystem.push(item);
          continue;
        }

        matchedCatalogs.add(key);

        const systemUnitNormalized = systemPart.unit?.trim().toLowerCase() ?? null;
        const fileUnitNormalized = item.unit?.trim().toLowerCase() ?? null;

        if (systemUnitNormalized && fileUnitNormalized && systemUnitNormalized !== fileUnitNormalized) {
          unitMismatches.push({
            catalogNumber: systemPart.catalogNumber,
            systemUnit: systemPart.unit,
            fileUnit: item.unit,
          });
        }

        if (systemPart.name && item.name && systemPart.name.trim() !== item.name.trim()) {
          nameDifferences.push({
            catalogNumber: systemPart.catalogNumber,
            systemName: systemPart.name,
            fileName: item.name,
          });
        }

        const systemQty = Number(systemPart.currentQuantity);
        const diff = item.quantity - systemQty;
        if (Math.abs(diff) > 0.0001) {
          quantityDifferences.push({
            partId: systemPart.id,
            catalogNumber: systemPart.catalogNumber,
            name: systemPart.name,
            unit: systemPart.unit,
            systemQuantity: systemQty,
            fileQuantity: item.quantity,
            difference: diff,
          });
        }
      }

      const extraInSystem = systemParts
        .filter((part) => !matchedCatalogs.has(normalizeCatalogNumber(part.catalogNumber)))
        .map((part) => ({
          catalogNumber: part.catalogNumber,
          name: part.name,
          unit: part.unit,
          quantity: Number(part.currentQuantity),
        }));

      return res.json({
        summary: {
          totalFileItems: excelItems.length,
          totalSystemItems: systemParts.length,
          missingCount: missingInSystem.length,
          extraCount: extraInSystem.length,
          quantityMismatchCount: quantityDifferences.length,
          unitMismatchCount: unitMismatches.length,
          nameMismatchCount: nameDifferences.length,
        },
        missingInSystem,
        extraInSystem,
        quantityDifferences,
        unitMismatches,
        nameDifferences,
      });
    } catch (error) {
      return next(error);
    }
  },
);

router.post(
  '/alstom/apply',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const { adjustments } = applyAdjustmentsSchema.parse(req.body);

      if (adjustments.length === 0) {
        return res.status(400).json({ message: 'Brak pozycji do aktualizacji.' });
      }

      const applied: Array<{
        partId: string;
        catalogNumber: string;
        name: string | null;
        previousQuantity: number;
        newQuantity: number;
        difference: number;
        movementId: string;
      }> = [];

      const skipped: Array<{
        partId: string;
        catalogNumber: string;
        name: string | null;
        reason: string;
      }> = [];

      const failed: Array<{
        partId: string | null;
        catalogNumber: string;
        name: string | null;
        reason: string;
      }> = [];

      const timestamp = new Date();

      await prisma.$transaction(async (tx) => {
        for (const item of adjustments) {
          const part = await tx.part.findUnique({
            where: { id: item.partId },
            select: {
              id: true,
              catalogNumber: true,
              name: true,
              unit: true,
              currentQuantity: true,
            },
          });

          if (!part) {
            failed.push({ partId: null, catalogNumber: item.catalogNumber, name: null, reason: 'Część nie istnieje.' });
            continue;
          }

          const targetQuantity = new Prisma.Decimal(item.fileQuantity);
          const currentQuantity = new Prisma.Decimal(part.currentQuantity);

          if (targetQuantity.lessThan(0)) {
            failed.push({
              partId: part.id,
              catalogNumber: part.catalogNumber,
              name: part.name,
              reason: 'Docelowa ilość nie może być ujemna.',
            });
            continue;
          }

          if (requiresIntegerUnit(part.unit) && !targetQuantity.isInteger()) {
            failed.push({
              partId: part.id,
              catalogNumber: part.catalogNumber,
              name: part.name,
              reason: 'Dla tej jednostki wymagana jest ilość całkowita.',
            });
            continue;
          }

          const difference = targetQuantity.minus(currentQuantity);

          if (difference.isZero()) {
            skipped.push({
              partId: part.id,
              catalogNumber: part.catalogNumber,
              name: part.name,
              reason: 'Ilości są już zgodne.',
            });
            continue;
          }

          if (requiresIntegerUnit(part.unit) && !difference.isInteger()) {
            failed.push({
              partId: part.id,
              catalogNumber: part.catalogNumber,
              name: part.name,
              reason: 'Korekta spowodowałaby wartości niecałkowite.',
            });
            continue;
          }

          const updatedPart = await tx.part.update({
            where: { id: part.id },
            data: { currentQuantity: targetQuantity },
          });

          const movement = await tx.stockMovement.create({
            data: {
              partId: part.id,
              movementType: StockMovementType.ADJUSTMENT,
              quantity: difference,
              movementDate: timestamp,
              notes: 'Korekta wg importu SAP',
              referenceCode: 'IMPORT_SAP',
              performedById: req.user?.id ?? null,
            },
            select: { id: true },
          });

          applied.push({
            partId: updatedPart.id,
            catalogNumber: updatedPart.catalogNumber,
            name: part.name,
            previousQuantity: Number(currentQuantity),
            newQuantity: Number(targetQuantity),
            difference: Number(difference),
            movementId: movement.id,
          });
        }
      });

      return res.json({ applied, skipped, failed });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Nieprawidłowe dane', details: error.flatten() });
      }
      return next(error);
    }
  },
);

export default router;
