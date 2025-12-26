import { motion } from "framer-motion";
import { ChevronRight, Terminal } from "lucide-react";
import HudPanel from "./HudPanel";

interface Command {
  id: string;
  text: string;
  time: string;
  status: "success" | "pending" | "error";
}

const commands: Command[] = [
  { id: "1", text: "Sistema iniciado", time: "08:00", status: "success" },
  { id: "2", text: "Segurança ativa", time: "08:01", status: "success" },
  { id: "3", text: "Scan completo", time: "08:15", status: "success" },
  { id: "4", text: "Aguardando...", time: "agora", status: "pending" },
];

const CommandHistoryPanel = () => {
  return (
    <HudPanel title="Log" delay={0.45} variant="bordered" compact>
      <div className="space-y-1 font-mono text-[10px]">
        {commands.map((cmd, index) => (
          <motion.div
            key={cmd.id}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            className="flex items-center gap-1"
          >
            <ChevronRight className={`w-2.5 h-2.5 flex-shrink-0 ${
              cmd.status === "success" ? "text-green-400" :
              cmd.status === "error" ? "text-red-400" : "text-yellow-400 animate-pulse"
            }`} />
            <span className="text-primary/50">{cmd.time}</span>
            <span className={`truncate ${cmd.status === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
              {cmd.text}
            </span>
          </motion.div>
        ))}
        <div className="flex items-center gap-1 text-primary pt-1">
          <Terminal className="w-2.5 h-2.5" />
          <span className="animate-pulse">_</span>
        </div>
      </div>
    </HudPanel>
  );
};

export default CommandHistoryPanel;
