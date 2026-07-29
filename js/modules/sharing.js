/* ==========================================================================
   MÓDULO: COMPARTILHAMENTOS
   Gera automaticamente textos prontos pra colar no WhatsApp/redes,
   a partir dos dados já cadastrados — nada digitado na mão.
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.sharing = (function () {
  const I = () => App.Icons;
  let aba = 'resultado'; // 'resultado' | 'proximo' | 'estatisticas'

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  function championshipName(campeonatoId) {
    if (!campeonatoId) return 'Campeonato';
    const c = App.DB.getChampionships().find((x) => x.id === campeonatoId);
    return c ? c.nome : 'Campeonato';
  }
  function playerNames(entries, players) {
    return (entries || [])
      .map((e) => players.find((p) => p.id === e.jogadorId))
      .filter(Boolean)
      .map((p) => p.nome)
      .join(', ');
  }

  function render(container) {
    paint(container);
  }

  function paint(container) {
    const config = App.DB.getConfig();
    const players = App.DB.getPlayers();
    const matches = App.DB.getMatches();
    const jogados = matches.filter((m) => App.Stats.isPlayed(m)).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const agendados = matches.filter((m) => !App.Stats.isPlayed(m)).sort((a, b) => (a.data || '').localeCompare(b.data || ''));

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Compartilhamentos</h1>
          <div class="page-header__subtitle">Textos prontos pra WhatsApp e redes sociais</div>
        </div>
        <div class="segmented">
          <button data-a="resultado" class="${aba === 'resultado' ? 'is-active' : ''}">Resultado</button>
          <button data-a="proximo" class="${aba === 'proximo' ? 'is-active' : ''}">Próximo jogo</button>
          <button data-a="estatisticas" class="${aba === 'estatisticas' ? 'is-active' : ''}">Estatísticas</button>
        </div>
      </div>
      <div class="card" style="padding:var(--space-6);max-width:640px">
        <div id="sharing-body"></div>
      </div>
    `;

    container.querySelectorAll('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => { aba = btn.dataset.a; paint(container); });
    });

    const body = container.querySelector('#sharing-body');
    if (aba === 'resultado') paintResultado(body, jogados, players, config);
    else if (aba === 'proximo') paintProximo(body, agendados, config);
    else paintEstatisticas(body, matches, players, config);
  }

  function renderTextArea(target, text) {
    target.innerHTML = `
      <div class="field field--full">
        <label>Texto gerado (você pode editar antes de copiar)</label>
        <textarea class="js-texto" rows="10" style="font-family:inherit">${text}</textarea>
      </div>
      <div class="u-flex u-gap-3 u-mt-3">
        <button class="btn btn--secondary js-copiar">Copiar texto</button>
        <button class="btn btn--primary js-whatsapp">${I().share} Abrir no WhatsApp</button>
      </div>
    `;
    const textarea = target.querySelector('.js-texto');
    target.querySelector('.js-copiar').addEventListener('click', () => copyText(textarea.value));
    target.querySelector('.js-whatsapp').addEventListener('click', () => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textarea.value)}`, '_blank');
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => App.Toast.show('Texto copiado!', 'success'),
        () => fallbackCopy(text)
      );
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); App.Toast.show('Texto copiado!', 'success'); }
    catch (e) { App.Toast.show('Não foi possível copiar automaticamente', 'danger'); }
    document.body.removeChild(ta);
  }

  /* ---------- Aba: Resultado da partida ---------- */
  function paintResultado(body, jogados, players, config) {
    if (!jogados.length) {
      body.innerHTML = `<p class="u-muted">Nenhum jogo com resultado lançado ainda. Lance um resultado na aba Jogos.</p>`;
      return;
    }
    body.innerHTML = `
      <div class="field">
        <label>Escolha o jogo</label>
        <select class="js-select-jogo">
          ${jogados.map((m) => `<option value="${m.id}">${formatDate(m.data)} · ${config.nomeClube} ${m.resultado.golsClube} x ${m.resultado.golsAdversario} ${m.adversario}</option>`).join('')}
        </select>
      </div>
      <div class="js-result u-mt-5"></div>
    `;
    const resultWrap = body.querySelector('.js-result');
    function draw() {
      const match = jogados.find((m) => m.id === body.querySelector('.js-select-jogo').value) || jogados[0];
      const proximo = App.DB.getMatches()
        .filter((m) => !App.Stats.isPlayed(m) && m.data >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => (a.data || '').localeCompare(b.data || ''))[0];

      const r = App.Stats.resultOf(match);
      const emoji = r === 'vitoria' ? '✅' : r === 'derrota' ? '❌' : '➖';
      let txt = `${emoji} *${config.nomeClube}* ${match.resultado.golsClube} x ${match.resultado.golsAdversario} *${match.adversario}*\n`;
      txt += `🏆 ${match.tipo === 'campeonato' ? championshipName(match.campeonatoId) : 'Amistoso'}\n`;
      txt += `📅 ${formatDate(match.data)}${match.local ? ' · ' + match.local : ''}\n`;

      const gols = playerNames(match.gols, players);
      const assist = playerNames(match.assistencias, players);
      const mvp = players.find((p) => p.id === match.mvpId);

      if (gols) txt += `\n⚽ Gols: ${gols}`;
      if (assist) txt += `\n🎯 Assistências: ${assist}`;
      if (mvp) txt += `\n🌟 Destaque da partida: ${mvp.nome}`;

      if (proximo) {
        txt += `\n\n📅 Próximo jogo: ${config.nomeClube} x ${proximo.adversario} — ${formatDate(proximo.data)} às ${proximo.hora || '--:--'}${proximo.local ? ', ' + proximo.local : ''}`;
      }
      renderTextArea(resultWrap, txt);
    }
    body.querySelector('.js-select-jogo').addEventListener('change', draw);
    draw();
  }

  /* ---------- Aba: Próximo jogo ---------- */
  function paintProximo(body, agendados, config) {
    if (!agendados.length) {
      body.innerHTML = `<p class="u-muted">Nenhum jogo futuro cadastrado ainda.</p>`;
      return;
    }
    body.innerHTML = `
      <div class="field">
        <label>Escolha o jogo</label>
        <select class="js-select-jogo">
          ${agendados.map((m) => `<option value="${m.id}">${formatDate(m.data)} · vs ${m.adversario}</option>`).join('')}
        </select>
      </div>
      <div class="js-result u-mt-5"></div>
    `;
    const resultWrap = body.querySelector('.js-result');
    function draw() {
      const match = agendados.find((m) => m.id === body.querySelector('.js-select-jogo').value) || agendados[0];
      let txt = `📢 *Próximo jogo do ${config.nomeClube}!*\n\n`;
      txt += `🆚 ${match.adversario}\n`;
      txt += `🏆 ${match.tipo === 'campeonato' ? championshipName(match.campeonatoId) : 'Amistoso'}\n`;
      txt += `📅 ${formatDate(match.data)}\n`;
      txt += `⏰ ${match.hora || 'Horário a definir'}\n`;
      txt += `📍 ${match.local || 'Local a definir'}\n\n`;
      txt += `Vamos com tudo! 🔵⚪💪`;
      renderTextArea(resultWrap, txt);
    }
    body.querySelector('.js-select-jogo').addEventListener('change', draw);
    draw();
  }

  /* ---------- Aba: Estatísticas da temporada ---------- */
  function paintEstatisticas(body, matches, players, config) {
    const geral = App.Stats.computeStats(matches, players);
    const camp = App.Stats.computeStats(matches, players, { tipo: 'campeonato' });
    const amistoso = App.Stats.computeStats(matches, players, { tipo: 'amistoso' });

    let txt = `📊 *${config.nomeClube} — Temporada ${config.temporadaAtual}*\n\n`;

    if (camp.jogosDisputados > 0) {
      txt += `🏆 *Campeonatos*: ${camp.jogosDisputados} jogos — ${camp.vitorias}V ${camp.empates}E ${camp.derrotas}D — ${camp.pontos} pts (${camp.aproveitamento}% aprov.)\n`;
    }
    if (amistoso.jogosDisputados > 0) {
      txt += `🤝 *Amistosos*: ${amistoso.jogosDisputados} jogos — ${amistoso.vitorias}V ${amistoso.empates}E ${amistoso.derrotas}D\n`;
    }
    txt += `\n⚽ Gols marcados: ${geral.golsMarcados} · Gols sofridos: ${geral.golsSofridos} · Saldo: ${geral.saldoGols}\n`;

    if (geral.artilheiro) txt += `\n👟 Artilheiro: ${geral.artilheiro.jogador.nome} (${geral.artilheiro.total} gols)`;
    if (geral.liderAssistencias) txt += `\n🎯 Líder de assistências: ${geral.liderAssistencias.jogador.nome} (${geral.liderAssistencias.total})`;
    if (geral.jogadorDestaque) txt += `\n🌟 Destaque da temporada: ${geral.jogadorDestaque.jogador.nome} (${geral.jogadorDestaque.total} MVPs)`;

    body.innerHTML = '';
    renderTextArea(body, txt);
  }

  return { render };
})();
