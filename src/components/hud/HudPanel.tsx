import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HudPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "default" | "minimal" | "bordered";
}

const HudPanel = ({ title, children, className = "", delay = 0, variant = "default" }: HudPanelProps) => {
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
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/70" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/70" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/70" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/70" />
        </>
      )}
      
      {/* Panel content */}
      <div className={`
        ${variant === "default" ? "bg-card/40 border border-primary/30 backdrop-blur-sm" : ""}
        ${variant === "bordered" ? "bg-card/20 border border-primary/20" : ""}
        ${variant === "minimal" ? "bg-transparent" : ""}
        p-3 h-full
      `}>
        {title && (
          <h3 className="font-display text-xs text-primary/80 uppercase tracking-wider mb-2 border-b border-primary/20 pb-1">
            {title}
          </h3>
        )}
        {children}
      </div>
    </motion.div>
  );
};

export default HudPanel;
