/**
 * Seed inicial de tiendas fuente.
 * Ejecutar: npx tsx src/modules/scraping/seed.ts
 */
import { prisma } from '../../shared/prisma/client.js';

async function main() {
  console.log('🌱 Creando tiendas fuente...');

  const stores = [
    {
      name: 'EPA',
      baseUrl: 'https://www.epa.cr',
      scraperClass: 'epa',
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      openingHour: 8,
      closingHour: 19,
      scrapingIntervalHours: 12,
    },
    {
      name: 'Novex',
      baseUrl: 'https://www.novex.cr',
      scraperClass: 'novex',
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      openingHour: 8,
      closingHour: 18,
      scrapingIntervalHours: 12,
    },
    {
      name: 'El Lagar',
      baseUrl: 'https://www.ellagar.cr',
      scraperClass: 'ellagar',
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      isActive: false, // Pendiente de implementar scraper
      scrapingIntervalHours: 24,
    },
    {
      name: 'Colono',
      baseUrl: 'https://www.colono.cr',
      scraperClass: 'colono',
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'],
      openingHour: 7,
      closingHour: 18,
      isActive: false, // Pendiente
      scrapingIntervalHours: 24,
    },
    {
      name: 'Gravilias',
      baseUrl: 'https://www.gravilias.cr',
      scraperClass: 'gravilias',
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      isActive: false, // Pendiente
      scrapingIntervalHours: 24,
    },
  ];

  for (const store of stores) {
    await prisma.sourceStore.upsert({
      where: { name: store.name },
      create: store,
      update: store,
    });
    console.log(`  ✅ ${store.name}`);
  }

  console.log('\n🌱 Creando secuencias de documentos...');
  // Las sequences se crean manualmente en Postgres
  // ALTER SEQUENCE quote_seq START 1;
  // ALTER SEQUENCE order_seq START 1;
  // ALTER SEQUENCE invoice_seq START 1;

  console.log('\n✅ Seed completado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
