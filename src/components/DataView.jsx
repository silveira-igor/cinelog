import React, { useState, useMemo } from 'react';
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
  DollarSign,
} from 'lucide-react';
import { StarDisplay } from './StarRating';
import { parseCompanions } from '../services/storage';

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

export default function DataView({
  visits,
  onBackHome,
  onAddClick,
  onEditVisit,
  onDeleteVisit,
}) {
  const [activeTab, setActiveTab] = useState('diary'); // 'grid' | 'diary' | 'stats'
  const [yearFilter, setYearFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisitDetail, setSelectedVisitDetail] = useState(null);

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
        if (!matchTitle && !matchCinema && !matchComp) return false;
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

  // Cálculo das Estatísticas baseadas em Médias (Gasto Médio por Ida, Média Mensal, etc.)
  const stats = useMemo(() => {
    const total = filteredVisits.length;
    let totalSpent = 0;
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

    for (const v of filteredVisits) {
      const price = Number(v.price_paid || 0);
      totalSpent += price;

      if (v.visit_date) {
        distinctMonths.add(v.visit_date.slice(0, 7));
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
    }

    // Cálculo de meses considerados para média mensal
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

    const topCinemas = [...byCinema.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const topCompanies = [...byCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    return {
      total,
      totalSpent,
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
      topCinemas,
      topCompanies,
    };
  }, [filteredVisits, yearFilter, monthFilter]);

  return (
    <div className="lb-dataview-container">
      {/* Topo da página Visualizar Dados */}
      <div className="lb-dataview-topbar">
        <button type="button" className="lb-back-btn" onClick={onBackHome}>
          <ArrowLeft size={18} /> Voltar ao Início
        </button>

        <div className="lb-view-tabs">
          <button
            type="button"
            className={`lb-tab-btn ${activeTab === 'diary' ? 'active' : ''}`}
            onClick={() => setActiveTab('diary')}
          >
            <CalendarIcon size={16} /> Diário
          </button>
          <button
            type="button"
            className={`lb-tab-btn ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
          >
            <Grid size={16} /> Galeria
          </button>
          <button
            type="button"
            className={`lb-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={16} /> Estatísticas
          </button>
        </div>

        <button type="button" className="lb-btn-primary lb-btn-sm" onClick={onAddClick}>
          <Plus size={16} /> Adicionar Ida
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="lb-filters-bar">
        <div className="lb-filter-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Buscar filme, cinema ou companhia..."
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

      {/* Resumo rápido baseado em Médias */}
      <div className="lb-filter-summary-strip">
        <span>
          Exibindo <strong>{filteredVisits.length}</strong>{' '}
          {filteredVisits.length === 1 ? 'ida ao cinema' : 'idas ao cinema'}
        </span>
        <span className="lb-strip-divider">•</span>
        <span>
          Média por ida: <strong>{formatCurrencyBRL(stats.avgSpentPerVisit)}</strong>
        </span>
        <span className="lb-strip-divider">•</span>
        <span>
          Total no período: <strong>{formatCurrencyBRL(stats.totalSpent)}</strong>
        </span>
      </div>

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
                            <span>Estreia: {formatDateBR(visit.release_date)}</span>
                          </div>
                        </div>

                        <div className="lb-diary-rating-col">
                          <StarDisplay rating={visit.rating} size="md" />
                          <span className="lb-diary-price">
                            {formatCurrencyBRL(visit.price_paid)}
                          </span>
                        </div>

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
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ABA 2: GALERIA DE PÔSTERES (ESTANTE LETTERBOXD) */}
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

      {/* ABA 3: ESTATÍSTICAS (BASEADAS EM MÉDIAS E VISÃO COMPLETA DE CUSTOS) */}
      {activeTab === 'stats' && (
        <div className="lb-stats-dashboard">
          {/* Card Principal: Médias de Gastos e Frequência */}
          <div className="lb-stats-hero-card">
            <div className="lb-stats-hero-header">
              <div>
                <span className="lb-eyebrow">
                  VISÃO COMPLETA DE CUSTOS (INGRESSO, DESLOCAMENTO, ALIMENTAÇÃO...)
                </span>
                <h3>Médias de Gastos e Frequência</h3>
              </div>
              <div className="lb-stats-free-pill">
                Média de {stats.avgVisitsPerMonth.toFixed(1).replace('.0', '')} idas / mês
              </div>
            </div>

            <div className="lb-stats-kpi-grid">
              <div className="lb-kpi-box green">
                <span className="lb-kpi-label">Gasto Médio por Ida</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.avgSpentPerVisit)}
                </strong>
                <span className="lb-kpi-sub">
                  Custo médio completo por sessão ({stats.total} idas)
                </span>
              </div>

              <div className="lb-kpi-box blue">
                <span className="lb-kpi-label">Média de Gasto Mensal</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.avgSpentPerMonth)}
                </strong>
                <span className="lb-kpi-sub">
                  Calculado sobre {stats.monthsDenominator}{' '}
                  {stats.monthsDenominator === 1 ? 'mês' : 'meses'} no período
                </span>
              </div>

              <div className="lb-kpi-box orange">
                <span className="lb-kpi-label">Gasto Total Acumulado</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.totalSpent)}
                </strong>
                <span className="lb-kpi-sub">
                  Soma de todos os custos registrados nas idas
                </span>
              </div>
            </div>
          </div>

          <div className="lb-stats-cards-grid">
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

            {/* Formato da Sala (com cores oficiais IMAX e XD) */}
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
                        <span className={`lb-stat-fmt-label brand-text-${fmt.toLowerCase()}`}>
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

            {/* Áudio & Destaques (PRÉ, RE, Rewatch, Nota Média) */}
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

      {/* Modal de Detalhes Rápidos da Ida ao clicar num card */}
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
                </div>

                <div className="lb-detail-actions">
                  <button
                    type="button"
                    className="lb-btn-secondary"
                    onClick={() => setSelectedVisitDetail(null)}
                  >
                    Fechar
                  </button>
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
