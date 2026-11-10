import React, { useState } from 'react';

/**
 * Formata a nota no estilo clássico do Letterboxd (ex: ★★★½)
 */
export function formatLetterboxdStars(rating) {
  const num = Number(rating || 0);
  if (num <= 0) return 'Sem nota';
  const fullStars = Math.floor(num);
  const hasHalf = num % 1 >= 0.5;
  return '★'.repeat(fullStars) + (hasHalf ? '½' : '');
}

/**
 * Exibição visual compacta das estrelas (estilo abaixo do pôster no Letterboxd)
 */
export function StarDisplay({ rating, size = 'md', showNumeric = false }) {
  const num = Number(rating || 0);
  if (num <= 0) {
    return <span className="lb-stars-empty">—</span>;
  }

  const fullStars = Math.floor(num);
  const hasHalf = num % 1 >= 0.5;

  return (
    <span
      className={`lb-stars-display lb-stars-${size}`}
      title={`Nota: ${num.toFixed(1).replace('.0', '')} de 5`}
    >
      <span className="lb-stars-glyphs">
        {'★'.repeat(fullStars)}
        {hasHalf && <span className="lb-half-glyph">½</span>}
      </span>
      {showNumeric && <span className="lb-stars-number">{num.toFixed(1)}</span>}
    </span>
  );
}

/**
 * Seletor interativo de nota com suporte a meia estrela (0.5 a 5.0)
 * Funciona tanto clicando na metade esquerda/direita da estrela quanto
 * clicando duas vezes na mesma estrela no celular para alternar .5 e .0
 */
export function StarRatingInput({ value = 0, onChange }) {
  const [hoverVal, setHoverVal] = useState(null);
  const displayValue = hoverVal !== null ? hoverVal : Number(value || 0);

  const handleStarClick = (starIndex, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const isLeftHalf = clickX < rect.width / 2;
    let chosen = isLeftHalf ? starIndex - 0.5 : starIndex;

    // Facilidade extra para celular: se tocar na mesma estrela cheia, alterna para meia estrela
    if (Number(value) === starIndex && !isLeftHalf) {
      chosen = starIndex - 0.5;
    } else if (Number(value) === starIndex - 0.5 && isLeftHalf) {
      chosen = starIndex;
    }

    onChange(chosen);
  };

  const handleStarHover = (starIndex, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const isLeftHalf = hoverX < rect.width / 2;
    setHoverVal(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  return (
    <div className="lb-rating-picker">
      <div
        className="lb-rating-stars-row"
        onMouseLeave={() => setHoverVal(null)}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillLevel = Math.max(0, Math.min(1, displayValue - (starIndex - 1)));
          const fillPercent = fillLevel * 100;

          return (
            <button
              key={starIndex}
              type="button"
              className="lb-star-btn"
              onClick={(e) => handleStarClick(starIndex, e)}
              onMouseMove={(e) => handleStarHover(starIndex, e)}
              aria-label={`Avaliar com ${starIndex} estrelas`}
            >
              <span className="lb-star-bg">★</span>
              <span
                className="lb-star-fg"
                style={{ width: `${fillPercent}%` }}
              >
                ★
              </span>
            </button>
          );
        })}

        <div className="lb-rating-badge">
          {displayValue > 0 ? (
            <>
              <span className="lb-rating-badge-num">{displayValue.toFixed(1)}</span>
              <span className="lb-rating-badge-text">
                {formatLetterboxdStars(displayValue)}
              </span>
            </>
          ) : (
            <span className="lb-rating-badge-empty">Sem nota</span>
          )}
        </div>

        {value > 0 && (
          <button
            type="button"
            className="lb-rating-clear"
            onClick={() => onChange(0)}
            title="Zerar nota"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Botões rápidos de 0.5 em 0.5 para uso rápido com o polegar no celular */}
      <div className="lb-rating-quick-steps">
        {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((step) => (
          <button
            key={step}
            type="button"
            className={`lb-step-pill ${Number(value) === step ? 'active' : ''}`}
            onClick={() => onChange(step)}
          >
            {step.toFixed(1).replace('.0', '★').replace('.5', '½')}
          </button>
        ))}
      </div>
    </div>
  );
}
