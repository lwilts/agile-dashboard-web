import { GasData } from '../types';
import { config } from '../config';

interface GasApiResponse {
  results: Array<{
    value_inc_vat: number;
    valid_from: string;
    valid_to: string;
  }>;
}

export const fetchGasPrices = async (): Promise<GasData> => {
  try {
    const now = new Date();
    // Get local dates (not UTC)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const url = `https://api.octopus.energy/v1/products/${config.gasProduct}/gas-tariffs/G-1R-${config.gasProduct}-${config.region}/standard-unit-rates/`;

    // Request from today to end of tomorrow (in UTC)
    const params = new URLSearchParams({
      period_from: `${todayStr}T00:00:00Z`,
      period_to: `${tomorrowStr}T23:59:59Z`,
    });

    console.log('Fetching gas prices...');
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GasApiResponse = await response.json();

    console.log('Gas API response:', data);
    console.log('Looking for dates - Today:', todayStr, 'Tomorrow:', tomorrowStr);

    let todayPrice = 0;
    let tomorrowPrice: number | null = null;

    for (const item of data.results) {
      // Parse UTC time - JavaScript Date automatically converts to local
      const validFromUtc = new Date(item.valid_from);

      // Get local date components
      const localYear = validFromUtc.getFullYear();
      const localMonth = validFromUtc.getMonth();
      const localDay = validFromUtc.getDate();

      // Create a date object for comparison (midnight local time)
      const localDate = new Date(localYear, localMonth, localDay);
      const validFromDateStr = localDate.toISOString().split('T')[0];

      console.log('Gas price entry UTC:', item.valid_from, '-> Local date:', validFromDateStr, 'Price:', item.value_inc_vat);

      if (validFromDateStr === todayStr) {
        todayPrice = item.value_inc_vat;
      } else if (validFromDateStr === tomorrowStr) {
        tomorrowPrice = item.value_inc_vat;
      }
    }

    console.log(`Gas - Today: ${todayPrice}p, Tomorrow: ${tomorrowPrice}p`);

    return {
      today: todayPrice,
      tomorrow: tomorrowPrice,
    };
  } catch (error) {
    console.error('Error fetching gas prices:', error);
    return {
      today: 0,
      tomorrow: null,
    };
  }
};
