import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { Header } from './components/Header';
import { StatTiles } from './components/StatTiles';
import { SlotReadout } from './components/SlotReadout';
import { PriceChart } from './components/PriceChart';
import { PriceData, WeatherData, GasData } from './types';
import { fetchTodayAndTomorrowPrices } from './services/octopusApi';
import { fetchGasPrices } from './services/gasApi';
import { fetchWeather } from './services/weatherApi';
import { cache } from './services/cache';
import { buildMockScenario } from './services/mockPrices';
import { toLocalDateString } from './utils/dates';
import { buildChartWindow, extremes, findCurrentSlotIndex } from './utils/prices';

const DATA_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CLOCK_INTERVAL = 30 * 1000; // moves the "Now" marker
const CHART_MIN_SLOTS = 12; // floor for the chart window near midnight, before tomorrow publishes
const SELECTION_IDLE_MS = 45 * 1000; // reverts a sticky (tap) selection if left untouched
const SLOT_MS = 30 * 60 * 1000;

// Dev-only fixtures for edge cases (negative prices, DST days, API failure)
// that can't be produced from live data on demand: /?mock=<scenario>, plus
// an optional &now=<ISO> to pin the clock for a deterministic screenshot.
// Read once at module load - the query string doesn't change mid-session.
const isDev = import.meta.env.DEV;
const searchParams = isDev ? new URLSearchParams(window.location.search) : null;
const MOCK_SCENARIO = searchParams?.get('mock') ?? null;
const MOCK_NOW = searchParams?.get('now') ?? null;

function App() {
  const [loading, setLoading] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [todayPrices, setTodayPrices] = useState<PriceData[]>([]);
  const [tomorrowPrices, setTomorrowPrices] = useState<PriceData[]>([]);
  const [gas, setGas] = useState<GasData>({ today: null, tomorrow: null });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [stale, setStale] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => (MOCK_NOW ? new Date(MOCK_NOW) : new Date()));
  const [selectedTimestamp, setSelectedTimestampState] = useState<number | null>(null);

  // Whether we have ever successfully shown price data - only ever used to
  // decide whether a fetch failure is a blank first load (show the error
  // screen) or a blip against a good screen (keep showing it, marked stale).
  const pricesLoadedRef = useRef(false);
  // The local day today/tomorrowPrices currently describe, so the clock
  // tick can detect a midnight rollover and refetch immediately instead of
  // showing yesterday's window for up to 5 minutes.
  const fetchedDateRef = useRef<string | null>(null);
  const idleTimer = useRef<number | null>(null);

  const fetchAllData = useCallback(async () => {
    const now = new Date();
    fetchedDateRef.current = toLocalDateString(now);

    if (MOCK_SCENARIO) {
      const scenario = buildMockScenario(MOCK_SCENARIO, MOCK_NOW ? new Date(MOCK_NOW) : now);
      if (scenario.failPrices) {
        setStale(true);
        if (!pricesLoadedRef.current) {
          setPriceError(`Unable to load price data (mock scenario: ${MOCK_SCENARIO}).`);
        }
      } else {
        pricesLoadedRef.current = true;
        setTodayPrices(scenario.today);
        setTomorrowPrices(scenario.tomorrow);
        setStale(false);
        setPriceError(null);
      }
      setGas(scenario.gas);
      setWeather(scenario.weather);
      setLoading(false);
      return;
    }

    cache.cleanOldCaches();

    const [pricesResult, gasResult, weatherResult] = await Promise.allSettled([
      fetchTodayAndTomorrowPrices(),
      fetchGasPrices(),
      fetchWeather(),
    ]);

    if (pricesResult.status === 'fulfilled') {
      pricesLoadedRef.current = pricesLoadedRef.current || pricesResult.value.today.length > 0;
      setTodayPrices(pricesResult.value.today);
      setTomorrowPrices(pricesResult.value.tomorrow);
      setStale(pricesResult.value.stale);
      setPriceError(null);
    } else {
      // A network blip must never blank a screen that was showing good data -
      // keep it, just mark it stale, and only surface an error if we have
      // genuinely never had anything to show.
      console.error('Error fetching prices:', pricesResult.reason);
      setStale(true);
      if (!pricesLoadedRef.current) {
        setPriceError('Unable to load price data. Check your connection or configuration.');
      }
    }

    if (gasResult.status === 'fulfilled') {
      setGas(gasResult.value);
    } else {
      console.error('Error fetching gas price:', gasResult.reason);
    }

    if (weatherResult.status === 'fulfilled') {
      setWeather(weatherResult.value);
    } else {
      console.error('Error fetching weather:', weatherResult.reason);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllData();

    // A pinned clock (deterministic screenshots/tests) never ticks or refetches.
    if (MOCK_NOW) return;

    const dataInterval = setInterval(fetchAllData, DATA_INTERVAL);
    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      if (fetchedDateRef.current !== null && toLocalDateString(now) !== fetchedDateRef.current) {
        fetchAllData();
      }
    }, CLOCK_INTERVAL);

    return () => {
      clearInterval(dataInterval);
      clearInterval(clockInterval);
    };
  }, [fetchAllData]);

  useEffect(
    () => () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    },
    []
  );

  const setSelectedTimestamp = useCallback((timestamp: number | null, sticky: boolean) => {
    if (idleTimer.current !== null) {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = null;
    }
    setSelectedTimestampState(timestamp);
    if (timestamp !== null && sticky) {
      idleTimer.current = window.setTimeout(() => setSelectedTimestampState(null), SELECTION_IDLE_MS);
    }
  }, []);

  // Recomputed on data change or on crossing a half-hour boundary - not on
  // every 30s clock tick, which would otherwise rebuild it needlessly.
  const halfHourBucket = Math.floor(currentTime.getTime() / SLOT_MS);
  // currentTime is read inside the factory but deliberately left out of the
  // deps: it updates every 30s while halfHourBucket only changes once every
  // 30 minutes, and both change together on the tick where the bucket does.
  const chartWindow = useMemo(
    () => buildChartWindow(todayPrices, tomorrowPrices, currentTime, CHART_MIN_SLOTS),
    [todayPrices, tomorrowPrices, halfHourBucket]
  );

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard&hellip;</div>
      </div>
    );
  }

  if (priceError && todayPrices.length === 0) {
    return (
      <div className="dashboard">
        <div className="error">{priceError}</div>
      </div>
    );
  }

  const nowIndex = findCurrentSlotIndex(todayPrices, currentTime);
  const currentPrice = nowIndex >= 0 ? todayPrices[nowIndex].price : null;

  const { min: todayMin, max: todayMax } = extremes(todayPrices);
  const { min: tomorrowMin, max: tomorrowMax } = extremes(tomorrowPrices);
  const hasTomorrow = tomorrowPrices.length > 0;
  const firstTomorrowTimestamp = hasTomorrow ? tomorrowPrices[0].timestamp.getTime() : null;

  return (
    <div className="dashboard">
      <Header weather={weather} stale={stale} />
      <StatTiles
        currentPrice={currentPrice}
        todayMin={todayMin}
        todayMax={todayMax}
        tomorrowMin={tomorrowMin}
        tomorrowMax={tomorrowMax}
        gas={gas}
        hasTomorrow={hasTomorrow}
      />
      <SlotReadout
        window={chartWindow}
        firstTomorrowTimestamp={firstTomorrowTimestamp}
        selectedTimestamp={selectedTimestamp}
        now={currentTime}
      />
      <PriceChart
        window={chartWindow}
        firstTomorrowTimestamp={firstTomorrowTimestamp}
        now={currentTime}
        selectedTimestamp={selectedTimestamp}
        onSelect={setSelectedTimestamp}
      />
    </div>
  );
}

export default App;
