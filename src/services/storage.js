import { createClient } from '@supabase/supabase-js';
import {
  getAppConfig,
  isSupabaseConfigured,
  normalizeUsername,
  markProfileUnlockedOnDevice,
  setActiveProfileUsername,
} from './config';

const LOCAL_VISITS_KEY = 'cinelog_visits_v1';
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
 * Converte o campo company (string ou array) em uma lista de nomes individuais.
 * Retorna [] quando foi "Sozinho".
 */
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
 * Extrai metadados embutidos no campo notes ([USER:username] e [REWATCH])
 * mantendo 100% de compatibilidade com a tabela atual do Supabase sem exigir ALTER TABLE!
 */
export function parseNotesMetadata(rawNotes, explicitManualFlag, explicitOwner) {
  let str = String(rawNotes || '');

  // 1. Extrai dono do registro [USER:xxx]
  let ownerUsername = normalizeUsername(explicitOwner || '');
  const userMatch = str.match(/\[USER:([a-z0-9_.-]+)\]/i);
  if (userMatch && userMatch[1]) {
    ownerUsername = normalizeUsername(userMatch[1]);
    str = str.replace(userMatch[0], '');
  }

  // 2. Extrai flag de Reassistido manual [REWATCH]
  const hasRewatchToken = str.includes(REWATCH_TAG_TOKEN);
  str = str.replace(REWATCH_TAG_TOKEN, '').trim();

  return {
    ownerUsername,
    isManualRewatch: Boolean(explicitManualFlag || hasRewatchToken),
    cleanNotes: str,
  };
}

export function encodeNotesMetadata({ cleanNotes, isManualRewatch, ownerUsername }) {
  const base = String(cleanNotes || '')
    .replace(/\[USER:[a-z0-9_.-]+\]/gi, '')
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
  return [...prefixes, base].filter(Boolean).join(' ');
}

/**
 * Calcula se a ida foi Pré-estreia (PRÉ) ou Reexibição (RE - mais de 1 ano após o lançamento)
 */
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

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Separa as linhas de perfil (__CINELOG_PROFILE__) das linhas de idas ao cinema
 */
function extractProfilesAndMovieRows(allRows) {
  const profilesMap = new Map();
  const movieRows = [];

  // Ordena mais antigos primeiro para saber quem é o primeiro perfil (dono original)
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
        createdAt: row.created_at,
        isPrimary: profilesMap.size === 0,
      });
    } else {
      movieRows.push(row);
    }
  }

  const primaryProfileUsername =
    profilesMap.size > 0 ? [...profilesMap.keys()][0] : '';

  // Conta quantos filmes cada perfil tem (filmes antigos sem tag pertencem ao 1º perfil)
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

/**
 * Enriquecimento automático e retroativo das idas de um perfil
 */
export function enrichVisitsWithAutoFlags(rawVisits, primaryProfileUsername = '') {
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

    const { ownerUsername, isManualRewatch, cleanNotes } = parseNotesMetadata(
      visit.notes,
      visit.is_manual_rewatch,
      visit.ownerUsername
    );

    const effectiveOwner = ownerUsername || primaryProfileUsername;
    const companionsList = parseCompanions(visit.company);
    const isAlone = companionsList.length === 0;

    enrichedMap.set(visit.id, {
      ...visit,
      ownerUsername: effectiveOwner,
      price_paid: Number(visit.price_paid || 0),
      rating: Number(visit.rating || 0),
      companionsList,
      isAlone,
      company: serializeCompanions(companionsList),
      notes: cleanNotes,
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

/**
 * Busca todas as idas e perfis do Supabase (filtrando os filmes pelo @usuario ativo)
 */
export async function fetchCinemaVisits(requestedUsername = '') {
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

  const targetUser = normalizeUsername(requestedUsername) || primaryProfileUsername;

  // Filtra apenas os filmes que pertencem ao @usuario selecionado
  // (Filmes antigos sem tag [USER:...] pertencem automaticamente ao 1º perfil criado)
  const userMovieRows = movieRows.filter((row) => {
    const { ownerUsername } = parseNotesMetadata(row.notes);
    const effectiveOwner = ownerUsername || primaryProfileUsername;
    if (!targetUser) return true;
    return effectiveOwner === targetUser;
  });

  return {
    visits: enrichVisitsWithAutoFlags(userMovieRows, primaryProfileUsername),
    profiles,
    activeUsername: targetUser,
    primaryProfileUsername,
    untaggedMoviesCount: movieRows.filter(
      (r) => !parseNotesMetadata(r.notes).ownerUsername
    ).length,
    cloudActive,
    cloudError,
  };
}

/**
 * Cria um novo Perfil (@usuario + PIN) direto no Supabase sem precisar de nova tabela!
 */
export async function createUserProfile({ username, displayName, pin }) {
  const cleanUser = normalizeUsername(username);
  if (!cleanUser || cleanUser.length < 2) {
    throw new Error('Escolha um @usuario válido (mínimo 2 letras/números).');
  }
  const cleanPin = String(pin || '').trim();
  if (cleanPin.length < 3) {
    throw new Error('Escolha um PIN de pelo menos 3 ou 4 dígitos.');
  }

  const state = await fetchCinemaVisits();
  const exists = state.profiles.some((p) => p.username === cleanUser);
  if (exists) {
    throw new Error(`O perfil @${cleanUser} já existe. Faça login com o PIN dele!`);
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

    if (error) throw new Error(`Erro ao criar perfil no Supabase: ${error.message}`);

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

  // Já ativa e libera este aparelho para o perfil recém-criado
  setActiveProfileUsername(cleanUser);
  markProfileUnlockedOnDevice(cleanUser);

  return cleanUser;
}

/**
 * Verifica o PIN de um @usuario e libera o aparelho permanentemente para aquela conta
 */
export async function authenticateProfileWithPin(username, inputPin) {
  const cleanUser = normalizeUsername(username);
  const state = await fetchCinemaVisits(cleanUser);
  const foundProfile = state.profiles.find((p) => p.username === cleanUser);

  if (!foundProfile) {
    throw new Error(`Perfil @${cleanUser} não encontrado.`);
  }

  const expectedPin = String(foundProfile.pin || getAppConfig().appPin).trim();
  if (String(inputPin || '').trim() === expectedPin) {
    setActiveProfileUsername(cleanUser);
    markProfileUnlockedOnDevice(cleanUser);
    return true;
  }
  return false;
}

/**
 * Cria uma nova ida ao cinema vinculada ao @usuario ativo
 */
export async function createCinemaVisit(visitPayload, ownerUsername) {
  const activeUser = normalizeUsername(ownerUsername);
  const encodedNotes = encodeNotesMetadata({
    cleanNotes: visitPayload.notes,
    isManualRewatch: visitPayload.is_manual_rewatch,
    ownerUsername: activeUser,
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

/**
 * Atualiza uma ida existente preservando o @usuario dono
 */
export async function updateCinemaVisit(id, visitPayload, ownerUsername) {
  const activeUser = normalizeUsername(
    ownerUsername || visitPayload.ownerUsername
  );
  const encodedNotes = encodeNotesMetadata({
    cleanNotes: visitPayload.notes,
    isManualRewatch: visitPayload.is_manual_rewatch,
    ownerUsername: activeUser,
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

/**
 * Exclui uma ida
 */
export async function deleteCinemaVisit(id) {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('cinema_visits').delete().eq('id', id);
    if (error) throw new Error(`Erro no Supabase: ${error.message}`);
  }
  const local = getLocalVisitsRaw().filter((item) => item.id !== id);
  saveLocalVisitsRaw(local);
}

/**
 * Extrai sugestões inteligentes de Locais e Companhias individuais do perfil atual
 */
export function getSmartSuggestions(visits) {
  const locationCounts = new Map();
  const companyCounts = new Map();

  for (const v of visits) {
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
