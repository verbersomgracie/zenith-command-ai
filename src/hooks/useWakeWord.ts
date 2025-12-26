import { useState, useRef, useCallback, useEffect } from "react";
import { WAKE_WORDS } from "./useVoiceCommands";

interface UseWakeWordOptions {
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

export const useWakeWord = (options: UseWakeWordOptions = {}) => {
  const {
    onWakeWordDetected,
    enabled = false,
    language = "pt-BR",
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isActiveRef = useRef(false);
  const onWakeWordRef = useRef(onWakeWordDetected);
  const shouldRestartRef = useRef(false);

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
            // Ignore
          }
        }, 500);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (detectWakeWord(transcript)) {
          // Wake word detected!
          onWakeWordRef.current?.();
          
          // Stop this recognition to let main recognition take over
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
      console.error("Wake word recognition error:", event.error);
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
    };
  }, [language, detectWakeWord]);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (!recognitionRef.current || !isSupported) return;

    if (enabled) {
      shouldRestartRef.current = true;
      if (!isActiveRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    } else {
      shouldRestartRef.current = false;
      if (isActiveRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [enabled, isSupported]);

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

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
};
