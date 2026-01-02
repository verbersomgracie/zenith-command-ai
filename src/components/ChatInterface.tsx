import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, Sparkles, User, Bot, Volume2, VolumeX, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioWaveform from "./AudioWaveform";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const hasLoadedRef = useRef(false);

  // WebAudio refs (Jarvis effect + waveform base)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history from database
  const loadConversationHistory = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      const { data, error } = await supabase
        .from("conversation_history")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(50); // Last 50 messages for context

      if (error) {
        console.error("Error loading conversation history:", error);
        return;
      }

      if (data && data.length > 0) {
        const loadedMessages: Message[] = data.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }));
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save message to database
  const saveMessage = async (role: "user" | "assistant", content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("conversation_history")
        .insert({ role, content, user_id: user.id });

      if (error) {
        console.error("Error saving message:", error);
      }
    } catch (err) {
      console.error("Failed to save message:", err);
    }
  };

  // Clear conversation history
  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from("conversation_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) {
        console.error("Error clearing history:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao limpar histórico",
        });
        return;
      }

      setMessages([]);
      toast({
        title: "Histórico limpo",
        description: "Memória de conversas apagada",
      });
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  useEffect(() => {
    loadConversationHistory();
  }, [loadConversationHistory]);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const attachJarvisAudioChain = (audioEl: HTMLAudioElement) => {
    const ctx = ensureAudioContext();

    // Avoid "HTMLMediaElement already connected" error
    if (!sourceRef.current) {
      sourceRef.current = ctx.createMediaElementSource(audioEl);
    }

    // Analyser (for waveform)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.85;
    analyserRef.current = analyser;

    // EQ "communicator" style
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 90;

    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 6000;

    // Compressor (punch/control)
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;

    // Light saturation (AI edge)
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

    // Connect chain: source -> filters -> comp -> shaper -> analyser -> output
    sourceRef.current.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(comp);
    comp.connect(shaper);
    shaper.connect(analyser);
    analyser.connect(ctx.destination);

    // Resume context (some browsers require user gesture)
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

      // Stop previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);

      // Deeper voice without changing backend
      audio.playbackRate = 0.94;

      audioRef.current = audio;

      // Jarvis HUD effect + waveform base
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
      toast({
        variant: "destructive",
        title: "Erro de áudio",
        description: error instanceof Error ? error.message : "Falha ao reproduzir TTS",
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Save user message to database
    await saveMessage("user", input);

    // Build message history for context
    const messageHistory = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await streamChat(messageHistory);
      
      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let assistantMessageId = (Date.now() + 1).toString();
      let textBuffer = "";

      // Add empty assistant message
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

        // Process line-by-line
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
            // Incomplete JSON, put back and wait
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
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
            /* ignore */
          }
        }
      }
      
      // Save assistant response to database
      if (assistantContent) {
        await saveMessage("assistant", assistantContent);
      }

      // Speak the response if voice is enabled
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
      // Remove the empty assistant message if there was an error
      setMessages((prev) => prev.filter((m) => m.content !== ""));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 mb-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
            <AudioWaveform analyser={analyserRef.current} isSpeaking={isSpeaking} />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-primary text-glow-sm">
              JARVIS Interface
            </h2>
            <p className="text-xs text-muted-foreground">Neural Link Active</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearHistory}
            className="p-2 rounded-lg bg-secondary text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (isSpeaking) {
                stopSpeaking();
              } else {
                setVoiceEnabled(!voiceEnabled);
              }
            }}
            className={`p-2 rounded-lg transition-colors ${
              voiceEnabled 
                ? "bg-primary/20 text-primary hover:bg-primary/30" 
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            } ${isSpeaking ? "animate-pulse" : ""}`}
            title={isSpeaking ? "Parar áudio" : voiceEnabled ? "Desativar voz" : "Ativar voz"}
          >
            {voiceEnabled ? (
              <Volume2 className={`w-4 h-4 ${isSpeaking ? "text-primary" : ""}`} />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <div className="text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block mr-2" />
            {isSpeaking ? "Falando..." : "Pronto"}
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Inicie uma conversa com JARVIS
          </div>
        ) : null}
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex gap-3 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.role === "user"
                    ? "bg-secondary border border-border"
                    : "bg-primary/20 border border-primary/50"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-foreground" />
                ) : (
                  <Bot className="w-4 h-4 text-primary" />
                )}
              </div>
              <div
                className={`max-w-[80%] glass-card p-4 ${
                  message.role === "user"
                    ? "bg-secondary/80"
                    : "border-primary/30"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && messages[messages.length - 1]?.content === "" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="glass-card p-4 border-primary/30">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={handleSubmit}
        className="mt-4"
      >
        <div className="glass-card p-2 flex items-center gap-2">
          <button
            type="button"
            className="p-3 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-primary"
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite um comando ou pergunte ao JARVIS..."
            disabled={isTyping}
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed pulse-glow"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          JARVIS pronto para auxiliar • Conexão segura estabelecida
        </p>
      </motion.form>
    </div>
  );
};

export default ChatInterface;
