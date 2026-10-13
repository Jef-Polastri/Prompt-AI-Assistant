import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executarAgente } from '@/src/agent'; // Ajuste o caminho se necessário para o seu agent.ts

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("--> Recebido na API do Chat:", body);

    const { prompt, sessionId, role, activeConnection } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'O campo prompt é obrigatório.' }, { status: 400 });
    }

    // 1. (Opcional/Seu código do Supabase): Salvar a mensagem no Supabase se precisar
    /*
    await supabase
      .from('chat_messages')
      .insert([
        { 
          session_id: sessionId || 'default', 
          message: prompt, 
          role: role || 'user' 
        }
      ]);
    */

    // 2. Chamar o seu agente de IA para processar a resposta baseada no banco ativo
    let reply = "";
    if (activeConnection) {
      reply = await executarAgente(prompt, activeConnection);
    } else {
      reply = "Nenhum banco de dados conectado. Por favor, conecte-se a um banco na barra lateral.";
    }

    // Retorna a resposta final unida (Sucesso do Supabase + Resposta do Agente)
    return NextResponse.json({ 
      success: true, 
      reply: reply,
      message: "Processado com sucesso com Supabase e Agente!"
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erro ao processar o chat:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
