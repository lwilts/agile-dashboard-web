import { PriceData } from '../types';

const SLOT_MS = 30 * 60 * 1000;

/** True when `timestamp` falls within the half-hour slot `p` covers. */
export const slotContains = (p: PriceData, timestamp: number): boolean => {
  const start = p.timestamp.getTime();
  return timestamp >= start && timestamp < start + SLOT_MS;
};

/**
 * The index of the slot covering `now`, found by timestamp range rather
 * than by (hour, minute). On the October clock-change day 01:00 occurs
 * twice, so a lookup by clock fields always resolves to the first of the
 * pair - between 01:00 and 02:00 GMT that Sunday, "now" would silently
 * point at the wrong half hour and the chart window would start an hour
 * early.
 */
export const findCurrentSlotIndex = (prices: PriceData[], now: Date): number =>
  prices.findIndex((p) => slotContains(p, now.getTime()));

/**
 * The chart's time window: the current half-hour through the end of
 * published data. Floored to `minSlots` so the window is never a sliver of
 * one or two bars late at night before tomorrow's prices publish - a single
 * bar isn't a chart, and some trailing context reads better than a lone
 * column.
 */
export const buildChartWindow = (
  today: PriceData[],
  tomorrow: PriceData[],
  now: Date,
  minSlots = 12
): PriceData[] => {
  const combined = [...today, ...tomorrow];
  if (combined.length === 0) return [];

  let startIndex = findCurrentSlotIndex(today, now);
  if (startIndex === -1) {
    // "Now" isn't in today's feed - a gap, or the ambiguous DST hour. Fall
    // back to the first slot at or after now rather than showing a window
    // that starts in the past.
    const nowMs = now.getTime();
    startIndex = today.findIndex((p) => p.timestamp.getTime() >= nowMs);
    if (startIndex === -1) startIndex = today.length; // nothing left today
  }

  const remainingToday = today.length - startIndex;
  const windowLength = remainingToday + tomorrow.length;

  if (windowLength >= minSlots || windowLength === combined.length) {
    return combined.slice(Math.max(0, startIndex));
  }

  // Extend backwards into today to reach the floor.
  const deficit = minSlots - windowLength;
  const flooredStart = Math.max(0, startIndex - deficit);
  return combined.slice(flooredStart);
};

export interface Extremes {
  min: PriceData | null;
  max: PriceData | null;
}

/** The cheapest and most expensive slots in `prices`. */
export const extremes = (prices: PriceData[]): Extremes => {
  if (prices.length === 0) return { min: null, max: null };
  let min = prices[0];
  let max = prices[0];
  for (const p of prices) {
    if (p.price < min.price) min = p;
    if (p.price > max.price) max = p;
  }
  return { min, max };
};

/** The cheapest slot at or after `now` within `window` - the readout's idle state. */
export const cheapestUpcoming = (window: PriceData[], now: Date): PriceData | null => {
  const nowMs = now.getTime();
  const upcoming = window.filter((p) => p.timestamp.getTime() + SLOT_MS > nowMs);
  if (upcoming.length === 0) return null;
  return upcoming.reduce((min, p) => (p.price < min.price ? p : min), upcoming[0]);
};

const pad2 = (n: number): string => n.toString().padStart(2, '0');

/** "18:30–19:00" */
export const formatSlotRange = (p: PriceData): string => {
  const endTotalMinutes = p.hour * 60 + p.minute + 30;
  const endHour = Math.floor(endTotalMinutes / 60) % 24;
  const endMinute = endTotalMinutes % 60;
  return `${pad2(p.hour)}:${pad2(p.minute)}–${pad2(endHour)}:${pad2(endMinute)}`;
};

/**
 * `null` renders as "--", never a misleading number. Callers must pass
 * `null` explicitly for "unknown" - never coerce a real 0 into it, which is
 * the falsy-zero bug this app used to have in several places.
 */
export const formatPrice = (price: number | null, decimals = 1): string =>
  price === null ? '--' : price.toFixed(decimals);

/** How long until `p` starts, from `now`: "now" / "in 25m" / "in 4h". */
export const formatRelativeTime = (p: PriceData, now: Date): string => {
  const diffMs = p.timestamp.getTime() - now.getTime();
  if (diffMs <= 0) return 'now';
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  return `in ${Math.round(minutes / 60)}h`;
};
