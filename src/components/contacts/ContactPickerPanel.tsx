import { Users } from "lucide-react";

interface ContactPickerPanelProps {
  onOpenContacts: () => void;
}

export default function ContactPickerPanel({ onOpenContacts }: ContactPickerPanelProps) {
  return (
    <div className="hud-panel">
      <div className="hud-panel-header">
        <Users className="w-3 h-3" />
        <span>CONTATOS</span>
      </div>
      <div className="p-2">
        <button
          onClick={onOpenContacts}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 border border-primary/30 rounded text-xs text-primary hover:bg-primary/20 transition-colors"
        >
          <Users className="w-3 h-3" />
          Gerenciar Contatos
        </button>
      </div>
    </div>
  );
}
