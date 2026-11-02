'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Send, ChevronDown, Loader2, LogOut, Plus, Copy, Check,
  Trash2, Database, PanelLeftClose, PanelLeft, Menu, X, AlertTriangle,
  Settings, Sun, Moon, FileSpreadsheet, FileText, Download, Volume2, Square, User
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';


interface FileData {
  type: 'excel' | 'pdf';
  filename: string;
  rows: any[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileData?: FileData;
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDbConfigModalOpen, setIsDbConfigModalOpen] = useState(false);

  const [userName, setUserName] = useState<string>('');
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [tempNameInput, setTempNameInput] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am Prompt. Configure your database connection in the Settings menu (gear icon) to get started.'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registrado com sucesso:', reg))
      .catch((err) => console.error('Erro ao registrar Service Worker:', err));
  }
}, []);

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

        const savedName = localStorage.getItem(`prompt_user_name_${session.user.id}`);
        if (savedName) {
          setUserName(savedName);
        } else {
          setIsNameModalOpen(true);
        }
      } catch (err) {
        window.location.href = '/login';
      } finally {
        setLoadingSession(false);
      }
    }
    checkUser();
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempNameInput.trim() || !user) return;
    localStorage.setItem(`prompt_user_name_${user.id}`, tempNameInput.trim());
    setUserName(tempNameInput.trim());
    setIsNameModalOpen(false);
  };

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
      { role: 'assistant', content: 'New query started! Ask me anything about your data.' }
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
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
          { role: 'assistant', content: `✅ Successfully connected to **${dbType.toUpperCase()}** (${dbConfig.database})!` }
        ]);
        setIsDbConfigModalOpen(false);
      } else {
        alert('Failed to connect to the database.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const processAndSendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading || !isConnected || isTrialExpired) return;

    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    let currentSessionId = activeSessionId;
    
    try {
      // 1. Se não existe uma sessão ativa, cria uma nova no Supabase e aguarda o ID
      if (!currentSessionId && user) {
        const titleSnippet = userMessage.length > 28 ? `${userMessage.substring(0, 28)}...` : userMessage;
        
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: user.id, title: titleSnippet, database_connection_id: dbType }])
          .select()
          .single();

        if (!sessionError && newSession) {
          currentSessionId = newSession.id;
          setActiveSessionId(newSession.id);
          setSessions((prev) => [newSession, ...prev]);
        }
      }

      // 2. Salva a mensagem do usuário na tabela chat_messages (incluindo user_id)
      if (currentSessionId && user) {
        const { error: msgUserError } = await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'user', content: userMessage }
        ]);
        if (msgUserError) console.error('Erro ao salvar msg do user:', msgUserError);
      }

      // 3. Chama a API de backend para processar os dados do banco
      const response = await fetch('/api/connect-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage, dbType, dbConfig, activeConnection })
      });
      
      const data = await response.json();
      
      const assistantReply = typeof data.reply === 'string' 
        ? data.reply 
        : (data.reply?.reply || data.message || 'Erro ao processar dados.');
        
      const fileData = data.fileData || data.reply?.fileData || null;

      const newAssistantMessage: Message = {
        role: 'assistant',
        content: assistantReply,
        fileData: fileData || undefined
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      setMessages((prev) => [...prev, { role: 'assistant', content: assistantReply }]);

      // 4. Salva a resposta do assistente na tabela chat_messages (incluindo user_id)
      if (currentSessionId && user) {
        const { error: msgAsstError } = await supabase.from('chat_messages').insert([
          { session_id: currentSessionId, user_id: user.id, role: 'assistant', content: assistantReply }
        ]);
        if (msgAsstError) console.error('Erro ao salvar msg do assistente:', msgAsstError);
      }

    } catch (err: any) {
      console.error('Erro detalhado ao processar mensagem:', err);
      setMessages((prev) => [
        ...prev, 
        { role: 'assistant', content: `❌ Erro no processamento: ${err.message || 'Erro interno desconhecido'}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    processAndSendMessage(input);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSpeech = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta síntese de voz.');
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.lang.includes('pt') && (v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('lucas') || v.name.toLowerCase().includes('google português do brasil') || v.name.toLowerCase().includes('male')));
    if (maleVoice) {
      utterance.voice = maleVoice;
    }

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const downloadExcel = (rows: any[], filename = 'prompt-ai-report.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(rows && rows.length > 0 ? rows : [{ Info: "No tabular data returned" }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, filename);
  };

  const downloadPDF = (content: string, filename = 'prompt-ai-report.pdf') => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.text("Prompt.ai - Executive Report", 14, 20);
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(content, 180);
    doc.text(splitText, 14, 35);
    doc.save(filename);
  };

  if (loadingSession) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center font-sans ${theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-[#ffffff] text-black'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const displayName = userName || user?.email?.split('@')[0] || 'User';
  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen font-sans overflow-hidden relative transition-colors duration-200 ${isDark ? 'bg-[#000000] text-[#ececec]' : 'bg-[#ffffff] text-[#0d0d0d]'}`}>

      {/* MODAL DE NOME DO USUÁRIO */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-sm border rounded-3xl p-6 shadow-2xl relative font-sans ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-neutral-400" />
              <h3 className="text-sm font-semibold">Como gostaria de ser chamado?</h3>
            </div>
            <p className={`text-xs mb-4 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-500'}`}>
              Insira seu nome para personalizar sua experiência no Prompt.ai.
            </p>
            <form onSubmit={handleSaveName} className="space-y-3">
              <input
                type="text"
                value={tempNameInput}
                onChange={(e) => setTempNameInput(e.target.value)}
                placeholder="Seu nome..."
                className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                required
                autoFocus
              />
              <button
                type="submit"
                className={`w-full text-xs font-medium py-2.5 rounded-xl transition cursor-pointer ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
              >
                Salvar e Continuar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÃO DE BANCO DE DADOS */}
      {isDbConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md border rounded-3xl p-6 shadow-2xl relative font-sans ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-neutral-400" />
                <h3 className="text-base font-semibold">Database Connection</h3>
              </div>
              <button
                onClick={() => setIsDbConfigModalOpen(false)}
                className={`p-1.5 rounded-full transition ${isDark ? 'hover:bg-[#212121] text-[#8e8e8e]' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectDb} className="space-y-3">
              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>DBMS</label>
                <select
                  value={dbType}
                  disabled={isTrialExpired}
                  onChange={(e) => setDbType(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                >
                  <option value="postgres">PostgreSQL / Supabase</option>
                  <option value="mysql">MySQL</option>
                  <option value="sqlserver">SQL Server</option>
                  <option value="oracle">Oracle Database</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>Host</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.host}
                    onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                    required
                  />
                </div>
                <div>
                  <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>Port</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.port}
                    onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>Database Name</label>
                <input
                  type="text"
                  disabled={isTrialExpired}
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  placeholder="e.g. company_db"
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>Username</label>
                <input
                  type="text"
                  disabled={isTrialExpired}
                  value={dbConfig.user}
                  onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                  placeholder="postgres"
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                  required
                />
              </div>

              <div>
                <label className={`text-xs block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-600'}`}>Password</label>
                <input
                  type="password"
                  disabled={isTrialExpired}
                  value={dbConfig.password}
                  onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#212121] border-white/10 text-white' : 'bg-gray-50 border-black/10 text-black'}`}
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={connecting || isTrialExpired}
                  className={`w-full text-xs font-medium py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                >
                  {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isConnected ? 'Reconnect Database' : 'Connect DBMS'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm" />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-40 font-sans
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        ${isSidebarOpen ? 'md:w-64 md:border-r' : 'md:w-0 md:border-r-0'}
        ${isDark ? 'bg-[#171717] border-[#212121]' : 'bg-[#f9f9f9] border-[#e5e5e5]'}
        transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shrink-0 shadow-2xl md:shadow-none
      `}>
        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">
          <div className="flex items-center justify-between px-1 py-1 shrink-0">
            <span className={`font-mono font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
              Prompt.ai
            </span>
            <button
              onClick={() => { setIsSidebarOpen(false); setIsMobileMenuOpen(false); }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#e5e5e5]'}`}
              title="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleNewChat}
            disabled={isTrialExpired}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer border ${isDark ? 'text-white border-white/5 hover:bg-[#212121]' : 'text-black border-black/5 hover:bg-[#ececec]'}`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className={`w-4 h-4 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
              <span>New chat</span>
            </div>
          </button>

          {/* History */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            <p className={`px-2 py-1 text-[11px] font-semibold ${isDark ? 'text-[#676767]' : 'text-[#8e8e8e]'}`}>Recent Queries</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition cursor-pointer ${activeSessionId === session.id ? (isDark ? 'bg-[#212121] text-white font-medium' : 'bg-[#e5e5e5] text-black font-medium') : (isDark ? 'text-[#b4b4b4] hover:bg-[#212121] hover:text-white' : 'text-[#555555] hover:bg-[#eaeaea] hover:text-black')}`}
              >
                <span className="truncate pr-4">{session.title}</span>
                <button onClick={(e) => handleDeleteSession(session.id, e)} className="opacity-0 group-hover:opacity-100 text-[#8e8e8e] hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* User Footer */}
        <div className={`p-3 border-t relative font-sans ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {isUserMenuOpen && (
            <div className={`absolute bottom-full left-3 right-3 mb-2 border rounded-xl p-1.5 shadow-xl z-50 ${isDark ? 'bg-[#212121] border-white/10' : 'bg-white border-black/10'}`}>
              <button onClick={handleLogout} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition ${isDark ? 'text-white hover:bg-[#2f2f2f]' : 'text-black hover:bg-[#f0f0f0]'}`}>
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Log out</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-left ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-[#eaeaea]'}`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-[#383838] text-white' : 'bg-[#d0d0d0] text-black'}`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-black'}`}>{displayName}</span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`relative flex-1 flex flex-col h-full overflow-hidden font-sans ${isDark ? 'bg-[#000000]' : 'bg-[#ffffff]'}`}>

        {/* Header */}
        <header className={`h-14 border-b px-4 flex items-center justify-between shrink-0 ${isDark ? 'border-[#212121] bg-[#000000]' : 'border-[#e5e5e5] bg-[#ffffff]'}`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-1.5 rounded-lg transition md:hidden cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#f0f0f0]'}`}
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`p-1.5 rounded-lg transition hidden md:block cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#f0f0f0]'}`}
                title="Show sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            <div className={`flex items-center gap-2 font-medium text-sm md:text-base px-2 py-1 ${isDark ? 'text-white' : 'text-black'}`}>
              <span>Chat</span>
              {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Database Connected" />}
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <a
              href="mailto:jefersonpollastri@gmail.com?subject=Prompt.ai%20-%20Support"
              className={`hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer hover:opacity-80 ${isTrialExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : (isDark ? 'bg-[#212121] text-white border-white/5' : 'bg-[#f0f0f0] text-black border-black/5')}`}
            >
              {isTrialExpired ? 'Trial Expired' : 'Trial (7 days)'}
            </a>

            {/* Ícones da engrenagem em preto e branco */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-full transition cursor-pointer ${isDark ? 'text-white hover:bg-[#212121]' : 'text-black hover:bg-[#f0f0f0]'}`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className={`absolute right-0 mt-2 w-52 border rounded-2xl p-2 shadow-2xl z-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'}`}>
                  <button
                    onClick={() => { setIsDbConfigModalOpen(true); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-gray-100'}`}
                  >
                    <Database className="w-4 h-4 text-neutral-400" />
                    <span>Database Connection</span>
                  </button>

                  <div className={`h-[1px] my-1 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

                  <p className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 ${isDark ? 'text-[#8e8e8e]' : 'text-gray-400'}`}>
                    Appearance
                  </p>

                  <button
                    onClick={() => { setTheme('dark'); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${isDark ? 'bg-[#212121] font-semibold text-white' : 'hover:bg-gray-100 text-black'}`}
                  >
                    <div className="flex items-center gap-2"><Moon className="w-4 h-4 text-neutral-400" /><span>Dark Mode</span></div>
                    {isDark && <Check className="w-3.5 h-3.5 text-neutral-400" />}
                  </button>

                  <button
                    onClick={() => { setTheme('light'); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer mt-1 ${!isDark ? 'bg-gray-100 font-semibold text-black' : 'hover:bg-[#212121] text-white'}`}
                  >
                    <div className="flex items-center gap-2"><Sun className="w-4 h-4 text-neutral-600" /><span>Light Mode</span></div>
                    {!isDark && <Check className="w-3.5 h-3.5 text-neutral-800" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Center Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 font-sans w-full flex flex-col items-center">
          <div className="max-w-3xl w-full flex flex-col justify-center items-center flex-1">
            {messages.length <= 1 ? (
              <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 my-auto w-full">
                <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-[#0d0d0d]'}`}>
                  Ready when you are.
                </h2>
                <p className={`text-xs max-w-md ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>
                  Configure your database in settings and ask any question about your data.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 w-full max-w-xl">
                  {[
                    "📈 What was the total revenue this month?",
                    "📊 List the top 5 best-selling products",
                    "⚠️ Customers with no purchases in 60+ days",
                    "💵 What is the average daily sales in 2026?"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      disabled={isTrialExpired || !isConnected}
                      onClick={() => processAndSendMessage(suggestion.replace(/^[\u2600-\u27BF\u1F300-\u1F9FF]\s*/, ''))}
                      className={`text-left p-3.5 rounded-2xl text-xs border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-[#171717] text-[#ececec] border-white/5 hover:bg-[#212121]' : 'bg-[#f9f9f9] text-[#0d0d0d] border-black/5 hover:bg-[#f0f0f0]'}`}
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
                      /* Mensagem do usuário com suporte a seleção de texto (select-text), fonte mono levemente menor e botão de copiar abaixo */
                      <div className="flex flex-col items-end group/usermsg">
                        <div className={`px-4 py-2.5 rounded-3xl max-w-[85%] text-xs sm:text-sm font-mono select-text leading-relaxed shadow-sm ${isDark ? 'bg-[#212121] text-[#ececec]' : 'bg-[#f0f0f0] text-[#0d0d0d]'}`}>
                          {msg.content}
                        </div>
                        <div className={`flex items-center gap-1 pt-1 opacity-0 group-hover/usermsg:opacity-100 transition-opacity ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>
                          <button 
                            onClick={() => handleCopy(msg.content, index)} 
                            className={`p-1.5 rounded-lg transition hover:opacity-80 ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-gray-100'}`} 
                            title="Copy"
                          >
                            {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-neutral-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Mensagem do assistente com seleção de texto (select-text) e fonte mono levemente menor */
                      <div className={`w-full text-xs sm:text-sm font-mono select-text leading-relaxed space-y-3 pt-2 ${isDark ? 'text-[#ececec]' : 'text-[#0d0d0d]'}`}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>

                        {/* CARD DE DOWNLOAD EXCEL / PDF */}
                        {msg.fileData && msg.fileData.rows && msg.fileData.rows.length > 0 && (
                          <div className={`mt-3 p-3.5 rounded-2xl border flex items-center justify-between max-w-sm transition ${isDark ? 'bg-[#171717] border-white/10 hover:bg-[#212121]' : 'bg-gray-50 border-black/10 hover:bg-gray-100'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${msg.fileData.type === 'excel' ? 'bg-neutral-500/10 text-neutral-300 border border-neutral-500/20' : 'bg-neutral-500/10 text-neutral-300 border border-neutral-500/20'}`}>
                                {msg.fileData.type === 'excel' ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                              </div>
                              <div className="overflow-hidden">
                                <p className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-black'}`}>
                                  {msg.fileData.filename}
                                </p>
                                <p className={`text-[10px] ${isDark ? 'text-[#8e8e8e]' : 'text-gray-500'}`}>
                                  Ready to download ({msg.fileData.rows.length} rows)
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (msg.fileData?.type === 'excel') {
                                  downloadExcel(msg.fileData.rows, msg.fileData.filename);
                                } else {
                                  downloadPDF(msg.content, msg.fileData?.filename || 'report.pdf');
                                }
                              }}
                              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                          </div>
                        )}

                        {/* Botões de Ação do Assistente (Copy e Áudio em P&B) */}
                        <div className={`flex items-center gap-2 pt-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>
                          <button 
                            onClick={() => handleCopy(msg.content, index)} 
                            className={`p-1.5 rounded-lg transition hover:opacity-80 ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-gray-100'}`} 
                            title="Copy"
                          >
                            {copiedIndex === index ? <Check className="w-4 h-4 text-neutral-400" /> : <Copy className="w-4 h-4" />}
                          </button>

                          <button 
                            onClick={() => toggleSpeech(msg.content, index)} 
                            className={`p-1.5 rounded-lg transition hover:opacity-80 ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-gray-100'}`} 
                            title={speakingIndex === index ? "Parar áudio" : "Ouvir áudio"}
                          >
                            {speakingIndex === index ? <Square className="w-4 h-4 text-neutral-400 fill-current" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading com _ piscando */}
                {loading && (
                  <div className={`flex items-center p-2 font-mono text-xl ${isDark ? 'text-white' : 'text-black'}`}>
                    <span className="animate-[pulse_0.4s_cubic-bezier(0.4,0,0.6,1)_infinite]">_</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className={`p-3 md:p-4 shrink-0 w-full max-w-3xl mx-auto font-sans ${isDark ? 'bg-[#000000]' : 'bg-[#ffffff]'}`}>
          <form onSubmit={handleSend} className={`relative rounded-3xl px-4 py-3 border transition-all flex items-end gap-2 ${isDark ? 'bg-[#212121] border-white/5 focus-within:border-white/20' : 'bg-[#f4f4f4] border-black/5 focus-within:border-black/20 shadow-sm'}`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Ask anything about your database..."
              rows={1}
              className={`w-full bg-transparent text-xs sm:text-sm font-mono focus:outline-none resize-none max-h-40 py-1 ${isDark ? 'text-white placeholder-[#8e8e8e]' : 'text-black placeholder-[#676767]'}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !isConnected || isTrialExpired}
              className={`p-2 rounded-full transition cursor-pointer mb-0.5 disabled:opacity-30 disabled:cursor-not-allowed ${isDark ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className={`text-[10px] md:text-[11px] text-center mt-2.5 ${isDark ? 'text-[#676767]' : 'text-[#8e8e8e]'}`}>
            Prompt.ai can make mistakes. Verify important data.
          </p>
        </div>
      </main>
    </div>
  );
}