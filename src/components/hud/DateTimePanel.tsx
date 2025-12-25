import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import HudPanel from "./HudPanel";

const DateTimePanel = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  return (
    <HudPanel delay={0.1} variant="minimal" className="w-36">
      <div className="relative">
        {/* Circular ring decoration */}
        <svg className="absolute -left-2 -top-2 w-20 h-20" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="8 4"
            className="opacity-40"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeDasharray="60 200"
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: "center" }}
          />
        </svg>
        
        <div className="pl-16 pt-1">
          <div className="font-display text-primary text-2xl tracking-wider text-glow-sm">
            {time.getHours().toString().padStart(2, "0")}
            <span className="animate-pulse">:</span>
            {time.getMinutes().toString().padStart(2, "0")}
            <span className="text-xs text-primary/60 ml-1">
              {time.getSeconds().toString().padStart(2, "0")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {days[time.getDay()]}
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-3">
          <div className="font-display text-4xl text-primary text-glow-lg">
            {time.getDate()}
          </div>
          <div className="text-xs text-muted-foreground">
            <div>{months[time.getMonth()]}</div>
            <div>{time.getFullYear()}</div>
          </div>
        </div>
      </div>
    </HudPanel>
  );
};

export default DateTimePanel;
