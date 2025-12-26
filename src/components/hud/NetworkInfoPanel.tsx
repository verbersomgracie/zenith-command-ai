import { motion } from "framer-motion";
import { Wifi, WifiOff, Activity, Signal, MapPin } from "lucide-react";
import HudPanel from "./HudPanel";

interface NetworkInfoPanelProps {
  network: {
    online: boolean;
    downlink?: number;
    effectiveType?: string;
    rtt?: number;
  };
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    loading: boolean;
    error: string | null;
  };
}

const NetworkInfoPanel = ({ network, location }: NetworkInfoPanelProps) => {
  return (
    <HudPanel title="Rede" delay={0.35} variant="bordered" compact>
      <div className="space-y-2">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {network.online ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-[10px] font-display ${network.online ? 'text-green-400' : 'text-red-400'}`}>
              {network.online ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          {network.effectiveType && (
            <span className="text-[10px] text-primary font-display uppercase">{network.effectiveType}</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-[10px]">
          {network.rtt !== undefined && (
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">{network.rtt}ms</span>
            </div>
          )}
          {network.downlink !== undefined && (
            <div className="flex items-center gap-1">
              <Signal className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">{network.downlink}Mbps</span>
            </div>
          )}
        </div>

        {/* Location */}
        {location.latitude && location.longitude && (
          <div className="pt-2 border-t border-primary/20">
            <div className="flex items-center gap-1 text-[10px]">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="font-mono text-muted-foreground truncate">
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Activity bars */}
        <div className="flex gap-0.5 h-6 items-end">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className={`flex-1 rounded-t ${network.online ? 'bg-primary/60' : 'bg-red-500/30'}`}
              animate={{ height: network.online ? `${Math.random() * 100}%` : '10%' }}
              transition={{ duration: 0.5, delay: i * 0.03, repeat: Infinity, repeatType: "reverse", repeatDelay: Math.random() }}
            />
          ))}
        </div>
      </div>
    </HudPanel>
  );
};

export default NetworkInfoPanel;
