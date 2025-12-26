import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, Power, Maximize, Minimize, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import JarvisCore from "./JarvisCore";
import DateTimePanel from "./hud/DateTimePanel";
import SystemStatusPanel from "./hud/SystemStatusPanel";
import WeatherPanel from "./hud/WeatherPanel";
import NotesPanel from "./hud/NotesPanel";
import QuickLinksPanel from "./hud/QuickLinksPanel";
import NetworkInfoPanel from "./hud/NetworkInfoPanel";
import CommandHistoryPanel from "./hud/CommandHistoryPanel";
import BootSequence from "./BootSequence";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const JarvisInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Real-time device data
  const realTimeData = useRealTimeData();

  // Fullscreen handlers
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error("Fullscreen error:", err);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // WebAudio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Voice recognition
  const { isListening, transcript, isSupported, toggleListening, stopListening } = useVoiceRecognition({
    language: "pt-BR",
    onResult: (text) => {
      setInput(text);
      setTimeout(() => {
        handleVoiceSubmit(text);
      }, 300);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro de reconhecimento",
        description: `Falha ao capturar voz: ${error}`,
      });
    },
  });

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const attachJarvisAudioChain = (audioEl: HTMLAudioElement) => {
    const ctx = ensureAudioContext();

    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioEl);
    }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 90;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 6000;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    const shaper = ctx.createWaveShaper();
    const makeCurve = (amount = 10) => {
      const n = 44100;
      const curve = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const x = (i * 2) / n - 1;
        curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    };
    shaper.curve = makeCurve(8);
    shaper.oversample = "2x";

    sourceRef.current.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(comp);
    comp.connect(shaper);
    shaper.connect(analyser);
    analyser.connect(ctx.destination);

    if (ctx.state === "suspended") ctx.resume();
  };

  const speakText = async (text: string) => {
    if (!voiceEnabled) return;

    try {
      setIsSpeaking(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || "TTS request failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audio.playbackRate = 0.94;
      audioRef.current = audio;

      attachJarvisAudioChain(audio);

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  const streamChat = async (userMessages: { role: string; content: string }[]) => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/jarvis-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: userMessages }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response;
  };

  const processMessage = async (userInput: string) => {
    if (!userInput.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);

    const messageHistory = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await streamChat(messageHistory);
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      const assistantMessageId = (Date.now() + 1).toString();
      let textBuffer = "";

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: assistantContent }
                    : m
                )
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantContent && voiceEnabled) {
        speakText(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: error instanceof Error ? error.message : "Falha ao conectar com JARVIS",
      });
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processMessage(input);
  };

  const handleVoiceSubmit = (text: string) => {
    processMessage(text);
  };

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    toggleListening();
  };

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Initial greeting - only after boot completes
  useEffect(() => {
    if (isBooting) return;
    
    const timer = setTimeout(() => {
      const greeting: Message = {
        id: "initial",
        role: "assistant",
        content: "Sistemas online, Comandante. JARVIS pronto para auxiliá-lo.",
        timestamp: new Date(),
      };
      setMessages([greeting]);
      if (voiceEnabled) {
        speakText(greeting.content);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isBooting]);

  return (
    <div ref={containerRef} className="min-h-screen h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Boot Sequence */}
      <AnimatePresence>
        {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>

      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      {/* Top status bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-primary/20 bg-background/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${realTimeData.device.network.online ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="font-display text-xs text-primary">{realTimeData.device.network.online ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className="h-4 w-px bg-primary/30" />
          <span className="text-xs text-muted-foreground">
            {isListening ? "VOZ ATIVA" : isSpeaking ? "REPRODUZINDO" : isProcessing ? "PROCESSANDO" : "AGUARDANDO"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded transition-all text-muted-foreground hover:text-primary hover:bg-primary/10"
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded transition-all ${
              voiceEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
            }`}
            title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div
            className={`p-2 rounded ${
              realTimeData.device.network.online ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
            }`}
            title={realTimeData.device.network.online ? "Sistema online" : "Sistema offline"}
          >
            <Power className="w-4 h-4" />
          </div>
        </div>
      </motion.header>

      {/* Main HUD Content */}
      <main className="flex-1 relative z-10 flex overflow-hidden">
        {/* Left Panel */}
        <aside className="w-48 p-4 space-y-4 overflow-y-auto scrollbar-thin">
          <DateTimePanel />
          <SystemStatusPanel 
            cpu={realTimeData.device.cpu}
            memory={realTimeData.device.memory}
            battery={realTimeData.device.battery}
            network={realTimeData.device.network}
            uptime={realTimeData.uptime}
          />
          <NetworkInfoPanel 
            network={realTimeData.device.network}
            location={{
              latitude: realTimeData.location.latitude,
              longitude: realTimeData.location.longitude,
              accuracy: realTimeData.location.accuracy,
              loading: realTimeData.location.loading,
              error: realTimeData.location.error,
            }}
          />
        </aside>

        {/* Center - JARVIS Core */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-4">
          {/* JARVIS Core visualization */}
          <div className="relative mb-6">
            <JarvisCore
              analyser={analyserRef.current}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isProcessing={isProcessing}
            />
          </div>

          {/* Message display */}
          <AnimatePresence mode="wait">
            {messages.length > 0 && (
              <motion.div
                key={messages[messages.length - 1]?.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-xl text-center mb-6"
              >
                <p className={`text-base leading-relaxed ${
                  messages[messages.length - 1]?.role === "assistant"
                    ? "text-foreground"
                    : "text-muted-foreground italic"
                }`}>
                  {messages[messages.length - 1]?.content}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full max-w-lg"
          >
            <form onSubmit={handleSubmit} className="relative">
              <div className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-lg p-2 flex items-center gap-2">
                {/* Voice button */}
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={!isSupported}
                  className={`p-3 rounded-full transition-all ${
                    isListening
                      ? "bg-green-500/20 text-green-400 animate-pulse border border-green-500/50"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-primary"
                  } ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={isListening ? "Parar de ouvir" : "Comando de voz"}
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Ouvindo..." : "Digite um comando..."}
                  disabled={isProcessing || isListening}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 disabled:opacity-50"
                />

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="p-3 rounded-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Right Panel */}
        <aside className="w-60 p-4 space-y-4 overflow-y-auto scrollbar-thin">
          <WeatherPanel 
            weather={realTimeData.weather.weather}
            loading={realTimeData.weather.loading}
            error={realTimeData.weather.error}
          />
          <NotesPanel />
          <QuickLinksPanel />
          <CommandHistoryPanel />
        </aside>
      </main>

      {/* Bottom decorative elements */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 px-6 py-2 border-t border-primary/20 flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>J.A.R.V.I.S. v3.0.1</span>
          <span>•</span>
          <span>Latência: {realTimeData.device.network.rtt ?? '--'}ms</span>
          <span>•</span>
          <span>CPU: {realTimeData.device.cpu.usage}%</span>
        </div>
        <div className="flex items-center gap-2 text-primary/60">
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Atualizado: {realTimeData.currentTime.toLocaleTimeString('pt-BR')}</span>
        </div>
      </motion.footer>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
};

export default JarvisInterface;
