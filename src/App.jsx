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
  Share2,
  Check,
  Eye,
  Target,
} from 'lucide-react';
import {
  fetchCinemaVisits,
  createCinemaVisit,
  updateCinemaVisit,
  deleteCinemaVisit,
  getSmartSuggestions,
  updateProfilePreferences,
} from './services/storage';
import {
  getActiveProfileUsername,
  setActiveProfileUsername,
  isProfileUnlockedOnDevice,
  normalizeUsername,
} from './services/config';
import { StarDisplay } from './components/StarRating';
import VisitModal from './components/VisitModal';
import DataView from './components/DataView';
import { ProfileAuthModal } from './components/SettingsAndPinModal';
import { generatePageAiInsight } from './services/aiInsights';

function formatShortVisitDateBR(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`;
}

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

function getUrlSharedUsername() {
  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeUsername(params.get('u') || params.get('user') || '');
  } catch {
    return '';
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home'); // 'home' | 'data'
  const [visits, setVisits] = useState([]);
  const [sharedUrlUser, setSharedUrlUser] = useState(() => getUrlSharedUsername());
  const [activeUsername, setActiveUsername] = useState(
    () => getUrlSharedUsername() || getActiveProfileUsername()
  );
  const [annualGoal, setAnnualGoal] = useState(24);
  const [watchlist, setWatchlist] = useState([]);
  const [isDemoMode, setIsDemoMode] = useState(
    () => !(getUrlSharedUsername() || getActiveProfileUsername())
  );
  const [loading, setLoading] = useState(true);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const [deviceUnlocked, setDeviceUnlocked] = useState(() => {
    const u = getUrlSharedUsername() || getActiveProfileUsername();
    return isProfileUnlockedOnDevice(u);
  });

  // Modais
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [prefillMovie, setPrefillMovie] = useState(null);
  const [visitToDelete, setVisitToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingProtectedAction, setPendingProtectedAction] = useState(null);

  const loadVisits = useCallback(async (overrideUser) => {
    setLoading(true);
    try {
      const urlUser = getUrlSharedUsername();
      const target =
        overrideUser !== undefined
          ? overrideUser
          : urlUser || getActiveProfileUsername();

      const res = await fetchCinemaVisits(target);
      setVisits(res.visits);
      setIsDemoMode(Boolean(res.isDemoMode));
      setAnnualGoal(Number(res.annualGoal || 24));
      setWatchlist(Array.isArray(res.watchlist) ? res.watchlist : []);

      if (res.activeUsername) {
        setActiveUsername(res.activeUsername);
        // Só salva no localStorage se não for apenas uma visita via link ?u=
        if (!urlUser || isProfileUnlockedOnDevice(res.activeUsername)) {
          setActiveProfileUsername(res.activeUsername);
        }
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

  const isReadOnlyVisitor = Boolean(
    activeUsername && !isDemoMode && !deviceUnlocked
  );

  const suggestions = useMemo(() => getSmartSuggestions(visits), [visits]);

  // Mini Dashboard da Home + Meta Anual
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

    const goalTarget = Math.max(1, Number(annualGoal || 24));
    const goalPct = Math.min(100, Math.round((yearCount / goalTarget) * 100));

    return {
      currentMonthLabel: MONTH_NAMES_SHORT[currentMonth - 1],
      currentYear,
      monthCount,
      thisMonthCount: monthCount,
      yearCount,
      monthlyAvg,
      diffFromMonthlyAvg: diffFromAvg,
      monthComparisonText,
      monthComparisonStatus,
      daysSinceLastVisit,
      lastVisitDateBR,
      goalTarget,
      goalPct,
    };
  }, [visits, annualGoal]);

  const homeAiInsight = useMemo(
    () =>
      generatePageAiInsight({
        page: 'home',
        visits,
        homeDashboard,
        isDemoMode,
      }),
    [visits, homeDashboard, isDemoMode]
  );

  const latestFourVisits = useMemo(() => visits.slice(0, 4), [visits]);

  const requireUnlockedProfile = (actionFn) => {
    const currentUser = activeUsername || getActiveProfileUsername();
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
      setPrefillMovie(null);
      setIsVisitModalOpen(true);
    });
  };

  const handleLogFromWatchlist = (movie) => {
    requireUnlockedProfile(() => {
      setEditingVisit(null);
      setPrefillMovie(movie);
      setIsVisitModalOpen(true);
    });
  };

  const handleOpenEditModal = (visit) => {
    if (visit.isDemo) {
      setPendingProtectedAction(() => () => {
        setEditingVisit(null);
        setPrefillMovie(null);
        setIsVisitModalOpen(true);
      });
      setIsProfileModalOpen(true);
      return;
    }
    if (isReadOnlyVisitor) return;
    requireUnlockedProfile(() => {
      setEditingVisit(visit);
      setPrefillMovie(null);
      setIsVisitModalOpen(true);
    });
  };

  const handleDeleteVisit = (visit, options = {}) => {
    if (visit.isDemo || isReadOnlyVisitor) return;
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
    const owner = activeUsername || getActiveProfileUsername();
    if (editingVisit) {
      await updateCinemaVisit(editingVisit.id, payload, owner);
    } else {
      await createCinemaVisit(payload, owner);
    }
    await loadVisits(owner);
  };

  // Compartilhar Link Direto da Estante (?u=seu_usuario) - Item 5
  const handleShareProfileLink = () => {
    if (!activeUsername) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?u=${encodeURIComponent(
      activeUsername
    )}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2600);
  };

  // Atualizar Meta Anual (Item 8)
  const handleUpdateAnnualGoal = async (newGoal) => {
    setAnnualGoal(newGoal);
    if (activeUsername && deviceUnlocked) {
      await updateProfilePreferences(activeUsername, { annualGoal: newGoal });
    }
  };

  // Adicionar/Remover Filme da Watchlist "Quero Ver no Cinema" (Item 6)
  const handleToggleWatchlistItem = async (movie) => {
    requireUnlockedProfile(async () => {
      const exists = watchlist.some(
        (w) =>
          (w.tmdbId && movie.tmdbId && w.tmdbId === movie.tmdbId) ||
          w.title === movie.title
      );
      let nextList;
      if (exists) {
        nextList = watchlist.filter(
          (w) =>
            !(
              (w.tmdbId && movie.tmdbId && w.tmdbId === movie.tmdbId) ||
              w.title === movie.title
            )
        );
      } else {
        nextList = [
          {
            tmdbId: movie.tmdbId || null,
            title: movie.title,
            originalTitle: movie.originalTitle || movie.title,
            posterUrl: movie.posterUrl || '',
            releaseDate: movie.releaseDate || '',
          },
          ...watchlist,
        ];
      }
      setWatchlist(nextList);
      await updateProfilePreferences(activeUsername, { watchlist: nextList });
    });
  };

  return (
    <div className="lb-app-shell">
      {/* Top Navbar Limpa Estilo Letterboxd */}
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

            {isReadOnlyVisitor && (
              <span className="lb-visitor-pill">
                <Eye size={13} /> Visitando @{activeUsername}
              </span>
            )}

            {/* Botão de Compartilhar Link Direto da Estante (?u=seu_usuario) */}
            {activeUsername && !isDemoMode && (
              <button
                type="button"
                className="lb-share-profile-btn"
                onClick={handleShareProfileLink}
                title="Copiar link público de leitura da sua estante"
              >
                {copiedShareLink ? <Check size={14} /> : <Share2 size={14} />}
                <span className="hide-xs">
                  {copiedShareLink ? 'Link Copiado!' : 'Compartilhar Estante'}
                </span>
              </button>
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
                  ? `Conta @${activeUsername} — clique para trocar ou sair`
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
        {/* Banner quando estiver visitando a estante pública de alguém via ?u= */}
        {isReadOnlyVisitor && (
          <div className="lb-visitor-banner">
            <div>
              <strong>
                <Eye size={15} /> Você está visualizando a estante de @{activeUsername}
              </strong>
              <span>
                Modo somente leitura. Se você é @{activeUsername}, clique ao lado para
                liberar com seu PIN ou entrar na sua própria conta.
              </span>
            </div>
            <div className="lb-visitor-banner-actions">
              <button
                type="button"
                className="lb-btn-primary lb-btn-sm"
                onClick={() => setIsProfileModalOpen(true)}
              >
                Entrar / Trocar Conta
              </button>
              {sharedUrlUser && (
                <button
                  type="button"
                  className="lb-btn-secondary lb-btn-sm"
                  onClick={() => {
                    window.history.replaceState({}, '', window.location.pathname);
                    setSharedUrlUser('');
                    loadVisits(getActiveProfileUsername());
                  }}
                >
                  Sair da Visita
                </button>
              )}
            </div>
          </div>
        )}

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
                  Busque o filme pelo nome para puxar pôster, estreia, duração e diretor
                  do TMDB, escolha seu pôster favorito, formato (IMAX/XD) e nota com ½
                  estrela.
                </span>
              </div>

              <div className="lb-tip-item">
                <strong>
                  <CheckCircle2 size={14} /> 3. Explore Diário, Estreias e Estatísticas
                </strong>
                <span>
                  Clique em <em>Visualizar Dados</em> para ver seu Diário, Horas de Tela,
                  Dia Favorito, Gráfico Mensal e a aba <em>Em Breve / Quero Ver</em>!
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

              {/* 2. Total no Ano Atual + Meta Anual */}
              <div className="lb-stat-metric">
                <span className="lb-metric-value green">
                  {homeDashboard.yearCount}
                </span>
                <span className="lb-metric-label">
                  NO ANO ({homeDashboard.currentYear})
                </span>
                <span className="lb-metric-subcaption">
                  <Target size={10} style={{ verticalAlign: 'middle' }} /> Meta:{' '}
                  {homeDashboard.yearCount}/{homeDashboard.goalTarget} (
                  {homeDashboard.goalPct}%)
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

            {/* ANÁLISE DE IA NA PÁGINA INICIAL */}
            {homeAiInsight && (
              <section className="lb-ai-insight-card">
                <div className="lb-ai-insight-icon">
                  <Sparkles size={18} />
                </div>
                <div className="lb-ai-insight-body">
                  <span className="lb-ai-insight-badge">{homeAiInsight.badge}</span>
                  <h4>{homeAiInsight.title}</h4>
                  <p>{homeAiInsight.text}</p>
                </div>
              </section>
            )}

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
                            <div className="lb-home-star-date-group">
                              <StarDisplay rating={visit.rating} size="sm" />
                              {visit.visit_date && (
                                <span
                                  className="lb-poster-date-small"
                                  title={`Dia da ida: ${visit.visit_date
                                    .split('-')
                                    .reverse()
                                    .join('/')}`}
                                >
                                  {formatShortVisitDateBR(visit.visit_date)}
                                </span>
                              )}
                            </div>
                            {!visit.isDemo && !isReadOnlyVisitor && (
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
            onLogFromWatchlist={handleLogFromWatchlist}
            onEditVisit={handleOpenEditModal}
            onDeleteVisit={handleDeleteVisit}
            annualGoal={annualGoal}
            onUpdateAnnualGoal={handleUpdateAnnualGoal}
            watchlist={watchlist}
            onToggleWatchlistItem={handleToggleWatchlistItem}
            onRefreshVisits={() => loadVisits(activeUsername)}
            isReadOnlyVisitor={isReadOnlyVisitor}
          />
        )}
      </main>

      {/* Modal de Adicionar / Editar Ida */}
      <VisitModal
        isOpen={isVisitModalOpen}
        onClose={() => {
          setIsVisitModalOpen(false);
          setEditingVisit(null);
          setPrefillMovie(null);
        }}
        onSave={handleSaveVisit}
        onDelete={handleDeleteVisit}
        initialData={editingVisit}
        prefillMovie={prefillMovie}
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
          if (sharedUrlUser && newUsername !== sharedUrlUser) {
            window.history.replaceState({}, '', window.location.pathname);
            setSharedUrlUser('');
          }
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
