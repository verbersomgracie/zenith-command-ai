import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import JarvisCore from "./JarvisCore";

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
  const [isOnline, setIsOnline] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // WebAudio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Voice recognition
  const { isListening, transcript, isSupported, toggleListening, stopListening } = useVoiceRecognition({
    language: "pt-BR",
    onResult: (text) => {
      setInput(text);
      // Auto-submit after voice recognition
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

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // Initial greeting
  useEffect(() => {
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
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      {/* Header controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4 flex items-center gap-3 z-10"
      >
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className={`p-3 rounded-full glass-card transition-all ${
            voiceEnabled ? "text-primary border-primary/50" : "text-muted-foreground"
          }`}
          title={voiceEnabled ? "Desativar voz" : "Ativar voz"}
        >
          {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`p-3 rounded-full glass-card transition-all ${
            isOnline ? "text-green-400 border-green-400/50" : "text-red-400 border-red-400/50"
          }`}
          title={isOnline ? "Sistema online" : "Sistema offline"}
        >
          <Power className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Main JARVIS Core */}
      <div className="relative z-10 mb-8">
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
            className="max-w-2xl text-center mb-8 px-4"
          >
            <p
              className={`text-lg leading-relaxed ${
                messages[messages.length - 1]?.role === "assistant"
                  ? "text-foreground"
                  : "text-muted-foreground italic"
              }`}
            >
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
        className="w-full max-w-xl px-4"
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className="glass-card p-2 flex items-center gap-2">
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
              className="p-3 rounded-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed pulse-glow"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Status bar */}
        <div className="flex justify-center items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
            <span>{isOnline ? "Sistema operacional" : "Offline"}</span>
          </div>
          <span>•</span>
          <span>{isListening ? "Capturando voz" : isSpeaking ? "Reproduzindo" : isProcessing ? "Processando" : "Aguardando"}</span>
        </div>
      </motion.div>

      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
          initial={{ top: "0%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  );
};

export default JarvisInterface;
