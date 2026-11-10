const formatBRL = (val) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

/**
 * Generates constructive and lightly humorous/witty insights tailored to each page/tab.
 */
export const generatePageAiInsight = ({
  page,
  visits = [],
  homeDashboard = null,
  stats = null,
  watchlist = [],
  annualGoal = 24,
  isDemoMode = false,
}) => {
  const total = visits.length;

  if (total === 0 && page !== 'upcoming') {
    return {
      badge: 'IA CineLog • Primeiro Passo',
      title: 'Sua cadeira cativa ainda está vazia 🍿',
      text: 'Você ainda não registrou nenhuma ida ao cinema. Clique em "+ Registrar Ida" para começar — prometo analisar seus gostos cinematográficos com dados reais e zero spoilers.',
    };
  }

  if (page === 'home') {
    const days = homeDashboard?.daysSinceLastVisit ?? null;
    const diff = homeDashboard?.diffFromMonthlyAvg ?? 0;
    const currentMonth = homeDashboard?.thisMonthCount ?? 0;

    if (days !== null && days === 0) {
      return {
        badge: 'IA CineLog • Cheirinho de Pipoca',
        title: 'Você literalmente acabou de sair da sala! 🎬',
        text: `0 dias sem ir ao cinema! Com ${currentMonth} ida(s) neste mês, seu ritmo está ${
          diff >= 0 ? `${diff.toFixed(1)} acima` : `${Math.abs(diff).toFixed(1)} abaixo`
        } da sua média mensal. A carteirinha de cinéfilo está em dia.`,
      };
    }

    if (days !== null && days > 25) {
      return {
        badge: 'IA CineLog • Alerta de Abstinência',
        title: `${days} dias longe da tela grande! 🚨`,
        text: `Já faz ${days} dias desde a sua última sessão. O projetor do cinema local já está perguntando por você! Que tal conferir a aba "Em Breve" para escolher o próximo filme?`,
      };
    }

    if (diff >= 1) {
      return {
        badge: 'IA CineLog • Ritmo de Festival',
        title: 'Mês digno de jurado de Cannes 🏆',
        text: `Você já acumula ${currentMonth} ida(s) neste mês (${diff.toFixed(
          1
        )} acima da sua média habitual). Se continuar assim, o lanterninha já vai te chamar pelo nome na fila da pipoca!`,
      };
    }

    if (diff < -0.5) {
      return {
        badge: 'IA CineLog • Análise de Ritmo',
        title: 'O sofá está ganhando do cinema este mês 🛋️',
        text: `Com ${currentMonth} ida(s) até agora, você está ${Math.abs(diff).toFixed(
          1
        )} abaixo da sua média mensal. Ainda dá tempo de recuperar o ritmo com uma sessão no fim de semana!`,
      };
    }

    return {
      badge: 'IA CineLog • Visão Geral',
      title: 'Consistência digna de roteiro bem escrito ✨',
      text: `Faz ${days ?? 0} dia(s) desde a sua última sessão e seu ritmo no mês (${currentMonth} idas) está super alinhado com sua média histórica. ${
        isDemoMode
          ? 'Crie sua conta para trocar esses dados de exemplo pela sua história real!'
          : 'Continue alimentando seu diário!'
      }`,
    };
  }

  if (page === 'diary') {
    const soloCount = visits.filter((v) => v.isAlone).length;
    const soloRatio = total > 0 ? Math.round((soloCount / total) * 100) : 0;
    const rewatchCount = visits.filter((v) => v.isRewatch).length;

    if (soloRatio >= 65) {
      return {
        badge: 'IA CineLog • Perfil de Sessão',
        title: `Lobo solitário da sala escura (${soloRatio}% sozinho) 🐺`,
        text: `Em ${soloCount} das suas ${total} idas você foi sem companhia. A melhor parte? Ninguém rouba sua pipoca nem pergunta "quem é esse personagem mesmo?" no meio do filme.`,
      };
    }

    if (soloRatio <= 30 && total >= 3) {
      return {
        badge: 'IA CineLog • Perfil Social',
        title: 'Ir ao cinema pra você é evento social! 👥',
        text: `${100 - soloRatio}% das suas sessões foram acompanhadas. Você transforma quase toda estreia em rolê com a galera — ótimo para debater o final na saída da sala!`,
      };
    }

    if (rewatchCount >= 2) {
      return {
        badge: 'IA CineLog • Memória Afetiva',
        title: `Fã de carteirinha: ${rewatchCount} filmes reassistidos ↻`,
        text: `Você não tem medo de repetir dose quando o filme é bom! Seu diário mistura estreias fresquinhas com obras revistas na telona.`,
      };
    }

    return {
      badge: 'IA CineLog • Diário de Sessões',
      title: 'Equilíbrio entre sessões solo e em galera 🎟️',
      text: `Você divide bem suas ${total} sessões entre ir sozinho (${soloRatio}%) para focar 100% na tela e ir acompanhado (${
        100 - soloRatio
      }%) para comentar os créditos finais.`,
    };
  }

  if (page === 'grid') {
    const rated = visits.filter((v) => Number(v.rating) > 0);
    const avg =
      rated.reduce((acc, v) => acc + (Number(v.rating) || 0), 0) / (rated.length || 1);
    const fiveStars = visits.filter((v) => Number(v.rating) === 5).length;
    const lowStars = visits.filter(
      (v) => Number(v.rating) > 0 && Number(v.rating) <= 2.5
    ).length;

    if (avg >= 4.2) {
      return {
        badge: 'IA CineLog • Curadoria & Crítica',
        title: `Coração generoso: média de ${avg.toFixed(1)} ★ 😍`,
        text: `Com ${fiveStars} nota(s) máxima(s), ou você escolhe seus filmes com precisão cirúrgica antes de sair de casa, ou o cheiro de manteiga da pipoca deixa seu coração mais bondoso!`,
      };
    }

    if (avg > 0 && avg <= 3.2) {
      return {
        badge: 'IA CineLog • Crítico Implacável',
        title: `Rigor lá no alto: média de ${avg.toFixed(1)} ★ 🧐`,
        text: `Com ${lowStars} filme(s) levando 2.5★ ou menos, arrancar 5 estrelas de você é mais difícil que ganhar o Oscar de Melhor Filme. Os diretores que lutem!`,
      };
    }

    return {
      badge: 'IA CineLog • Termômetro Crítico',
      title: `Crítico justo e equilibrado (${avg.toFixed(1)} ★ de média) ⚖️`,
      text: `Sua galeria mostra um bom equilíbrio entre obras-primas (${fiveStars} com 5★) e sessões apenas divertidas. Dica: você pode trocar o pôster de qualquer filme clicando em Editar!`,
    };
  }

  if (page === 'stats' && stats) {
    const topGenre = stats.topGenres?.[0]?.[0];
    const topStudio = stats.topStudios?.[0]?.[0];
    const topActor = stats.topActors?.[0]?.[0];
    const favWeekday = stats.favWeekdayName && stats.favWeekdayName !== '—' ? stats.favWeekdayName : null;
    const totalHours = Math.round((stats.totalMinutes || 0) / 60);

    const parts = [];
    if (topGenre) parts.push(`seu gênero dominante é ${topGenre}`);
    if (topActor) parts.push(`${topActor} lidera entre os atores na sua tela`);
    if (topStudio) parts.push(`o estúdio que mais levou seu ingresso foi ${topStudio}`);

    const customLine =
      parts.length > 0
        ? `Analisando seu DNA cinematográfico: ${parts.join(', e ')}.`
        : 'Continue registrando filmes para destravar padrões de atores, estúdios e gêneros.';

    return {
      badge: 'IA CineLog • Raio-X Estatístico',
      title: favWeekday
        ? `${favWeekday} é oficialmente o seu dia de cinema 📊`
        : 'Raio-X financeiro e artístico da sua jornada 📊',
      text: `${customLine} Seu investimento médio é de ${formatBRL(
        stats.avgSpentPerVisit
      )} por ida (~${totalHours}h totais de sala escura) e sua meta anual está em ${
        stats.goalPct || 0
      }%!`,
    };
  }

  if (page === 'upcoming') {
    const today = new Date().toISOString().split('T')[0];
    const inTheaters = watchlist.filter(
      (m) => m.releaseDate && m.releaseDate <= today
    ).length;
    const upcomingCount = watchlist.length - inTheaters;

    if (watchlist.length === 0) {
      return {
        badge: 'IA CineLog • Radar de Estreias',
        title: 'Sua lista "Quero Ver" está esperando o próximo hype 📅',
        text: 'Explore as abas "Próximas Estreias" e "Em Cartaz Agora" — clique em qualquer filme para ver ficha técnica com diretor, 3 atores principais, estúdio, duração e sinopse!',
      };
    }

    if (inTheaters > 0) {
      return {
        badge: 'IA CineLog • Chamada de Bilheteria',
        title: `Atenção: ${inTheaters} filme(s) da sua lista já estão EM CARTAZ! 🎟️`,
        text: `Nada de deixar sair de cartaz para reclamar depois que perdeu na telona! Eles já aparecem no topo da sua fila (além de outros ${upcomingCount} aguardando estreia). Clique em um card para ver detalhes ou marcar "Já Fui!".`,
      };
    }

    return {
      badge: 'IA CineLog • Planejamento de Hype',
      title: `${watchlist.length} estreia(s) no seu radar cinematográfico 🔭`,
      text: 'Seus filmes estão ordenados automaticamente do lançamento mais próximo para o mais distante. Clique em qualquer card para conferir sinopse, diretor, elenco e produtora!',
    };
  }

  return null;
};
