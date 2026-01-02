import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, RefreshCw, Search, Filter, Eye, Plus, Pencil, Trash2, Upload, MessageSquare, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

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

const actionColors: Record<string, string> = {
  view: "hsl(217, 91%, 60%)",
  create: "hsl(142, 76%, 36%)",
  update: "hsl(38, 92%, 50%)",
  delete: "hsl(0, 84%, 60%)",
  import: "hsl(168, 76%, 42%)",
  send_message: "hsl(280, 87%, 65%)",
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

  // Generate timeline data for last 7 days
  const timelineData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= dayStart && logDate < dayEnd;
      });

      return {
        date: format(day, "dd/MM", { locale: ptBR }),
        fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        total: dayLogs.length,
        view: dayLogs.filter((l) => l.action === "view").length,
        create: dayLogs.filter((l) => l.action === "create").length,
        update: dayLogs.filter((l) => l.action === "update").length,
        delete: dayLogs.filter((l) => l.action === "delete").length,
        import: dayLogs.filter((l) => l.action === "import").length,
      };
    });
  }, [logs]);

  // Hourly activity for today
  const hourlyData = useMemo(() => {
    const today = startOfDay(new Date());
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return hours.map((hour) => {
      const hourStart = new Date(today);
      hourStart.setHours(hour);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hour + 1);

      const hourLogs = logs.filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= hourStart && logDate < hourEnd;
      });

      return {
        hour: `${hour.toString().padStart(2, "0")}h`,
        count: hourLogs.length,
      };
    });
  }, [logs]);

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

        {/* Timeline Charts */}
        {!loading && logs.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Weekly Activity */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Atividade nos Últimos 7 Dias</h3>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                      labelFormatter={(_, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullDate;
                        }
                        return "";
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#colorTotal)"
                      name="Total"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Activity Today */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Atividade Hoje por Hora</h3>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="hour"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      interval={2}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name="Eventos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity by Type */}
            <div className="bg-card rounded-lg border border-border p-4 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Atividade por Tipo (7 dias)</h3>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="view"
                      stackId="1"
                      stroke={actionColors.view}
                      fill={actionColors.view}
                      fillOpacity={0.6}
                      name="Visualização"
                    />
                    <Area
                      type="monotone"
                      dataKey="create"
                      stackId="1"
                      stroke={actionColors.create}
                      fill={actionColors.create}
                      fillOpacity={0.6}
                      name="Criação"
                    />
                    <Area
                      type="monotone"
                      dataKey="update"
                      stackId="1"
                      stroke={actionColors.update}
                      fill={actionColors.update}
                      fillOpacity={0.6}
                      name="Atualização"
                    />
                    <Area
                      type="monotone"
                      dataKey="delete"
                      stackId="1"
                      stroke={actionColors.delete}
                      fill={actionColors.delete}
                      fillOpacity={0.6}
                      name="Exclusão"
                    />
                    <Area
                      type="monotone"
                      dataKey="import"
                      stackId="1"
                      stroke={actionColors.import}
                      fill={actionColors.import}
                      fillOpacity={0.6}
                      name="Importação"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {Object.entries(actionLabels).slice(0, 5).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: actionColors[key] }}
                    />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
