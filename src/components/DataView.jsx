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
  Users,
  Edit3,
  Trash2,
  Film,
  Ticket,
  DollarSign,
  Award,
} from 'lucide-react';
import { StarDisplay } from './StarRating';

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

  // Lista de anos disponíveis nas idas cadastradas
  const availableYears = useMemo(() => {
    const years = new Set();
    visits.forEach((v) => {
      if (v.visit_date) years.add(v.visit_date.slice(0, 4));
    });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [visits]);

  // Filtra as idas conforme os controles superiores
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

  // Agrupamento por Mês/Ano para a aba Diário (Timeline)
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

  // Cálculo completo das Estatísticas (Stats)
  const stats = useMemo(() => {
    const total = filteredVisits.length;
    let totalSpent = 0;
    let freeVisitsCount = 0; // R$ 0 ou Voucher/Club sem custo
    let paidVisitsCount = 0;
    let preReleaseCount = 0;
    let rewatchCount = 0;
    let ratedCount = 0;
    let ratingSum = 0;

    const byOrigin = { Voucher: 0, Club: 0, Comprado: 0 };
    const byFormat = { IMAX: 0, XD: 0, '3D': 0, '2D': 0 };
    const byAudio = { Legendado: 0, Dublado: 0, Original: 0 };
    const byCinema = new Map();
    const byCompany = new Map();

    for (const v of filteredVisits) {
      const price = Number(v.price_paid || 0);
      totalSpent += price;

      if (price === 0 || v.ticket_origin === 'Voucher' || v.ticket_origin === 'Club') {
        if (price === 0) {
          freeVisitsCount++;
        } else {
          paidVisitsCount++;
        }
      } else {
        paidVisitsCount++;
      }

      if (v.isPreRelease) preReleaseCount++;
      if (v.isRewatch) rewatchCount++;

      if (Number(v.rating) > 0) {
        ratedCount++;
        ratingSum += Number(v.rating);
      }

      const orig = v.ticket_origin || 'Club';
      byOrigin[orig] = (byOrigin[orig] || 0) + 1;

      const fmt = v.session_format || '2D';
      byFormat[fmt] = (byFormat[fmt] || 0) + 1;

      const aud = v.audio_type || 'Legendado';
      byAudio[aud] = (byAudio[aud] || 0) + 1;

      const loc = String(v.cinema_location || '').trim();
      if (loc) byCinema.set(loc, (byCinema.get(loc) || 0) + 1);

      const comp = String(v.company || 'Sozinho').trim() || 'Sozinho';
      byCompany.set(comp, (byCompany.get(comp) || 0) + 1);
    }

    const avgTicketAll = total > 0 ? totalSpent / total : 0;
    const avgTicketPaidOnly = paidVisitsCount > 0 ? totalSpent / paidVisitsCount : 0;
    const avgRating = ratedCount > 0 ? ratingSum / ratedCount : 0;
    const freePercent = total > 0 ? Math.round((freeVisitsCount / total) * 100) : 0;
    const benefitOriginCount = (byOrigin.Voucher || 0) + (byOrigin.Club || 0);
    const boughtOriginCount = byOrigin.Comprado || 0;

    const topCinemas = [...byCinema.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCompanies = [...byCompany.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total,
      totalSpent,
      freeVisitsCount,
      paidVisitsCount,
      freePercent,
      benefitOriginCount,
      boughtOriginCount,
      avgTicketAll,
      avgTicketPaidOnly,
      avgRating,
      preReleaseCount,
      rewatchCount,
      byOrigin,
      byFormat,
      byAudio,
      topCinemas,
      topCompanies,
    };
  }, [filteredVisits]);

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

      {/* Resumo rápido da filtragem */}
      <div className="lb-filter-summary-strip">
        <span>
          Exibindo <strong>{filteredVisits.length}</strong>{' '}
          {filteredVisits.length === 1 ? 'ida ao cinema' : 'idas ao cinema'}
        </span>
        <span className="lb-strip-divider">•</span>
        <span>
          Na faixa (R$ 0): <strong>{stats.freeVisitsCount}</strong>
        </span>
        <span className="lb-strip-divider">•</span>
        <span>
          Total gasto: <strong>{formatCurrencyBRL(stats.totalSpent)}</strong>
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
                              <span className="lb-tag lb-tag-prerelease" title="Assistido antes da estreia oficial!">
                                <Sparkles size={11} /> PRÉ-ESTREIA
                              </span>
                            )}
                            {visit.isRewatch && (
                              <span className="lb-tag lb-tag-rewatch" title={`Reassistido no cinema (${visit.watchNumber}ª vez)`}>
                                <RotateCcw size={11} /> REWATCH
                              </span>
                            )}
                            <span className={`lb-tag lb-tag-format fmt-${String(visit.session_format).toLowerCase()}`}>
                              {visit.session_format}
                            </span>
                            <span className={`lb-tag lb-tag-origin orig-${String(visit.ticket_origin).toLowerCase()}`}>
                              {visit.ticket_origin}
                            </span>
                            <span className="lb-tag lb-tag-audio">
                              {visit.audio_type}
                            </span>
                          </div>

                          <div className="lb-diary-submeta">
                            {visit.cinema_location && (
                              <span>
                                <MapPin size={12} /> {visit.cinema_location}
                              </span>
                            )}
                            {visit.company && (
                              <span>
                                <Users size={12} /> {visit.company}
                              </span>
                            )}
                            <span>
                              Estreia: {formatDateBR(visit.release_date)}
                            </span>
                          </div>
                        </div>

                        <div className="lb-diary-rating-col">
                          <StarDisplay rating={visit.rating} size="md" />
                          <span
                            className={`lb-diary-price ${
                              Number(visit.price_paid) === 0 ? 'free' : ''
                            }`}
                          >
                            {Number(visit.price_paid) === 0
                              ? 'Grátis (R$ 0)'
                              : formatCurrencyBRL(visit.price_paid)}
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
            filteredVisits.map((visit) => (
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

                  {/* Selos Superiores no Pôster */}
                  <div className="lb-poster-top-badges">
                    {visit.isPreRelease && (
                      <span className="lb-mini-badge prerelease" title="Pré-estreia">
                        PRÉ
                      </span>
                    )}
                    {visit.isRewatch && (
                      <span className="lb-mini-badge rewatch" title="Rewatch">
                        ↻
                      </span>
                    )}
                    <span className="lb-mini-badge format">
                      {visit.session_format}
                    </span>
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
            ))
          )}
        </div>
      )}

      {/* ABA 3: ESTATÍSTICAS (STATS / GASTAR NADA X COMPRADOS) */}
      {activeTab === 'stats' && (
        <div className="lb-stats-dashboard">
          {/* Card Principal: Gastar Nada (Voucher/Club / R$ 0) vs Comprados */}
          <div className="lb-stats-hero-card">
            <div className="lb-stats-hero-header">
              <div>
                <span className="lb-eyebrow">ECONOMIA E BENEFÍCIOS NO CINEMA</span>
                <h3>Na Faixa (R$ 0 / Benefícios) vs. Comprados</h3>
              </div>
              <div className="lb-stats-free-pill">
                {stats.freePercent}% das idas sem gastar nada
              </div>
            </div>

            <div className="lb-stats-kpi-grid">
              <div className="lb-kpi-box green">
                <span className="lb-kpi-label">Idas sem Gastar Nada (R$ 0)</span>
                <strong className="lb-kpi-value">{stats.freeVisitsCount}</strong>
                <span className="lb-kpi-sub">
                  Voucher + Club ({stats.benefitOriginCount} ingressos de benefício)
                </span>
              </div>

              <div className="lb-kpi-box orange">
                <span className="lb-kpi-label">Ingressos Comprados / Pagos</span>
                <strong className="lb-kpi-value">{stats.paidVisitsCount}</strong>
                <span className="lb-kpi-sub">
                  Média de {formatCurrencyBRL(stats.avgTicketPaidOnly)} por ingresso pago
                </span>
              </div>

              <div className="lb-kpi-box blue">
                <span className="lb-kpi-label">Total Gasto no Período</span>
                <strong className="lb-kpi-value">
                  {formatCurrencyBRL(stats.totalSpent)}
                </strong>
                <span className="lb-kpi-sub">
                  Custo médio geral: {formatCurrencyBRL(stats.avgTicketAll)} / ida
                </span>
              </div>
            </div>

            {/* Barra de proporção visual Grátis vs Pago */}
            {stats.total > 0 && (
              <div className="lb-comparison-bar-wrap">
                <div className="lb-comparison-labels">
                  <span className="free-label">
                    ● Na Faixa (R$ 0): {stats.freeVisitsCount} ({stats.freePercent}%)
                  </span>
                  <span className="paid-label">
                    ● Pagos: {stats.paidVisitsCount} ({100 - stats.freePercent}%)
                  </span>
                </div>
                <div className="lb-comparison-track">
                  <div
                    className="lb-comparison-fill-free"
                    style={{ width: `${stats.freePercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Segunda Linha: Origem, Formato, Áudio e Destaques */}
          <div className="lb-stats-cards-grid">
            {/* Origem do Ingresso */}
            <div className="lb-stat-panel">
              <h4>
                <Ticket size={16} /> Por Origem do Ingresso
              </h4>
              <div className="lb-bar-list">
                {['Club', 'Voucher', 'Comprado'].map((orig) => {
                  const count = stats.byOrigin[orig] || 0;
                  const pct =
                    stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={orig} className="lb-bar-item">
                      <div className="lb-bar-item-top">
                        <span>{orig}</span>
                        <strong>
                          {count} ({pct}%)
                        </strong>
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
                        <span>{fmt}</span>
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

            {/* Idioma / Áudio & Selos Automáticos */}
            <div className="lb-stat-panel">
              <h4>
                <Award size={16} /> Áudio & Destaques
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

              <div className="lb-mini-highlights-row">
                <div className="lb-mini-highlight">
                  <Sparkles size={15} />
                  <div>
                    <strong>{stats.preReleaseCount}</strong>
                    <span>Pré-estreias</span>
                  </div>
                </div>
                <div className="lb-mini-highlight">
                  <RotateCcw size={15} />
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

            {/* Cinemas e Companhias Mais Frequentes */}
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
                  <span className="lb-ranking-subtitle">Companhias</span>
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
                  {selectedVisitDetail.isRewatch && (
                    <span className="lb-tag lb-tag-rewatch">
                      <RotateCcw size={11} /> REWATCH ({selectedVisitDetail.watchNumber}ª vez)
                    </span>
                  )}
                  <span className="lb-tag lb-tag-format">
                    {selectedVisitDetail.session_format}
                  </span>
                  <span className="lb-tag lb-tag-origin">
                    {selectedVisitDetail.ticket_origin}
                  </span>
                  <span className="lb-tag lb-tag-audio">
                    {selectedVisitDetail.audio_type}
                  </span>
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
                    <span>Valor Pago</span>
                    <strong>
                      {Number(selectedVisitDetail.price_paid) === 0
                        ? 'Grátis (R$ 0,00)'
                        : formatCurrencyBRL(selectedVisitDetail.price_paid)}
                    </strong>
                  </div>
                  <div>
                    <span>Cinema / Local</span>
                    <strong>{selectedVisitDetail.cinema_location || '—'}</strong>
                  </div>
                  <div>
                    <span>Companhia</span>
                    <strong>{selectedVisitDetail.company || 'Sozinho'}</strong>
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
