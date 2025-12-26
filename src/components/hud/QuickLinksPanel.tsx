import { motion } from "framer-motion";
import { Folder, Globe, Terminal, Database, Shield, FileText } from "lucide-react";
import HudPanel from "./HudPanel";

const links = [
  { icon: Folder, label: "Docs" },
  { icon: Globe, label: "Web" },
  { icon: Terminal, label: "Term" },
  { icon: Database, label: "DB" },
  { icon: Shield, label: "Sec" },
  { icon: FileText, label: "Logs" },
];

const QuickLinksPanel = () => {
  return (
    <HudPanel title="Acesso" delay={0.5} variant="bordered" compact>
      <div className="grid grid-cols-3 gap-1">
        {links.map((link, index) => (
          <motion.button
            key={link.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.03 }}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-primary/10 transition-all group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <link.icon className="w-3.5 h-3.5 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
              {link.label}
            </span>
          </motion.button>
        ))}
      </div>
    </HudPanel>
  );
};

export default QuickLinksPanel;
