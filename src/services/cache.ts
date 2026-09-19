import { PriceData, CachedPriceData, SerializedPriceData } from '../types';
import { toLocalDateString } from '../utils/dates';

const CACHE_PREFIX = 'agile_dashboard_';

// An entry younger than this is served without a network round-trip.
const FRESH_MS = 5 * 60 * 1000;

// An entry younger than this, but no longer fresh, is still served - marked
// stale - rather than treated as absent. This matters because FRESH_MS
// equals the app's own refetch interval: with a single TTL, a scheduled
// refetch always finds the cache entry already "expired" from the moment it
// was written, so the cache would only ever help a page reload. Splitting
// the two also gives a failed refetch something to fall back on instead of
// blanking the screen.
const RETAIN_MS = 36 * 60 * 60 * 1000;

const deserialize = (data: SerializedPriceData[]): PriceData[] =>
  data.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));

const serialize = (data: PriceData[]): SerializedPriceData[] =>
  data.map(({ hour, minute, price, timestamp }) => ({ hour, minute, price, timestamp: timestamp.toISOString() }));

export interface CacheEntry {
  data: PriceData[];
  stale: boolean;
}

export const cache = {
  set: (key: string, data: PriceData[]): void => {
    try {
      const cached: CachedPriceData = {
        data: serialize(data),
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  },

  get: (key: string): CacheEntry | null => {
    try {
      const item = localStorage.getItem(CACHE_PREFIX + key);
      if (!item) return null;

      const cached: CachedPriceData = JSON.parse(item);
      const age = Date.now() - new Date(cached.timestamp).getTime();

      if (age > RETAIN_MS) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }

      return { data: deserialize(cached.data), stale: age > FRESH_MS };
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
      // Cache keys are local calendar days, so compare against a local day.
      const today = toLocalDateString(new Date());
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_PREFIX + 'prices_')) {
          const dateStr = key.replace(CACHE_PREFIX + 'prices_', '');
          if (dateStr < today) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  },
};
