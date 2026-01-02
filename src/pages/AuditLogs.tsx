import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, RefreshCw, Search, Filter, Eye, Plus, Pencil, Trash2, Upload, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionIcons: Record<string, typeof Eye> = {
  view: Eye,
  create: Plus,
  update: Pencil,
  delete: Trash2,
  import: Upload,
  send_message: MessageSquare,
};

const actionLabels: Record<string, string> = {
  view: "Visualização",
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  import: "Importação",
  export: "Exportação",
  send_message: "Mensagem Enviada",
};

const tableLabels: Record<string, string> = {
  contacts: "Contatos",
  whatsapp_messages: "Mensagens WhatsApp",
  conversation_history: "Histórico de Conversa",
  daily_routines: "Rotinas Diárias",
};

const AuditLogs = () => {
  const { logs, loading, error, refetch } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details ?? {}).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesTable = tableFilter === "all" || log.table_name === tableFilter;

    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const uniqueTables = [...new Set(logs.map((l) => l.table_name))];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Logs de Auditoria</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {actionLabels[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as tabelas</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table}>
                  {tableLabels[table] || table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total de Logs</p>
            <p className="text-2xl font-bold text-primary">{logs.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Visualizações</p>
            <p className="text-2xl font-bold text-blue-500">
              {logs.filter((l) => l.action === "view").length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Modificações</p>
            <p className="text-2xl font-bold text-amber-500">
              {logs.filter((l) => ["create", "update", "delete"].includes(l.action)).length}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Importações</p>
            <p className="text-2xl font-bold text-emerald-500">
              {logs.filter((l) => l.action === "import").length}
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Logs List */}
        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum log encontrado.</p>
          </div>
        )}

        {!loading && filteredLogs.length > 0 && (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => {
              const IconComponent = actionIcons[log.action] || Eye;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-card rounded-lg border border-border p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {actionLabels[log.action] || log.action}
                        </span>
                        <span className="text-muted-foreground">em</span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-sm">
                          {tableLabels[log.table_name] || log.table_name}
                        </span>
                      </div>
                      {log.details && typeof log.details === 'object' && Object.keys(log.details as object).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(log.created_at), "PPpp", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditLogs;
