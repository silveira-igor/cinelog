import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  BarChart2,
  Settings,
  Lock,
  Unlock,
  Cloud,
  HardDrive,
  Film,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import {
  fetchCinemaVisits,
  createCinemaVisit,
  updateCinemaVisit,
  deleteCinemaVisit,
  getSmartSuggestions,
} from './services/storage';
import { isDeviceUnlocked } from './services/config';
import { StarDisplay } from './components/StarRating';
import VisitModal from './components/VisitModal';
import DataView from './components/DataView';
import {
  PinUnlockModal,
  CloudSettingsModal,
} from './components/SettingsAndPinModal';

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'data'
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloudActive, setCloudActive] = useState(false);

  // Estado de desbloqueio permanente do aparelho via PIN
  const [deviceUnlocked, setDeviceUnlocked] = useState(() => isDeviceUnlocked());

  // Modais
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCinemaVisits();
      setVisits(res.visits);
      setCloudActive(res.cloudActive);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  // Sugestões inteligentes de Locais e Companhias baseadas no histórico
  const suggestions = useMemo(() => getSmartSuggestions(visits), [visits]);

  // Mini Dashboard da Home: APENAS Total Mês Atual, Total Ano Atual e Média Mensal no Ano Atual
  const homeDashboard = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1 a 12
    const currentYearPrefix = String(currentYear);
    const currentYearMonthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let monthCount = 0;
    let yearCount = 0;

    for (const v of visits) {
      const vDate = String(v.visit_date || '');
      if (vDate.startsWith(currentYearPrefix)) {
        yearCount++;
      }
      if (vDate.startsWith(currentYearMonthPrefix)) {
        monthCount++;
      }
    }

    // Média de filmes por mês no ano atual (dividido pelos meses decorridos até o mês atual)
    const monthlyAvg = (yearCount / currentMonth).toFixed(1).replace('.0', '');

    return {
      currentMonthLabel: MONTH_NAMES_SHORT[currentMonth - 1],
      currentYear,
      monthCount,
      yearCount,
      monthlyAvg,
    };
  }, [visits]);

  // Últimos 4 filmes assistidos no cinema
  const latestFourVisits = useMemo(() => visits.slice(0, 4), [visits]);

  // Proteção por PIN (pede 1 única vez por dispositivo e libera para sempre)
  const requireUnlockedDevice = (actionFn) => {
    if (deviceUnlocked || isDeviceUnlocked()) {
      setDeviceUnlocked(true);
      actionFn();
    } else {
      setPendingProtectedAction(() => actionFn);
      setIsPinModalOpen(true);
    }
  };

  const handleOpenAddModal = () => {
    requireUnlockedDevice(() => {
      setEditingVisit(null);
      setIsVisitModalOpen(true);
    });
  };

  const handleOpenEditModal = (visit) => {
    requireUnlockedDevice(() => {
      setEditingVisit(visit);
      setIsVisitModalOpen(true);
    });
  };

  const handleDeleteVisit = (visit) => {
    requireUnlockedDevice(async () => {
      const confirmDelete = window.confirm(
        `Deseja remover "${visit.title}" do seu diário de cinema?`
      );
      if (!confirmDelete) return;
      await deleteCinemaVisit(visit.id);
      await loadVisits();
    });
  };

  const handleSaveVisit = async (payload) => {
    if (editingVisit) {
      await updateCinemaVisit(editingVisit.id, payload);
    } else {
      await createCinemaVisit(payload);
    }
    await loadVisits();
  };

  return (
    <div className="lb-app-shell">
      {/* Top Navbar Estilo Letterboxd */}
      <header className="lb-navbar">
        <div className="lb-navbar-inner">
          <button
            type="button"
            className="lb-brand"
            onClick={() => setCurrentScreen('home')}
          >
            <span className="lb-dots" aria-hidden="true">
              <span className="dot orange" />
              <span className="dot green" />
              <span className="dot blue" />
            </span>
            <span className="lb-brand-text">CineLog</span>
          </button>

          <div className="lb-navbar-right">
            <button
              type="button"
              className={`lb-cloud-badge ${cloudActive ? 'online' : 'local'}`}
              onClick={() => setIsSettingsModalOpen(true)}
              title={
                cloudActive
                  ? 'Conectado ao Supabase na nuvem'
                  : 'Modo Local — Clique para conectar ao Supabase e TMDB'
              }
            >
              {cloudActive ? <Cloud size={14} /> : <HardDrive size={14} />}
              <span>{cloudActive ? 'Nuvem Ativa' : 'Conectar Nuvem'}</span>
            </button>

            <button
              type="button"
              className={`lb-lock-badge ${deviceUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => {
                if (!deviceUnlocked) {
                  setPendingProtectedAction(null);
                  setIsPinModalOpen(true);
                } else {
                  setIsSettingsModalOpen(true);
                }
              }}
              title={
                deviceUnlocked
                  ? 'Dispositivo liberado permanentemente'
                  : 'Clique para liberar este dispositivo com seu PIN'
              }
            >
              {deviceUnlocked ? <Unlock size={14} /> : <Lock size={14} />}
              <span className="hide-xs">
                {deviceUnlocked ? 'Liberado' : 'PIN'}
              </span>
            </button>

            <button
              type="button"
              className="lb-icon-btn"
              onClick={() => setIsSettingsModalOpen(true)}
              title="Configurações de Nuvem (Supabase / TMDB / PIN)"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="lb-main-content">
        {currentScreen === 'home' ? (
          <div className="lb-home-view">
            {/* MINI DASHBOARD (Apenas Mês Atual, Ano Atual e Média Mensal no Ano Atual) */}
            <section className="lb-mini-dashboard" aria-label="Resumo do Ano">
              <div className="lb-stat-metric">
                <span className="lb-metric-value">{homeDashboard.monthCount}</span>
                <span className="lb-metric-label">
                  NO MÊS ({homeDashboard.currentMonthLabel.toUpperCase()})
                </span>
              </div>

              <div className="lb-stat-divider" />

              <div className="lb-stat-metric">
                <span className="lb-metric-value green">
                  {homeDashboard.yearCount}
                </span>
                <span className="lb-metric-label">
                  NO ANO ({homeDashboard.currentYear})
                </span>
              </div>

              <div className="lb-stat-divider" />

              <div className="lb-stat-metric">
                <span className="lb-metric-value blue">
                  {homeDashboard.monthlyAvg}
                </span>
                <span className="lb-metric-label">
                  MÉDIA / MÊS ({homeDashboard.currentYear})
                </span>
              </div>
            </section>

            {/* OS DOIS BOTÕES PRINCIPAIS NA HOME */}
            <section className="lb-home-actions">
              <button
                type="button"
                className="lb-main-cta-btn add"
                onClick={handleOpenAddModal}
              >
                <Plus size={20} strokeWidth={2.5} />
                <span>Adicionar Ida</span>
              </button>

              <button
                type="button"
                className="lb-main-cta-btn view"
                onClick={() => setCurrentScreen('data')}
              >
                <BarChart2 size={20} />
                <span>Visualizar Dados</span>
              </button>
            </section>

            {/* ÚLTIMOS 4 FILMES NO CINEMA (Pôster, Título e Nota) */}
            <section className="lb-recent-section">
              <div className="lb-section-header">
                <span className="lb-section-title">ÚLTIMAS IDAS AO CINEMA</span>
                {visits.length > 0 && (
                  <button
                    type="button"
                    className="lb-section-more"
                    onClick={() => setCurrentScreen('data')}
                  >
                    VER TODAS ({visits.length})
                  </button>
                )}
              </div>

              {loading ? (
                <div className="lb-four-grid">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="lb-poster-skeleton" />
                  ))}
                </div>
              ) : latestFourVisits.length === 0 ? (
                <div className="lb-empty-home-box">
                  <Film size={36} />
                  <h3>Seu diário de cinema está pronto</h3>
                  <p>
                    Clique em <strong>+ Adicionar Ida</strong> acima para buscar seu
                    primeiro filme pelo título e puxar o pôster oficial.
                  </p>
                </div>
              ) : (
                <div className="lb-four-grid">
                  {latestFourVisits.map((visit) => (
                    <article
                      key={visit.id}
                      className="lb-poster-card"
                      onClick={() => handleOpenEditModal(visit)}
                    >
                      <div className="lb-poster-frame">
                        {visit.poster_url ? (
                          <img
                            src={visit.poster_url}
                            alt={visit.title}
                            className="lb-poster-img"
                          />
                        ) : (
                          <div className="lb-poster-fallback">
                            <Film size={28} />
                            <span>{visit.title}</span>
                          </div>
                        )}

                        {/* Selos automáticos sutis de Pré-estreia / Rewatch / Formato */}
                        <div className="lb-poster-top-badges">
                          {visit.isPreRelease && (
                            <span
                              className="lb-mini-badge prerelease"
                              title="Pré-estreia detectada automaticamente"
                            >
                              <Sparkles size={10} /> PRÉ
                            </span>
                          )}
                          {visit.isRewatch && (
                            <span
                              className="lb-mini-badge rewatch"
                              title="Rewatch detectado automaticamente"
                            >
                              <RotateCcw size={10} /> ↻
                            </span>
                          )}
                          <span className="lb-mini-badge format">
                            {visit.session_format}
                          </span>
                        </div>
                      </div>

                      <div className="lb-poster-caption">
                        <h3 className="lb-poster-title" title={visit.title}>
                          {visit.title}
                        </h3>
                        <div className="lb-poster-meta-row">
                          <StarDisplay rating={visit.rating} size="sm" />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <DataView
            visits={visits}
            onBackHome={() => setCurrentScreen('home')}
            onAddClick={handleOpenAddModal}
            onEditVisit={handleOpenEditModal}
            onDeleteVisit={handleDeleteVisit}
          />
        )}
      </main>

      {/* Modal de Adicionar / Editar Ida */}
      <VisitModal
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setEditingVisit(null);
        }}
        onSave={handleSaveVisit}
        initialData={editingVisit}
        existingVisits={visits}
        suggestions={suggestions}
      />

      {/* Modal de PIN de Segurança (1 vez por dispositivo) */}
      <PinUnlockModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingProtectedAction(null);
        }}
        onUnlocked={() => {
          setDeviceUnlocked(true);
          if (pendingProtectedAction) {
            pendingProtectedAction();
            setPendingProtectedAction(null);
          }
        }}
      />

      {/* Modal de Configurações (Supabase, TMDB e PIN) */}
      <CloudSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaved={() => loadVisits()}
        deviceUnlocked={deviceUnlocked}
        onDeviceLockToggle={() => setDeviceUnlocked(isDeviceUnlocked())}
      />
    </div>
  );
}
