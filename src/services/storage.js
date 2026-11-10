import { createClient } from '@supabase/supabase-js';
import { getAppConfig, isSupabaseConfigured } from './config';

const LOCAL_VISITS_KEY = 'cinelog_visits_v1';

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
 * Normaliza o título para comparação de Rewatch quando não há tmdb_id
 */
function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Enriquecimento automático de todas as idas:
 * - isPreRelease (Pré-estreia): quando visit_date < release_date
 * - isRewatch (Rewatch ↻): quando já existe uma ida anterior para o mesmo filme
 * - watchNumber: 1ª vez, 2ª vez, 3ª vez...
 * - companionsList: array com cada pessoa que foi junto ([] se Sozinho)
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

    const hasBothDates = Boolean(visit.visit_date && visit.release_date);
    const isPreRelease =
      hasBothDates && String(visit.visit_date) < String(visit.release_date);

    const companionsList = parseCompanions(visit.company);

    enrichedMap.set(visit.id, {
      ...visit,
      price_paid: Number(visit.price_paid || 0),
      rating: Number(visit.rating || 0),
      companionsList,
      company: serializeCompanions(companionsList),
      isPreRelease,
      isRewatch: previousCount > 0,
      watchNumber: currentCount,
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
    notes: String(visitPayload.notes || '').trim(),
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
    notes: String(visitPayload.notes || '').trim(),
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
