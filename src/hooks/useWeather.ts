import { useState, useEffect } from 'react';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  city: string;
  country: string;
  sunrise: number;
  sunset: number;
  visibility: number;
  pressure: number;
  clouds: number;
  forecast: ForecastDay[];
}

interface ForecastDay {
  day: string;
  temp: number;
  icon: string;
  description: string;
}

interface UseWeatherReturn {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Free weather API using Open-Meteo (no API key required)
export const useWeather = (latitude: number | null, longitude: number | null): UseWeatherReturn => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    if (latitude === null || longitude === null) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch current weather from Open-Meteo
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&daily=weather_code,temperature_2m_max&timezone=auto&forecast_days=4`
      );

      if (!weatherResponse.ok) {
        throw new Error('Erro ao buscar dados do clima');
      }

      const weatherData = await weatherResponse.json();

      // Fetch city name from reverse geocoding
      const geoResponse = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
      );

      let city = 'Localização';
      let country = '';

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Local';
        country = geoData.countryCode || '';
      }

      // Map weather codes to descriptions and icons
      const getWeatherInfo = (code: number) => {
        const weatherMap: Record<number, { description: string; icon: string }> = {
          0: { description: 'Céu limpo', icon: 'clear' },
          1: { description: 'Principalmente limpo', icon: 'clear' },
          2: { description: 'Parcialmente nublado', icon: 'cloudy' },
          3: { description: 'Nublado', icon: 'overcast' },
          45: { description: 'Neblina', icon: 'fog' },
          48: { description: 'Neblina gelada', icon: 'fog' },
          51: { description: 'Garoa leve', icon: 'drizzle' },
          53: { description: 'Garoa moderada', icon: 'drizzle' },
          55: { description: 'Garoa intensa', icon: 'drizzle' },
          61: { description: 'Chuva leve', icon: 'rain' },
          63: { description: 'Chuva moderada', icon: 'rain' },
          65: { description: 'Chuva forte', icon: 'rain' },
          71: { description: 'Neve leve', icon: 'snow' },
          73: { description: 'Neve moderada', icon: 'snow' },
          75: { description: 'Neve forte', icon: 'snow' },
          80: { description: 'Pancadas leves', icon: 'showers' },
          81: { description: 'Pancadas moderadas', icon: 'showers' },
          82: { description: 'Pancadas fortes', icon: 'showers' },
          95: { description: 'Tempestade', icon: 'thunderstorm' },
          96: { description: 'Tempestade com granizo', icon: 'thunderstorm' },
          99: { description: 'Tempestade severa', icon: 'thunderstorm' },
        };
        return weatherMap[code] || { description: 'Desconhecido', icon: 'unknown' };
      };

      const current = weatherData.current;
      const currentWeatherInfo = getWeatherInfo(current.weather_code);

      // Build forecast
      const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
      const forecast: ForecastDay[] = weatherData.daily.time.slice(1, 4).map((date: string, index: number) => {
        const dayDate = new Date(date);
        const weatherInfo = getWeatherInfo(weatherData.daily.weather_code[index + 1]);
        return {
          day: days[dayDate.getDay()],
          temp: Math.round(weatherData.daily.temperature_2m_max[index + 1]),
          icon: weatherInfo.icon,
          description: weatherInfo.description,
        };
      });

      setWeather({
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        description: currentWeatherInfo.description,
        icon: currentWeatherInfo.icon,
        city,
        country,
        sunrise: 0,
        sunset: 0,
        visibility: 10000,
        pressure: Math.round(current.surface_pressure),
        clouds: current.cloud_cover,
        forecast,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  return { weather, loading, error, refetch: fetchWeather };
};
