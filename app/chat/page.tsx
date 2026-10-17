'use client';

import { useEffect, useState } from 'react';
import { Send, ChevronDown, Loader2, Settings2, LogOut, MessageSquare, Plus, Copy, Check, Trash2 } from 'lucide-react';
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
    e.stopPropagation(); // Evita que clique na lixeira e abra o chat ao mesmo tempo

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (!error) {
        // Remove da lista local
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // Se o chat excluído era o ativo, limpa a tela
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
    if (!input.trim() || loading || !isConnected) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    let currentSessionId = activeSessionId;

    try {
      // 1. Criar nova sessão no Supabase se não houver uma ativa
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

      // 2. Salvar mensagem do usuário no banco
      if (currentSessionId && user) {
        await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'user', content: userMessage }
        ]);
      }

      // 3. Chamada para a API do Backend da IA (utilizando a rota local /api/connect-db ou /api/chat)
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

      // 4. Salvar resposta da IA no banco
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
    setTimeout(() => setCopiedIndex(null), 2000); // Reseta o ícone após 2 segundos
  };

  return (
    <div className="flex h-screen bg-[#131314] text-slate-100 font-sans">

      {/* Sidebar estilo Gemini Dark */}
      <aside className="w-72 border-r border-[#2d2f31] bg-[#1e1f20] p-3 hidden md:flex flex-col justify-between overflow-y-auto">
        <div className="flex-1 flex flex-col min-h-0 space-y-3">

          {/* Logo e Nome */}
          <div className="flex items-center px-2 py-2 shrink-0">
            <img
              src="/logos/LogoPrompt.png"
              alt="Logo"
              className="w-10 h-10 object-contain gap-2"
            />
            <span className="font-mono font-light text-lg tracking-tight text-white">prompt</span>
          </div>

          {/* Seção Dropdown do Onboarding do Banco */}
          <div className="bg-[#131314] rounded-2xl border border-[#2d2f31] overflow-hidden transition-all duration-200 shrink-0">
            <button
              onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-[#282a2c] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-300" />
                <span className="text-xs font-semibold text-slate-200 tracking-wider">
                  Conexão do Banco
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado" />
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDbMenuOpen ? 'rotate-180' : ''
                    }`}
                />
              </div>
            </button>

            {/* Conteúdo Retrátil */}
            {isDbMenuOpen && (
              <form onSubmit={handleConnectDb} className="p-3 pt-0 space-y-3 border-t border-[#2d2f31] mt-1">
                <div className="pt-2">
                  <label className="text-[11px] text-slate-400 block mb-1">Tipo de SGBD</label>
                  <select
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                  >
                    <option value="postgres">PostgreSQL / Supabase</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlserver">SQL Server</option>
                    <option value="oracle">Oracle Database</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Host</label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Porta</label>
                    <input
                      type="text"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Nome do Banco / Schema</label>
                  <input
                    type="text"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="ex: empresa_db"
                    className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Usuário</label>
                  <input
                    type="text"
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    placeholder="postgres"
                    className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Senha</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-[#1e1f20] border border-[#3c3f42] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-slate-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={connecting}
                  className="w-full bg-white hover:bg-slate-200 text-xs font-medium text-slate-900 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-sm disabled:opacity-50"
                >
                  {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />}
                  {isConnected ? 'Reconectar / Atualizar' : 'Testar & Conectar Banco'}
                </button>
              </form>
            )}
          </div>

          {/* Divisor */}
          <div className="border-t border-[#2d2f31] my-2" />

          {/* SEÇÃO DE ÚLTIMOS PROMPTS / HISTÓRICO */}
          <div className="flex-1 flex flex-col min-h-0 space-y-2 overflow-hidden">
            <div className="flex items-center justify-between px-2">
              <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                Últimos Prompts
              </span>
              <button
                onClick={handleNewChat}
                title="Nova Consulta"
                className="p-1.5 hover:bg-[#282a2c] rounded-xl text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo</span>
              </button>
            </div>

            {/* Lista de sessões com rolagem */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {sessions.length === 0 ? (
                <p className="px-2 py-2 text-xs text-slate-600 font-mono">
                  Nenhuma consulta recente.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group relative flex items-center justify-between px-3 py-2 text-xs rounded-xl transition cursor-pointer ${activeSessionId === session.id
                      ? 'bg-[#282a2c] text-white font-medium'
                      : 'text-slate-400 hover:bg-[#282a2c]/60 hover:text-slate-200'
                      }`}
                  >
                    <div className="flex items-center gap-2.5 truncate pr-6">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                      <span className="truncate">{session.title}</span>
                    </div>

                    {/* Ícone de lixeira que aparece ao passar o mouse */}
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
        <div className="relative border-t border-[#2d2f31] pt-3 shrink-0">

          {/* Menu Flutuante de Logout */}
          {isUserMenuOpen && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#282a2c] border border-[#3c3f42] rounded-2xl p-1.5 shadow-lg z-50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-white hover:bg-[#35383b] rounded-xl transition cursor-pointer font-medium"
              >
                <LogOut className="w-4 h-4 text-white" />
                <span className="text-white">Terminar Sessão (Logout)</span>
              </button>
            </div>
          )}

          {/* Botão do Perfil */}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-[#282a2c] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-200 truncate">{userEmail}</p>
                <p className="text-[10px] text-slate-400">Conectado via Supabase</p>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

      </aside>

      {/* Janela Principal do Chat */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#131314]">

        {/* Header Superior */}
        <header className="h-14 border-b border-[#2d2f31] bg-[#131314] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <h1 className="font-medium text-sm text-slate-200">Chat</h1>
          </div>
          <span className="text-xs bg-[#1e1f20] text-slate-300 border border-[#2d2f31] px-3 py-1 rounded-full font-medium">
            {isConnected ? `Conectado (${dbType.toUpperCase()})` : 'Aguardando Conexão'}
          </span>
        </header>
        {/* Histórico de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-mono">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                  ? 'bg-[#282a2c] text-slate-100 rounded-br-none shadow-sm'
                  : 'bg-transparent text-slate-200 w-full'
                  }`}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <div className="relative group/msg w-full">
                    {/* 1. Botão de Copiar no topo (Canto Superior Direito) */}
                    <div className="absolute top-0 right-0 z-10">
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-[#1e1f20]/90 hover:bg-neutral-800 p-2 rounded-lg transition-all border border-neutral-700/50 cursor-pointer shadow-md"
                        title="Copiar resposta"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 font-sans text-[11px]">Copiado!</span>
                          </>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <div className="relative group">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                          hr: () => null,
                          ul: ({ children }) => <div className="space-y-2 mb-3">{children}</div>,
                          li: ({ children }) => <div className="leading-relaxed">{children}</div>,
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-3 overflow-hidden rounded-xl bg-[#1e1e1e] border border-neutral-800">
                                <div className="bg-[#2d2d2d] px-4 py-1.5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider border-b border-neutral-800 flex justify-between items-center">
                                  <span>{match[1]}</span>
                                </div>
                                <pre className="p-4 overflow-x-auto text-xs text-slate-200 font-mono leading-relaxed">
                                  <code>{String(children).replace(/\n$/, '')}</code>
                                </pre>
                              </div>
                            ) : (
                              <code className={`${className} bg-neutral-800 text-amber-300 px-1.5 py-0.5 rounded text-xs`} {...props}>
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
                  <div className="w-10 h-10 rounded-full bg-[#282a2c] flex items-center justify-center text-slate-300 shrink-0 mt-1 font-medium text-xs font-mono">
                    EU
                  </div>
                )}
              </div>
          ))}
              {/* Indicador de Carregamento (Loading) */}
              {loading && (
                <div className="flex gap-4 max-w-3xl mx-auto justify-start">
                  <div className="flex items-center space-x-1.5 w-fit p-4">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:-0.1s]"></span>
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-duration:0.6s]"></span>
                  </div>
                </div>
              )}
            </div>

        {/* Barra de Input Inferior estilo Gemini Dark */ }
            < div className = "p-4 md:p-6 bg-[#131314] shrink-0" >
          <form onSubmit={handleSend} className="max-w-3xl mx-auto relative bg-[#1e1f20] rounded-3xl px-4 py-3 border border-[#2d2f31]/50">
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
                  if (input.trim() && !loading && isConnected) {
                    handleSend(e as any);
                    e.currentTarget.style.height = 'auto';
                  }
                }
              }}
              placeholder={isConnected ? "Faça uma pergunta sobre os dados..." : "Conecte um banco de dados na barra lateral primeiro..."}
              disabled={!isConnected}
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none resize-none max-h-36 pr-12 pt-1 disabled:opacity-50"
            />

            {/* Botão de Envio integrado */}
            <div className="absolute right-3 bottom-2.5">
              <button
                type="submit"
                disabled={loading || !input.trim() || !isConnected}
                className="bg-white hover:bg-slate-200 text-slate-900 disabled:opacity-30 p-2 rounded-3xl transition flex items-center justify-center shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="max-w-3xl mx-auto px-4 mt-2">
            <p className="text-[11px] text-slate-500 text-center">
              O agente utiliza conectores dinâmicos para ler e traduzir dados do SGBD selecionado.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
