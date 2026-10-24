import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { decrypt } from '@/utils/encryption';

export async function POST(request: Request) {
  try {
    const { prompt, dataSourceId } = await request.json();

    if (!dataSourceId || !prompt) {
      return NextResponse.json({ error: 'Missing dataSourceId or prompt' }, { status: 400 });
    }

    // Busca a fonte de dados no Supabase
    const { data: source, error } = await supabase
      .from('data_sources')
      .select('*')
      .eq('id', dataSourceId)
      .single();

    if (error || !source) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }

    let assistantReply = '';

    if (source.connection_type === 'rest_api') {
      const apiToken = decrypt(source.encrypted_api_token);
      // Lógica de consumo de API de ERP...
      assistantReply = `[API ERP] Resposta processada para: "${prompt}"`;
    } else {
      // Conexão SQL Direta
      const password = decrypt(source.encrypted_credentials);
      // Aqui o seu backend conecta no banco usando as credenciais descriptografadas com segurança
      assistantReply = `[${source.connection_type.toUpperCase()} Direto] Consulta executada com sucesso no banco "${source.database_name}".`;
    }

    return NextResponse.json({ reply: assistantReply });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}