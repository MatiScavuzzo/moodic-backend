import z from 'zod';

export const MoodSchema = z
  .object({
    mood: z
      .string()
      .min(1, 'El mood no puede estar vacío')
      .max(500, 'El mood es demasiado largo'),
    preferences: z.optional(
      z.object({
        genres: z.optional(
          z.array(z.string().min(1)).min(1, 'Debe tener al menos un género')
        ),
        excludeGenres: z.optional(
          z.array(z.string().min(1)).min(1, 'Debe tener al menos un género')
        ),
        energy: z.optional(z.enum(['low', 'medium', 'high'])),
        tempo: z.optional(z.enum(['slow', 'medium', 'fast'])),
        era: z.optional(
          z.enum([
            '40s',
            '50s',
            '60s',
            '70s',
            '80s',
            '90s',
            '00s',
            '10s',
            '20s',
          ])
        ),
        language: z.optional(
          z.array(
            z.enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'])
          )
        ),
      })
    ),
  })
  .refine(
    (data) => {
      // Validar que genres y excludeGenres no se solapen
      if (data.preferences?.genres && data.preferences?.excludeGenres) {
        const hasOverlap = data.preferences.genres.some((g) =>
          data.preferences?.excludeGenres?.includes(g)
        );
        return !hasOverlap;
      }
      return true;
    },
    {
      message:
        'Los géneros no pueden estar en ambos arrays (genres y excludeGenres)',
      path: ['preferences'],
    }
  );

export type Mood = z.infer<typeof MoodSchema>;
