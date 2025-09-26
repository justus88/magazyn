import { Router } from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

const INTEGER_UNITS = new Set(['szt', 'szt.', 'pcs', 'pc']);
const numberFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const integerNumberFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface ColumnDefinition {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

const columns: ColumnDefinition[] = [
  { header: 'Lp.', width: 25, align: 'center' },
  { header: 'Numer katalogowy', width: 90 },
  { header: 'Nazwa', width: 130 },
  { header: 'Kategoria', width: 80 },
  { header: 'Stan', width: 65, align: 'right' },
  { header: 'Minimalny', width: 65, align: 'right' },
  { header: 'Lokalizacja', width: 60 },
];

const tableWidth = columns.reduce((total, column) => total + column.width, 0);
const cellPadding = 4;
const minRowHeight = 18;
const headerHeight = 20;

const fonts = {
  regular: path.resolve(__dirname, '..', '..', 'assets', 'fonts', 'DM-Sans-Regular.ttf'),
  bold: path.resolve(__dirname, '..', '..', 'assets', 'fonts', 'DM-Sans-Bold.ttf'),
};

function requiresIntegerUnit(unit?: string | null) {
  if (!unit) {
    return false;
  }
  return INTEGER_UNITS.has(unit.trim().toLowerCase());
}

function formatQuantity(value: Prisma.Decimal | number, unit: string | null | undefined) {
  const numericValue = Number(value);
  const formatter = requiresIntegerUnit(unit) ? integerNumberFormatter : numberFormatter;
  return `${formatter.format(numericValue)}${unit ? ` ${unit}` : ''}`.trim();
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function computeRowHeight(doc: PdfDoc, texts: string[]) {
  let contentHeight = 0;
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index]!;
    const text = texts[index] ?? '';
    const width = column.width - cellPadding * 2;
    const height = doc.heightOfString(text || ' ', {
      width,
      align: column.align ?? 'left',
    });
    contentHeight = Math.max(contentHeight, height);
  }
  return Math.max(minRowHeight, contentHeight + cellPadding * 2);
}

router.get(
  '/inventory',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SERWISANT),
  async (req, res, next) => {
    try {
      const parts = await prisma.part.findMany({
        where: { isDeleted: false },
        include: { category: true },
        orderBy: [{ name: 'asc' }],
      });

      const generatedAt = new Date();
      const filename = `stan-magazynowy-${generatedAt.toISOString().slice(0, 10)}-${generatedAt
        .toISOString()
        .slice(11, 16)
        .replace(':', '')}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const startX = doc.page.margins.left + Math.max(0, (pageWidth - tableWidth) / 2);
      const columnPositions: number[] = [];

      columns.reduce((offset, column) => {
        columnPositions.push(startX + offset);
        return offset + column.width;
      }, 0);

      doc.registerFont('ReportBody', fonts.regular);
      doc.registerFont('ReportBodyBold', fonts.bold);

      doc.pipe(res);

      doc.font('ReportBodyBold').fontSize(18).text('Raport stanu magazynowego', {
        align: 'center',
      });

      doc.moveDown(0.3);
      doc.font('ReportBody').fontSize(10).text(`Wygenerowano: ${dateTimeFormatter.format(generatedAt)}`, {
        align: 'center',
      });
      if (req.user) {
        doc.text(`Użytkownik: ${req.user.email}`, { align: 'center' });
      }
      doc.moveDown(1);

      const totalQuantity = parts.reduce((accumulator, part) => accumulator + Number(part.currentQuantity), 0);

      doc.font('ReportBodyBold').fontSize(12).text(`Łącznie pozycji: ${parts.length}`);
      doc.font('ReportBody').fontSize(12).text(`Suma bieżących ilości: ${numberFormatter.format(totalQuantity)}`);
      doc.moveDown(0.6);

      doc.fontSize(9);

      function ensureSpace(neededHeight: number) {
        const bottomLimit = doc.page.height - doc.page.margins.bottom;
        if (doc.y + neededHeight > bottomLimit) {
          doc.addPage();
          doc.fontSize(9);
          return true;
        }
        return false;
      }

      function drawHeader() {
        ensureSpace(headerHeight + 2);
        const y = doc.y;

        doc.save();
        doc.fillColor('#1f2937');
        doc.rect(startX, y, tableWidth, headerHeight).fill('#1f2937');
        doc.fillColor('#ffffff');
        doc.font('ReportBodyBold');
        for (let index = 0; index < columns.length; index += 1) {
          const column = columns[index]!;
          const x = columnPositions[index]! + cellPadding;
          doc.text(column.header, x, y + cellPadding / 2, {
            width: column.width - cellPadding * 2,
            align: column.align ?? 'left',
          });
        }
        doc.restore();
        doc.y = y + headerHeight;
        doc.moveDown(0.2);
      }

      function drawRow(texts: string[], highlight: boolean) {
        const rowHeight = computeRowHeight(doc, texts);
        const newPageCreated = ensureSpace(rowHeight + 2);
        if (newPageCreated) {
          drawHeader();
        }
        const y = doc.y;

        if (highlight) {
          doc.save();
          doc.fillColor('#fdecea');
          doc.rect(startX, y, tableWidth, rowHeight).fill('#fdecea');
          doc.restore();
        }

        doc.save();
        doc.strokeColor('#d1d5db');
        doc.font('ReportBody');
        for (let index = 0; index < columns.length; index += 1) {
          const column = columns[index]!;
          const text = texts[index];
          const x = columnPositions[index]!;

          doc.rect(x, y, column.width, rowHeight).stroke();
          doc.fillColor('#111827').text(text ?? '', x + cellPadding, y + cellPadding, {
            width: column.width - cellPadding * 2,
            align: column.align ?? 'left',
          });
        }
        doc.restore();

        doc.y = y + rowHeight;
      }

      drawHeader();

      parts.forEach((part, index) => {
        const currentQuantity = Number(part.currentQuantity);
        const minimumQuantity = part.minimumQuantity !== null ? Number(part.minimumQuantity) : null;
        const belowMinimum = minimumQuantity !== null && currentQuantity < minimumQuantity;
        const rowTexts = [
          String(index + 1),
          part.catalogNumber,
          part.name,
          part.category?.name ?? '—',
          formatQuantity(currentQuantity, part.unit),
          minimumQuantity !== null ? formatQuantity(minimumQuantity, part.unit) : '—',
          part.storageLocation ?? '—',
        ];

        drawRow(rowTexts, belowMinimum);
      });

      if (parts.length === 0) {
        drawRow(['—', 'Brak danych', '—', '—', '—', '—', '—'], false);
      }

      doc.end();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
