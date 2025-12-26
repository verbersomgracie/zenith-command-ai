import { motion } from "framer-motion";
import { Battery, BatteryCharging, Zap } from "lucide-react";
import HudPanel from "./HudPanel";
import { formatUptime } from "@/hooks/useRealTimeData";

interface StatusItemProps {
  label: string;
  value: number;
  unit?: string;
}

const StatusItem = ({ label, value, unit = "%" }: StatusItemProps) => (
  <div className="mb-2">
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-primary font-display">{value}{unit}</span>
    </div>
    <div className="h-1 bg-secondary/50 rounded-full overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  </div>
);

interface SystemStatusPanelProps {
  cpu: { cores: number; usage: number };
  memory: { used: number; total: number; percentage: number };
  battery: { level: number; charging: boolean } | null;
  network: { online: boolean; downlink?: number };
  uptime: number;
}

const SystemStatusPanel = ({ cpu, memory, battery, network, uptime }: SystemStatusPanelProps) => {
  const energyLevel = battery?.level ?? 100;
  const isCharging = battery?.charging ?? false;
  
  return (
    <HudPanel title="Sistema" delay={0.2} variant="bordered" compact>
      <div className="space-y-1">
        {/* Battery/Energy gauge - compact */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
          <svg className="w-10 h-10 flex-shrink-0" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
            <motion.circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke={energyLevel < 20 ? "hsl(0, 70%, 50%)" : "hsl(var(--primary))"}
              strokeWidth="3"
              strokeDasharray="100"
              strokeLinecap="round"
              initial={{ strokeDashoffset: 100 }}
              animate={{ strokeDashoffset: 100 - (100 * energyLevel / 100) }}
              transition={{ duration: 0.5 }}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
            <text x="20" y="20" textAnchor="middle" dominantBaseline="middle" className="fill-primary font-display text-[8px]">
              {energyLevel}%
            </text>
          </svg>
          <div className="text-[10px] flex-1 min-w-0">
            <div className="text-primary font-display flex items-center gap-1">
              {isCharging ? <BatteryCharging className="w-3 h-3" /> : battery ? <Battery className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              <span className="truncate">{isCharging ? "CARREGANDO" : battery ? "BATERIA" : "ENERGIA"}</span>
            </div>
            <div className="text-muted-foreground truncate">{formatUptime(uptime)}</div>
          </div>
        </div>

        <StatusItem label="CPU" value={cpu.usage} />
        <StatusItem label="RAM" value={memory.percentage} />
        <StatusItem label="REDE" value={network.online ? (network.downlink ? Math.min(network.downlink * 10, 100) : 80) : 0} />
        
        <div className="pt-2 mt-2 border-t border-primary/20 text-[10px] text-muted-foreground">
          <span>{cpu.cores} núcleos</span>
          {memory.total > 0 && <span className="ml-2">• {memory.used}MB</span>}
        </div>
      </div>
    </HudPanel>
  );
};

export default SystemStatusPanel;
