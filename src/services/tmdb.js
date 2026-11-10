import { getAppConfig } from './config';

/**
 * Busca filmes pelo título usando a API oficial do TMDB (em pt-BR) quando a chave
 * está configurada, ou usa fallback automático (iTunes Movie API BR) para que a
 * busca de Pôster e Data de Estreia já funcione imediatamente sem chave!
 */
export async function searchMovies(query) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return [];

  const { tmdbApiKey } = getAppConfig();

  // 1. Se tiver chave do TMDB configurada, busca direto no TMDB em Português
  if (tmdbApiKey && !tmdbApiKey.includes('sua-chave')) {
    try {
      const isBearerToken = tmdbApiKey.length > 60;
      const url = isBearerToken
        ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(cleanQuery)}&language=pt-BR&include_adult=false&region=BR`
        : `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(tmdbApiKey)}&query=${encodeURIComponent(cleanQuery)}&language=pt-BR&include_adult=false&region=BR`;

      const res = await fetch(url, {
        headers: isBearerToken
          ? { Authorization: `Bearer ${tmdbApiKey}`, accept: 'application/json' }
          : { accept: 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        return (data.results || []).slice(0, 8).map((item) => ({
          tmdbId: item.id,
          title: item.title || item.original_title,
          originalTitle: item.original_title || item.title,
          releaseDate: item.release_date || '',
          year: item.release_date ? item.release_date.slice(0, 4) : '',
          posterUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
            : '',
          source: 'TMDB',
        }));
      }
    } catch (err) {
      console.warn('Falha ao consultar TMDB, usando busca automática alternativa:', err);
    }
  }

  // 2. Fallback imediato sem precisar de chave (Catálogo de Filmes BR em alta resolução)
  try {
    const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&country=BR&media=movie&entity=movie&limit=8`;
    const res = await fetch(fallbackUrl);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((item) => {
      const highResPoster = item.artworkUrl100
        ? item.artworkUrl100.replace('100x100bb', '600x900bb')
        : '';
      const releaseDate = item.releaseDate ? item.releaseDate.slice(0, 10) : '';
      return {
        tmdbId: item.trackId || null,
        title: item.trackName || '',
        originalTitle: item.trackName || '',
        releaseDate,
        year: releaseDate ? releaseDate.slice(0, 4) : '',
        posterUrl: highResPoster,
        source: 'Catálogo BR',
      };
    });
  } catch (err) {
    console.error('Erro na busca de filmes:', err);
    return [];
  }
}
