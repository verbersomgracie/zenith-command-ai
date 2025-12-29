import { useState, useRef, useCallback, useEffect } from "react";

interface UseVADOptions {
  enabled?: boolean;
  threshold?: number;
  silenceTimeout?: number;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
}

export const useVoiceActivityDetection = (options: UseVADOptions = {}) => {
  const {
    enabled = false,
    threshold = 0.02,
    silenceTimeout = 1500,
    onVoiceStart,
    onVoiceEnd,
  } = options;

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);
  const wasVoiceActiveRef = useRef(false);

  const onVoiceStartRef = useRef(onVoiceStart);
  const onVoiceEndRef = useRef(onVoiceEnd);

  useEffect(() => {
    onVoiceStartRef.current = onVoiceStart;
    onVoiceEndRef.current = onVoiceEnd;
  }, [onVoiceStart, onVoiceEnd]);

  const startVAD = useCallback(async () => {
    if (isActiveRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      isActiveRef.current = true;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!isActiveRef.current || !analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (Root Mean Square) for better voice detection
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = dataArray[i] / 255;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        
        setAudioLevel(rms);

        const voiceDetected = rms > threshold;

        if (voiceDetected) {
          // Clear any pending silence timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
          }

          if (!wasVoiceActiveRef.current) {
            wasVoiceActiveRef.current = true;
            setIsVoiceActive(true);
            onVoiceStartRef.current?.();
          }
        } else {
          // Voice stopped, start silence timeout
          if (wasVoiceActiveRef.current && !silenceTimeoutRef.current) {
            silenceTimeoutRef.current = setTimeout(() => {
              wasVoiceActiveRef.current = false;
              setIsVoiceActive(false);
              onVoiceEndRef.current?.();
              silenceTimeoutRef.current = null;
            }, silenceTimeout);
          }
        }

        animationRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (error) {
      console.error("VAD error:", error);
      setIsSupported(false);
    }
  }, [threshold, silenceTimeout]);

  const stopVAD = useCallback(() => {
    isActiveRef.current = false;
    wasVoiceActiveRef.current = false;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsVoiceActive(false);
    setAudioLevel(0);
  }, []);

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      startVAD();
    } else {
      stopVAD();
    }

    return () => {
      stopVAD();
    };
  }, [enabled, startVAD, stopVAD]);

  return {
    isVoiceActive,
    audioLevel,
    isSupported,
    startVAD,
    stopVAD,
  };
};
