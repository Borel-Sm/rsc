/* ==========================================================================
   MÓDULO: ESTATÍSTICAS
   Rankings completos da temporada. Tudo calculado na hora pelo stats-engine
   a partir dos jogos — nada aqui é digitado manualmente.
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.statistics = (function () {
  const I = () => App.Icons;
  let filtro = 'geral'; // 'geral' | 'campeonato' | 'amistoso' | id de campeonato específico

  function render(container) {
    paint(container);
  }

  function buildFilter() {
    if (filtro === 'geral') return {};
    if (filtro === 'campeonato') return { tipo: 'campeonato' };
    if (filtro === 'amistoso') return { tipo: 'amistoso' };
    return { championshipId: filtro }; // id específico de campeonato
  }

  function paint(container) {
    const players = App.DB.getPlayers();
    const matches = App.DB.getMatches();
    const champs = App.DB.getChampionships();
    const stats = App.Stats.computeStats(matches, players, buildFilter());

    const segmented = `
      <div class="segmented">
        <button data-f="geral" class="${filtro === 'geral' ? 'is-active' : ''}">Geral</button>
        <button data-f="campeonato" class="${filtro === 'campeonato' ? 'is-active' : ''}">Campeonatos</button>
        <button data-f="amistoso" class="${filtro === 'amistoso' ? 'is-active' : ''}">Amistosos</button>
      </div>`;

    const champSelectHtml = champs.length ? `
      <select class="js-champ-select" style="margin-left:var(--space-3);padding:9px 12px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-surface-alt);font-size:var(--fs-sm)">
        <option value="">Campeonato específico...</option>
        ${champs.map((c) => `<option value="${c.id}" ${filtro === c.id ? 'selected' : ''}>${c.nome} (${c.temporada})</option>`).join('')}
      </select>` : '';

    const summaryItems = [
      { label: 'Jogos', value: stats.jogosDisputados, icon: I().matches },
      { label: 'Vitórias', value: stats.vitorias, icon: I().trophy },
      { label: 'Empates', value: stats.empates, icon: I().versus },
      { label: 'Derrotas', value: stats.derrotas, icon: I().versus },
      { label: 'Pontos', value: stats.pontos, icon: I().championship },
      { label: 'Aproveitamento', value: stats.aproveitamento + '%', icon: I().stats },
      { label: 'Saldo de gols', value: stats.saldoGols, icon: I().goal },
      { label: 'Média de gols', value: stats.mediaGols, icon: I().goal },
    ];
    const summaryHtml = `
      <div class="stat-grid stagger">
        ${summaryItems.map((s) => `
          <div class="card stat-card">
            <div class="stat-card__top"><span class="stat-card__label">${s.label}</span><span class="stat-card__icon">${s.icon}</span></div>
            <span class="stat-card__value">${s.value}</span>
          </div>`).join('')}
      </div>`;

    function rankingTable(title, icon, ranking, unidade) {
      if (!ranking.length) {
        return `
          <div class="card" style="padding:var(--space-5)">
            <div class="section-title"><span>${icon} ${title}</span></div>
            <p class="u-tertiary" style="font-size:var(--fs-sm)">Sem dados para este filtro ainda.</p>
          </div>`;
      }
      return `
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title"><span>${icon} ${title}</span></div>
          <div class="stagger">
            ${ranking.map((r, idx) => `
              <div class="entity-row">
                <span class="u-tertiary" style="font-weight:700;font-size:var(--fs-sm);width:20px;flex-shrink:0">${idx + 1}º</span>
                <div class="avatar">${r.jogador.foto ? `<img src="${r.jogador.foto}" alt="">` : (r.jogador.numero || '?')}</div>
                <div class="entity-row__info">
                  <div class="entity-row__name">${r.jogador.nome}</div>
                  <div class="entity-row__meta">#${r.jogador.numero} · ${r.jogador.posicao}</div>
                </div>
                <span class="badge badge--accent">${r.total} ${unidade}</span>
              </div>`).join('')}
          </div>
        </div>`;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Estatísticas</h1>
          <div class="page-header__subtitle">Calculadas automaticamente a partir dos jogos cadastrados</div>
        </div>
        <div class="u-flex" style="align-items:center">${segmented}${champSelectHtml}</div>
      </div>

      ${stats.jogosDisputados === 0 ? `
        <div class="card empty-state">
          <div class="empty-state__icon">${I().stats}</div>
          <h3>Ainda não há jogos com resultado para este filtro</h3>
          <p>Lance resultados na aba Jogos para ver os rankings aqui.</p>
        </div>
      ` : `
        ${summaryHtml}
        <div class="u-mt-6" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:var(--space-5)">
          ${rankingTable('Artilharia', I().goal, stats.rankingArtilharia, 'gols')}
          ${rankingTable('Assistências', I().assist, stats.rankingAssistencias, 'assist.')}
          ${rankingTable('Ranking de MVPs', I().trophy, stats.rankingMvp, 'MVPs')}
        </div>
      `}
    `;

    container.querySelectorAll('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => { filtro = btn.dataset.f; paint(container); });
    });
    const champSelect = container.querySelector('.js-champ-select');
    if (champSelect) {
      champSelect.addEventListener('change', () => {
        if (champSelect.value) { filtro = champSelect.value; paint(container); }
      });
    }
  }

  return { render };
})();
