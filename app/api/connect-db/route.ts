import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executarAgente } from '../../src/agent'; // Ajuste o caminho se necessário para o seu agent.ts

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("--> Recebido na API:", body);

    const { prompt, activeConnection } = body;

    // Se a intenção for apenas testar/conectar o banco de dados (sem prompt de chat)
    if (!prompt) {
      return NextResponse.json({ 
        success: true, 
        message: "Conexão com o banco processada com sucesso!",
        data: body 
      }, { status: 200 });
    }

    // Se houver um prompt, executa o agente normalmente
    let reply = "";
    if (activeConnection) {
      reply = await executarAgente(prompt, activeConnection);
    } else {
      reply = "Nenhum banco de dados conectado.";
    }

    return NextResponse.json({ 
      success: true, 
      reply: reply 
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erro ao processar a requisição:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
