import { Pool } from 'pg';
import * as dotenv from 'dotenv';



dotenv.config();

// Configura a conexão com o banco de dados do cliente (PostgreSQL)
const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Função que busca as faturas no banco
export async function listarFaturas(status?: string) {
  try {
    let query = `
      SELECT f.id, c.nome as cliente, f.valor, f.vencimento, f.status 
      FROM faturas f 
      JOIN clientes c ON f.cliente_id = c.id
    `;
    
    if (status) {
      const res = await db.query(`${query} WHERE f.status = $1`, [status]);
      return res.rows;
    }
    
    const res = await db.query(query);
    return res.rows;
  } catch (error) {
    console.error("Erro ao listar faturas:", error);
    return { error: "Não foi possível consultar as faturas no banco de dados." };
  }
}

// Função que retorna um resumo financeiro agrupado
export async function resumoVendas() {
  try {
    const res = await db.query(`
      SELECT status, COUNT(*) as quantidade, SUM(valor) as total 
      FROM faturas GROUP BY status
    `);
    return res.rows;
  } catch (error) {
    console.error("Erro ao gerar resumo de vendas:", error);
    return { error: "Não foi possível gerar o resumo financeiro." };
  }
}
