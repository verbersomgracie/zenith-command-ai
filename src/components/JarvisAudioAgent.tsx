import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Power, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeAgent, AgentState } from '@/utils/RealtimeAgent';
import JarvisCore from './JarvisCore';

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
  
  // Audio analyser for JarvisCore visualization
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    
    // Set up audio analyser for visualization
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      const newAnalyser = audioContextRef.current.createAnalyser();
      newAnalyser.fftSize = 1024;
      newAnalyser.smoothingTimeConstant = 0.85;
      setAnalyser(newAnalyser);
    }
  }, [toast]);

  const handleDisconnected = useCallback(() => {
    console.log('[JarvisAudioAgent] Disconnected');
    setAnalyser(null);
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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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
      default: return 'Online';
    }
  };

  const isActive = state !== 'idle' && state !== 'error';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* JARVIS Core Visualization */}
      <div className="relative mb-6">
        <JarvisCore
          analyser={analyser}
          isSpeaking={state === 'speaking'}
          isListening={state === 'listening'}
          isProcessing={state === 'thinking' || state === 'connecting'}
          wakeWordDetected={false}
        />
        
        {/* Connecting overlay */}
        <AnimatePresence>
          {state === 'connecting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                className="w-16 h-16 border-2 border-yellow-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Label */}
      <motion.div
        className="text-center mb-6"
        animate={{ opacity: state === 'connecting' ? 0.5 : 1 }}
      >
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {getStateLabel()}
        </p>
      </motion.div>

      {/* Last Message Display */}
      <AnimatePresence mode="wait">
        {messages.length > 0 && (
          <motion.div
            key={messages[messages.length - 1]?.content.slice(0, 20)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-md text-center mb-6 px-4"
          >
            <p className={`text-sm md:text-base leading-relaxed ${
              messages[messages.length - 1]?.role === 'assistant' 
                ? 'text-foreground' 
                : 'text-muted-foreground italic'
            }`}>
              {messages[messages.length - 1]?.content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {state === 'idle' || state === 'error' ? (
          <Button
            onClick={startAgent}
            size="lg"
            className="gap-2 bg-primary hover:bg-primary/90 px-6"
          >
            <Power className="w-5 h-5" />
            Iniciar
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
              className="w-12 h-12 border-primary/30"
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
            className="w-full max-w-md px-4"
          >
            <div className="bg-card/60 backdrop-blur-sm border border-primary/30 rounded-lg p-2 flex items-center gap-2">
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Digite uma mensagem..."
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                className="flex-1 bg-transparent border-none"
              />
              <Button 
                onClick={sendTextMessage} 
                disabled={!textInput.trim()}
                size="icon"
                className="rounded-full bg-primary/20 border border-primary/50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction text */}
      {isActive && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-muted-foreground mt-4 px-4"
        >
          Fale naturalmente. Interrompa a qualquer momento.
        </motion.p>
      )}
    </div>
  );
};

export default JarvisAudioAgent;
