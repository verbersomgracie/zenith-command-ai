import { motion } from "framer-motion";
import { Battery, BatteryCharging, Zap } from "lucide-react";
import HudPanel from "./HudPanel";
import { formatUptime } from "@/hooks/useRealTimeData";

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
        className="h-full rounded-full"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

interface SystemStatusPanelProps {
  cpu: {
    cores: number;
    usage: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  battery: {
    level: number;
    charging: boolean;
  } | null;
  network: {
    online: boolean;
    downlink?: number;
  };
  uptime: number;
}

const SystemStatusPanel = ({ cpu, memory, battery, network, uptime }: SystemStatusPanelProps) => {
  const energyLevel = battery?.level ?? 100;
  const isCharging = battery?.charging ?? false;
  
  return (
    <HudPanel title="Status do Sistema" delay={0.2} variant="bordered" className="w-44">
      <div className="space-y-1">
        {/* Battery/Energy gauge */}
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
              stroke={energyLevel < 20 ? "hsl(0, 70%, 50%)" : "hsl(var(--primary))"}
              strokeWidth="4"
              strokeDasharray="176"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 176 }}
              animate={{ strokeDashoffset: 176 - (176 * energyLevel / 100) }}
              transition={{ duration: 0.5 }}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text
              x="32"
              y="32"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-primary font-display text-sm"
            >
              {energyLevel}%
            </text>
          </svg>
          <div className="text-xs">
            <div className="text-primary font-display flex items-center gap-1">
              {isCharging ? (
                <>
                  <BatteryCharging className="w-3 h-3" />
                  CARREGANDO
                </>
              ) : battery ? (
                <>
                  <Battery className="w-3 h-3" />
                  BATERIA
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3" />
                  ENERGIA
                </>
              )}
            </div>
            <div className="text-muted-foreground">
              {isCharging ? "Conectado" : battery ? "Desconectado" : "AC Power"}
            </div>
          </div>
        </div>

        <StatusItem label="CPU" value={cpu.usage} />
        <StatusItem label="Memória" value={memory.percentage} />
        <StatusItem 
          label="Rede" 
          value={network.online ? (network.downlink ? Math.min(network.downlink * 10, 100) : 80) : 0} 
        />
        
        <div className="border-t border-primary/20 pt-2 mt-3">
          <div className="flex items-center gap-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${network.online ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="text-muted-foreground">Uptime:</span>
            <span className="text-primary font-display">{formatUptime(uptime)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs mt-1">
            <span className="text-muted-foreground">Núcleos:</span>
            <span className="text-primary font-display">{cpu.cores}</span>
          </div>
          {memory.total > 0 && (
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className="text-muted-foreground">RAM:</span>
              <span className="text-primary font-display">{memory.used}MB / {memory.total}MB</span>
            </div>
          )}
        </div>
      </div>
    </HudPanel>
  );
};

export default SystemStatusPanel;
