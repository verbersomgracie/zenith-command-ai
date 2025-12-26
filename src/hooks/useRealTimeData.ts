import { useState, useEffect } from 'react';
import { useDeviceInfo } from './useDeviceInfo';
import { useGeolocation } from './useGeolocation';
import { useWeather } from './useWeather';

export interface RealTimeData {
  device: ReturnType<typeof useDeviceInfo>;
  location: ReturnType<typeof useGeolocation>;
  weather: ReturnType<typeof useWeather>;
  uptime: number;
  currentTime: Date;
}

export const useRealTimeData = () => {
  const device = useDeviceInfo();
  const location = useGeolocation();
  const weather = useWeather(location.latitude, location.longitude);
  const [uptime, setUptime] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update uptime
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update current time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    device,
    location,
    weather,
    uptime,
    currentTime,
  };
};

// Format uptime to human readable string
export const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};
