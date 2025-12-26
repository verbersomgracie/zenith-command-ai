import { useCallback } from "react";

export interface VoiceCommand {
  patterns: string[];
  action: string;
  description: string;
}

export const VOICE_COMMANDS: VoiceCommand[] = [
  {
    patterns: ["que horas são", "que hora é", "me diga as horas", "hora atual"],
    action: "GET_TIME",
    description: "Informa a hora atual",
  },
  {
    patterns: ["que dia é hoje", "qual a data", "data de hoje", "dia atual"],
    action: "GET_DATE",
    description: "Informa a data atual",
  },
  {
    patterns: ["como está o tempo", "previsão do tempo", "clima", "temperatura"],
    action: "GET_WEATHER",
    description: "Informa o clima atual",
  },
  {
    patterns: ["status do sistema", "status", "diagnóstico", "como você está"],
    action: "GET_STATUS",
    description: "Informa o status do sistema",
  },
  {
    patterns: ["bateria", "nível de bateria", "quanto de bateria"],
    action: "GET_BATTERY",
    description: "Informa o nível de bateria",
  },
  {
    patterns: ["para de falar", "silêncio", "cala a boca", "mudo", "pare"],
    action: "STOP_SPEAKING",
    description: "Para a fala do JARVIS",
  },
  {
    patterns: ["tela cheia", "fullscreen", "maximizar", "expandir tela"],
    action: "TOGGLE_FULLSCREEN",
    description: "Alterna modo tela cheia",
  },
  {
    patterns: ["ativar voz", "ligar voz", "habilitar áudio", "ativar áudio"],
    action: "ENABLE_VOICE",
    description: "Ativa a resposta por voz",
  },
  {
    patterns: ["desativar voz", "desligar voz", "desabilitar áudio", "desativar áudio"],
    action: "DISABLE_VOICE",
    description: "Desativa a resposta por voz",
  },
  {
    patterns: ["limpar histórico", "limpar conversa", "nova conversa", "resetar"],
    action: "CLEAR_MESSAGES",
    description: "Limpa o histórico de mensagens",
  },
  {
    patterns: ["abrir menu", "mostrar menu", "exibir painel", "abrir painel"],
    action: "OPEN_SIDEBAR",
    description: "Abre o menu lateral",
  },
  {
    patterns: ["fechar menu", "esconder menu", "fechar painel", "esconder painel"],
    action: "CLOSE_SIDEBAR",
    description: "Fecha o menu lateral",
  },
  {
    patterns: ["ajuda", "comandos", "o que você pode fazer", "quais comandos"],
    action: "GET_HELP",
    description: "Lista os comandos disponíveis",
  },
  {
    patterns: ["bom dia", "boa tarde", "boa noite", "olá", "oi jarvis", "ei jarvis"],
    action: "GREETING",
    description: "Saudação",
  },
];

interface UseVoiceCommandsOptions {
  onCommand?: (action: string, originalText: string) => void;
}

export const useVoiceCommands = (options: UseVoiceCommandsOptions = {}) => {
  const { onCommand } = options;

  const detectCommand = useCallback((text: string): VoiceCommand | null => {
    const normalizedText = text.toLowerCase().trim();
    
    for (const command of VOICE_COMMANDS) {
      for (const pattern of command.patterns) {
        if (normalizedText.includes(pattern.toLowerCase())) {
          return command;
        }
      }
    }
    
    return null;
  }, []);

  const processVoiceInput = useCallback((text: string): { isCommand: boolean; action?: string; command?: VoiceCommand } => {
    const command = detectCommand(text);
    
    if (command) {
      onCommand?.(command.action, text);
      return { isCommand: true, action: command.action, command };
    }
    
    return { isCommand: false };
  }, [detectCommand, onCommand]);

  const getCommandHelp = useCallback((): string => {
    return VOICE_COMMANDS.map(cmd => `• "${cmd.patterns[0]}" - ${cmd.description}`).join("\n");
  }, []);

  return {
    detectCommand,
    processVoiceInput,
    getCommandHelp,
    commands: VOICE_COMMANDS,
  };
};
