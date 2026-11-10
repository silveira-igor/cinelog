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
 * Normaliza o nome da produtora/distribuidora para marcas conhecidas
 * (Disney, Pixar, Marvel, Warner Bros., Universal, Sony, A24, MUBI, Paramount, Amazon MGM, etc.)
 */
function normalizeStudioName(productionCompanies = []) {
  if (!Array.isArray(productionCompanies) || productionCompanies.length === 0) {
    return '';
  }

  const knownBrands = [
    { pattern: /pixar/i, label: 'Pixar' },
    { pattern: /marvel/i, label: 'Marvel Studios' },
    { pattern: /lucasfilm/i, label: 'Lucasfilm' },
    { pattern: /walt disney|disney/i, label: 'Disney' },
    { pattern: /20th century|twentieth century|searchlight/i, label: '20th Century / Searchlight' },
    { pattern: /warner bros|new line|dc studios|dc films/i, label: 'Warner Bros.' },
    { pattern: /universal|focus features|illumination|dreamworks/i, label: 'Universal' },
    { pattern: /columbia|sony|tristar/i, label: 'Sony Pictures' },
    { pattern: /paramount/i, label: 'Paramount' },
    { pattern: /\ba24\b/i, label: 'A24' },
    { pattern: /\bmubi\b/i, label: 'MUBI' },
    { pattern: /\bneon\b/i, label: 'NEON' },
    { pattern: /amazon|mgm|metro-goldwyn-mayer/i, label: 'Amazon MGM' },
    { pattern: /apple/i, label: 'Apple Original Films' },
    { pattern: /netflix/i, label: 'Netflix' },
    { pattern: /lionsgate/i, label: 'Lionsgate' },
    { pattern: /studio ghibli/i, label: 'Studio Ghibli' },
    { pattern: /globo filmes/i, label: 'Globo Filmes' },
    { pattern: /o2 filmes|videofilmes|rt features|conspiracao/i, label: 'Cinema Nacional' },
  ];

  for (const brand of knownBrands) {
    const found = productionCompanies.find((c) => brand.pattern.test(c.name || ''));
    if (found) return brand.label;
  }

  return productionCompanies[0]?.name || '';
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
          overview: item.overview || '',
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
        cast: [],
        studio: '',
        overview: item.longDescription || item.shortDescription || '',
        source: 'Catálogo BR',
      };
    });
  } catch (err) {
    console.error('Erro na busca de filmes:', err);
    return [];
  }
}

/**
 * Busca automaticamente Duração (minutos), Gêneros, Diretor, 3 Atores Principais,
 * Produtora/Estúdio e Sinopse do filme no TMDB.
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
          const cast = (data.credits?.cast || [])
            .slice(0, 3)
            .map((c) => c.name)
            .filter(Boolean);
          const studio = normalizeStudioName(data.production_companies || []);

          return {
            tmdbId: data.id,
            title: data.title || data.original_title || title,
            originalTitle: data.original_title || data.title || '',
            runtime,
            genres,
            director: directors.slice(0, 2).join(', '),
            cast,
            studio,
            overview: data.overview || '',
            tmdbRating: data.vote_average ? Number(data.vote_average).toFixed(1) : '',
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
            cast: [],
            studio: '',
            overview: item.longDescription || item.shortDescription || '',
            tmdbRating: '',
          };
        }
      }
    } catch {
      // ignora
    }
  }

  return {
    tmdbId: tmdbId || null,
    runtime: 0,
    genres: [],
    director: '',
    cast: [],
    studio: '',
    overview: '',
    tmdbRating: '',
  };
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

// Idiomas de mercados domésticos que praticamente não entram no circuito brasileiro de cinema
const BLOCKED_DOMESTIC_LANGS = new Set([
  'hi', 'ta', 'te', 'ml', 'kn', 'pa', 'bn', 'mr', 'ur', 'gu', // Índia / Sul da Ásia
  'tl', 'id', 'ms', 'th', 'vi', 'my', 'km',                   // Sudeste Asiático local
  'tr', 'ar', 'fa', 'he', 'el',                               // Oriente Médio / Turquia / Grécia local
  'ru', 'uk', 'cs', 'hu', 'ro', 'bg', 'sr', 'hr', 'sk', 'sl', // Leste Europeu local
]);

/**
 * Filtra filmes relevantes das Próximas Estreias (meio-termo calibrado):
 * - Bloqueia filmes indianos aleatórios e mercados domésticos que não chegam ao Brasil.
 * - Mantém documentários comentados em inglês/português/francês (ex: You Can See Everything),
 *   cotados para premiações/festivais (ex: Cliff Booth, Minotaure, I Play Rocky) e grandes estreias.
 * - Exige popularidade e metadados mínimos para barrar filmes internacionais muito nichados.
 */
function isRelevantUpcomingMovie(item, todayStr, isFromBrCalendar = false) {
  if (!item || !item.poster_path) return false;
  const rel = item.release_date || '';
  if (!rel || rel <= todayStr) return false;

  const titleLower = String(item.title || item.original_title || '').toLowerCase();
  if (
    titleLower.includes('dia ocho') ||
    titleLower.includes('día ocho') ||
    titleLower.includes('fogareu') ||
    titleLower.includes('fogaréu')
  ) {
    return false;
  }

  const lang = String(item.original_language || '').toLowerCase();
  if (BLOCKED_DOMESTIC_LANGS.has(lang)) {
    return false;
  }

  const pop = Number(item.popularity || 0);
  const votes = Number(item.vote_count || 0);
  const hasBackdrop = Boolean(item.backdrop_path);
  const hasOverview = Boolean(item.overview && item.overview.trim().length >= 15);
  const genres = Array.isArray(item.genre_ids) ? item.genre_ids : [];
  const isDocumentary = genres.includes(99);

  // Documentários: aceita apenas se for do eixo EN/PT/FR e tiver repercussão mínima (como You Can See Everything)
  if (isDocumentary) {
    if (['en', 'pt', 'fr'].includes(lang)) {
      return pop >= 1.15 || votes >= 3;
    }
    return pop >= 5.0 && hasBackdrop;
  }

  // Inglês (Hollywood, A24, Neon, UK, premiações): exige buzz real para cortar indies obscuros de VOD
  if (lang === 'en') {
    if (isFromBrCalendar) return pop >= 1.4 || votes >= 5;
    return pop >= 2.5 || (pop >= 1.6 && hasBackdrop);
  }

  // Francês (Cannes / circuito de arte como Minotaure):
  if (lang === 'fr') {
    if (isFromBrCalendar) return pop >= 1.5 || votes >= 5;
    return pop >= 2.3 && (hasBackdrop || votes >= 5);
  }

  // Português (Cinema nacional): exige divulgação mínima
  if (lang === 'pt') {
    return (pop >= 2.4 && hasBackdrop && hasOverview) || pop >= 4.2 || votes >= 15;
  }

  // Japonês e Coreano (Animes de cinema e grandes estreias coreanas): barra lançamentos locais pequenos
  if (lang === 'ja' || lang === 'ko') {
    if (isFromBrCalendar) return pop >= 2.5 && hasBackdrop;
    return pop >= 4.8 && hasBackdrop;
  }

  // Espanhol, Italiano, Alemão, Nórdicos, Chinês: exige alto buzz internacional para não vir filme nichado
  return pop >= 6.0 && hasBackdrop && (hasOverview || votes >= 20);
}

function mapTmdbReleaseItem(item) {
  return {
    tmdbId: item.id,
    title: item.title || item.original_title,
    originalTitle: item.original_title || item.title,
    releaseDate: item.release_date || '',
    posterUrl: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    overview: item.overview || '',
    popularity: Number(item.popularity || 0),
    tmdbRating:
      item.vote_average && Number(item.vote_count || 0) >= 5
        ? Number(item.vote_average).toFixed(1)
        : '',
  };
}

// Cache em memória do pool curado de estreias para paginação rápida
let cachedUpcomingPool = {
  timestamp: 0,
  itemsByDate: [],
  itemsByPopularity: [],
};

/**
 * Busca os filmes Em Cartaz no Brasil (now_playing) e Próximas Estreias (upcoming) pelo TMDB.
 * - Em Cartaz Agora (`now_playing`): usa o endpoint oficial `/movie/now_playing?language=pt-BR&region=BR`
 *   para mostrar exatamente os 20 filmes em cartaz nos cinemas brasileiros.
 * - Próximas Estreias (`upcoming`): NÃO exclui documentários (gênero 99, permitindo "You Can See Everything")
 *   e combina os filmes mais aguardados/comentados dos próximos 14 meses com o calendário de estreias.
 */
export async function fetchBrazilCinemaReleases(
  category = 'upcoming',
  page = 1,
  sortMode = 'date'
) {
  const auth = getTmdbAuth();
  if (!auth) return { results: [], hasMore: false };

  try {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // EM CARTAZ AGORA: Endpoint oficial de filmes em cartaz nos cinemas do Brasil (region=BR)
    if (category === 'now_playing') {
      const url = `https://api.themoviedb.org/3/movie/now_playing?${auth.authParam}language=pt-BR&region=BR&page=1`;
      const res = await fetch(url, { headers: auth.headers });
      if (!res.ok) return { results: [], hasMore: false };
      const data = await res.json();
      const results = (data.results || [])
        .filter((item) => item.poster_path)
        .slice(0, 20)
        .map(mapTmdbReleaseItem);

      return { results, hasMore: false };
    }

    // PRÓXIMAS ESTREIAS: Pool curado (inclui documentários, cotados a premiações e blockbusters)
    const CACHE_TTL = 5 * 60 * 1000;
    if (
      Date.now() - cachedUpcomingPool.timestamp > CACHE_TTL ||
      cachedUpcomingPool.itemsByDate.length === 0
    ) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const next14Months = new Date(now.getTime() + 425 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      // 1) Filmes mais comentados/aguardados nos próximos 14 meses (5 páginas filtradas por idioma/relevância)
      const globalPages = [1, 2, 3, 4, 5].map((p) => {
        const url =
          `https://api.themoviedb.org/3/discover/movie?${auth.authParam}` +
          `language=pt-BR&sort_by=popularity.desc&include_adult=false&include_video=false` +
          `&without_genres=10770` +
          `&primary_release_date.gte=${tomorrow}&primary_release_date.lte=${next14Months}` +
          `&page=${p}`;
        return fetch(url, { headers: auth.headers })
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }));
      });

      // 2) Estreias agendadas no Brasil (inclui documentários e filmes de festivais recentes que chegam ao BR)
      const brPages = [1, 2, 3].map((p) => {
        const url =
          `https://api.themoviedb.org/3/discover/movie?${auth.authParam}` +
          `language=pt-BR&region=BR&sort_by=popularity.desc&include_adult=false&include_video=false` +
          `&without_genres=10770` +
          `&release_date.gte=${tomorrow}&release_date.lte=${next14Months}` +
          `&primary_release_date.gte=${twelveMonthsAgo}` +
          `&page=${p}`;
        return fetch(url, { headers: auth.headers })
          .then((r) => (r.ok ? r.json() : { results: [] }))
          .catch(() => ({ results: [] }));
      });

      const [globalResults, brResults] = await Promise.all([
        Promise.all(globalPages),
        Promise.all(brPages),
      ]);

      const seenIds = new Set();
      const curated = [];

      // Processa primeiro o calendário BR (isFromBrCalendar = true) e depois complementa com o global (isFromBrCalendar = false)
      for (const pData of brResults) {
        for (const item of pData.results || []) {
          if (!item || seenIds.has(item.id)) continue;
          if (!isRelevantUpcomingMovie(item, todayStr, true)) continue;
          seenIds.add(item.id);
          curated.push(mapTmdbReleaseItem(item));
        }
      }

      for (const pData of globalResults) {
        for (const item of pData.results || []) {
          if (!item || seenIds.has(item.id)) continue;
          if (!isRelevantUpcomingMovie(item, todayStr, false)) continue;
          seenIds.add(item.id);
          curated.push(mapTmdbReleaseItem(item));
        }
      }

      const byPopularity = [...curated].sort(
        (a, b) => (b.popularity || 0) - (a.popularity || 0)
      );
      const byDate = [...curated].sort((a, b) => {
        const da = a.releaseDate || '9999-12-31';
        const db = b.releaseDate || '9999-12-31';
        if (da !== db) return da.localeCompare(db);
        return (b.popularity || 0) - (a.popularity || 0);
      });

      cachedUpcomingPool = {
        timestamp: Date.now(),
        itemsByDate: byDate,
        itemsByPopularity: byPopularity,
      };
    }

    const activePool =
      sortMode === 'popularity'
        ? cachedUpcomingPool.itemsByPopularity
        : cachedUpcomingPool.itemsByDate;

    const PAGE_SIZE = 20;
    const startIdx = (page - 1) * PAGE_SIZE;
    const endIdx = page * PAGE_SIZE;
    const pageSlice = activePool.slice(startIdx, endIdx);

    return {
      results: pageSlice,
      hasMore: endIdx < activePool.length,
    };
  } catch (err) {
    console.warn('Erro ao buscar estreias do TMDB:', err);
    return { results: [], hasMore: false };
  }
}
