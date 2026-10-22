'use client';

import { useEffect, useState } from 'react';
import {
  Send, ChevronDown, Loader2, LogOut, MessageSquare, Plus, Copy, Check,
  Trash2, Database, PanelLeftClose, PanelLeft, Menu, X, AlertTriangle,
  Settings, Sun, Moon, Mic, MicOff, Volume2
} from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am Piti 🤖. Select your database type and provide your credentials in the sidebar to get started.'
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
        setIsMobileMenuOpen(false);
      } else {
        alert('Failed to connect to the database.');
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
      const assistantReply = data.reply || data.message || 'Error processing data.';

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

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Your browser does not support voice recognition.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  if (loadingSession) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center ${theme === 'dark' ? 'bg-[#000000] text-white' : 'bg-[#ffffff] text-black'}`}>
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const userEmail = user?.email || 'user@sonar.ai';
  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen font-sans overflow-hidden select-none relative transition-colors duration-200 ${isDark ? 'bg-[#000000] text-[#ececec]' : 'bg-[#ffffff] text-[#0d0d0d]'
      }`}>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
          ${isSidebarOpen ? 'md:w-64 md:border-r' : 'md:w-0 md:border-r-0'}
          ${isDark
            ? 'bg-[#171717] border-[#212121]'
            : 'bg-[#f9f9f9] border-[#e5e5e5]'
          }
          transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden shrink-0 shadow-2xl md:shadow-none
        `}
      >
        <div className="p-3 flex-1 flex flex-col min-h-0 space-y-2">

          <div className="flex items-center justify-between px-1 py-1 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`font-mono font-semibold text-base tracking-tight ${isDark ? 'text-white' : 'text-black'}`}>
                Prompt
              </span>
            </div>

            <button
              onClick={() => {
                setIsSidebarOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#e5e5e5]'
                }`}
              title="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            disabled={isTrialExpired}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition cursor-pointer border ${isDark
                ? 'text-white border-white/5 hover:bg-[#212121]'
                : 'text-black border-black/5 hover:bg-[#ececec]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className={`w-4 h-4 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
              <span>New chat</span>
            </div>
          </button>

          {/* Database Connection */}
          <div className={`rounded-xl border overflow-hidden transition-all duration-200 shrink-0 mt-2 ${isDark ? 'bg-[#212121]/50 border-white/5' : 'bg-[#f0f0f0] border-black/5'
            }`}>
            <button
              onClick={() => setIsDbMenuOpen(!isDbMenuOpen)}
              className={`w-full flex items-center justify-between p-2.5 text-left transition cursor-pointer ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-[#e5e5e5]'
                }`}
            >
              <div className="flex items-center gap-2">
                <Database className={`w-4 h-4 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
                <span className={`text-xs font-medium ${isDark ? 'text-[#c5c5c5]' : 'text-[#424242]'}`}>Database Connection</span>
              </div>
              <div className="flex items-center gap-2">
                {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDbMenuOpen ? 'rotate-180' : ''} ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
              </div>
            </button>

            {isDbMenuOpen && (
              <form onSubmit={handleConnectDb} className={`p-3 pt-1 space-y-2 border-t mt-1 ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                <div>
                  <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>DBMS</label>
                  <select
                    value={dbType}
                    disabled={isTrialExpired}
                    onChange={(e) => setDbType(e.target.value)}
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                      }`}
                  >
                    <option value="postgres">PostgreSQL / Supabase</option>
                    <option value="mysql">MySQL</option>
                    <option value="sqlserver">SQL Server</option>
                    <option value="oracle">Oracle Database</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="col-span-2">
                    <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>Host</label>
                    <input
                      type="text"
                      disabled={isTrialExpired}
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                        }`}
                      required
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>Port</label>
                    <input
                      type="text"
                      disabled={isTrialExpired}
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                        }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>Database Name</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="e.g. company_db"
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                      }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>Username</label>
                  <input
                    type="text"
                    disabled={isTrialExpired}
                    value={dbConfig.user}
                    onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                    placeholder="postgres"
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                      }`}
                    required
                  />
                </div>

                <div>
                  <label className={`text-[10px] block mb-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>Password</label>
                  <input
                    type="password"
                    disabled={isTrialExpired}
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none disabled:opacity-50 ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                      }`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={connecting || isTrialExpired}
                  className={`w-full text-xs font-medium py-2 rounded-lg transition cursor-pointer mt-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${isDark ? 'bg-[#2f2f2f] hover:bg-[#383838] text-white' : 'bg-[#e0e0e0] hover:bg-[#d5d5d5] text-black'
                    }`}
                >
                  {connecting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isConnected ? 'Reconnect' : 'Connect DBMS'}
                </button>
              </form>
            )}
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
            <p className={`px-2 py-1 text-[11px] font-semibold ${isDark ? 'text-[#676767]' : 'text-[#8e8e8e]'}`}>Recent Queries</p>
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`group relative flex items-center justify-between px-2.5 py-2 text-xs rounded-lg transition cursor-pointer ${activeSessionId === session.id
                    ? isDark ? 'bg-[#212121] text-white font-medium' : 'bg-[#e5e5e5] text-black font-medium'
                    : isDark ? 'text-[#b4b4b4] hover:bg-[#212121] hover:text-white' : 'text-[#555555] hover:bg-[#eaeaea] hover:text-black'
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

        {/* User Footer */}
        <div className={`p-3 border-t relative ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          {isUserMenuOpen && (
            <div className={`absolute bottom-full left-3 right-3 mb-2 border rounded-xl p-1.5 shadow-xl z-50 ${isDark ? 'bg-[#212121] border-white/10' : 'bg-white border-black/10'
              }`}>
              <button onClick={handleLogout} className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition ${isDark ? 'text-white hover:bg-[#2f2f2f]' : 'text-black hover:bg-[#f0f0f0]'
                }`}>
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Log out</span>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full flex items-center justify-between p-2 rounded-xl transition cursor-pointer text-left ${isDark ? 'hover:bg-[#212121]' : 'hover:bg-[#eaeaea]'
              }`}
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-[#383838] text-white' : 'bg-[#d0d0d0] text-black'
                }`}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-black'}`}>{userEmail}</span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`relative flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#ffffff]'}`}>

        {/* Header */}
        <header className={`h-14 border-b px-4 flex items-center justify-between shrink-0 ${isDark ? 'border-[#212121] bg-[#000000]' : 'border-[#e5e5e5] bg-[#ffffff]'
          }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`p-1.5 rounded-lg transition md:hidden cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#f0f0f0]'
                }`}
              title="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className={`p-1.5 rounded-lg transition hidden md:block cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#f0f0f0]'
                  }`}
                title="Show sidebar"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            <div className={`flex items-center gap-1.5 font-medium text-sm md:text-base px-2 py-1 ${isDark ? 'text-white' : 'text-black'}`}>
              <span>Prompt BI Agent</span>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <span className={`hidden sm:inline-block px-3 py-1.5 rounded-full text-xs font-medium border ${isTrialExpired
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : isDark ? 'bg-[#212121] text-white border-white/5' : 'bg-[#f0f0f0] text-black border-black/5'
              }`}>
              {isTrialExpired ? 'Trial Expired' : 'Trial (7 days)'}
            </span>

            {/* Settings & Theme Selector */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-full transition cursor-pointer ${isDark ? 'text-[#8e8e8e] hover:text-white hover:bg-[#212121]' : 'text-[#676767] hover:text-black hover:bg-[#f0f0f0]'
                  }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className={`absolute right-0 mt-2 w-48 border rounded-2xl p-2 shadow-2xl z-50 transition-all ${isDark ? 'bg-[#171717] border-white/10 text-white' : 'bg-white border-black/10 text-black'
                  }`}>
                  <p className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#8e8e8e]'}`}>
                    Appearance
                  </p>

                  <button
                    onClick={() => { setTheme('dark'); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer ${isDark ? 'bg-[#212121] font-semibold text-white' : 'hover:bg-[#f0f0f0] text-black'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon className="w-4 h-4 text-purple-400" />
                      <span>Dark Mode</span>
                    </div>
                    {isDark && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>

                  <button
                    onClick={() => { setTheme('light'); setIsSettingsOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition cursor-pointer mt-1 ${!isDark ? 'bg-[#e5e5e5] font-semibold text-black' : 'hover:bg-[#212121] text-white'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Light Mode</span>
                    </div>
                    {!isDark && <Check className="w-3.5 h-3.5 text-emerald-600" />}
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
                  Select a suggested query below or ask any question about your sales, inventory, and customers in plain English.
                </p>

                {/* English Prompt Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4 w-full max-w-xl">
                  {[
                    "📈 What was the total revenue this month?",
                    "📊 List the top 5 best-selling products",
                    "⚠️ Customers with no purchases in 60+ days",
                    "💵 What is the average daily sales in 2026?"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      disabled={isTrialExpired}
                      onClick={() => setInput(suggestion.replace(/^[\u2600-\u27BF\u1F300-\u1F9FF]\s*/, ''))}
                      className={`text-left p-3.5 rounded-2xl text-xs border transition cursor-pointer ${isDark
                          ? 'bg-[#171717] text-[#ececec] border-white/5 hover:bg-[#212121] hover:border-white/20'
                          : 'bg-[#f9f9f9] text-[#0d0d0d] border-black/5 hover:bg-[#f0f0f0] hover:border-black/15 shadow-sm'
                        } ${isTrialExpired ? 'opacity-40 cursor-not-allowed' : ''}`}
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
                      <div className={`px-4 py-2.5 rounded-3xl max-w-[85%] text-sm leading-relaxed shadow-sm ${isDark ? 'bg-[#212121] text-[#ececec]' : 'bg-[#f0f0f0] text-[#0d0d0d]'
                        }`}>
                        {msg.content}
                      </div>
                    ) : (
                      <div className={`w-full text-sm leading-relaxed space-y-3 pt-2 ${isDark ? 'text-[#ececec]' : 'text-[#0d0d0d]'}`}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className={`mb-4 leading-relaxed text-[15px] ${isDark ? 'text-[#ececec]' : 'text-[#0d0d0d]'}`}>{children}</p>,
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <div className={`my-4 overflow-hidden rounded-xl border ${isDark ? 'bg-[#171717] border-white/10' : 'bg-[#f9f9f9] border-black/10'
                                  }`}>
                                  <div className={`px-4 py-2 text-[11px] font-mono uppercase flex justify-between items-center ${isDark ? 'bg-[#212121] text-[#8e8e8e]' : 'bg-[#e5e5e5] text-[#676767]'
                                    }`}>
                                    <span>{match[1]}</span>
                                  </div>
                                  <pre className={`p-4 overflow-x-auto text-xs font-mono leading-relaxed ${isDark ? 'text-[#ececec]' : 'text-[#0d0d0d]'
                                    }`}>
                                    <code>{String(children).replace(/\n$/, '')}</code>
                                  </pre>
                                </div>
                              ) : (
                                <code className={`px-1.5 py-0.5 rounded text-xs ${isDark ? 'bg-[#212121] text-amber-200' : 'bg-[#e5e5e5] text-amber-800'
                                  }`} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>

                        <div className={`flex items-center gap-1 pt-1 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>
                          <button
                            onClick={() => handleCopy(msg.content, index)}
                            className={`p-1 rounded transition ${isDark ? 'hover:text-white' : 'hover:text-black'
                              }`}
                            title="Copy"
                          >
                            {copiedIndex === index ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleSpeak(msg.content)}
                            className={`p-1 rounded transition ${isDark ? 'hover:text-white' : 'hover:text-black'
                              }`}
                            title="Read aloud"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className={`flex gap-2 items-center p-2 ${isDark ? 'text-[#8e8e8e]' : 'text-[#676767]'}`}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Prompt is analyzing the data...</span>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Input Bar */}
        <div className={`p-3 md:p-4 shrink-0 w-full max-w-3xl mx-auto ${isDark ? 'bg-[#000000]' : 'bg-[#ffffff]'}`}>

          {isTrialExpired && (
            <div className="p-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center gap-2 text-center">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-400 font-medium">
                Your 7-day free trial has expired. Please upgrade your plan to continue querying data.
              </p>
            </div>
          )}

          <form onSubmit={handleSend} className={`relative rounded-3xl px-4 py-3 border transition-all flex items-center gap-2 ${isDark
              ? 'bg-[#212121] border-white/5 focus-within:border-white/20'
              : 'bg-[#f4f4f4] border-black/5 focus-within:border-black/20 shadow-sm'
            }`}>
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
                  ? "Your 7-day trial period has expired."
                  : isConnected
                    ? "Ask Prompt about your data..."
                    : "Connect DBMS on the sidebar first..."
              }
              disabled={!isConnected || isTrialExpired}
              rows={1}
              className={`w-full bg-transparent text-sm focus:outline-none resize-none max-h-36 pt-0.5 disabled:opacity-50 ${
                isDark ? 'text-white placeholder-[#8e8e8e]' : 'text-black placeholder-[#8e8e8e]'
              }`}
            />

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={!isConnected || isTrialExpired}
              className={`p-2 rounded-full transition cursor-pointer shrink-0 disabled:opacity-20 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : isDark ? 'text-[#8e8e8e] hover:text-white' : 'text-[#676767] hover:text-black'
              }`}
              title={isListening ? "Listening..." : "Voice input"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !input.trim() || !isConnected || isTrialExpired}
              className={`p-2 rounded-full transition cursor-pointer shrink-0 disabled:opacity-20 ${
                isDark ? 'bg-white text-black hover:bg-[#e2e2e2]' : 'bg-black text-white hover:bg-[#333333]'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className={`text-[10px] md:text-[11px] text-center mt-2.5 ${isDark ? 'text-[#676767]' : 'text-[#8e8e8e]'}`}>
            Prompt can make mistakes. Verify important data.
          </p>
        </div>

      </main>
    </div>
  );
}
