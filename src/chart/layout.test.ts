import { describe, it, expect } from 'vitest';
import { computeChartLayout, slotIndexAtX, ChartSlot } from './layout';
import { PriceBand } from '../config';

const bandOf = (price: number): PriceBand => (price < 10 ? 'cheap' : price < 20 ? 'moderate' : price < 35 ? 'expensive' : 'peak');

const slot = (hour: number, minute: number, price: number, isTomorrow = false): ChartSlot => ({
  key: new Date(2026, 0, isTomorrow ? 2 : 1, hour, minute).getTime(),
  hour,
  minute,
  price,
  isTomorrow,
});

const makeDay = (priceFn: (i: number) => number, count = 48, isTomorrow = false): ChartSlot[] =>
  Array.from({ length: count }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = (i % 2) * 30;
    return slot(hour, minute, priceFn(i), isTomorrow);
  });

describe('computeChartLayout', () => {
  it('returns null for an empty box or no slots', () => {
    expect(computeChartLayout({ w: 0, h: 100 }, makeDay(() => 15), bandOf)).toBeNull();
    expect(computeChartLayout({ w: 400, h: 0 }, makeDay(() => 15), bandOf)).toBeNull();
    expect(computeChartLayout({ w: 400, h: 200 }, [], bandOf)).toBeNull();
  });

  it('produces one bar per slot with non-overlapping, non-negative widths', () => {
    const slots = makeDay((i) => 10 + i);
    const geom = computeChartLayout({ w: 400, h: 200 }, slots, bandOf)!;
    expect(geom.bars).toHaveLength(slots.length);
    for (const bar of geom.bars) {
      expect(bar.width).toBeGreaterThanOrEqual(1);
    }
    for (let i = 1; i < geom.bars.length; i++) {
      // Each bar must start at or after the previous bar's right edge.
      expect(geom.bars[i].x).toBeGreaterThanOrEqual(geom.bars[i - 1].x + geom.bars[i - 1].width);
    }
  });

  it('keeps the y domain inclusive of zero on an all-positive day', () => {
    const slots = makeDay(() => 15);
    const geom = computeChartLayout({ w: 400, h: 200 }, slots, bandOf)!;
    expect(geom.domainBottom).toBeLessThanOrEqual(0);
    expect(geom.domainTop).toBeGreaterThanOrEqual(15);
    expect(geom.hasNegative).toBe(false);
  });

  it('keeps the domain top at or above zero on an all-negative day (regression: real region-C data goes all-negative during a plunge)', () => {
    const slots = makeDay(() => -3.5);
    const geom = computeChartLayout({ w: 400, h: 200 }, slots, bandOf)!;
    expect(geom.domainTop).toBeGreaterThanOrEqual(0);
    expect(geom.domainBottom).toBeLessThan(0);
    expect(geom.hasNegative).toBe(true);
    // Every bar must land within the plot, never above plotTop (off-plot).
    for (const bar of geom.bars) {
      expect(bar.yTop).toBeGreaterThanOrEqual(geom.plotTop - 0.5);
    }
  });

  it('anchors bars at the zero line, hanging negative bars below it', () => {
    const slots = [slot(0, 0, -5), slot(0, 30, 10)];
    const geom = computeChartLayout({ w: 400, h: 200 }, slots, bandOf)!;
    const [negBar, posBar] = geom.bars;
    expect(negBar.yTop).toBeCloseTo(geom.zeroY, 0);
    expect(negBar.yBottom).toBeGreaterThan(geom.zeroY);
    expect(posBar.yBottom).toBeCloseTo(geom.zeroY, 0);
    expect(posBar.yTop).toBeLessThan(geom.zeroY);
  });

  it('never divides by zero when every slot is exactly 0.0p', () => {
    const slots = makeDay(() => 0);
    const geom = computeChartLayout({ w: 400, h: 200 }, slots, bandOf)!;
    expect(geom).not.toBeNull();
    expect(Number.isFinite(geom.domainTop)).toBe(true);
    expect(Number.isFinite(geom.domainBottom)).toBe(true);
    expect(geom.domainTop).toBeGreaterThan(geom.domainBottom);
    for (const bar of geom.bars) {
      expect(Number.isFinite(bar.yTop)).toBe(true);
      expect(Number.isFinite(bar.yBottom)).toBe(true);
    }
  });

  it('handles a single slot without dividing by zero', () => {
    const geom = computeChartLayout({ w: 400, h: 200 }, [slot(23, 30, 12)], bandOf)!;
    expect(geom.bars).toHaveLength(1);
    expect(Number.isFinite(geom.bars[0].yTop)).toBe(true);
  });

  it('handles a 50-slot (October DST) and a 46-slot (March DST) day', () => {
    for (const count of [46, 50]) {
      const slots = makeDay((i) => 10 + (i % 5), count);
      const geom = computeChartLayout({ w: 800, h: 300 }, slots, bandOf)!;
      expect(geom.bars).toHaveLength(count);
    }
  });

  it('marks the tomorrow boundary at the first tomorrow slot', () => {
    const today = makeDay(() => 15, 4, false);
    const tomorrow = makeDay(() => 15, 4, true);
    const geom = computeChartLayout({ w: 400, h: 200 }, [...today, ...tomorrow], bandOf)!;
    expect(geom.tomorrowStartX).toBe(geom.bars[4].x);
  });

  it('returns a null tomorrowStartX when the window never reaches tomorrow', () => {
    const geom = computeChartLayout({ w: 400, h: 200 }, makeDay(() => 15, 4), bandOf)!;
    expect(geom.tomorrowStartX).toBeNull();
  });

  it('degrades gridline spacing gracefully on a very short plot instead of crowding forever', () => {
    const slots = makeDay((i) => 10 + i); // wide range, 47p span
    const geom = computeChartLayout({ w: 400, h: 40 }, slots, bandOf)!;
    // Even on a squat plot, gridlines must still be finite and ordered.
    for (let i = 1; i < geom.gridlines.length; i++) {
      expect(geom.gridlines[i].value).toBeGreaterThan(geom.gridlines[i - 1].value);
    }
  });
});

describe('slotIndexAtX', () => {
  it('clamps to the first and last bar outside the plot bounds', () => {
    const geom = computeChartLayout({ w: 400, h: 200 }, makeDay(() => 15, 10), bandOf)!;
    expect(slotIndexAtX(geom, -100)).toBe(0);
    expect(slotIndexAtX(geom, geom.plotLeft - 5)).toBe(0);
    expect(slotIndexAtX(geom, geom.plotRight + 5)).toBe(geom.bars.length - 1);
    expect(slotIndexAtX(geom, 100000)).toBe(geom.bars.length - 1);
  });

  it('maps a point inside a bar back to that bar', () => {
    const geom = computeChartLayout({ w: 400, h: 200 }, makeDay(() => 15, 10), bandOf)!;
    const bar = geom.bars[3];
    expect(slotIndexAtX(geom, bar.x + bar.width / 2)).toBe(3);
  });
});
