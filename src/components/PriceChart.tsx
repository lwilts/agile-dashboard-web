import { useCallback, useMemo, type KeyboardEvent, type PointerEvent } from 'react';
import { PriceData } from '../types';
import { getPriceBand } from '../config';
import { useElementSize } from '../hooks/useElementSize';
import { computeChartLayout, slotIndexAtX, ChartSlot } from '../chart/layout';
import { findCurrentSlotIndex, formatSlotRange } from '../utils/prices';

interface PriceChartProps {
  /** The chart's time window: current half-hour through the end of published data (see buildChartWindow). */
  window: PriceData[];
  /** `tomorrowPrices[0]?.timestamp.getTime() ?? null` - marks where the tomorrow wash begins. */
  firstTomorrowTimestamp: number | null;
  now: Date;
  selectedTimestamp: number | null;
  /** `sticky: true` means "keep showing this until something else selects or the idle timeout fires" (a tap); `false` is a live hover/drag preview. */
  onSelect: (timestamp: number | null, sticky: boolean) => void;
}

export const PriceChart = ({
  window: slots,
  firstTomorrowTimestamp,
  now,
  selectedTimestamp,
  onSelect,
}: PriceChartProps) => {
  const [containerRef, size] = useElementSize<HTMLDivElement>();

  const chartSlots: ChartSlot[] = useMemo(
    () =>
      slots.map((p) => ({
        key: p.timestamp.getTime(),
        hour: p.hour,
        minute: p.minute,
        price: p.price,
        isTomorrow: firstTomorrowTimestamp !== null && p.timestamp.getTime() >= firstTomorrowTimestamp,
      })),
    [slots, firstTomorrowTimestamp]
  );

  const geometry = useMemo(
    () => (size ? computeChartLayout({ w: size.width, h: size.height }, chartSlots, getPriceBand) : null),
    [size, chartSlots]
  );

  const nowIndex = useMemo(() => findCurrentSlotIndex(slots, now), [slots, now]);
  const selectedIndex = useMemo(
    () => (selectedTimestamp === null ? -1 : slots.findIndex((p) => p.timestamp.getTime() === selectedTimestamp)),
    [slots, selectedTimestamp]
  );

  const selectFromPointer = useCallback(
    (clientX: number, target: SVGSVGElement, sticky: boolean) => {
      if (!geometry) return;
      const rect = target.getBoundingClientRect();
      const x = clientX - rect.left;
      const index = slotIndexAtX(geometry, x);
      const slot = slots[index];
      if (slot) onSelect(slot.timestamp.getTime(), sticky);
    },
    [geometry, slots, onSelect]
  );

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    // Only touch/pen need capture: without it, dragging off a chart that
    // can be as little as ~130px tall - which will happen constantly -
    // orphans the gesture. A mouse doesn't need it; plain hover already
    // tracks below, capture would only make pointerleave fire later than
    // the cursor visually leaving.
    if (e.pointerType !== 'mouse') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    selectFromPointer(e.clientX, e.currentTarget, false);
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    // A mouse scrubs on plain hover, no click-drag required - "the same row
    // follows the mouse". Touch/pen only updates while actively dragging
    // (pointer capture from handlePointerDown).
    if (e.pointerType === 'mouse' || e.currentTarget.hasPointerCapture(e.pointerId)) {
      selectFromPointer(e.clientX, e.currentTarget, false);
    }
  };

  const finishDrag = (e: PointerEvent<SVGSVGElement>) => {
    // A tap or drag leaves its selection visible (sticky); a mouse keeps
    // live-hover semantics and reverts on pointerleave instead.
    if (e.pointerType !== 'mouse' && e.currentTarget.hasPointerCapture(e.pointerId)) {
      selectFromPointer(e.clientX, e.currentTarget, true);
    }
  };

  const handlePointerLeave = (e: PointerEvent<SVGSVGElement>) => {
    // Only a mouse reverts to idle on leave. pointerleave fires right after
    // a tap on hybrid devices, which would otherwise cancel the sticky
    // selection just made.
    if (e.pointerType === 'mouse') {
      onSelect(null, false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (slots.length === 0) return;
    const base = selectedIndex >= 0 ? selectedIndex : nowIndex >= 0 ? nowIndex : 0;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(0, base - 1);
      onSelect(slots[next].timestamp.getTime(), true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(slots.length - 1, base + 1);
      onSelect(slots[next].timestamp.getTime(), true);
    } else if (e.key === 'Escape') {
      onSelect(null, false);
    }
  };

  const ariaLabel =
    slots.length > 0
      ? `Price chart, ${slots.length} half-hour slots from ${formatSlotRange(slots[0])} to ${formatSlotRange(slots[slots.length - 1])}`
      : 'Price chart, no data available';

  return (
    <div className="price-chart" ref={containerRef}>
      {geometry && (
        <svg
          className="price-chart-svg"
          width={geometry.width}
          height={geometry.height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
        >
          {geometry.tomorrowStartX !== null && (
            <>
              <rect
                className="chart-tomorrow-wash"
                x={geometry.tomorrowStartX}
                y={geometry.plotTop}
                width={geometry.plotRight - geometry.tomorrowStartX}
                height={geometry.plotBottom - geometry.plotTop}
              />
              <text className="chart-tomorrow-label" x={geometry.tomorrowStartX + 4} y={geometry.plotTop + 12}>
                TOMORROW
              </text>
            </>
          )}

          {geometry.gridlines.map((line) => (
            <line
              key={line.value}
              className={line.value === 0 && geometry.hasNegative ? 'chart-zero-line' : 'chart-gridline'}
              x1={geometry.plotLeft}
              x2={geometry.plotRight}
              y1={Math.round(line.y) + 0.5}
              y2={Math.round(line.y) + 0.5}
            />
          ))}
          {geometry.gridlines.map((line) => (
            <text
              key={`label-${line.value}`}
              className="chart-y-label"
              x={geometry.plotLeft - 6}
              y={line.y}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {line.value}
            </text>
          ))}

          {geometry.bars.map((bar) => (
            <rect
              key={bar.key}
              className={`chart-bar band--${bar.band}${bar.isTomorrow ? ' chart-bar-tomorrow' : ''}`}
              x={bar.x}
              y={bar.yTop}
              width={bar.width}
              height={Math.max(0, bar.yBottom - bar.yTop)}
            />
          ))}

          {geometry.hourLabels.map((label) => (
            <text key={label.x} className="chart-hour-label" x={label.x} y={geometry.plotBottom + 14} textAnchor="middle">
              {label.label}
            </text>
          ))}

          {nowIndex >= 0 && geometry.bars[nowIndex] && (
            <line
              className="chart-now-line"
              x1={geometry.bars[nowIndex].x}
              x2={geometry.bars[nowIndex].x}
              y1={geometry.plotTop}
              y2={geometry.plotBottom}
            />
          )}

          {selectedIndex >= 0 && geometry.bars[selectedIndex] && (
            <line
              className="chart-selection-line"
              x1={geometry.bars[selectedIndex].x + geometry.bars[selectedIndex].width / 2}
              x2={geometry.bars[selectedIndex].x + geometry.bars[selectedIndex].width / 2}
              y1={geometry.plotTop}
              y2={geometry.plotBottom}
            />
          )}
        </svg>
      )}
    </div>
  );
};
