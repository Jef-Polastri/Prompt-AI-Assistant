'use client';

import { useEffect, useState } from 'react';
import { Send, ChevronDown, Loader2, Settings2, LogOut, MessageSquare, Plus, Copy, Check, Trash2, Database } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

// 1. Função auxiliar para verificar se o teste de 7 dias expirou
const checkTrialExpired = (createdAtString: string) => {
  if (!createdAtString) return false;
  
  const createdAt = new Date(createdAtString);
  const now = new Date();
  
  // Diferença em milissegundos convertida para dias
  const diffTime = now.getTime() - createdAt.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays > 7; // Retorna true se passou de 7 dias
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou seu assistente de inteligência de negócios. Selecione o tipo de banco de dados e informe suas credenciais na barra lateral para começarmos a analisar os dados.'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Estado para controlar se o período de teste expirou
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  // Estados do Histórico e Sessão
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Estados para gerenciar a conexão dinâmica com o banco do cliente
  const [dbType, setDbType] = useState('postgres');
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: ''
  });
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [activeConnection, setActiveConnection] = useState<any>(null);

  // Buscar dados do usuário logado ao carregar a página
  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          window.location.href = '/login';
          return;
        }

        setUser(session.user);
        
        // Avalia se o período de 7 dias expirou com base na data de criação do usuário no Supabase
        if (session.user?.created_at) {
          const expired = checkTrialExpired(session.user.created_at);
          setIsTrialExpired(expired);
        }

        loadSessions(session.user.id);
      } catch (err) {
        window.location.href = '/login';
      } finally {
        setLoadingSession(false);
      }
    }

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = '/login';
      } else {
        setUser(session.user);
        if (session.user?.created_at) {
          const expired = checkTrialExpired(session.user.created_at);
          setIsTrialExpired(expired);
        }
        loadSessions(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Carregar lista de sessões de chat do usuário
  const loadSessions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  // Carregar mensagens de uma sessão específica ao clicar no histórico
  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        setMessages(data as Message[]);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar uma nova conversa limpa
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([
      {
        role: 'assistant',
        content: 'Nova consulta iniciada! Selecione ou confirme a conexão do banco para realizar sua pergunta.'
      }
    ]);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (!error) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error('Erro ao excluir chat:', err);
    }
  };

  // Função de Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Função para testar/salvar a conexão com o banco
  const handleConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isTrialExpired) return;
    setConnecting(true);

    const currentConnectionData = { type: dbType, ...dbConfig };

    try {
      const response = await fetch('/api/connect-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConnectionData)
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(true);
        setActiveConnection(currentConnectionData);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `✅ Conexão estabelecida com sucesso ao banco **${dbType.toUpperCase()}** (${dbConfig.database})! Já pode fazer suas perguntas.` }
        ]);
      } else {
        alert(`Erro ao conectar: ${data.error}`);
      }
    } catch (err) {
      alert('Não foi possível conectar ao servidor backend.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !isConnected || isTrialExpired) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    let currentSessionId = activeSessionId;

    try {
      if (!currentSessionId && user) {
        const titleSnippet = userMessage.length > 28 ? `${userMessage.substring(0, 28)}...` : userMessage;

        const { data: newSession, error: sessionErr } = await supabase
          .from('chat_sessions')
          .insert([
            {
              user_id: user.id,
              title: titleSnippet,
              database_connection_id: dbType
            }
          ])
          .select()
          .single();

        if (!sessionErr && newSession) {
          currentSessionId = newSession.id;
          setActiveSessionId(newSession.id);
          setSessions((prev) => [newSession, ...prev]);
        }
      }

      if (currentSessionId && user) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'user', content: userMessage }
        ]);
      }

      const response = await fetch('/api/connect-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          dbType,
          dbConfig,
          activeConnection
        })
      });

      const data = await response.json();
      const assistantReply = data.reply || data.message || 'Desculpe, tive um problema ao processar os dados.';

      if (currentSessionId && user) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'assistant', content: assistantReply }
        ]);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantReply }]);

    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro de conexão com o servidor backend do agente.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#131314] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <p className="text-xs text-slate-400 font-medium">Carregando ambiente seguro...</p>
        </div>
      </div>
    );
  }

  const userEmail = user?.email || 'utilizador@sonar.ai';
  const userInitial = userEmail.charAt(0).toUpperCase();

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
  <div className="flex h-screen bg-[#090710] text-[#e2e8f0] font-sans overflow-hidden selection:bg-purple-500 selection:text-white relative">
    
    {/* Glows Futuristas de Fundo (Efeitos Neon Desfocados) */}
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

    {/* Sidebar estilo Cyberpunk Dark Glass */}
    <aside className="w-72 border-r border-purple-900/30 bg-[#0d0b18]/80 backdrop-blur-xl p-3 hidden md:flex flex-col justify-between overflow-y-auto relative z-20">
      <div className="flex-1 flex flex-col min-h-0 space-y-3">

        {/* Logo e Nome */}
        <div className="flex items-center gap-3 px-2 py-2 shrink-0">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <div className="bg-[#0f0d1b] p-1.5 rounded-[10px]">
              <img
                src="/logos/LogoPrompt.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>
          <span className="font-mono font-bold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-purple-400">
            prompt
          </span>
        </div>

        {/* Seção Dropdown do Onboarding do Banco */}
        <div className="bg-[#120f24]/80 rounded-2xl border border-purple-500/20 overflow-hidden transition-all duration-200 shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <button
            onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-purple-900/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-purple-200 tracking-wider">
                Conexão do Banco
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" title="Conectado" />
              )}
              <ChevronDown
                className={`w-4 h-4 text-purple-300 transition-transform duration-200 ${isDbMenuOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {/* Conteúdo Retrátil */}
          {isDbMenuOpen && (
            <form onSubmit={handleConnectDb} className="p-3 pt-0 space-y-3 border-t border-purple-900/30 mt-1">
              <div className="pt-2">
                <label className="text-[11px] text-purple-300/70 block mb-1">Tipo de SGBD</label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value)}
                  className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                >
                  <option value="postgres">PostgreSQL / Supabase</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="oracle">Oracle Database</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] text-purple-300/70 block mb-1">Host</label>
                  <input
                    type="text"
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-purple-300/70 block mb-1">Porta</label>
                  <input
                    type="text"
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-purple-300/70 block mb-1">Nome do Banco / Schema</label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  placeholder="ex: empresa_db"
                  className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-purple-300/70 block mb-1">Usuário</label>
                <input
                  type="text"
                  value={dbConfig.user}
                  onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  placeholder="postgres"
                  className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-purple-300/70 block mb-1">Senha</label>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-[#0d0b18] border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={connecting || isTrialExpired}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-xs font-semibold text-white py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:opacity-50"
              >
                {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />}
                {isConnected ? 'Reconectar / Atualizar' : 'Testar & Conectar Banco'}
              </button>
            </form>
          )}
        </div>

        {/* Divisor */}
        <div className="border-t border-purple-900/30 my-2" />

        {/* SEÇÃO DE ÚLTIMOS PROMPTS / HISTÓRICO */}
        <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold tracking-wider text-purple-300/50 uppercase">
              Últimos Prompts
            </span>
            <button
              onClick={handleNewChat}
              title="Nova Consulta"
              className="p-1.5 hover:bg-purple-900/30 rounded-xl text-purple-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              <span>Novo chat</span>
            </button>
          </div>

          {/* Lista de sessões com rolagem */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {sessions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-purple-300/40 font-mono">
                Nenhuma consulta recente.
              </p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group relative flex items-center justify-between px-3 py-2 text-xs rounded-xl transition cursor-pointer ${
                    activeSessionId === session.id
                      ? 'bg-purple-900/40 border border-purple-500/30 text-white font-medium shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                      : 'text-purple-200/70 hover:bg-purple-900/20 hover:text-purple-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-6">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">{session.title}</span>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 rounded transition-all"
                    title="Excluir chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Rodapé: Perfil do Usuário Logado & Menu de Logout */}
      <div className="relative border-t border-purple-900/30 pt-3 shrink-0">

        {/* Menu Flutuante de Logout */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-0 w-full mb-2 bg-[#120f24] border border-purple-500/30 rounded-2xl p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-50 backdrop-blur-xl">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-purple-900/40 rounded-xl transition cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4 text-pink-400" />
              <span>Terminar Sessão (Logout)</span>
            </button>
          </div>
        )}

        {/* Botão do Perfil */}
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-purple-900/20 transition cursor-pointer text-left border border-transparent hover:border-purple-500/20"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-md">
              {userInitial}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{userEmail}</p>
              <p className="text-[10px] text-purple-300/60">Conectado via Supabase</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-purple-300 transition-transform duration-200 shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

    </aside>

    {/* Janela Principal do Chat */}
    <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#090710]/95 backdrop-blur-xl z-10">

      {/* MODAL DE BLOQUEIO / FIM DO PERÍODO DE TESTE */}
      {isTrialExpired && (
        <div className="absolute inset-0 z-50 bg-[#090710]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-[#120f24] border border-purple-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.2)] space-y-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              ⏳
            </div>
            <h2 className="text-xl font-bold text-white font-sans">
              Seu período de teste de 7 dias encerrou
            </h2>
            <p className="text-sm text-purple-200/70 leading-relaxed font-sans">
              Esperamos que tenha aproveitado os insights do seu banco de dados! Para continuar utilizando a plataforma e liberar consultas ilimitadas, entre em contato com nossa equipe.
            </p>
            <div className="pt-2">
              <a
                href="mailto:jefersonpollastri@gmail.com?subject=Renovacao%20de%20Acesso%20-%20SaaS"
                className="inline-block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.4)] text-center"
              >
                Entrar em Contato com a Empresa
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Header Superior estilo Cyberpunk */}
      <header className="h-14 border-b border-purple-900/30 bg-[#0d0b18]/80 px-6 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'}`} />
          <h1 className="font-semibold text-sm text-white">Chat Workspace</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge estilo "Upgrade" Neon */}
          <a
            href="mailto:jefersonpollastri@gmail.com?subject=Upgrade%20de%20Plano%20-%20SaaS"
            className="flex items-center gap-2 bg-purple-950/50 hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 px-3.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.2)]"
            title="Período experimental ativo"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>
              {isTrialExpired ? 'Teste Expirado (Fazer Upgrade)' : 'Período Experimental (7 dias)'}
            </span>
          </a>

          <span className="text-xs bg-[#120f24] text-purple-200/80 border border-purple-500/20 px-3 py-1 rounded-full font-medium hidden sm:inline-block">
            {isConnected ? `Conectado (${dbType.toUpperCase()})` : 'Aguardando Conexão'}
          </span>
        </div>
      </header>

      {/* Histórico de Mensagens */}
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-sans ${isTrialExpired ? 'pointer-events-none opacity-40 select-none' : ''}`}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`p-4 rounded-2xl text-[16px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 text-white rounded-br-none shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                  : 'bg-transparent text-slate-200 w-full'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <div className="relative group/msg w-full">
                  <div className="absolute top-0 right-0 z-10">
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 text-xs text-purple-300 hover:text-white bg-[#120f24] hover:bg-purple-900/60 p-2 rounded-lg transition-all border border-purple-500/30 cursor-pointer shadow-md"
                      title="Copiar resposta"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-sans text-[11px]">Copiado!</span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="relative group">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className="mb-5 text-[16px] leading-relaxed text-slate-200">{children}</p>
                        ),
                        hr: () => null,
                        ul: ({ children }) => (
                          <div className="space-y-3 mb-5 text-[16px]">{children}</div>
                        ),
                        li: ({ children }) => (
                          <div className="leading-relaxed text-[16px] text-slate-200">{children}</div>
                        ),
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <div className="my-6 overflow-hidden rounded-xl bg-[#0b0914] border border-purple-500/30 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
                              <div className="bg-[#141026] px-4 py-2 text-[10px] text-cyan-400 font-mono uppercase tracking-wider border-b border-purple-900/40 flex justify-between items-center">
                                <span>{match[1]}</span>
                              </div>
                              <pre className="p-4 overflow-x-auto text-xs text-slate-200 font-mono leading-relaxed">
                                <code>{String(children).replace(/\n$/, '')}</code>
                              </pre>
                            </div>
                          ) : (
                            <code className={`${className} bg-purple-950/80 text-cyan-300 border border-purple-500/30 px-1.5 py-0.5 rounded text-xs`} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-white shrink-0 mt-1 font-bold text-xs shadow-md">
                EU
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-4 max-w-3xl mx-auto justify-start">
            <div className="flex items-center space-x-1.5 w-fit p-4 bg-purple-950/20 border border-purple-500/20 rounded-2xl">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.2s]"></span>
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.1s]"></span>
              <span className="w-2 h-2 bg-pink-400 rounded-full animate-bounce [animation-duration:0.6s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Input Inferior Cyberpunk Flutuante */}
      <div className={`p-4 md:p-6 bg-[#090710]/80 backdrop-blur-md shrink-0 ${isTrialExpired ? 'pointer-events-none opacity-40 select-none' : ''}`}>
        <form onSubmit={handleSend} className="max-w-3xl mx-auto relative bg-[#120f24] rounded-3xl px-4 py-3 border border-purple-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)] focus-within:border-cyan-400 focus-within:shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !loading && isConnected && !isTrialExpired) {
                  handleSend(e as any);
                  e.currentTarget.style.height = 'auto';
                }
              }
            }}
            placeholder={isConnected ? "Faça uma pergunta sobre os dados..." : "Conecte um banco de dados na barra lateral primeiro..."}
            disabled={!isConnected || isTrialExpired}
            rows={1}
            className="w-full bg-transparent text-sm text-white placeholder-purple-300/40 focus:outline-none resize-none max-h-36 pr-12 pt-1 disabled:opacity-50 font-sans"
          />

          <div className="absolute right-3 bottom-2.5">
            <button
              type="submit"
              disabled={loading || !input.trim() || !isConnected || isTrialExpired}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white disabled:opacity-30 p-2.5 rounded-full transition flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="max-w-3xl mx-auto px-4 mt-2">
          <p className="text-[11px] text-purple-300/40 text-center">
            O agente utiliza conectores dinâmicos para ler e traduzir dados do SGBD selecionado.
          </p>
        </div>
      </div>
    </main>
  </div>
);
}