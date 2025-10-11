import { WeatherData, WeatherIconType } from '../types';
import { config } from '../config';

interface WeatherApiResponse {
  daily: {
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    weather_code: number[];
  };
}

export const fetchWeather = async (): Promise<WeatherData | null> => {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast';

    const params = new URLSearchParams({
      latitude: config.weatherLat.toString(),
      longitude: config.weatherLon.toString(),
      daily: 'temperature_2m_min,temperature_2m_max,weather_code',
      timezone: 'auto',
      forecast_days: '1',
    });

    console.log('Fetching weather data...');
    const response = await fetch(`${url}?${params}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: WeatherApiResponse = await response.json();

    const weather: WeatherData = {
      minTemp: data.daily.temperature_2m_min[0],
      maxTemp: data.daily.temperature_2m_max[0],
      weatherCode: data.daily.weather_code[0],
    };

    console.log(
      `Weather - Min: ${weather.minTemp}°, Max: ${weather.maxTemp}°, Code: ${weather.weatherCode}`
    );

    return weather;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
};

export const getWeatherIcon = (weatherCode: number | null): WeatherIconType => {
  if (weatherCode === null) return 'unknown';
  if (weatherCode === 0) return 'sunny';
  if (weatherCode === 1 || weatherCode === 2) return 'partly_cloudy';
  if (weatherCode === 3) return 'cloudy';
  if (weatherCode === 45 || weatherCode === 48) return 'foggy';
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
  )
    return 'rainy';
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return 'snowy';
  if ([95, 96, 99].includes(weatherCode)) return 'stormy';
  return 'cloudy';
};
