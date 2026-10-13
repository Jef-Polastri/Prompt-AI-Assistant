import express from 'express';
import cors from 'cors';
//import * as dotenv from 'dotenv';
import { Pool as PgPool } from 'pg';
import mysql from 'mysql2/promise';
import { executarAgente } from './agent';

//dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

{/*app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, schema } = req.body;

    // A função gerencia sozinha qual IA chamar
// Cria o objeto de conexão ativa que o agente.ts tanto precisa
    const activeConnection = {
      type: 'postgres', // Ou o banco correspondente da sessão atual
      client: 'pgPool'    // A pool ou cliente conectado do banco (ex: pgPool, mysqlPool, etc.)
    };
    // Passa o prompt e o objeto de conexão estruturado
    const sqlResult = await executarAgente(prompt, activeConnection);

    {/*const sqlResult = await executarAgente(prompt, schema);

    return res.json({ success: true, data: sqlResult });
  } catch (error: any ) {
    console.error(error);
    return res.status(500).json({ success: false, error: error.message });
  }
});*/}

// Armazenamento em memória da conexão ativa da sessão do cliente atual (para fins de MVP)
let activeConnection: { type: string; config: any; client: any } | null = null;

// Rota para testar e registrar a conexão do banco de dados escolhido pelo cliente
app.post('/api/connect-db', async (req, res) => {
  try {
    const { type, host, port, database, user, password } = req.body;

    if (type === 'postgres') {
      const pool = new PgPool({
        host,
        port: Number(port),
        database,
        user,
        password,
        connectionTimeoutMillis: 5000
      });
      // Testa a conexão
      const client = await pool.connect();
      client.release();
      activeConnection = { type, config: req.body, client: pool };
    } 
    else if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host,
        port: Number(port),
        database,
        user,
        password
      });
      await connection.ping();
      activeConnection = { type, config: req.body, client: connection };
    } 
    else if (type === 'oracle') {
      const oracledb = await import('oracledb');

     // Configura o modo Thin explicitamente (não precisa de binários locais)
      oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;

      // Limpa o host caso venha com "http://" ou "https://" do input do frontend
      const cleanHost = host.replace(/^https?:\/\//, '');
      
      // Monta a string de conexão padrão do Oracle (Host:Porta/ServiceName)
      const connectString = `${cleanHost}:${port}/${database}`;

      const pool = await oracledb.default.createPool({
        user,
        password,
        connectString: `${host}:${port}/${database}`, // Ex: localhost:1521/ORCL
        poolMin: 1,
        poolMax: 5
      });
      // Testa a conexão pegando e liberando uma conexão do pool
      const connection = await pool.getConnection();
      await connection.close();

      activeConnection = { type, config: req.body, client: pool };
    }
    else {
      return res.status(400).json({ error: 'SGBD selecionado não suportado no momento.' });
    }

    console.log(`🔗 Conexão bem-sucedida com o banco ${type.toUpperCase()} (${database})`);
    res.json({ success: true, message: 'Banco conectado com sucesso!' });
  } catch (error: any) {
    console.error("Erro ao conectar no banco:", error);
    res.status(500).json({ error: error.message || 'Falha ao autenticar com o banco de dados.' });
  }
});

// Rota de Chat consumida pelo Frontend
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'O campo prompt é obrigatório.' });
    }

    if (!activeConnection) {
      return res.status(400).json({ reply: 'Nenhum banco de dados conectado. Por favor, preencha as credenciais na barra lateral e clique em Conectar.' });
    }

    console.log(`👤 Pergunta recebida: "${prompt}" [Banco Ativo: ${activeConnection.type}]`);
    
    const reply = await executarAgente(prompt, activeConnection);
    
    res.json({ reply });
  } catch (error) {
    console.error("Erro na rota /api/chat:", error);
    res.status(500).json({ error: 'Erro interno ao processar o agente.' });
  }
});

const PORT = process.env.PORT || 3333;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor backend rodando na porta ${PORT}`);
});
