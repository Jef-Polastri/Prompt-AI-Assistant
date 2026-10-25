import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';
import { decrypt } from '@/utils/encryption';
import { Client } from 'pg'; // Certifique-se de ter o pacote 'pg' instalado (npm install pg)

export async function POST(request: Request) {
  try {
    const { prompt, dataSourceId } = await request.json();

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
      const apiToken = source.encrypted_api_token.includes(':') 
        ? decrypt(source.encrypted_api_token) 
        : source.encrypted_api_token;
      
      assistantReply = `[API ERP] Resposta processada para: "${prompt}"`;
    } else {
      // 2. Descriptografa a senha (ou usa direto se foi inserida sem criptografia)
      let password = source.encrypted_credentials;
      try {
        if (password && password.includes(':')) {
          password = decrypt(password);
        }
      } catch (e) {
        // Mantém a senha como está caso não esteja criptografada
      }

      // 3. Conecta no Postgres do cliente de forma segura
      const client = new Client({
        host: source.host,
        port: Number(source.port) || 5432,
        database: source.database_name,
        user: source.username,
        password: password,
        ssl: { rejectUnauthorized: false } // Necessário para alguns Postgres em nuvem como Supabase
      });

      await client.connect();

      // Aqui você pode integrar a IA para gerar o SQL baseado no prompt, 
      // ou testar uma consulta básica para validar a conexão:
      const dbResult = await client.query('SELECT NOW() as current_time;');
      await client.end();

      assistantReply = `Conexão bem-sucedida com o banco **${source.database_name}**! Resposta do servidor Postgres: ${dbResult.rows[0].current_time}. (Pergunta recebida: "${prompt}")`;
    }

    return NextResponse.json({ reply: assistantReply });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ reply: `Erro ao conectar no banco: ${err.message}` }, { status: 200 });
  }
}