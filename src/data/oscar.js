/**
 * Lista curada dos indicados oficiais ao Oscar de Melhor Filme
 * Edições recentes (2024, 2025 e 2026) com correspondência flexível de títulos (BR e EN).
 */
export const OSCAR_EDITIONS = [
  {
    year: 2026,
    edition: '98ª Edição (2026)',
    winner: 'Uma Batalha Após a Outra',
    nominees: [
      {
        title: 'Uma Batalha Após a Outra',
        originalTitle: 'One Battle After Another',
        aliases: ['uma batalha apos a outra', 'one battle after another'],
        director: 'Paul Thomas Anderson',
        isWinner: true,
      },
      {
        title: 'Pecadores',
        originalTitle: 'Sinners',
        aliases: ['pecadores', 'sinners'],
        director: 'Ryan Coogler',
      },
      {
        title: 'O Agente Secreto',
        originalTitle: 'The Secret Agent',
        aliases: ['o agente secreto', 'the secret agent', 'agente secreto'],
        director: 'Kleber Mendonça Filho',
      },
      {
        title: 'Bugonia',
        originalTitle: 'Bugonia',
        aliases: ['bugonia'],
        director: 'Yorgos Lanthimos',
      },
      {
        title: 'Hamnet: A Vida Antes de Hamlet',
        originalTitle: 'Hamnet',
        aliases: ['hamnet', 'hamnet a vida antes de hamlet'],
        director: 'Chloé Zhao',
      },
      {
        title: 'Marty Supreme',
        originalTitle: 'Marty Supreme',
        aliases: ['marty supreme'],
        director: 'Josh Safdie',
      },
      {
        title: 'Sonhos de Trem',
        originalTitle: 'Train Dreams',
        aliases: ['sonhos de trem', 'train dreams'],
        director: 'Clint Bentley',
      },
      {
        title: 'F1',
        originalTitle: 'F1',
        aliases: ['f1', 'formula 1'],
        director: 'Joseph Kosinski',
      },
      {
        title: 'Frankenstein',
        originalTitle: 'Frankenstein',
        aliases: ['frankenstein'],
        director: 'Guillermo del Toro',
      },
      {
        title: 'Valor Sentimental',
        originalTitle: 'Sentimental Value',
        aliases: ['valor sentimental', 'sentimental value'],
        director: 'Joachim Trier',
      },
    ],
  },
  {
    year: 2025,
    edition: '97ª Edição (2025)',
    winner: 'Anora',
    nominees: [
      {
        title: 'Anora',
        originalTitle: 'Anora',
        aliases: ['anora'],
        director: 'Sean Baker',
        isWinner: true,
      },
      {
        title: 'Ainda Estou Aqui',
        originalTitle: "I'm Still Here",
        aliases: ['ainda estou aqui', "i'm still here", 'im still here'],
        director: 'Walter Salles',
      },
      {
        title: 'O Brutalista',
        originalTitle: 'The Brutalist',
        aliases: ['o brutalista', 'the brutalist', 'brutalista'],
        director: 'Brady Corbet',
      },
      {
        title: 'Conclave',
        originalTitle: 'Conclave',
        aliases: ['conclave'],
        director: 'Edward Berger',
      },
      {
        title: 'Duna: Parte 2',
        originalTitle: 'Dune: Part Two',
        aliases: ['duna parte 2', 'duna parte dois', 'dune part two', 'dune 2', 'duna 2'],
        director: 'Denis Villeneuve',
      },
      {
        title: 'Um Completo Desconhecido',
        originalTitle: 'A Complete Unknown',
        aliases: ['um completo desconhecido', 'a complete unknown', 'completo desconhecido'],
        director: 'James Mangold',
      },
      {
        title: 'Emilia Pérez',
        originalTitle: 'Emilia Pérez',
        aliases: ['emilia perez', 'emilia pérez'],
        director: 'Jacques Audiard',
      },
      {
        title: 'A Substância',
        originalTitle: 'The Substance',
        aliases: ['a substancia', 'a substância', 'the substance', 'substancia'],
        director: 'Coralie Fargeat',
      },
      {
        title: 'Nickel Boys',
        originalTitle: 'Nickel Boys',
        aliases: ['nickel boys'],
        director: 'RaMell Ross',
      },
      {
        title: 'Wicked',
        originalTitle: 'Wicked',
        aliases: ['wicked'],
        director: 'Jon M. Chu',
      },
    ],
  },
  {
    year: 2024,
    edition: '96ª Edição (2024)',
    winner: 'Oppenheimer',
    nominees: [
      {
        title: 'Oppenheimer',
        originalTitle: 'Oppenheimer',
        aliases: ['oppenheimer'],
        director: 'Christopher Nolan',
        isWinner: true,
      },
      {
        title: 'Pobres Criaturas',
        originalTitle: 'Poor Things',
        aliases: ['pobres criaturas', 'poor things'],
        director: 'Yorgos Lanthimos',
      },
      {
        title: 'Zona de Interesse',
        originalTitle: 'The Zone of Interest',
        aliases: ['zona de interesse', 'the zone of interest', 'a zona de interesse'],
        director: 'Jonathan Glazer',
      },
      {
        title: 'Assassinos da Lua das Flores',
        originalTitle: 'Killers of the Flower Moon',
        aliases: ['assassinos da lua das flores', 'killers of the flower moon'],
        director: 'Martin Scorsese',
      },
      {
        title: 'Anatomia de uma Queda',
        originalTitle: "Anatomie d'une chute",
        aliases: ['anatomia de uma queda', "anatomie d'une chute", 'anatomy of a fall'],
        director: 'Justine Triet',
      },
      {
        title: 'Os Rejeitados',
        originalTitle: 'The Holdovers',
        aliases: ['os rejeitados', 'the holdovers', 'rejeitados'],
        director: 'Alexander Payne',
      },
      {
        title: 'Barbie',
        originalTitle: 'Barbie',
        aliases: ['barbie'],
        director: 'Greta Gerwig',
      },
      {
        title: 'Vidas Passadas',
        originalTitle: 'Past Lives',
        aliases: ['vidas passadas', 'past lives'],
        director: 'Celine Song',
      },
      {
        title: 'Ficção Americana',
        originalTitle: 'American Fiction',
        aliases: ['ficcao americana', 'ficção americana', 'american fiction'],
        director: 'Cord Jefferson',
      },
      {
        title: 'Maestro',
        originalTitle: 'Maestro',
        aliases: ['maestro'],
        director: 'Bradley Cooper',
      },
    ],
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
  if (!visit) return false;
  const normVisitTitle = cleanNorm(visit.title);
  const normOriginalTitle = cleanNorm(visit.originalTitle || visit.original_title);

  for (const alias of nominee.aliases) {
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
