import { useState, useEffect, useCallback } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface NetworkInfo {
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
  type?: string;
  online: boolean;
}

interface DeviceInfo {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: NetworkInfo;
  battery: {
    level: number;
    charging: boolean;
  } | null;
  cpu: {
    cores: number;
    usage: number;
  };
}

// Extend Navigator interface for memory and connection
declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
  interface Navigator {
    connection?: {
      downlink?: number;
      effectiveType?: string;
      rtt?: number;
      saveData?: boolean;
      type?: string;
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    };
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
      addEventListener: (type: string, listener: () => void) => void;
      removeEventListener: (type: string, listener: () => void) => void;
    }>;
    deviceMemory?: number;
  }
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    memory: { used: 0, total: 0, percentage: 0 },
    network: { online: navigator.onLine },
    battery: null,
    cpu: { cores: navigator.hardwareConcurrency || 4, usage: 0 },
  });

  // Simulate CPU usage based on performance timing
  const estimateCPUUsage = useCallback(() => {
    const start = performance.now();
    let iterations = 0;
    
    // Quick computation test
    while (performance.now() - start < 10) {
      Math.random() * Math.random();
      iterations++;
    }
    
    // Normalize to percentage (higher iterations = lower CPU usage)
    const maxIterations = 50000;
    const usage = Math.max(5, Math.min(95, 100 - (iterations / maxIterations) * 100));
    return Math.round(usage + (Math.random() * 10 - 5)); // Add some variance
  }, []);

  const updateDeviceInfo = useCallback(() => {
    // Memory info
    let memoryInfo = { used: 0, total: 0, percentage: 0 };
    
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.jsHeapSizeLimit;
      memoryInfo = {
        used: Math.round(used / 1024 / 1024), // MB
        total: Math.round(total / 1024 / 1024), // MB
        percentage: Math.round((used / total) * 100),
      };
    } else if (navigator.deviceMemory) {
      // Fallback for deviceMemory API
      const total = navigator.deviceMemory * 1024; // GB to MB
      const used = total * (0.3 + Math.random() * 0.4); // Estimate 30-70% usage
      memoryInfo = {
        used: Math.round(used),
        total: Math.round(total),
        percentage: Math.round((used / total) * 100),
      };
    }

    // Network info
    const connection = navigator.connection;
    const networkInfo: NetworkInfo = {
      online: navigator.onLine,
      downlink: connection?.downlink,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      type: connection?.type,
    };

    // CPU usage estimate
    const cpuUsage = estimateCPUUsage();

    setDeviceInfo(prev => ({
      ...prev,
      memory: memoryInfo,
      network: networkInfo,
      cpu: {
        cores: navigator.hardwareConcurrency || 4,
        usage: cpuUsage,
      },
    }));
  }, [estimateCPUUsage]);

  // Get battery info
  useEffect(() => {
    if (navigator.getBattery) {
      navigator.getBattery().then(battery => {
        const updateBattery = () => {
          setDeviceInfo(prev => ({
            ...prev,
            battery: {
              level: Math.round(battery.level * 100),
              charging: battery.charging,
            },
          }));
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);

        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      });
    }
  }, []);

  // Update device info periodically
  useEffect(() => {
    updateDeviceInfo();
    const interval = setInterval(updateDeviceInfo, 2000);

    // Network status listeners
    const handleOnline = () => setDeviceInfo(prev => ({
      ...prev,
      network: { ...prev.network, online: true },
    }));
    const handleOffline = () => setDeviceInfo(prev => ({
      ...prev,
      network: { ...prev.network, online: false },
    }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateDeviceInfo]);

  return deviceInfo;
};
