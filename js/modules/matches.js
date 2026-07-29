/* ==========================================================================
   MÓDULO: JOGOS
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.matches = (function () {
  const I = () => App.Icons;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function playerName(id, players) {
    const p = players.find((x) => x.id === id);
    return p ? p.nome : '—';
  }

  function championshipName(campeonatoId) {
    if (!campeonatoId) return 'Campeonato';
    const c = App.DB.getChampionships().find((x) => x.id === campeonatoId);
    return c ? c.nome : 'Campeonato';
  }

  function render(container) {
    paintList(container);
  }

  function paintList(container) {
    const players = App.DB.getPlayers();
    const matches = App.DB.getMatches().slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    const listHtml = matches.length ? matches.map((m) => {
      const jogado = App.Stats.isPlayed(m);
      const resultTxt = jogado ? `${m.resultado.golsClube} - ${m.resultado.golsAdversario}` : formatDate(m.hora ? m.data : m.data);
      return `
      <div class="entity-row js-open" data-id="${m.id}" style="cursor:pointer">
        <div class="crest crest--sm">${m.escudoAdversario ? `<img src="${m.escudoAdversario}" alt="">` : (m.adversario || '?').slice(0, 2).toUpperCase()}</div>
        <div class="entity-row__info">
          <div class="entity-row__name">${m.adversario || 'Adversário não definido'}</div>
          <div class="entity-row__meta">${formatDate(m.data)} · ${m.hora || '--:--'} · ${m.local || 'Local a definir'} · ${m.tipo === 'campeonato' ? championshipName(m.campeonatoId) : 'Amistoso'}</div>
        </div>
        <div class="u-flex u-gap-3" style="align-items:center">
          ${jogado ? `<span class="match-row__score">${resultTxt}</span>` : `<span class="badge badge--neutral">Agendado</span>`}
          <div class="entity-row__actions" style="opacity:1">
            <button class="btn btn--ghost btn--icon btn--sm js-escalacao" data-id="${m.id}" title="Escalação">${I().lineup}</button>
            <button class="btn btn--ghost btn--icon btn--sm js-delete" data-id="${m.id}" title="Excluir">${I().trash}</button>
          </div>
        </div>
      </div>`;
    }).join('') : `
      <div class="empty-state">
        <div class="empty-state__icon">${I().matches}</div>
        <h3>Nenhum jogo cadastrado</h3>
        <p>Cadastre o próximo confronto para o dashboard mostrar a contagem regressiva.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Jogos</h1>
          <div class="page-header__subtitle">${matches.length} jogo${matches.length !== 1 ? 's' : ''} cadastrado${matches.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="btn btn--primary js-new">${I().plus} Novo jogo</button>
      </div>
      <div class="card list-card stagger">${listHtml}</div>
    `;

    container.querySelector('.js-new').addEventListener('click', () => openModal(null, players));
    container.querySelectorAll('.js-open').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.js-delete')) return;
        openModal(App.DB.getMatch(row.dataset.id), players);
      });
    });
    container.querySelectorAll('.js-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Excluir este jogo? As estatísticas serão recalculadas automaticamente.')) {
          App.DB.deleteMatch(btn.dataset.id);
          paintList(container);
          App.Toast.show('Jogo removido', 'success');
        }
      });
    });
    container.querySelectorAll('.js-escalacao').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        App.Modules.lineup.pendingMatchId = btn.dataset.id;
        App.Router.navigate('escalacao');
      });
    });
  }

  function playerOptions(players, selectedId) {
    return `<option value="">Selecionar jogador</option>` + players.map((p) =>
      `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>#${p.numero} ${p.nome}</option>`
    ).join('');
  }

  function eventRow(kind, players, jogadorId) {
    return `
      <div class="u-flex u-gap-2 js-event-row" data-kind="${kind}" style="align-items:center">
        <select class="js-event-player" style="flex:1;padding:9px 10px;border-radius:var(--radius-sm);border:1px solid var(--border-color);background:var(--bg-surface-alt)">
          ${playerOptions(players, jogadorId)}
        </select>
        <button type="button" class="btn btn--ghost btn--icon btn--sm js-remove-event">✕</button>
      </div>`;
  }

  function openModal(match, players, forcarResultado) {
    const isEdit = !!match;
    match = match || {
      tipo: 'amistoso', campeonatoNome: '', adversario: '', escudoAdversario: null,
      data: '', hora: '', local: '', mandante: true,
      resultado: null, gols: [], assistencias: [], mvpId: null, observacoes: '',
    };
    let escudoBase64 = match.escudoAdversario;
    const jogado = forcarResultado || App.Stats.isPlayed(match);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header">
          <h2>${isEdit ? 'Editar jogo' : 'Novo jogo'}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Tipo *</label>
            <select class="js-tipo">
              <option value="amistoso" ${match.tipo === 'amistoso' ? 'selected' : ''}>Amistoso</option>
              <option value="campeonato" ${match.tipo === 'campeonato' ? 'selected' : ''}>Campeonato</option>
            </select>
          </div>
          <div class="field js-campeonato-wrap" style="${match.tipo === 'campeonato' ? '' : 'display:none'}">
            <label>Campeonato</label>
            <div class="u-flex u-gap-2">
              <select class="js-campeonato" style="flex:1"></select>
              <button type="button" class="btn btn--secondary btn--sm js-novo-campeonato" title="Criar novo campeonato">${I().plus}</button>
            </div>
          </div>

          <div class="field field--full">
            <label>Adversário *</label>
            <input type="text" class="js-adversario" value="${match.adversario}" placeholder="Nome do time adversário">
          </div>
          <div class="field field--full">
            <label>Escudo do adversário (opcional)</label>
            <div class="file-drop js-drop">
              ${escudoBase64 ? `<img src="${escudoBase64}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;margin:0 auto 8px;">` : ''}
              <span>${I().upload} Clique para enviar o escudo</span>
            </div>
            <input type="file" accept="image/*" class="js-escudo" style="display:none">
          </div>

          <div class="field">
            <label>Data *</label>
            <input type="date" class="js-data" value="${match.data}">
          </div>
          <div class="field">
            <label>Hora *</label>
            <input type="time" class="js-hora" value="${match.hora}">
          </div>
          <div class="field field--full">
            <label>Local</label>
            <input type="text" class="js-local" value="${match.local}" placeholder="Nome do campo/arena">
          </div>
          <div class="field field--switch field--full">
            <label style="margin:0">Mandante (jogo em casa)</label>
            <button type="button" class="theme-toggle js-mandante" data-on="${match.mandante !== false}">
              <span class="theme-toggle__knob"></span>
            </button>
          </div>
        </div>

        <div class="u-mt-5" style="border-top:1px solid var(--border-color);padding-top:var(--space-4)">
          <div class="field--switch u-flex" style="align-items:center;gap:var(--space-3)">
            <label style="margin:0;font-weight:600">Resultado já lançado?</label>
            <button type="button" class="theme-toggle js-jogado" data-on="${jogado}">
              <span class="theme-toggle__knob"></span>
            </button>
          </div>

          <div class="js-resultado-block u-mt-5" style="${jogado ? '' : 'display:none'}">
            <div class="form-grid">
              <div class="field">
                <label>Gols ${match.mandante === false ? 'do clube (visitante)' : 'do clube'}</label>
                <input type="number" min="0" class="js-gols-clube" value="${match.resultado ? match.resultado.golsClube : 0}">
              </div>
              <div class="field">
                <label>Gols do adversário</label>
                <input type="number" min="0" class="js-gols-adversario" value="${match.resultado ? match.resultado.golsAdversario : 0}">
              </div>
            </div>

            <div class="u-mt-5">
              <label style="font-size:var(--fs-xs);font-weight:600;color:var(--text-secondary)">Gols marcados (jogadores)</label>
              <div class="js-gols-list u-mt-3">${(match.gols || []).map((g) => eventRow('gol', players, g.jogadorId)).join('')}</div>
              <button type="button" class="btn btn--ghost btn--sm js-add-gol u-mt-3">${I().plus} Adicionar gol</button>
            </div>

            <div class="u-mt-5">
              <label style="font-size:var(--fs-xs);font-weight:600;color:var(--text-secondary)">Assistências</label>
              <div class="js-assist-list u-mt-3">${(match.assistencias || []).map((a) => eventRow('assist', players, a.jogadorId)).join('')}</div>
              <button type="button" class="btn btn--ghost btn--sm js-add-assist u-mt-3">${I().plus} Adicionar assistência</button>
            </div>

            <div class="field u-mt-5">
              <label>Jogador destaque (MVP)</label>
              <select class="js-mvp">${playerOptions(players, match.mvpId)}</select>
            </div>
          </div>
        </div>

        <div class="field u-mt-5">
          <label>Observações</label>
          <textarea class="js-observacoes" placeholder="Notas sobre a partida...">${match.observacoes || ''}</textarea>
        </div>

        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Cancelar</button>
          <button class="btn btn--primary js-save">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const tipoSelect = overlay.querySelector('.js-tipo');
    tipoSelect.addEventListener('change', () => {
      overlay.querySelector('.js-campeonato-wrap').style.display = tipoSelect.value === 'campeonato' ? '' : 'none';
    });

    function populateCampeonatoSelect(selectedId) {
      const sel = overlay.querySelector('.js-campeonato');
      const champs = App.DB.getChampionships();
      sel.innerHTML = champs.length
        ? champs.map((c) => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.nome} (${c.temporada})</option>`).join('')
        : `<option value="">Nenhum campeonato cadastrado ainda</option>`;
    }
    populateCampeonatoSelect(match.campeonatoId);

    overlay.querySelector('.js-novo-campeonato').addEventListener('click', () => {
      const nome = prompt('Nome do novo campeonato:');
      if (!nome || !nome.trim()) return;
      const temporada = prompt('Temporada:', App.DB.getConfig().temporadaAtual) || App.DB.getConfig().temporadaAtual;
      const champ = App.DB.saveChampionship({ nome: nome.trim(), temporada: temporada.trim() });
      populateCampeonatoSelect(champ.id);
    });

    const mandanteBtn = overlay.querySelector('.js-mandante');
    syncToggle(mandanteBtn);
    mandanteBtn.addEventListener('click', () => { toggleFlip(mandanteBtn); });

    const jogadoBtn = overlay.querySelector('.js-jogado');
    syncToggle(jogadoBtn);
    const resultadoBlock = overlay.querySelector('.js-resultado-block');
    jogadoBtn.addEventListener('click', () => {
      toggleFlip(jogadoBtn);
      resultadoBlock.style.display = jogadoBtn.dataset.on === 'true' ? '' : 'none';
    });

    overlay.querySelector('.js-drop').addEventListener('click', () => overlay.querySelector('.js-escudo').click());
    overlay.querySelector('.js-escudo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { escudoBase64 = reader.result; };
      reader.readAsDataURL(file);
    });

    function wireRemove(row) {
      row.querySelector('.js-remove-event').addEventListener('click', () => row.remove());
    }
    overlay.querySelectorAll('.js-event-row').forEach(wireRemove);

    overlay.querySelector('.js-add-gol').addEventListener('click', () => {
      const div = document.createElement('div');
      div.innerHTML = eventRow('gol', players, null);
      const row = div.firstElementChild;
      overlay.querySelector('.js-gols-list').appendChild(row);
      wireRemove(row);
    });
    overlay.querySelector('.js-add-assist').addEventListener('click', () => {
      const div = document.createElement('div');
      div.innerHTML = eventRow('assist', players, null);
      const row = div.firstElementChild;
      overlay.querySelector('.js-assist-list').appendChild(row);
      wireRemove(row);
    });

    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.js-save').addEventListener('click', () => {
      const adversario = overlay.querySelector('.js-adversario').value.trim();
      const data = overlay.querySelector('.js-data').value;
      const hora = overlay.querySelector('.js-hora').value;
      if (!adversario || !data || !hora) {
        App.Toast.show('Adversário, data e hora são obrigatórios', 'danger');
        return;
      }

      const jogadoAgora = jogadoBtn.dataset.on === 'true';
      let resultado = null;
      let gols = [];
      let assistencias = [];
      let mvpId = null;

      if (jogadoAgora) {
        resultado = {
          golsClube: parseInt(overlay.querySelector('.js-gols-clube').value, 10) || 0,
          golsAdversario: parseInt(overlay.querySelector('.js-gols-adversario').value, 10) || 0,
        };
        gols = Array.from(overlay.querySelectorAll('.js-gols-list .js-event-player'))
          .map((s) => s.value).filter(Boolean).map((id) => ({ jogadorId: id }));
        assistencias = Array.from(overlay.querySelectorAll('.js-assist-list .js-event-player'))
          .map((s) => s.value).filter(Boolean).map((id) => ({ jogadorId: id }));
        mvpId = overlay.querySelector('.js-mvp').value || null;
      }

      const payload = {
        id: isEdit ? match.id : undefined,
        tipo: tipoSelect.value,
        campeonatoId: tipoSelect.value === 'campeonato' ? (overlay.querySelector('.js-campeonato').value || null) : null,
        adversario,
        escudoAdversario: escudoBase64,
        data, hora,
        local: overlay.querySelector('.js-local').value.trim(),
        mandante: mandanteBtn.dataset.on === 'true',
        resultado, gols, assistencias, mvpId,
        observacoes: overlay.querySelector('.js-observacoes').value.trim(),
        // se um resultado real foi lançado agora, o jogo deixa de ser "pendente de confirmação"
        pendente: jogadoAgora ? false : (match.pendente || false),
      };

      App.DB.saveMatch(payload);
      overlay.remove();
      refreshCurrentScreen();
      App.Toast.show(isEdit ? 'Jogo atualizado' : 'Jogo cadastrado', 'success');
    });
  }

  // Depois de salvar, atualiza a tela que estiver aberta no momento (Jogos ou Dashboard),
  // em vez de sempre forçar a lista de Jogos — importante pro fluxo de "confirmar pendência".
  function refreshCurrentScreen() {
    const container = document.getElementById('app-content');
    if (!container) return;
    if (App.Router.current === 'dashboard') {
      App.Modules.dashboard.render(container);
    } else {
      paintList(container);
    }
  }

  function syncToggle(btn) {
    btn.classList.toggle('is-on', btn.dataset.on === 'true');
  }
  function toggleFlip(btn) {
    btn.dataset.on = btn.dataset.on === 'true' ? 'false' : 'true';
    syncToggle(btn);
  }

  return { render, openModal, paintList };
})();
