import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Power, MessageSquare, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeAgent, AgentState } from '@/utils/RealtimeAgent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface JarvisAudioAgentProps {
  onStateChange?: (state: AgentState) => void;
  className?: string;
}

const JarvisAudioAgent: React.FC<JarvisAudioAgentProps> = ({ 
  onStateChange,
  className = '' 
}) => {
  const { toast } = useToast();
  const [state, setState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const agentRef = useRef<RealtimeAgent | null>(null);

  // Update parent when state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const handleStateChange = useCallback((newState: AgentState) => {
    console.log('[JarvisAudioAgent] State changed:', newState);
    setState(newState);
  }, []);

  const handleTranscript = useCallback((text: string, role: 'user' | 'assistant') => {
    setMessages(prev => [...prev, { role, content: text, timestamp: new Date() }]);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('[JarvisAudioAgent] Error:', error);
    toast({
      title: 'Erro',
      description: error,
      variant: 'destructive',
    });
  }, [toast]);

  const handleConnected = useCallback(() => {
    toast({
      title: 'JARVIS Online',
      description: 'Conexão de áudio estabelecida. Pode falar.',
    });
  }, [toast]);

  const handleDisconnected = useCallback(() => {
    console.log('[JarvisAudioAgent] Disconnected');
  }, []);

  const startAgent = useCallback(async () => {
    try {
      setState('connecting');

      // Get ephemeral token from edge function
      const { data, error } = await supabase.functions.invoke('realtime-token');

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.client_secret?.value) {
        throw new Error('Falha ao obter token de sessão');
      }

      // Create and connect agent
      agentRef.current = new RealtimeAgent({
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onError: handleError,
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
      });

      await agentRef.current.connect(data.client_secret.value);

    } catch (error) {
      console.error('[JarvisAudioAgent] Failed to start:', error);
      handleError(error instanceof Error ? error.message : 'Falha ao iniciar agente');
      setState('idle');
    }
  }, [handleStateChange, handleTranscript, handleError, handleConnected, handleDisconnected]);

  const stopAgent = useCallback(() => {
    agentRef.current?.disconnect();
    agentRef.current = null;
    setState('idle');
  }, []);

  const sendTextMessage = useCallback(() => {
    if (!textInput.trim() || !agentRef.current?.isConnected()) return;
    
    try {
      agentRef.current.sendTextMessage(textInput.trim());
      setTextInput('');
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Falha ao enviar mensagem');
    }
  }, [textInput, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      agentRef.current?.disconnect();
    };
  }, []);

  const getStateLabel = () => {
    switch (state) {
      case 'idle': return 'Offline';
      case 'connecting': return 'Conectando...';
      case 'listening': return 'Ouvindo';
      case 'thinking': return 'Processando';
      case 'speaking': return 'Falando';
      case 'error': return 'Erro';
      default: return 'Desconhecido';
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'idle': return 'text-muted-foreground';
      case 'connecting': return 'text-yellow-500';
      case 'listening': return 'text-cyan-400';
      case 'thinking': return 'text-purple-400';
      case 'speaking': return 'text-primary';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const isActive = state !== 'idle' && state !== 'error';

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Status Display */}
      <div className="flex items-center justify-center gap-2">
        <motion.div
          className={`w-3 h-3 rounded-full ${
            state === 'idle' ? 'bg-muted-foreground' :
            state === 'connecting' ? 'bg-yellow-500' :
            state === 'listening' ? 'bg-cyan-400' :
            state === 'thinking' ? 'bg-purple-400' :
            state === 'speaking' ? 'bg-primary' :
            'bg-destructive'
          }`}
          animate={{
            scale: isActive ? [1, 1.2, 1] : 1,
            opacity: state === 'connecting' ? [1, 0.5, 1] : 1,
          }}
          transition={{
            duration: state === 'speaking' ? 0.5 : 1,
            repeat: isActive ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />
        <span className={`text-sm font-mono uppercase tracking-wider ${getStateColor()}`}>
          {getStateLabel()}
        </span>
      </div>

      {/* Visual Indicator */}
      <div className="relative flex items-center justify-center h-24">
        <AnimatePresence mode="wait">
          {state === 'speaking' && (
            <motion.div
              key="speaking"
              className="flex items-center gap-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary rounded-full"
                  animate={{
                    height: [8, 32, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          )}

          {state === 'listening' && (
            <motion.div
              key="listening"
              className="relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full border-2 border-cyan-400"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 0.4, 0.8],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <Mic className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-cyan-400" />
            </motion.div>
          )}

          {state === 'thinking' && (
            <motion.div
              key="thinking"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-purple-400 rounded-full"
                  animate={{
                    y: [-4, 4, -4],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}

          {state === 'connecting' && (
            <motion.div
              key="connecting"
              className="w-12 h-12 border-2 border-yellow-500 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {state === 'idle' || state === 'error' ? (
          <Button
            onClick={startAgent}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Power className="w-5 h-5" />
            Iniciar JARVIS
          </Button>
        ) : (
          <>
            <Button
              onClick={stopAgent}
              variant="destructive"
              size="lg"
              className="gap-2"
            >
              <MicOff className="w-5 h-5" />
              Parar
            </Button>

            <Button
              onClick={() => setShowTextInput(!showTextInput)}
              variant="outline"
              size="icon"
              className="w-12 h-12"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>

      {/* Text Input (optional) */}
      <AnimatePresence>
        {showTextInput && isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2"
          >
            <Input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
              className="flex-1"
            />
            <Button onClick={sendTextMessage} disabled={!textInput.trim()}>
              Enviar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Messages */}
      {messages.length > 0 && (
        <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
          {messages.slice(-5).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-1.5 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-primary/20 text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JarvisAudioAgent;
