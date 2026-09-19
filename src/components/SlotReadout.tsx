import { PriceData } from '../types';
import { getPriceBand } from '../config';
import { cheapestUpcoming, extremes, formatPrice, formatRelativeTime, formatSlotRange } from '../utils/prices';

interface SlotReadoutProps {
  /** The chart's current window - the readout's idle state describes the cheapest upcoming slot within it. */
  window: PriceData[];
  firstTomorrowTimestamp: number | null;
  selectedTimestamp: number | null;
  now: Date;
}

/**
 * The chart's always-present drag-scrub readout. Reserving this row in the
 * layout - rather than a floating tooltip - is what removes every clipping,
 * edge-flip and reflow problem a tooltip has on a 4px-wide bar; it also
 * doubles as the `aria-live` region for keyboard navigation.
 */
export const SlotReadout = ({ window: slots, firstTomorrowTimestamp, selectedTimestamp, now }: SlotReadoutProps) => {
  const selected =
    selectedTimestamp !== null ? (slots.find((p) => p.timestamp.getTime() === selectedTimestamp) ?? null) : null;

  if (selected) {
    const { min, max } = extremes(slots);
    const isTomorrow = firstTomorrowTimestamp !== null && selected.timestamp.getTime() >= firstTomorrowTimestamp;
    const band = getPriceBand(selected.price);
    const tag =
      min && selected.timestamp.getTime() === min.timestamp.getTime()
        ? 'CHEAPEST'
        : max && selected.timestamp.getTime() === max.timestamp.getTime()
          ? 'PEAK'
          : isTomorrow
            ? 'TOMORROW'
            : 'SELECTED';

    return (
      <div className="slot-readout" aria-live="polite">
        <span className="slot-readout-tag">{tag}</span>
        <span className="slot-readout-range">{formatSlotRange(selected)}</span>
        <span className={`slot-readout-price band-text band--${band}`}>
          {formatPrice(selected.price)}
          <span className="slot-readout-unit">p/kWh</span>
        </span>
      </div>
    );
  }

  const cheapest = cheapestUpcoming(slots, now);
  if (!cheapest) {
    return (
      <div className="slot-readout slot-readout-idle" aria-live="polite">
        <span className="slot-readout-tag">CHART</span>
        <span className="slot-readout-range">Drag to see a slot&rsquo;s price</span>
      </div>
    );
  }

  const band = getPriceBand(cheapest.price);
  return (
    <div className="slot-readout slot-readout-idle" aria-live="polite">
      <span className="slot-readout-tag">CHEAPEST</span>
      <span className="slot-readout-range">{formatSlotRange(cheapest)}</span>
      <span className={`slot-readout-price band-text band--${band}`}>
        {formatPrice(cheapest.price)}
        <span className="slot-readout-unit">p/kWh</span>
      </span>
      <span className="slot-readout-relative">{formatRelativeTime(cheapest, now)}</span>
    </div>
  );
};
