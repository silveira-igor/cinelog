import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Grid,
  Calendar as CalendarIcon,
  BarChart3,
  Plus,
  Search,
  Sparkles,
  RotateCcw,
  MapPin,
  User,
  Users,
  Edit3,
  Trash2,
  Film,
  Ticket,
  Award,
  History,
  Clock,
  Clapperboard,
  Armchair,
  MessageSquare,
  Bookmark,
  BookmarkCheck,
  Target,
  Check,
  Loader2,
} from 'lucide-react';
import { StarDisplay } from './StarRating';
import {
  parseCompanions,
  saveMovieMetaToCache,
  normalizeTitle,
} from '../services/storage';
import {
  fetchMovieRichDetails,
  fetchBrazilCinemaReleases,
  searchMovies,
} from '../services/tmdb';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_SHORT = [
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

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrencyBRL(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatMinutesToHours(totalMinutes) {
  const mins = Math.round(Number(totalMinutes || 0));
  if (mins <= 0) return '0h 00m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function DataView({
  mode = 'data',
  visits,
  onBackHome,
  onAddClick,
  onLogFromWatchlist,
  onEditVisit,
  onDeleteVisit,
  annualGoal = 24,
  onUpdateAnnualGoal,
  watchlist = [],
  onToggleWatchlistItem,
  onRefreshVisits,
  isReadOnlyVisitor = false,
}) {
  const [activeTab, setActiveTab] = useState(
    mode === 'upcoming' ? 'upcoming' : 'diary'
  ); // 'diary' | 'grid' | 'stats' | 'upcoming'

  useEffect(() => {
    setActiveTab(mode === 'upcoming' ? 'upcoming' : 'diary');
  }, [mode]);
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

  // Edição inline da Meta Anual
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(annualGoal || 24));

  // Aba "Em Breve / Quero Ver no Cinema"
  const [upcomingSubTab, setUpcomingSubTab] = useState('watchlist'); // 'watchlist' | 'upcoming' | 'now_playing'
  const [tmdbReleases, setTmdbReleases] = useState([]);
  const [releasesPage, setReleasesPage] = useState(1);
  const [hasMoreReleases, setHasMoreReleases] = useState(false);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [loadingMoreReleases, setLoadingMoreReleases] = useState(false);
  const [watchlistSearch, setWatchlistSearch] = useState('');
  const [watchlistSearchResults, setWatchlistSearchResults] = useState([]);
  const [isSearchingWatchlist, setIsSearchingWatchlist] = useState(false);

  // Modal de detalhes de filme nas 3 abas de "Em Breve"
  const [selectedUpcomingMovie, setSelectedUpcomingMovie] = useState(null);
  const [loadingUpcomingDetail, setLoadingUpcomingDetail] = useState(false);

  useEffect(() => {
    setGoalInput(String(annualGoal || 24));
  }, [annualGoal]);

  // Enriquecimento automático em background dos filmes antigos que ainda não têm duração/diretor/gênero/atores/estúdio
  useEffect(() => {
    let cancelled = false;
    const missingMetaVisits = visits.filter(
      (v) =>
        !v.isDemo &&
        (!v.runtime || !v.director || !v.genres?.length || !v.cast?.length || !v.studio)
    );
    if (missingMetaVisits.length === 0) return;

    (async () => {
      let updatedAny = false;
      for (const v of missingMetaVisits.slice(0, 10)) {
        if (cancelled) break;
        const rich = await fetchMovieRichDetails({
          tmdbId: v.tmdb_id,
          title: v.title,
        });
        if (
          rich.runtime ||
          rich.director ||
          rich.genres?.length ||
          rich.cast?.length ||
          rich.studio
        ) {
          const mKey =
            v.movieKey ||
            (v.tmdb_id ? `tmdb:${v.tmdb_id}` : `title:${normalizeTitle(v.title)}`);
          saveMovieMetaToCache(mKey, rich);
          updatedAny = true;
        }
      }
      if (!cancelled && updatedAny && onRefreshVisits) {
        onRefreshVisits();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visits.length]);

  // Carrega estreias do Brasil (página 1) quando abre a aba "Em Breve / Quero Ver"
  useEffect(() => {
    if (activeTab !== 'upcoming') return;
    if (upcomingSubTab === 'watchlist') return;

    let cancelled = false;
    setLoadingReleases(true);
    setReleasesPage(1);
    fetchBrazilCinemaReleases(upcomingSubTab, 1)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : data?.results || [];
        setTmdbReleases(list);
        setHasMoreReleases(Boolean(data?.hasMore));
      })
      .finally(() => {
        if (!cancelled) setLoadingReleases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, upcomingSubTab]);

  const handleLoadMoreReleases = async () => {
    if (loadingMoreReleases || !hasMoreReleases) return;
    const nextPage = releasesPage + 1;
    setLoadingMoreReleases(true);
    try {
      const data = await fetchBrazilCinemaReleases(upcomingSubTab, nextPage);
      const moreList = Array.isArray(data) ? data : data?.results || [];
      setTmdbReleases((prev) => {
        const seen = new Set(prev.map((m) => m.tmdbId || m.title));
        const merged = [...prev];
        for (const item of moreList) {
          const key = item.tmdbId || item.title;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(item);
          }
        }
        return merged;
      });
      setReleasesPage(nextPage);
      setHasMoreReleases(Boolean(data?.hasMore));
    } finally {
      setLoadingMoreReleases(false);
    }
  };

  const handleOpenUpcomingMovieDetail = async (movie) => {
    setSelectedUpcomingMovie(movie);
    setLoadingUpcomingDetail(true);
    try {
      const rich = await fetchMovieRichDetails({
        tmdbId: movie.tmdbId,
        title: movie.title,
      });
      setSelectedUpcomingMovie((prev) => {
        if (!prev || (prev.tmdbId !== movie.tmdbId && prev.title !== movie.title)) {
          return prev;
        }
        return {
          ...prev,
          runtime: rich.runtime || prev.runtime || 0,
          genres: rich.genres?.length ? rich.genres : prev.genres || [],
          director: rich.director || prev.director || '',
          cast: rich.cast?.length ? rich.cast : prev.cast || [],
          studio: rich.studio || prev.studio || '',
          overview: rich.overview || prev.overview || '',
          releaseDate: rich.releaseDate || prev.releaseDate || '',
          originalTitle: rich.originalTitle || prev.originalTitle || prev.title,
          tmdbRating: rich.tmdbRating || prev.tmdbRating || 0,
        };
      });
    } finally {
      setLoadingUpcomingDetail(false);
    }
  };

  // Busca rápida para adicionar qualquer filme na lista "Quero Ver" (com feedback imediato)
  useEffect(() => {
    if (activeTab !== 'upcoming') return;
    const q = watchlistSearch.trim();
    if (q.length < 2) {
      setWatchlistSearchResults([]);
      setIsSearchingWatchlist(false);
      return;
    }
    setIsSearchingWatchlist(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await searchMovies(q);
        if (!cancelled) setWatchlistSearchResults(res);
      } finally {
        if (!cancelled) setIsSearchingWatchlist(false);
      }
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [watchlistSearch, activeTab]);

  // Ordena "Quero Ver no Cinema" por data de lançamento (Em Cartaz na frente, depois os mais próximos)
  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      const da = a.releaseDate || '9999-12-31';
      const db = b.releaseDate || '9999-12-31';
      return da.localeCompare(db);
    });
  }, [watchlist]);

  const availableYears = useMemo(() => {
    const years = new Set();
    visits.forEach((v) => {
      if (v.visit_date) years.add(v.visit_date.slice(0, 4));
    });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [visits]);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const vYear = v.visit_date ? v.visit_date.slice(0, 4) : '';
      const vMonth = v.visit_date ? String(Number(v.visit_date.slice(5, 7))) : '';

      if (yearFilter !== 'ALL' && vYear !== yearFilter) return false;
      if (monthFilter !== 'ALL' && vMonth !== monthFilter) return false;
      if (formatFilter !== 'ALL' && v.session_format !== formatFilter) return false;
      if (originFilter !== 'ALL' && v.ticket_origin !== originFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = String(v.title || '').toLowerCase().includes(q);
        const matchCinema = String(v.cinema_location || '').toLowerCase().includes(q);
        const matchComp = String(v.company || '').toLowerCase().includes(q);
        const matchDir = String(v.director || '').toLowerCase().includes(q);
        const matchNotes = String(v.notes || '').toLowerCase().includes(q);
        if (
          !matchTitle &&
          !matchCinema &&
          !matchComp &&
          !matchDir &&
          !matchNotes
        ) {
          return false;
        }
      }
      return true;
    });
  }, [visits, yearFilter, monthFilter, formatFilter, originFilter, searchTerm]);

  const diaryGroups = useMemo(() => {
    const groups = new Map();
    for (const v of filteredVisits) {
      const ym = v.visit_date ? v.visit_date.slice(0, 7) : 'Sem Data';
      if (!groups.has(ym)) groups.set(ym, []);
      groups.get(ym).push(v);
    }
    return [...groups.entries()].map(([ym, items]) => {
      if (ym === 'Sem Data') return { key: ym, label: 'Sem Data', items };
      const [y, m] = ym.split('-');
      const monthLabel = MONTH_NAMES[Number(m) - 1] || m;
      return {
        key: ym,
        label: `${monthLabel} ${y}`,
        items,
      };
    });
  }, [filteredVisits]);

  // Cálculo completo das Estatísticas (Médias, Horas de Tela, Gêneros, Diretores, Dia da Semana, Gráfico Mensal)
  const stats = useMemo(() => {
    const total = filteredVisits.length;
    let totalSpent = 0;
    let totalMinutes = 0;
    let preReleaseCount = 0;
    let reexibicaoCount = 0;
    let rewatchCount = 0;
    let ratedCount = 0;
    let ratingSum = 0;

    const distinctMonths = new Set();
    const byOrigin = { Voucher: 0, Club: 0, Comprado: 0 };
    const spentByOrigin = { Voucher: 0, Club: 0, Comprado: 0 };
    const byFormat = { IMAX: 0, XD: 0, '3D': 0, '2D': 0 };
    const byAudio = { Legendado: 0, Dublado: 0, Original: 0 };
    const byCinema = new Map();
    const byCompany = new Map();
    const byGenre = new Map();
    const byDirector = new Map();
    const byActor = new Map();
    const byStudio = new Map();

    // Dia da Semana (0 = Dom ... 6 = Sáb)
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];

    // Gráfico Mensal (Jan = 0 ... Dez = 11)
    const monthlyCounts = new Array(12).fill(0);
    const monthlySpent = new Array(12).fill(0);

    for (const v of filteredVisits) {
      const price = Number(v.price_paid || 0);
      totalSpent += price;
      totalMinutes += Number(v.runtime || 0);

      if (v.visit_date) {
        distinctMonths.add(v.visit_date.slice(0, 7));
        const dObj = new Date(`${v.visit_date.slice(0, 10)}T12:00:00`);
        if (!Number.isNaN(dObj.getTime())) {
          weekdayCounts[dObj.getDay()]++;
          const mIdx = dObj.getMonth();
          monthlyCounts[mIdx]++;
          monthlySpent[mIdx] += price;
        }
      }

      if (v.isPreRelease) preReleaseCount++;
      if (v.isReexibicao) reexibicaoCount++;
      if (v.isRewatch) rewatchCount++;

      if (Number(v.rating) > 0) {
        ratedCount++;
        ratingSum += Number(v.rating);
      }

      const orig = v.ticket_origin || 'Club';
      byOrigin[orig] = (byOrigin[orig] || 0) + 1;
      spentByOrigin[orig] = (spentByOrigin[orig] || 0) + price;

      const fmt = v.session_format || '2D';
      byFormat[fmt] = (byFormat[fmt] || 0) + 1;

      const aud = v.audio_type || 'Legendado';
      byAudio[aud] = (byAudio[aud] || 0) + 1;

      const loc = String(v.cinema_location || '').trim();
      if (loc) byCinema.set(loc, (byCinema.get(loc) || 0) + 1);

      const people = parseCompanions(v.companionsList || v.company);
      if (people.length === 0) {
        byCompany.set('Sozinho', (byCompany.get('Sozinho') || 0) + 1);
      } else {
        for (const person of people) {
          byCompany.set(person, (byCompany.get(person) || 0) + 1);
        }
      }

      if (Array.isArray(v.genres)) {
        for (const g of v.genres) {
          if (g) byGenre.set(g, (byGenre.get(g) || 0) + 1);
        }
      }

      if (v.director) {
        v.director
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((dir) => {
            byDirector.set(dir, (byDirector.get(dir) || 0) + 1);
          });
      }

      if (Array.isArray(v.cast)) {
        for (const actor of v.cast) {
          const cleanActor = String(actor || '').trim();
          if (cleanActor) {
            byActor.set(cleanActor, (byActor.get(cleanActor) || 0) + 1);
          }
        }
      }

      if (v.studio) {
        const cleanStudio = String(v.studio).trim();
        if (cleanStudio) {
          byStudio.set(cleanStudio, (byStudio.get(cleanStudio) || 0) + 1);
        }
      }
    }

    const now = new Date();
    let monthsDenominator = Math.max(1, distinctMonths.size);
    if (monthFilter === 'ALL' && yearFilter === String(now.getFullYear())) {
      monthsDenominator = now.getMonth() + 1;
    } else if (monthFilter !== 'ALL') {
      monthsDenominator = 1;
    }

    const avgSpentPerVisit = total > 0 ? totalSpent / total : 0;
    const avgSpentPerMonth = total > 0 ? totalSpent / monthsDenominator : 0;
    const avgVisitsPerMonth = total > 0 ? total / monthsDenominator : 0;
    const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;

    // Dia da Semana Favorito
    let favWeekdayIdx = 0;
    let maxWeekdayCount = 0;
    weekdayCounts.forEach((cnt, idx) => {
      if (cnt > maxWeekdayCount) {
        maxWeekdayCount = cnt;
        favWeekdayIdx = idx;
      }
    });
    const favWeekdayName = maxWeekdayCount > 0 ? WEEKDAY_NAMES[favWeekdayIdx] : '—';
    const favWeekdayPct =
      total > 0 ? Math.round((maxWeekdayCount / total) * 100) : 0;

    const maxMonthCount = Math.max(1, ...monthlyCounts);

    const topCinemas = [...byCinema.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCompanies = [...byCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topGenres = [...byGenre.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topDirectors = [...byDirector.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topActors = [...byActor.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topStudios = [...byStudio.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Progresso da Meta Anual (no ano atual)
    const currentYearStr = String(now.getFullYear());
    const currentYearVisitsCount = visits.filter((v) =>
      String(v.visit_date || '').startsWith(currentYearStr)
    ).length;
    const goalTarget = Math.max(1, Number(annualGoal || 24));
    const goalPct = Math.min(
      100,
      Math.round((currentYearVisitsCount / goalTarget) * 100)
    );

    return {
      total,
      totalSpent,
      totalMinutes,
      avgSpentPerVisit,
      avgSpentPerMonth,
      avgVisitsPerMonth,
      monthsDenominator,
      avgRating,
      preReleaseCount,
      reexibicaoCount,
      rewatchCount,
      byOrigin,
      spentByOrigin,
      byFormat,
      byAudio,
      weekdayCounts,
      maxWeekdayCount: Math.max(1, maxWeekdayCount),
      favWeekdayName,
      favWeekdayPct,
      monthlyCounts,
      monthlySpent,
      maxMonthCount,
      topCinemas,
      topCompanies,
      topGenres,
      topDirectors,
      topActors,
      topStudios,
      currentYearVisitsCount,
      goalTarget,
      goalPct,
    };
  }, [filteredVisits, visits, yearFilter, monthFilter, annualGoal]);

  const handleSaveGoal = (e) => {
    e.preventDefault();
    const num = Math.max(1, parseInt(goalInput, 10) || 24);
    if (onUpdateAnnualGoal) onUpdateAnnualGoal(num);
    setEditingGoal(false);
  };

  const getCountdownLabel = (releaseDateStr) => {
    if (!releaseDateStr) return 'Sem data';
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (releaseDateStr <= todayStr) {
      return `Em Cartaz (${formatDateBR(releaseDateStr)})`;
    }
    const diffDays = Math.ceil(
      (new Date(`${releaseDateStr}T12:00:00`).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `Estreia em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} (${formatDateBR(
      releaseDateStr
    )})`;
  };

  return (
    <div className="lb-dataview-container">
      {/* Topo da página Visualizar Dados ou Em Breve */}
      <div className="lb-dataview-topbar">
        <button type="button" className="lb-back-btn" onClick={onBackHome}>
          <ArrowLeft size={18} /> Voltar ao Início
        </button>

        {mode === 'upcoming' ? (
          <div className="lb-upcoming-page-title">
            <Bookmark size={16} />
            <span>Em Breve & Quero Ver no Cinema</span>
          </div>
        ) : (
          <div className="lb-view-tabs">
            <button
              type="button"
              className={`lb-tab-btn ${activeTab === 'diary' ? 'active' : ''}`}
              onClick={() => setActiveTab('diary')}
            >
              <CalendarIcon size={15} /> Diário
            </button>
            <button
              type="button"
              className={`lb-tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
              onClick={() => setActiveTab('grid')}
            >
              <Grid size={15} /> Galeria
            </button>
            <button
              type="button"
              className={`lb-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 size={15} /> Estatísticas
            </button>
          </div>
        )}

        {!isReadOnlyVisitor && (
          <button
            type="button"
            className="lb-btn-primary lb-btn-sm"
            onClick={onAddClick}
          >
            <Plus size={16} /> Adicionar Ida
          </button>
        )}
      </div>

      {/* Barra de Filtros (oculta apenas na tela Em Breve) */}
      {activeTab !== 'upcoming' && (
        <>
          <div className="lb-filters-bar">
            <div className="lb-filter-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Buscar filme, diretor, cinema, companhia ou comentário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="lb-filter-selects">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="lb-select"
              >
                <option value="ALL">Todos os Anos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Ano {y}
                  </option>
                ))}
              </select>

              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="lb-select"
              >
                <option value="ALL">Todos os Meses</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={String(idx + 1)}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="lb-select"
              >
                <option value="ALL">Formato: Todos</option>
                <option value="IMAX">IMAX</option>
                <option value="XD">XD</option>
                <option value="3D">3D</option>
                <option value="2D">2D</option>
              </select>

              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="lb-select"
              >
                <option value="ALL">Ingresso: Todos</option>
                <option value="Voucher">Voucher</option>
                <option value="Club">Club</option>
                <option value="Comprado">Comprado</option>
              </select>
            </div>
          </div>

          <div className="lb-filter-summary-strip">
            <span>
              Exibindo <strong>{filteredVisits.length}</strong>{' '}
              {filteredVisits.length === 1 ? 'ida ao cinema' : 'idas ao cinema'}
            </span>
            <span className="lb-strip-divider">•</span>
            <span>
              Tempo de tela:{' '}
              <strong>{formatMinutesToHours(stats.totalMinutes)}</strong>
            </span>
            <span className="lb-strip-divider">•</span>
            <span>
              Média por ida:{' '}
              <strong>{formatCurrencyBRL(stats.avgSpentPerVisit)}</strong>
            </span>
            <span className="lb-strip-divider">•</span>
            <span>
              Total: <strong>{formatCurrencyBRL(stats.totalSpent)}</strong>
            </span>
          </div>
        </>
      )}

      {/* ABA 1: DIÁRIO (TIMELINE ESTILO LETTERBOXD) */}
      {activeTab === 'diary' && (
        <div className="lb-diary-wrapper">
          {diaryGroups.length === 0 ? (
            <div className="lb-empty-state">
              <Film size={40} />
              <h3>Nenhuma ida encontrada</h3>
              <p>Registre sua primeira ida ao cinema ou ajuste os filtros acima.</p>
            </div>
          ) : (
            diaryGroups.map((group) => (
              <div key={group.key} className="lb-diary-month-block">
                <div className="lb-diary-month-header">
                  <span>{group.label.toUpperCase()}</span>
                  <span className="lb-diary-month-count">
                    {group.items.length} {group.items.length === 1 ? 'filme' : 'filmes'}
                  </span>
                </div>

                <div className="lb-diary-rows">
                  {group.items.map((visit) => {
                    const dayNum = visit.visit_date
                      ? visit.visit_date.slice(8, 10)
                      : '--';
                    const people = parseCompanions(
                      visit.companionsList || visit.company
                    );
                    const fmtKey = String(visit.session_format || '2D').toLowerCase();

                    return (
                      <div
                        key={visit.id}
                        className="lb-diary-row"
                        onClick={() => setSelectedVisitDetail(visit)}
                      >
                        <div className="lb-diary-day-col">
                          <span className="lb-diary-day-number">{dayNum}</span>
                        </div>

                        <div className="lb-diary-poster-col">
                          {visit.poster_url ? (
                            <img
                              src={visit.poster_url}
                              alt={visit.title}
                              className="lb-diary-thumb"
                              loading="lazy"
                            />
                          ) : (
                            <div className="lb-diary-thumb-placeholder">
                              <Film size={18} />
                            </div>
                          )}
                        </div>

                        <div className="lb-diary-main-col">
                          <div className="lb-diary-title-line">
                            <h4 className="lb-diary-movie-title">{visit.title}</h4>
                            {visit.release_date && (
                              <span className="lb-diary-release-year">
                                ({visit.release_date.slice(0, 4)})
                              </span>
                            )}
                            {visit.runtime > 0 && (
                              <span className="lb-diary-runtime-pill">
                                <Clock size={11} /> {visit.runtime}m
                              </span>
                            )}
                          </div>

                          <div className="lb-diary-badges-line">
                            {visit.isPreRelease && (
                              <span
                                className="lb-tag lb-tag-prerelease"
                                title="Pré-estreia (assistido antes do lançamento oficial)"
                              >
                                <Sparkles size={11} /> PRÉ
                              </span>
                            )}
                            {visit.isReexibicao && (
                              <span
                                className="lb-tag lb-tag-reexibicao"
                                title="Reexibição (assistido mais de 1 ano após o lançamento oficial)"
                              >
                                <History size={11} /> RE
                              </span>
                            )}
                            {visit.isRewatch && (
                              <span
                                className="lb-tag lb-tag-rewatch"
                                title="Reassistido (Rewatch)"
                              >
                                <RotateCcw size={11} /> REWATCH
                              </span>
                            )}
                            <span className={`lb-tag lb-tag-format brand-${fmtKey}`}>
                              {visit.session_format}
                            </span>
                            <span
                              className={`lb-tag lb-tag-origin orig-${String(
                                visit.ticket_origin
                              ).toLowerCase()}`}
                            >
                              {visit.ticket_origin}
                            </span>
                            <span className="lb-tag lb-tag-audio">
                              {visit.audio_type}
                            </span>
                            {visit.isAlone ? (
                              <span className="lb-tag lb-tag-soz" title="Sozinho">
                                <User size={11} /> SOZ
                              </span>
                            ) : (
                              <span className="lb-tag lb-tag-aco" title="Acompanhado">
                                <Users size={11} /> ACO
                              </span>
                            )}
                          </div>

                          <div className="lb-diary-submeta">
                            {visit.cinema_location && (
                              <span>
                                <MapPin size={12} /> {visit.cinema_location}
                              </span>
                            )}
                            {visit.seat && (
                              <span>
                                <Armchair size={12} /> {visit.seat}
                              </span>
                            )}
                            <span className="lb-diary-companions-inline">
                              <Users size={12} />
                              {people.length === 0 ? (
                                <span>Sozinho</span>
                              ) : (
                                people.map((p) => (
                                  <span key={p} className="lb-mini-person-pill">
                                    {p}
                                  </span>
                                ))
                              )}
                            </span>
                            {visit.director && (
                              <span>
                                <Clapperboard size={12} /> {visit.director}
                              </span>
                            )}
                          </div>

                          {visit.notes && (
                            <p className="lb-diary-comment-preview">
                              <MessageSquare size={11} /> "{visit.notes}"
                            </p>
                          )}
                        </div>

                        <div className="lb-diary-rating-col">
                          <StarDisplay rating={visit.rating} size="md" />
                          <span className="lb-diary-price">
                            {formatCurrencyBRL(visit.price_paid)}
                          </span>
                        </div>

                        {!isReadOnlyVisitor && (
                          <div
                            className="lb-diary-actions-col"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="lb-row-action-btn"
                              onClick={() => onEditVisit(visit)}
                              title="Editar ida"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              className="lb-row-action-btn danger"
                              onClick={() => onDeleteVisit(visit)}
                              title="Excluir ida"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 2: GALERIA DE PÔSTERES */}
      {activeTab === 'grid' && (
        <div className="lb-poster-gallery-grid">
          {filteredVisits.length === 0 ? (
            <div className="lb-empty-state">
              <Film size={40} />
              <h3>Nenhum pôster para exibir</h3>
            </div>
          ) : (
            filteredVisits.map((visit) => {
              const fmtKey = String(visit.session_format || '2D').toLowerCase();
              return (
                <div
                  key={visit.id}
                  className="lb-poster-card"
                  onClick={() => setSelectedVisitDetail(visit)}
                >
                  <div className="lb-poster-frame">
                    {visit.poster_url ? (
                      <img
                        src={visit.poster_url}
                        alt={visit.title}
                        className="lb-poster-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="lb-poster-fallback">
                        <Film size={28} />
                        <span>{visit.title}</span>
                      </div>
                    )}

                    <div className="lb-poster-top-badges">
                      {visit.isPreRelease && (
                        <span className="lb-mini-badge prerelease" title="Pré-estreia">
                          PRÉ
                        </span>
                      )}
                      {visit.isReexibicao && (
                        <span
                          className="lb-mini-badge reexibicao"
                          title="Reexibição (>1 ano após lançamento)"
                        >
                          RE
                        </span>
                      )}
                      {visit.isRewatch && (
                        <span className="lb-mini-badge rewatch" title="Rewatch">
                          <RotateCcw size={10} />
                        </span>
                      )}
                      <span className={`lb-mini-badge format brand-${fmtKey}`}>
                        {visit.session_format}
                      </span>
                    </div>

                    <div className="lb-poster-bottom-badges">
                      {visit.isAlone ? (
                        <span className="lb-mini-badge company-soz">
                          <User size={10} strokeWidth={2.5} /> SOZ
                        </span>
                      ) : (
                        <span className="lb-mini-badge company-aco">
                          <Users size={10} strokeWidth={2.5} /> ACO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="lb-poster-caption">
                    <h4 className="lb-poster-title" title={visit.title}>
                      {visit.title}
                    </h4>
                    <div className="lb-poster-meta-row">
                      <StarDisplay rating={visit.rating} size="sm" />
                      <span className="lb-poster-date-small">
                        {formatDateBR(visit.visit_date).slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ABA 3: ESTATÍSTICAS COMPLETAS */}
      {activeTab === 'stats' && (
        <div className="lb-stats-dashboard">
          {/* Meta do Ano (Item 8) */}
          <div className="lb-goal-banner-card">
            <div className="lb-goal-top">
              <div>
                <span className="lb-eyebrow">
                  <Target size={12} style={{ verticalAlign: 'middle' }} /> META ANUAL DE
                  CINEMA ({new Date().getFullYear()})
                </span>
                <h3>
                  {stats.currentYearVisitsCount} de {stats.goalTarget} idas ao cinema (
                  {stats.goalPct}%)
                </h3>
              </div>

              {!isReadOnlyVisitor && (
                <div>
                  {editingGoal ? (
                    <form onSubmit={handleSaveGoal} className="lb-goal-edit-form">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        className="lb-input lb-input-sm"
                        style={{ width: '75px' }}
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                      />
                      <button type="submit" className="lb-btn-primary lb-btn-sm">
                        <Check size={14} /> Salvar
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="lb-btn-small-outline"
                      onClick={() => setEditingGoal(true)}
                    >
                      Alterar Meta ({stats.goalTarget})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="lb-comparison-track">
              <div
                className="lb-comparison-fill-free"
                style={{ width: `${stats.goalPct}%` }}
              />
            </div>
          </div>

          {/* Card Principal: Médias de Gastos, Tempo de Tela Grande e Frequência */}
          <div className="lb-stats-hero-card">
            <div className="lb-stats-hero-header">
              <div>
                <span className="lb-eyebrow">
                  MÉDIAS FINANCEIRAS & TEMPO TOTAL DE TELA GRANDE
                </span>
                <h3>Resumo de Custos, Frequência e Horas de Sala</h3>
              </div>
              <div className="lb-stats-free-pill">
                Média de {stats.avgVisitsPerMonth.toFixed(1).replace('.0', '')} idas / mês
              </div>
            </div>

            <div className="lb-stats-kpi-grid lb-stats-kpi-4">
              <div className="lb-kpi-box green">
                <span className="lb-kpi-label">Gasto Médio por Ida</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.avgSpentPerVisit)}
                </strong>
                <span className="lb-kpi-sub">
                  Custo médio por sessão ({stats.total} idas)
                </span>
              </div>

              <div className="lb-kpi-box blue">
                <span className="lb-kpi-label">Média de Gasto Mensal</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.avgSpentPerMonth)}
                </strong>
                <span className="lb-kpi-sub">
                  Sobre {stats.monthsDenominator}{' '}
                  {stats.monthsDenominator === 1 ? 'mês' : 'meses'} no período
                </span>
              </div>

              <div className="lb-kpi-box orange">
                <span className="lb-kpi-label">Gasto Total Acumulado</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.totalSpent)}
                </strong>
                <span className="lb-kpi-sub">Soma de todos os custos</span>
              </div>

              <div className="lb-kpi-box purple">
                <span className="lb-kpi-label">Tempo na Sala de Cinema</span>
                <strong className="lb-kpi-value">
                  {formatMinutesToHours(stats.totalMinutes)}
                </strong>
                <span className="lb-kpi-sub">
                  {stats.totalMinutes} minutos de tela grande
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico Mensal de Idas e Gastos (Jan a Dez) - Item 3 */}
          <div className="lb-stat-panel">
            <div className="lb-panel-header-split">
              <h4>
                <CalendarIcon size={16} /> Evolução Mensal de Idas e Gastos (Jan – Dez)
              </h4>
              <span className="lb-label-subtle">
                Passe o mouse ou toque na barra para ver o gasto do mês
              </span>
            </div>

            <div className="lb-monthly-chart-grid">
              {MONTH_SHORT.map((mName, idx) => {
                const count = stats.monthlyCounts[idx];
                const spent = stats.monthlySpent[idx];
                const heightPct = Math.round(
                  (count / stats.maxMonthCount) * 100
                );
                return (
                  <div
                    key={mName}
                    className="lb-month-bar-col"
                    title={`${MONTH_NAMES[idx]}: ${count} ida(s) • Gasto: ${formatCurrencyBRL(
                      spent
                    )}`}
                  >
                    <span className="lb-month-bar-val">
                      {count > 0 ? count : ''}
                    </span>
                    <div className="lb-month-bar-track">
                      <div
                        className={`lb-month-bar-fill ${count > 0 ? 'has-val' : ''}`}
                        style={{ height: `${Math.max(count > 0 ? 12 : 3, heightPct)}%` }}
                      />
                    </div>
                    <span className="lb-month-bar-label">{mName}</span>
                    <span className="lb-month-bar-spent">
                      {spent > 0 ? `R$${Math.round(spent)}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lb-stats-cards-grid">
            {/* Dia da Semana Favorito (Item 1) */}
            <div className="lb-stat-panel">
              <div className="lb-panel-header-split">
                <h4>
                  <CalendarIcon size={16} /> Dia da Semana Favorito
                </h4>
                {stats.total > 0 && (
                  <span className="lb-fav-day-badge">
                    Dia oficial: <strong>{stats.favWeekdayName}</strong> (
                    {stats.favWeekdayPct}%)
                  </span>
                )}
              </div>

              <div className="lb-weekday-chart">
                {WEEKDAY_SHORT.map((wLabel, idx) => {
                  const cnt = stats.weekdayCounts[idx];
                  const pct = Math.round((cnt / stats.maxWeekdayCount) * 100);
                  const isTop =
                    cnt > 0 && cnt === stats.maxWeekdayCount;
                  return (
                    <div key={wLabel} className="lb-weekday-col">
                      <span className="lb-weekday-count">{cnt}</span>
                      <div className="lb-weekday-track">
                        <div
                          className={`lb-weekday-fill ${isTop ? 'top' : ''}`}
                          style={{ height: `${Math.max(cnt > 0 ? 14 : 4, pct)}%` }}
                        />
                      </div>
                      <span className={`lb-weekday-name ${isTop ? 'top' : ''}`}>
                        {wLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Gêneros, Atores & Estúdios no Cinema */}
            <div className="lb-stat-panel">
              <h4>
                <Clapperboard size={16} /> Top Gêneros, Atores & Estúdios (TMDB)
              </h4>
              <div className="lb-ranking-triple">
                <div>
                  <span className="lb-ranking-subtitle">Gêneros mais vistos</span>
                  {stats.topGenres.length === 0 ? (
                    <p className="lb-muted-small">Calculando via TMDB...</p>
                  ) : (
                    <ul className="lb-ranking-list">
                      {stats.topGenres.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}x</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className="lb-ranking-subtitle">Atores mais vistos</span>
                  {stats.topActors.length === 0 ? (
                    <p className="lb-muted-small">Calculando via TMDB...</p>
                  ) : (
                    <ul className="lb-ranking-list">
                      {stats.topActors.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}x</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className="lb-ranking-subtitle">Estúdios / Produtoras</span>
                  {stats.topStudios.length === 0 ? (
                    <p className="lb-muted-small">Calculando via TMDB...</p>
                  ) : (
                    <ul className="lb-ranking-list">
                      {stats.topStudios.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}x</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Origem do Ingresso + Custo Médio por Modalidade */}
            <div className="lb-stat-panel">
              <h4>
                <Ticket size={16} /> Por Origem & Gasto Médio por Modalidade
              </h4>
              <div className="lb-bar-list">
                {['Club', 'Voucher', 'Comprado'].map((orig) => {
                  const count = stats.byOrigin[orig] || 0;
                  const totalOrigSpent = stats.spentByOrigin[orig] || 0;
                  const avgOrig = count > 0 ? totalOrigSpent / count : 0;
                  const pct =
                    stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={orig} className="lb-bar-item">
                      <div className="lb-bar-item-top">
                        <span>
                          <strong>{orig}</strong> — {count}x ({pct}%)
                        </span>
                        <span className="lb-bar-avg-tag">
                          Média: {formatCurrencyBRL(avgOrig)}/ida
                        </span>
                      </div>
                      <div className="lb-bar-bg">
                        <div
                          className={`lb-bar-fg orig-${orig.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formato da Sala */}
            <div className="lb-stat-panel">
              <h4>
                <Film size={16} /> Por Formato de Sala
              </h4>
              <div className="lb-bar-list">
                {['IMAX', 'XD', '3D', '2D'].map((fmt) => {
                  const count = stats.byFormat[fmt] || 0;
                  const pct =
                    stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={fmt} className="lb-bar-item">
                      <div className="lb-bar-item-top">
                        <span
                          className={`lb-stat-fmt-label brand-text-${fmt.toLowerCase()}`}
                        >
                          {fmt}
                        </span>
                        <strong>
                          {count} ({pct}%)
                        </strong>
                      </div>
                      <div className="lb-bar-bg">
                        <div
                          className={`lb-bar-fg fmt-${fmt.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Áudio & Destaques */}
            <div className="lb-stat-panel">
              <h4>
                <Award size={16} /> Áudio & Destaques do Diário
              </h4>
              <div className="lb-bar-list">
                {['Legendado', 'Dublado', 'Original'].map((aud) => {
                  const count = stats.byAudio[aud] || 0;
                  const pct =
                    stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={aud} className="lb-bar-item">
                      <div className="lb-bar-item-top">
                        <span>{aud}</span>
                        <strong>
                          {count} ({pct}%)
                        </strong>
                      </div>
                      <div className="lb-bar-bg">
                        <div className="lb-bar-fg" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="lb-mini-highlights-row lb-mini-highlights-4">
                <div className="lb-mini-highlight">
                  <Sparkles size={14} />
                  <div>
                    <strong>{stats.preReleaseCount}</strong>
                    <span>Pré (PRÉ)</span>
                  </div>
                </div>
                <div className="lb-mini-highlight">
                  <History size={14} />
                  <div>
                    <strong>{stats.reexibicaoCount}</strong>
                    <span>Reexib. (RE)</span>
                  </div>
                </div>
                <div className="lb-mini-highlight">
                  <RotateCcw size={14} />
                  <div>
                    <strong>{stats.rewatchCount}</strong>
                    <span>Rewatches</span>
                  </div>
                </div>
                <div className="lb-mini-highlight">
                  <span className="lb-green-star">★</span>
                  <div>
                    <strong>{stats.avgRating.toFixed(1)}</strong>
                    <span>Nota Média</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Cinemas e Companhias */}
            <div className="lb-stat-panel">
              <h4>
                <MapPin size={16} /> Top Cinemas & Companhias
              </h4>
              <div className="lb-ranking-split">
                <div>
                  <span className="lb-ranking-subtitle">Cinemas mais visitados</span>
                  {stats.topCinemas.length === 0 ? (
                    <p className="lb-muted-small">Nenhum local informado</p>
                  ) : (
                    <ul className="lb-ranking-list">
                      {stats.topCinemas.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}x</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <span className="lb-ranking-subtitle">Companhias (por pessoa)</span>
                  {stats.topCompanies.length === 0 ? (
                    <p className="lb-muted-small">Sem registros</p>
                  ) : (
                    <ul className="lb-ranking-list">
                      {stats.topCompanies.map(([name, count]) => (
                        <li key={name}>
                          <span>{name}</span>
                          <strong>{count}x</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: EM BREVE / QUERO VER NO CINEMA (Item 6) */}
      {activeTab === 'upcoming' && (
        <div className="lb-upcoming-container">
          <div className="lb-upcoming-header-card">
            <div className="lb-upcoming-subtabs">
              <button
                type="button"
                className={`lb-seg-btn ${
                  upcomingSubTab === 'watchlist' ? 'active' : ''
                }`}
                onClick={() => setUpcomingSubTab('watchlist')}
              >
                <BookmarkCheck size={14} /> Quero Ver no Cinema ({watchlist.length})
              </button>
              <button
                type="button"
                className={`lb-seg-btn ${
                  upcomingSubTab === 'upcoming' ? 'active' : ''
                }`}
                onClick={() => setUpcomingSubTab('upcoming')}
              >
                <Sparkles size={14} /> Próximas Estreias (Brasil)
              </button>
              <button
                type="button"
                className={`lb-seg-btn ${
                  upcomingSubTab === 'now_playing' ? 'active' : ''
                }`}
                onClick={() => setUpcomingSubTab('now_playing')}
              >
                <Film size={14} /> Em Cartaz Agora
              </button>
            </div>

            {!isReadOnlyVisitor && (
              <div className="lb-upcoming-search-wrap">
                <div className="lb-filter-search">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Buscar qualquer filme para adicionar à sua lista Quero Ver..."
                    value={watchlistSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWatchlistSearch(val);
                      if (val.trim().length >= 2) {
                        setIsSearchingWatchlist(true);
                      } else {
                        setIsSearchingWatchlist(false);
                        setWatchlistSearchResults([]);
                      }
                    }}
                  />
                  {isSearchingWatchlist && (
                    <Loader2 size={16} className="lb-spin-icon" />
                  )}
                </div>

                {(isSearchingWatchlist ||
                  watchlistSearchResults.length > 0 ||
                  watchlistSearch.trim().length >= 2) && (
                  <div className="lb-search-dropdown">
                    {isSearchingWatchlist && (
                      <div className="lb-search-loading-row">
                        <Loader2 size={15} className="lb-spin-icon" />
                        <span>
                          Pesquisando filmes no TMDB para "{watchlistSearch.trim()}"...
                        </span>
                      </div>
                    )}
                    {!isSearchingWatchlist &&
                      watchlistSearchResults.length === 0 &&
                      watchlistSearch.trim().length >= 2 && (
                        <div className="lb-search-loading-row muted">
                          <span>
                            Nenhum filme encontrado para "{watchlistSearch.trim()}".
                          </span>
                        </div>
                      )}
                    {watchlistSearchResults.map((item, idx) => (
                      <button
                        key={`${item.tmdbId || idx}-${item.title}`}
                        type="button"
                        className="lb-search-option"
                        onClick={() => {
                          if (onToggleWatchlistItem) onToggleWatchlistItem(item);
                          setWatchlistSearch('');
                          setWatchlistSearchResults([]);
                          setIsSearchingWatchlist(false);
                        }}
                      >
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="lb-search-thumb"
                          />
                        ) : (
                          <div className="lb-search-thumb-empty">
                            <Film size={16} />
                          </div>
                        )}
                        <div className="lb-search-meta">
                          <strong>{item.title}</strong>
                          <span>
                            Estreia: {formatDateBR(item.releaseDate)}
                          </span>
                        </div>
                        <span className="lb-search-source-tag">+ Quero Ver</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {upcomingSubTab === 'watchlist' ? (
            sortedWatchlist.length === 0 ? (
              <div className="lb-empty-state">
                <Bookmark size={40} />
                <h3>Sua lista "Quero Ver no Cinema" está vazia</h3>
                <p>
                  Use a busca acima ou explore as abas <strong>Próximas Estreias</strong> e{' '}
                  <strong>Em Cartaz Agora</strong> para salvar os filmes que você planeja
                  ver na telona!
                </p>
              </div>
            ) : (
              <div className="lb-poster-gallery-grid">
                {sortedWatchlist.map((movie) => (
                  <div
                    key={movie.tmdbId || movie.title}
                    className="lb-poster-card"
                    onClick={() => handleOpenUpcomingMovieDetail(movie)}
                    title="Clique para ver estreia, diretor, atores, duração e sinopse"
                  >
                    <div className="lb-poster-frame">
                      {movie.posterUrl ? (
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="lb-poster-img"
                        />
                      ) : (
                        <div className="lb-poster-fallback">
                          <Film size={28} />
                          <span>{movie.title}</span>
                        </div>
                      )}
                      <div className="lb-poster-top-badges">
                        <span className="lb-mini-badge prerelease">
                          {getCountdownLabel(movie.releaseDate)}
                        </span>
                      </div>
                    </div>

                    <div className="lb-poster-caption">
                      <h4 className="lb-poster-title" title={movie.title}>
                        {movie.title}
                      </h4>
                      {!isReadOnlyVisitor && (
                        <div
                          className="lb-watchlist-card-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="lb-btn-primary lb-btn-xs"
                            onClick={() =>
                              onLogFromWatchlist && onLogFromWatchlist(movie)
                            }
                          >
                            <Plus size={12} /> Já Fui!
                          </button>
                          <button
                            type="button"
                            className="lb-poster-delete-btn"
                            onClick={() =>
                              onToggleWatchlistItem && onToggleWatchlistItem(movie)
                            }
                            title="Remover da lista Quero Ver"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : loadingReleases ? (
            <div className="lb-empty-state">
              <Loader2 size={32} className="lb-spin-icon" />
              <p>Buscando calendário de filmes do Brasil no TMDB...</p>
            </div>
          ) : (
            <>
              <div className="lb-poster-gallery-grid">
                {tmdbReleases.map((movie) => {
                  const isSaved = watchlist.some(
                    (w) =>
                      (w.tmdbId && w.tmdbId === movie.tmdbId) ||
                      w.title === movie.title
                  );
                  return (
                    <div
                      key={movie.tmdbId || movie.title}
                      className="lb-poster-card"
                      onClick={() => handleOpenUpcomingMovieDetail(movie)}
                      title="Clique para ver estreia, diretor, atores, duração e sinopse"
                    >
                      <div className="lb-poster-frame">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="lb-poster-img"
                          loading="lazy"
                        />
                        <div className="lb-poster-top-badges">
                          <span className="lb-mini-badge format">
                            {getCountdownLabel(movie.releaseDate)}
                          </span>
                        </div>
                      </div>

                      <div className="lb-poster-caption">
                        <h4 className="lb-poster-title" title={movie.title}>
                          {movie.title}
                        </h4>
                        {!isReadOnlyVisitor && (
                          <div
                            className="lb-watchlist-card-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`lb-btn-xs ${
                                isSaved ? 'lb-btn-secondary' : 'lb-btn-outline-green'
                              }`}
                              onClick={() =>
                                onToggleWatchlistItem && onToggleWatchlistItem(movie)
                              }
                            >
                              {isSaved ? '✓ Salvo' : '+ Quero Ver'}
                            </button>
                            <button
                              type="button"
                              className="lb-btn-primary lb-btn-xs"
                              onClick={() =>
                                onLogFromWatchlist && onLogFromWatchlist(movie)
                              }
                            >
                              Registrar Ida
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMoreReleases && (
                <div className="lb-load-more-wrap">
                  <button
                    type="button"
                    className="lb-btn-secondary"
                    onClick={handleLoadMoreReleases}
                    disabled={loadingMoreReleases}
                  >
                    {loadingMoreReleases ? (
                      <>
                        <Loader2 size={16} className="lb-spin-icon" /> Carregando mais 20
                        filmes...
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Carregar Mais Filmes (+20)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de Detalhes Básicos e Ficha Técnica do Filme (Abas de Em Breve) */}
      {selectedUpcomingMovie && (
        <div
          className="lb-modal-backdrop"
          onClick={() => setSelectedUpcomingMovie(null)}
        >
          <div
            className="lb-modal-card lb-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lb-detail-layout">
              {selectedUpcomingMovie.posterUrl ? (
                <img
                  src={selectedUpcomingMovie.posterUrl}
                  alt={selectedUpcomingMovie.title}
                  className="lb-detail-poster"
                />
              ) : (
                <div className="lb-detail-poster-empty">
                  <Film size={36} />
                </div>
              )}

              <div className="lb-detail-info">
                <div className="lb-diary-badges-line">
                  <span className="lb-tag lb-tag-prerelease">
                    <CalendarIcon size={11} />{' '}
                    {getCountdownLabel(selectedUpcomingMovie.releaseDate)}
                  </span>
                  {selectedUpcomingMovie.studio && (
                    <span className="lb-tag lb-tag-origin">
                      🏛️ {selectedUpcomingMovie.studio}
                    </span>
                  )}
                  {selectedUpcomingMovie.runtime > 0 && (
                    <span className="lb-tag lb-tag-audio">
                      <Clock size={11} /> {selectedUpcomingMovie.runtime} min
                    </span>
                  )}
                  {selectedUpcomingMovie.tmdbRating > 0 && (
                    <span className="lb-tag lb-tag-rewatch">
                      ★ TMDB {selectedUpcomingMovie.tmdbRating}
                    </span>
                  )}
                </div>

                <h2>{selectedUpcomingMovie.title}</h2>
                {selectedUpcomingMovie.originalTitle &&
                  selectedUpcomingMovie.originalTitle !==
                    selectedUpcomingMovie.title && (
                    <p
                      className="lb-muted-small"
                      style={{ marginTop: '-6px', marginBottom: '10px' }}
                    >
                      Título original: <em>{selectedUpcomingMovie.originalTitle}</em>
                    </p>
                  )}

                {loadingUpcomingDetail && (
                  <div
                    className="lb-search-loading-row"
                    style={{ marginBottom: '12px', borderRadius: '8px' }}
                  >
                    <Loader2 size={15} className="lb-spin-icon" />
                    <span>
                      Buscando diretor, elenco, duração e produtora no TMDB...
                    </span>
                  </div>
                )}

                <div className="lb-detail-grid">
                  <div>
                    <span>Dia de Estreia</span>
                    <strong>
                      {formatDateBR(selectedUpcomingMovie.releaseDate)}
                    </strong>
                  </div>
                  <div>
                    <span>Duração</span>
                    <strong>
                      {selectedUpcomingMovie.runtime > 0
                        ? `${selectedUpcomingMovie.runtime} minutos`
                        : loadingUpcomingDetail
                        ? 'Carregando...'
                        : 'Não informada'}
                    </strong>
                  </div>
                  <div>
                    <span>Direção</span>
                    <strong>
                      {selectedUpcomingMovie.director ||
                        (loadingUpcomingDetail ? 'Carregando...' : 'Não informado')}
                    </strong>
                  </div>
                  <div>
                    <span>Estúdio / Distribuidora</span>
                    <strong>
                      {selectedUpcomingMovie.studio ||
                        (loadingUpcomingDetail ? 'Carregando...' : 'Não informado')}
                    </strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span>Atores Principais (Top 3)</span>
                    <strong>
                      {selectedUpcomingMovie.cast?.length > 0
                        ? selectedUpcomingMovie.cast.slice(0, 3).join(', ')
                        : loadingUpcomingDetail
                        ? 'Carregando elenco...'
                        : 'Elenco ainda não divulgado'}
                    </strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span>Gêneros</span>
                    <strong>
                      {selectedUpcomingMovie.genres?.length > 0
                        ? selectedUpcomingMovie.genres.join(', ')
                        : loadingUpcomingDetail
                        ? 'Carregando...'
                        : 'Não informados'}
                    </strong>
                  </div>
                  {selectedUpcomingMovie.overview && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span>Sinopse</span>
                      <p className="lb-detail-comment-box" style={{ fontStyle: 'normal' }}>
                        {selectedUpcomingMovie.overview}
                      </p>
                    </div>
                  )}
                </div>

                <div className="lb-detail-actions">
                  <button
                    type="button"
                    className="lb-btn-secondary"
                    onClick={() => setSelectedUpcomingMovie(null)}
                  >
                    Fechar
                  </button>
                  {!isReadOnlyVisitor && (
                    <>
                      <button
                        type="button"
                        className="lb-btn-outline-green"
                        onClick={() => {
                          if (onToggleWatchlistItem) {
                            onToggleWatchlistItem(selectedUpcomingMovie);
                          }
                        }}
                      >
                        {watchlist.some(
                          (w) =>
                            (w.tmdbId &&
                              w.tmdbId === selectedUpcomingMovie.tmdbId) ||
                            w.title === selectedUpcomingMovie.title
                        )
                          ? '✓ Na Lista Quero Ver (Remover)'
                          : '+ Adicionar ao Quero Ver'}
                      </button>
                      <button
                        type="button"
                        className="lb-btn-primary"
                        onClick={() => {
                          const target = selectedUpcomingMovie;
                          setSelectedUpcomingMovie(null);
                          if (onLogFromWatchlist) onLogFromWatchlist(target);
                        }}
                      >
                        <Plus size={15} /> Já Fui! Registrar Ida
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes Rápidos da Ida */}
      {selectedVisitDetail && (
        <div
          className="lb-modal-backdrop"
          onClick={() => setSelectedVisitDetail(null)}
        >
          <div
            className="lb-modal-card lb-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lb-detail-layout">
              {selectedVisitDetail.poster_url ? (
                <img
                  src={selectedVisitDetail.poster_url}
                  alt={selectedVisitDetail.title}
                  className="lb-detail-poster"
                />
              ) : (
                <div className="lb-detail-poster-empty">
                  <Film size={36} />
                </div>
              )}

              <div className="lb-detail-info">
                <div className="lb-diary-badges-line">
                  {selectedVisitDetail.isPreRelease && (
                    <span className="lb-tag lb-tag-prerelease">
                      <Sparkles size={11} /> PRÉ-ESTREIA
                    </span>
                  )}
                  {selectedVisitDetail.isReexibicao && (
                    <span className="lb-tag lb-tag-reexibicao">
                      <History size={11} /> RE (REEXIBIÇÃO)
                    </span>
                  )}
                  {selectedVisitDetail.isRewatch && (
                    <span className="lb-tag lb-tag-rewatch">
                      <RotateCcw size={11} /> REASSISTIDO
                    </span>
                  )}
                  <span
                    className={`lb-tag lb-tag-format brand-${String(
                      selectedVisitDetail.session_format || '2D'
                    ).toLowerCase()}`}
                  >
                    {selectedVisitDetail.session_format}
                  </span>
                  <span className="lb-tag lb-tag-origin">
                    {selectedVisitDetail.ticket_origin}
                  </span>
                  <span className="lb-tag lb-tag-audio">
                    {selectedVisitDetail.audio_type}
                  </span>
                  {selectedVisitDetail.isAlone ? (
                    <span className="lb-tag lb-tag-soz">
                      <User size={11} /> SOZ
                    </span>
                  ) : (
                    <span className="lb-tag lb-tag-aco">
                      <Users size={11} /> ACO
                    </span>
                  )}
                </div>

                <h2>{selectedVisitDetail.title}</h2>

                {(selectedVisitDetail.runtime > 0 ||
                  selectedVisitDetail.director ||
                  selectedVisitDetail.studio ||
                  selectedVisitDetail.cast?.length > 0 ||
                  selectedVisitDetail.genres?.length > 0) && (
                  <div className="lb-tmdb-auto-meta-strip">
                    {selectedVisitDetail.runtime > 0 && (
                      <span>
                        <Clock size={12} /> {selectedVisitDetail.runtime} min
                      </span>
                    )}
                    {selectedVisitDetail.studio && (
                      <span>🏛️ {selectedVisitDetail.studio}</span>
                    )}
                    {selectedVisitDetail.director && (
                      <span>
                        <Clapperboard size={12} /> {selectedVisitDetail.director}
                      </span>
                    )}
                    {selectedVisitDetail.cast?.length > 0 && (
                      <span>⭐ {selectedVisitDetail.cast.slice(0, 3).join(', ')}</span>
                    )}
                    {selectedVisitDetail.genres?.length > 0 && (
                      <span>🎭 {selectedVisitDetail.genres.join(', ')}</span>
                    )}
                  </div>
                )}

                <div className="lb-detail-rating-row">
                  <StarDisplay
                    rating={selectedVisitDetail.rating}
                    size="lg"
                    showNumeric
                  />
                </div>

                <div className="lb-detail-grid">
                  <div>
                    <span>Dia da Ida</span>
                    <strong>{formatDateBR(selectedVisitDetail.visit_date)}</strong>
                  </div>
                  <div>
                    <span>Dia de Estreia</span>
                    <strong>{formatDateBR(selectedVisitDetail.release_date)}</strong>
                  </div>
                  <div>
                    <span>Custo / Valor Gasto</span>
                    <strong>{formatCurrencyBRL(selectedVisitDetail.price_paid)}</strong>
                  </div>
                  <div>
                    <span>Cinema / Local</span>
                    <strong>{selectedVisitDetail.cinema_location || '—'}</strong>
                  </div>
                  {selectedVisitDetail.seat && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span>Sala / Assento</span>
                      <strong>{selectedVisitDetail.seat}</strong>
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span>Companhia(s)</span>
                    <div className="lb-detail-companions-list">
                      {parseCompanions(
                        selectedVisitDetail.companionsList || selectedVisitDetail.company
                      ).length === 0 ? (
                        <strong>Sozinho (SOZ)</strong>
                      ) : (
                        parseCompanions(
                          selectedVisitDetail.companionsList || selectedVisitDetail.company
                        ).map((person) => (
                          <span key={person} className="lb-mini-person-pill">
                            {person}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  {selectedVisitDetail.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span>Comentário da Sessão</span>
                      <p className="lb-detail-comment-box">
                        "{selectedVisitDetail.notes}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="lb-detail-actions">
                  <button
                    type="button"
                    className="lb-btn-secondary"
                    onClick={() => setSelectedVisitDetail(null)}
                  >
                    Fechar
                  </button>
                  {!isReadOnlyVisitor && (
                    <>
                      <button
                        type="button"
                        className="lb-btn-primary"
                        onClick={() => {
                          const target = selectedVisitDetail;
                          setSelectedVisitDetail(null);
                          onEditVisit(target);
                        }}
                      >
                        <Edit3 size={15} /> Editar
                      </button>
                      <button
                        type="button"
                        className="lb-btn-danger"
                        onClick={() => {
                          const target = selectedVisitDetail;
                          setSelectedVisitDetail(null);
                          onDeleteVisit(target);
                        }}
                      >
                        <Trash2 size={15} /> Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
