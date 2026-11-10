import { createClient } from '@supabase/supabase-js';
import { getAppConfig, isSupabaseConfigured } from './config';

const LOCAL_VISITS_KEY = 'cinelog_visits_v1';
const REWATCH_TAG_TOKEN = '[REWATCH]';

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

/**
 * Serializa uma lista de companhias para salvar no banco (compatível com coluna text)
 */
export function serializeCompanions(companionsList) {
  const clean = parseCompanions(companionsList);
  if (clean.length === 0) return 'Sozinho';
  return [...new Set(clean)].join(', ');
}

/**
 * Codifica/decodifica a flag manual de "Já assisti antes na vida" usando o campo notes
 * para manter 100% de compatibilidade com a tabela atual do Supabase sem exigir ALTER TABLE.
 */
export function parseNotesAndManualRewatch(rawNotes, explicitManualFlag) {
  const str = String(rawNotes || '');
  const hasToken = str.includes(REWATCH_TAG_TOKEN);
  const cleanNotes = str.replace(REWATCH_TAG_TOKEN, '').trim();
  return {
    isManualRewatch: Boolean(explicitManualFlag || hasToken),
    cleanNotes,
  };
}

export function encodeNotesWithManualRewatch(cleanNotes, isManualRewatch) {
  const base = String(cleanNotes || '')
    .replace(REWATCH_TAG_TOKEN, '')
    .trim();
  if (isManualRewatch) {
    return base ? `${REWATCH_TAG_TOKEN} ${base}` : REWATCH_TAG_TOKEN;
  }
  return base;
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

  // Superior a 1 ano após o lançamento oficial (tanto por diferença de anos > 1 quanto > 365 dias)
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
 * Enriquecimento automático e retroativo de todas as idas cadastradas:
 * - isPreRelease (PRÉ): quando visit_date < release_date
 * - isReexibicao (RE): quando visit_date é superior a 1 ano após o lançamento oficial
 * - isRewatch (↻): quando já foi visto antes no sistema OU marcado manualmente como reassistido na vida
 * - isManualRewatch: flag individual se o usuário marcou que já tinha visto antes fora do sistema
 * - companionsList: array com cada pessoa que foi junto ([] se Sozinho)
 * - isAlone: true (SOZ) quando foi Sozinho, false (ACO) quando foi acompanhado
 */
export function enrichVisitsWithAutoFlags(rawVisits) {
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

    const { isManualRewatch, cleanNotes } = parseNotesAndManualRewatch(
      visit.notes,
      visit.is_manual_rewatch
    );

    const companionsList = parseCompanions(visit.company);
    const isAlone = companionsList.length === 0;

    enrichedMap.set(visit.id, {
      ...visit,
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
 * Busca todas as idas (do Supabase se configurado, mantendo cache local)
 */
export async function fetchCinemaVisits() {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('cinema_visits')
      .select('*')
      .order('visit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao buscar no Supabase, usando dados locais:', error.message);
      return {
        visits: enrichVisitsWithAutoFlags(getLocalVisitsRaw()),
        cloudActive: false,
        cloudError: error.message,
      };
    }

    saveLocalVisitsRaw(data || []);
    return {
      visits: enrichVisitsWithAutoFlags(data || []),
      cloudActive: true,
      cloudError: null,
    };
  }

  return {
    visits: enrichVisitsWithAutoFlags(getLocalVisitsRaw()),
    cloudActive: false,
    cloudError: null,
  };
}

/**
 * Cria uma nova ida ao cinema
 */
export async function createCinemaVisit(visitPayload) {
  const encodedNotes = encodeNotesWithManualRewatch(
    visitPayload.notes,
    visitPayload.is_manual_rewatch
  );

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
 * Atualiza uma ida existente
 */
export async function updateCinemaVisit(id, visitPayload) {
  const encodedNotes = encodeNotesWithManualRewatch(
    visitPayload.notes,
    visitPayload.is_manual_rewatch
  );

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
 * Extrai sugestões inteligentes de Locais e Companhias individuais ordenadas pelas mais frequentes
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
