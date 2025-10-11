import { GasData } from '../types';
import { getPriceColor, colors } from '../config';

interface PriceBoxesProps {
  currentPrice: number | null;
  todayMinPrice: number | null;
  todayMaxPrice: number | null;
  tomorrowMinPrice: number | null;
  tomorrowMaxPrice: number | null;
  gas: GasData;
  hasTomorrow: boolean;
}

export const PriceBoxes = ({
  currentPrice,
  todayMinPrice,
  todayMaxPrice,
  tomorrowMinPrice,
  tomorrowMaxPrice,
  gas,
  hasTomorrow,
}: PriceBoxesProps) => {
  const formatPrice = (price: number | null, decimals: number = 1): string => {
    if (price === null) return '--';
    return price.toFixed(decimals);
  };

  return (
    <div className="price-boxes-container">
      {/* Today Row */}
      <div className="price-boxes-row">
        {/* Current Price - Extra Large */}
        <div
          className="price-box price-box-now"
          style={{
            backgroundColor: currentPrice ? getPriceColor(currentPrice) : colors.blue,
          }}
        >
          <div className="price-box-label">Now</div>
          <div className="price-box-value price-box-value-now">
            {formatPrice(currentPrice, 1)}
            <span className="price-suffix">p/kWh</span>
          </div>
        </div>

        {/* Today Min */}
        <div
          className="price-box"
          style={{
            backgroundColor: todayMinPrice ? getPriceColor(todayMinPrice) : colors.green,
          }}
        >
          <div className="price-box-label">Today Min</div>
          <div className="price-box-value">
            {formatPrice(todayMinPrice, 1)}
            <span className="price-suffix">p/kWh</span>
          </div>
        </div>

        {/* Today Max */}
        <div
          className="price-box"
          style={{
            backgroundColor: todayMaxPrice ? getPriceColor(todayMaxPrice) : colors.red,
          }}
        >
          <div className="price-box-label">Today Max</div>
          <div className="price-box-value">
            {formatPrice(todayMaxPrice, 1)}
            <span className="price-suffix">p/kWh</span>
          </div>
        </div>

        {/* Today Gas */}
        <div
          className="price-box"
          style={{ backgroundColor: colors.orange }}
        >
          <div className="price-box-label">Today Gas</div>
          <div className="price-box-value">
            {formatPrice(gas.today, 1)}
            <span className="price-suffix">p/kWh</span>
          </div>
        </div>
      </div>

      {/* Tomorrow Row - Only show if tomorrow data is available */}
      {hasTomorrow && (
        <div className="price-boxes-row price-boxes-row-tomorrow">
          {/* Tomorrow Min */}
          <div
            className="price-box"
            style={{
              backgroundColor: tomorrowMinPrice ? getPriceColor(tomorrowMinPrice) : colors.green,
            }}
          >
            <div className="price-box-label">Tomorrow Min</div>
            <div className="price-box-value">
              {formatPrice(tomorrowMinPrice, 1)}
              <span className="price-suffix">p/kWh</span>
            </div>
          </div>

          {/* Tomorrow Max */}
          <div
            className="price-box"
            style={{
              backgroundColor: tomorrowMaxPrice ? getPriceColor(tomorrowMaxPrice) : colors.red,
            }}
          >
            <div className="price-box-label">Tomorrow Max</div>
            <div className="price-box-value">
              {formatPrice(tomorrowMaxPrice, 1)}
              <span className="price-suffix">p/kWh</span>
            </div>
          </div>

          {/* Tomorrow Gas */}
          <div
            className="price-box"
            style={{ backgroundColor: colors.orange }}
          >
            <div className="price-box-label">Tomorrow Gas</div>
            <div className="price-box-value">
              {formatPrice(gas.tomorrow, 1)}
              <span className="price-suffix">p/kWh</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
