'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // O Supabase lida automaticamente com os tokens da URL ao carregar o cliente,
    // mas precisamos dar um instante para ele persistir a sessão.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/chat'); // Redireciona para o chat com segurança
      }
    });

    // Fallback caso o evento demore
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/chat');
      } else {
        // Se por acaso falhar, joga de volta pro login
        setTimeout(() => router.replace('/login'), 2000);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#F9F8F6] text-slate-900">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
        <p className="text-xs text-slate-600 font-medium">Autenticando e preparando o seu ambiente...</p>
      </div>
    </div>
  );
}