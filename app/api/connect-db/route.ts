import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executarAgente } from '../../src/agent'; // Ajuste o caminho se necessário para o seu agent.ts
import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import sql from 'mssql';
import oracledb from 'oracledb';

// Inicializa o cliente do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("--> Recebido na API:", body);

    const { prompt, type, dbType, host, port, database, user, password, dbConfig, activeConnection } = body;

    // Unifica a captura das configurações de qualquer formato que venha do frontend
    const tipoUsado = type || dbType || activeConnection?.type || 'postgres';
    const configUsada = activeConnection || dbConfig || { host, port, database, user, password };

    // Se a intenção for apenas testar/conectar o banco de dados (sem prompt de chat)
    if (!prompt) {
      if (!configUsada || !configUsada.host) {
        return NextResponse.json({ success: false, error: "Configurações do banco não fornecidas ou incompletas." }, { status: 400 });
      }

      let testClient: any = null;

      if (tipoUsado === 'postgres' || tipoUsado === 'postgresql') {
        testClient = new Pool({
          host: configUsada.host,
          port: Number(configUsada.port || 5432),
          database: configUsada.database,
          user: configUsada.user,
          password: configUsada.password,
          ssl: { rejectUnauthorized: false }
        });
        await testClient.query('SELECT NOW()');
        await testClient.end();
      } else if (tipoUsado === 'mysql') {
        testClient = await mysql.createConnection({
          host: configUsada.host,
          port: Number(configUsada.port || 3306),
          database: configUsada.database,
          user: configUsada.user,
          password: configUsada.password
        });
        await testClient.execute('SELECT 1');
        await testClient.end();
      } else if (tipoUsado === 'sqlserver') {
        testClient = await sql.connect({
          server: configUsada.host,
          port: Number(configUsada.port || 1433),
          database: configUsada.database,
          user: configUsada.user,
          password: configUsada.password,
          options: { encrypt: true, trustServerCertificate: true }
        });
        await testClient.request().query('SELECT 1');
        await testClient.close();
      } else if (tipoUsado === 'oracle') {
        testClient = await oracledb.getConnection({
          user: configUsada.user,
          password: configUsada.password,
          connectString: `${configUsada.host}:${configUsada.port || 1521}/${configUsada.database}`
        });
        await testClient.execute('SELECT 1 FROM DUAL');
        await testClient.close();
      }

      return NextResponse.json({ 
        success: true, 
        message: "Conexão com o banco processada com sucesso!",
        data: body 
      }, { status: 200 });
    }
    // Se houver um prompt, criamos a instância viva do cliente para o agente usar
    let clientInstance: any = null;

    if (tipoUsado === 'postgres') {
      clientInstance = new Pool({
        host: configUsada.host,
        port: Number(configUsada.port || 5432),
        database: configUsada.database,
        user: configUsada.user,
        password: configUsada.password,
        ssl: { rejectUnauthorized: false }
      });
    } else if (tipoUsado === 'mysql') {
      clientInstance = await mysql.createPool({
        host: configUsada.host,
        port: Number(configUsada.port || 3306),
        database: configUsada.database,
        user: configUsada.user,
        password: configUsada.password,
        waitForConnections: true,
        connectionLimit: 5
      });
    } else if (tipoUsado === 'sqlserver') {
      clientInstance = await sql.connect({
        server: configUsada.host,
        port: Number(configUsada.port || 1433),
        database: configUsada.database,
        user: configUsada.user,
        password: configUsada.password,
        options: { encrypt: true, trustServerCertificate: true }
      });
    } else if (tipoUsado === 'oracle') {
      clientInstance = await oracledb.createPool({
        user: configUsada.user,
        password: configUsada.password,
        connectString: `${configUsada.host}:${configUsada.port || 1521}/${configUsada.database}`,
        poolMin: 1,
        poolMax: 4
      });
    }

    const conexaoPronta = {
      type: tipoUsado,
      client: clientInstance
    };

    let reply = "";
    if (conexaoPronta.client) {
      reply = await executarAgente(prompt, conexaoPronta);
    } else {
      reply = "Nenhum banco de dados conectado ou credenciais inválidas.";
    }

    let resultadoAgente: any = { reply: "" };
    if (conexaoPronta.client) {
      resultadoAgente = await executarAgente(prompt, conexaoPronta);
    } else {
      resultadoAgente = { reply: "Nenhum banco de dados conectado ou credenciais inválidas." };
    }

    // Encerra/fecha conexões abertas para otimizar os recursos do servidorless
    if (tipoUsado === 'postgres' && typeof clientInstance.end === 'function') {
      await clientInstance.end();
    } else if (tipoUsado === 'mysql' && typeof clientInstance.end === 'function') {
      await clientInstance.end();
    } else if (tipoUsado === 'sqlserver' && typeof clientInstance.close === 'function') {
      await clientInstance.close();
    } else if (tipoUsado === 'oracle' && typeof clientInstance.close === 'function') {
      await clientInstance.close();
    }

    return NextResponse.json({ 
      success: true, 
      reply: resultadoAgente.reply,
      fileData: resultadoAgente.fileData || null
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Erro ao processar a requisição:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
