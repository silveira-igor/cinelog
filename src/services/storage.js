import { createClient } from '@supabase/supabase-js';
import {
  getAppConfig,
  isSupabaseConfigured,
  normalizeUsername,
  markProfileUnlockedOnDevice,
  setActiveProfileUsername,
} from './config';

const LOCAL_VISITS_KEY = 'cinelog_visits_v1';
const MOVIE_META_CACHE_KEY = 'cinelog_movie_meta_cache_v2';
const REWATCH_TAG_TOKEN = '[REWATCH]';
const PROFILE_ROW_MARKER = '__CINELOG_PROFILE__';

let supabaseInstance = null;
let lastUrl = '';
let lastKey = '';

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  const { supabaseUrl, supabaseAnonKey } = getAppConfig();
  if (!supabaseInstance || lastUrl !== supabaseUrl || lastKey !== supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    lastUrl = supabaseUrl;
    lastKey = supabaseAnonKey;
  }
  return supabaseInstance;
}

function getLocalVisitsRaw() {
  try {
    const raw = localStorage.getItem(LOCAL_VISITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalVisitsRaw(visits) {
  try {
    localStorage.setItem(LOCAL_VISITS_KEY, JSON.stringify(visits));
  } catch (e) {
    console.error('Erro ao salvar cache local:', e);
  }
}

/**
 * Cache local de metadados do TMDB (runtime, genres, director, cast, studio) para enriquecer
 * automaticamente filmes já cadastrados anteriormente no banco!
 */
export function getMovieMetaCache() {
  try {
    const rawV1 = localStorage.getItem('cinelog_movie_meta_cache_v1');
    const rawV2 = localStorage.getItem(MOVIE_META_CACHE_KEY);
    const parsedV1 = rawV1 ? JSON.parse(rawV1) : {};
    const parsedV2 = rawV2 ? JSON.parse(rawV2) : {};
    const merged = { ...parsedV1 };
    for (const [k, v] of Object.entries(parsedV2)) {
      merged[k] = {
        ...(parsedV1[k] || {}),
        ...v,
        runtime: Number(v.runtime || parsedV1[k]?.runtime || 0),
      };
    }
    return merged;
  } catch {
    return {};
  }
}

export function saveMovieMetaToCache(movieKey, meta) {
  if (!movieKey || !meta) return;
  try {
    const current = getMovieMetaCache();
    const prev = current[movieKey] || {};
    current[movieKey] = {
      runtime: Number(meta.runtime || prev.runtime || 0),
      genres:
        Array.isArray(meta.genres) && meta.genres.length > 0
          ? meta.genres
          : prev.genres || [],
      director: String(meta.director || prev.director || ''),
      cast:
        Array.isArray(meta.cast) && meta.cast.length > 0
          ? meta.cast.slice(0, 3)
          : prev.cast || [],
      studio: String(meta.studio || prev.studio || ''),
      checked: true,
    };
    localStorage.setItem(MOVIE_META_CACHE_KEY, JSON.stringify(current));
  } catch {
    // ignora
  }
}

/**
 * Filmes de exemplo exibidos quando um visitante abre o site pela primeira vez
 * sem estar conectado a nenhuma conta (@usuario).
 */
export function getDemoVisits() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');

  const rawDemos = [
    {
      id: 'demo-1',
      tmdb_id: 157336,
      title: 'Interestelar (Exemplo)',
      original_title: 'Interstellar',
      poster_url: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      release_date: '2014-11-06',
      visit_date: `${y}-${m}-08`,
      ticket_origin: 'Club',
      session_format: 'IMAX',
      audio_type: 'Legendado',
      price_paid: 42.5,
      cinema_location: 'Cinemark Shopping Eldorado',
      company: 'Ana, Lucas',
      rating: 5.0,
      notes:
        '[REWATCH] [META:{"runtime":169,"genres":["Ficção científica","Drama","Aventura"],"director":"Christopher Nolan","cast":["Matthew McConaughey","Anne Hathaway","Jessica Chastain"],"studio":"Warner Bros.","seat":"Sala IMAX - Fileira G12"}] Som absurdo no IMAX, arrepio na cena da acoplagem!',
      created_at: `${y}-${m}-08T21:00:00Z`,
      isDemo: true,
    },
    {
      id: 'demo-2',
      tmdb_id: 693134,
      title: 'Duna: Parte Dois (Exemplo)',
      original_title: 'Dune: Part Two',
      poster_url: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg',
      release_date: `${y}-${m}-05`,
      visit_date: `${y}-${m}-03`,
      ticket_origin: 'Voucher',
      session_format: 'XD',
      audio_type: 'Legendado',
      price_paid: 28.0,
      cinema_location: 'Cinemark Cidade Jardim',
      company: 'Sozinho',
      rating: 4.5,
      notes:
        '[META:{"runtime":166,"genres":["Ficção científica","Aventura"],"director":"Denis Villeneuve","cast":["Timothée Chalamet","Zendaya","Rebecca Ferguson"],"studio":"Warner Bros.","seat":"Sala XD 1 - Poltrona H08"}] Sessão de pré-estreia lotada.',
      created_at: `${y}-${m}-03T20:00:00Z`,
      isDemo: true,
    },
    {
      id: 'demo-3',
      tmdb_id: 1000837,
      title: 'Ainda Estou Aqui (Exemplo)',
      original_title: 'Ainda Estou Aqui',
      poster_url: 'https://image.tmdb.org/t/p/w500/qNLMPY3KLrYgTX2QZ5iEwwO1Rz.jpg',
      release_date: '2024-11-07',
      visit_date: `${y}-${m}-01`,
      ticket_origin: 'Comprado',
      session_format: '2D',
      audio_type: 'Original',
      price_paid: 55.0,
      cinema_location: 'Espaço Itaú de Cinema',
      company: 'Mariana',
      rating: 5.0,
      notes:
        '[META:{"runtime":135,"genres":["Drama","História"],"director":"Walter Salles","cast":["Fernanda Torres","Selton Mello","Fernanda Montenegro"],"studio":"Globo Filmes","seat":"Sala 2 - F06"}] Atuação histórica da Fernanda Torres.',
      created_at: `${y}-${m}-01T19:00:00Z`,
      isDemo: true,
    },
    {
      id: 'demo-4',
      tmdb_id: 872585,
      title: 'Oppenheimer (Exemplo)',
      original_title: 'Oppenheimer',
      poster_url: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      release_date: '2023-07-20',
      visit_date: `${y}-01-15`,
      ticket_origin: 'Club',
      session_format: 'IMAX',
      audio_type: 'Legendado',
      price_paid: 35.0,
      cinema_location: 'Cinépolis JK Iguatemi',
      company: 'Sozinho',
      rating: 4.5,
      notes:
        '[REWATCH] [META:{"runtime":180,"genres":["Drama","História"],"director":"Christopher Nolan","cast":["Cillian Murphy","Emily Blunt","Matt Damon"],"studio":"Universal","seat":"Sala IMAX - E10"}]',
      created_at: `${y}-01-15T21:00:00Z`,
      isDemo: true,
    },
  ];

  return enrichVisitsWithAutoFlags(rawDemos, '');
}

export function parseCompanions(companyValue) {
  if (!companyValue) return [];
  if (Array.isArray(companyValue)) {
    return companyValue
      .map((c) => String(c || '').trim())
      .filter((c) => c && c.toLowerCase() !== 'sozinho');
  }

  const str = String(companyValue).trim();
  if (!str || str.toLowerCase() === 'sozinho') return [];

  if (str.startsWith('[')) {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed
          .map((c) => String(c || '').trim())
          .filter((c) => c && c.toLowerCase() !== 'sozinho');
      }
    } catch {
      // continua com split por vírgula
    }
  }

  return str
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c && c.toLowerCase() !== 'sozinho');
}

export function serializeCompanions(companionsList) {
  const clean = parseCompanions(companionsList);
  if (clean.length === 0) return 'Sozinho';
  return [...new Set(clean)].join(', ');
}

/**
 * Extrai metadados embutidos no campo notes ([USER:username], [REWATCH] e [META:{...}])
 * mantendo o comentário livre (cleanNotes) limpo!
 */
export function parseNotesMetadata(rawNotes, explicitManualFlag, explicitOwner) {
  let str = String(rawNotes || '');

  // 1. Extrai dono [USER:xxx]
  let ownerUsername = normalizeUsername(explicitOwner || '');
  const userMatch = str.match(/\[USER:([a-z0-9_.-]+)\]/i);
  if (userMatch && userMatch[1]) {
    ownerUsername = normalizeUsername(userMatch[1]);
    str = str.replace(userMatch[0], '');
  }

  // 2. Extrai [META:{...}]
  let movieMeta = {
    runtime: 0,
    genres: [],
    director: '',
    cast: [],
    studio: '',
    seat: '',
  };
  const metaMatch = str.match(/\[META:(\{.*?\})\]/);
  if (metaMatch && metaMatch[1]) {
    try {
      const parsed = JSON.parse(metaMatch[1]);
      movieMeta = {
        runtime: Number(parsed.runtime || 0),
        genres: Array.isArray(parsed.genres) ? parsed.genres : [],
        director: String(parsed.director || ''),
        cast: Array.isArray(parsed.cast) ? parsed.cast.slice(0, 3) : [],
        studio: String(parsed.studio || ''),
        seat: String(parsed.seat || ''),
      };
    } catch {
      // ignora JSON inválido
    }
    str = str.replace(metaMatch[0], '');
  }

  // 3. Extrai flag de Reassistido manual [REWATCH]
  const hasRewatchToken = str.includes(REWATCH_TAG_TOKEN);
  str = str.replace(REWATCH_TAG_TOKEN, '').trim();

  return {
    ownerUsername,
    isManualRewatch: Boolean(explicitManualFlag || hasRewatchToken),
    movieMeta,
    cleanNotes: str,
  };
}

export function encodeNotesMetadata({
  cleanNotes,
  isManualRewatch,
  ownerUsername,
  movieMeta,
}) {
  const base = String(cleanNotes || '')
    .replace(/\[USER:[a-z0-9_.-]+\]/gi, '')
    .replace(/\[META:\{.*?\}\]/g, '')
    .replace(REWATCH_TAG_TOKEN, '')
    .trim();

  const prefixes = [];
  const normUser = normalizeUsername(ownerUsername);
  if (normUser) {
    prefixes.push(`[USER:${normUser}]`);
  }
  if (isManualRewatch) {
    prefixes.push(REWATCH_TAG_TOKEN);
  }
  if (
    movieMeta &&
    (Number(movieMeta.runtime) > 0 ||
      (movieMeta.genres && movieMeta.genres.length > 0) ||
      movieMeta.director ||
      (movieMeta.cast && movieMeta.cast.length > 0) ||
      movieMeta.studio ||
      movieMeta.seat)
  ) {
    const compactMeta = {
      runtime: Number(movieMeta.runtime || 0),
      genres: Array.isArray(movieMeta.genres) ? movieMeta.genres.slice(0, 3) : [],
      director: String(movieMeta.director || '').trim(),
      cast: Array.isArray(movieMeta.cast) ? movieMeta.cast.slice(0, 3) : [],
      studio: String(movieMeta.studio || '').trim(),
      seat: String(movieMeta.seat || '').trim(),
    };
    prefixes.push(`[META:${JSON.stringify(compactMeta)}]`);
  }

  return [...prefixes, base].filter(Boolean).join(' ');
}

export function computeReleaseTimingFlags(visitDateStr, releaseDateStr) {
  if (!visitDateStr || !releaseDateStr) {
    return { isPreRelease: false, isReexibicao: false };
  }

  const vStr = String(visitDateStr).slice(0, 10);
  const rStr = String(releaseDateStr).slice(0, 10);

  const isPreRelease = vStr < rStr;
  if (isPreRelease) {
    return { isPreRelease: true, isReexibicao: false };
  }

  const visitYear = Number(vStr.slice(0, 4));
  const releaseYear = Number(rStr.slice(0, 4));
  const vTime = new Date(`${vStr}T12:00:00`).getTime();
  const rTime = new Date(`${rStr}T12:00:00`).getTime();
  const daysAfterRelease =
    !Number.isNaN(vTime) && !Number.isNaN(rTime)
      ? (vTime - rTime) / (1000 * 60 * 60 * 24)
      : 0;

  const isReexibicao = visitYear - releaseYear > 1 || daysAfterRelease > 365;

  return { isPreRelease: false, isReexibicao };
}

export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractProfilesAndMovieRows(allRows) {
  const profilesMap = new Map();
  const movieRows = [];

  const sortedByCreation = [...allRows].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );

  for (const row of sortedByCreation) {
    if (row.title === PROFILE_ROW_MARKER) {
      const username = normalizeUsername(row.original_title);
      if (!username) continue;
      let meta = {};
      try {
        meta = JSON.parse(row.notes || '{}');
      } catch {
        meta = {};
      }
      profilesMap.set(username, {
        id: row.id,
        username,
        displayName: meta.displayName || username,
        pin: String(meta.pin || '1234'),
        annualGoal: Number(meta.annualGoal || 24),
        watchlist: Array.isArray(meta.watchlist) ? meta.watchlist : [],
        oscarChecklist: meta.oscarChecklist && typeof meta.oscarChecklist === 'object' ? meta.oscarChecklist : {},
        oscarCustomNominees: meta.oscarCustomNominees && typeof meta.oscarCustomNominees === 'object' ? meta.oscarCustomNominees : {},
        createdAt: row.created_at,
        rawMeta: meta,
        isPrimary: profilesMap.size === 0,
      });
    } else {
      movieRows.push(row);
    }
  }

  const primaryProfileUsername =
    profilesMap.size > 0 ? [...profilesMap.keys()][0] : '';

  const countsByUser = new Map();
  for (const m of movieRows) {
    const { ownerUsername } = parseNotesMetadata(m.notes);
    const effectiveOwner = ownerUsername || primaryProfileUsername;
    if (effectiveOwner) {
      countsByUser.set(effectiveOwner, (countsByUser.get(effectiveOwner) || 0) + 1);
    }
  }

  const profiles = [...profilesMap.values()].map((p) => ({
    ...p,
    movieCount: countsByUser.get(p.username) || 0,
  }));

  return {
    profiles,
    primaryProfileUsername,
    movieRows,
  };
}

export function enrichVisitsWithAutoFlags(rawVisits, primaryProfileUsername = '') {
  const metaCache = getMovieMetaCache();

  const chronological = [...rawVisits].sort((a, b) => {
    const dateDiff = String(a.visit_date || '').localeCompare(String(b.visit_date || ''));
    if (dateDiff !== 0) return dateDiff;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });

  const seenCountByMovie = new Map();
  const enrichedMap = new Map();

  for (const visit of chronological) {
    const movieKey = visit.tmdb_id
      ? `tmdb:${visit.tmdb_id}`
      : `title:${normalizeTitle(visit.title)}`;

    const previousCount = seenCountByMovie.get(movieKey) || 0;
    const currentCount = previousCount + 1;
    seenCountByMovie.set(movieKey, currentCount);

    const { isPreRelease, isReexibicao } = computeReleaseTimingFlags(
      visit.visit_date,
      visit.release_date
    );

    const { ownerUsername, isManualRewatch, movieMeta, cleanNotes } =
      parseNotesMetadata(visit.notes, visit.is_manual_rewatch, visit.ownerUsername);

    const cached = metaCache[movieKey] || {};
    const runtime = Number(movieMeta.runtime || cached.runtime || 0);
    const genres =
      movieMeta.genres && movieMeta.genres.length > 0
        ? movieMeta.genres
        : cached.genres || [];
    const director = movieMeta.director || cached.director || '';
    const cast =
      movieMeta.cast && movieMeta.cast.length > 0
        ? movieMeta.cast
        : cached.cast || [];
    const studio = movieMeta.studio || cached.studio || '';
    const seat = movieMeta.seat || '';

    const effectiveOwner = ownerUsername || primaryProfileUsername;
    const companionsList = parseCompanions(visit.company);
    const isAlone = companionsList.length === 0;

    enrichedMap.set(visit.id, {
      ...visit,
      movieKey,
      ownerUsername: effectiveOwner,
      price_paid: Number(visit.price_paid || 0),
      rating: Number(visit.rating || 0),
      companionsList,
      isAlone,
      company: serializeCompanions(companionsList),
      notes: cleanNotes,
      seat,
      runtime,
      genres,
      director,
      cast,
      studio,
      metaChecked: Boolean(cached.checked),
      isManualRewatch,
      isPreRelease,
      isReexibicao,
      isRewatch: previousCount > 0 || isManualRewatch,
      watchNumber: isManualRewatch && previousCount === 0 ? 2 : currentCount,
    });
  }

  return [...rawVisits]
    .map((v) => enrichedMap.get(v.id) || v)
    .sort((a, b) => {
      const dateDiff = String(b.visit_date || '').localeCompare(String(a.visit_date || ''));
      if (dateDiff !== 0) return dateDiff;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
}

export async function fetchCinemaVisits(requestedUsername = '') {
  const targetUser = normalizeUsername(requestedUsername);

  if (!targetUser) {
    return {
      visits: getDemoVisits(),
      profiles: [],
      activeUsername: '',
      annualGoal: 24,
      watchlist: [],
      isDemoMode: true,
      cloudActive: isSupabaseConfigured(),
      cloudError: null,
    };
  }

  const supabase = getSupabaseClient();
  let allRows = [];
  let cloudActive = false;
  let cloudError = null;

  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .select('*')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar no Supabase, usando dados locais:', error.message);
      allRows = getLocalVisitsRaw();
      cloudError = error.message;
    } else {
      allRows = data || [];
      saveLocalVisitsRaw(allRows);
      cloudActive = true;
    }
  } else {
    allRows = getLocalVisitsRaw();
  }

  const { profiles, primaryProfileUsername, movieRows } =
    extractProfilesAndMovieRows(allRows);

  const activeProfileObj = profiles.find((p) => p.username === targetUser);

  const userMovieRows = movieRows.filter((row) => {
    const { ownerUsername } = parseNotesMetadata(row.notes);
    const effectiveOwner = ownerUsername || primaryProfileUsername;
    return effectiveOwner === targetUser;
  });

  return {
    visits: enrichVisitsWithAutoFlags(userMovieRows, primaryProfileUsername),
    profiles,
    activeUsername: targetUser,
    annualGoal: activeProfileObj ? activeProfileObj.annualGoal : 24,
    watchlist: activeProfileObj ? activeProfileObj.watchlist : [],
    oscarChecklist: activeProfileObj ? activeProfileObj.oscarChecklist || {} : {},
    oscarCustomNominees: activeProfileObj ? activeProfileObj.oscarCustomNominees || {} : {},
    primaryProfileUsername,
    isDemoMode: false,
    cloudActive,
    cloudError,
  };
}

async function fetchAllProfilesInternal() {
  const supabase = getSupabaseClient();
  let allRows = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      allRows = data;
      saveLocalVisitsRaw(allRows);
    } else {
      allRows = getLocalVisitsRaw();
    }
  } else {
    allRows = getLocalVisitsRaw();
  }

  return extractProfilesAndMovieRows(allRows);
}

export async function updateProfilePreferences(
  username,
  { annualGoal, watchlist, oscarChecklist, oscarCustomNominees }
) {
  const cleanUser = normalizeUsername(username);
  if (!cleanUser) return null;

  const { profiles } = await fetchAllProfilesInternal();
  const found = profiles.find((p) => p.username === cleanUser);
  if (!found) return null;

  const updatedMeta = {
    ...found.rawMeta,
    displayName: found.displayName,
    pin: found.pin,
    annualGoal: annualGoal !== undefined ? Number(annualGoal) : found.annualGoal,
    watchlist: watchlist !== undefined ? watchlist : found.watchlist,
    oscarChecklist:
      oscarChecklist !== undefined ? oscarChecklist : found.rawMeta?.oscarChecklist || {},
    oscarCustomNominees:
      oscarCustomNominees !== undefined
        ? oscarCustomNominees
        : found.rawMeta?.oscarCustomNominees || {},
  };

  const newNotes = JSON.stringify(updatedMeta);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .update({ notes: newNotes })
      .eq('id', found.id)
      .select()
      .single();

    if (!error && data) {
      const local = getLocalVisitsRaw().map((r) => (r.id === found.id ? data : r));
      saveLocalVisitsRaw(local);
    }
  } else {
    const local = getLocalVisitsRaw().map((r) =>
      r.id === found.id ? { ...r, notes: newNotes } : r
    );
    saveLocalVisitsRaw(local);
  }

  return updatedMeta;
}

export async function createUserProfile({ username, displayName, pin }) {
  const cleanUser = normalizeUsername(username);
  if (!cleanUser || cleanUser.length < 2) {
    throw new Error('Escolha um @usuario válido (mínimo 2 letras/números).');
  }
  const cleanPin = String(pin || '').trim();
  if (cleanPin.length < 3) {
    throw new Error('Escolha um PIN de pelo menos 3 ou 4 dígitos.');
  }

  const { profiles } = await fetchAllProfilesInternal();
  const exists = profiles.some((p) => p.username === cleanUser);
  if (exists) {
    throw new Error(`O usuário @${cleanUser} já está em uso. Escolha outro ou faça login!`);
  }

  const profileRowPayload = {
    tmdb_id: null,
    title: PROFILE_ROW_MARKER,
    original_title: cleanUser,
    poster_url: '',
    release_date: null,
    visit_date: new Date().toISOString().slice(0, 10),
    ticket_origin: 'Club',
    session_format: '2D',
    audio_type: 'Legendado',
    price_paid: 0,
    cinema_location: '',
    company: 'Sozinho',
    rating: 0,
    notes: JSON.stringify({
      displayName: String(displayName || cleanUser).trim(),
      pin: cleanPin,
      annualGoal: 24,
      watchlist: [],
      createdAt: new Date().toISOString(),
    }),
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .insert([profileRowPayload])
      .select()
      .single();

    if (error) throw new Error(`Erro ao criar conta no Supabase: ${error.message}`);

    const local = getLocalVisitsRaw();
    saveLocalVisitsRaw([data, ...local]);
  } else {
    const localItem = {
      ...profileRowPayload,
      id: crypto.randomUUID ? crypto.randomUUID() : `prof-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    const local = getLocalVisitsRaw();
    saveLocalVisitsRaw([localItem, ...local]);
  }

  setActiveProfileUsername(cleanUser);
  markProfileUnlockedOnDevice(cleanUser);

  return cleanUser;
}

export async function authenticateProfileWithPin(username, inputPin) {
  const cleanUser = normalizeUsername(username);
  const { profiles } = await fetchAllProfilesInternal();
  const foundProfile = profiles.find((p) => p.username === cleanUser);

  if (!foundProfile) {
    throw new Error(
      `A conta @${cleanUser} ainda não existe. Clique na aba "Criar Nova Conta" acima para criá-la!`
    );
  }

  const expectedPin = String(foundProfile.pin || getAppConfig().appPin).trim();
  if (String(inputPin || '').trim() === expectedPin) {
    setActiveProfileUsername(cleanUser);
    markProfileUnlockedOnDevice(cleanUser);
    return true;
  }
  return false;
}

export async function createCinemaVisit(visitPayload, ownerUsername) {
  const activeUser = normalizeUsername(ownerUsername);
  if (!activeUser) {
    throw new Error('Entre na sua conta (@usuario) antes de salvar um filme.');
  }

  const encodedNotes = encodeNotesMetadata({
    cleanNotes: visitPayload.notes,
    isManualRewatch: visitPayload.is_manual_rewatch,
    ownerUsername: activeUser,
    movieMeta: {
      runtime: visitPayload.runtime,
      genres: visitPayload.genres,
      director: visitPayload.director,
      cast: visitPayload.cast,
      studio: visitPayload.studio,
      seat: visitPayload.seat,
    },
  });

  const cleanPayload = {
    tmdb_id: visitPayload.tmdb_id || null,
    title: String(visitPayload.title || '').trim(),
    original_title: String(visitPayload.original_title || visitPayload.title || '').trim(),
    poster_url: String(visitPayload.poster_url || '').trim(),
    release_date: visitPayload.release_date || null,
    visit_date: visitPayload.visit_date || new Date().toISOString().slice(0, 10),
    ticket_origin: visitPayload.ticket_origin || 'Club',
    session_format: visitPayload.session_format || '2D',
    audio_type: visitPayload.audio_type || 'Legendado',
    price_paid: Number(visitPayload.price_paid || 0),
    cinema_location: String(visitPayload.cinema_location || '').trim(),
    company: serializeCompanions(visitPayload.companions ?? visitPayload.company),
    rating: Number(visitPayload.rating || 0),
    notes: encodedNotes,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .insert([cleanPayload])
      .select()
      .single();

    if (error) throw new Error(`Erro no Supabase: ${error.message}`);

    const local = getLocalVisitsRaw();
    saveLocalVisitsRaw([data, ...local]);
    return data;
  }

  const localItem = {
    ...cleanPayload,
    id: crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  const local = getLocalVisitsRaw();
  saveLocalVisitsRaw([localItem, ...local]);
  return localItem;
}

export async function updateCinemaVisit(id, visitPayload, ownerUsername) {
  const activeUser = normalizeUsername(
    ownerUsername || visitPayload.ownerUsername
  );
  const encodedNotes = encodeNotesMetadata({
    cleanNotes: visitPayload.notes,
    isManualRewatch: visitPayload.is_manual_rewatch,
    ownerUsername: activeUser,
    movieMeta: {
      runtime: visitPayload.runtime,
      genres: visitPayload.genres,
      director: visitPayload.director,
      cast: visitPayload.cast,
      studio: visitPayload.studio,
      seat: visitPayload.seat,
    },
  });

  const cleanPayload = {
    tmdb_id: visitPayload.tmdb_id || null,
    title: String(visitPayload.title || '').trim(),
    original_title: String(visitPayload.original_title || visitPayload.title || '').trim(),
    poster_url: String(visitPayload.poster_url || '').trim(),
    release_date: visitPayload.release_date || null,
    visit_date: visitPayload.visit_date,
    ticket_origin: visitPayload.ticket_origin || 'Club',
    session_format: visitPayload.session_format || '2D',
    audio_type: visitPayload.audio_type || 'Legendado',
    price_paid: Number(visitPayload.price_paid || 0),
    cinema_location: String(visitPayload.cinema_location || '').trim(),
    company: serializeCompanions(visitPayload.companions ?? visitPayload.company),
    rating: Number(visitPayload.rating || 0),
    notes: encodedNotes,
  };

  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .update(cleanPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro no Supabase: ${error.message}`);

    const local = getLocalVisitsRaw().map((item) => (item.id === id ? data : item));
    saveLocalVisitsRaw(local);
    return data;
  }

  const local = getLocalVisitsRaw().map((item) =>
    item.id === id ? { ...item, ...cleanPayload } : item
  );
  saveLocalVisitsRaw(local);
  return local.find((i) => i.id === id);
}

export async function deleteCinemaVisit(id) {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('cinema_visits').delete().eq('id', id);
    if (error) throw new Error(`Erro no Supabase: ${error.message}`);
  }
  const local = getLocalVisitsRaw().filter((item) => item.id !== id);
  saveLocalVisitsRaw(local);
}

export function getSmartSuggestions(visits) {
  const locationCounts = new Map();
  const companyCounts = new Map();

  for (const v of visits) {
    if (v.isDemo) continue;
    const loc = String(v.cinema_location || '').trim();
    if (loc) {
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
    }

    const people = parseCompanions(v.companionsList || v.company);
    for (const person of people) {
      companyCounts.set(person, (companyCounts.get(person) || 0) + 1);
    }
  }

  const locations = [...locationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 8);

  const companies = [...companyCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 10);

  return { locations, companies };
}
