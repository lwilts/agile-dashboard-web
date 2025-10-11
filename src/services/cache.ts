import { PriceData, CachedPriceData } from '../types';

const CACHE_PREFIX = 'agile_dashboard_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export const cache = {
  set: (key: string, data: PriceData[]): void => {
    try {
      const cached: CachedPriceData = {
        data,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  },

  get: (key: string): PriceData[] | null => {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;

      const cached: CachedPriceData = JSON.parse(item);
      const cachedTime = new Date(cached.timestamp).getTime();
      const now = new Date().getTime();

      // Check if cache is expired
      if (now - cachedTime > CACHE_EXPIRY_MS) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      // Deserialize dates
      return cached.data.map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
        date: new Date(item.date),
      }));
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  },

  clear: (key?: string): void => {
    try {
      if (key) {
        localStorage.removeItem(CACHE_PREFIX + key);
      } else {
        // Clear all cache entries
        const keys = Object.keys(localStorage);
        keys.forEach((k) => {
          if (k.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  cleanOldCaches: (): void => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX + 'prices_')) {
          const dateStr = key.replace(CACHE_PREFIX + 'prices_', '');
          if (dateStr < today) {
            localStorage.removeItem(key);
            console.log('Removed old cache:', key);
          }
        }
      });
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  },
};
