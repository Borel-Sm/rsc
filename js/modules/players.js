/* ==========================================================================
   MÓDULO: JOGADORES
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.players = (function () {
  const I = () => App.Icons;
  const POSICOES = ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meio-campo', 'Atacante'];

  function render(container) {
    paintList(container);
  }

  function paintList(container) {
    const players = App.DB.getPlayers().sort((a, b) => a.nome.localeCompare(b.nome));

    const listHtml = players.length ? players.map((p) => `
      <div class="entity-row">
        <div class="avatar">${p.foto ? `<img src="${p.foto}" alt="">` : (p.numero || '?')}</div>
        <div class="entity-row__info">
          <div class="entity-row__name">${p.nome}</div>
          <div class="entity-row__meta">
            <span class="status-dot status-dot--${p.status === 'off' ? 'off' : 'on'}"></span>
            #${p.numero} · ${p.posicao} · ${p.status === 'off' ? 'Inativo' : 'Ativo'}
          </div>
        </div>
        <div class="entity-row__actions">
          <button class="btn btn--ghost btn--icon btn--sm js-edit" data-id="${p.id}" title="Editar">${I().edit}</button>
          <button class="btn btn--ghost btn--icon btn--sm js-delete" data-id="${p.id}" title="Excluir">${I().trash}</button>
        </div>
      </div>
    `).join('') : `
      <div class="empty-state">
        <div class="empty-state__icon">${I().players}</div>
        <h3>Nenhum jogador cadastrado</h3>
        <p>Adicione o elenco para poder montar escalações e ver estatísticas automáticas.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Jogadores</h1>
          <div class="page-header__subtitle">${players.length} jogador${players.length !== 1 ? 'es' : ''} no elenco</div>
        </div>
        <button class="btn btn--primary js-new">${I().plus} Novo jogador</button>
      </div>
      <div class="card list-card stagger">${listHtml}</div>
    `;

    container.querySelector('.js-new').addEventListener('click', () => openModal());
    container.querySelectorAll('.js-edit').forEach((btn) => {
      btn.addEventListener('click', () => openModal(App.DB.getPlayer(btn.dataset.id)));
    });
    container.querySelectorAll('.js-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const player = App.DB.getPlayer(btn.dataset.id);
        if (confirm(`Excluir o jogador "${player.nome}"? Isso não remove os gols/assistências já lançados em jogos antigos.`)) {
          App.DB.deletePlayer(btn.dataset.id);
          paintList(container);
          App.Toast.show('Jogador removido', 'success');
        }
      });
    });
  }

  function openModal(player) {
    const isEdit = !!player;
    player = player || { nome: '', numero: '', posicao: POSICOES[0], status: 'on', foto: null };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>${isEdit ? 'Editar jogador' : 'Novo jogador'}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="field field--full">
            <label>Foto (opcional)</label>
            <div class="file-drop js-drop">
              ${player.foto ? `<img src="${player.foto}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin:0 auto 8px;">` : ''}
              <span>${I().upload} Clique para enviar uma foto</span>
            </div>
            <input type="file" accept="image/*" class="js-foto" style="display:none">
          </div>
          <div class="field">
            <label>Nome *</label>
            <input type="text" class="js-nome" value="${player.nome}" placeholder="Nome do jogador">
          </div>
          <div class="field">
            <label>Número *</label>
            <input type="number" class="js-numero" value="${player.numero}" placeholder="10">
          </div>
          <div class="field">
            <label>Posição *</label>
            <select class="js-posicao">
              ${POSICOES.map((pos) => `<option value="${pos}" ${player.posicao === pos ? 'selected' : ''}>${pos}</option>`).join('')}
            </select>
          </div>
          <div class="field field--switch">
            <label style="margin:0">Jogador ativo</label>
            <button type="button" class="theme-toggle js-status" data-on="${player.status !== 'off'}">
              <span class="theme-toggle__knob"></span>
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Cancelar</button>
          <button class="btn btn--primary js-save">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let fotoBase64 = player.foto;

    const statusBtn = overlay.querySelector('.js-status');
    syncStatusToggle(statusBtn);
    statusBtn.addEventListener('click', () => {
      statusBtn.dataset.on = statusBtn.dataset.on === 'true' ? 'false' : 'true';
      syncStatusToggle(statusBtn);
    });

    overlay.querySelector('.js-drop').addEventListener('click', () => overlay.querySelector('.js-foto').click());
    overlay.querySelector('.js-foto').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { fotoBase64 = reader.result; };
      reader.readAsDataURL(file);
    });

    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.js-save').addEventListener('click', () => {
      const nome = overlay.querySelector('.js-nome').value.trim();
      const numero = overlay.querySelector('.js-numero').value.trim();
      if (!nome || !numero) {
        App.Toast.show('Nome e número são obrigatórios', 'danger');
        return;
      }
      const data = {
        id: isEdit ? player.id : undefined,
        nome,
        numero,
        posicao: overlay.querySelector('.js-posicao').value,
        status: statusBtn.dataset.on === 'true' ? 'on' : 'off',
        foto: fotoBase64,
      };
      App.DB.savePlayer(data);
      overlay.remove();
      paintList(document.getElementById('app-content'));
      App.Toast.show(isEdit ? 'Jogador atualizado' : 'Jogador cadastrado', 'success');
    });
  }

  function syncStatusToggle(btn) {
    const on = btn.dataset.on === 'true';
    btn.classList.toggle('is-on', on);
  }

  return { render };
})();
