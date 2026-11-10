const CONFIG_STORAGE_KEY = 'cinelog_config_v1';
const DEVICE_UNLOCK_KEY = 'cinelog_device_unlocked_v1';

/**
 * Limpa e corrige automaticamente a URL do Supabase caso o usuário tenha colado
 * o link do painel (supabase.com/dashboard/project/xyz) ou um caminho extra após .supabase.co
 */
export function normalizeSupabaseUrl(rawUrl) {
  const str = String(rawUrl || '').trim();
  if (!str) return '';

  // Caso 1: Usuário colou a URL da barra de endereços do Dashboard do Supabase
  // Ex: https://supabase.com/dashboard/project/abcdefghijklmnop/settings/api
  const dashboardMatch = str.match(/supabase\.com\/dashboard\/project\/([a-z0-9-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // Caso 2: Usuário colou https://abcdefghijklmnop.supabase.co/rest/v1/... ou com barra no final
  const projectMatch = str.match(/(https?:\/\/[a-z0-9-]+\.supabase\.co)/i);
  if (projectMatch && projectMatch[1]) {
    return projectMatch[1].toLowerCase();
  }

  return str.replace(/\/+$/, '');
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

export function isDeviceUnlocked() {
  try {
    return localStorage.getItem(DEVICE_UNLOCK_KEY) === 'true';
  } catch {
    return false;
  }
}

export function unlockDeviceWithPin(inputPin) {
  const { appPin } = getAppConfig();
  if (String(inputPin).trim() === String(appPin).trim()) {
    localStorage.setItem(DEVICE_UNLOCK_KEY, 'true');
    return true;
  }
  return false;
}

export function lockDevice() {
  localStorage.removeItem(DEVICE_UNLOCK_KEY);
}
