import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Calendar,
  Ticket,
  Film,
  Volume2,
  MapPin,
  Users,
  DollarSign,
  Sparkles,
  RotateCcw,
  Loader2,
  Check,
  UserPlus,
  Trash2,
  Image as ImageIcon,
  History,
  Clock,
  Clapperboard,
  Armchair,
  MessageSquare,
} from 'lucide-react';
import {
  searchMovies,
  fetchMoviePosters,
  fetchMovieRichDetails,
} from '../services/tmdb';
import {
  parseCompanions,
  serializeCompanions,
  computeReleaseTimingFlags,
  saveMovieMetaToCache,
  normalizeTitle,
} from '../services/storage';
import { StarRatingInput } from './StarRating';

const ORIGINS = ['Voucher', 'Club', 'Comprado'];
const FORMATS = ['2D', '3D', 'XD', 'IMAX'];
const AUDIOS = ['Legendado', 'Dublado', 'Original'];

export default function VisitModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  prefillMovie = null,
  existingVisits = [],
  suggestions = { locations: [], companies: [] },
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState('');
  const [tmdbId, setTmdbId] = useState(null);
  const [originalTitle, setOriginalTitle] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [visitDate, setVisitDate] = useState(todayStr);
  const [ticketOrigin, setTicketOrigin] = useState('Club');
  const [sessionFormat, setSessionFormat] = useState('2D');
  const [audioType, setAudioType] = useState('Legendado');
  const [pricePaid, setPricePaid] = useState('0');
  const [cinemaLocation, setCinemaLocation] = useState('');

  // Metadados automáticos do TMDB (Duração, Gêneros, Diretor)
  const [runtime, setRuntime] = useState(0);
  const [genres, setGenres] = useState([]);
  const [director, setDirector] = useState('');

  // Campos opcionais de Sala/Assento e Comentário Rápido
  const [seat, setSeat] = useState('');
  const [notes, setNotes] = useState('');

  // Opção manual: já assistiu a este filme antes na vida
  const [isManualRewatch, setIsManualRewatch] = useState(false);

  // Lista de companhias individuais
  const [companions, setCompanions] = useState([]);
  const [companionInput, setCompanionInput] = useState('');

  const [rating, setRating] = useState(0);

  // Busca automática de filmes (TMDB / Catálogo)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Seletor manual de Pôsteres
  const [showPosterPicker, setShowPosterPicker] = useState(false);
  const [availablePosters, setAvailablePosters] = useState([]);
  const [loadingPosters, setLoadingPosters] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setConfirmingDelete(false);
    setCompanionInput('');
    setShowPosterPicker(false);
    setAvailablePosters([]);

    if (initialData) {
      setTitle(initialData.title || '');
      setSearchQuery(initialData.title || '');
      setTmdbId(initialData.tmdb_id || null);
      setOriginalTitle(initialData.original_title || '');
      setPosterUrl(initialData.poster_url || '');
      setReleaseDate(initialData.release_date || '');
      setVisitDate(initialData.visit_date || todayStr);
      setTicketOrigin(initialData.ticket_origin || 'Club');
      setSessionFormat(initialData.session_format || '2D');
      setAudioType(initialData.audio_type || 'Legendado');
      setPricePaid(String(initialData.price_paid ?? 0));
      setCinemaLocation(initialData.cinema_location || '');
      setCompanions(parseCompanions(initialData.companionsList || initialData.company));
      setIsManualRewatch(Boolean(initialData.isManualRewatch || initialData.isRewatch));
      setRating(Number(initialData.rating || 0));
      setSeat(initialData.seat || '');
      setNotes(initialData.notes || '');
      setRuntime(Number(initialData.runtime || 0));
      setGenres(Array.isArray(initialData.genres) ? initialData.genres : []);
      setDirector(initialData.director || '');
      setShowDropdown(false);

      // Se a ida antiga ainda não tinha duração/diretor, busca automaticamente em background
      if (!initialData.runtime && !initialData.director) {
        fetchMovieRichDetails({
          tmdbId: initialData.tmdb_id,
          title: initialData.title,
        }).then((rich) => {
          if (rich.runtime) setRuntime(rich.runtime);
          if (rich.genres?.length) setGenres(rich.genres);
          if (rich.director) setDirector(rich.director);
        });
      }
    } else if (prefillMovie) {
      setTitle(prefillMovie.title || '');
      setSearchQuery(prefillMovie.title || '');
      setTmdbId(prefillMovie.tmdbId || null);
      setOriginalTitle(prefillMovie.originalTitle || prefillMovie.title || '');
      setPosterUrl(prefillMovie.posterUrl || '');
      setReleaseDate(prefillMovie.releaseDate || '');
      setVisitDate(todayStr);
      setTicketOrigin('Club');
      setSessionFormat('2D');
      setAudioType('Legendado');
      setPricePaid('0');
      setCinemaLocation(suggestions.locations[0] || '');
      setCompanions([]);
      setIsManualRewatch(false);
      setRating(0);
      setSeat('');
      setNotes('');
      setRuntime(0);
      setGenres([]);
      setDirector('');
      setShowDropdown(false);

      fetchMovieRichDetails({
        tmdbId: prefillMovie.tmdbId,
        title: prefillMovie.title,
      }).then((rich) => {
        if (rich.runtime) setRuntime(rich.runtime);
        if (rich.genres?.length) setGenres(rich.genres);
        if (rich.director) setDirector(rich.director);
      });
    } else {
      setTitle('');
      setSearchQuery('');
      setTmdbId(null);
      setOriginalTitle('');
      setPosterUrl('');
      setReleaseDate('');
      setVisitDate(todayStr);
      setTicketOrigin('Club');
      setSessionFormat('2D');
      setAudioType('Legendado');
      setPricePaid('0');
      setCinemaLocation(suggestions.locations[0] || '');
      setCompanions([]);
      setIsManualRewatch(false);
      setRating(0);
      setSeat('');
      setNotes('');
      setRuntime(0);
      setGenres([]);
      setDirector('');
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [isOpen, initialData, prefillMovie]);

  // Debounce da busca no TMDB ao digitar
  useEffect(() => {
    if (!isOpen || !showDropdown) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchMovies(q);
      setSearchResults(results);
      setIsSearching(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [searchQuery, showDropdown, isOpen]);

  // Detecção automática em tempo real de Pré-estreia (PRÉ), Reexibição (RE) e Rewatch
  const autoFlagsPreview = useMemo(() => {
    const { isPreRelease, isReexibicao } = computeReleaseTimingFlags(
      visitDate,
      releaseDate
    );

    const normCurrent = normalizeTitle(title);
    const otherVisitsForSameMovie = existingVisits.filter((v) => {
      if (initialData && v.id === initialData.id) return false;
      if (tmdbId && v.tmdb_id && Number(v.tmdb_id) === Number(tmdbId)) return true;
      if (normCurrent && normalizeTitle(v.title) === normCurrent) return true;
      return false;
    });

    const isAutoRewatch = otherVisitsForSameMovie.length > 0;
    return {
      isPreRelease,
      isReexibicao,
      isAutoRewatch,
      isEffectiveRewatch: isAutoRewatch || isManualRewatch,
      previousCount: otherVisitsForSameMovie.length,
    };
  }, [visitDate, releaseDate, title, tmdbId, existingVisits, initialData, isManualRewatch]);

  if (!isOpen) return null;

  const handleSelectMovie = async (movie) => {
    setTitle(movie.title);
    setSearchQuery(movie.title);
    setTmdbId(movie.tmdbId || null);
    setOriginalTitle(movie.originalTitle || movie.title);
    if (movie.posterUrl) setPosterUrl(movie.posterUrl);
    if (movie.releaseDate) setReleaseDate(movie.releaseDate);
    if (movie.runtime) setRuntime(movie.runtime);
    if (movie.genres?.length) setGenres(movie.genres);
    if (movie.director) setDirector(movie.director);
    setShowDropdown(false);
    setShowPosterPicker(false);

    // Puxa automaticamente Duração (min), Gêneros e Diretor do TMDB
    const rich = await fetchMovieRichDetails({
      tmdbId: movie.tmdbId,
      title: movie.title,
    });
    if (rich.runtime) setRuntime(rich.runtime);
    if (rich.genres?.length) setGenres(rich.genres);
    if (rich.director) setDirector(rich.director);
  };

  // Preserva o Valor Pago ao trocar a origem do ingresso
  const handleOriginChange = (origin) => {
    setTicketOrigin(origin);
  };

  const handleOpenPosterGallery = async () => {
    const movieTitle = (title || searchQuery).trim();
    if (!movieTitle && !tmdbId) {
      setErrorMsg('Digite ou selecione um filme primeiro para buscar os pôsteres.');
      return;
    }
    setErrorMsg('');
    setShowPosterPicker((prev) => !prev);
    if (!showPosterPicker) {
      setLoadingPosters(true);
      try {
        const list = await fetchMoviePosters({ tmdbId, title: movieTitle });
        setAvailablePosters(list);
      } finally {
        setLoadingPosters(false);
      }
    }
  };

  const handleAddCompanion = (nameToAdd) => {
    const raw = String(nameToAdd ?? companionInput).trim();
    if (!raw) return;

    const names = raw
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n && n.toLowerCase() !== 'sozinho');

    if (names.length === 0) {
      setCompanions([]);
      setCompanionInput('');
      return;
    }

    setCompanions((prev) => {
      const existingLower = new Set(prev.map((p) => p.toLowerCase()));
      const next = [...prev];
      for (const n of names) {
        if (!existingLower.has(n.toLowerCase())) {
          existingLower.add(n.toLowerCase());
          next.push(n);
        }
      }
      return next;
    });
    setCompanionInput('');
  };

  const handleRemoveCompanion = (nameToRemove) => {
    setCompanions((prev) => prev.filter((c) => c !== nameToRemove));
  };

  const handleToggleSuggestedCompanion = (person) => {
    const exists = companions.some((c) => c.toLowerCase() === person.toLowerCase());
    if (exists) {
      setCompanions((prev) =>
        prev.filter((c) => c.toLowerCase() !== person.toLowerCase())
      );
    } else {
      handleAddCompanion(person);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalTitle = (title || searchQuery).trim();
    if (!finalTitle) {
      setErrorMsg('Informe o título do filme.');
      return;
    }

    let finalCompanions = [...companions];
    if (companionInput.trim()) {
      const extra = companionInput
        .split(',')
        .map((n) => n.trim())
        .filter((n) => n && n.toLowerCase() !== 'sozinho');
      for (const ex of extra) {
        if (!finalCompanions.some((c) => c.toLowerCase() === ex.toLowerCase())) {
          finalCompanions.push(ex);
        }
      }
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      // Se ainda não tinha runtime/director, tenta buscar rapidinho antes de salvar
      let finalRuntime = runtime;
      let finalGenres = genres;
      let finalDirector = director;

      if (!finalRuntime && !finalDirector) {
        const rich = await fetchMovieRichDetails({
          tmdbId,
          title: finalTitle,
        });
        finalRuntime = rich.runtime || 0;
        finalGenres = rich.genres || [];
        finalDirector = rich.director || '';
      }

      const movieKey = tmdbId
        ? `tmdb:${tmdbId}`
        : `title:${normalizeTitle(finalTitle)}`;
      saveMovieMetaToCache(movieKey, {
        runtime: finalRuntime,
        genres: finalGenres,
        director: finalDirector,
      });

      await onSave({
        tmdb_id: tmdbId,
        title: finalTitle,
        original_title: originalTitle || finalTitle,
        poster_url: posterUrl.trim(),
        release_date: releaseDate || null,
        visit_date: visitDate,
        ticket_origin: ticketOrigin,
        session_format: sessionFormat,
        audio_type: audioType,
        price_paid: parseFloat(String(pricePaid).replace(',', '.')) || 0,
        cinema_location: cinemaLocation.trim(),
        companions: finalCompanions,
        company: serializeCompanions(finalCompanions),
        is_manual_rewatch: Boolean(isManualRewatch),
        runtime: finalRuntime,
        genres: finalGenres,
        director: finalDirector,
        seat: seat.trim(),
        rating: Number(rating || 0),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao salvar ida ao cinema.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!initialData || !onDelete) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setIsSaving(true);
    try {
      await onDelete(initialData, { skipPrompt: true });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Erro ao excluir ida.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="lb-modal-backdrop" onClick={onClose}>
      <div
        className="lb-modal-card lb-modal-large"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lb-modal-header">
          <div>
            <span className="lb-eyebrow">DIÁRIO DE CINEMA</span>
            <h2>{initialData ? 'Editar Ida ao Cinema' : 'Registrar Nova Ida'}</h2>
          </div>
          <button type="button" className="lb-icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lb-modal-form">
          {errorMsg && <div className="lb-alert-error">{errorMsg}</div>}

          {/* Bloco Superior: Busca do Filme + Preview do Pôster + Botão Trocar Pôster */}
          <div className="lb-movie-picker-layout">
            <div className="lb-poster-column">
              <div
                className="lb-poster-preview-box clickable"
                onClick={handleOpenPosterGallery}
                title="Clique para escolher outro pôster"
              >
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={title || 'Pôster'}
                    className="lb-poster-preview-img"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="lb-poster-placeholder">
                    <Film size={32} />
                    <span>Pôster Automático</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="lb-change-poster-btn"
                onClick={handleOpenPosterGallery}
              >
                <ImageIcon size={13} />
                <span>{showPosterPicker ? 'Fechar Galeria' : 'Trocar Pôster'}</span>
              </button>
            </div>

            <div className="lb-movie-fields-col">
              {/* Campo de Busca Automática TMDB */}
              <div className="lb-field-group lb-search-wrapper">
                <label className="lb-label">
                  <Search size={14} /> Filme (digite para buscar pôster, estreia, duração e diretor)
                </label>
                <div className="lb-input-with-spinner">
                  <input
                    type="text"
                    className="lb-input lb-input-lg"
                    placeholder="Ex: Interestelar, Duna: Parte 2, Ainda Estou Aqui..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setTitle(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => {
                      if (searchQuery.trim().length >= 2) setShowDropdown(true);
                    }}
                    required
                  />
                  {isSearching && <Loader2 size={18} className="lb-spin-icon" />}
                </div>

                {/* Dropdown de resultados de filmes */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="lb-search-dropdown">
                    {searchResults.map((item, idx) => (
                      <button
                        key={`${item.tmdbId || idx}-${item.title}`}
                        type="button"
                        className="lb-search-option"
                        onClick={() => handleSelectMovie(item)}
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
                            {item.releaseDate
                              ? `Estreia: ${item.releaseDate.split('-').reverse().join('/')}`
                              : item.year || 'Data não informada'}
                          </span>
                        </div>
                        <span className="lb-search-source-tag">{item.source}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Faixa automática de Duração, Diretor e Gêneros puxados do TMDB */}
              {(runtime > 0 || director || genres.length > 0) && (
                <div className="lb-tmdb-auto-meta-strip">
                  {runtime > 0 && (
                    <span>
                      <Clock size={12} /> {runtime} min
                    </span>
                  )}
                  {director && (
                    <span>
                      <Clapperboard size={12} /> {director}
                    </span>
                  )}
                  {genres.length > 0 && <span>🎭 {genres.join(', ')}</span>}
                </div>
              )}

              {/* Datas: Dia da Ida & Dia de Estreia */}
              <div className="lb-two-cols">
                <div className="lb-field-group">
                  <label className="lb-label">
                    <Calendar size={14} /> Dia da Ida ao Cinema
                  </label>
                  <input
                    type="date"
                    className="lb-input"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    required
                  />
                </div>

                <div className="lb-field-group">
                  <label className="lb-label">
                    <Calendar size={14} /> Dia de Estreia Oficial
                  </label>
                  <input
                    type="date"
                    className="lb-input"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Link do Pôster */}
              <div className="lb-field-group">
                <label className="lb-label-subtle">
                  URL do Pôster (use "Trocar Pôster" ao lado ou cole um link customizado)
                </label>
                <input
                  type="url"
                  className="lb-input lb-input-sm"
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Galeria de Seleção Manual de Pôsteres (Estilo Letterboxd) */}
          {showPosterPicker && (
            <div className="lb-poster-picker-drawer">
              <div className="lb-poster-picker-header">
                <span>
                  <ImageIcon size={14} /> Escolha o pôster oficial para exibir no seu diário
                </span>
                <button
                  type="button"
                  className="lb-poster-picker-close"
                  onClick={() => setShowPosterPicker(false)}
                >
                  Fechar
                </button>
              </div>

              {loadingPosters ? (
                <div className="lb-poster-picker-loading">
                  <Loader2 size={20} className="lb-spin-icon" />
                  <span>Buscando pôsteres alternativos no TMDB...</span>
                </div>
              ) : availablePosters.length === 0 ? (
                <p className="lb-helper-text">
                  Nenhum pôster alternativo encontrado para este título. Você também pode colar
                  qualquer URL de imagem no campo acima.
                </p>
              ) : (
                <div className="lb-poster-picker-grid">
                  {availablePosters.map((p, index) => {
                    const isSelected = posterUrl === p.url;
                    return (
                      <button
                        key={`${p.url}-${index}`}
                        type="button"
                        className={`lb-poster-choice-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setPosterUrl(p.url);
                          setShowPosterPicker(false);
                        }}
                      >
                        <img src={p.url} alt={p.label} loading="lazy" />
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Avisos Automáticos de Pré-estreia (PRÉ), Reexibição (RE) e Rewatch */}
          {(autoFlagsPreview.isPreRelease ||
            autoFlagsPreview.isReexibicao ||
            autoFlagsPreview.isAutoRewatch) && (
            <div className="lb-auto-flags-banner">
              {autoFlagsPreview.isPreRelease && (
                <div className="lb-auto-flag-pill prerelease">
                  <Sparkles size={14} />
                  <span>
                    <strong>Tag PRÉ (Pré-estreia) ativada!</strong> Sua ida (
                    {visitDate.split('-').reverse().join('/')}) é anterior à estreia
                    oficial ({releaseDate.split('-').reverse().join('/')}).
                  </span>
                </div>
              )}
              {autoFlagsPreview.isReexibicao && (
                <div className="lb-auto-flag-pill reexibicao">
                  <History size={14} />
                  <span>
                    <strong>Tag RE (Reexibição) ativada!</strong> A data da ida é superior a
                    1 ano após o lançamento oficial ({releaseDate.slice(0, 4)}).
                  </span>
                </div>
              )}
              {autoFlagsPreview.isAutoRewatch && (
                <div className="lb-auto-flag-pill rewatch">
                  <RotateCcw size={14} />
                  <span>
                    <strong>Rewatch detectado no histórico!</strong> Você já tem{' '}
                    {autoFlagsPreview.previousCount} ida(s) cadastrada(s) para este filme.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Avaliação + Opção de Reassistido (Mesmo fora do sistema) */}
          <div className="lb-rating-and-rewatch-row">
            <div className="lb-field-group lb-rating-section">
              <label className="lb-label">
                Sua Nota (Estilo Letterboxd — aceita meia estrela)
              </label>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>

            <div className="lb-field-group lb-manual-rewatch-col">
              <label className="lb-label">
                <RotateCcw size={14} /> Já tinha visto antes?
              </label>
              <button
                type="button"
                className={`lb-rewatch-toggle-box ${
                  autoFlagsPreview.isEffectiveRewatch ? 'active' : ''
                }`}
                onClick={() => setIsManualRewatch((prev) => !prev)}
              >
                <div className="lb-rewatch-icon-circle">
                  <RotateCcw size={18} />
                </div>
                <div className="lb-rewatch-toggle-text">
                  <strong>
                    {autoFlagsPreview.isEffectiveRewatch
                      ? 'Reassistido (Rewatch ↻)'
                      : '1ª vez assistindo'}
                  </strong>
                  <span>
                    {autoFlagsPreview.isEffectiveRewatch
                      ? 'Você já tinha assistido a este filme antes na vida'
                      : 'Toque aqui se já tinha visto este filme antes na vida'}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Origem do Ingresso + Formato + Áudio */}
          <div className="lb-three-cols">
            <div className="lb-field-group">
              <label className="lb-label">
                <Ticket size={14} /> Origem do Ingresso
              </label>
              <div className="lb-segmented">
                {ORIGINS.map((orig) => (
                  <button
                    key={orig}
                    type="button"
                    className={`lb-seg-btn ${ticketOrigin === orig ? 'active' : ''}`}
                    onClick={() => handleOriginChange(orig)}
                  >
                    {orig}
                  </button>
                ))}
              </div>
            </div>

            <div className="lb-field-group">
              <label className="lb-label">
                <Film size={14} /> Formato da Sala
              </label>
              <div className="lb-segmented">
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`lb-seg-btn ${
                      sessionFormat === fmt ? 'active format-' + fmt.toLowerCase() : ''
                    }`}
                    onClick={() => setSessionFormat(fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="lb-field-group">
              <label className="lb-label">
                <Volume2 size={14} /> Áudio
              </label>
              <div className="lb-segmented">
                {AUDIOS.map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    className={`lb-seg-btn ${audioType === aud ? 'active' : ''}`}
                    onClick={() => setAudioType(aud)}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Valor Pago Total + Local */}
          <div className="lb-two-cols">
            <div className="lb-field-group">
              <label className="lb-label">
                <DollarSign size={14} /> Custo / Valor Gasto na Ida (R$)
              </label>
              <div className="lb-price-row">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="lb-input"
                  placeholder="Ingresso, transporte, lanche..."
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                />
              </div>
            </div>

            <div className="lb-field-group">
              <label className="lb-label">
                <MapPin size={14} /> Local / Cinema
              </label>
              <input
                type="text"
                className="lb-input"
                placeholder="Ex: Cinemark Eldorado, Cinépolis JK..."
                value={cinemaLocation}
                onChange={(e) => setCinemaLocation(e.target.value)}
              />
              {suggestions.locations.length > 0 && (
                <div className="lb-quick-chips">
                  <span className="lb-chips-caption">Recentes:</span>
                  {suggestions.locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      className={`lb-chip ${cinemaLocation === loc ? 'active' : ''}`}
                      onClick={() => setCinemaLocation(loc)}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sala / Assento + Comentário Rápido (Opcional) */}
          <div className="lb-two-cols">
            <div className="lb-field-group">
              <label className="lb-label">
                <Armchair size={14} /> Sala / Assento (Opcional)
              </label>
              <input
                type="text"
                className="lb-input"
                placeholder="Ex: Sala 4 - Poltrona G12"
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
              />
            </div>

            <div className="lb-field-group">
              <label className="lb-label">
                <MessageSquare size={14} /> Comentário Rápido da Sessão (Opcional)
              </label>
              <input
                type="text"
                className="lb-input"
                placeholder="Ex: Som absurdo no IMAX, sala lotada!"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Companhia (Adicionar cada pessoa individualmente ou marcar Sozinho) */}
          <div className="lb-field-group">
            <label className="lb-label">
              <Users size={14} /> Companhia (adicione cada pessoa que foi com você)
            </label>

            <div className="lb-company-builder">
              <div className="lb-company-input-row">
                <button
                  type="button"
                  className={`lb-solo-toggle ${companions.length === 0 ? 'active' : ''}`}
                  onClick={() => {
                    setCompanions([]);
                    setCompanionInput('');
                  }}
                >
                  <Check size={14} /> Sozinho (SOZ)
                </button>

                <input
                  type="text"
                  className="lb-input"
                  placeholder="Digite o nome e clique em + Adicionar..."
                  value={companionInput}
                  onChange={(e) => setCompanionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCompanion();
                    }
                  }}
                />

                <button
                  type="button"
                  className="lb-add-companion-btn"
                  onClick={() => handleAddCompanion()}
                >
                  <UserPlus size={15} /> Adicionar
                </button>
              </div>

              <div className="lb-selected-companions">
                {companions.length === 0 ? (
                  <span className="lb-solo-status-badge">
                    Tag: <strong>SOZ (Sozinho)</strong> — adicione nomes acima para mudar para{' '}
                    <strong>ACO (Acompanhado)</strong>
                  </span>
                ) : (
                  companions.map((person) => (
                    <span key={person} className="lb-companion-tag">
                      <span>{person}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompanion(person)}
                        title={`Remover ${person}`}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {suggestions.companies.length > 0 && (
                <div className="lb-quick-chips">
                  <span className="lb-chips-caption">Toque para adicionar/remover:</span>
                  {suggestions.companies.map((person) => {
                    const isSelected = companions.some(
                      (c) => c.toLowerCase() === person.toLowerCase()
                    );
                    return (
                      <button
                        key={person}
                        type="button"
                        className={`lb-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => handleToggleSuggestedCompanion(person)}
                      >
                        {isSelected ? `✓ ${person}` : `+ ${person}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="lb-modal-footer lb-modal-footer-split">
            <div>
              {initialData && onDelete && (
                <button
                  type="button"
                  className={`lb-btn-danger ${confirmingDelete ? 'confirming' : ''}`}
                  onClick={handleDeleteClick}
                  disabled={isSaving}
                >
                  <Trash2 size={15} />
                  {confirmingDelete ? 'Confirmar Exclusão?' : 'Excluir Ida'}
                </button>
              )}
            </div>

            <div className="lb-modal-footer-right">
              <button type="button" className="lb-btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="lb-btn-primary" disabled={isSaving}>
                {isSaving
                  ? 'Salvando...'
                  : initialData
                  ? 'Salvar Alterações'
                  : 'Salvar no Diário'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
