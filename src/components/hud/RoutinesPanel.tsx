import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Plus, Pill, Dumbbell, Coffee, Book, Heart, Settings } from "lucide-react";
import HudPanel from "./HudPanel";
import { useRoutines, RoutineWithStatus } from "@/hooks/useRoutines";
import { Progress } from "@/components/ui/progress";

interface RoutinesPanelProps {
  onManageClick?: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  health: <Pill className="w-3 h-3" />,
  fitness: <Dumbbell className="w-3 h-3" />,
  morning: <Coffee className="w-3 h-3" />,
  study: <Book className="w-3 h-3" />,
  wellness: <Heart className="w-3 h-3" />,
  general: <Clock className="w-3 h-3" />,
};

const categoryColors: Record<string, string> = {
  health: "text-red-400",
  fitness: "text-orange-400",
  morning: "text-yellow-400",
  study: "text-blue-400",
  wellness: "text-pink-400",
  general: "text-primary/60",
};

const RoutinesPanel = ({ onManageClick }: RoutinesPanelProps) => {
  const { routines, isLoading, toggleRoutineCompletion, getCompletionPercentage } = useRoutines();

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  const completionPercentage = getCompletionPercentage();

  return (
    <HudPanel 
      title="Rotinas do Dia" 
      delay={0.4} 
      variant="bordered" 
      compact
      action={
        onManageClick && (
          <button
            onClick={onManageClick}
            className="text-primary/60 hover:text-primary transition-colors"
          >
            <Settings className="w-3 h-3" />
          </button>
        )
      }
    >
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Progresso</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-1" />
        </div>

        {/* Routines list */}
        {isLoading ? (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            Carregando...
          </div>
        ) : routines.length === 0 ? (
          <div className="text-[10px] text-muted-foreground text-center py-2">
            Nenhuma rotina para hoje
          </div>
        ) : (
          <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
            {routines.map((routine, index) => (
              <RoutineItem
                key={routine.id}
                routine={routine}
                index={index}
                onToggle={toggleRoutineCompletion}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}

        {/* Add button */}
        {onManageClick && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={onManageClick}
            className="w-full flex items-center justify-center gap-1 text-[10px] text-primary/60 hover:text-primary py-1 border border-dashed border-primary/20 rounded hover:border-primary/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Adicionar rotina
          </motion.button>
        )}
      </div>
    </HudPanel>
  );
};

const RoutineItem = ({
  routine,
  index,
  onToggle,
  formatTime,
}: {
  routine: RoutineWithStatus;
  index: number;
  onToggle: (id: string) => void;
  formatTime: (time: string) => string;
}) => {
  const icon = categoryIcons[routine.category] || categoryIcons.general;
  const colorClass = categoryColors[routine.category] || categoryColors.general;

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.05 }}
      className={`flex items-center gap-1.5 text-[10px] py-1 px-1 rounded hover:bg-primary/5 cursor-pointer transition-colors ${
        routine.isCompletedToday ? "opacity-50" : ""
      }`}
      onClick={() => onToggle(routine.id)}
    >
      {routine.isCompletedToday ? (
        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
      ) : (
        <Circle className={`w-3 h-3 flex-shrink-0 ${colorClass}`} />
      )}
      
      <span className={`flex-shrink-0 ${colorClass}`}>{icon}</span>
      
      <span
        className={`flex-1 truncate ${
          routine.isCompletedToday
            ? "line-through text-muted-foreground"
            : "text-foreground"
        }`}
      >
        {routine.title}
      </span>
      
      <span className="text-[9px] text-muted-foreground flex-shrink-0">
        {formatTime(routine.scheduled_time)}
      </span>
    </motion.div>
  );
};

export default RoutinesPanel;
