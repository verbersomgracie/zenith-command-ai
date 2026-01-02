import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Routine {
  id: string;
  title: string;
  description: string | null;
  scheduled_time: string;
  days_of_week: number[];
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineCompletion {
  id: string;
  routine_id: string;
  completed_at: string;
  completion_date: string;
}

export interface RoutineWithStatus extends Routine {
  isCompletedToday: boolean;
}

const DAYS_OF_WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const useRoutines = () => {
  const [routines, setRoutines] = useState<RoutineWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRoutines = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const currentDayOfWeek = new Date().getDay();

      // Fetch routines
      const { data: routinesData, error: routinesError } = await supabase
        .from("daily_routines")
        .select("*")
        .eq("is_active", true)
        .order("scheduled_time", { ascending: true });

      if (routinesError) throw routinesError;

      // Fetch today's completions
      const { data: completionsData, error: completionsError } = await supabase
        .from("routine_completions")
        .select("*")
        .eq("completion_date", today);

      if (completionsError) throw completionsError;

      const completedRoutineIds = new Set(
        completionsData?.map((c) => c.routine_id) || []
      );

      // Filter routines for today and add completion status
      const todaysRoutines: RoutineWithStatus[] = (routinesData || [])
        .filter((routine) => routine.days_of_week.includes(currentDayOfWeek))
        .map((routine) => ({
          ...routine,
          isCompletedToday: completedRoutineIds.has(routine.id),
        }));

      setRoutines(todaysRoutines);
    } catch (error) {
      console.error("Error fetching routines:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar rotinas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const toggleRoutineCompletion = async (routineId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const routine = routines.find((r) => r.id === routineId);

    if (!routine) return;

    try {
      if (routine.isCompletedToday) {
        // Remove completion
        const { error } = await supabase
          .from("routine_completions")
          .delete()
          .eq("routine_id", routineId)
          .eq("completion_date", today);

        if (error) throw error;
      } else {
        // Add completion
        const { error } = await supabase.from("routine_completions").insert({
          routine_id: routineId,
          completion_date: today,
        });

        if (error) throw error;
      }

      // Update local state
      setRoutines((prev) =>
        prev.map((r) =>
          r.id === routineId
            ? { ...r, isCompletedToday: !r.isCompletedToday }
            : r
        )
      );

      toast({
        title: routine.isCompletedToday ? "Desmarcado" : "Concluído",
        description: routine.title,
      });
    } catch (error) {
      console.error("Error toggling routine:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar rotina.",
        variant: "destructive",
      });
    }
  };

  const addRoutine = async (routine: {
    title: string;
    description?: string;
    scheduled_time: string;
    days_of_week: number[];
    category: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from("daily_routines")
        .insert(routine)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Rotina criada",
        description: routine.title,
      });

      await fetchRoutines();
      return data;
    } catch (error) {
      console.error("Error adding routine:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar rotina.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateRoutine = async (
    id: string,
    updates: Partial<Omit<Routine, "id" | "created_at" | "updated_at">>
  ) => {
    try {
      const { error } = await supabase
        .from("daily_routines")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Rotina atualizada",
      });

      await fetchRoutines();
    } catch (error) {
      console.error("Error updating routine:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar rotina.",
        variant: "destructive",
      });
    }
  };

  const deleteRoutine = async (id: string) => {
    try {
      const { error } = await supabase
        .from("daily_routines")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Rotina removida",
      });

      await fetchRoutines();
    } catch (error) {
      console.error("Error deleting routine:", error);
      toast({
        title: "Erro",
        description: "Falha ao remover rotina.",
        variant: "destructive",
      });
    }
  };

  const getCompletionPercentage = () => {
    if (routines.length === 0) return 0;
    const completed = routines.filter((r) => r.isCompletedToday).length;
    return Math.round((completed / routines.length) * 100);
  };

  return {
    routines,
    isLoading,
    toggleRoutineCompletion,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    fetchRoutines,
    getCompletionPercentage,
    DAYS_OF_WEEK,
  };
};
