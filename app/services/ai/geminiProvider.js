import { GoogleGenAI } from '@google/genai';

export async function gerarComGemini(prompt, modeloSugerido) {
  // Inicializa apenas no momento do uso
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: modeloSugerido || 'gemini-3.8-flash',
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
  });

  return response.text;
}
