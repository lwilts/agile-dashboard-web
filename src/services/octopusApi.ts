import { PriceData } from '../types';
import { config } from '../config';
import { cache } from './cache';

interface OctopusApiResponse {
  results: Array<{
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
  }>;
}

const parsePriceData = (data: OctopusApiResponse, targetDate: Date): PriceData[] => {
  const prices: PriceData[] = [];
  const targetDateStr = targetDate.toISOString().split('T')[0];

  for (const item of data.results) {
    const validFrom = new Date(item.valid_from);
    const validFromDateStr = validFrom.toISOString().split('T')[0];

    // Only include prices for the target date
    if (validFromDateStr === targetDateStr) {
      prices.push({
        hour: validFrom.getHours(),
        minute: validFrom.getMinutes(),
        price: item.value_inc_vat,
        timestamp: validFrom,
        date: validFrom,
      });
    }
  }

  return prices.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

export const fetchElectricityPrices = async (
  date: Date
): Promise<PriceData[]> => {
  const dateStr = date.toISOString().split('T')[0];
  const cacheKey = `prices_${dateStr}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`Loaded ${cached.length} prices from cache for ${dateStr}`);
    return cached;
  }

  // Fetch from API
  try {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const url = `https://api.octopus.energy/v1/products/${config.agileProduct}/electricity-tariffs/E-1R-${config.agileProduct}-${config.region}/standard-unit-rates/`;

    const params = new URLSearchParams({
      period_from: `${dateStr}T00:00:00Z`,
      period_to: `${nextDay.toISOString().split('T')[0]}T00:00:00Z`,
    });

    console.log(`Fetching electricity prices for ${dateStr}...`);
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OctopusApiResponse = await response.json();
    const prices = parsePriceData(data, date);

    // Cache the results
    if (prices.length > 0) {
      cache.set(cacheKey, prices);
      console.log(`Cached ${prices.length} prices for ${dateStr}`);
    }

    return prices;
  } catch (error) {
    console.error(`Error fetching electricity prices for ${dateStr}:`, error);
    // Return empty array on error
    return [];
  }
};

export const fetchTodayAndTomorrowPrices = async (): Promise<{
  today: PriceData[];
  tomorrow: PriceData[];
}> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch both in parallel
  const [todayPrices, tomorrowPrices] = await Promise.all([
    fetchElectricityPrices(today),
    fetchElectricityPrices(tomorrow),
  ]);

  return {
    today: todayPrices,
    tomorrow: tomorrowPrices,
  };
};
