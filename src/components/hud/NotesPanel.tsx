import { motion } from "framer-motion";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import HudPanel from "./HudPanel";

interface NoteItem {
  id: string;
  text: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}

const notes: NoteItem[] = [
  { id: "1", text: "Verificar logs do sistema", completed: true },
  { id: "2", text: "Atualizar protocolos", completed: false, priority: "high" },
  { id: "3", text: "Análise de segurança", completed: false, priority: "medium" },
  { id: "4", text: "Backup de dados", completed: false },
  { id: "5", text: "Calibrar sensores", completed: true },
  { id: "6", text: "Revisar permissões", completed: false, priority: "low" },
];

const NotesPanel = () => {
  return (
    <HudPanel title="Notas" delay={0.4} variant="bordered" className="w-52">
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {notes.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={`flex items-start gap-2 text-xs p-1.5 rounded ${
              note.completed ? "opacity-50" : ""
            } hover:bg-secondary/30 transition-colors cursor-pointer`}
          >
            {note.completed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Circle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                note.priority === "high" ? "text-red-400" :
                note.priority === "medium" ? "text-yellow-400" :
                "text-primary/60"
              }`} />
            )}
            <span className={`${note.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {note.priority === "high" && !note.completed && "• "}
              {note.text}
            </span>
          </motion.div>
        ))}
      </div>
      
      <motion.button
        className="w-full mt-3 py-1.5 border border-dashed border-primary/30 text-primary/60 text-xs flex items-center justify-center gap-1 hover:bg-primary/10 hover:border-primary/50 transition-all rounded"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-3 h-3" />
        Adicionar nota
      </motion.button>
    </HudPanel>
  );
};

export default NotesPanel;
