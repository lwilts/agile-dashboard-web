import { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherIcon } from '../services/weatherApi';

interface HeaderProps {
  weather: WeatherData | null;
  /** True when the prices on screen are a stale fallback after a failed refresh - shown as a quiet marker, never a blocking error. */
  stale: boolean;
}

export const Header = ({ weather, stale }: HeaderProps) => {
  // Its own ticking clock, independent of the app's 30s "now" clock, kept in
  // this leaf so a 1s tick never re-renders the chart above it.
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string =>
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

  const weatherIcon = weather ? getWeatherIcon(weather.weatherCode) : 'unknown';

  return (
    <div className="app-header">
      <div className="header-weather">
        {weather && (
          <>
            <WeatherIcon type={weatherIcon} size={18} />
            <span>
              {Math.round(weather.maxTemp)}&deg;/{Math.round(weather.minTemp)}&deg;
            </span>
          </>
        )}
      </div>
      <div className="header-time">
        {stale && (
          <span className="header-stale" title="Showing the last successfully loaded prices">
            &#9679;
          </span>
        )}
        {formatTime(currentTime)}
      </div>
    </div>
  );
};
