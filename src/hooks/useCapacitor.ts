import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface CapacitorState {
  isNative: boolean;
  platform: "web" | "android" | "ios";
  isReady: boolean;
}

export const useCapacitor = () => {
  const [state, setState] = useState<CapacitorState>({
    isNative: false,
    platform: "web",
    isReady: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    const initCapacitor = async () => {
      try {
        // Dynamically import Capacitor to avoid errors on web
        const { Capacitor } = await import("@capacitor/core");
        
        const isNative = Capacitor.isNativePlatform();
        const platform = Capacitor.getPlatform() as "web" | "android" | "ios";
        
        setState({
          isNative,
          platform,
          isReady: true,
        });

        if (isNative) {
          console.log(`[JARVIS] Running on ${platform}`);
          
          // Initialize app listeners
          const { App } = await import("@capacitor/app");
          
          App.addListener("appStateChange", ({ isActive }) => {
            console.log(`[JARVIS] App state changed: ${isActive ? "active" : "background"}`);
          });

          App.addListener("backButton", () => {
            console.log("[JARVIS] Back button pressed");
          });
        }
      } catch (error) {
        // Not running in Capacitor environment
        setState({
          isNative: false,
          platform: "web",
          isReady: true,
        });
      }
    };

    initCapacitor();
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!state.isNative) {
      // Web notification permission
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }
      return false;
    }

    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch (error) {
      console.error("[JARVIS] Error requesting notification permission:", error);
      return false;
    }
  }, [state.isNative]);

  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    scheduleAt: Date,
    id?: number
  ) => {
    if (!state.isNative) {
      // Web notification
      if ("Notification" in window && Notification.permission === "granted") {
        const delay = scheduleAt.getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => {
            new Notification(title, { body, icon: "/icons/icon-192.png" });
          }, delay);
        }
      }
      return;
    }

    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.schedule({
        notifications: [
          {
            id: id || Math.floor(Math.random() * 100000),
            title,
            body,
            schedule: { at: scheduleAt },
            sound: "beep.wav",
            smallIcon: "ic_stat_icon",
            iconColor: "#00D4FF",
          },
        ],
      });
    } catch (error) {
      console.error("[JARVIS] Error scheduling notification:", error);
    }
  }, [state.isNative]);

  const vibrate = useCallback(async (pattern: number[] = [100]) => {
    if (!state.isNative) {
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
      return;
    }

    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    }
  }, [state.isNative]);

  const keepAwake = useCallback(async (enable: boolean) => {
    if (!state.isNative) return;

    try {
      const { KeepAwake } = await import("@capacitor-community/keep-awake");
      if (enable) {
        await KeepAwake.keepAwake();
      } else {
        await KeepAwake.allowSleep();
      }
    } catch {
      // KeepAwake not available
    }
  }, [state.isNative]);

  return {
    ...state,
    requestNotificationPermission,
    scheduleNotification,
    vibrate,
    keepAwake,
  };
};
