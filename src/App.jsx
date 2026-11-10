import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  BarChart2,
  Film,
  Sparkles,
  RotateCcw,
  Trash2,
  X,
  User,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  UserCircle2,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchCinemaVisits,
  createCinemaVisit,
  updateCinemaVisit,
  deleteCinemaVisit,
  getSmartSuggestions,
} from './services/storage';
import {
  getActiveProfileUsername,
  setActiveProfileUsername,
  isProfileUnlockedOnDevice,
} from './services/config';
import { StarDisplay } from './components/StarRating';
import VisitModal from './components/VisitModal';
import DataView from './components/DataView';
import { ProfileAuthModal } from './components/SettingsAndPinModal';

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
  const [activeUsername, setActiveUsername] = useState(() =>
    getActiveProfileUsername()
  );
  const [isDemoMode, setIsDemoMode] = useState(() => !getActiveProfileUsername());
  const [loading, setLoading] = useState(true);

  const [deviceUnlocked, setDeviceUnlocked] = useState(() =>
    isProfileUnlockedOnDevice(getActiveProfileUsername())
  );

  // Modais
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState(null);

  const loadVisits = useCallback(async (overrideUser) => {
    setLoading(true);
    try {
      const target =
        overrideUser !== undefined ? overrideUser : getActiveProfileUsername();
      const res = await fetchCinemaVisits(target);
      setVisits(res.visits);
      setIsDemoMode(Boolean(res.isDemoMode));

      if (res.activeUsername) {
        setActiveUsername(res.activeUsername);
        setActiveProfileUsername(res.activeUsername);
        setDeviceUnlocked(isProfileUnlockedOnDevice(res.activeUsername));
      } else {
        setActiveUsername('');
        setDeviceUnlocked(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const suggestions = useMemo(() => getSmartSuggestions(visits), [visits]);

  // Mini Dashboard da Home
  const homeDashboard = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
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

    const monthlyAvgNum = yearCount / currentMonth;
    const monthlyAvg = monthlyAvgNum.toFixed(1).replace('.0', '');

    const diffFromAvg = monthCount - monthlyAvgNum;
    const diffFormatted = Math.abs(diffFromAvg).toFixed(1).replace('.0', '');
    let monthComparisonText = 'Na média mensal';
    let monthComparisonStatus = 'neutral';

    if (diffFromAvg > 0.05) {
      monthComparisonText = `+${diffFormatted} acima da média`;
      monthComparisonStatus = 'above';
    } else if (diffFromAvg < -0.05) {
      monthComparisonText = `-${diffFormatted} abaixo da média`;
      monthComparisonStatus = 'below';
    }

    const todayLocalStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    const todayMidnight = new Date(`${todayLocalStr}T00:00:00`).getTime();

    let daysSinceLastVisit = null;
    let lastVisitDateBR = null;

    if (visits.length > 0) {
      const pastOrTodayVisit =
        visits.find((v) => v.visit_date && String(v.visit_date) <= todayLocalStr) ||
        visits[0];

      if (pastOrTodayVisit && pastOrTodayVisit.visit_date) {
        const vDateStr = String(pastOrTodayVisit.visit_date).slice(0, 10);
        const visitMidnight = new Date(`${vDateStr}T00:00:00`).getTime();
        if (!Number.isNaN(visitMidnight)) {
          const rawDays = Math.round(
            (todayMidnight - visitMidnight) / (1000 * 60 * 60 * 24)
          );
          daysSinceLastVisit = Math.max(0, rawDays);
          const parts = vDateStr.split('-');
          if (parts.length === 3) {
            lastVisitDateBR = `${parts[2]}/${parts[1]}`;
          }
        }
      }
    }

    return {
      currentMonthLabel: MONTH_NAMES_SHORT[currentMonth - 1],
      currentYear,
      monthCount,
      yearCount,
      monthlyAvg,
      monthComparisonText,
      monthComparisonStatus,
      daysSinceLastVisit,
      lastVisitDateBR,
    };
  }, [visits]);

  const latestFourVisits = useMemo(() => visits.slice(0, 4), [visits]);

  // Exige um @usuario autenticado com PIN neste aparelho para adicionar/editar/excluir
  const requireUnlockedProfile = (actionFn) => {
    const currentUser = getActiveProfileUsername() || activeUsername;
    if (currentUser && isProfileUnlockedOnDevice(currentUser)) {
      setDeviceUnlocked(true);
      actionFn();
    } else {
      setPendingProtectedAction(() => actionFn);
      setIsProfileModalOpen(true);
    }
  };

  const handleOpenAddModal = () => {
    requireUnlockedProfile(() => {
      setEditingVisit(null);
      setIsVisitModalOpen(true);
    });
  };

  const handleOpenEditModal = (visit) => {
    if (visit.isDemo) {
      setPendingProtectedAction(() => () => {
        setEditingVisit(null);
        setIsVisitModalOpen(true);
      });
      setIsProfileModalOpen(true);
      return;
    }
    requireUnlockedProfile(() => {
      setEditingVisit(visit);
      setIsVisitModalOpen(true);
    });
  };

  const handleDeleteVisit = (visit, options = {}) => {
    if (visit.isDemo) {
      setIsProfileModalOpen(true);
      return;
    }
    requireUnlockedProfile(async () => {
      if (options.skipPrompt) {
        await deleteCinemaVisit(visit.id);
        await loadVisits(activeUsername);
      } else {
        setVisitToDelete(visit);
      }
    });
  };

  const confirmDeleteVisitModal = async () => {
    if (!visitToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCinemaVisit(visitToDelete.id);
      setVisitToDelete(null);
      await loadVisits(activeUsername);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveVisit = async (payload) => {
    const owner = getActiveProfileUsername() || activeUsername;
    if (editingVisit) {
      await updateCinemaVisit(editingVisit.id, payload, owner);
    } else {
      await createCinemaVisit(payload, owner);
    }
    await loadVisits(owner);
  };

  return (
    <div className="lb-app-shell">
      {/* Top Navbar Limpa Estilo Letterboxd (Sem botões técnicos de chaves) */}
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
            {isDemoMode && (
              <span className="lb-demo-pill hide-xs">Modo Demonstração</span>
            )}

            <button
              type="button"
              className={`lb-lock-badge ${deviceUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => {
                setPendingProtectedAction(null);
                setIsProfileModalOpen(true);
              }}
              title={
                activeUsername
                  ? `Conectado como @${activeUsername} — clique para trocar ou sair`
                  : 'Clique para entrar no seu @usuario ou criar sua conta'
              }
            >
              <UserCircle2 size={15} />
              <span>
                {activeUsername ? `@${activeUsername}` : 'Entrar / Criar Conta'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="lb-main-content">
        {/* Banner de Boas-Vindas e Dicas (Exibido apenas para quem entra sem conta conectada) */}
        {isDemoMode && (
          <section className="lb-onboarding-card">
            <div className="lb-onboarding-top">
              <div>
                <span className="lb-eyebrow">
                  <Compass size={12} style={{ verticalAlign: 'middle' }} /> BEM-VINDO AO
                  CINELOG — VITRINE DE EXEMPLO
                </span>
                <h2>Seu diário pessoal de idas ao cinema</h2>
                <p>
                  Os filmes e números abaixo são <strong>dados de exemplo</strong> para
                  você explorar o visual. Crie sua conta gratuita em 5 segundos para
                  começar seu próprio controle na nuvem!
                </p>
              </div>

              <button
                type="button"
                className="lb-btn-primary lb-onboarding-cta"
                onClick={() => setIsProfileModalOpen(true)}
              >
                <UserCircle2 size={17} /> Entrar ou Criar Meu @usuario
              </button>
            </div>

            <div className="lb-onboarding-tips-grid">
              <div className="lb-tip-item">
                <strong>
                  <CheckCircle2 size={14} /> 1. Crie seu @usuario + PIN
                </strong>
                <span>
                  Sem precisar de e-mail ou configurar chaves. Digitou uma vez no seu
                  celular ou PC, sua conta fica salva no aparelho.
                </span>
              </div>

              <div className="lb-tip-item">
                <strong>
                  <CheckCircle2 size={14} /> 2. Registre suas Idas (+ Adicionar Ida)
                </strong>
                <span>
                  Busque o filme pelo nome para puxar o pôster e a estreia do TMDB,
                  escolha seu pôster favorito, formato (IMAX/XD), companhia e nota com ½
                  estrela.
                </span>
              </div>

              <div className="lb-tip-item">
                <strong>
                  <CheckCircle2 size={14} /> 3. Explore Diário e Estatísticas
                </strong>
                <span>
                  Clique em <em>Visualizar Dados</em> para ver sua linha do tempo mensal,
                  estante de pôsteres e médias de gasto por ida e modalidade!
                </span>
              </div>
            </div>
          </section>
        )}

        {currentScreen === 'home' ? (
          <div className="lb-home-view">
            {/* MINI DASHBOARD NA TELA INICIAL */}
            <section className="lb-mini-dashboard lb-mini-dashboard-4" aria-label="Resumo">
              {/* 1. No Mês + Comparativo com a Média Mensal */}
              <div className="lb-stat-metric">
                <span className="lb-metric-value">{homeDashboard.monthCount}</span>
                <span className="lb-metric-label">
                  NO MÊS ({homeDashboard.currentMonthLabel.toUpperCase()})
                </span>
                <span
                  className={`lb-metric-subpill ${homeDashboard.monthComparisonStatus}`}
                >
                  {homeDashboard.monthComparisonStatus === 'above' && (
                    <TrendingUp size={11} />
                  )}
                  {homeDashboard.monthComparisonStatus === 'below' && (
                    <TrendingDown size={11} />
                  )}
                  {homeDashboard.monthComparisonStatus === 'neutral' && (
                    <Minus size={11} />
                  )}
                  <span>{homeDashboard.monthComparisonText}</span>
                </span>
              </div>

              <div className="lb-stat-divider" />

              {/* 2. Total no Ano Atual */}
              <div className="lb-stat-metric">
                <span className="lb-metric-value green">
                  {homeDashboard.yearCount}
                </span>
                <span className="lb-metric-label">
                  NO ANO ({homeDashboard.currentYear})
                </span>
                <span className="lb-metric-subcaption">
                  {isDemoMode ? 'Exemplo no ano' : `Idas em ${homeDashboard.currentYear}`}
                </span>
              </div>

              <div className="lb-stat-divider" />

              {/* 3. Média / Mês no Ano Atual */}
              <div className="lb-stat-metric">
                <span className="lb-metric-value blue">
                  {homeDashboard.monthlyAvg}
                </span>
                <span className="lb-metric-label">
                  MÉDIA / MÊS ({homeDashboard.currentYear})
                </span>
                <span className="lb-metric-subcaption">Filmes por mês</span>
              </div>

              <div className="lb-stat-divider" />

              {/* 4. Contador de Dias sem ir ao Cinema */}
              <div className="lb-stat-metric">
                <span className="lb-metric-value purple">
                  {homeDashboard.daysSinceLastVisit === null
                    ? '—'
                    : homeDashboard.daysSinceLastVisit}
                </span>
                <span className="lb-metric-label">DIAS SEM IR AO CINEMA</span>
                <span className="lb-metric-subcaption">
                  {homeDashboard.daysSinceLastVisit === null
                    ? 'Sem registros'
                    : homeDashboard.daysSinceLastVisit === 0
                    ? 'Foi ao cinema hoje!'
                    : `Última ida: ${homeDashboard.lastVisitDateBR}`}
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

            {/* ÚLTIMOS 4 FILMES NO CINEMA */}
            <section className="lb-recent-section">
              <div className="lb-section-header">
                <span className="lb-section-title">
                  {isDemoMode
                    ? 'ÚLTIMAS IDAS AO CINEMA (FILMES DE EXEMPLO)'
                    : `ÚLTIMAS IDAS AO CINEMA DE @${activeUsername.toUpperCase()}`}
                </span>
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
                  <h3>O diário de @{activeUsername} está pronto!</h3>
                  <p>
                    Clique em <strong>+ Adicionar Ida</strong> acima para buscar seu
                    primeiro filme pelo título e puxar o pôster oficial.
                  </p>
                </div>
              ) : (
                <div className="lb-four-grid">
                  {latestFourVisits.map((visit) => {
                    const fmtKey = String(visit.session_format || '2D').toLowerCase();
                    return (
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

                          {/* Tags Superiores: PRÉ / RE / Rewatch / Formato Oficial (IMAX / XD) */}
                          <div className="lb-poster-top-badges">
                            {visit.isPreRelease && (
                              <span
                                className="lb-mini-badge prerelease"
                                title="Pré-estreia (assistido antes do lançamento oficial)"
                              >
                                <Sparkles size={10} /> PRÉ
                              </span>
                            )}
                            {visit.isReexibicao && (
                              <span
                                className="lb-mini-badge reexibicao"
                                title="Reexibição (assistido mais de 1 ano após o lançamento oficial)"
                              >
                                RE
                              </span>
                            )}
                            {visit.isRewatch && (
                              <span
                                className="lb-mini-badge rewatch"
                                title="Reassistido (Rewatch)"
                              >
                                <RotateCcw size={10} />
                              </span>
                            )}
                            <span
                              className={`lb-mini-badge format brand-${fmtKey}`}
                            >
                              {visit.session_format}
                            </span>
                          </div>

                          {/* Tag Inferior no Pôster: Companhia (SOZ ou ACO) */}
                          <div className="lb-poster-bottom-badges">
                            {visit.isAlone ? (
                              <span
                                className="lb-mini-badge company-soz"
                                title="Assistiu Sozinho"
                              >
                                <User size={10} strokeWidth={2.5} /> SOZ
                              </span>
                            ) : (
                              <span
                                className="lb-mini-badge company-aco"
                                title={`Acompanhado: ${visit.company}`}
                              >
                                <Users size={10} strokeWidth={2.5} /> ACO
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="lb-poster-caption">
                          <h3 className="lb-poster-title" title={visit.title}>
                            {visit.title}
                          </h3>
                          <div className="lb-poster-meta-row">
                            <StarDisplay rating={visit.rating} size="sm" />
                            {!visit.isDemo && (
                              <button
                                type="button"
                                className="lb-poster-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVisit(visit);
                                }}
                                title="Excluir esta ida"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
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
        onDelete={handleDeleteVisit}
        initialData={editingVisit}
        existingVisits={visits}
        suggestions={suggestions}
      />

      {/* Modal de Confirmação de Exclusão */}
      {visitToDelete && (
        <div
          className="lb-modal-backdrop"
          onClick={() => !isDeleting && setVisitToDelete(null)}
        >
          <div
            className="lb-modal-card lb-modal-small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lb-modal-header">
              <div>
                <span className="lb-eyebrow">REMOVER DO DIÁRIO</span>
                <h2>Excluir Ida ao Cinema?</h2>
              </div>
              <button
                type="button"
                className="lb-icon-btn"
                onClick={() => setVisitToDelete(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="lb-modal-form">
              <p className="lb-helper-text">
                Tem certeza que deseja excluir{' '}
                <strong style={{ color: '#fff' }}>{visitToDelete.title}</strong> do seu
                histórico? Esta ação não pode ser desfeita.
              </p>

              <div className="lb-modal-footer">
                <button
                  type="button"
                  className="lb-btn-secondary"
                  onClick={() => setVisitToDelete(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="lb-btn-danger confirming"
                  onClick={confirmDeleteVisitModal}
                  disabled={isDeleting}
                >
                  <Trash2 size={15} />
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir Ida'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Contas (@usuario + PIN) */}
      <ProfileAuthModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setPendingProtectedAction(null);
        }}
        activeUsername={activeUsername}
        onProfileChanged={async (newUsername, isUnlockedNow) => {
          setActiveUsername(newUsername);
          setDeviceUnlocked(isUnlockedNow);
          await loadVisits(newUsername);
          if (isUnlockedNow && pendingProtectedAction) {
            pendingProtectedAction();
            setPendingProtectedAction(null);
          }
        }}
      />
    </div>
  );
}
