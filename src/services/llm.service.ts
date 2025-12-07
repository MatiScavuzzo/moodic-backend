import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { Mood } from '../schema/mood.schema';
import { LLMResponseSchema } from '../schema/llmResponse.schema';
import { moodParser } from '../utils/moodParser';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || '',
});

async function generateMoodic({ mood }: { mood: Mood }) {
  const systemInstruction =
    'Eres un experto en música y psicología. Analizas estados de ánimo y sugieres música apropiada.';

  const parsedMood = moodParser(mood);
  const prompt = `Analiza este estado de ánimo y devuelve términos de busqueda para Spotify
    Mood: ${parsedMood}
    Devuelve SOLO un JSON con este formato: 
    {
      "genres": ["genre1", "genre2", "genre3"],
      "mood": "mood1",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "tempo": "tempo1",
    }`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    // Parsear la respuesta JSON
    const rawData = JSON.parse(response.text?.trim() || '{}');

    // Validar con Zod
    const validatedData = LLMResponseSchema.parse(rawData);

    return validatedData;
  } catch (error) {
    console.error('Ocurrió un error al generar el moodic:', error);

    // Si es un error de validación de Zod, loguear más detalles
    if (error instanceof z.ZodError) {
      console.error('Error de validación del LLM:', error.issues);
    }

    return null;
  }
}

export default generateMoodic;
