export interface PriceData {
  hour: number;
  minute: number;
  price: number;
  timestamp: Date;
}

export interface WeatherData {
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
}

export interface GasData {
  // `null` means "unknown" (not yet fetched, or the last fetch failed) -
  // distinct from a real 0.0p/kWh rate, which does happen.
  today: number | null;
  tomorrow: number | null;
}

export interface Config {
  region: string;
  agileProduct: string;
  gasProduct: string;
  weatherLat: number;
  weatherLon: number;
  thresholdCheap: number;
  thresholdModerate: number;
  thresholdExpensive: number;
}

export type WeatherIconType =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rainy'
  | 'snowy'
  | 'stormy'
  | 'foggy'
  | 'unknown';

/**
 * The wire shape of a cached PriceData[]. `timestamp` is an ISO string here,
 * not a `Date` - JSON has no date type, and `cache.get()` is what rehydrates
 * it. Keeping this distinct from `PriceData` stops that rehydration step
 * from type-checking against a lie.
 */
export interface SerializedPriceData {
  hour: number;
  minute: number;
  price: number;
  timestamp: string;
}

export interface CachedPriceData {
  data: SerializedPriceData[];
  timestamp: string;
}
