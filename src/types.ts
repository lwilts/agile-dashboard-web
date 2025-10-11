export interface PriceData {
  hour: number;
  minute: number;
  price: number;
  timestamp: Date;
  date: Date;
}

export interface WeatherData {
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
}

export interface GasData {
  today: number;
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

export interface CachedPriceData {
  data: PriceData[];
  timestamp: string;
}
