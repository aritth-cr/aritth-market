/**
 * CLI para ejecutar scrapers manualmente:
 * npm run scrape:epa
 * npm run scrape:novex
 */
import { prisma } from '../../shared/prisma/client.js';
import { runScraping, createScrapingJob } from './engine.js';

const storeName = process.argv[2]?.toLowerCase();

if (!storeName) {
  console.error('Uso: tsx src/modules/scraping/cli.ts <epa|novex>');
  process.exit(1);
}

async function main() {
  const store = await prisma.sourceStore.findFirst({
    where: { scraperClass: storeName, isActive: true },
  });

  if (!store) {
    console.error(`❌ Tienda "${storeName}" no encontrada en BD. Asegúrate de hacer seed primero.`);
    process.exit(1);
  }

  console.log(`🕷️  Iniciando scraping de ${store.name}...`);
  const jobId = await createScrapingJob(store.id);
  await runScraping(store.id, jobId);

  await prisma.$disconnect();
  console.log('✅ Scraping completado');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
