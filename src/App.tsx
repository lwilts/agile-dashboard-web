import { useState, useEffect } from 'react';
import './App.css';
import { Header } from './components/Header';
import { PriceBoxes } from './components/PriceBoxes';
import { PriceChart } from './components/PriceChart';
import { PriceData, WeatherData, GasData } from './types';
import { fetchTodayAndTomorrowPrices } from './services/octopusApi';
import { fetchGasPrices } from './services/gasApi';
import { fetchWeather } from './services/weatherApi';
import { cache } from './services/cache';

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayPrices, setTodayPrices] = useState<PriceData[]>([]);
  const [tomorrowPrices, setTomorrowPrices] = useState<PriceData[]>([]);
  const [gas, setGas] = useState<GasData>({ today: 0, tomorrow: null });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchAllData = async () => {
    try {
      console.log('Fetching data...');

      // Clean up old caches
      cache.cleanOldCaches();

      // Fetch all data in parallel
      const [pricesResult, gasResult, weatherResult] = await Promise.all([
        fetchTodayAndTomorrowPrices(),
        fetchGasPrices(),
        fetchWeather(),
      ]);

      setTodayPrices(pricesResult.today);
      setTomorrowPrices(pricesResult.tomorrow);
      setGas(gasResult);
      setWeather(weatherResult);

      if (pricesResult.today.length === 0) {
        setError('No price data available. Please check your configuration.');
      } else {
        setError(null);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data immediately
    fetchAllData();

    // Set up periodic data updates (5 minutes)
    const dataInterval = setInterval(fetchAllData, UPDATE_INTERVAL);

    // Set up time updates (every 30 seconds to update the "Now" line)
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(timeInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error && todayPrices.length === 0) {
    return (
      <div className="dashboard">
        <div className="error">{error}</div>
      </div>
    );
  }

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentPeriodMinute = Math.floor(currentMinute / 30) * 30;

  // Find current price
  const currentPrice =
    todayPrices.find(
      (p) => p.hour === currentHour && p.minute === currentPeriodMinute
    )?.price || null;

  // Calculate min and max from today's prices
  const todayMinPrice =
    todayPrices.length > 0 ? Math.min(...todayPrices.map((p) => p.price)) : null;
  const todayMaxPrice =
    todayPrices.length > 0 ? Math.max(...todayPrices.map((p) => p.price)) : null;

  // Calculate min and max from tomorrow's prices
  const tomorrowMinPrice =
    tomorrowPrices.length > 0 ? Math.min(...tomorrowPrices.map((p) => p.price)) : null;
  const tomorrowMaxPrice =
    tomorrowPrices.length > 0 ? Math.max(...tomorrowPrices.map((p) => p.price)) : null;

  const hasTomorrow = tomorrowPrices.length > 0;

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <Header weather={weather} />
        <PriceBoxes
          currentPrice={currentPrice}
          todayMinPrice={todayMinPrice}
          todayMaxPrice={todayMaxPrice}
          tomorrowMinPrice={tomorrowMinPrice}
          tomorrowMaxPrice={tomorrowMaxPrice}
          gas={gas}
          hasTomorrow={hasTomorrow}
        />
        <PriceChart
          todayPrices={todayPrices}
          tomorrowPrices={tomorrowPrices}
          currentHour={currentHour}
          currentMinute={currentMinute}
        />
      </div>
    </div>
  );
}

export default App;
