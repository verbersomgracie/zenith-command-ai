import { motion } from "framer-motion";
import { Cloud, Sun, Droplets, Wind, CloudRain, CloudSnow, CloudLightning, CloudFog, Loader2 } from "lucide-react";
import HudPanel from "./HudPanel";

interface WeatherPanelProps {
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    description: string;
    icon: string;
    city: string;
    country: string;
    forecast: { day: string; temp: number; icon: string }[];
  } | null;
  loading: boolean;
  error: string | null;
}

const getWeatherIcon = (icon: string, className: string = "w-5 h-5") => {
  const icons: Record<string, JSX.Element> = {
    'clear': <Sun className={`${className} text-yellow-400`} />,
    'cloudy': <Cloud className={`${className} text-primary`} />,
    'overcast': <Cloud className={`${className} text-primary`} />,
    'rain': <CloudRain className={`${className} text-blue-400`} />,
    'drizzle': <CloudRain className={`${className} text-blue-400`} />,
    'showers': <CloudRain className={`${className} text-blue-400`} />,
    'snow': <CloudSnow className={`${className} text-blue-200`} />,
    'thunderstorm': <CloudLightning className={`${className} text-yellow-500`} />,
    'fog': <CloudFog className={`${className} text-gray-400`} />,
  };
  return icons[icon] || <Sun className={`${className} text-yellow-400`} />;
};

const WeatherPanel = ({ weather, loading, error }: WeatherPanelProps) => {
  return (
    <HudPanel title="Clima" delay={0.3} variant="bordered" compact>
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="text-[10px] text-red-400 py-2">{error}</div>
      ) : weather ? (
        <div className="space-y-2">
          {/* Main temp */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getWeatherIcon(weather.icon)}
              <motion.span
                className="font-display text-2xl text-primary text-glow-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {weather.temperature}°
              </motion.span>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-foreground truncate max-w-[80px]">{weather.city}</div>
              <div className="text-[10px] text-muted-foreground">{weather.description}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-1">
              <Droplets className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">{weather.windSpeed}km/h</span>
            </div>
          </div>

          {/* Forecast */}
          {weather.forecast?.length > 0 && (
            <div className="flex justify-between pt-2 border-t border-primary/20">
              {weather.forecast.map((day, i) => (
                <div key={i} className="text-center text-[10px]">
                  <div className="text-muted-foreground">{day.day}</div>
                  <div className="my-0.5">{getWeatherIcon(day.icon, "w-3 h-3 mx-auto")}</div>
                  <div className="text-primary font-display">{day.temp}°</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground py-2">Ative a localização</div>
      )}
    </HudPanel>
  );
};

export default WeatherPanel;
