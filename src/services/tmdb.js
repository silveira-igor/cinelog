import { getAppConfig } from './config';

/**
 * Busca filmes pelo título usando a API oficial do TMDB (em pt-BR) quando a chave
 * está configurada, ou usa fallback automático (iTunes Movie API BR).
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

/**
 * Busca dezenas de pôsteres alternativos do filme no TMDB (igual ao seletor de pôsteres do Letterboxd)
 * mais alternativas do catálogo caso não haja tmdbId inicial.
 */
export async function fetchMoviePosters({ tmdbId, title }) {
  const { tmdbApiKey } = getAppConfig();
  const posters = [];
  const seenUrls = new Set();

  const addPoster = (url, label) => {
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    posters.push({ url, label });
  };

  if (tmdbApiKey && !tmdbApiKey.includes('sua-chave')) {
    const isBearerToken = tmdbApiKey.length > 60;
    const headers = isBearerToken
      ? { Authorization: `Bearer ${tmdbApiKey}`, accept: 'application/json' }
      : { accept: 'application/json' };
    const authParam = isBearerToken ? '' : `api_key=${encodeURIComponent(tmdbApiKey)}&`;

    let resolvedTmdbId = tmdbId;

    // Se o filme ainda não tinha tmdbId (ou tinha ID do iTunes), descobre o ID do TMDB pelo título
    if (!resolvedTmdbId || Number(resolvedTmdbId) > 50000000) {
      if (title && title.trim().length >= 2) {
        try {
          const searchUrl = `https://api.themoviedb.org/3/search/movie?${authParam}query=${encodeURIComponent(
            title.trim()
          )}&language=pt-BR`;
          const sRes = await fetch(searchUrl, { headers });
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.results && sData.results.length > 0) {
              resolvedTmdbId = sData.results[0].id;
              // Já adiciona também os pôsteres principais dos resultados semelhantes
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
    }

    // Busca a galeria completa de pôsteres do filme no TMDB (/movie/{id}/images)
    if (resolvedTmdbId) {
      try {
        const imgUrl = `https://api.themoviedb.org/3/movie/${resolvedTmdbId}/images?${authParam}include_image_language=pt,en,null`;
        const imgRes = await fetch(imgUrl, { headers });
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

  // Complementa com resultados de alta resolução do catálogo alternativo se houver poucos pôsteres
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
      // ignora erro de fallback
    }
  }

  return posters;
}
