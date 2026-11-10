const CONFIG_STORAGE_KEY = 'cinelog_config_v1';
const DEVICE_UNLOCK_KEY = 'cinelog_device_unlocked_v1';

export function getAppConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler config local:', e);
  }

  return {
    supabaseUrl: (saved.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '').trim(),
    supabaseAnonKey: (saved.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim(),
    tmdbApiKey: (saved.tmdbApiKey || import.meta.env.VITE_TMDB_API_KEY || '').trim(),
    appPin: (saved.appPin || import.meta.env.VITE_APP_PIN || '1234').trim(),
  };
}

export function saveAppConfig(newConfig) {
  const current = getAppConfig();
  const merged = {
    supabaseUrl: (newConfig.supabaseUrl ?? current.supabaseUrl).trim(),
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
