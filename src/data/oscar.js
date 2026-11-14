/**
 * Temporada de Premiações — Oscar 2027 (99ª Edição)
 * Contém todas as 24 categorias oficiais da Academia, com status "Em Breve"
 * e suporte a preenchimento oficial quando a lista de indicados for anunciada.
 */

export const OSCAR_CATEGORIES_2027 = [
  // Principais / Gerais
  {
    id: 'best_picture',
    name: 'Melhor Filme',
    nameEn: 'Best Picture',
    group: 'Principais',
    slots: 10,
    nominees: [],
  },
  {
    id: 'best_director',
    name: 'Melhor Direção',
    nameEn: 'Best Director',
    group: 'Principais',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_actor',
    name: 'Melhor Ator Principal',
    nameEn: 'Best Actor in a Leading Role',
    group: 'Atuação',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_actress',
    name: 'Melhor Atriz Principal',
    nameEn: 'Best Actress in a Leading Role',
    group: 'Atuação',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_supporting_actor',
    name: 'Melhor Ator Coadjuvante',
    nameEn: 'Best Actor in a Supporting Role',
    group: 'Atuação',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_supporting_actress',
    name: 'Melhor Atriz Coadjuvante',
    nameEn: 'Best Actress in a Supporting Role',
    group: 'Atuação',
    slots: 5,
    nominees: [],
  },

  // Roteiro
  {
    id: 'best_original_screenplay',
    name: 'Melhor Roteiro Original',
    nameEn: 'Best Original Screenplay',
    group: 'Roteiro',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_adapted_screenplay',
    name: 'Melhor Roteiro Adaptado',
    nameEn: 'Best Adapted Screenplay',
    group: 'Roteiro',
    slots: 5,
    nominees: [],
  },

  // Longas / Animação / Internacional / Documentário
  {
    id: 'best_animated_feature',
    name: 'Melhor Filme de Animação',
    nameEn: 'Best Animated Feature Film',
    group: 'Longas Especializados',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_international_feature',
    name: 'Melhor Filme Internacional',
    nameEn: 'Best International Feature Film',
    group: 'Longas Especializados',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_documentary_feature',
    name: 'Melhor Documentário em Longa-Metragem',
    nameEn: 'Best Documentary Feature Film',
    group: 'Longas Especializados',
    slots: 5,
    nominees: [],
  },

  // Categorias Técnicas & Artísticas
  {
    id: 'best_cinematography',
    name: 'Melhor Fotografia',
    nameEn: 'Best Cinematography',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_film_editing',
    name: 'Melhor Edição / Montagem',
    nameEn: 'Best Film Editing',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_production_design',
    name: 'Melhor Design de Produção / Direção de Arte',
    nameEn: 'Best Production Design',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_costume_design',
    name: 'Melhor Figurino',
    nameEn: 'Best Costume Design',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_makeup_hairstyling',
    name: 'Melhor Maquiagem e Penteados',
    nameEn: 'Best Makeup and Hairstyling',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_original_score',
    name: 'Melhor Trilha Sonora Original',
    nameEn: 'Best Original Score',
    group: 'Música & Som',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_original_song',
    name: 'Melhor Canção Original',
    nameEn: 'Best Original Song',
    group: 'Música & Som',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_sound',
    name: 'Melhor Som',
    nameEn: 'Best Sound',
    group: 'Música & Som',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_visual_effects',
    name: 'Melhores Efeitos Visuais',
    nameEn: 'Best Visual Effects',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_casting',
    name: 'Melhor Escolha de Elenco (Casting)',
    nameEn: 'Best Casting',
    group: 'Técnicas & Arte',
    slots: 5,
    nominees: [],
  },

  // Curtas-metragens
  {
    id: 'best_animated_short',
    name: 'Melhor Curta-Metragem de Animação',
    nameEn: 'Best Animated Short Film',
    group: 'Curtas',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_live_action_short',
    name: 'Melhor Curta-Metragem em Live-Action',
    nameEn: 'Best Live Action Short Film',
    group: 'Curtas',
    slots: 5,
    nominees: [],
  },
  {
    id: 'best_documentary_short',
    name: 'Melhor Curta-Metragem Documental',
    nameEn: 'Best Documentary Short Film',
    group: 'Curtas',
    slots: 5,
    nominees: [],
  },
];

export const OSCAR_EDITIONS = [
  {
    year: 2027,
    edition: '99ª Edição (Oscar 2027)',
    status: 'Em Breve',
    statusLabel: 'Em Breve • Aguardando Anúncio Oficial dos Indicados',
    ceremonyYear: '2027',
    totalCategories: OSCAR_CATEGORIES_2027.length,
    categories: OSCAR_CATEGORIES_2027,
  },
];

function cleanNorm(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchOscarNominee(nominee, visit) {
  if (!visit || !nominee) return false;
  const normVisitTitle = cleanNorm(visit.title);
  const normOriginalTitle = cleanNorm(visit.originalTitle || visit.original_title);

  const aliases = nominee.aliases || [nominee.title, nominee.originalTitle];

  for (const alias of aliases) {
    if (!alias) continue;
    const cAlias = cleanNorm(alias);
    if (
      normVisitTitle === cAlias ||
      normOriginalTitle === cAlias ||
      (cAlias.length >= 5 && (normVisitTitle.includes(cAlias) || cAlias.includes(normVisitTitle))) ||
      (cAlias.length >= 5 && normOriginalTitle && normOriginalTitle.includes(cAlias))
    ) {
      return true;
    }
  }

  return false;
}
