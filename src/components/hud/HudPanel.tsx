import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HudPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "minimal" | "bordered";
  compact?: boolean;
  action?: ReactNode;
}

const HudPanel = ({ 
  title, 
  children, 
  className = "", 
  delay = 0, 
  variant = "default",
  compact = false,
  action
}: HudPanelProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      className={`relative ${className}`}
    >
      {/* Corner decorations */}
      {variant === "bordered" && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary/60" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary/60" />
        </>
      )}
      
      {/* Panel content */}
      <div className={`
        ${variant === "default" ? "bg-card/40 border border-primary/30 backdrop-blur-sm" : ""}
        ${variant === "bordered" ? "bg-card/20 border border-primary/20" : ""}
        ${variant === "minimal" ? "bg-transparent" : ""}
        ${compact ? "p-2" : "p-3"} h-full
      `}>
        {title && (
          <div className="flex items-center justify-between mb-2 border-b border-primary/20 pb-1">
            <h3 className="font-display text-[10px] text-primary/80 uppercase tracking-wider">
              {title}
            </h3>
            {action}
          </div>
        )}
        {children}
      </div>
    </motion.div>
  );
};

export default HudPanel;
