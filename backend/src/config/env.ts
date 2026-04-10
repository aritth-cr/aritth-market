import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  APP_NAME: z.string().default('Aritth Market'),
  APP_PREFIX: z.string().default('AMT'),
  FRONTEND_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Clerk
  CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  CLERK_SECRET_KEY: z.string().startsWith('sk_'),

  // Gemini AI
  GEMINI_API_KEY: z.string().min(1),

  // Email
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().default('Aritth Market <ventas@aritth.com>'),
  INTERNAL_EMAIL: z.string().email().default('ventas@aritth.com'),

  // Exchange rates
  EXCHANGE_RATE_API_KEY: z.string().min(1),
  FALLBACK_USD_RATE: z.coerce.number().default(510),
  FALLBACK_EUR_RATE: z.coerce.number().default(560),

  // Storage
  STORAGE_PATH: z.string().default('./storage'),
  STORAGE_MODE: z.enum(['local']).default('local'),

  // Scraping
  SCRAPING_DELAY_MS: z.coerce.number().default(1200),
  MAX_PAGES_PER_CATEGORY: z.coerce.number().default(10),
  USER_AGENT: z.string().default('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),

  // Pricing
  DEFAULT_MARGIN: z.coerce.number().default(0.10),
  IVA_RATE: z.coerce.number().default(0.13),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
