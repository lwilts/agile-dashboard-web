import { GasData, PriceData } from '../types';
import { getPriceBand } from '../config';
import { formatPrice } from '../utils/prices';

interface StatTilesProps {
  currentPrice: number | null;
  todayMin: PriceData | null;
  todayMax: PriceData | null;
  tomorrowMin: PriceData | null;
  tomorrowMax: PriceData | null;
  gas: GasData;
  hasTomorrow: boolean;
}

const bandClass = (price: number | null): string => (price === null ? 'band--unknown' : `band--${getPriceBand(price)}`);

/**
 * Seven figures in three blocks - NOW, a split MIN/MAX tile, and GAS -
 * replacing the old seven-box grid whose mobile layout was placed by
 * counting DOM children (`:nth-child(n):nth-last-child(m)`, duplicated
 * across two breakpoints). Every tile here carries its own semantic class,
 * so nothing about placement depends on how many siblings exist.
 *
 * Tomorrow's value, once published, pairs into the same tile as today's
 * (matching the Pi dashboard) rather than adding four more boxes.
 */
export const StatTiles = ({ currentPrice, todayMin, todayMax, tomorrowMin, tomorrowMax, gas, hasTomorrow }: StatTilesProps) => (
  <div className="stat-tiles">
    <div className={`tile tile--now ${bandClass(currentPrice)}`}>
      <div className="tile-label">Now</div>
      <div className="tile-value tile-value--hero">
        {formatPrice(currentPrice)}
        <span className="tile-unit">p/kWh</span>
      </div>
    </div>

    <div className="tile tile--range">
      <div className={`tile-half ${bandClass(todayMin?.price ?? null)}`}>
        <div className="tile-half-main">
          <span className="tile-label">Min</span>
          <span className="tile-value">{formatPrice(todayMin?.price ?? null)}</span>
        </div>
        {hasTomorrow && tomorrowMin && (
          <div className="tile-inset">
            <span className="tile-inset-label">Tmrw</span>
            <span className="tile-inset-value">{formatPrice(tomorrowMin.price)}</span>
          </div>
        )}
      </div>
      <div className={`tile-half ${bandClass(todayMax?.price ?? null)}`}>
        <div className="tile-half-main">
          <span className="tile-label">Max</span>
          <span className="tile-value">{formatPrice(todayMax?.price ?? null)}</span>
        </div>
        {hasTomorrow && tomorrowMax && (
          <div className="tile-inset">
            <span className="tile-inset-label">Tmrw</span>
            <span className="tile-inset-value">{formatPrice(tomorrowMax.price)}</span>
          </div>
        )}
      </div>
    </div>

    <div className="tile tile--gas">
      <div className="tile-label">Gas</div>
      <div className="tile-value">
        {formatPrice(gas.today)}
        <span className="tile-unit">p/kWh</span>
      </div>
      {hasTomorrow && gas.tomorrow !== null && (
        <div className="tile-inset">
          <span className="tile-inset-label">Tmrw</span>
          <span className="tile-inset-value">{formatPrice(gas.tomorrow)}</span>
        </div>
      )}
    </div>
  </div>
);
