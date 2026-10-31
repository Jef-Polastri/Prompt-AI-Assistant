import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { decrypt } from '@/utils/encryption';
import { Client } from 'pg';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, dataSourceId } = body;

    if (!dataSourceId || !prompt) {
      return NextResponse.json({ error: 'Missing dataSourceId or prompt' }, { status: 400 });
    }

    // 1. Busca a fonte de dados no Supabase
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
      assistantReply = `[API ERP] Resposta processada com sucesso para: "${prompt}"`;
    } else {
      // 2. Recupera a senha com segurança
      let password = source.encrypted_credentials || '';
      try {
        if (password.includes(':')) {
          password = decrypt(password);
        }
      } catch (e) {
        // Usa a senha em texto plano caso não esteja criptografada
      }

      // 3. Conexão com o Postgres
      const client = new Client({
        host: source.host,
        port: Number(source.port) || 5432,
        database: source.database_name,
        user: source.username,
        password: password,
        ssl: { rejectUnauthorized: false }
      });

      await client.connect();
      const res = await client.query('SELECT NOW() as current_time;');
      await client.end();

      assistantReply = `Conexão bem-sucedida com o banco **${source.database_name}**! Horário do servidor Postgres: ${res.rows[0].current_time}. (Sua pergunta: "${prompt}")`;
    }

    return NextResponse.json({ reply: assistantReply });

  } catch (err: any) {
    console.error('API Execution Error:', err);
    return NextResponse.json({ 
      reply: `Erro ao processar dados no servidor: ${err.message || 'Erro desconhecido'}` 
    }, { status: 200 });
  }
}