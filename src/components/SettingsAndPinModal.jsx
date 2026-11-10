import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Cloud,
  Key,
  Check,
  X,
  Copy,
  Database,
  ShieldCheck,
  UserPlus,
  UserCheck,
  Eye,
  AtSign,
} from 'lucide-react';
import {
  getAppConfig,
  saveAppConfig,
  normalizeUsername,
  isProfileUnlockedOnDevice,
  lockProfileOnDevice,
  setActiveProfileUsername,
} from '../services/config';
import {
  createUserProfile,
  authenticateProfileWithPin,
} from '../services/storage';

const SQL_SCHEMA_SNIPPET = `create table if not exists public.cinema_visits (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer,
  title text not null,
  original_title text,
  poster_url text,
  release_date date,
  visit_date date not null default current_date,
  ticket_origin text not null default 'Club',
  session_format text not null default '2D',
  audio_type text not null default 'Legendado',
  price_paid numeric(10,2) not null default 0,
  cinema_location text default '',
  company text default 'Sozinho',
  rating numeric(2,1) not null default 0,
  notes text default '',
  created_at timestamptz not null default now()
);

alter table public.cinema_visits enable row level security;

create policy "Acesso total cinema_visits"
  on public.cinema_visits for all
  using (true)
  with check (true);`;

/**
 * Modal de Perfis (@usuario + PIN) — Permite Entrar, Trocar de Conta, Espiar ou Criar Novo Perfil
 */
export function ProfileAuthModal({
  isOpen,
  onClose,
  profiles = [],
  activeUsername = '',
  onProfileChanged,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [selectedUser, setSelectedUser] = useState('');
  const [pin, setPin] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPin('');
    if (profiles.length === 0) {
      setMode('register');
    } else {
      setMode('login');
      setSelectedUser(activeUsername || profiles[0]?.username || '');
    }
  }, [isOpen, profiles, activeUsername]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanTarget = normalizeUsername(selectedUser);
    if (!cleanTarget) {
      setError('Selecione ou digite um @usuario.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const ok = await authenticateProfileWithPin(cleanTarget, pin);
      if (ok) {
        onProfileChanged(cleanTarget, true);
        onClose();
      } else {
        setError('PIN incorreto para este @usuario.');
      }
    } catch (err) {
      setError(err.message || 'Erro ao validar PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const createdUsername = await createUserProfile({
        username: newUsername,
        displayName: newDisplayName || newUsername,
        pin: newPin,
      });
      onProfileChanged(createdUsername, true);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao criar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReadOnly = (username) => {
    const clean = normalizeUsername(username);
    if (!clean) return;
    setActiveProfileUsername(clean);
    onProfileChanged(clean, isProfileUnlockedOnDevice(clean));
    onClose();
  };

  return (
    <div className="lb-modal-backdrop" onClick={onClose}>
      <div
        className="lb-modal-card lb-modal-small"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div>
            <span className="lb-eyebrow">CONTAS E PERFIS (@USUARIO + PIN)</span>
            <h2>
              {mode === 'login' ? 'Entrar ou Trocar Perfil' : 'Criar Meu Perfil'}
            </h2>
          </div>
          <button type="button" className="lb-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="lb-modal-form">
          {/* Abas Entrar vs Criar Novo Perfil */}
          <div className="lb-segmented">
            <button
              type="button"
              className={`lb-seg-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              <UserCheck size={14} /> Já tenho @usuario
            </button>
            <button
              type="button"
              className={`lb-seg-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              <UserPlus size={14} /> Criar Novo Perfil
            </button>
          </div>

          {error && <div className="lb-alert-error">{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="lb-profile-subform">
              {profiles.length > 0 && (
                <div className="lb-field-group">
                  <label className="lb-label">Perfis Cadastrados na Nuvem</label>
                  <div className="lb-profiles-list">
                    {profiles.map((p) => {
                      const isCurrent = selectedUser === p.username;
                      const unlockedHere = isProfileUnlockedOnDevice(p.username);
                      return (
                        <div
                          key={p.username}
                          className={`lb-profile-row-item ${isCurrent ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedUser(p.username);
                            if (unlockedHere) {
                              setActiveProfileUsername(p.username);
                              onProfileChanged(p.username, true);
                              onClose();
                            }
                          }}
                        >
                          <div className="lb-profile-row-info">
                            <strong>@{p.username}</strong>
                            <span>
                              {p.displayName} • {p.movieCount}{' '}
                              {p.movieCount === 1 ? 'ida' : 'idas'}
                            </span>
                          </div>

                          <div className="lb-profile-row-actions">
                            {unlockedHere ? (
                              <span className="lb-status-pill unlocked">
                                Liberado neste aparelho
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="lb-btn-small-outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReadOnly(p.username);
                                }}
                                title="Apenas ver a estante deste perfil sem editar"
                              >
                                <Eye size={12} /> Espiar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="lb-field-group">
                <label className="lb-label">
                  <AtSign size={14} /> Usuário (@usuario)
                </label>
                <input
                  type="text"
                  className="lb-input"
                  placeholder="Ex: igor"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(normalizeUsername(e.target.value))}
                  required
                />
              </div>

              <div className="lb-field-group">
                <label className="lb-label">
                  <Lock size={14} /> PIN do Perfil @{selectedUser || 'usuario'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  className="lb-input lb-pin-input"
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                />
                <span className="lb-label-subtle">
                  Digitando o PIN uma vez, seu perfil fica liberado para sempre neste
                  aparelho.
                </span>
              </div>

              <div className="lb-modal-footer">
                <button type="button" className="lb-btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="lb-btn-primary" disabled={loading}>
                  <Unlock size={16} />
                  {loading ? 'Verificando...' : 'Entrar e Liberar Aparelho'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateProfile} className="lb-profile-subform">
              <p className="lb-helper-text">
                Crie seu próprio <strong>@usuario</strong> e <strong>PIN</strong>. Seus
                filmes e estatísticas ficam separados na nuvem!
                {profiles.length === 0 && (
                  <>
                    {' '}
                    Como este será o <strong>1º perfil criado</strong>, os filmes que já
                    estavam cadastrados serão vinculados a você automaticamente!
                  </>
                )}
              </p>

              <div className="lb-two-cols">
                <div className="lb-field-group">
                  <label className="lb-label">
                    <AtSign size={14} /> Escolha seu @usuario
                  </label>
                  <input
                    type="text"
                    className="lb-input"
                    placeholder="Ex: igor"
                    value={newUsername}
                    onChange={(e) => setNewUsername(normalizeUsername(e.target.value))}
                    required
                  />
                </div>

                <div className="lb-field-group">
                  <label className="lb-label">Seu Nome</label>
                  <input
                    type="text"
                    className="lb-input"
                    placeholder="Ex: Igor Silveira"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div className="lb-field-group">
                <label className="lb-label">
                  <Lock size={14} /> Crie seu PIN Secreto (4 ou mais dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  className="lb-input lb-pin-input"
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  required
                />
              </div>

              <div className="lb-modal-footer">
                <button type="button" className="lb-btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="lb-btn-primary" disabled={loading}>
                  <UserPlus size={16} />
                  {loading ? 'Criando...' : 'Criar Meu Perfil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function CloudSettingsModal({
  isOpen,
  onClose,
  onSaved,
  activeUsername,
  deviceUnlocked,
  onDeviceLockToggle,
}) {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [appPin, setAppPin] = useState('1234');
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const cfg = getAppConfig();
    setSupabaseUrl(cfg.supabaseUrl);
    setSupabaseAnonKey(cfg.supabaseAnonKey);
    setTmdbApiKey(cfg.tmdbApiKey);
    setAppPin(cfg.appPin || '1234');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    saveAppConfig({
      supabaseUrl,
      supabaseAnonKey,
      tmdbApiKey,
      appPin,
    });
    onSaved();
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_SNIPPET);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="lb-modal-backdrop" onClick={onClose}>
      <div
        className="lb-modal-card lb-modal-large"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div>
            <span className="lb-eyebrow">NUVEM & INTEGRAÇÕES</span>
            <h2>Configurar Supabase e TMDB</h2>
          </div>
          <button type="button" className="lb-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="lb-modal-form">
          <div className="lb-settings-box">
            <div className="lb-settings-box-header">
              <Database size={16} />
              <strong>1. Banco na Nuvem (Supabase)</strong>
            </div>
            <p className="lb-helper-text">
              Você pode colar suas chaves abaixo ou defini-las no arquivo{' '}
              <code>.env</code> / variáveis da Vercel (<code>VITE_SUPABASE_URL</code> e{' '}
              <code>VITE_SUPABASE_ANON_KEY</code>).
            </p>

            <div className="lb-field-group">
              <label className="lb-label">Supabase Project URL</label>
              <input
                type="url"
                className="lb-input"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div className="lb-field-group">
              <label className="lb-label">Supabase Anon Public Key</label>
              <input
                type="text"
                className="lb-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
              />
            </div>

            <div className="lb-sql-snippet-bar">
              <span>Script SQL para criar a tabela no Supabase:</span>
              <button
                type="button"
                className="lb-btn-copy"
                onClick={handleCopySql}
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                {copiedSql ? 'SQL Copiado!' : 'Copiar SQL da Tabela'}
              </button>
            </div>
          </div>

          <div className="lb-settings-box">
            <div className="lb-settings-box-header">
              <Key size={16} />
              <strong>2. Chave do TMDB (The Movie Database)</strong>
            </div>
            <div className="lb-field-group">
              <label className="lb-label">TMDB API Key (ou Read Access Token)</label>
              <input
                type="text"
                className="lb-input"
                placeholder="Cole sua API Key do TMDB aqui..."
                value={tmdbApiKey}
                onChange={(e) => setTmdbApiKey(e.target.value)}
              />
            </div>
          </div>

          {activeUsername && (
            <div className="lb-settings-box">
              <div className="lb-settings-box-header">
                <ShieldCheck size={16} />
                <strong>3. Sessão de @{activeUsername} neste Aparelho</strong>
              </div>
              <div className="lb-device-status-row">
                <span
                  className={`lb-status-pill ${deviceUnlocked ? 'unlocked' : 'locked'}`}
                >
                  {deviceUnlocked
                    ? `@${activeUsername} Liberado`
                    : `@${activeUsername} em Modo Leitura`}
                </span>
                {deviceUnlocked && (
                  <button
                    type="button"
                    className="lb-btn-small-outline"
                    onClick={() => {
                      lockProfileOnDevice(activeUsername);
                      onDeviceLockToggle();
                    }}
                  >
                    Sair / Bloquear @{activeUsername} neste aparelho
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="lb-modal-footer">
            <button type="button" className="lb-btn-secondary" onClick={onClose}>
              Fechar
            </button>
            <button type="submit" className="lb-btn-primary">
              <Cloud size={16} /> Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
