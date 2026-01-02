import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Routine } from "@/hooks/useRoutines";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Edit2, Plus, Pill, Dumbbell, Coffee, Book, Heart, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface RoutinesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: "health", label: "Saúde", icon: Pill },
  { value: "fitness", label: "Exercício", icon: Dumbbell },
  { value: "morning", label: "Manhã", icon: Coffee },
  { value: "study", label: "Estudo", icon: Book },
  { value: "wellness", label: "Bem-estar", icon: Heart },
  { value: "general", label: "Geral", icon: Clock },
];

const DAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

const RoutinesModal = ({ open, onOpenChange }: RoutinesModalProps) => {
  const { toast } = useToast();
  const [allRoutines, setAllRoutines] = useState<Routine[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_time: "08:00",
    days_of_week: [0, 1, 2, 3, 4, 5, 6] as number[],
    category: "general",
  });

  const fetchAllRoutines = async () => {
    const { data } = await supabase
      .from("daily_routines")
      .select("*")
      .order("scheduled_time", { ascending: true });
    if (data) setAllRoutines(data);
  };

  useEffect(() => {
    if (open) fetchAllRoutines();
  }, [open]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      scheduled_time: "08:00",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      category: "general",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    try {
      if (editingId) {
        const { error } = await supabase
          .from("daily_routines")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
        toast({ title: "Rotina atualizada" });
      } else {
        const { error } = await supabase
          .from("daily_routines")
          .insert(formData);
        if (error) throw error;
        toast({ title: "Rotina criada", description: formData.title });
      }
      resetForm();
      fetchAllRoutines();
    } catch (error) {
      console.error("Error saving routine:", error);
      toast({ title: "Erro", description: "Falha ao salvar rotina.", variant: "destructive" });
    }
  };

  const handleEdit = (routine: Routine) => {
    setFormData({
      title: routine.title,
      description: routine.description || "",
      scheduled_time: routine.scheduled_time,
      days_of_week: routine.days_of_week,
      category: routine.category,
    });
    setEditingId(routine.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("daily_routines")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Rotina removida" });
      fetchAllRoutines();
    } catch (error) {
      console.error("Error deleting routine:", error);
      toast({ title: "Erro", description: "Falha ao remover rotina.", variant: "destructive" });
    }
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-xl border-primary/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary font-orbitron">
            Gerenciar Rotinas
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          {isAdding ? (
            <div className="space-y-3 p-3 border border-primary/20 rounded-lg">
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Ex: Tomar remédio"
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Horário</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduled_time: e.target.value,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <cat.icon className="w-3 h-3" />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex gap-1 mt-1">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`w-7 h-7 text-xs rounded-full border transition-colors ${
                        formData.days_of_week.includes(day.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-primary/30 text-muted-foreground hover:border-primary/60"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Descrição (opcional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Detalhes adicionais"
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={!formData.title.trim()}
                >
                  {editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsAdding(true)}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Rotina
            </Button>
          )}

          {/* Routines List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {allRoutines.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhuma rotina cadastrada
                </p>
              ) : (
                allRoutines.map((routine) => {
                  const CategoryIcon =
                    categories.find((c) => c.value === routine.category)?.icon ||
                    Clock;

                  return (
                    <div
                      key={routine.id}
                      className="flex items-center gap-3 p-2 border border-primary/10 rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="w-4 h-4 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {routine.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {routine.scheduled_time.slice(0, 5)} •{" "}
                          {routine.days_of_week
                            .map((d) => DAYS[d].label)
                            .join("")}
                        </p>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(routine)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(routine.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoutinesModal;
