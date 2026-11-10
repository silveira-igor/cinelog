const CONFIG_STORAGE_KEY = 'cinelog_config_v1';
const ACTIVE_PROFILE_KEY = 'cinelog_active_profile_v1';
const UNLOCKED_PROFILES_KEY = 'cinelog_unlocked_profiles_v1';

/**
 * Limpa e corrige automaticamente a URL do Supabase caso o usuário tenha colado
 * o link do painel (supabase.com/dashboard/project/xyz) ou um caminho extra após .supabase.co
 */
export function normalizeSupabaseUrl(rawUrl) {
  const str = String(rawUrl || '').trim();
  if (!str) return '';

  const dashboardMatch = str.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  const projectMatch = str.match(/(https?:\/\/[a-z0-9-]+\.supabase\.co)/i);
  if (projectMatch && projectMatch[1]) {
    return projectMatch[1].toLowerCase();
  }

  return str.replace(/\/+$/, '');
}

export function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_.-]/g, '');
}

export function getAppConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler config local:', e);
  }

  const rawSupabaseUrl = saved.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';

  return {
    supabaseUrl: normalizeSupabaseUrl(rawSupabaseUrl),
    supabaseAnonKey: (saved.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
    tmdbApiKey: (saved.tmdbApiKey || import.meta.env.VITE_TMDB_API_KEY || '').trim(),
    appPin: (saved.appPin || import.meta.env.VITE_APP_PIN || '1234').trim(),
  };
}

export function saveAppConfig(newConfig) {
  const current = getAppConfig();
  const merged = {
    supabaseUrl: normalizeSupabaseUrl(newConfig.supabaseUrl ?? current.supabaseUrl),
    supabaseAnonKey: (newConfig.supabaseAnonKey ?? current.supabaseAnonKey).trim(),
    tmdbApiKey: (newConfig.tmdbApiKey ?? current.tmdbApiKey).trim(),
    appPin: (newConfig.appPin ?? current.appPin).trim() || '1234',
  };
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseAnonKey } = getAppConfig();
  return (
    Boolean(supabaseUrl && supabaseAnonKey) &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('seu-projeto')
  );
}

/**
 * Gerenciamento do Perfil Ativo (@usuario) neste dispositivo
 */
export function getActiveProfileUsername() {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return normalizeUsername(saved);
  } catch {
    return '';
  }
}

export function setActiveProfileUsername(username) {
  const clean = normalizeUsername(username);
  if (clean) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, clean);
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }
  return clean;
}

/**
 * Gerenciamento de quais @usuarios já estão liberados com PIN neste dispositivo para sempre
 */
export function getUnlockedProfilesMap() {
  try {
    const raw = localStorage.getItem(UNLOCKED_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isProfileUnlockedOnDevice(username) {
  const clean = normalizeUsername(username);
  if (!clean) return false;
  const map = getUnlockedProfilesMap();
  return Boolean(map[clean]);
}

export function markProfileUnlockedOnDevice(username) {
  const clean = normalizeUsername(username);
  if (!clean) return;
  const map = getUnlockedProfilesMap();
  map[clean] = true;
  localStorage.setItem(UNLOCKED_PROFILES_KEY, JSON.stringify(map));
}

export function lockProfileOnDevice(username) {
  const clean = normalizeUsername(username);
  if (!clean) return;
  const map = getUnlockedProfilesMap();
  delete map[clean];
  localStorage.setItem(UNLOCKED_PROFILES_KEY, JSON.stringify(map));
}
