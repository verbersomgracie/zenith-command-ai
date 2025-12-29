import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Upload, FileText, Loader2 } from "lucide-react";

interface CsvImportModalProps {
  onImport: (contacts: Array<{ name: string; tel: string[] }>) => Promise<{ imported: number; skipped: number }>;
  onClose: () => void;
}

export default function CsvImportModal({ onImport, onClose }: CsvImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Array<{ name: string; tel: string[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error("Arquivo CSV vazio");
    }

    // Try to detect the header
    const firstLine = lines[0].toLowerCase();
    let nameIndex = 0;
    let phoneIndex = 1;
    let startLine = 0;

    // Check if first line is a header
    if (firstLine.includes("nome") || firstLine.includes("name") || 
        firstLine.includes("telefone") || firstLine.includes("phone") || 
        firstLine.includes("tel")) {
      const headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
      nameIndex = headers.findIndex(h => h.includes("nome") || h.includes("name"));
      phoneIndex = headers.findIndex(h => h.includes("telefone") || h.includes("phone") || h.includes("tel"));
      
      if (nameIndex === -1) nameIndex = 0;
      if (phoneIndex === -1) phoneIndex = 1;
      startLine = 1;
    }

    const contacts: Array<{ name: string; tel: string[] }> = [];
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      // Split by comma, semicolon, or tab
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      const name = parts[nameIndex] || "";
      const phone = parts[phoneIndex] || "";
      
      if (name && phone) {
        contacts.push({ name, tel: [phone] });
      }
    }

    return contacts;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const contacts = parseCSV(text);
      
      if (contacts.length === 0) {
        throw new Error("Nenhum contato válido encontrado no arquivo");
      }

      setPreview(contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo");
      setPreview([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setIsProcessing(true);
    try {
      await onImport(preview);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar contatos");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="bg-card border border-primary/30 rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-primary">IMPORTAR CSV</h3>
          <button onClick={onClose} className="p-1 hover:bg-primary/10 rounded">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-primary/30 rounded-lg text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
            >
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span>Selecionar arquivo CSV</span>
                </>
              )}
            </button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Formato: Nome, Telefone (separado por vírgula, ponto-e-vírgula ou tab)
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                <span>{preview.length} contatos encontrados</span>
              </div>
              <div className="flex-1 overflow-y-auto border border-primary/20 rounded p-2 space-y-1">
                {preview.slice(0, 10).map((c, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-foreground truncate">{c.name}</span>
                    <span className="text-muted-foreground">{c.tel[0]}</span>
                  </div>
                ))}
                {preview.length > 10 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    ... e mais {preview.length - 10} contatos
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-primary/30 rounded text-sm text-muted-foreground hover:bg-primary/10"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={isProcessing || preview.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary/20 border border-primary/50 rounded text-sm text-primary hover:bg-primary/30 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
