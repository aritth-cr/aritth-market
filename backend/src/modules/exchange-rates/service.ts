import { env } from '../../config/env.js';
import { prisma } from '../../shared/prisma/client.js';

interface ExchangeRates {
  usdRate: number;
  eurRate: number;
  source: string;
  date: Date;
}

/**
 * Obtiene los tipos de cambio del día.
 * Fuente primaria: ExchangeRate-API (1500 req/mes gratis)
 * Fallback: Tasas manuales configuradas en .env
 */
export async function getTodayRates(): Promise<ExchangeRates> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buscar en base de datos primero (cache)
  const cached = await prisma.exchangeRate.findFirst({
    where: { date: today },
  });

  if (cached) {
    return {
      usdRate: Number(cached.usdRate),
      eurRate: Number(cached.eurRate),
      source: cached.source,
      date: cached.date,
    };
  }

  // Intentar obtener de ExchangeRate-API
  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/CRC`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (response.ok) {
      const data = await response.json() as {
        conversion_rates: Record<string, number>;
      };

      const usdRate = 1 / data.conversion_rates['USD']!;
      const eurRate = 1 / data.conversion_rates['EUR']!;

      // Guardar en BD
      await prisma.exchangeRate.upsert({
        where: { date: today },
        create: { date: today, usdRate, eurRate, source: 'exchangerate-api' },
        update: { usdRate, eurRate },
      });

      return { usdRate, eurRate, source: 'exchangerate-api', date: today };
    }
  } catch (err) {
    console.warn('[ExchangeRate] API falló, usando tasas de fallback:', err);
  }

  // Fallback a tasas manuales
  return {
    usdRate: env.FALLBACK_USD_RATE,
    eurRate: env.FALLBACK_EUR_RATE,
    source: 'fallback-manual',
    date: today,
  };
}

/**
 * Convierte un monto en CRC a USD y EUR
 */
export async function convertFromCRC(amountCRC: number): Promise<{
  crc: number;
  usd: number;
  eur: number;
  rates: { usd: number; eur: number };
}> {
  const { usdRate, eurRate } = await getTodayRates();

  return {
    crc: amountCRC,
    usd: Math.round((amountCRC / usdRate) * 100) / 100,
    eur: Math.round((amountCRC / eurRate) * 100) / 100,
    rates: { usd: usdRate, eur: eurRate },
  };
}
