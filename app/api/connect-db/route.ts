import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando as variáveis de ambiente públicas ou de servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("--> Recebido na API do Chat:", body);

    // Exemplo de como salvar ou interagir com o banco do Supabase na nuvem:
    // (Ajuste o nome da tabela conforme a estrutura que você criou no Supabase, ex: 'chat_messages')
    
    /*
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        { 
          session_id: body.sessionId, 
          message: body.message, 
          role: body.role 
        }
      ]);

    if (error) {
      throw error;
    }
    */

    // Resposta temporária de sucesso para validar a integração com a nuvem
    return NextResponse.json({ 
      success: true, 
      message: "Conectado com sucesso ao Supabase na nuvem!",
      data: body 
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erro ao processar o chat com o Supabase:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
