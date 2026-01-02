import { useState, useRef, useCallback, useEffect } from "react";
import { useCapacitor } from "./useCapacitor";
import { WAKE_WORDS } from "./useVoiceCommands";

interface UseBackgroundWakeWordOptions {
  onWakeWordDetected?: () => void;
  enabled?: boolean;
  language?: string;
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export const useBackgroundWakeWord = (options: UseBackgroundWakeWordOptions = {}) => {
  const {
    onWakeWordDetected,
    enabled = false,
    language = "pt-BR",
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastDetectedAt, setLastDetectedAt] = useState<Date | null>(null);
  const [listeningDuration, setListeningDuration] = useState(0);
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isActiveRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWordDetected);
  const shouldRestartRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isNative, keepAwake, vibrate, requestNotificationPermission, scheduleNotification } = useCapacitor();

  useEffect(() => {
    onWakeWordRef.current = onWakeWordDetected;
  }, [onWakeWordDetected]);

  const detectWakeWord = useCallback((text: string): boolean => {
    const normalizedText = text.toLowerCase().trim();
    return WAKE_WORDS.some(wake => normalizedText.includes(wake));
  }, []);

  // Initialize recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      isActiveRef.current = true;
      setIsListening(true);
      startTimeRef.current = Date.now();
      console.log("[JARVIS Wake Word] Escuta ativa - diga 'Hey Jarvis'");
    };

    recognition.onend = () => {
      isActiveRef.current = false;
      setIsListening(false);
      
      // Auto-restart if should be listening
      if (shouldRestartRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // Retry after a longer delay
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e2) {
                console.log("[JARVIS Wake Word] Falha ao reiniciar reconhecimento");
              }
            }, 1000);
          }
        }, 300);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (detectWakeWord(transcript)) {
          console.log("[JARVIS Wake Word] Detectado:", transcript);
          setLastDetectedAt(new Date());
          
          // Haptic feedback on native
          vibrate([100, 50, 100]);
          
          // Wake word detected!
          onWakeWordRef.current?.();
          
          // Briefly stop to let main recognition take over
          try {
            recognition.stop();
            shouldRestartRef.current = false;
          } catch (e) {
            // Ignore
          }
          break;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      console.error("[JARVIS Wake Word] Erro:", event.error);
      
      // Try to restart on error
      if (shouldRestartRef.current && event.error !== "not-allowed") {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            // Ignore
          }
        }, 1000);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [language, detectWakeWord, vibrate]);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    const manageRecognition = async () => {
      if (enabled) {
        shouldRestartRef.current = true;
        
        // Keep screen awake on native
        if (isNative) {
          await keepAwake(true);
          
          // Request notification permission
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            // Show persistent notification that we're listening
            await scheduleNotification(
              "JARVIS está ouvindo",
              "Diga 'Hey JARVIS' para ativar",
              new Date(),
              1
            );
          }
        }
        
        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          if (startTimeRef.current > 0) {
            setListeningDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }
        }, 1000);
        
        if (!isActiveRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      } else {
        shouldRestartRef.current = false;
        
        // Allow screen to sleep
        if (isNative) {
          await keepAwake(false);
        }
        
        // Clear duration counter
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        setListeningDuration(0);
        
        if (isActiveRef.current) {
          try {
            recognitionRef.current?.stop();
          } catch (e) {
            // Ignore
          }
        }
      }
    };

    manageRecognition();
  }, [enabled, isSupported, isNative, keepAwake, requestNotificationPermission, scheduleNotification]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isActiveRef.current) {
      shouldRestartRef.current = true;
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current && isActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  const resumeListening = useCallback(() => {
    // Resume wake word listening after main recognition is done
    if (shouldRestartRef.current === false && enabled) {
      shouldRestartRef.current = true;
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (e) {
          // Ignore
        }
      }, 500);
    }
  }, [enabled]);

  return {
    isListening,
    isSupported,
    lastDetectedAt,
    listeningDuration,
    startListening,
    stopListening,
    resumeListening,
  };
};
