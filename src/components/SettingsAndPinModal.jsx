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
} from 'lucide-react';
import {
  getAppConfig,
  saveAppConfig,
  unlockDeviceWithPin,
  lockDevice,
} from '../services/config';

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

export function PinUnlockModal({ isOpen, onClose, onUnlocked }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (unlockDeviceWithPin(pin)) {
      onUnlocked();
      onClose();
    } else {
      setError('PIN incorreto. (Dica: o PIN padrão inicial é 1234)');
    }
  };

  return (
    <div className="lb-modal-backdrop" onClick={onClose}>
      <div
        className="lb-modal-card lb-modal-small"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div>
            <span className="lb-eyebrow">SEGURANÇA DO DISPOSITIVO</span>
            <h2>Liberar Dispositivo</h2>
          </div>
          <button type="button" className="lb-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lb-modal-form">
          <p className="lb-helper-text">
            Digite seu PIN uma única vez neste celular ou computador. Ele ficará
            salvo para sempre neste aparelho para você adicionar ou editar idas sem
            precisar digitar novamente.
          </p>

          {error && <div className="lb-alert-error">{error}</div>}

          <div className="lb-field-group">
            <label className="lb-label">
              <Lock size={14} /> PIN de Segurança
            </label>
            <input
              type="password"
              inputMode="numeric"
              className="lb-input lb-pin-input"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="lb-modal-footer">
            <button type="button" className="lb-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="lb-btn-primary">
              <Unlock size={16} /> Liberar este Aparelho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CloudSettingsModal({
  isOpen,
  onClose,
  onSaved,
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
            <h2>Configurar Supabase, TMDB e PIN</h2>
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
            <p className="lb-helper-text">
              Mesmo sem chave o app já busca pôsteres automaticamente! Colando sua
              API Key do TMDB (v3 ou Read Token), a busca usa a base oficial do TMDB
              em português.
            </p>
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

          <div className="lb-settings-box">
            <div className="lb-settings-box-header">
              <ShieldCheck size={16} />
              <strong>3. PIN de Segurança & Status deste Aparelho</strong>
            </div>
            <div className="lb-two-cols">
              <div className="lb-field-group">
                <label className="lb-label">PIN para Liberar Novos Dispositivos</label>
                <input
                  type="text"
                  className="lb-input"
                  value={appPin}
                  onChange={(e) => setAppPin(e.target.value)}
                />
              </div>

              <div className="lb-field-group">
                <label className="lb-label">Status neste navegador</label>
                <div className="lb-device-status-row">
                  <span className={`lb-status-pill ${deviceUnlocked ? 'unlocked' : 'locked'}`}>
                    {deviceUnlocked ? 'Aparelho Liberado' : 'Modo Leitura (Bloqueado)'}
                  </span>
                  {deviceUnlocked && (
                    <button
                      type="button"
                      className="lb-btn-small-outline"
                      onClick={() => {
                        lockDevice();
                        onDeviceLockToggle();
                      }}
                    >
                      Bloquear Aparelho
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

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
