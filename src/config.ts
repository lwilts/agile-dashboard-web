import { Config } from './types';

// Runtime config type (from Docker entrypoint)
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      VITE_OCTOPUS_REGION: string;
      VITE_AGILE_PRODUCT: string;
      VITE_GAS_PRODUCT: string;
      VITE_WEATHER_LAT: number;
      VITE_WEATHER_LON: number;
      VITE_THRESHOLD_CHEAP: number;
      VITE_THRESHOLD_MODERATE: number;
      VITE_THRESHOLD_EXPENSIVE: number;
    };
  }
}

type RuntimeConfigKey = keyof NonNullable<Window['RUNTIME_CONFIG']>;

// Read configuration from environment variables (with defaults).
// Supports both build-time (Vite) and runtime (Docker) configuration.
//
// Presence is checked explicitly (`!== undefined`) rather than by truthiness.
// `0` and `''` are valid configured values here - a weather longitude of 0
// (Greenwich) or a price threshold of 0 - and `value || default` would
// silently discard them.
const getEnvVar = (key: RuntimeConfigKey, defaultValue: string): string => {
  const runtimeValue = window.RUNTIME_CONFIG?.[key];
  if (runtimeValue !== undefined) return String(runtimeValue);

  const buildValue = import.meta.env[key];
  return buildValue !== undefined && buildValue !== '' ? buildValue : defaultValue;
};

const getEnvNumber = (key: RuntimeConfigKey, defaultValue: number): number => {
  const runtimeValue = window.RUNTIME_CONFIG?.[key];
  if (runtimeValue !== undefined) {
    const parsed = typeof runtimeValue === 'number' ? runtimeValue : parseFloat(String(runtimeValue));
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }

  const buildValue = import.meta.env[key];
  if (buildValue === undefined || buildValue === '') return defaultValue;
  const parsed = parseFloat(buildValue);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const config: Config = {
  region: getEnvVar('VITE_OCTOPUS_REGION', 'C'),
  agileProduct: getEnvVar('VITE_AGILE_PRODUCT', 'AGILE-24-10-01'),
  gasProduct: getEnvVar('VITE_GAS_PRODUCT', 'SILVER-25-09-02'),
  weatherLat: getEnvNumber('VITE_WEATHER_LAT', 51.5074),
  weatherLon: getEnvNumber('VITE_WEATHER_LON', -0.1278),
  thresholdCheap: getEnvNumber('VITE_THRESHOLD_CHEAP', 10),
  thresholdModerate: getEnvNumber('VITE_THRESHOLD_MODERATE', 20),
  thresholdExpensive: getEnvNumber('VITE_THRESHOLD_EXPENSIVE', 35),
};

// Colour tokens - the single source for both the CSS custom properties
// (mirrored onto :root in main.tsx) and the few call sites that need a
// literal value rather than a class.
export const colors = {
  background: 'rgb(17, 24, 39)',
  text: 'rgb(255, 255, 255)',
  blue: 'rgb(59, 130, 246)',
  orange: 'rgb(251, 146, 60)',
  green: 'rgb(34, 197, 94)',
  red: 'rgb(239, 68, 68)',
  yellow: 'rgb(234, 179, 8)',
  gridline: 'rgb(100, 110, 130)',
  zeroLine: 'rgb(180, 180, 200)',
  tomorrowBg: 'rgb(40, 50, 70)',
  tomorrowLabel: 'rgb(230, 230, 240)',
};

/**
 * A price band, not a colour. SVG presentation attributes (`fill="..."`)
 * can't read CSS custom properties - `fill="var(--c-green)"` renders black,
 * because `var()` only resolves inside a CSS declaration. So callers select
 * a colour via a `.band--<name>` class instead of a literal string; this is
 * the one encoding both the stat tiles and the chart bars share.
 */
export type PriceBand = 'cheap' | 'moderate' | 'expensive' | 'peak';

export const BAND_ORDER: readonly PriceBand[] = ['cheap', 'moderate', 'expensive', 'peak'];

export const getPriceBand = (price: number): PriceBand => {
  if (price < config.thresholdCheap) return 'cheap';
  if (price < config.thresholdModerate) return 'moderate';
  if (price < config.thresholdExpensive) return 'expensive';
  return 'peak';
};

/**
 * Literal colour for a band - for the handful of places that can't use a
 * CSS class (canvas/image export, a <meta theme-color>). Tiles and bars
 * should use `.band--<name>` instead so there is exactly one place price
 * maps to colour.
 */
export const bandColor = (band: PriceBand): string => {
  switch (band) {
    case 'cheap':
      return colors.green;
    case 'moderate':
      return colors.blue;
    case 'expensive':
      return colors.yellow;
    case 'peak':
      return colors.red;
  }
};
