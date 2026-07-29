/* ==========================================================================
   STATS ENGINE
   Única fonte de verdade para números do sistema. Nunca lê estatísticas
   salvas — sempre recalcula a partir dos jogos + jogadores brutos.
   Corrigir um jogo antigo recalcula tudo automaticamente.
   ========================================================================== */

window.App = window.App || {};

App.Stats = (function () {

  function toDate(m) {
    // combina data (YYYY-MM-DD) + hora (HH:MM) em um Date real
    if (!m.data) return null;
    const time = m.hora || '00:00';
    const d = new Date(`${m.data}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  function isPlayed(m) {
    return !!(m.resultado && typeof m.resultado.golsClube === 'number' && typeof m.resultado.golsAdversario === 'number');
  }

  function resultOf(m) {
    if (!isPlayed(m)) return null;
    const { golsClube, golsAdversario } = m.resultado;
    if (golsClube > golsAdversario) return 'vitoria';
    if (golsClube < golsAdversario) return 'derrota';
    return 'empate';
  }

  /**
   * Calcula o pacote completo de estatísticas.
   * @param {Array} matches - lista bruta de jogos (App.DB.getMatches())
   * @param {Array} players - lista bruta de jogadores (App.DB.getPlayers())
   * @param {Object} filter - { championshipId } opcional, para filtrar por campeonato
   */
  function computeStats(matches, players, filter) {
    filter = filter || {};
    let list = matches.slice();
    if (filter.tipo) {
      list = list.filter((m) => m.tipo === filter.tipo);
    }
    if (filter.championshipId) {
      list = list.filter((m) => m.campeonatoId === filter.championshipId);
    }

    const played = list.filter(isPlayed);
    const now = new Date();

    let vitorias = 0, empates = 0, derrotas = 0;
    let golsMarcados = 0, golsSofridos = 0;
    const golsPorJogador = {};
    const assistPorJogador = {};
    const mvpPorJogador = {};

    played.forEach((m) => {
      const res = resultOf(m);
      if (res === 'vitoria') vitorias++;
      else if (res === 'empate') empates++;
      else if (res === 'derrota') derrotas++;

      golsMarcados += m.resultado.golsClube || 0;
      golsSofridos += m.resultado.golsAdversario || 0;

      (m.gols || []).forEach((g) => {
        if (!g.jogadorId) return;
        golsPorJogador[g.jogadorId] = (golsPorJogador[g.jogadorId] || 0) + 1;
      });
      (m.assistencias || []).forEach((a) => {
        if (!a.jogadorId) return;
        assistPorJogador[a.jogadorId] = (assistPorJogador[a.jogadorId] || 0) + 1;
      });
      if (m.mvpId) {
        mvpPorJogador[m.mvpId] = (mvpPorJogador[m.mvpId] || 0) + 1;
      }
    });

    const jogosDisputados = played.length;
    const pontos = vitorias * 3 + empates * 1;
    const jogosPossiveis = jogosDisputados; // aproveitamento sobre jogos disputados
    const aproveitamento = jogosPossiveis > 0
      ? Math.round((pontos / (jogosPossiveis * 3)) * 1000) / 10
      : 0;
    const saldoGols = golsMarcados - golsSofridos;
    const mediaGols = jogosDisputados > 0 ? Math.round((golsMarcados / jogosDisputados) * 100) / 100 : 0;

    function findPlayer(id) {
      return players.find((p) => p.id === id) || null;
    }

    function topOf(map) {
      const entries = Object.entries(map);
      if (!entries.length) return null;
      entries.sort((a, b) => b[1] - a[1]);
      const [id, total] = entries[0];
      const player = findPlayer(id);
      return player ? { jogador: player, total } : null;
    }

    function rankingOf(map) {
      return Object.entries(map)
        .map(([id, total]) => ({ jogador: findPlayer(id), total }))
        .filter((r) => r.jogador)
        .sort((a, b) => b.total - a.total);
    }

    const artilheiro = topOf(golsPorJogador);
    const liderAssistencias = topOf(assistPorJogador);
    const jogadorDestaque = topOf(mvpPorJogador);

    // Próximos jogos: data/hora no futuro (ou hoje ainda não ocorrido), sem resultado lançado
    const proximos = list
      .filter((m) => {
        const d = toDate(m);
        return d && d.getTime() >= now.getTime() - 3 * 60 * 60 * 1000 && !isPlayed(m);
      })
      .sort((a, b) => toDate(a) - toDate(b));

    const proximoJogo = proximos[0] || null;
    let countdown = null;
    if (proximoJogo) {
      const d = toDate(proximoJogo);
      const diffMs = d.getTime() - now.getTime();
      const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
      countdown = {
        dias: Math.floor(totalMinutes / (60 * 24)),
        horas: Math.floor((totalMinutes % (60 * 24)) / 60),
        minutos: totalMinutes % 60,
      };
    }

    // Últimos resultados: jogados, mais recentes primeiro
    const ultimosResultados = played
      .slice()
      .sort((a, b) => toDate(b) - toDate(a))
      .slice(0, 5);

    return {
      jogosDisputados,
      vitorias,
      empates,
      derrotas,
      pontos,
      aproveitamento,
      golsMarcados,
      golsSofridos,
      saldoGols,
      mediaGols,
      artilheiro,
      liderAssistencias,
      jogadorDestaque,
      rankingArtilharia: rankingOf(golsPorJogador),
      rankingAssistencias: rankingOf(assistPorJogador),
      rankingMvp: rankingOf(mvpPorJogador),
      proximoJogo,
      proximosJogos: proximos,
      countdown,
      ultimosResultados,
    };
  }

  return { computeStats, toDate, isPlayed, resultOf };
})();
