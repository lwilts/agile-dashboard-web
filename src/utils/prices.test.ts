import { describe, it, expect } from 'vitest';
import { PriceData } from '../types';
import { buildChartWindow, extremes, findCurrentSlotIndex, formatRelativeTime, formatSlotRange, cheapestUpcoming } from './prices';

const day = (y: number, m: number, d: number, count: number, priceFn: (i: number) => number = () => 15): PriceData[] =>
  Array.from({ length: count }, (_, i) => {
    const ts = new Date(y, m, d, 0, 0, 0, 0);
    ts.setMinutes(ts.getMinutes() + i * 30);
    return { hour: ts.getHours(), minute: ts.getMinutes(), price: priceFn(i), timestamp: ts };
  });

describe('findCurrentSlotIndex', () => {
  it('finds the slot whose half-hour range contains now', () => {
    const today = day(2026, 5, 15, 48);
    const now = new Date(2026, 5, 15, 14, 45); // within the 14:30 slot
    expect(findCurrentSlotIndex(today, now)).toBe(29);
  });

  it('resolves the ambiguous DST hour by timestamp, not by (hour, minute)', () => {
    // October clock-change day: two slots both report hour 1, minute 0, but
    // their real timestamps are an hour apart.
    const first = new Date(2026, 9, 25, 1, 0); // BST 01:00
    const second = new Date(first.getTime() + 60 * 60 * 1000); // the repeated 01:00, an hour later in real time
    const today: PriceData[] = [
      { hour: 1, minute: 0, price: 10, timestamp: first },
      { hour: 1, minute: 0, price: 20, timestamp: second },
    ];
    expect(findCurrentSlotIndex(today, new Date(first.getTime() + 15 * 60 * 1000))).toBe(0);
    expect(findCurrentSlotIndex(today, new Date(second.getTime() + 15 * 60 * 1000))).toBe(1);
  });

  it('returns -1 when now falls outside every slot', () => {
    const today = day(2026, 5, 15, 4); // only covers 00:00-02:00
    expect(findCurrentSlotIndex(today, new Date(2026, 5, 15, 12, 0))).toBe(-1);
  });
});

describe('buildChartWindow', () => {
  it('starts at the current slot and runs to the end of published data', () => {
    const today = day(2026, 5, 15, 48);
    const tomorrow = day(2026, 5, 16, 48);
    const now = new Date(2026, 5, 15, 20, 0); // slot index 40
    const win = buildChartWindow(today, tomorrow, now, 12);
    expect(win[0].timestamp.getTime()).toBe(today[40].timestamp.getTime());
    expect(win).toHaveLength(48 - 40 + 48);
  });

  it('floors a near-midnight sliver window backwards into today', () => {
    const today = day(2026, 5, 15, 48);
    const now = new Date(2026, 5, 15, 23, 45); // last slot, 1 remaining
    const win = buildChartWindow(today, [], now, 12);
    expect(win).toHaveLength(12);
    expect(win[win.length - 1].timestamp.getTime()).toBe(today[47].timestamp.getTime());
  });

  it('does not extend past the start of the available data', () => {
    const today = day(2026, 5, 15, 4); // only 2 hours of data
    const now = new Date(2026, 5, 15, 1, 45);
    const win = buildChartWindow(today, [], now, 12);
    expect(win).toEqual(today);
  });

  it('returns an empty window when there is no data at all', () => {
    expect(buildChartWindow([], [], new Date())).toEqual([]);
  });

  it('falls back to the next available slot when now matches none (a feed gap)', () => {
    const full = day(2026, 5, 15, 48);
    const today = full.filter((_, i) => i !== 24); // drop the 12:00 slot, creating a gap
    const now = new Date(2026, 5, 15, 12, 15); // inside the gap
    const win = buildChartWindow(today, [], now, 1);
    expect(win.length).toBeGreaterThan(0);
    expect(win[0].timestamp.getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('extremes', () => {
  it('returns null for both when empty', () => {
    expect(extremes([])).toEqual({ min: null, max: null });
  });

  it('finds the cheapest and most expensive slot', () => {
    const prices = day(2026, 5, 15, 4, (i) => [10, -3, 25, 8][i]);
    const { min, max } = extremes(prices);
    expect(min?.price).toBe(-3);
    expect(max?.price).toBe(25);
  });
});

describe('cheapestUpcoming', () => {
  it('ignores slots that have already ended', () => {
    const prices = day(2026, 5, 15, 4, (i) => [5, 1, 20, 30][i]);
    const now = new Date(2026, 5, 15, 1, 0); // slot 1 (price 1) has already ended
    const cheapest = cheapestUpcoming(prices, now);
    expect(cheapest?.price).toBe(20);
  });

  it('returns null when nothing remains', () => {
    const prices = day(2026, 5, 15, 2);
    expect(cheapestUpcoming(prices, new Date(2026, 5, 16, 0, 0))).toBeNull();
  });
});

describe('formatSlotRange', () => {
  it('formats a half-hour range', () => {
    expect(formatSlotRange({ hour: 18, minute: 30, price: 1, timestamp: new Date() })).toBe('18:30–19:00');
  });

  it('rolls over midnight', () => {
    expect(formatSlotRange({ hour: 23, minute: 30, price: 1, timestamp: new Date() })).toBe('23:30–00:00');
  });
});

describe('formatRelativeTime', () => {
  it('reports "now" for a slot that has started', () => {
    const p: PriceData = { hour: 0, minute: 0, price: 1, timestamp: new Date(2026, 0, 1, 12, 0) };
    expect(formatRelativeTime(p, new Date(2026, 0, 1, 12, 5))).toBe('now');
  });

  it('reports minutes, then hours', () => {
    const start = new Date(2026, 0, 1, 12, 0);
    const p: PriceData = { hour: 12, minute: 0, price: 1, timestamp: start };
    expect(formatRelativeTime(p, new Date(start.getTime() - 25 * 60 * 1000))).toBe('in 25m');
    expect(formatRelativeTime(p, new Date(start.getTime() - 4 * 60 * 60 * 1000))).toBe('in 4h');
  });
});
