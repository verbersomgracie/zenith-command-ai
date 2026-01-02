import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Users, MessageSquare, Contact, Calendar, 
  FileText, ArrowLeft, RefreshCw, UserPlus, UserMinus,
  Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone_e164: string;
  user_id: string;
  source: string;
  created_at: string;
}

interface Message {
  id: string;
  from_number: string;
  to_number: string;
  body: string;
  direction: string;
  status: string;
  user_id: string;
  created_at: string;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  scheduled_time: string;
  days_of_week: number[];
  user_id: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  details: unknown;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    isAdmin, loading: adminLoading, users, usersLoading,
    fetchAllUsers, fetchAllContacts, fetchAllMessages, 
    fetchAllRoutines, fetchAllAuditLogs, fetchAllConversations,
    grantAdminRole, revokeAdminRole
  } = useAdmin();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin && !adminLoading) {
      fetchAllUsers();
      loadAllData();
    }
  }, [isAdmin, adminLoading]);

  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const [contactsRes, messagesRes, routinesRes, logsRes, convsRes] = await Promise.all([
        fetchAllContacts(),
        fetchAllMessages(),
        fetchAllRoutines(),
        fetchAllAuditLogs(),
        fetchAllConversations(),
      ]);
      setContacts(contactsRes);
      setMessages(messagesRes);
      setRoutines(routinesRes);
      setAuditLogs(logsRes);
      setConversations(convsRes);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  };

  const handleGrantAdmin = async (userId: string) => {
    const { error } = await grantAdminRole(userId);
    if (error) {
      toast({ title: "Erro ao conceder acesso admin", variant: "destructive" });
    } else {
      toast({ title: "Acesso admin concedido" });
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: "Você não pode remover seu próprio acesso", variant: "destructive" });
      return;
    }
    const { error } = await revokeAdminRole(userId);
    if (error) {
      toast({ title: "Erro ao revogar acesso admin", variant: "destructive" });
    } else {
      toast({ title: "Acesso admin revogado" });
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  const formatPhone = (phone: string) => {
    const clean = phone.replace("whatsapp:", "").replace(/\D/g, "");
    if (clean.length === 13) {
      return `(${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    return phone;
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
        <Button onClick={() => navigate("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Início
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Painel Administrativo
              </h1>
              <p className="text-muted-foreground">Gerencie usuários e visualize todos os dados</p>
            </div>
          </div>
          <Button onClick={loadAllData} disabled={dataLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Contact className="w-4 h-4" />
                Contatos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{contacts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{messages.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Rotinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{routines.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{auditLogs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid grid-cols-6 w-full max-w-2xl">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="contacts">Contatos</TabsTrigger>
            <TabsTrigger value="messages">Mensagens</TabsTrigger>
            <TabsTrigger value="routines">Rotinas</TabsTrigger>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Contatos</TableHead>
                          <TableHead>Mensagens</TableHead>
                          <TableHead>Rotinas</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-mono text-xs">
                              {u.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              {u.roles.map((role) => (
                                <Badge key={role} variant={role === "admin" ? "default" : "secondary"} className="mr-1">
                                  {role}
                                </Badge>
                              ))}
                              {u.roles.length === 0 && <Badge variant="outline">user</Badge>}
                            </TableCell>
                            <TableCell>{u.contacts_count}</TableCell>
                            <TableCell>{u.messages_count}</TableCell>
                            <TableCell>{u.routines_count}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {u.roles.includes("admin") ? (
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleRevokeAdmin(u.id)}
                                    disabled={u.id === user?.id}
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleGrantAdmin(u.id)}
                                  >
                                    <UserPlus className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Contatos</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{contact.name}</TableCell>
                          <TableCell>{formatPhone(contact.phone_e164)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{contact.source}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {contact.user_id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(contact.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens WhatsApp</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direção</TableHead>
                        <TableHead>De</TableHead>
                        <TableHead>Para</TableHead>
                        <TableHead>Mensagem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((msg) => (
                        <TableRow key={msg.id}>
                          <TableCell>
                            <Badge variant={msg.direction === "inbound" ? "secondary" : "default"}>
                              {msg.direction === "inbound" ? "Entrada" : "Saída"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatPhone(msg.from_number)}</TableCell>
                          <TableCell className="text-sm">{formatPhone(msg.to_number)}</TableCell>
                          <TableCell className="max-w-xs truncate">{msg.body}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{msg.status || "N/A"}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(msg.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routines Tab */}
          <TabsContent value="routines">
            <Card>
              <CardHeader>
                <CardTitle>Todas as Rotinas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Título</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Usuário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {routines.map((routine) => (
                        <TableRow key={routine.id}>
                          <TableCell className="font-medium">{routine.title}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground">
                            {routine.description || "-"}
                          </TableCell>
                          <TableCell>{routine.scheduled_time}</TableCell>
                          <TableCell>
                            {routine.days_of_week.map(d => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d]).join(", ")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {routine.user_id?.slice(0, 8)}...
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Conversas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Conteúdo</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversations.map((conv) => (
                        <TableRow key={conv.id}>
                          <TableCell>
                            <Badge variant={conv.role === "user" ? "default" : "secondary"}>
                              {conv.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{conv.content}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {conv.user_id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(conv.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ação</TableHead>
                        <TableHead>Tabela</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                          <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                            {log.details ? JSON.stringify(log.details) : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {log.user_id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(log.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Admin;
