// services/ai/aiService.js
import { gerarComGemini } from './geminiProvider.js';
import { gerarComOpenAI } from './openaiProvider.js';

export async function gerarConteudoIA(prompt, modeloSugerido = 'gemini-3.8-flash') {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  console.log(`🤖 A processar IA usando o provedor: ${provider}`);

  if (provider === 'gemini') {
    return await gerarComGemini(prompt, modeloSugerido);
  } 
  
  if (provider === 'openai' || provider === 'grok') {
    return await gerarComOpenAI(prompt, modeloSugerido);
  }

  throw new Error(`Provedor de IA inválido ou não suportado: ${provider}`);
}
