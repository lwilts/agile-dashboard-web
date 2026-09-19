import { PriceBand } from '../config';

/**
 * A pure geometry function: (box size, slots) -> pixel positions. React's
 * only job is to measure the container and render what this returns - every
 * DST/zero-range/degenerate-window case that would otherwise need a browser
 * to reproduce can be driven straight from a unit test instead.
 */

export interface ChartSlot {
  /** Epoch ms - unique per slot and stable across a DST day, unlike (hour, minute). */
  key: number;
  hour: number;
  minute: number;
  price: number;
  isTomorrow: boolean;
}

export interface Box {
  w: number;
  h: number;
}

export interface BarGeom {
  key: number;
  x: number;
  width: number;
  /** Top of the filled rect - `min(valueY, zeroY)`, so a negative bar's "top" is at the zero line. */
  yTop: number;
  /** Bottom of the filled rect - `max(valueY, zeroY)`. */
  yBottom: number;
  price: number;
  band: PriceBand;
  isTomorrow: boolean;
}

export interface GridlineGeom {
  value: number;
  y: number;
}

export interface HourLabelGeom {
  x: number;
  label: string;
}

export interface ChartGeometry {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  slotWidth: number;
  bars: BarGeom[];
  gridlines: GridlineGeom[];
  hourLabels: HourLabelGeom[];
  /** Where the zero rule sits, in plot-local y. Always computed; only worth drawing when `hasNegative`. */
  zeroY: number;
  hasNegative: boolean;
  domainTop: number;
  domainBottom: number;
  /** x of the first tomorrow bar, or null when the window doesn't reach tomorrow. */
  tomorrowStartX: number | null;
}

// Candidate gridline steps (p/kWh) and hour-label steps, smallest first. Each
// ladder is walked until a step gives at least MIN_LABEL_SPACING between
// labels; a short plot simply renders fewer of them rather than crowding.
const GRID_STEPS = [5, 10, 20, 25, 50, 100];
const HOUR_STEPS = [1, 2, 3, 4, 6, 12, 24];
const MIN_LABEL_SPACING = 28;

const Y_LABEL_FONT_SIZE = 11;
const HOUR_LABEL_FONT_SIZE = 11;
// A bold, tabular-figure sans at these sizes runs close to 0.62em per glyph.
// This is an estimate, not a measurement - layout.ts has no DOM to measure
// with, and being a little generous with gutter width costs far less than
// clipping a label would.
const AVG_CHAR_WIDTH_RATIO = 0.62;
const estimateTextWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * AVG_CHAR_WIDTH_RATIO;

const PAD_TOP = 22; // domain-top label
const PAD_BOTTOM = 20; // hour axis labels
const AXIS_MARGIN = 4;
const TICK_LENGTH = 4;

const clamp = (value: number, lo: number, hi: number): number => Math.min(Math.max(value, lo), hi);

const chooseGridStep = (
  lo0: number,
  hi0: number,
  plotH: number
): { step: number; lo: number; hi: number } => {
  for (const step of GRID_STEPS) {
    let lo = Math.floor(lo0 / step) * step;
    let hi = Math.ceil(hi0 / step) * step;
    if (hi === lo) hi = lo + step; // guard a zero-span domain (e.g. every slot at exactly 0.0p)
    const lines = (hi - lo) / step;
    const spacing = plotH / lines;
    if (spacing >= MIN_LABEL_SPACING) return { step, lo, hi };
  }
  const step = GRID_STEPS[GRID_STEPS.length - 1];
  let lo = Math.floor(lo0 / step) * step;
  let hi = Math.ceil(hi0 / step) * step;
  if (hi === lo) hi = lo + step;
  return { step, lo, hi };
};

const chooseHourStep = (slotWidth: number): number | null => {
  const slotsPerHour = 2;
  for (const stepHours of HOUR_STEPS) {
    const spacing = slotWidth * stepHours * slotsPerHour;
    if (spacing >= MIN_LABEL_SPACING) return stepHours;
  }
  return null;
};

/** Index of the bar at pixel `x`, clamped to the plot's slot range. */
export const slotIndexAtX = (geom: ChartGeometry, x: number): number => {
  const i = Math.floor((x - geom.plotLeft) / geom.slotWidth);
  return clamp(i, 0, geom.bars.length - 1);
};

export const computeChartLayout = (box: Box, slots: ChartSlot[], bandOf: (price: number) => PriceBand): ChartGeometry | null => {
  const n = slots.length;
  if (n === 0 || box.w <= 0 || box.h <= 0) return null;

  const prices = slots.map((s) => s.price);
  const dataMin = Math.min(...prices);
  const dataMax = Math.max(...prices);

  // Zero is always in the domain - both clamps matter. `min(0, dataMin)`
  // alone would put the top of an all-negative day's domain below zero, and
  // bars anchored at the zero line would then draw off-plot.
  const lo0 = Math.min(0, dataMin);
  const hi0 = Math.max(0, dataMax);

  const plotHEstimate = Math.max(1, box.h - PAD_TOP - PAD_BOTTOM);
  const { step, lo: domainBottom, hi: domainTop } = chooseGridStep(lo0, hi0, plotHEstimate);
  const span = domainTop - domainBottom; // > 0, guaranteed by chooseGridStep

  const gridValues: number[] = [];
  for (let v = domainBottom; v <= domainTop + 1e-9; v += step) {
    gridValues.push(Math.round(v));
  }

  const widestYLabel = Math.max(...gridValues.map((v) => estimateTextWidth(String(v), Y_LABEL_FONT_SIZE)));
  const padLeft = AXIS_MARGIN + TICK_LENGTH + widestYLabel;

  const widestHourLabel = estimateTextWidth('24', HOUR_LABEL_FONT_SIZE);
  const padRight = Math.max(AXIS_MARGIN, widestHourLabel / 2);

  const plotLeft = padLeft;
  const plotRight = box.w - padRight;
  const plotTop = PAD_TOP;
  const plotBottom = box.h - PAD_BOTTOM;
  const plotW = Math.max(1, plotRight - plotLeft);
  const plotH = Math.max(1, plotBottom - plotTop);
  const slotWidth = plotW / n;

  const valueToY = (price: number): number => plotBottom - ((price - domainBottom) / span) * plotH;
  const zeroY = valueToY(0);

  const gap = slotWidth < 4 ? 0 : clamp(slotWidth * 0.18, 1, slotWidth * 0.35);

  const bars: BarGeom[] = slots.map((slot, i) => {
    const x0 = Math.round(plotLeft + i * slotWidth);
    const x1 = Math.round(plotLeft + (i + 1) * slotWidth);
    const width = Math.max(1, x1 - x0 - gap);
    const valueY = valueToY(slot.price);
    return {
      key: slot.key,
      x: x0,
      width,
      yTop: Math.min(valueY, zeroY),
      yBottom: Math.max(valueY, zeroY),
      price: slot.price,
      band: bandOf(slot.price),
      isTomorrow: slot.isTomorrow,
    };
  });

  const gridlines: GridlineGeom[] = gridValues.map((value) => ({ value, y: valueToY(value) }));

  const hourStep = chooseHourStep(slotWidth);
  const hourLabels: HourLabelGeom[] = [];
  if (hourStep !== null) {
    slots.forEach((slot, i) => {
      if (slot.minute === 0 && slot.hour % hourStep === 0) {
        hourLabels.push({ x: bars[i].x + bars[i].width / 2, label: String(slot.hour) });
      }
    });
  }

  const tomorrowIndex = slots.findIndex((s) => s.isTomorrow);
  const tomorrowStartX = tomorrowIndex >= 0 ? bars[tomorrowIndex].x : null;

  return {
    width: box.w,
    height: box.h,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    slotWidth,
    bars,
    gridlines,
    hourLabels,
    zeroY,
    hasNegative: domainBottom < 0,
    domainTop,
    domainBottom,
    tomorrowStartX,
  };
};
