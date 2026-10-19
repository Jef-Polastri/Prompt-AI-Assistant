'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { Database, Zap } from 'lucide-react';

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState('');

  // Login Social Unificado (Google, Microsoft/Azure ou GitHub)
  const handleOAuthLogin = async (provider: 'google' | 'azure' | 'github') => {
    try {
      setErrorMessage('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err) {
      setErrorMessage('Erro ao tentar conectar com o provedor.');
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-[#000000] text-[#ececec] font-sans selection:bg-white selection:text-black relative overflow-hidden select-none">
      
      {/* Coluna Esquerda: Apresentação Institucional, Proposta de Valor & Mascote Piti */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-[#212121] bg-[#171717] relative z-10">
        
        {/* Topo: Logo */}
        <div className="flex items-center gap-3">
          <img src="/logos/LogoPrompt.png" alt="Prompt Logo" className="w-8 h-8 object-contain" />
          <span className="font-mono font-medium text-xl tracking-tight text-white">prompt</span>
        </div>

        {/* Conteúdo Central */}
        <div className="space-y-6 max-w-lg">
          
          {/* Badge Clean */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#212121] border border-white/5 text-xs font-medium text-[#c5c5c5]">
            <Database className="w-3.5 h-3.5 text-white" />
            <span>Inteligência de Dados Conversacional B2B</span>
          </div>
          
          <h1 className="text-4xl font-semibold tracking-tight text-white leading-tight">
            Converse diretamente com os <span className="text-[#8e8e8e]">dados da sua empresa</span>.
          </h1>
          
          <p className="text-[#8e8e8e] text-sm leading-relaxed">
            Esqueça consultas SQL complexas. O <strong className="text-white font-medium">Prompt</strong> conecta-se de forma segura aos bancos corporativos e traduz linguagem natural em respostas claras.
          </p>

          {/* CARD DO MASCOTE PITI 🤖 */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#212121]/60 border border-white/10 shadow-lg">
            <div className="w-12 h-12 rounded-full bg-[#171717] border border-white/10 flex items-center justify-center shrink-0">
              {/* Você pode trocar a imagem abaixo pela logo/avatar do Piti quando tiver */}
              <img 
                src="/logos/bots.png" 
                alt="Mascote Piti" 
                className="w-7 h-7 object-contain animate-pulse"
              />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white">"Olá, eu sou o Piti! 🤖"</h4>
              <p className="text-[11px] text-[#8e8e8e] leading-snug mt-0.5">
                Estou pronto para ajudar você a explorar o seu banco de dados em segundos.
              </p>
            </div>
          </div>

          {/* Cartões de Recursos (Estilo OpenAI Dark) */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#212121]">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#212121]/40 border border-white/5">
              <div className="p-2 rounded-lg bg-[#212121] text-white">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-white">Multi-Bancos</h3>
                <p className="text-[11px] text-[#8e8e8e]">Postgres, MySQL & mais.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#212121]/40 border border-white/5">
              <div className="p-2 rounded-lg bg-[#212121] text-white">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-white">Respostas Rápidas</h3>
                <p className="text-[11px] text-[#8e8e8e]">Insights instantâneos.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé */}
        <div className="text-xs text-[#676767] font-mono">
          © {new Date().getFullYear()} Prompt SaaS. Todos os direitos reservados.
        </div>
      </div>

      {/* Coluna Direita: Autenticação Limpa (Tema OpenAI) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-[#000000]">
        <div className="w-full max-w-md space-y-8 p-8 rounded-3xl bg-[#171717] border border-[#212121] shadow-2xl">
          
          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <img src="/logos/LogoPrompt.png" alt="Prompt Logo" className="w-8 h-8 object-contain" />
            <span className="font-mono font-medium text-lg text-white">prompt</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Acesse o Workspace
            </h2>
            <p className="text-xs text-[#8e8e8e]">
              Escolha uma opção abaixo para entrar ou criar sua conta instantaneamente.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Botões de Autenticação OAuth (Estilo ChatGPT) */}
          <div className="space-y-3 pt-1">
            
            {/* Google */}
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full bg-[#212121] hover:bg-[#2f2f2f] border border-white/5 text-xs font-medium text-white py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continuar com o Google</span>
            </button>

            {/* Microsoft */}
            <button
              onClick={() => handleOAuthLogin('azure')}
              className="w-full bg-[#212121] hover:bg-[#2f2f2f] border border-white/5 text-xs font-medium text-white py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 23 23">
                <path fill="#f3f3f3" d="M0 0h11v11H0z"/>
                <path fill="#f3f3f3" d="M12 0h11v11H12z"/>
                <path fill="#f3f3f3" d="M0 12h11v11H0z"/>
                <path fill="#f3f3f3" d="M12 12h11v11H12z"/>
              </svg>
              <span>Continuar com a Microsoft</span>
            </button>

            {/* GitHub */}
            <button
              onClick={() => handleOAuthLogin('github')}
              className="w-full bg-[#212121] hover:bg-[#2f2f2f] border border-white/5 text-xs font-medium text-white py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>Continuar com o GitHub</span>
            </button>

          </div>

          <p className="text-[11px] text-[#676767] text-center pt-2">
            Ao acessar, você concorda com os termos de serviço e política de privacidade do Prompt.
          </p>
        </div>
      </div>
    </div>
  );
}