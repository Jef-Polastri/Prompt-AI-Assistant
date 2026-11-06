'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Check, Sparkles } from 'lucide-react';

export default function LoginPage() {
  // Estado para armazenar o plano selecionado pelo usuário ('free' ou 'pro')
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro'>('free');
  
  // Armazena e exibe mensagens de erro durante a autenticação.
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Inicia a autenticação OAuth com o provedor escolhido e trata o redirecionamento.
  const handleOAuthLogin = async (provider: 'google' | 'azure' | 'github') => {
    try {
      setErrorMessage('');
      setLoading(true);

      // Salva a escolha do plano no localStorage para resgatar no callback se necessário
      localStorage.setItem('prompt_selected_plan', selectedPlan);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?plan=${selectedPlan}`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage('Error connecting with the provider.');
      setLoading(false);
    }
  };

  // Renderiza a página de login, cards de planos, provedores de acesso e rodapé.
  return (
    <div className="flex flex-col justify-between min-h-screen w-screen bg-[#000000] text-[#ececec] font-sans p-6 md:p-8 select-none relative overflow-hidden">

      {/* Identifica o produto no topo da página. */}
      <header className="flex items-center gap-3">
        <span className="font-mono font-semibold text-xl text-white tracking-tight">
          Prompt.ai
        </span>
      </header>

      {/* Área central com os cards de plano, opções de login e mensagens. */}
      <main className="w-full max-w-[420px] mx-auto space-y-6 text-center my-auto py-6">
        
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Access your workspace
          </h1>
          <p className="text-xs text-[#8e8e8e]">
            Choose a plan to start analyzing your database
          </p>
        </div>

        {/* CARDS DE SELEÇÃO DE PLANO (FREE vs PRO) */}
        <div className="grid grid-cols-2 gap-3 text-left">
          
          {/* Card 1: 7 Dias Grátis */}
          <div
            onClick={() => setSelectedPlan('free')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedPlan === 'free'
                ? 'bg-[#171717] border-white text-white shadow-lg ring-1 ring-white'
                : 'bg-[#111111] border-white/5 text-[#8e8e8e] hover:border-white/20 hover:text-white'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                  Trial
                </span>
                {selectedPlan === 'free' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <h3 className="text-xs font-semibold text-white">7 Days Free</h3>
              <p className="text-[10px] mt-1 opacity-70 leading-relaxed">
                Full access for 7 days.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">$0</span>
              <span className="text-[10px] opacity-60"> / 7 days</span>
            </div>
          </div>

          {/* Card 2: Plano Mensal (R$ 190/mês) */}
          <div
            onClick={() => setSelectedPlan('pro')}
            className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
              selectedPlan === 'pro'
                ? 'bg-[#171717] border-emerald-500 text-white shadow-lg ring-1 ring-emerald-500'
                : 'bg-[#111111] border-white/5 text-[#8e8e8e] hover:border-white/20 hover:text-white'
            }`}
          >
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PRO
                </span>
                {selectedPlan === 'pro' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <h3 className="text-xs font-semibold text-white">Monthly Plan</h3>
              <p className="text-[10px] mt-1 opacity-70 leading-relaxed">
                Unlimited query access.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">R$ 190</span>
              <span className="text-[10px] opacity-60"> / month</span>
            </div>
          </div>

        </div>

        {/* Mostra o erro retornado pelo provedor, quando houver. */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Autenticação por provedores OAuth */}
        <div className="space-y-3 pt-1">

          {/* Login via Google */}
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={loading}
            className="w-full bg-[#212121] hover:bg-[#2e2e2e] text-sm font-medium text-white py-3.5 px-4 rounded-full transition-all cursor-pointer flex items-center justify-center gap-3 border border-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Login via Microsoft/Azure */}
          <button
            onClick={() => handleOAuthLogin('azure')}
            disabled={loading}
            className="w-full bg-[#212121] hover:bg-[#2e2e2e] text-sm font-medium text-white py-3.5 px-4 rounded-full transition-all cursor-pointer flex items-center justify-center gap-3 border border-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
              <path fill="#f3f3f3" d="M0 0h11v11H0z" />
              <path fill="#f3f3f3" d="M12 0h11v11H12z" />
              <path fill="#f3f3f3" d="M0 12h11v11H0z" />
              <path fill="#f3f3f3" d="M12 12h11v11H12z" />
            </svg>
            <span>Continue with Microsoft</span>
          </button>

          {/* Login via GitHub */}
          <button
            onClick={() => handleOAuthLogin('github')}
            disabled={loading}
            className="w-full bg-[#212121] hover:bg-[#2e2e2e] text-sm font-medium text-white py-3.5 px-4 rounded-full transition-all cursor-pointer flex items-center justify-center gap-3 border border-white/5 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span>Continue with GitHub</span>
          </button>

        </div>
      </main>

      {/* Exibe a marca e os links para os termos e a política de privacidade. */}
      <footer className="flex flex-col items-center gap-2 text-center text-xs text-[#676767]">
        <span className="font-mono font-semibold text-xs text-white tracking-tight">
          Prompt.ai
        </span>
        <div className="flex items-center gap-3">
          <a href="#" className="hover:underline transition">Terms of Use</a>
          <span>|</span>
          <a href="#" className="hover:underline transition">Privacy Policy</a>
        </div>
      </footer>

    </div>
  );
}