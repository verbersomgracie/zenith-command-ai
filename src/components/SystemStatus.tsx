import { motion } from "framer-motion";
import { Cpu, HardDrive, Wifi, Shield } from "lucide-react";

const metrics = [
  { icon: Cpu, label: "Processing", value: 98.7, color: "bg-primary" },
  { icon: HardDrive, label: "Memory", value: 72.3, color: "bg-blue-400" },
  { icon: Wifi, label: "Network", value: 100, color: "bg-green-400" },
  { icon: Shield, label: "Security", value: 100, color: "bg-amber-400" },
];

const SystemStatus = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-4"
    >
      <h3 className="font-display text-sm font-semibold text-primary mb-4 text-glow-sm">
        System Status
      </h3>
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <metric.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <span className="text-xs font-medium text-foreground">
                {metric.value}%
              </span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 1, delay: 0.8 + index * 0.1, ease: "easeOut" }}
                className={`h-full ${metric.color} rounded-full`}
                style={{
                  boxShadow: `0 0 10px currentColor`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SystemStatus;
