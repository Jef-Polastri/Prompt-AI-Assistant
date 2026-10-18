'use client';

import { useState } from 'react';
import { 
  Send, ChevronDown, Loader2, LogOut, MessageSquare, Plus, Copy, Check, 
  Trash2, Database, PanelLeftClose, PanelLeft 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  // Estado para controlar a visibilidade / colapso da Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Demais estados do seu Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDbMenuOpen, setIsDbMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [dbType, setDbType] = useState('postgres');
  const [dbConfig, setDbConfig] = useState({ host: 'localhost', port: '5432', database: '', user: '', password: '' });
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex h-screen bg-[#000000] text-[#ececec] font-sans overflow-hidden select-none">

      {/* Sidebar estilo ChatGPT Dark (Com animação de transição de largura) */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64 border-r border-[#212121]' : 'w-0 border-r-0'
        } bg-[#171717] transition-all duration-300 ease-in-out hidden md:flex flex-col justify-between overflow-hidden relative z-20 shrink-0`}
      >
        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">

          {/* Topo da Sidebar: Botões de Ação Rápida */}
          <div className="flex items-center justify-between px-1 py-1 shrink-0">
            {/* Logo do Prompt */}
            <div className="flex items-center gap-2">
              <img
                src="/logos/LogoPrompt.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="font-mono font-medium text-base text-white tracking-tight">prompt</span>
            </div>

            {/* Botão de Encolher a Sidebar */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] rounded-lg transition cursor-pointer"
              title="Ocultar barra lateral"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Botão de Novo Chat (Estilo ChatGPT) */}
          <button
            onClick={() => {}}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-white hover:bg-[#212121] transition cursor-pointer border border-white/5"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-[#8e8e8e]" />
              <span>Novo chat</span>
            </div>
          </button>

          {/* Seção Dropdown do Banco de Dados */}
          <div className="bg-[#212121]/50 rounded-xl border border-white/5 overflow-hidden transition-all duration-200 shrink-0 mt-2">
            <button
              onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
              className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#212121] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8e8e8e]" />
                <span className="text-xs font-medium text-[#c5c5c5]">
                  Conexão do Banco
                </span>
              </div>

              <div className="flex items-center gap-2">
                {isConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado" />
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8e8e8e] transition-transform duration-200 ${isDbMenuOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Formulário Retrátil */}
            {isDbMenuOpen && (
              <form onSubmit={() => {}} className="p-3 pt-1 space-y-2 border-t border-white/5 mt-1">
                <div>
                  <label className="text-[10px] text-[#8e8e8e] block mb-1">SGBD</label>
                  <select
                    value={dbType}
                    onChange={(e) => setDbType(e.target.value)}
                    className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
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
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8e8e8e] block mb-1">Porta</label>
                    <input
                      type="text"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      className="w-full bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2f2f2f] hover:bg-[#383838] text-xs font-medium text-white py-2 rounded-lg transition cursor-pointer mt-1"
                >
                  Conectar SGBD
                </button>
              </form>
            )}
          </div>

          {/* Histórico de Conversas */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            <p className="px-2 py-1 text-[11px] font-semibold text-[#676767]">Hoje</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-[#b4b4b4] hover:bg-[#212121] hover:text-white transition cursor-pointer"
              >
                <span className="truncate pr-4">{session.title}</span>
                <Trash2 className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-red-400" />
              </div>
            ))}
          </div>

        </div>

        {/* Perfil no Rodapé da Sidebar */}
        <div className="p-3 border-t border-white/5 shrink-0">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#212121] transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#383838] text-white flex items-center justify-center text-xs font-bold shrink-0">
                U
              </div>
              <span className="text-xs font-medium text-white truncate">utilizador@sonar.ai</span>
            </div>
            <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
          </button>
        </div>
      </aside>

      {/* Área Principal do Chat (Preto Absoluto #000000) */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-[#000000]">

        {/* Modal de Trial Expirado */}
        {isTrialExpired && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md bg-[#171717] border border-white/10 p-8 rounded-2xl shadow-2xl space-y-4">
              <h2 className="text-xl font-semibold text-white">Seu período de teste encerrou</h2>
              <p className="text-sm text-[#b4b4b4]">Entre em contato para continuar navegando.</p>
              <a
                href="mailto:jefersonpollastri@gmail.com"
                className="inline-block w-full py-2.5 bg-white text-black hover:bg-[#e2e2e2] font-medium text-sm rounded-xl transition text-center"
              >
                Fazer Upgrade
              </a>
            </div>
          </div>
        )}

        {/* Header do Chat */}
        <header className="h-14 border-b border-[#212121] bg-[#000000] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Botão de Expandir a Sidebar quando ela estiver oculta */}
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-[#8e8e8e] hover:text-white hover:bg-[#212121] rounded-lg transition cursor-pointer"
                title="Mostrar barra lateral"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-1.5 font-medium text-base text-white cursor-pointer hover:bg-[#171717] px-2 py-1 rounded-lg transition">
              <span>ChatGPT</span>
              <ChevronDown className="w-4 h-4 text-[#8e8e8e]" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="mailto:jefersonpollastri@gmail.com"
              className="flex items-center gap-2 bg-[#212121] hover:bg-[#2f2f2f] text-white px-3 py-1.5 rounded-full text-xs font-medium transition border border-white/5"
            >
              <span>Período Experimental (7 dias)</span>
            </a>
          </div>
        </header>

        {/* Histórico de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-sans max-w-3xl w-full mx-auto">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Balão do Usuário (Sutil Cinza Escuro Arredondado) */}
              {msg.role === 'user' ? (
                <div className="bg-[#212121] text-[#ececec] px-4 py-2.5 rounded-3xl max-w-[85%] text-sm leading-relaxed shadow-sm">
                  {msg.content}
                </div>
              ) : (
                /* Resposta do Assistente (Sem Fundo, Limpo estilo ChatGPT) */
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

                  {/* Ações da Mensagem */}
                  <div className="flex items-center gap-2 pt-1 text-[#8e8e8e]">
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="p-1 hover:text-white rounded transition"
                      title="Copiar"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input Flutuante Inferior (Estilo ChatGPT Dark) */}
        <div className="p-4 bg-[#000000] shrink-0 w-full max-w-3xl mx-auto">
          <form className="relative bg-[#212121] rounded-3xl px-4 py-3 border border-white/5 focus-within:border-white/20 transition-all flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Faça uma pergunta sobre os dados..."
              rows={1}
              className="w-full bg-transparent text-sm text-white placeholder-[#8e8e8e] focus:outline-none resize-none max-h-36 pt-0.5"
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-white hover:bg-[#e2e2e2] text-black disabled:opacity-20 p-2 rounded-full transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-[#676767] text-center mt-2.5">
            O Prompt pode cometer erros. Verifique informações importantes.
          </p>
        </div>

      </main>
    </div>
  );
}