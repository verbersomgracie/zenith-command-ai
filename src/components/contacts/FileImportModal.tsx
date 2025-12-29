import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, Upload, FileText, Loader2 } from "lucide-react";

interface FileImportModalProps {
  onImport: (contacts: Array<{ name: string; tel: string[] }>) => Promise<{ imported: number; skipped: number }>;
  onClose: () => void;
}

export default function FileImportModal({ onImport, onClose }: FileImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Array<{ name: string; tel: string[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): Array<{ name: string; tel: string[] }> => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error("Arquivo CSV vazio");
    }

    const firstLine = lines[0].toLowerCase();
    let nameIndex = 0;
    let phoneIndex = 1;
    let startLine = 0;

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
      const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      
      const name = parts[nameIndex] || "";
      const phone = parts[phoneIndex] || "";
      
      if (name && phone) {
        contacts.push({ name, tel: [phone] });
      }
    }

    return contacts;
  };

  const parseVCF = (text: string): Array<{ name: string; tel: string[] }> => {
    const contacts: Array<{ name: string; tel: string[] }> = [];
    
    // Split by vCard entries
    const vcards = text.split(/(?=BEGIN:VCARD)/i).filter(card => card.trim());
    
    for (const vcard of vcards) {
      const lines = vcard.split(/\r?\n/);
      let name = "";
      const phones: string[] = [];
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Parse FN (Formatted Name) - preferred
        if (trimmedLine.toUpperCase().startsWith("FN:") || trimmedLine.toUpperCase().startsWith("FN;")) {
          const fnValue = trimmedLine.replace(/^FN[;:][^:]*:/i, "").replace(/^FN:/i, "").trim();
          if (fnValue && !name) {
            name = fnValue;
          }
        }
        
        // Parse N (Name structure) as fallback
        if (trimmedLine.toUpperCase().startsWith("N:") || trimmedLine.toUpperCase().startsWith("N;")) {
          const nValue = trimmedLine.replace(/^N[;:][^:]*:/i, "").replace(/^N:/i, "").trim();
          if (nValue && !name) {
            // N format is: Last;First;Middle;Prefix;Suffix
            const nameParts = nValue.split(";").filter(p => p.trim());
            if (nameParts.length >= 2) {
              name = `${nameParts[1]} ${nameParts[0]}`.trim();
            } else if (nameParts.length === 1) {
              name = nameParts[0].trim();
            }
          }
        }
        
        // Parse TEL (phone numbers)
        if (trimmedLine.toUpperCase().startsWith("TEL:") || trimmedLine.toUpperCase().startsWith("TEL;")) {
          // Handle various TEL formats:
          // TEL:+55123456789
          // TEL;TYPE=CELL:+55123456789
          // TEL;VALUE=uri:tel:+55123456789
          let phoneValue = trimmedLine;
          
          // Remove TEL prefix and type info
          phoneValue = phoneValue.replace(/^TEL[;:][^:]*:/i, "").replace(/^TEL:/i, "");
          // Remove tel: URI prefix if present
          phoneValue = phoneValue.replace(/^tel:/i, "");
          // Clean up the number
          phoneValue = phoneValue.trim();
          
          if (phoneValue) {
            phones.push(phoneValue);
          }
        }
      }
      
      if (name && phones.length > 0) {
        contacts.push({ name, tel: phones });
      }
    }
    
    if (contacts.length === 0) {
      throw new Error("Nenhum contato válido encontrado no arquivo VCF");
    }
    
    return contacts;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const extension = file.name.toLowerCase().split('.').pop();
      
      let contacts: Array<{ name: string; tel: string[] }>;
      
      if (extension === 'vcf' || extension === 'vcard' || text.includes('BEGIN:VCARD')) {
        contacts = parseVCF(text);
      } else {
        contacts = parseCSV(text);
      }
      
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

  // Count total phone numbers
  const totalPhones = preview.reduce((acc, c) => acc + c.tel.length, 0);

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
          <h3 className="font-display text-primary">IMPORTAR ARQUIVO</h3>
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
              accept=".csv,.txt,.vcf,.vcard"
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
                  <span>Selecionar arquivo CSV ou VCF</span>
                </>
              )}
            </button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Suporta: CSV, VCF (vCard) — exportado do Google, iPhone, Android, etc.
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
                <span>{preview.length} contatos ({totalPhones} telefones)</span>
                {fileName && <span className="text-xs opacity-70">— {fileName}</span>}
              </div>
              <div className="flex-1 overflow-y-auto border border-primary/20 rounded p-2 space-y-1">
                {preview.slice(0, 15).map((c, i) => (
                  <div key={i} className="flex justify-between text-xs gap-2">
                    <span className="text-foreground truncate flex-1">{c.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {c.tel[0]}{c.tel.length > 1 && ` (+${c.tel.length - 1})`}
                    </span>
                  </div>
                ))}
                {preview.length > 15 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    ... e mais {preview.length - 15} contatos
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
