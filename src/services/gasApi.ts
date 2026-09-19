import { GasData } from '../types';
import { config } from '../config';
import { localMidnight, toLocalDateString } from '../utils/dates';

interface GasApiResponse {
  results: Array<{
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
  }>;
}

/**
 * The rate in force for `dateStr`. Results arrive newest-first, so on a
 * rate-change day picking the first match (after an explicit sort, not
 * assumed ordering) gives the most recent rate rather than whichever one a
 * loop without a `break` happened to overwrite last.
 */
const priceForDate = (results: GasApiResponse['results'], dateStr: string): number | null => {
  const sorted = [...results].sort((a, b) => new Date(b.valid_from).getTime() - new Date(a.valid_from).getTime());
  const match = sorted.find((item) => toLocalDateString(new Date(item.valid_from)) === dateStr);
  return match ? match.value_inc_vat : null;
};

export const fetchGasPrices = async (): Promise<GasData> => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const url = `https://api.octopus.energy/v1/products/${config.gasProduct}/gas-tariffs/G-1R-${config.gasProduct}-${config.region}/standard-unit-rates/`;
  const params = new URLSearchParams({
    period_from: localMidnight(today).toISOString(),
    period_to: localMidnight(tomorrow, 1).toISOString(),
  });

  const response = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data: GasApiResponse = await response.json();

  return {
    today: priceForDate(data.results, toLocalDateString(today)),
    tomorrow: priceForDate(data.results, toLocalDateString(tomorrow)),
  };
};
