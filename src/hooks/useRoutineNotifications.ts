import { useEffect, useRef, useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { RoutineWithStatus } from "@/hooks/useRoutines";

interface UseRoutineNotificationsProps {
  routines: RoutineWithStatus[];
  enabled: boolean;
}

export const useRoutineNotifications = ({ routines, enabled }: UseRoutineNotificationsProps) => {
  const { toast } = useToast();
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default");
  const notifiedRoutinesRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check and request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionState("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      setPermissionState("denied");
      toast({
        title: "Notificações bloqueadas",
        description: "Habilite as notificações nas configurações do navegador.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission === "granted") {
        toast({
          title: "Notificações ativadas",
          description: "Você receberá lembretes das suas rotinas.",
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, [toast]);

  // Show notification for a routine
  const showNotification = useCallback((routine: RoutineWithStatus) => {
    if (Notification.permission !== "granted") return;

    const categoryEmoji: Record<string, string> = {
      health: "💊",
      fitness: "🏋️",
      work: "💼",
      personal: "🧘",
      general: "📌",
    };

    const emoji = categoryEmoji[routine.category] || "📌";
    
    const notification = new Notification(`${emoji} ${routine.title}`, {
      body: routine.description || "Hora da sua rotina!",
      icon: "/favicon.ico",
      tag: routine.id,
      requireInteraction: true,
    });

    // Try to vibrate if supported
    if ("vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Also show in-app toast
    toast({
      title: `${emoji} ${routine.title}`,
      description: routine.description || "Hora da sua rotina!",
    });
  }, [toast]);

  // Check if any routine is due
  const checkRoutines = useCallback(() => {
    if (!enabled || permissionState !== "granted") return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const today = now.toISOString().split("T")[0];

    routines.forEach((routine) => {
      if (routine.isCompletedToday) return;
      
      // Create unique key for today's notification
      const notificationKey = `${routine.id}-${today}`;
      
      // Check if already notified today
      if (notifiedRoutinesRef.current.has(notificationKey)) return;

      // Check if time matches (within 1 minute window)
      const [routineHour, routineMinute] = routine.scheduled_time.split(":").map(Number);
      const [currentHour, currentMinute] = currentTime.split(":").map(Number);

      if (routineHour === currentHour && routineMinute === currentMinute) {
        showNotification(routine);
        notifiedRoutinesRef.current.add(notificationKey);
      }
    });
  }, [enabled, permissionState, routines, showNotification]);

  // Clear notified routines at midnight
  const clearNotifiedAtMidnight = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      notifiedRoutinesRef.current.clear();
      clearNotifiedAtMidnight(); // Schedule next clear
    }, msUntilMidnight);
  }, []);

  // Initialize
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // Set up interval to check routines every minute
  useEffect(() => {
    if (!enabled) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Check immediately
    checkRoutines();

    // Then check every 30 seconds for more accuracy
    checkIntervalRef.current = setInterval(checkRoutines, 30000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, checkRoutines]);

  // Schedule midnight clear
  useEffect(() => {
    if (enabled) {
      clearNotifiedAtMidnight();
    }
  }, [enabled, clearNotifiedAtMidnight]);

  return {
    permissionState,
    requestPermission,
    isSupported: "Notification" in window,
  };
};
