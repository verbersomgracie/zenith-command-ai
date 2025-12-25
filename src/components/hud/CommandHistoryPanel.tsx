import { motion } from "framer-motion";
import { Terminal, ChevronRight } from "lucide-react";
import HudPanel from "./HudPanel";

interface Command {
  id: string;
  text: string;
  timestamp: string;
  status: "success" | "pending" | "error";
}

const commands: Command[] = [
  { id: "1", text: "Sistema iniciado", timestamp: "08:00", status: "success" },
  { id: "2", text: "Protocolo de segurança ativo", timestamp: "08:01", status: "success" },
  { id: "3", text: "Scan de rede completo", timestamp: "08:15", status: "success" },
  { id: "4", text: "Aguardando comandos...", timestamp: "agora", status: "pending" },
];

const CommandHistoryPanel = () => {
  return (
    <HudPanel title="Log de Comandos" delay={0.45} variant="bordered" className="w-56">
      <div className="space-y-1.5 font-mono text-xs">
        {commands.map((cmd, index) => (
          <motion.div
            key={cmd.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-start gap-1.5"
          >
            <ChevronRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
              cmd.status === "success" ? "text-green-400" :
              cmd.status === "error" ? "text-red-400" :
              "text-yellow-400 animate-pulse"
            }`} />
            <div className="flex-1">
              <span className="text-primary/60">[{cmd.timestamp}]</span>{" "}
              <span className={cmd.status === "pending" ? "text-muted-foreground" : "text-foreground"}>
                {cmd.text}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Blinking cursor */}
      <div className="mt-2 flex items-center gap-1 text-primary">
        <Terminal className="w-3 h-3" />
        <span className="animate-pulse">_</span>
      </div>
    </HudPanel>
  );
};

export default CommandHistoryPanel;
