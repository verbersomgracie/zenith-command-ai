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
    forecast: {
      day: string;
      temp: number;
      icon: string;
    }[];
  } | null;
  loading: boolean;
  error: string | null;
}

const getWeatherIcon = (icon: string, className: string = "w-6 h-6") => {
  switch (icon) {
    case 'clear':
      return <Sun className={`${className} text-yellow-400`} />;
    case 'cloudy':
    case 'overcast':
      return <Cloud className={`${className} text-primary`} />;
    case 'rain':
    case 'drizzle':
    case 'showers':
      return <CloudRain className={`${className} text-blue-400`} />;
    case 'snow':
      return <CloudSnow className={`${className} text-blue-200`} />;
    case 'thunderstorm':
      return <CloudLightning className={`${className} text-yellow-500`} />;
    case 'fog':
      return <CloudFog className={`${className} text-gray-400`} />;
    default:
      return <Sun className={`${className} text-yellow-400`} />;
  }
};

const WeatherPanel = ({ weather, loading, error }: WeatherPanelProps) => {
  return (
    <HudPanel title="Atmosférico" delay={0.3} variant="bordered" className="w-40">
      <div className="text-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs text-muted-foreground mt-2">Carregando...</span>
          </div>
        ) : error ? (
          <div className="text-xs text-red-400 py-4">{error}</div>
        ) : weather ? (
          <>
            {/* Temperature display */}
            <div className="relative inline-block">
              <motion.div
                className="font-display text-5xl text-primary text-glow-lg"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                {weather.temperature}°
              </motion.div>
              <div className="absolute -right-8 top-0">
                {getWeatherIcon(weather.icon)}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground mt-1 mb-4 truncate">
              {weather.city}{weather.country ? `, ${weather.country}` : ''}
            </div>

            <div className="text-xs text-primary/80 mb-3">{weather.description}</div>

            {/* Weather details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-secondary/30 rounded p-2">
                <Droplets className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="text-muted-foreground">Umidade</div>
                <div className="text-primary font-display">{weather.humidity}%</div>
              </div>
              <div className="bg-secondary/30 rounded p-2">
                <Wind className="w-4 h-4 text-primary mx-auto mb-1" />
                <div className="text-muted-foreground">Vento</div>
                <div className="text-primary font-display">{weather.windSpeed}km/h</div>
              </div>
            </div>

            {/* Forecast bar */}
            {weather.forecast && weather.forecast.length > 0 && (
              <div className="mt-3 pt-2 border-t border-primary/20">
                <div className="flex justify-between text-xs">
                  {weather.forecast.map((day, index) => (
                    <div key={index} className="text-center">
                      <div className="text-muted-foreground">{day.day}</div>
                      <div className="my-1">
                        {getWeatherIcon(day.icon, "w-3 h-3 mx-auto")}
                      </div>
                      <div className="text-primary">{day.temp}°</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground py-4">
            Ative a localização para ver o clima
          </div>
        )}
      </div>
    </HudPanel>
  );
};

export default WeatherPanel;
