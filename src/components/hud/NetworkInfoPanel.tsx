import { motion } from "framer-motion";
import { Wifi, WifiOff, Globe, Activity, Signal, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
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

const getConnectionIcon = (effectiveType?: string) => {
  switch (effectiveType) {
    case '4g':
      return <SignalHigh className="w-4 h-4 text-green-400" />;
    case '3g':
      return <SignalMedium className="w-4 h-4 text-yellow-400" />;
    case '2g':
      return <SignalLow className="w-4 h-4 text-orange-400" />;
    case 'slow-2g':
      return <Signal className="w-4 h-4 text-red-400" />;
    default:
      return <SignalHigh className="w-4 h-4 text-green-400" />;
  }
};

const getConnectionLabel = (effectiveType?: string) => {
  switch (effectiveType) {
    case '4g':
      return 'RÁPIDA';
    case '3g':
      return 'MODERADA';
    case '2g':
      return 'LENTA';
    case 'slow-2g':
      return 'MUITO LENTA';
    default:
      return 'ESTÁVEL';
  }
};

const NetworkInfoPanel = ({ network, location }: NetworkInfoPanelProps) => {
  return (
    <HudPanel title="Rede" delay={0.35} variant="bordered" className="w-40">
      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          {network.online ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          <div className="text-xs">
            <div className="text-muted-foreground">Conexão</div>
            <div className={`font-display ${network.online ? 'text-green-400' : 'text-red-400'}`}>
              {network.online ? getConnectionLabel(network.effectiveType) : 'OFFLINE'}
            </div>
          </div>
        </div>

        {/* Connection Type */}
        {network.online && network.effectiveType && (
          <div className="flex items-center gap-2">
            {getConnectionIcon(network.effectiveType)}
            <div className="text-xs">
              <div className="text-muted-foreground">Tipo</div>
              <div className="text-primary font-display uppercase">{network.effectiveType}</div>
            </div>
          </div>
        )}

        {/* Latency */}
        {network.online && network.rtt !== undefined && (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <div className="text-muted-foreground">Latência</div>
              <div className="text-primary font-display">{network.rtt}ms</div>
            </div>
          </div>
        )}

        {/* Downlink speed */}
        {network.online && network.downlink !== undefined && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <div className="text-xs">
              <div className="text-muted-foreground">Velocidade</div>
              <div className="text-primary font-display">{network.downlink} Mbps</div>
            </div>
          </div>
        )}

        {/* Location */}
        {location.latitude && location.longitude && (
          <div className="pt-2 border-t border-primary/20">
            <div className="text-xs text-muted-foreground mb-1">Coordenadas</div>
            <div className="text-xs font-mono text-primary">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </div>
            {location.accuracy && (
              <div className="text-xs text-muted-foreground mt-1">
                Precisão: ±{Math.round(location.accuracy)}m
              </div>
            )}
          </div>
        )}

        {/* Network activity visualization */}
        <div className="pt-2 border-t border-primary/20">
          <div className="text-xs text-muted-foreground mb-1">Atividade</div>
          <div className="flex gap-0.5 h-8 items-end">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className={`flex-1 rounded-t ${network.online ? 'bg-primary/60' : 'bg-red-500/30'}`}
                initial={{ height: 0 }}
                animate={{ 
                  height: network.online ? `${Math.random() * 100}%` : '10%',
                }}
                transition={{
                  duration: 0.5,
                  delay: i * 0.05,
                  repeat: Infinity,
                  repeatType: "reverse",
                  repeatDelay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </HudPanel>
  );
};

export default NetworkInfoPanel;
