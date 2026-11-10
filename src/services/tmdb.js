import { getAppConfig } from './config';

function getTmdbAuth() {
  const { tmdbApiKey } = getAppConfig();
  if (!tmdbApiKey || tmdbApiKey.includes('sua-chave')) return null;
  const isBearerToken = tmdbApiKey.length > 60;
  return {
    isBearerToken,
    headers: isBearerToken
      ? { Authorization: `Bearer ${tmdbApiKey}`, accept: 'application/json' }
      : { accept: 'application/json' },
    authParam: isBearerToken ? '' : `api_key=${encodeURIComponent(tmdbApiKey)}&`,
  };
}

/**
 * Busca filmes pelo título usando a API oficial do TMDB (em pt-BR) quando a chave
 * está configurada, ou usa fallback automático (iTunes Movie API BR).
 */
export async function searchMovies(query) {
  const cleanQuery = (query || '').trim();
  if (cleanQuery.length < 2) return [];

  const auth = getTmdbAuth();

  if (auth) {
    try {
      const url = `https://api.themoviedb.org/3/search/movie?${auth.authParam}query=${encodeURIComponent(
        cleanQuery
      )}&language=pt-BR&include_adult=false&region=BR`;

      const res = await fetch(url, { headers: auth.headers });
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

  try {
    const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanQuery
    )}&country=BR&media=movie&entity=movie&limit=8`;
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
        runtime: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 60000) : 0,
        genres: item.primaryGenreName ? [item.primaryGenreName] : [],
        director: item.artistName || '',
        source: 'Catálogo BR',
      };
    });
  } catch (err) {
    console.error('Erro na busca de filmes:', err);
    return [];
  }
}

/**
 * Busca automaticamente Duração (minutos), Gêneros e Diretor do filme no TMDB
 */
export async function fetchMovieRichDetails({ tmdbId, title }) {
  const auth = getTmdbAuth();

  if (auth) {
    let targetId = tmdbId && Number(tmdbId) < 50000000 ? tmdbId : null;

    if (!targetId && title && title.trim().length >= 2) {
      try {
        const cleanTitle = title.replace(/\(Exemplo\)/gi, '').trim();
        const sUrl = `https://api.themoviedb.org/3/search/movie?${auth.authParam}query=${encodeURIComponent(
          cleanTitle
        )}&language=pt-BR`;
        const sRes = await fetch(sUrl, { headers: auth.headers });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.results && sData.results.length > 0) {
            targetId = sData.results[0].id;
          }
        }
      } catch {
        // continua
      }
    }

    if (targetId) {
      try {
        const dUrl = `https://api.themoviedb.org/3/movie/${targetId}?${auth.authParam}append_to_response=credits&language=pt-BR`;
        const dRes = await fetch(dUrl, { headers: auth.headers });
        if (dRes.ok) {
          const data = await dRes.json();
          const runtime = Number(data.runtime || 0);
          const genres = (data.genres || []).slice(0, 3).map((g) => g.name);
          const crew = data.credits?.crew || [];
          const directors = crew
            .filter((c) => c.job === 'Director')
            .map((c) => c.name);

          return {
            tmdbId: data.id,
            runtime,
            genres,
            director: directors.slice(0, 2).join(', '),
            releaseDate: data.release_date || '',
            posterUrl: data.poster_path
              ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
              : '',
          };
        }
      } catch (err) {
        console.warn('Erro ao buscar detalhes ricos no TMDB:', err);
      }
    }
  }

  // Fallback via iTunes se não tiver chave TMDB
  if (title && title.trim().length >= 2) {
    try {
      const cleanTitle = title.replace(/\(Exemplo\)/gi, '').trim();
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(
          cleanTitle
        )}&country=BR&media=movie&entity=movie&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        const item = data.results?.[0];
        if (item) {
          return {
            tmdbId: tmdbId || item.trackId || null,
            runtime: item.trackTimeMillis
              ? Math.round(item.trackTimeMillis / 60000)
              : 0,
            genres: item.primaryGenreName ? [item.primaryGenreName] : [],
            director: item.artistName || '',
          };
        }
      }
    } catch {
      // ignora
    }
  }

  return { tmdbId: tmdbId || null, runtime: 0, genres: [], director: '' };
}

/**
 * Busca dezenas de pôsteres alternativos do filme no TMDB
 */
export async function fetchMoviePosters({ tmdbId, title }) {
  const auth = getTmdbAuth();
  const posters = [];
  const seenUrls = new Set();

  const addPoster = (url, label) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    posters.push({ url, label });
  };

  if (auth) {
    let resolvedTmdbId = tmdbId && Number(tmdbId) < 50000000 ? tmdbId : null;

    if (!resolvedTmdbId && title && title.trim().length >= 2) {
      try {
        const searchUrl = `https://api.themoviedb.org/3/search/movie?${auth.authParam}query=${encodeURIComponent(
          title.trim()
        )}&language=pt-BR`;
        const sRes = await fetch(searchUrl, { headers: auth.headers });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.results && sData.results.length > 0) {
            resolvedTmdbId = sData.results[0].id;
            sData.results.slice(0, 4).forEach((r) => {
              if (r.poster_path) {
                addPoster(
                  `https://image.tmdb.org/t/p/w500${r.poster_path}`,
                  r.title || 'TMDB'
                );
              }
            });
          }
        }
      } catch (err) {
        console.warn('Erro ao buscar ID do filme no TMDB para pôsteres:', err);
      }
    }

    if (resolvedTmdbId) {
      try {
        const imgUrl = `https://api.themoviedb.org/3/movie/${resolvedTmdbId}/images?${auth.authParam}include_image_language=pt,en,null`;
        const imgRes = await fetch(imgUrl, { headers: auth.headers });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          (imgData.posters || []).slice(0, 24).forEach((p, idx) => {
            if (p.file_path) {
              const langLabel =
                p.iso_639_1 === 'pt'
                  ? 'PT-BR'
                  : p.iso_639_1 === 'en'
                  ? 'Original (EN)'
                  : 'Sem Texto / Arte';
              addPoster(
                `https://image.tmdb.org/t/p/w500${p.file_path}`,
                `${langLabel} #${idx + 1}`
              );
            }
          });
        }
      } catch (err) {
        console.warn('Erro ao buscar galeria de pôsteres do TMDB:', err);
      }
    }
  }

  if (posters.length < 6 && title && title.trim().length >= 2) {
    try {
      const fallbackUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(
        title.trim()
      )}&country=BR&media=movie&entity=movie&limit=8`;
      const res = await fetch(fallbackUrl);
      if (res.ok) {
        const data = await res.json();
        (data.results || []).forEach((item) => {
          if (item.artworkUrl100) {
            addPoster(
              item.artworkUrl100.replace('100x100bb', '600x900bb'),
              item.trackName || 'Alternativo'
            );
          }
        });
      }
    } catch {
      // ignora
    }
  }

  return posters;
}

/**
 * Busca filmes Em Cartaz (now_playing) e Próximas Estreias (upcoming) no Brasil pelo TMDB
 */
export async function fetchBrazilCinemaReleases(category = 'upcoming') {
  const auth = getTmdbAuth();
  if (!auth) return [];

  try {
    const endpoint = category === 'now_playing' ? 'now_playing' : 'upcoming';
    const url = `https://api.themoviedb.org/3/movie/${endpoint}?${auth.authParam}language=pt-BR&region=BR&page=1`;
    const res = await fetch(url, { headers: auth.headers });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || [])
      .filter((item) => item.poster_path)
      .map((item) => ({
        tmdbId: item.id,
        title: item.title || item.original_title,
        originalTitle: item.original_title || item.title,
        releaseDate: item.release_date || '',
        posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        overview: item.overview || '',
      }));
  } catch (err) {
    console.warn('Erro ao buscar estreias do TMDB:', err);
    return [];
  }
}
