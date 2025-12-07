import z from 'zod';

export const LLMResponseSchema = z.object({
  genres: z
    .array(z.string().min(1))
    .min(1, 'Debe tener al menos un género')
    .max(10, 'Máximo 10 géneros'),
  mood: z
    .string()
    .min(1, 'El mood no puede estar vacío')
    .max(100, 'El mood es demasiado largo'),
  keywords: z
    .array(z.string().min(1))
    .min(1, 'Debe tener al menos una keyword')
    .max(15, 'Máximo 15 keywords'),
  tempo: z
    .string()
    .min(1, 'El tempo no puede estar vacío')
    .max(50, 'El tempo es demasiado largo'),
});

export type LLMResponse = z.infer<typeof LLMResponseSchema>;

