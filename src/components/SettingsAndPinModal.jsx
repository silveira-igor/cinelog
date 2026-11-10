import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  X,
  UserPlus,
  UserCheck,
  AtSign,
  LogOut,
} from 'lucide-react';
import {
  normalizeUsername,
  lockProfileOnDevice,
  setActiveProfileUsername,
} from '../services/config';
import {
  createUserProfile,
  authenticateProfileWithPin,
} from '../services/storage';

/**
 * Modal de Contas (@usuario + PIN) — Privado (não lista contas de terceiros)
 */
export function ProfileAuthModal({
  isOpen,
  onClose,
  activeUsername = '',
  onProfileChanged,
}) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [loginUser, setLoginUser] = useState('');
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
    setMode('login');
    setLoginUser(activeUsername || '');
  }, [isOpen, activeUsername]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const cleanTarget = normalizeUsername(loginUser);
    if (!cleanTarget) {
      setError('Digite seu @usuario.');
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
        setError('PIN incorreto para esta conta.');
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
      setError(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (activeUsername) {
      lockProfileOnDevice(activeUsername);
    }
    setActiveProfileUsername('');
    onProfileChanged('', false);
    onClose();
  };

  return (
    <div className="lb-modal-backdrop" onClick={onClose}>
      <div
        className="lb-modal-card lb-modal-small"
        style={{ maxWidth: '460px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div>
            <span className="lb-eyebrow">ACESSO RÁPIDO À SUA CONTA</span>
            <h2>
              {mode === 'login' ? 'Entrar na Minha Conta' : 'Criar Nova Conta'}
            </h2>
          </div>
          <button type="button" className="lb-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="lb-modal-form">
          {/* Se já estiver conectado a uma conta neste aparelho, mostra opção de Sair */}
          {activeUsername && (
            <div className="lb-current-account-banner">
              <div>
                <span>Conectado neste aparelho como</span>
                <strong>@{activeUsername}</strong>
              </div>
              <button
                type="button"
                className="lb-btn-small-outline"
                onClick={handleLogout}
              >
                <LogOut size={13} /> Sair da Conta
              </button>
            </div>
          )}

          {/* Abas Entrar vs Criar Nova Conta */}
          <div className="lb-segmented">
            <button
              type="button"
              className={`lb-seg-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              <UserCheck size={14} /> Entrar (@usuario)
            </button>
            <button
              type="button"
              className={`lb-seg-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              <UserPlus size={14} /> Criar Nova Conta
            </button>
          </div>

          {error && <div className="lb-alert-error">{error}</div>}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="lb-profile-subform">
              <div className="lb-field-group">
                <label className="lb-label">
                  <AtSign size={14} /> Seu @usuario
                </label>
                <input
                  type="text"
                  className="lb-input"
                  placeholder="Digite seu @usuario..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(normalizeUsername(e.target.value))}
                  autoFocus={!loginUser}
                  required
                />
              </div>

              <div className="lb-field-group">
                <label className="lb-label">
                  <Lock size={14} /> Seu PIN
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
                  Sua conta ficará salva automaticamente neste dispositivo.
                </span>
              </div>

              <div className="lb-modal-footer">
                <button type="button" className="lb-btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="lb-btn-primary" disabled={loading}>
                  <Unlock size={16} />
                  {loading ? 'Entrando...' : 'Entrar na Conta'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateProfile} className="lb-profile-subform">
              <p className="lb-helper-text">
                Crie seu próprio <strong>@usuario</strong> e um <strong>PIN</strong> para
                começar seu diário do zero na nuvem.
              </p>

              <div className="lb-two-cols">
                <div className="lb-field-group">
                  <label className="lb-label">
                    <AtSign size={14} /> Escolha um @usuario
                  </label>
                  <input
                    type="text"
                    className="lb-input"
                    placeholder="Ex: joao"
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
                    placeholder="Ex: João"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
              </div>

              <div className="lb-field-group">
                <label className="lb-label">
                  <Lock size={14} /> Crie seu PIN (4 ou mais dígitos)
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
                  {loading ? 'Criando...' : 'Criar Minha Conta'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
