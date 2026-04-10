/**
 * CRON: Facturas vencidas
 * Cada hora, cambia SENT → OVERDUE cuando dueDate < now()
 */
import { Queue, Worker, type Job } from 'bullmq';
import { prisma } from '../../shared/prisma/client.js';

const QUEUE_NAME = 'invoice-overdue';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// Parsear URL de Redis para BullMQ
function getRedisConnection() {
  const url = new URL(REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    ...(url.password ? { password: url.password } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

const connection = getRedisConnection();

// ---- QUEUE ----
export const overdueQueue = new Queue(QUEUE_NAME, { connection });

// ---- WORKER ----
export const overdueWorker = new Worker(
  QUEUE_NAME,
  async (_job: Job) => {
    const now = new Date();

    const result = await prisma.invoice.updateMany({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });

    if (result.count > 0) {
      console.log(`[invoice-overdue] ${result.count} factura(s) marcadas OVERDUE`);
    }

    return { updated: result.count, checkedAt: now.toISOString() };
  },
  { connection },
);

overdueWorker.on('completed', (job, result) => {
  if (result.updated > 0) {
    console.log(`[invoice-overdue] Job ${job.id} completado — ${result.updated} actualizadas`);
  }
});

overdueWorker.on('failed', (job, err) => {
  console.error(`[invoice-overdue] Job ${job?.id} falló:`, err.message);
});

// ---- REGISTRAR JOB REPETIBLE ----
export async function registerOverdueCron() {
  // Ejecutar cada hora; BullMQ deduplicará si ya existe
  await overdueQueue.add(
    'check-overdue',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // cada hora en minuto 0
      jobId: 'overdue-cron-singleton',
    },
  );
}