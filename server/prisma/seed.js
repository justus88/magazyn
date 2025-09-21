const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  { name: 'Czujniki', description: 'Elementy do monitorowania parametrów urządzeń.' },
  { name: 'Smar', description: 'Środki smarne stosowane przy serwisie.' },
  { name: 'Elementy złączne', description: 'Śruby, nakrętki i podkładki.' },
  { name: 'Elementy elektryczne', description: 'Przyciski, przełączniki i akcesoria elektryczne.' },
  { name: 'Wentylatory', description: 'Wentylatory i elementy chłodzące.' },
  { name: 'Akcesoria', description: 'Pozostałe narzędzia i wyposażenie.' },
];

const rawParts = [
  { catalogNumber: '024329003711', name: 'Czujnik temperatury typ TT02-P', category: 'Czujniki', unit: 'szt', quantity: 1 },
  { catalogNumber: '024416000107', name: 'Smar Aliten N do przekładni zębatej', category: 'Smar', unit: 'kg', quantity: 0 },
  { catalogNumber: '024419000401', name: 'Smar Aero Shell Grease 14', category: 'Smar', unit: 'kg', quantity: 0 },
  { catalogNumber: '024419003100', name: 'Smar Renolit Unitemp2 400 g', category: 'Smar', unit: 'szt', quantity: 20 },
  { catalogNumber: '062949008400', name: 'Nakretka łożyskowa KM 2', category: 'Elementy złączne', unit: 'szt', quantity: 4 },
  { catalogNumber: '063941001700', name: 'Podkładka MB 2A stal', category: 'Elementy złączne', unit: 'szt', quantity: 10 },
  { catalogNumber: '063941002500', name: 'Podkładka VS 5 A2 Schnorr', category: 'Elementy złączne', unit: 'szt', quantity: 0 },
  { catalogNumber: '063941003600', name: 'Podkładka Nord-Lock 8 A4 SS', category: 'Elementy złączne', unit: 'szt', quantity: 0 },
  { catalogNumber: '064329001400', name: 'Klucz do nakrętek Gedore 44-5', category: 'Akcesoria', unit: 'szt', quantity: 1 },
  { catalogNumber: '065269006700', name: 'Sprężyna nr MDL S11.063.254', category: 'Elementy złączne', unit: 'szt', quantity: 0 },
  { catalogNumber: '065351840710', name: 'Śruba M5x16 ISO4017 A2', category: 'Elementy złączne', unit: 'szt', quantity: 0 },
  { catalogNumber: '065351847040', name: 'Śruba M16x80 ISO4017 A2-70', category: 'Elementy złączne', unit: 'szt', quantity: 2 },
  { catalogNumber: '065355101502', name: 'Nakretka M16 ISO4035 A2', category: 'Elementy złączne', unit: 'szt', quantity: 2 },
  { catalogNumber: '065411801200', name: 'Wkładka zamka "EMKA" 1109-U1-N', category: 'Akcesoria', unit: 'szt', quantity: 0 },
  { catalogNumber: '065411905900', name: 'Zamek 1000 EMKA', category: 'Akcesoria', unit: 'szt', quantity: 0 },
  { catalogNumber: '065411906000', name: 'Klamka do kłódki 1107-U96-G', category: 'Akcesoria', unit: 'szt', quantity: 0 },
  { catalogNumber: '065411908908', name: 'Zestaw EMKA rozwojowy na serwis', category: 'Akcesoria', unit: 'szt', quantity: 0 },
  { catalogNumber: '074916410100', name: 'Przycisk płaski L21AH20', category: 'Elementy elektryczne', unit: 'szt', quantity: 3 },
  { catalogNumber: '074916410200', name: 'Przycisk płaski L21AH10', category: 'Elementy elektryczne', unit: 'szt', quantity: 2 },
  { catalogNumber: '087419004200', name: 'Wentylator NR DK 7980000', category: 'Wentylatory', unit: 'szt', quantity: 0 },
  { catalogNumber: '087419004300', name: 'Wentylator OS.4715MS-23T-B50', category: 'Wentylatory', unit: 'szt', quantity: 1 },
];

async function main() {
  const categoryMap = new Map();

  for (const category of categories) {
    const stored = await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
    categoryMap.set(category.name, stored);
  }

  for (const part of rawParts) {
    const category = categoryMap.get(part.category);
    await prisma.part.upsert({
      where: { catalogNumber: part.catalogNumber },
      update: {
        name: part.name,
        unit: part.unit,
        categoryId: category?.id,
        currentQuantity: part.quantity,
        minimumQuantity: part.quantity > 0 ? Math.min(part.quantity, 2) : 0,
      },
      create: {
        catalogNumber: part.catalogNumber,
        name: part.name,
        unit: part.unit,
        categoryId: category?.id,
        currentQuantity: part.quantity,
        minimumQuantity: part.quantity > 0 ? Math.min(part.quantity, 2) : 0,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
