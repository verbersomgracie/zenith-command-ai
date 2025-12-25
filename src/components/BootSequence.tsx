import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BootSequenceProps {
  onComplete: () => void;
}

const bootMessages = [
  { text: "Iniciando JARVIS v3.0.1...", delay: 0 },
  { text: "Carregando núcleo de IA...", delay: 400 },
  { text: "Verificando protocolos de segurança...", delay: 800 },
  { text: "Conectando interfaces neurais...", delay: 1200 },
  { text: "Calibrando sensores...", delay: 1600 },
  { text: "Estabelecendo link de comunicação...", delay: 2000 },
  { text: "Sincronizando bancos de dados...", delay: 2400 },
  { text: "Ativando módulos de voz...", delay: 2800 },
  { text: "Inicializando interface holográfica...", delay: 3200 },
  { text: "Sistemas prontos.", delay: 3600 },
];

const systemChecks = [
  { name: "CPU", status: "OK" },
  { name: "MEMÓRIA", status: "OK" },
  { name: "REDE", status: "OK" },
  { name: "ÁUDIO", status: "OK" },
  { name: "VISUAL", status: "OK" },
  { name: "SEGURANÇA", status: "OK" },
];

const BootSequence = ({ onComplete }: BootSequenceProps) => {
  const [progress, setProgress] = useState(0);
  const [currentMessages, setCurrentMessages] = useState<string[]>([]);
  const [showSystemChecks, setShowSystemChecks] = useState(false);
  const [completedChecks, setCompletedChecks] = useState<number[]>([]);
  const [showLogo, setShowLogo] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Add boot messages progressively
    bootMessages.forEach(({ text, delay }) => {
      setTimeout(() => {
        setCurrentMessages((prev) => [...prev, text]);
      }, delay);
    });

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    // Show system checks
    setTimeout(() => setShowSystemChecks(true), 2000);

    // Complete system checks one by one
    systemChecks.forEach((_, index) => {
      setTimeout(() => {
        setCompletedChecks((prev) => [...prev, index]);
      }, 2200 + index * 300);
    });

    // Show JARVIS logo
    setTimeout(() => setShowLogo(true), 4200);

    // Fade out and complete
    setTimeout(() => setFadeOut(true), 5500);
    setTimeout(() => onComplete(), 6200);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!fadeOut ? (
        <motion.div
          className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* Scanning lines effect */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-0 right-0 h-px bg-primary/10"
                style={{ top: `${i * 2}%` }}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: i * 0.02, duration: 0.3 }}
              />
            ))}
          </div>

          {/* Grid background */}
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />

          {/* Main content */}
          <div className="relative z-10 w-full max-w-4xl px-8">
            {/* Top decorative line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1 }}
            />

            <div className="flex gap-12">
              {/* Left panel - Boot messages */}
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  <h2 className="font-display text-primary text-sm tracking-widest mb-1">
                    STARK INDUSTRIES
                  </h2>
                  <h1 className="font-display text-2xl text-foreground tracking-wider">
                    J.A.R.V.I.S.
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Just A Rather Very Intelligent System
                  </p>
                </motion.div>

                {/* Boot messages */}
                <div className="h-48 overflow-hidden font-mono text-xs space-y-1">
                  {currentMessages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-primary">&gt;</span>
                      <span className="text-muted-foreground">{msg}</span>
                      {index === currentMessages.length - 1 && (
                        <motion.span
                          className="w-2 h-4 bg-primary"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">INICIALIZAÇÃO</span>
                    <span className="text-primary font-display">{progress}%</span>
                  </div>
                  <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </div>

              {/* Right panel - System checks */}
              <div className="w-64">
                <AnimatePresence>
                  {showSystemChecks && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-primary/30 rounded p-4"
                    >
                      <h3 className="font-display text-xs text-primary mb-4 tracking-wider">
                        VERIFICAÇÃO DE SISTEMAS
                      </h3>
                      <div className="space-y-2">
                        {systemChecks.map((check, index) => (
                          <motion.div
                            key={check.name}
                            className="flex items-center justify-between text-xs"
                            initial={{ opacity: 0.3 }}
                            animate={{
                              opacity: completedChecks.includes(index) ? 1 : 0.3,
                            }}
                          >
                            <span className="text-muted-foreground">{check.name}</span>
                            <span
                              className={`font-display ${
                                completedChecks.includes(index)
                                  ? "text-green-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {completedChecks.includes(index) ? (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  {check.status}
                                </motion.span>
                              ) : (
                                "..."
                              )}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Arc reactor visualization */}
                <AnimatePresence>
                  {showLogo && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 flex justify-center"
                    >
                      <svg className="w-32 h-32" viewBox="0 0 128 128">
                        {/* Outer rings */}
                        {[0, 1, 2].map((i) => (
                          <motion.circle
                            key={i}
                            cx="64"
                            cy="64"
                            r={50 - i * 10}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="1"
                            strokeDasharray={i === 1 ? "10 5" : "none"}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ 
                              pathLength: 1, 
                              opacity: 0.6 - i * 0.15,
                              rotate: i % 2 === 0 ? 360 : -360 
                            }}
                            transition={{
                              pathLength: { duration: 0.5, delay: i * 0.2 },
                              rotate: { duration: 20 - i * 5, repeat: Infinity, ease: "linear" }
                            }}
                            style={{ transformOrigin: "center" }}
                          />
                        ))}
                        {/* Core glow */}
                        <motion.circle
                          cx="64"
                          cy="64"
                          r="15"
                          fill="hsl(var(--primary))"
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ 
                            opacity: [0.5, 1, 0.5], 
                            scale: 1 
                          }}
                          transition={{
                            opacity: { duration: 1.5, repeat: Infinity },
                            scale: { duration: 0.3, delay: 0.6 }
                          }}
                          filter="url(#glow)"
                        />
                        <defs>
                          <filter id="glow">
                            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom decorative line */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/50" />
            <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-primary/50" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-primary/50" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/50" />
          </div>

          {/* Scanning line animation */}
          <motion.div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default BootSequence;
