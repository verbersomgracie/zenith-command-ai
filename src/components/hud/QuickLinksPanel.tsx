import { motion } from "framer-motion";
import { 
  Folder, 
  FileText, 
  Image, 
  Music, 
  Video, 
  Download,
  Globe,
  Terminal,
  Database,
  Shield
} from "lucide-react";
import HudPanel from "./HudPanel";

const links = [
  { icon: Folder, label: "Documentos" },
  { icon: Image, label: "Imagens" },
  { icon: Video, label: "Vídeos" },
  { icon: Music, label: "Áudio" },
  { icon: Download, label: "Downloads" },
  { icon: Globe, label: "Navegador" },
  { icon: Terminal, label: "Terminal" },
  { icon: Database, label: "Database" },
  { icon: Shield, label: "Segurança" },
  { icon: FileText, label: "Logs" },
];

const QuickLinksPanel = () => {
  return (
    <HudPanel title="Acesso Rápido" delay={0.5} variant="bordered" className="w-40">
      <div className="grid grid-cols-2 gap-1.5">
        {links.map((link, index) => (
          <motion.button
            key={link.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + index * 0.05 }}
            className="flex flex-col items-center gap-1 p-2 rounded hover:bg-primary/10 transition-all group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <link.icon className="w-4 h-4 text-primary/70 group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
              {link.label}
            </span>
          </motion.button>
        ))}
      </div>
    </HudPanel>
  );
};

export default QuickLinksPanel;
