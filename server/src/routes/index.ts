import { Express, Request, Response } from 'express';

const sampleParts = [
  {
    id: '024329003711',
    catalogNumber: '024329003711',
    name: 'Czujnik temperatury typ TT02-P',
    category: 'Czujniki',
    availableQuantity: 1,
    unit: 'szt',
  },
  {
    id: '024416000107',
    catalogNumber: '024416000107',
    name: 'Smar Aliten N do przekładni zębatej',
    category: 'Smar',
    availableQuantity: 0,
    unit: 'kg',
  },
  {
    id: '024419003100',
    catalogNumber: '024419003100',
    name: 'Smar Renolit Unitemp2 400g',
    category: 'Smar',
    availableQuantity: 20,
    unit: 'szt',
  },
  {
    id: '062949008400',
    catalogNumber: '062949008400',
    name: 'Nakretka łożyskowa KM 2',
    category: 'Elementy złączne',
    availableQuantity: 4,
    unit: 'szt',
  },
  {
    id: '063941001700',
    catalogNumber: '063941001700',
    name: 'Podkładka MB 2A stal',
    category: 'Elementy złączne',
    availableQuantity: 10,
    unit: 'szt',
  },
  {
    id: '065351847040',
    catalogNumber: '065351847040',
    name: 'Śruba M16x80 ISO4017 A2-70',
    category: 'Elementy złączne',
    availableQuantity: 2,
    unit: 'szt',
  },
  {
    id: '074916410100',
    catalogNumber: '074916410100',
    name: 'Przycisk płaski L21AH20',
    category: 'Elementy elektryczne',
    availableQuantity: 3,
    unit: 'szt',
  },
  {
    id: '074916410200',
    catalogNumber: '074916410200',
    name: 'Przycisk płaski L21AH10',
    category: 'Elementy elektryczne',
    availableQuantity: 2,
    unit: 'szt',
  },
  {
    id: '087419004200',
    catalogNumber: '087419004200',
    name: 'Wentylator NR DK 7980000',
    category: 'Wentylatory',
    availableQuantity: 0,
    unit: 'szt',
  },
  {
    id: '087419004300',
    catalogNumber: '087419004300',
    name: 'Wentylator OS.4715MS-23T-B50',
    category: 'Wentylatory',
    availableQuantity: 1,
    unit: 'szt',
  },
];

export function registerRoutes(app: Express) {
  app.get('/api/parts', (_req: Request, res: Response) => {
    res.json({ items: sampleParts, pagination: { total: sampleParts.length } });
  });
}
