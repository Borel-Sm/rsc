/* ==========================================================================
   MÓDULO: DASHBOARD
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.dashboard = (function () {
  const I = () => App.Icons;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function crestHtml(url, fallbackText, size) {
    const cls = size === 'sm' ? 'crest crest--sm' : 'crest';
    if (url) return `<div class="${cls}"><img src="${url}" alt=""></div>`;
    const initials = (fallbackText || '?').slice(0, 2).toUpperCase();
    return `<div class="${cls}">${initials}</div>`;
  }

  function renderEmpty(container, config) {
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Olá, ${config.nomeClube}</h1>
          <div class="page-header__subtitle">Temporada ${config.temporadaAtual}</div>
        </div>
      </div>
      <div class="card empty-state">
        <div class="empty-state__icon">${I().dashboard}</div>
        <h3>Seu painel está pronto, mas ainda vazio</h3>
        <p>Cadastre jogadores e o próximo jogo para o dashboard começar a calcular tudo automaticamente: artilharia, aproveitamento, saldo de gols e muito mais.</p>
        <div class="u-flex u-gap-3" style="justify-content:center">
          <button class="btn btn--secondary" data-route="jogadores">Cadastrar jogadores</button>
          <button class="btn btn--primary" data-route="jogos">Cadastrar jogo</button>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-route]').forEach((btn) => {
      btn.addEventListener('click', () => App.Router.navigate(btn.dataset.route));
    });
  }

  function render(container) {
    const config = App.DB.getConfig();
    const players = App.DB.getPlayers();
    const matches = App.DB.getMatches();

    if (matches.length === 0) {
      renderEmpty(container, config);
      return;
    }

    const stats = App.Stats.computeStats(matches, players);
    const statsCampeonatos = App.Stats.computeStats(matches, players, { tipo: 'campeonato' });
    const statsAmistosos = App.Stats.computeStats(matches, players, { tipo: 'amistoso' });

    /* ---------- Aviso: jogos pendentes de confirmação ---------- */
    const pendentes = App.PendingCheck ? App.PendingCheck.getPending() : [];
    let pendentesHtml = '';
    if (pendentes.length) {
      pendentesHtml = `
        <div class="card u-mt-5" style="padding:var(--space-4);border-left:3px solid var(--warning)">
          <div class="section-title" style="margin-bottom:var(--space-3)">
            <span>${I().bell} Jogos pendentes de confirmação</span>
          </div>
          <div class="stagger">
            ${pendentes.map((m) => `
              <div class="match-row">
                ${crestHtml(m.escudoAdversario, m.adversario, 'sm')}
                <div class="match-row__info">
                  <div class="match-row__opponent">${m.adversario}</div>
                  <div class="match-row__meta">${formatDate(m.data)} · ainda sem resultado lançado</div>
                </div>
                <button class="btn btn--secondary btn--sm js-resolver-pendente" data-id="${m.id}">Confirmar resultado</button>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    /* ---------- Alerta de jogo próximo ---------- */
    let alertHtml = '';
    if (stats.proximoJogo && stats.countdown && stats.countdown.dias <= (config.diasAlerta || 3)) {
      const c = stats.countdown;
      const quando = c.dias > 0 ? `em ${c.dias} dia${c.dias > 1 ? 's' : ''}` : (c.horas > 0 ? `em ${c.horas}h` : 'a qualquer momento');
      alertHtml = `
        <div class="alert">${I().bell}
          <span><strong>Jogo chegando!</strong> Contra ${stats.proximoJogo.adversario}, ${quando}.</span>
        </div>`;
    }

    /* ---------- Hero: próximo jogo ---------- */
    let heroHtml = '';
    if (stats.proximoJogo) {
      const m = stats.proximoJogo;
      const c = stats.countdown;
      const urgente = c.dias <= (config.diasAlerta || 3);
      heroHtml = `
        <div class="card card--glass hero-match">
          <div>
            <div class="hero-match__label">Próximo jogo</div>
            <div class="hero-match__teams">
              <div style="text-align:center">
                ${crestHtml(config.escudo, config.nomeClube)}
                <div class="hero-match__team-name">${config.nomeClube}</div>
              </div>
              <div class="hero-match__vs">×</div>
              <div style="text-align:center">
                ${crestHtml(m.escudoAdversario, m.adversario)}
                <div class="hero-match__team-name">${m.adversario}</div>
              </div>
            </div>
            <div class="hero-match__meta">
              <span>${I().calendar}${formatDate(m.data)}</span>
              <span>${I().clock}${m.hora || '--:--'}</span>
              <span>${I().pin}${m.local || 'Local a definir'}</span>
              <span class="badge ${m.tipo === 'campeonato' ? 'badge--accent' : 'badge--neutral'}">${m.tipo === 'campeonato' ? 'Campeonato' : 'Amistoso'}</span>
            </div>
          </div>
          <div class="countdown">
            <div class="countdown__unit ${urgente ? 'is-urgent' : ''}">
              <span class="countdown__num">${c.dias}</span>
              <span class="countdown__unit-label">dias</span>
            </div>
            <div class="countdown__unit ${urgente ? 'is-urgent' : ''}">
              <span class="countdown__num">${c.horas}</span>
              <span class="countdown__unit-label">horas</span>
            </div>
            <div class="countdown__unit ${urgente ? 'is-urgent' : ''}">
              <span class="countdown__num">${c.minutos}</span>
              <span class="countdown__unit-label">min</span>
            </div>
          </div>
        </div>`;
    }

    /* ---------- Tabelas separadas: Campeonatos x Amistosos ---------- */
    function statTable(title, icon, s) {
      const rows = [
        ['Vitórias', s.vitorias],
        ['Empates', s.empates],
        ['Derrotas', s.derrotas],
        ['Pontos', s.pontos],
        ['Aproveitamento', s.aproveitamento + '%'],
        ['Saldo de gols', s.saldoGols],
        ['Gols marcados', s.golsMarcados],
        ['Gols sofridos', s.golsSofridos],
      ];
      return `
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">
            <span>${icon} ${title}</span>
            <span class="badge badge--neutral">${s.jogosDisputados} jogo${s.jogosDisputados !== 1 ? 's' : ''}</span>
          </div>
          ${s.jogosDisputados === 0
            ? `<p class="u-tertiary" style="font-size:var(--fs-sm)">Nenhum resultado lançado ainda nesta categoria.</p>`
            : `<div class="stat-table">${rows.map(([label, value]) => `
                <div class="stat-table__row"><span>${label}</span><strong>${value}</strong></div>
              `).join('')}</div>`}
        </div>`;
    }
    const statGridHtml = `
      <div class="two-col stagger">
        ${statTable('Campeonatos', I().championship, statsCampeonatos)}
        ${statTable('Amistosos', I().friendly, statsAmistosos)}
      </div>`;

    /* ---------- Destaques (artilheiro, assistências, mvp) ---------- */
    function highlightCard(title, icon, entry, unidade) {
      if (!entry) {
        return `<div class="card stat-card">
          <div class="stat-card__top"><span class="stat-card__label">${title}</span><span class="stat-card__icon">${icon}</span></div>
          <span class="u-tertiary" style="font-size:var(--fs-sm)">Ainda sem dados</span>
        </div>`;
      }
      return `<div class="card stat-card">
        <div class="stat-card__top"><span class="stat-card__label">${title}</span><span class="stat-card__icon">${icon}</span></div>
        <div class="entity-row" style="padding:0">
          <div class="avatar">${entry.jogador.foto ? `<img src="${entry.jogador.foto}" alt="">` : (entry.jogador.numero || '?')}</div>
          <div class="entity-row__info">
            <div class="entity-row__name">${entry.jogador.nome}</div>
            <div class="entity-row__meta">${entry.total} ${unidade}</div>
          </div>
        </div>
      </div>`;
    }
    const highlightsHtml = `
      <div class="stat-grid stagger u-mt-5" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        ${highlightCard('Artilheiro', I().goal, stats.artilheiro, 'gols')}
        ${highlightCard('Líder de assistências', I().assist, stats.liderAssistencias, 'assistências')}
        ${highlightCard('Jogador destaque', I().trophy, stats.jogadorDestaque, 'MVPs')}
      </div>`;

    /* ---------- Últimos resultados ---------- */
    function resultBadge(m) {
      const r = App.Stats.resultOf(m);
      const map = { vitoria: ['V', 'badge--win'], empate: ['E', 'badge--draw'], derrota: ['D', 'badge--loss'] };
      const [txt, cls] = map[r];
      return `<span class="badge ${cls}">${txt}</span>`;
    }
    const ultimosHtml = stats.ultimosResultados.length ? stats.ultimosResultados.map((m) => `
      <div class="match-row">
        ${crestHtml(m.escudoAdversario, m.adversario, 'sm')}
        <div class="match-row__info">
          <div class="match-row__opponent">${m.adversario}</div>
          <div class="match-row__meta">${formatDate(m.data)} · ${m.tipo === 'campeonato' ? 'Campeonato' : 'Amistoso'}</div>
        </div>
        <div class="match-row__score">${m.resultado.golsClube} - ${m.resultado.golsAdversario}</div>
        ${resultBadge(m)}
      </div>
    `).join('') : `<div class="empty-state" style="padding:var(--space-6)"><p>Nenhum resultado lançado ainda.</p></div>`;

    /* ---------- Próximos jogos ---------- */
    const proximosHtml = stats.proximosJogos.length ? stats.proximosJogos.slice(0, 5).map((m) => `
      <div class="match-row">
        ${crestHtml(m.escudoAdversario, m.adversario, 'sm')}
        <div class="match-row__info">
          <div class="match-row__opponent">${m.adversario}</div>
          <div class="match-row__meta">${formatDate(m.data)} · ${m.hora || '--:--'} · ${m.local || 'Local a definir'}</div>
        </div>
        <span class="badge ${m.tipo === 'campeonato' ? 'badge--accent' : 'badge--neutral'}">${m.tipo === 'campeonato' ? 'Campeonato' : 'Amistoso'}</span>
      </div>
    `).join('') : `<div class="empty-state" style="padding:var(--space-6)"><p>Nenhum jogo futuro cadastrado.</p></div>`;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Olá, ${config.nomeClube}</h1>
          <div class="page-header__subtitle">Temporada ${config.temporadaAtual}</div>
        </div>
      </div>
      ${pendentesHtml}
      ${alertHtml}
      <div class="${alertHtml || pendentesHtml ? 'u-mt-5' : ''}">${heroHtml}</div>
      <div class="u-mt-6">${statGridHtml}</div>
      ${highlightsHtml}
      <div class="two-col u-mt-6">
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">Últimos resultados</div>
          <div class="stagger">${ultimosHtml}</div>
        </div>
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">Próximos jogos</div>
          <div class="stagger">${proximosHtml}</div>
        </div>
      </div>
    `;

    container.querySelectorAll('.js-resolver-pendente').forEach((btn) => {
      btn.addEventListener('click', () => {
        const match = App.DB.getMatch(btn.dataset.id);
        App.Modules.matches.openModal(match, App.DB.getPlayers(), true);
      });
    });

    animateCounters(container);
  }

  function animateCounters(container) {
    container.querySelectorAll('.js-counter').forEach((el) => {
      const target = parseFloat(el.dataset.value) || 0;
      const suffix = el.dataset.suffix || '';
      const isFloat = !Number.isInteger(target);
      const duration = 700;
      const start = performance.now();
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = target * eased;
        el.textContent = (isFloat ? value.toFixed(1) : Math.round(value)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = (isFloat ? target.toFixed(1) : target) + suffix;
      }
      requestAnimationFrame(tick);
    });
  }

  return { render };
})();
