import OpenAI from 'openai';

export async function gerarComOpenAI(prompt, modeloSugerido) {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  
  const apiKey = provider === 'grok' ? process.env.GROK_API_KEY : process.env.OPENAI_API_KEY;
  const baseURL = provider === 'grok' ? 'https://api.x.ai/v1' : undefined;
  const modelName = modeloSugerido || (provider === 'grok' ? 'grok-beta' : 'gpt-4o');

  // Instancia o cliente apenas na hora da chamada, evitando erro de chave ausente no boot
  const openai = new OpenAI({ apiKey, baseURL });

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'user', content: prompt }
    ],
  });

  return completion.choices[0].message.content;
}
