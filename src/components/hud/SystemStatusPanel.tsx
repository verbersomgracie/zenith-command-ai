import { motion } from "framer-motion";
import HudPanel from "./HudPanel";

interface StatusItemProps {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}

const StatusItem = ({ label, value, unit = "%", color = "primary" }: StatusItemProps) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-primary font-display">{value}{unit}</span>
    </div>
    <div className="h-1.5 bg-secondary/50 rounded-full overflow-hidden">
      <motion.div
        className={`h-full bg-${color} rounded-full`}
        style={{ backgroundColor: `hsl(var(--${color}))` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 1, delay: 0.5 }}
      />
    </div>
  </div>
);

const SystemStatusPanel = () => {
  return (
    <HudPanel title="Status do Sistema" delay={0.2} variant="bordered" className="w-44">
      <div className="space-y-1">
        {/* Circular gauge */}
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-16 h-16" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="4"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
              strokeDasharray="176"
              strokeDashoffset="30"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 176 }}
              animate={{ strokeDashoffset: 30 }}
              transition={{ duration: 1.5, delay: 0.3 }}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text
              x="32"
              y="32"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-primary font-display text-sm"
            >
              85%
            </text>
          </svg>
          <div className="text-xs">
            <div className="text-primary font-display">ENERGIA</div>
            <div className="text-muted-foreground">Carregando</div>
          </div>
        </div>

        <StatusItem label="CPU" value={42} />
        <StatusItem label="Memória" value={67} />
        <StatusItem label="Rede" value={93} />
        
        <div className="border-t border-primary/20 pt-2 mt-3">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-muted-foreground">Uptime:</span>
            <span className="text-primary font-display">12h 35m</span>
          </div>
        </div>
      </div>
    </HudPanel>
  );
};

export default SystemStatusPanel;
