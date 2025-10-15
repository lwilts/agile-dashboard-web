import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  LabelList,
} from 'recharts';
import { PriceData } from '../types';
import { getPriceColor, colors } from '../config';

interface PriceChartProps {
  todayPrices: PriceData[];
  tomorrowPrices: PriceData[];
  currentHour: number;
  currentMinute: number;
}

export const PriceChart = ({
  todayPrices,
  tomorrowPrices,
  currentHour,
  currentMinute,
}: PriceChartProps) => {

  const hasTomorrow = tomorrowPrices.length > 0;

  // If we have tomorrow's data, show from a few hours before current time
  const displayToday = hasTomorrow && todayPrices.length >= 48
    ? (() => {
        // Calculate the starting index - show from 6 hours before current time
        const hoursBack = 6;
        const startHour = Math.max(0, currentHour - hoursBack);
        const startIndex = startHour * 2; // 2 entries per hour (30 min intervals)
        return todayPrices.slice(startIndex);
      })()
    : todayPrices;

  const displayPrices = [...displayToday, ...tomorrowPrices];

  if (displayPrices.length === 0) {
    return <div className="chart-container">No price data available</div>;
  }

  // Calculate current period minute (0 or 30)
  const currentPeriodMinute = Math.floor(currentMinute / 30) * 30;

  // Calculate max prices for peak labels
  const todayMaxInDisplay = displayToday.length > 0 ? Math.max(...displayToday.map((p) => p.price)) : 0;
  const tomorrowMaxInDisplay = tomorrowPrices.length > 0 ? Math.max(...tomorrowPrices.map((p) => p.price)) : 0;

  // Prepare data for Recharts
  const chartData = displayPrices.map((price, index) => {
    const isCurrentPeriod =
      price.hour === currentHour &&
      price.minute === currentPeriodMinute &&
      index < displayToday.length;

    // Determine if this is a peak price
    const isPeakToday = index < displayToday.length && price.price === todayMaxInDisplay;
    const isPeakTomorrow = index >= displayToday.length && price.price === tomorrowMaxInDisplay;
    const peakLabel = (isPeakToday || isPeakTomorrow) ? price.price.toFixed(1) : '';

    return {
      name: `${price.hour.toString().padStart(2, '0')}:${price.minute.toString().padStart(2, '0')}`,
      price: price.price,
      hour: price.hour,
      minute: price.minute,
      color: getPriceColor(price.price),
      isTomorrow: index >= displayToday.length,
      isCurrentPeriod,
      peakLabel,
    };
  });


  // Calculate Y-axis range - scale to actual data with some headroom for peak labels
  const maxPrice = Math.max(...displayPrices.map((p) => p.price));
  const minPrice = Math.min(...displayPrices.map((p) => p.price));
  const yAxisMin = Math.max(0, Math.floor(minPrice / 10) * 10 - 10);
  const yAxisMax = Math.ceil(maxPrice / 10) * 10 + 5; // Less headroom, just for peak labels

  // Custom label renderer for peak prices
  const renderPeakLabel = (props: any) => {
    const { x, y, width, index } = props;

    // Get the data point for this bar
    const dataPoint = chartData[index];
    if (!dataPoint || !dataPoint.peakLabel) {
      return null;
    }

    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill={dataPoint.color}
        textAnchor="middle"
        fontSize={18}
        fontWeight="bold"
      >
        {dataPoint.peakLabel}
      </text>
    );
  };

  // Custom tick formatter for X-axis
  const formatXAxis = (_value: string, index: number) => {
    const data = chartData[index];
    if (data && data.minute === 0 && (data.hour % 4 === 0 || data.hour === 0)) {
      return data.hour.toString();
    }
    return '';
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Calculate end time (30 minutes later)
      const startHour = data.hour;
      const startMin = data.minute;
      const endMin = (startMin + 30) % 60;
      const endHour = startMin + 30 >= 60 ? (startHour + 1) % 24 : startHour;

      const timeRange = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

      return (
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: `2px solid ${data.color}`,
            color: 'white',
          }}
        >
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.25rem' }}>
            {timeRange}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.color }}>
            {data.price.toFixed(1)} <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>p/kWh</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Find the current period for the "Now" line
  const currentPeriodIndex = chartData.findIndex((d) => d.isCurrentPeriod);

  // Find midnight (00:00) for the "Tomorrow" marker
  const midnightIndex = chartData.findIndex((d) => d.hour === 0 && d.minute === 0);

  // Calculate minimum chart width for mobile (minimum 12px per bar)
  const minChartWidth = Math.max(600, chartData.length * 12);

  return (
    <div className="chart-container">
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={400} minWidth={minChartWidth}>
          <BarChart
          data={chartData}
          margin={{ top: 40, right: 20, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridline} vertical={false} />
          <XAxis
            dataKey="name"
            tickFormatter={formatXAxis}
            stroke={colors.text}
            tick={{ fill: colors.text, fontSize: 16 }}
            axisLine={{ stroke: colors.gridline }}
          />
          <YAxis
            domain={[yAxisMin, yAxisMax]}
            ticks={Array.from(
              { length: Math.floor((yAxisMax - yAxisMin) / 10) + 1 },
              (_, i) => yAxisMin + i * 10
            )}
            stroke={colors.text}
            tick={{ fill: 'rgb(200, 200, 210)', fontSize: 18 }}
            axisLine={{ stroke: colors.gridline }}
            width={45}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            animationDuration={100}
          />

          <Bar dataKey="price" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                fillOpacity={entry.isTomorrow ? 0.85 : 1}
              />
            ))}
            <LabelList content={renderPeakLabel} />
          </Bar>

          {/* Current time indicator - shaded highlight */}
          {currentPeriodIndex >= 0 && chartData[currentPeriodIndex] && (
            <>
              {/* Shaded area for current period */}
              <ReferenceArea
                x1={chartData[currentPeriodIndex].name}
                x2={chartData[currentPeriodIndex].name}
                fill="white"
                fillOpacity={0.3}
              />
              {/* "Now" label */}
              <ReferenceLine
                x={chartData[currentPeriodIndex].name}
                stroke="transparent"
                label={{ value: "Now", position: "top", fill: "white", fontSize: 14, fontWeight: "bold", offset: 10 }}
              />
            </>
          )}

          {/* Tomorrow section - shaded area */}
          {hasTomorrow && midnightIndex >= 0 && (
            <ReferenceArea
              x1={midnightIndex}
              x2={chartData.length - 1}
              fill="white"
              fillOpacity={0.08}
              label={{ value: "Tomorrow", position: "insideTopLeft", fill: "rgba(200, 200, 200, 0.8)", fontSize: 14, fontWeight: "bold" }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};
