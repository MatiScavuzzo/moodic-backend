import { Mood } from '../schema/mood.schema';

export function moodParser(mood: Mood): string {
  const userMood = mood.mood.trim();
  const parts: string[] = [];

  // Solo agregar preferencias si existen
  if (mood.preferences) {
    if (mood.preferences.genres && mood.preferences.genres.length > 0) {
      parts.push(`Prefiere géneros: ${mood.preferences.genres.join(', ')}`);
    }

    if (
      mood.preferences.excludeGenres &&
      mood.preferences.excludeGenres.length > 0
    ) {
      parts.push(`Evita géneros: ${mood.preferences.excludeGenres.join(', ')}`);
    }

    if (mood.preferences.energy) {
      const energyMap: Record<string, string> = {
        low: 'baja',
        medium: 'media',
        high: 'alta',
      };
      parts.push(`Energía: ${energyMap[mood.preferences.energy]}`);
    }

    if (mood.preferences.tempo) {
      const tempoMap: Record<string, string> = {
        slow: 'lento',
        medium: 'medio',
        fast: 'rápido',
      };
      parts.push(`Tempo: ${tempoMap[mood.preferences.tempo]}`);
    }

    if (mood.preferences.era) {
      parts.push(`Época: ${mood.preferences.era}`);
    }

    if (mood.preferences.language && mood.preferences.language.length > 0) {
      const languageMap: Record<string, string> = {
        en: 'inglés',
        es: 'español',
        fr: 'francés',
        de: 'alemán',
        it: 'italiano',
        pt: 'portugués',
        ru: 'ruso',
        zh: 'chino',
        ja: 'japonés',
        ko: 'coreano',
      };
      const languages = mood.preferences.language
        .map((lang) => languageMap[lang] || lang)
        .join(', ');
      parts.push(`Idiomas: ${languages}`);
    }
  }

  // Construir el texto final: mood + preferencias (si existen)
  if (parts.length > 0) {
    return `Usuario: ${userMood}\n${parts.join('\n')}`;
  }

  // Si no hay preferencias, solo devolver el mood
  return `Usuario: ${userMood}`;
}
