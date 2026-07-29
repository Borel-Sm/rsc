/* ==========================================================================
   MÓDULO: CAMPEONATOS
   Cada campeonato guarda só nome/temporada. Toda a classificação (jogos,
   pontos, saldo, artilheiro etc.) é calculada na hora pelo stats-engine,
   filtrando os jogos que apontam pra esse campeonato — nada fica salvo pronto.
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.championships = (function () {
  const I = () => App.Icons;

  function render(container) {
    paintOverview(container);
  }

  function paintOverview(container) {
    const champs = App.DB.getChampionships().sort((a, b) => (b.temporada || '').localeCompare(a.temporada || ''));
    const players = App.DB.getPlayers();
    const allMatches = App.DB.getMatches();

    const cardsHtml = champs.length ? champs.map((c) => {
      const stats = App.Stats.computeStats(allMatches, players, { championshipId: c.id });
      return `
        <div class="card card--hover js-open-champ" data-id="${c.id}" style="padding:var(--space-5);cursor:pointer">
          <div class="u-flex" style="justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-weight:700;font-size:var(--fs-md);letter-spacing:-0.01em">${c.nome}</div>
              <div class="u-tertiary" style="font-size:var(--fs-xs);margin-top:2px">Temporada ${c.temporada}</div>
            </div>
            <div class="entity-row__actions" style="opacity:1">
              <button class="btn btn--ghost btn--icon btn--sm js-edit-champ" data-id="${c.id}" title="Editar">${I().edit}</button>
              <button class="btn btn--ghost btn--icon btn--sm js-delete-champ" data-id="${c.id}" title="Excluir">${I().trash}</button>
            </div>
          </div>
          <div class="u-flex u-gap-3 u-mt-5" style="flex-wrap:wrap">
            <span class="badge badge--accent">${stats.jogosDisputados} jogo${stats.jogosDisputados !== 1 ? 's' : ''}</span>
            <span class="badge badge--win">${stats.vitorias}V</span>
            <span class="badge badge--draw">${stats.empates}E</span>
            <span class="badge badge--loss">${stats.derrotas}D</span>
            <span class="badge badge--neutral">${stats.pontos} pts</span>
            <span class="badge badge--neutral">${stats.aproveitamento}% aprov.</span>
          </div>
        </div>`;
    }).join('') : `
      <div class="card empty-state">
        <div class="empty-state__icon">${I().championship}</div>
        <h3>Nenhum campeonato cadastrado</h3>
        <p>Crie um campeonato para começar a vincular jogos a ele e ver a classificação calculada automaticamente.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Campeonatos</h1>
          <div class="page-header__subtitle">${champs.length} campeonato${champs.length !== 1 ? 's' : ''} cadastrado${champs.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn--primary js-new-champ">${I().plus} Novo campeonato</button>
      </div>
      <div class="stat-grid stagger" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">${cardsHtml}</div>
    `;

    container.querySelector('.js-new-champ').addEventListener('click', () => openForm());
    container.querySelectorAll('.js-open-champ').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.js-edit-champ') || e.target.closest('.js-delete-champ')) return;
        paintDetail(container, card.dataset.id);
      });
    });
    container.querySelectorAll('.js-edit-champ').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openForm(App.DB.getChampionships().find((c) => c.id === btn.dataset.id));
      });
    });
    container.querySelectorAll('.js-delete-champ').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const champ = App.DB.getChampionships().find((c) => c.id === btn.dataset.id);
        if (confirm(`Excluir o campeonato "${champ.nome}"? Os jogos já cadastrados não serão apagados, só deixarão de estar vinculados a ele.`)) {
          // desvincula os jogos que apontavam pra esse campeonato, sem apagar os jogos
          App.DB.getMatches().filter((m) => m.campeonatoId === champ.id).forEach((m) => {
            App.DB.saveMatch({ id: m.id, campeonatoId: null });
          });
          App.DB.deleteChampionship(champ.id);
          paintOverview(container);
          App.Toast.show('Campeonato removido', 'success');
        }
      });
    });
  }

  function paintDetail(container, champId) {
    const champ = App.DB.getChampionships().find((c) => c.id === champId);
    if (!champ) { paintOverview(container); return; }

    const players = App.DB.getPlayers();
    const matches = App.DB.getMatches().filter((m) => m.campeonatoId === champId)
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const stats = App.Stats.computeStats(App.DB.getMatches(), players, { championshipId: champId });

    function formatDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }
    function destaqueRow(entry, label, unidade) {
      if (!entry) return `<div class="u-tertiary" style="font-size:var(--fs-sm)">${label}: ainda sem dados</div>`;
      return `<div class="entity-row" style="padding:var(--space-2) 0">
        <div class="avatar">${entry.jogador.foto ? `<img src="${entry.jogador.foto}" alt="">` : (entry.jogador.numero || '?')}</div>
        <div class="entity-row__info">
          <div class="entity-row__name">${entry.jogador.nome}</div>
          <div class="entity-row__meta">${label} · ${entry.total} ${unidade}</div>
        </div>
      </div>`;
    }

    const jogosHtml = matches.length ? matches.map((m) => {
      const jogado = App.Stats.isPlayed(m);
      return `
      <div class="match-row">
        <div class="crest crest--sm">${m.escudoAdversario ? `<img src="${m.escudoAdversario}" alt="">` : (m.adversario || '?').slice(0, 2).toUpperCase()}</div>
        <div class="match-row__info">
          <div class="match-row__opponent">${m.adversario}</div>
          <div class="match-row__meta">${formatDate(m.data)}</div>
        </div>
        ${jogado ? `<span class="match-row__score">${m.resultado.golsClube} - ${m.resultado.golsAdversario}</span>` : `<span class="badge badge--neutral">Agendado</span>`}
      </div>`;
    }).join('') : `<p class="u-muted" style="padding:var(--space-4) 0">Nenhum jogo vinculado a este campeonato ainda. Vincule em <strong>Jogos → Tipo: Campeonato</strong>.</p>`;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <button class="btn btn--ghost btn--sm js-voltar" style="margin-bottom:var(--space-3);padding-left:0">← Voltar</button>
          <h1>${champ.nome}</h1>
          <div class="page-header__subtitle">Temporada ${champ.temporada}</div>
        </div>
      </div>

      <div class="stat-grid stagger">
        <div class="card stat-card"><span class="stat-card__label">Jogos</span><span class="stat-card__value">${stats.jogosDisputados}</span></div>
        <div class="card stat-card"><span class="stat-card__label">Pontos</span><span class="stat-card__value">${stats.pontos}</span></div>
        <div class="card stat-card"><span class="stat-card__label">Aproveitamento</span><span class="stat-card__value">${stats.aproveitamento}%</span></div>
        <div class="card stat-card"><span class="stat-card__label">Saldo de gols</span><span class="stat-card__value">${stats.saldoGols}</span></div>
      </div>
      <div class="u-flex u-gap-3 u-mt-5">
        <span class="badge badge--win">${stats.vitorias} vitórias</span>
        <span class="badge badge--draw">${stats.empates} empates</span>
        <span class="badge badge--loss">${stats.derrotas} derrotas</span>
        <span class="badge badge--neutral">${stats.golsMarcados} gols marcados</span>
        <span class="badge badge--neutral">${stats.golsSofridos} gols sofridos</span>
      </div>

      <div class="two-col u-mt-6">
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">Jogos do campeonato</div>
          <div class="stagger">${jogosHtml}</div>
        </div>
        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">Destaques</div>
          ${destaqueRow(stats.artilheiro, 'Artilheiro', 'gols')}
          ${destaqueRow(stats.liderAssistencias, 'Líder de assistências', 'assistências')}
          ${destaqueRow(stats.jogadorDestaque, 'MVP do campeonato', 'MVPs')}
        </div>
      </div>
    `;

    container.querySelector('.js-voltar').addEventListener('click', () => paintOverview(container));
  }

  function openForm(champ) {
    const isEdit = !!champ;
    champ = champ || { nome: '', temporada: App.DB.getConfig().temporadaAtual };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <h2>${isEdit ? 'Editar campeonato' : 'Novo campeonato'}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="field field--full">
            <label>Nome *</label>
            <input type="text" class="js-nome" value="${champ.nome}" placeholder="Ex: Copa da Cidade">
          </div>
          <div class="field field--full">
            <label>Temporada *</label>
            <input type="text" class="js-temporada" value="${champ.temporada}">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Cancelar</button>
          <button class="btn btn--primary js-save">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.js-save').addEventListener('click', () => {
      const nome = overlay.querySelector('.js-nome').value.trim();
      const temporada = overlay.querySelector('.js-temporada').value.trim();
      if (!nome || !temporada) {
        App.Toast.show('Nome e temporada são obrigatórios', 'danger');
        return;
      }
      App.DB.saveChampionship({ id: isEdit ? champ.id : undefined, nome, temporada });
      overlay.remove();
      paintOverview(document.getElementById('app-content'));
      App.Toast.show(isEdit ? 'Campeonato atualizado' : 'Campeonato cadastrado', 'success');
    });
  }

  return { render };
})();
