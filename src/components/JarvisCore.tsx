import { motion } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";

interface JarvisCoreProps {
  analyser: AnalyserNode | null;
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
}

const JarvisCore = ({ analyser, isSpeaking, isListening, isProcessing }: JarvisCoreProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const time = Date.now() / 1000;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get audio data if speaking
    let audioLevel = 0;
    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    
    if (analyser && isSpeaking) {
      analyser.getByteFrequencyData(dataArray!);
      audioLevel = dataArray!.reduce((a, b) => a + b, 0) / dataArray!.length / 255;
    }

    // Outer rotating rings
    const ringCount = 3;
    for (let r = 0; r < ringCount; r++) {
      const baseRadius = 80 + r * 30;
      const rotation = time * (0.3 + r * 0.1) * (r % 2 === 0 ? 1 : -1);
      const segments = 60;
      const gapAngle = 0.1;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      for (let i = 0; i < segments; i++) {
        const segmentAngle = (Math.PI * 2) / segments;
        const startAngle = i * segmentAngle + gapAngle / 2;
        const endAngle = startAngle + segmentAngle - gapAngle;

        // Audio reactivity
        let radius = baseRadius;
        if (isSpeaking && dataArray) {
          const dataIndex = Math.floor((i / segments) * dataArray.length);
          radius += (dataArray[dataIndex] / 255) * 20;
        } else if (isListening) {
          radius += Math.sin(time * 5 + i * 0.3) * 8;
        } else if (isProcessing) {
          radius += Math.sin(time * 3 + i * 0.5) * 5;
        }

        const alpha = 0.3 + (r === 0 ? 0.4 : r === 1 ? 0.2 : 0.1);
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.strokeStyle = `hsla(187, 100%, 50%, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }

    // Inner core glow
    const coreRadius = 50 + (isSpeaking ? audioLevel * 20 : isListening ? Math.sin(time * 4) * 10 : 0);
    
    const coreGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, coreRadius
    );
    
    if (isListening) {
      coreGradient.addColorStop(0, "hsla(120, 100%, 50%, 0.6)");
      coreGradient.addColorStop(0.5, "hsla(120, 100%, 50%, 0.2)");
      coreGradient.addColorStop(1, "hsla(120, 100%, 50%, 0)");
    } else if (isSpeaking) {
      coreGradient.addColorStop(0, "hsla(187, 100%, 60%, 0.8)");
      coreGradient.addColorStop(0.5, "hsla(187, 100%, 50%, 0.3)");
      coreGradient.addColorStop(1, "hsla(187, 100%, 50%, 0)");
    } else if (isProcessing) {
      coreGradient.addColorStop(0, "hsla(45, 100%, 50%, 0.6)");
      coreGradient.addColorStop(0.5, "hsla(45, 100%, 50%, 0.2)");
      coreGradient.addColorStop(1, "hsla(45, 100%, 50%, 0)");
    } else {
      coreGradient.addColorStop(0, "hsla(187, 100%, 50%, 0.4)");
      coreGradient.addColorStop(0.5, "hsla(187, 100%, 50%, 0.1)");
      coreGradient.addColorStop(1, "hsla(187, 100%, 50%, 0)");
    }

    ctx.beginPath();
    ctx.fillStyle = coreGradient;
    ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    // Radial waveform bars when speaking
    if (isSpeaking && dataArray) {
      const barCount = 48;
      const minRadius = 55;
      const maxBarHeight = 35;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * maxBarHeight + 2;

        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        
        const startX = centerX + Math.cos(angle) * minRadius;
        const startY = centerY + Math.sin(angle) * minRadius;
        const endX = centerX + Math.cos(angle) * (minRadius + barHeight);
        const endY = centerY + Math.sin(angle) * (minRadius + barHeight);

        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, "hsla(187, 100%, 50%, 0.4)");
        gradient.addColorStop(1, "hsla(187, 100%, 70%, 1)");

        ctx.beginPath();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "hsla(187, 100%, 50%, 0.6)";
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    // Listening pulse animation
    if (isListening) {
      const pulseRadius = 60 + Math.sin(time * 6) * 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(120, 100%, 50%, ${0.5 + Math.sin(time * 6) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [analyser, isSpeaking, isListening, isProcessing]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        className="absolute"
      />
      
      {/* Central JARVIS text */}
      <motion.div
        className="relative z-10 text-center"
        animate={{
          scale: isSpeaking ? [1, 1.02, 1] : isListening ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: isSpeaking ? 0.3 : 0.8,
          repeat: isSpeaking || isListening ? Infinity : 0,
        }}
      >
        <h1 className="font-display text-2xl font-bold text-primary text-glow-lg tracking-wider">
          JARVIS
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {isListening ? "Ouvindo..." : isSpeaking ? "Falando..." : isProcessing ? "Processando..." : "Online"}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default JarvisCore;
