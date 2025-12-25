import { motion } from "framer-motion";
import { Wifi, Globe, Server, Activity } from "lucide-react";
import HudPanel from "./HudPanel";

const NetworkInfoPanel = () => {
  return (
    <HudPanel title="Rede" delay={0.35} variant="bordered" className="w-40">
      <div className="space-y-3">
        {/* IP Address */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <div className="text-muted-foreground">IP Externo</div>
            <div className="text-primary font-mono">192.168.1.100</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-400" />
          <div className="text-xs">
            <div className="text-muted-foreground">Conexão</div>
            <div className="text-green-400 font-display">ESTÁVEL</div>
          </div>
        </div>

        {/* Ping */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <div className="text-xs">
            <div className="text-muted-foreground">Latência</div>
            <div className="text-primary font-display">12ms</div>
          </div>
        </div>

        {/* Network activity visualization */}
        <div className="pt-2 border-t border-primary/20">
          <div className="text-xs text-muted-foreground mb-1">Atividade</div>
          <div className="flex gap-0.5 h-8 items-end">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-primary/60 rounded-t"
                initial={{ height: 0 }}
                animate={{ 
                  height: `${Math.random() * 100}%`,
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
