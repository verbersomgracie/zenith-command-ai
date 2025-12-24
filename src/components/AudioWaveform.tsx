import { useEffect, useRef, useCallback } from "react";

interface AudioWaveformProps {
  audioElement: HTMLAudioElement | null;
  isSpeaking: boolean;
}

const AudioWaveform = ({ audioElement, isSpeaking }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const isConnectedRef = useRef(false);

  const setupAudioContext = useCallback(() => {
    if (!audioElement || isConnectedRef.current) return;

    try {
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect audio element to analyser
      const source = audioContext.createMediaElementSource(audioElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      sourceRef.current = source;

      isConnectedRef.current = true;
      console.log("Audio context connected successfully");
    } catch (error) {
      console.error("Error setting up audio context:", error);
    }
  }, [audioElement]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser || !isSpeaking) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const barCount = 32;
    const barWidth = 3;
    const minRadius = 30;
    const maxBarHeight = 40;

    // Draw radial bars
    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength);
      const value = dataArray[dataIndex] || 0;
      const barHeight = (value / 255) * maxBarHeight + 2;

      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      
      const startX = centerX + Math.cos(angle) * minRadius;
      const startY = centerY + Math.sin(angle) * minRadius;
      const endX = centerX + Math.cos(angle) * (minRadius + barHeight);
      const endY = centerY + Math.sin(angle) * (minRadius + barHeight);

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, "rgba(34, 211, 238, 0.4)");
      gradient.addColorStop(0.5, "rgba(34, 211, 238, 0.8)");
      gradient.addColorStop(1, "rgba(34, 211, 238, 1)");

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = barWidth;
      ctx.lineCap = "round";
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(34, 211, 238, 0.6)";
    }

    // Add center glow pulse
    const avgVolume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const pulseRadius = minRadius - 5 + (avgVolume / 255) * 10;
    
    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseRadius
    );
    centerGradient.addColorStop(0, "rgba(34, 211, 238, 0.3)");
    centerGradient.addColorStop(0.7, "rgba(34, 211, 238, 0.1)");
    centerGradient.addColorStop(1, "rgba(34, 211, 238, 0)");
    
    ctx.beginPath();
    ctx.fillStyle = centerGradient;
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    animationRef.current = requestAnimationFrame(draw);
  }, [isSpeaking]);

  // Setup audio context when audio element is available
  useEffect(() => {
    if (audioElement && !isConnectedRef.current) {
      setupAudioContext();
    }
  }, [audioElement, setupAudioContext]);

  // Start/stop animation based on speaking state
  useEffect(() => {
    if (isSpeaking && analyserRef.current) {
      // Resume audio context if suspended
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
      animationRef.current = requestAnimationFrame(draw);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Clear canvas when not speaking
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpeaking, draw]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!isSpeaking) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="absolute inset-0 pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      }}
    />
  );
};

export default AudioWaveform;
