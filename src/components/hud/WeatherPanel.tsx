import { motion } from "framer-motion";
import { Cloud, Sun, Droplets, Wind } from "lucide-react";
import HudPanel from "./HudPanel";

const WeatherPanel = () => {
  return (
    <HudPanel title="Atmosférico" delay={0.3} variant="bordered" className="w-40">
      <div className="text-center">
        {/* Temperature display */}
        <div className="relative inline-block">
          <motion.div
            className="font-display text-5xl text-primary text-glow-lg"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            28°
          </motion.div>
          <Sun className="absolute -right-6 top-0 w-6 h-6 text-yellow-400 animate-pulse" />
        </div>
        
        <div className="text-xs text-muted-foreground mt-1 mb-4">
          São Paulo, BR
        </div>

        {/* Weather details */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-secondary/30 rounded p-2">
            <Droplets className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-muted-foreground">Umidade</div>
            <div className="text-primary font-display">65%</div>
          </div>
          <div className="bg-secondary/30 rounded p-2">
            <Wind className="w-4 h-4 text-primary mx-auto mb-1" />
            <div className="text-muted-foreground">Vento</div>
            <div className="text-primary font-display">12km/h</div>
          </div>
        </div>

        {/* Forecast bar */}
        <div className="mt-3 pt-2 border-t border-primary/20">
          <div className="flex justify-between text-xs">
            <div className="text-center">
              <div className="text-muted-foreground">SEG</div>
              <Cloud className="w-3 h-3 text-primary mx-auto my-1" />
              <div className="text-primary">26°</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">TER</div>
              <Sun className="w-3 h-3 text-yellow-400 mx-auto my-1" />
              <div className="text-primary">30°</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">QUA</div>
              <Cloud className="w-3 h-3 text-primary mx-auto my-1" />
              <div className="text-primary">27°</div>
            </div>
          </div>
        </div>
      </div>
    </HudPanel>
  );
};

export default WeatherPanel;
