'use client';

import { useEffect, useState } from 'react';
import { 
  Send, ChevronDown, Loader2, LogOut, MessageSquare, Plus, Copy, Check, 
  Trash2, Database, PanelLeftClose, PanelLeft, Menu, X, AlertTriangle 
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import ReactMarkdown from 'react-markdown';
import PitiOrb from '../components/PitiOrb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

const checkTrialExpired = (createdAtString: string) => {
  if (!createdAtString) return false;
  const createdAt = new Date(createdAtString);
  const now = new Date();
  const diffTime = now.getTime() - createdAt.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays > 7;
};

export default function ChatPage() {
  // Estados de Controle de Layout (Desktop & Mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou o Piti 🤖. Selecione o tipo de banco de dados e informe suas credenciais na barra lateral para começarmos.'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  useEffect(() => {
    async function checkUser() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          window.location.href = '/login';
          return;
        }
        setUser(session.user);
        if (session.user?.created_at) {
          setIsTrialExpired(checkTrialExpired(session.user.created_at));
        }
        loadSessions(session.user.id);
      } catch (err) {
        window.location.href = '/login';
      } finally {
        setLoadingSession(false);
      }
    }
    checkUser();
  }, []);

  const loadSessions = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoading(true);
    setIsMobileMenuOpen(false);
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (data && data.length > 0) setMessages(data as Message[]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setIsMobileMenuOpen(false);
    setMessages([
      { role: 'assistant', content: 'Nova consulta iniciada! Faça uma pergunta sobre seus dados.' }
    ]);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) handleNewChat();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

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
      if (response.ok) {
        setIsConnected(true);
        setActiveConnection(currentConnectionData);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `✅ Conectado com sucesso ao banco **${dbType.toUpperCase()}** (${dbConfig.database})!` }
        ]);
        setIsMobileMenuOpen(false);
      } else {
        alert('Erro ao conectar ao banco.');
      }
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
        const { data: newSession } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: user.id, title: titleSnippet, database_connection_id: dbType }])
          .select()
          .single();
        if (newSession) {
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
        body: JSON.stringify({ prompt: userMessage, dbType, dbConfig, activeConnection })
      });
      const data = await response.json();
      const assistantReply = data.reply || data.message || 'Erro ao processar dados.';

      if (currentSessionId && user) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'assistant', content: assistantReply }
        ]);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: assistantReply }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (loadingSession) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#000000] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const userEmail = user?.email || 'utilizador@sonar.ai';

  return (
    <div className="flex h-screen bg-[#000000] text-[#ececec] font-sans overflow-hidden select-none relative">

      {/* 📱 BACKDROP MOBILE */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${isSidebarOpen ? 'md:w-64 md:border-r md:border-[#212121]' : 'md:w-0 md:border-r-0'}
          bg-[#171717] transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shrink-0 shadow-2xl md:shadow-none
        `}
      >
        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">
          
          {/* Topo da Sidebar */}
          <div className="flex items-center justify-between px-1 py-1 shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logos/LogoPrompt.png" alt="Logo" className="w-7 h-7 object-contain" />
              <span className="font-mono font-medium text-base text-white tracking-tight">prompt</span>
            </div>
            
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className="p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] rounded-lg transition cursor-pointer"
              title="Ocultar barra lateral"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Botão Novo Chat */}
          <button
            onClick={handleNewChat}
            disabled={isTrialExpired}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-[#212121] transition cursor-pointer border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#8e8e8e]" />
              <span>Novo chat</span>
            </div>
          </button>

          {/* Dropdown Conexão do Banco */}
          <div className="bg-[#212121]/50 rounded-xl border border-white/5 overflow-hidden transition-all duration-200 shrink-0 mt-2">
            <button
              onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#212121] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8e8e8e]" />
                <span className="text-xs font-medium text-[#c5c5c5]">Conexão do Banco</span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                <ChevronDown className={`w-3.5 h-3.5 text-[#8e8e8e] transition-transform ${isDbMenuOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isDbMenuOpen && (
              <form onSubmit={handleConnectDb} className="p-3 pt-1 space-y-2 border-t border-white/5 mt-1">
                <div>
                  <label className="text-[10px] text-[#8e8e8e] block mb-1">SGBD</label>
                  <select
                    value={dbType}
                    disabled={isTrialExpired}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                  >
                    <option value="postgres">PostgreSQL / Supabase</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlserver">SQL Server</option>
                    <option value="oracle">Oracle Database</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="col-span-2">
                    <label className="text-[10px] text-[#8e8e8e] block mb-1">Host</label>
                    <input
                      type="text"
                      disabled={isTrialExpired}
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8e8e8e] block mb-1">Porta</label>
                    <input
                      type="text"
                      disabled={isTrialExpired}
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#8e8e8e] block mb-1">Nome do Banco</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="ex: empresa_db"
                    className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8e8e8e] block mb-1">Usuário</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    placeholder="postgres"
                    className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8e8e8e] block mb-1">Senha</label>
                  <input
                    type="password"
                    disabled={isTrialExpired}
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none disabled:opacity-50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={connecting || isTrialExpired}
                  className="w-full bg-[#2f2f2f] hover:bg-[#383838] text-xs font-medium text-white py-2 rounded-lg transition cursor-pointer mt-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isConnected ? 'Reconectar' : 'Conectar SGBD'}
                </button>
              </form>
            )}
          </div>

          {/* Histórico */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            <p className="px-2 py-1 text-[11px] font-semibold text-[#676767]">Consultas Anteriores</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition cursor-pointer ${
                  activeSessionId === session.id ? 'bg-[#212121] text-white font-medium' : 'text-[#b4b4b4] hover:bg-[#212121] hover:text-white'
                }`}
              >
                <span className="truncate pr-4">{session.title}</span>
                <button onClick={(e) => handleDeleteSession(session.id, e)} className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

        </div>

        {/* Rodapé / Perfil */}
        <div className="p-3 border-t border-white/5 relative">
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#212121] border border-white/10 rounded-xl p-1.5 shadow-xl z-50">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-[#2f2f2f] rounded-lg transition">
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Terminar Sessão</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#212121] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#383838] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-white truncate">{userEmail}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#000000]">

        {/* Header Superior */}
        <header className="h-14 border-b border-[#212121] bg-[#000000] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] rounded-lg transition md:hidden cursor-pointer"
              title="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] rounded-lg transition hidden md:block cursor-pointer"
                title="Mostrar barra lateral"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-1.5 font-medium text-sm md:text-base text-white px-2 py-1">
              <span>Prompt BI Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${
              isTrialExpired 
                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                : 'bg-[#212121] text-white border-white/5'
            }`}>
              {isTrialExpired ? 'Trial Expirado' : 'Trial (7 dias)'}
            </span>
          </div>
        </header>

        {/* Histórico de Mensagens / Esfera Central */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-sans max-w-3xl w-full mx-auto flex flex-col justify-center items-center">
          
          {messages.length <= 1 ? (
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-8 my-auto w-full">
              
              {/* Esfera Animada OpenAI Style */}
              <PitiOrb isThinking={loading} />

              <h3 className="text-xl font-semibold text-white tracking-tight">
                Como posso ajudar com os seus dados hoje?
              </h3>
              <p className="text-xs text-[#8e8e8e] max-w-md">
                Selecione uma das sugestões abaixo ou faça qualquer pergunta sobre vendas, estoque e clientes em linguagem natural.
              </p>

              {/* Sugestões Rápidas do Piti com Trava de Trial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 w-full max-w-xl">
                {[
                  "📈 Qual foi o faturamento total deste mês?",
                  "📊 Liste os 5 produtos mais vendidos",
                  "⚠️ Clientes sem compras há mais de 60 dias",
                  "💵 Qual a média diária de vendas em 2026?"
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    disabled={isTrialExpired}
                    onClick={() => setInput(suggestion.replace(/^[\u2600-\u27BF\u1F300-\u1F9FF]\s*/, ''))}
                    className={`text-left p-3 rounded-2xl bg-[#171717] text-xs text-[#ececec] border border-white/5 transition cursor-pointer hover:border-white/20 ${
                      isTrialExpired ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#212121]'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-[#212121] text-[#ececec] px-4 py-2.5 rounded-3xl max-w-[85%] text-sm leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="w-full text-[#ececec] text-sm leading-relaxed space-y-3 pt-2">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-4 text-[#ececec] leading-relaxed text-[15px]">{children}</p>,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-4 overflow-hidden rounded-xl bg-[#171717] border border-white/10">
                                <div className="bg-[#212121] px-4 py-2 text-[11px] text-[#8e8e8e] font-mono uppercase flex justify-between items-center">
                                  <span>{match[1]}</span>
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs text-[#ececec] font-mono leading-relaxed">
                                  <code>{String(children).replace(/\n$/, '')}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className="bg-[#212121] text-amber-200 px-1.5 py-0.5 rounded text-xs" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      <div className="flex items-center gap-2 pt-1 text-[#8e8e8e]">
                        <button onClick={() => handleCopy(msg.content, index)} className="p-1 hover:text-white rounded transition" title="Copiar">
                          {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 items-center text-[#8e8e8e] p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Piti está analisando os dados...</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Input Inferior Dinâmico */}
        <div className="p-3 md:p-4 bg-[#000000] shrink-0 w-full max-w-3xl mx-auto">
          
          {/* BANNER DE ALERTA SE EXPIRADO */}
          {isTrialExpired && (
            <div className="p-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2 text-center">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400 font-medium">
                Seu período de teste de 7 dias expirou. Faça upgrade para continuar consultando os dados.
              </p>
            </div>
          )}

          <form onSubmit={handleSend} className="relative bg-[#212121] rounded-3xl px-4 py-3 border border-white/5 focus-within:border-white/20 transition-all flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 130)}px`;
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
              placeholder={
                isTrialExpired 
                  ? "Seu período de avaliação de 7 dias expirou." 
                  : isConnected 
                    ? "Pergunte ao Piti sobre os dados..." 
                    : "Conecte o SGBD na barra lateral primeiro..."
              }
              disabled={!isConnected || isTrialExpired}
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-[#8e8e8e] focus:outline-none resize-none max-h-36 pt-0.5 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading || !input.trim() || !isConnected || isTrialExpired}
              className="bg-white hover:bg-[#e2e2e2] text-black disabled:opacity-20 p-2 rounded-full transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] md:text-[11px] text-[#676767] text-center mt-2.5">
            O Prompt pode cometer erros. Verifique os dados importantes.
          </p>
        </div>

      </main>
    </div>
  );
}