import { PriceData, GasData, WeatherData } from '../types';

const SLOT_MINUTES = 30;

/**
 * Dev-only fixtures for states that can't be produced from live data on
 * demand: negative pricing, a flat/zero range, a near-midnight sliver
 * window, and 46/50-slot DST days. Wired up behind `?mock=<scenario>` in
 * App.tsx, itself gated on `import.meta.env.DEV` so none of this reaches a
 * production build.
 */

const makeDay = (base: Date, priceFn: (i: number, slots: number) => number, slots = 48): PriceData[] => {
  const day = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const prices: PriceData[] = [];
  for (let i = 0; i < slots; i++) {
    const ts = new Date(day.getTime() + i * SLOT_MINUTES * 60000);
    prices.push({ hour: ts.getHours(), minute: ts.getMinutes(), price: Math.round(priceFn(i, slots) * 10) / 10, timestamp: ts });
  }
  return prices;
};

// A gentle day/night wave with an evening spike, similar in shape to a real
// Agile day, so the chart's gridline/hour-label step selection has
// realistic variation to react to.
const wavePrice = (i: number, slots: number): number => {
  const base = 15 + 12 * Math.sin((i / slots) * Math.PI * 2 - Math.PI / 2);
  const eveningSpike = i > slots * 0.6 && i < slots * 0.75 ? 18 : 0;
  return base + eveningSpike;
};

const nextDay = (d: Date): Date => new Date(d.getTime() + 24 * 60 * 60 * 1000);

export interface MockScenario {
  today: PriceData[];
  tomorrow: PriceData[];
  gas: GasData;
  weather: WeatherData | null;
  /** Simulates a total price-fetch failure (with no cache to fall back on) rather than any particular data shape. */
  failPrices?: boolean;
}

export const buildMockScenario = (name: string, now: Date): MockScenario => {
  const weather: WeatherData = { minTemp: 8, maxTemp: 16, weatherCode: 3 };
  const gas: GasData = { today: 6.2, tomorrow: 6.4 };

  switch (name) {
    case 'negatives':
      return {
        today: makeDay(now, (i, n) => (i < 6 ? -2 - i * 0.6 : wavePrice(i, n))),
        tomorrow: makeDay(nextDay(now), wavePrice),
        gas,
        weather,
      };

    case 'all-negative':
      return { today: makeDay(now, () => -3.5), tomorrow: [], gas, weather };

    case 'flat':
      return { today: makeDay(now, () => 15), tomorrow: makeDay(nextDay(now), () => 15), gas, weather };

    case 'all-zero':
      // The one true zero-span case: every slot at exactly 0.0p, so the
      // domain [min(0,0), max(0,0)] collapses to a single point.
      return { today: makeDay(now, () => 0), tomorrow: [], gas, weather };

    case 'one-slot':
      return { today: makeDay(now, wavePrice).slice(-1), tomorrow: [], gas, weather };

    case 'no-tomorrow':
      return { today: makeDay(now, wavePrice), tomorrow: [], gas: { today: gas.today, tomorrow: null }, weather };

    case 'huge-range':
      return {
        today: makeDay(now, (i, n) => (i < 4 ? -8 : i > 40 ? 95 : wavePrice(i, n))),
        tomorrow: makeDay(nextDay(now), wavePrice),
        gas,
        weather,
      };

    case 'dst-back':
      // The October clock-change day: 01:00 occurs twice, 50 half-hour slots.
      return { today: makeDay(now, wavePrice, 50), tomorrow: [], gas, weather };

    case 'dst-fwd':
      // The March clock-change day: 01:00-02:00 doesn't exist, 46 slots.
      return { today: makeDay(now, wavePrice, 46), tomorrow: [], gas, weather };

    case 'gas-null':
      return {
        today: makeDay(now, wavePrice),
        tomorrow: makeDay(nextDay(now), wavePrice),
        gas: { today: null, tomorrow: null },
        weather: null,
      };

    case 'apifail':
      return { today: [], tomorrow: [], gas: { today: null, tomorrow: null }, weather: null, failPrices: true };

    default:
      return { today: makeDay(now, wavePrice), tomorrow: makeDay(nextDay(now), wavePrice), gas, weather };
  }
};
