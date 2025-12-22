import { motion } from "framer-motion";
import { Plus, Clock, Bell, Zap } from "lucide-react";

const actions = [
  { icon: Plus, label: "New Task", color: "text-primary" },
  { icon: Clock, label: "Set Reminder", color: "text-blue-400" },
  { icon: Bell, label: "Quick Note", color: "text-amber-400" },
  { icon: Zap, label: "Automate", color: "text-purple-400" },
];

const QuickActions = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-4"
    >
      <h3 className="font-display text-sm font-semibold text-primary mb-4 text-glow-sm">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-primary/30 transition-all group"
          >
            <action.icon className={`w-4 h-4 ${action.color} group-hover:scale-110 transition-transform`} />
            <span className="text-xs font-medium text-foreground">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickActions;
