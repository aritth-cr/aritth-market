// seed.ts — Base seed for Aritth Market FASE 2
// Seeds: languages, suppliers, source stores

import { PrismaClient } from '@prisma/client';
import {
  INITIAL_SUPPLIERS,
  SUPPORTED_LANGUAGES,
} from './seed-data.js';

const prisma = new PrismaClient();

async function seedSupportedLanguages() {
  console.log('Seeding supported languages...');
  for (const language of SUPPORTED_LANGUAGES) {
    await prisma.supportedLanguage.upsert({
      where: { code: language.code },
      update: {
        name: language.name,
        locale: language.locale,
        isDefault: language.isDefault,
      },
      create: language,
    });
  }
  console.log(`✓ ${SUPPORTED_LANGUAGES.length} languages seeded`);
}

async function seedInitialSuppliers() {
  console.log('Seeding initial suppliers...');
  for (const supplier of INITIAL_SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { internalCode: supplier.internalCode },
      update: supplier,
      create: supplier,
    });
  }
  console.log(`✓ ${INITIAL_SUPPLIERS.length} suppliers seeded`);
}

async function seedSourceStores() {
  console.log('Seeding source stores...');

  const stores = [
    {
      name: 'EPA',
      baseUrl: 'https://www.epa.cr',
      scraperClass: 'epa',
      isActive: true,
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 20,
      scrapingIntervalHours: 12,
    },
    {
      name: 'Novex',
      baseUrl: 'https://www.novex.cr',
      scraperClass: 'novex',
      isActive: true,
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      scrapingIntervalHours: 12,
    },
    {
      name: 'El Lagar',
      baseUrl: 'https://www.ellagar.com',
      scraperClass: 'ellagar',
      isActive: false,
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      scrapingIntervalHours: 24,
    },
    {
      name: 'Colono',
      baseUrl: 'https://www.colono.com',
      scraperClass: 'colono',
      isActive: false,
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      scrapingIntervalHours: 24,
    },
    {
      name: 'Gravilias',
      baseUrl: 'https://www.gravilias.com',
      scraperClass: 'gravilias',
      isActive: false,
      operatingDays: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
      openingHour: 8,
      closingHour: 17,
      scrapingIntervalHours: 24,
    },
  ];

  for (const store of stores) {
    await prisma.sourceStore.upsert({
      where: { name: store.name },
      update: store,
      create: store,
    });
  }

  console.log(`✓ ${stores.length} source stores seeded`);
}

async function main() {
  console.log('\n🌱 Aritth Market — FASE 2 Base Seed\n');

  await seedSupportedLanguages();
  await seedInitialSuppliers();
  await seedSourceStores();

  console.log('\n✅ Seed complete\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
