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

// Read configuration from environment variables (with defaults)
// Supports both build-time (Vite) and runtime (Docker) configuration
const getEnvVar = (key: string, defaultValue: string): string => {
  // Try runtime config first (Docker)
  if (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG[key as keyof typeof window.RUNTIME_CONFIG]) {
    return String(window.RUNTIME_CONFIG[key as keyof typeof window.RUNTIME_CONFIG]);
  }
  // Fall back to build-time config (Vite)
  // @ts-ignore - import.meta.env is Vite-specific
  return import.meta.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  // Try runtime config first (Docker)
  if (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG[key as keyof typeof window.RUNTIME_CONFIG]) {
    const value = window.RUNTIME_CONFIG[key as keyof typeof window.RUNTIME_CONFIG];
    return typeof value === 'number' ? value : parseFloat(String(value));
  }
  // Fall back to build-time config (Vite)
  // @ts-ignore
  const value = import.meta.env[key];
  return value ? parseFloat(value) : defaultValue;
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

// Color scheme
export const colors = {
  background: 'rgb(17, 24, 39)',
  text: 'rgb(255, 255, 255)',
  blue: 'rgb(59, 130, 246)',
  orange: 'rgb(251, 146, 60)',
  green: 'rgb(34, 197, 94)',
  red: 'rgb(239, 68, 68)',
  yellow: 'rgb(234, 179, 8)',
  gridline: 'rgb(100, 110, 130)',
  tomorrowBg: 'rgb(40, 50, 70)',
  tomorrowLabel: 'rgb(230, 230, 240)',
};

export const getPriceColor = (price: number): string => {
  if (price < config.thresholdCheap) return colors.green;
  if (price < config.thresholdModerate) return colors.blue;
  if (price < config.thresholdExpensive) return colors.yellow;
  return colors.red;
};
