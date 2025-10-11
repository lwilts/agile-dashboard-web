import { useState, useEffect } from 'react';
import { WeatherData } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { getWeatherIcon } from '../services/weatherApi';

interface HeaderProps {
  weather: WeatherData | null;
}

export const Header = ({ weather }: HeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const weatherIcon = weather ? getWeatherIcon(weather.weatherCode) : 'unknown';

  return (
    <div className="header">
      <div className="weather-section">
        {weather && (
          <>
            <WeatherIcon type={weatherIcon} size={22} />
            <span>
              {Math.round(weather.maxTemp)}°/{Math.round(weather.minTemp)}°
            </span>
          </>
        )}
      </div>
      <div className="time-section">{formatTime(currentTime)}</div>
    </div>
  );
};
