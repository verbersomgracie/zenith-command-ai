import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, Power, Maximize, Minimize, RefreshCw, Menu, X, Radio, AudioWaveform, Users, Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useWakeWord } from "@/hooks/useWakeWord";
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContacts } from "@/hooks/useContacts";
import JarvisCore from "./JarvisCore";
import DateTimePanel from "./hud/DateTimePanel";
import SystemStatusPanel from "./hud/SystemStatusPanel";
import WeatherPanel from "./hud/WeatherPanel";
import RoutinesPanel from "./hud/RoutinesPanel";
import QuickLinksPanel from "./hud/QuickLinksPanel";
import NetworkInfoPanel from "./hud/NetworkInfoPanel";
import CommandHistoryPanel from "./hud/CommandHistoryPanel";
import BootSequence from "./BootSequence";
import ContactsModal from "./contacts/ContactsModal";
import ContactPickerPanel from "./contacts/ContactPickerPanel";
import WhatsAppHistoryModal from "./whatsapp/WhatsAppHistoryModal";
import WhatsAppPanel from "./whatsapp/WhatsAppPanel";
import RoutinesModal from "./routines/RoutinesModal";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [vadEnabled, setVadEnabled] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [whatsappHistoryOpen, setWhatsappHistoryOpen] = useState(false);
  const [routinesModalOpen, setRoutinesModalOpen] = useState(false);
  const [redMode, setRedMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wakeWordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { contacts, findContactByName } = useContacts();
  
  // Real-time device data
  const realTimeData = useRealTimeData();

  // Voice commands hook
  const { getCommandHelp, detectWakeWord } = useVoiceCommands();

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

  // Forward declarations for voice command handlers
  const speakTextRef = useRef<(text: string) => Promise<void>>();
  const stopSpeakingRef = useRef<() => void>();

  // Voice command execution
  const executeVoiceCommand = useCallback((action: string): string | null => {
    const now = new Date();
    
    switch (action) {
      case "GET_TIME":
        return `São ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
      
      case "GET_DATE":
        return `Hoje é ${now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.`;
      
      case "GET_WEATHER":
        if (realTimeData.weather.weather) {
          const w = realTimeData.weather.weather;
          return `A temperatura atual é de ${Math.round(w.temperature)}°C com ${w.description}. A umidade está em ${w.humidity}% e a sensação térmica é de ${Math.round(w.feelsLike)}°C.`;
        }
        return "Dados meteorológicos não disponíveis no momento.";
      
      case "GET_STATUS":
        const cpuInfo = realTimeData.device.cpu;
        const mem = realTimeData.device.memory;
        const bat = realTimeData.device.battery;
        return `Sistema operacional. CPU com ${cpuInfo.cores} núcleos a ${cpuInfo.usage}% de uso. ${mem.used}MB de ${mem.total}MB de memória em uso. Bateria em ${bat?.level ?? 0}%${bat?.charging ? ', carregando' : ''}.`;
      
      case "GET_BATTERY":
        const battery = realTimeData.device.battery;
        return `Bateria em ${battery?.level ?? 0}%${battery?.charging ? ', carregando' : ''}.`;
      
      case "STOP_SPEAKING":
        stopSpeakingRef.current?.();
        return null;
      
      case "TOGGLE_FULLSCREEN":
        toggleFullscreen();
        return isFullscreen ? "Saindo do modo tela cheia." : "Entrando em modo tela cheia.";
      
      case "ENABLE_VOICE":
        setVoiceEnabled(true);
        return "Resposta por voz ativada.";
      
      case "DISABLE_VOICE":
        setVoiceEnabled(false);
        return null;
      
      case "CLEAR_MESSAGES":
        setMessages([]);
        return "Histórico de conversa limpo.";
      
      case "OPEN_SIDEBAR":
        setSidebarOpen(true);
        return "Menu aberto.";
      
      case "CLOSE_SIDEBAR":
        setSidebarOpen(false);
        return "Menu fechado.";
      
      case "GET_HELP":
        return `Comandos disponíveis:\n${getCommandHelp()}`;
      
      case "GREETING":
        const hour = now.getHours();
        const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
        return `${greeting}, Comandante. Como posso ajudá-lo?`;
      
      case "RESTART_SYSTEM":
        // Trigger reboot sequence
        setIsBooting(true);
        setMessages([]);
        setTimeout(() => setIsBooting(false), 3000);
        return "Reinicializando sistemas...";
      
      case "ENABLE_WAKE_WORD":
        setWakeWordEnabled(true);
        return "Escuta contínua ativada. Diga 'Jarvis' para me chamar.";
      
      case "DISABLE_WAKE_WORD":
        setWakeWordEnabled(false);
        return "Escuta contínua desativada.";
      
      case "ENABLE_VAD":
        setVadEnabled(true);
        return "Detecção automática de voz ativada. Vou ouvir quando você falar.";
      
      case "DISABLE_VAD":
        setVadEnabled(false);
        return "Detecção automática de voz desativada.";
      
      default:
        return null;
    }
  }, [realTimeData, isFullscreen, toggleFullscreen, getCommandHelp]);

  // Check for voice commands
  const { detectCommand } = useVoiceCommands();

  const handleVoiceInput = useCallback(async (text: string) => {
    const command = detectCommand(text);
    
    if (command) {
      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput("");

      // Execute command
      const response = executeVoiceCommand(command.action);
      
      if (response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        if (voiceEnabled) {
          speakTextRef.current?.(response);
        }
      }
      return true;
    }
    return false;
  }, [detectCommand, executeVoiceCommand, voiceEnabled]);

  // Voice recognition
  const { isListening, transcript, isSupported, toggleListening, startListening } = useVoiceRecognition({
    language: "pt-BR",
    onResult: async (text) => {
      setInput(text);
      setWakeWordDetected(false);
      // Check for voice commands first
      const isCommand = await handleVoiceInput(text);
      if (!isCommand) {
        // If not a command, send to AI
        setTimeout(() => handleVoiceSubmit(text), 300);
      }
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro de reconhecimento",
        description: `Falha ao capturar voz: ${error}`,
      });
    },
  });

  // Wake word detection
  const handleWakeWordDetected = useCallback(() => {
    setWakeWordDetected(true);
    // Play a subtle sound or visual feedback
    toast({
      title: "JARVIS ativado",
      description: "Estou ouvindo, Comandante.",
    });
    // Start main voice recognition
    startListening();
    
    // Auto-timeout after 10 seconds
    if (wakeWordTimeoutRef.current) {
      clearTimeout(wakeWordTimeoutRef.current);
    }
    wakeWordTimeoutRef.current = setTimeout(() => {
      setWakeWordDetected(false);
    }, 10000);
  }, [startListening, toast]);

  const { isListening: isWakeWordActive } = useWakeWord({
    enabled: wakeWordEnabled && !isListening && !isSpeaking,
    onWakeWordDetected: handleWakeWordDetected,
    language: "pt-BR",
  });

  // Update wake word listening state
  useEffect(() => {
    setIsWakeWordListening(isWakeWordActive);
  }, [isWakeWordActive]);

  // Voice Activity Detection - auto-start listening when voice detected
  const handleVoiceStart = useCallback(() => {
    if (!isListening && !isSpeaking && !isProcessing) {
      toast({
        title: "Voz detectada",
        description: "Iniciando reconhecimento...",
      });
      startListening();
    }
  }, [isListening, isSpeaking, isProcessing, startListening, toast]);

  const { isVoiceActive, audioLevel } = useVoiceActivityDetection({
    enabled: vadEnabled && !isListening && !isSpeaking && !isProcessing,
    threshold: 0.025,
    silenceTimeout: 2000,
    onVoiceStart: handleVoiceStart,
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (wakeWordTimeoutRef.current) {
        clearTimeout(wakeWordTimeoutRef.current);
      }
    };
  }, []);

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

  // Assign refs for voice commands
  useEffect(() => {
    speakTextRef.current = speakText;
    stopSpeakingRef.current = stopSpeaking;
  }, [voiceEnabled]);

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
        { id: assistantMessageId, role: "assistant", content: "", timestamp: new Date() },
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
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
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
    if (isSpeaking) stopSpeaking();
    toggleListening();
  };

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  // Initial greeting - use ref to prevent double execution in StrictMode
  const hasGreetedRef = useRef(false);
  useEffect(() => {
    if (isBooting || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const timer = setTimeout(() => {
      const hour = new Date().getHours();
      let timeGreeting: string;
      let contextMessage: string;
      
      if (hour >= 5 && hour < 12) {
        timeGreeting = "Bom dia";
        contextMessage = "Pronto para começar o dia.";
      } else if (hour >= 12 && hour < 18) {
        timeGreeting = "Boa tarde";
        contextMessage = "Sistemas operacionais.";
      } else if (hour >= 18 && hour < 22) {
        timeGreeting = "Boa noite";
        contextMessage = "À disposição para o turno noturno.";
      } else {
        timeGreeting = "Boa madrugada";
        contextMessage = "Modo noturno ativado.";
      }
      
      const greeting: Message = {
        id: "initial",
        role: "assistant",
        content: `${timeGreeting}, Comandante. ${contextMessage}`,
        timestamp: new Date(),
      };
      setMessages([greeting]);
      if (voiceEnabled) speakText(greeting.content);
    }, 500);
    return () => clearTimeout(timer);
  }, [isBooting]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // Panel content for sidebar
  const LeftPanels = (
    <div className="space-y-3">
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
    </div>
  );

  const RightPanels = (
    <div className="space-y-3">
      <WeatherPanel 
        weather={realTimeData.weather.weather}
        loading={realTimeData.weather.loading}
        error={realTimeData.weather.error}
      />
      <WhatsAppPanel onOpenHistory={() => setWhatsappHistoryOpen(true)} />
      <ContactPickerPanel onOpenContacts={() => setContactsModalOpen(true)} />
      <RoutinesPanel onManageClick={() => setRoutinesModalOpen(true)} />
      <QuickLinksPanel />
      <CommandHistoryPanel />
    </div>
  );

  return (
    <div ref={containerRef} className={`min-h-screen h-screen bg-background flex flex-col overflow-hidden relative ${redMode ? 'red-mode' : ''}`}>
      {/* Boot Sequence */}
      <AnimatePresence>
        {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      </AnimatePresence>

      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10" />
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />

      {/* Top status bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 flex items-center justify-between px-3 md:px-6 py-2 border-b border-primary/20 bg-background/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded text-primary hover:bg-primary/10"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${realTimeData.device.network.online ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span className="font-display text-[10px] md:text-xs text-primary hidden sm:inline">
              {realTimeData.device.network.online ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground hidden md:inline">
            {isListening ? "VOZ ATIVA" : vadEnabled && isVoiceActive ? "SOM DETECTADO" : vadEnabled ? "VAD ATIVO" : isWakeWordListening ? "AGUARDANDO 'JARVIS'" : isSpeaking ? "REPRODUZINDO" : isProcessing ? "PROCESSANDO" : "AGUARDANDO"}
          </span>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {!isMobile && (
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => setVadEnabled(!vadEnabled)}
            className={`p-2 rounded ${vadEnabled ? "text-cyan-400 bg-cyan-400/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
            title={vadEnabled ? "Desativar detecção automática" : "Ativar detecção automática de voz"}
          >
            <AudioWaveform className="w-4 h-4" />
          </button>
          <button
            onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
            className={`p-2 rounded ${wakeWordEnabled ? "text-green-400 bg-green-400/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
            title={wakeWordEnabled ? "Desativar escuta 'Jarvis'" : "Ativar escuta 'Jarvis'"}
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRedMode(!redMode)}
            className={`p-2 rounded ${redMode ? "text-red-400 bg-red-400/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
            title={redMode ? "Desativar modo vermelho" : "Ativar modo vermelho"}
          >
            <Flame className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded ${voiceEnabled ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className={`p-2 rounded ${realTimeData.device.network.online ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
            <Power className="w-4 h-4" />
          </div>
        </div>
      </motion.header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-background border-r border-primary/20 z-40 pt-16 p-4 overflow-y-auto"
            >
              {LeftPanels}
              <div className="mt-4">{RightPanels}</div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main HUD Content */}
      <main className="flex-1 relative z-10 flex overflow-hidden">
        {/* Left Panel - Desktop only */}
        {!isMobile && (
          <aside className="w-44 lg:w-48 p-3 space-y-3 overflow-y-auto scrollbar-thin flex-shrink-0">
            {LeftPanels}
          </aside>
        )}

        {/* Center - JARVIS Core */}
        <div className="flex-1 flex flex-col items-center justify-center relative px-4">
          <div className="relative mb-4 md:mb-6">
            <JarvisCore
              analyser={analyserRef.current}
              isSpeaking={isSpeaking}
              isListening={isListening}
              isProcessing={isProcessing}
              wakeWordDetected={wakeWordDetected}
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
                className="max-w-md md:max-w-xl text-center mb-4 md:mb-6 px-4"
              >
                <p className={`text-sm md:text-base leading-relaxed ${
                  messages[messages.length - 1]?.role === "assistant" ? "text-foreground" : "text-muted-foreground italic"
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
            className="w-full max-w-md md:max-w-lg px-4"
          >
            <form onSubmit={handleSubmit}>
              <div className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-lg p-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={!isSupported}
                  className={`p-2 md:p-3 rounded-full transition-all ${
                    isListening
                      ? "bg-green-500/20 text-green-400 animate-pulse border border-green-500/50"
                      : "hover:bg-secondary/50 text-muted-foreground hover:text-primary"
                  } ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Ouvindo..." : "Digite um comando..."}
                  disabled={isProcessing || isListening}
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="p-2 md:p-3 rounded-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Right Panel - Desktop only */}
        {!isMobile && (
          <aside className="w-44 lg:w-48 p-3 space-y-3 overflow-y-auto scrollbar-thin flex-shrink-0">
            {RightPanels}
          </aside>
        )}
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 px-3 md:px-6 py-2 border-t border-primary/20 flex items-center justify-between text-[10px] md:text-xs"
      >
        <div className="flex items-center gap-2 md:gap-4 text-muted-foreground">
          <span>JARVIS v3.0</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{realTimeData.device.network.rtt ?? '--'}ms</span>
        </div>
        <div className="flex items-center gap-2 text-primary/60">
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
          <span className="hidden sm:inline">{realTimeData.currentTime.toLocaleTimeString('pt-BR')}</span>
        </div>
      </motion.footer>

      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Contacts Modal */}
      <ContactsModal
        isOpen={contactsModalOpen}
        onClose={() => setContactsModalOpen(false)}
        onSelectContact={(contact) => {
          setInput(`Enviar WhatsApp para ${contact.name}: `);
          inputRef.current?.focus();
        }}
      />

      {/* WhatsApp History Modal */}
      <WhatsAppHistoryModal
        isOpen={whatsappHistoryOpen}
        onClose={() => setWhatsappHistoryOpen(false)}
      />

      {/* Routines Modal */}
      <RoutinesModal
        open={routinesModalOpen}
        onOpenChange={setRoutinesModalOpen}
      />
    </div>
  );
};

export default JarvisInterface;
