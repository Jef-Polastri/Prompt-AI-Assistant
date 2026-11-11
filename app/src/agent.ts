import { gerarConteudoIA } from '../services/ai/aiService.js';


/// Função para inspecionar as tabelas e colunas do banco do cliente (Metadados)
async function obterEsquemaBanco(activeConnection: any): Promise<string> {
  const { type, client } = activeConnection;
  try {
    if (type === 'postgres') {
      const res = await client.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns           
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);
      return JSON.stringify(res.rows, null, 2);
    } else if (type === 'mysql') {
      const [rows] = await client.execute(`
        SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE();
      `);
      return JSON.stringify(rows, null, 2);
    }
  } catch (err) {
    console.error("Erro ao inspecionar esquema do banco:", err);
  }
  return "Esquema indisponível ou tabelas não encontradas.";
}

// Validador de segurança estrito: apenas SELECT é permitido
function validarQuerySQL(sql: string): boolean {
  const sqlLimpo = sql.trim().toUpperCase();
  if (!sqlLimpo.startsWith('SELECT')) return false;
  const palavrasProibidas = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'EXEC'];
  for (const palavra of palavrasProibidas) {
    if (sqlLimpo.includes(palavra)) return false;
  }
  return true;
}

export async function executarAgente(perguntaUsuario: string, activeConnection: any) {
  try {
    // 1. Descobrir a estrutura do banco conectado no momento
    const esquemaBanco = await obterEsquemaBanco(activeConnection);

    // 2. Montar o prompt de geração SQL
    const promptGeracaoSQL = `
      Você é um engenheiro de dados sênior, especialista em SQL para o banco ${activeConnection.type.toUpperCase()}.
      Com base estritamente no esquema do banco de dados abaixo, escreva um comando SQL SELECT válido e otimizado para responder à pergunta do usuário.
      
      Esquema do Banco de Dados (Tabelas e Colunas):
      ${esquemaBanco}

      Pergunta do Usuário: "${perguntaUsuario}"

      Regras obrigatórias:
      - Retorne APENAS o código SQL puro. Não coloque blocos de markdown (\`\`\`sql), não adicione explicações extras.
      - Apenas instruções SELECT de leitura são permitidas.
      - Nunca utilize marcações de markdown nas suas respostas, como negrito (**), itálico (*), títulos (###), blocos de código (\`\`\`) ou linhas divisórias (---). Escreva sempre em texto puro, limpo e corrido, utilizando apenas quebras de linha normais quando necessário.
    `;

    let sqlGerado = await gerarConteudoIA(promptGeracaoSQL);
    sqlGerado = sqlGerado ? sqlGerado.trim() : '';
    sqlGerado = sqlGerado.replace(/```sql/gi, '').replace(/```/g, '').trim();

    console.log(`🧠 SQL gerado pela IA: ${sqlGerado}`);

    // 3. Validar segurança da query gerada
    if (!validarQuerySQL(sqlGerado)) {
      return {
        reply: "Desculpe, a IA gerou uma consulta que não passou nos critérios de segurança ou não é um comando de leitura válido."
      };
    }

    // 4. Executar a query gerada no banco de dados ativo do cliente..
    let resultadoDados: any;
    const { type, client } = activeConnection;

    if (type === 'postgres') {
      const resQuery = await client.query(sqlGerado);
      resultadoDados = resQuery.rows;
    } else if (type === 'mysql') {
      const [rowsQuery] = await client.execute(sqlGerado);
      resultadoDados = rowsQuery;
    }
    else if (type === 'sqlserver') {
      const resQuery = await client.query(sqlGerado);
      resultadoDados = resQuery.recordset;
    } 
    else if (type === 'oracle') {
      const connection = await client.getConnection();
      try {
        const resQuery = await connection.execute(sqlGerado);
        resultadoDados = resQuery.rows;
      } finally {
        await connection.close();
      }
    }

    console.log(`📊 Dados obtidos do banco:`, resultadoDados);

    // 5. Verificar se o usuário pediu explicitamente para gerar Excel ou arquivo/planilha
    const pediuExcel = /excel|planilha|baixar|csv|arquivo|exportar/i.test(perguntaUsuario);

    // 6. Montar o prompt de análise dos dados
    const promptAnalise = `
      Atue como uma analista de negócios e assistente financeiro virtual.
      O usuário fez a seguinte pergunta: "${perguntaUsuario}"
      O banco de dados retornou o seguinte resultado bruto em JSON:
      ${JSON.stringify(resultadoDados, null, 2)}

      Elabore uma resposta humanizada, profissional, direta ao ponto e utilize bullet points para destacar as informações mais importantes encontradas. Se o resultado estiver vazio, informe educadamente que nenhum registro foi encontrado.
    `;

    const respostaFinalTexto = await gerarConteudoIA(promptAnalise);

    // SE O USUÁRIO PEDIU EXCEL: Forçamos a entrega dos dados brutos estruturados para o card aparecer!
    if (pediuExcel) {
      return {
        reply: respostaFinalTexto || "Aqui está a análise solicitada e a planilha pronta para download:",
        fileData: {
          type: "excel",
          filename: `relatorio_clientes_${Date.now()}.xlsx`,
          rows: Array.isArray(resultadoDados) && resultadoDados.length > 0 ? resultadoDados : [{ Info: "Nenhum dado retornado" }]
        }
      };
    }

    // Retorno normal apenas com texto (caso não tenha pedido arquivo)
    return {
      reply: respostaFinalTexto || "Dados processados com sucesso, mas sem texto de retorno."
    };

  } catch (error: any) {
    console.error("Erro no Text-to-SQL dinâmico:", error);
    return {
      reply: `Erro ao executar a consulta no banco de dados: ${error.message || 'Erro interno'}`
    };
  }
}
