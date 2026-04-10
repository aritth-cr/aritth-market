import { buildApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/prisma/client.js';
import { registerOverdueCron, overdueWorker, overdueQueue } from './modules/invoices/cron.js';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`\n🚀 Aritth Market API corriendo en http://${env.HOST}:${env.PORT}`);
    console.log(`📊 Health: http://localhost:${env.PORT}/health`);
    console.log(`🌿 Entorno: ${env.NODE_ENV}\n`);

    // ---- CRON JOBS ----
    await registerOverdueCron();
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Cerrando servidor...`);
    await overdueWorker.close();
    await overdueQueue.close();
    await app.close();
    await prisma.$disconnect();
    console.log('✅ Servidor cerrado limpiamente');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
