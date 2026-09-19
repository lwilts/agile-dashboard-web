import { PriceData } from '../types';
import { config } from '../config';
import { cache } from './cache';
import { localMidnight, toLocalDateString } from '../utils/dates';

interface OctopusApiResponse {
  results: Array<{
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
  }>;
}

const parsePriceData = (data: OctopusApiResponse, targetDate: Date): PriceData[] => {
  const prices: PriceData[] = [];
  const targetDateStr = toLocalDateString(targetDate);

  for (const item of data.results) {
    const validFrom = new Date(item.valid_from);

    // Only include prices for the target date
    if (toLocalDateString(validFrom) === targetDateStr) {
      prices.push({
        hour: validFrom.getHours(),
        minute: validFrom.getMinutes(),
        price: item.value_inc_vat,
        timestamp: validFrom,
      });
    }
  }

  return prices.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
};

interface PriceFetchResult {
  prices: PriceData[];
  stale: boolean;
}

const fetchElectricityPrices = async (date: Date): Promise<PriceFetchResult> => {
  const dateStr = toLocalDateString(date);
  const cacheKey = `prices_${dateStr}`;
  const cached = cache.get(cacheKey);

  if (cached && !cached.stale) {
    return { prices: cached.data, stale: false };
  }

  try {
    const url = `https://api.octopus.energy/v1/products/${config.agileProduct}/electricity-tariffs/E-1R-${config.agileProduct}-${config.region}/standard-unit-rates/`;

    // Ask for the local day, expressed in UTC - not the UTC day, which is an
    // hour out of step with it under BST.
    const params = new URLSearchParams({
      period_from: localMidnight(date).toISOString(),
      period_to: localMidnight(date, 1).toISOString(),
    });

    const response = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OctopusApiResponse = await response.json();
    const prices = parsePriceData(data, date);

    if (prices.length > 0) {
      cache.set(cacheKey, prices);
    }

    return { prices, stale: false };
  } catch (error) {
    // A stale cache entry beats a blank screen - fall back to it and let
    // the caller mark the result as such, rather than swallowing the
    // failure into an empty array indistinguishable from "no data published".
    if (cached) {
      console.warn(`Using stale prices for ${dateStr} after a fetch failure:`, error);
      return { prices: cached.data, stale: true };
    }
    throw error;
  }
};

export const fetchTodayAndTomorrowPrices = async (): Promise<{
  today: PriceData[];
  tomorrow: PriceData[];
  stale: boolean;
}> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayResult, tomorrowResult] = await Promise.allSettled([
    fetchElectricityPrices(today),
    fetchElectricityPrices(tomorrow),
  ]);

  // A rejected fetch for today is a real failure with nothing to show.
  // Tomorrow rejecting (or simply having no rows yet) is the normal state
  // before Octopus publishes around 4pm, so it degrades to "not available"
  // rather than propagating an error.
  if (todayResult.status === 'rejected') {
    throw todayResult.reason;
  }

  return {
    today: todayResult.value.prices,
    tomorrow: tomorrowResult.status === 'fulfilled' ? tomorrowResult.value.prices : [],
    stale: todayResult.value.stale,
  };
};
