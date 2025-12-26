import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import HudPanel from "./HudPanel";

const DateTimePanel = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const days = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

  return (
    <HudPanel delay={0.1} variant="bordered" compact>
      <div className="flex items-center gap-3">
        {/* Circular ring decoration */}
        <div className="relative flex-shrink-0">
          <svg className="w-12 h-12" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1"
              strokeDasharray="6 3"
              className="opacity-40"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="16"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="40 100"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: "center" }}
            />
            <text
              x="24"
              y="24"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-primary font-display text-[10px]"
            >
              {time.getDate()}
            </text>
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-display text-primary text-lg tracking-wider text-glow-sm">
            {time.getHours().toString().padStart(2, "0")}
            <span className="animate-pulse">:</span>
            {time.getMinutes().toString().padStart(2, "0")}
            <span className="text-[10px] text-primary/60 ml-0.5">
              {time.getSeconds().toString().padStart(2, "0")}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {days[time.getDay()]} • {months[time.getMonth()]} {time.getFullYear()}
          </div>
        </div>
      </div>
    </HudPanel>
  );
};

export default DateTimePanel;
