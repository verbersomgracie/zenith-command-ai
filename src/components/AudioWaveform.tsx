import { useEffect, useRef, useCallback } from "react";

interface AudioWaveformProps {
  analyser: AnalyserNode | null;
  isSpeaking: boolean;
}

const AudioWaveform = ({ analyser, isSpeaking }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    
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

    // Reset shadow before drawing
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

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
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(34, 211, 238, 0.6)";
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Add center glow pulse
    const avgVolume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
    const pulseRadius = minRadius - 5 + (avgVolume / 255) * 10;
    
    ctx.shadowBlur = 0;
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
  }, [analyser, isSpeaking]);

  // Start/stop animation based on speaking state
  useEffect(() => {
    if (isSpeaking && analyser) {
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
  }, [isSpeaking, analyser, draw]);

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
