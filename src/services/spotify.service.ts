import { shuffle } from './../utils/shuffle';
import { LLMResponse } from '../schema/llmResponse.schema';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID as string;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET as string;
const SPOTIFY_TOKEN_URL = process.env.SPOTIFY_TOKEN_URL as string;
const SPOTIFY_SEARCH_URL = process.env.SPOTIFY_SEARCH_URL as string;
const SPOTIFY_CURRENT_USER_URL = process.env.SPOTIFY_CURRENT_USER_URL as string;
const SPOTIFY_AUTH_URL = process.env.SPOTIFY_AUTH_URL as string;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI as string;
const SPOTIFY_API_BASE = process.env.SPOTIFY_API_BASE as string;

async function getSpotifyRequestToken() {
  try {
    const response = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&client_id=${SPOTIFY_CLIENT_ID}&client_secret=${SPOTIFY_CLIENT_SECRET}`,
    });
    const data = await response.json();
    return data.access_token as string;
  } catch (error) {
    console.error('Error getting Spotify request token:', error);
    throw error;
  }
}

// Obtener los top artistas del usuario para personalizar búsquedas
async function getSpotifyTopArtists(token: string, limit: number = 5) {
  try {
    const response = await fetch(
      `${SPOTIFY_API_BASE}/me/top/artists?limit=${limit}&time_range=medium_term`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      console.warn('No se pudieron obtener los top artistas del usuario');
      return null;
    }
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error al obtener top artistas:', error);
    return null;
  }
}

// Obtener los top géneros del usuario basándose en sus artistas
async function getSpotifyTopGenres(token: string): Promise<string[]> {
  try {
    const topArtists = await getSpotifyTopArtists(token, 20);
    if (!topArtists || topArtists.length === 0) {
      return [];
    }

    // Extraer géneros únicos de los artistas
    const genresSet = new Set<string>();
    topArtists.forEach((artist: any) => {
      if (artist.genres && Array.isArray(artist.genres)) {
        artist.genres.forEach((genre: string) => genresSet.add(genre));
      }
    });

    return Array.from(genresSet).slice(0, 5); // Top 5 géneros
  } catch (error) {
    console.error('Error al obtener top géneros:', error);
    return [];
  }
}

async function getSpotifySearchPlaylists(token: string, moodic: LLMResponse) {
  try {
    // Obtener géneros del usuario para personalizar la búsqueda
    const userGenres = await getSpotifyTopGenres(token);

    // Combinar géneros del moodic con los del usuario (priorizando los del usuario)
    const combinedGenres =
      userGenres.length > 0
        ? shuffle([...moodic.genres, ...userGenres.slice(0, 2)]).slice(0, 5) // Mezclar géneros del usuario con los del moodic
        : moodic.genres;

    const query = `${moodic.keywords.join(', ')} ${combinedGenres.join(', ')} ${
      moodic.tempo
    }`;

    // Construir URL con parámetros
    const params = new URLSearchParams({
      q: encodeURIComponent(query),
      type: 'playlist',
      limit: '20',
    });

    const response = await fetch(`${SPOTIFY_SEARCH_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Ocurrió un error al buscar playlists en Spotify:', error);
    return null;
  }
}

async function getSpotifyUser(token: string) {
  try {
    const response = await fetch(SPOTIFY_CURRENT_USER_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener el usuario de Spotify:', error);
    throw error;
  }
}

function loginSpotify() {
  try {
    // Generar state de forma segura
    const stateArray = crypto.getRandomValues(new Uint8Array(16));
    const state = Array.from(stateArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Scopes necesarios para leer información del usuario y sus preferencias musicales
    const scope = 'user-read-private user-read-email user-top-read';

    // Construir la URL de autorización (no hacer fetch, solo construir la URL)
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: state,
    });

    const authUrl = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
    return { url: authUrl, state: state };
  } catch (error) {
    console.error('Error al iniciar sesión en Spotify:', error);
    throw error;
  }
}

async function getSpotifyAccessToken(code: string, state: string) {
  try {
    const authHeader = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    const response = await fetch(`${SPOTIFY_TOKEN_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${SPOTIFY_REDIRECT_URI}&state=${state}`,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al obtener el acceso a Spotify:', error);
    throw error;
  }
}

async function refreshSpotifyToken(refreshToken: string) {
  try {
    const authHeader = Buffer.from(
      `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');
    const response = await fetch(`${SPOTIFY_TOKEN_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authHeader}`,
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error al renovar el token de Spotify:', error);
    throw error;
  }
}

export {
  getSpotifySearchPlaylists,
  getSpotifyUser,
  getSpotifyRequestToken,
  loginSpotify,
  getSpotifyAccessToken,
  refreshSpotifyToken,
};
