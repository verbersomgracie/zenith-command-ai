import { motion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";
import HudPanel from "./HudPanel";

interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}

const notes: NoteItem[] = [
  { id: "1", text: "Verificar logs", completed: true },
  { id: "2", text: "Atualizar protocolos", completed: false, priority: "high" },
  { id: "3", text: "Análise de segurança", completed: false, priority: "medium" },
  { id: "4", text: "Backup de dados", completed: false },
];

const NotesPanel = () => {
  return (
    <HudPanel title="Notas" delay={0.4} variant="bordered" compact>
      <div className="space-y-1">
        {notes.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.05 }}
            className={`flex items-center gap-1.5 text-[10px] py-1 ${note.completed ? "opacity-50" : ""}`}
          >
            {note.completed ? (
              <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <Circle className={`w-3 h-3 flex-shrink-0 ${
                note.priority === "high" ? "text-red-400" :
                note.priority === "medium" ? "text-yellow-400" : "text-primary/60"
              }`} />
            )}
            <span className={`truncate ${note.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {note.text}
            </span>
          </motion.div>
        ))}
      </div>
    </HudPanel>
  );
};

export default NotesPanel;
