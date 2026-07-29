/* ==========================================================================
   MÓDULO: DOCUMENTOS
   Guarda regulamentos, tabelas e comunicados — como nota de texto ou como
   arquivo pequeno anexado (localStorage tem espaço limitado; arquivos
   grandes devem esperar a migração pro Firebase Storage).
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.documents = (function () {
  const I = () => App.Icons;
  const TIPOS = ['Regulamento', 'Tabela', 'Comunicado', 'Outro'];
  const TAMANHO_MAX = 1.5 * 1024 * 1024; // ~1.5MB, limite prudente pro localStorage
  let filtro = 'Todos';

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('pt-BR');
  }

  function render(container) {
    paint(container);
  }

  function paint(container) {
    const docs = App.DB.getDocuments()
      .filter((d) => filtro === 'Todos' || d.tipo === filtro)
      .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

    const listHtml = docs.length ? docs.map((d) => `
      <div class="entity-row">
        <div class="avatar">${d.arquivoNome ? I().docs : I().docs}</div>
        <div class="entity-row__info">
          <div class="entity-row__name">${d.titulo}</div>
          <div class="entity-row__meta">
            <span class="badge badge--accent" style="margin-right:6px">${d.tipo}</span>
            ${formatDate(d.criadoEm)} ${d.arquivoNome ? '· ' + d.arquivoNome : ''}
          </div>
        </div>
        <div class="entity-row__actions" style="opacity:1">
          <button class="btn btn--ghost btn--icon btn--sm js-abrir" data-id="${d.id}" title="Abrir">${I().edit}</button>
          <button class="btn btn--ghost btn--icon btn--sm js-delete" data-id="${d.id}" title="Excluir">${I().trash}</button>
        </div>
      </div>
    `).join('') : `
      <div class="empty-state">
        <div class="empty-state__icon">${I().docs}</div>
        <h3>Nenhum documento aqui</h3>
        <p>Guarde regulamentos, tabelas de campeonato ou comunicados do clube.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Documentos</h1>
          <div class="page-header__subtitle">Regulamentos, tabelas e comunicados do clube</div>
        </div>
        <button class="btn btn--primary js-new">${I().plus} Novo documento</button>
      </div>
      <div class="segmented u-mt-5" style="margin-bottom:var(--space-5)">
        ${['Todos', ...TIPOS].map((t) => `<button data-t="${t}" class="${filtro === t ? 'is-active' : ''}">${t}${t !== 'Todos' ? 's' : ''}</button>`).join('')}
      </div>
      <div class="card list-card stagger">${listHtml}</div>
    `;

    container.querySelector('.js-new').addEventListener('click', () => openForm());
    container.querySelectorAll('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => { filtro = btn.dataset.t; paint(container); });
    });
    container.querySelectorAll('.js-abrir').forEach((btn) => {
      btn.addEventListener('click', () => openViewer(App.DB.getDocuments().find((d) => d.id === btn.dataset.id)));
    });
    container.querySelectorAll('.js-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const doc = App.DB.getDocuments().find((d) => d.id === btn.dataset.id);
        if (confirm(`Excluir "${doc.titulo}"?`)) {
          App.DB.deleteDocument(doc.id);
          paint(container);
          App.Toast.show('Documento removido', 'success');
        }
      });
    });
  }

  function openViewer(doc) {
    if (!doc) return;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div class="modal-header">
          <h2>${doc.titulo}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <span class="badge badge--accent">${doc.tipo}</span>
        <span class="u-tertiary" style="font-size:var(--fs-xs);margin-left:8px">${formatDate(doc.criadoEm)}</span>
        ${doc.conteudo ? `<p style="white-space:pre-wrap;margin-top:var(--space-4);font-size:var(--fs-sm);line-height:1.6">${doc.conteudo}</p>` : ''}
        ${doc.arquivoBase64 ? `
          <div class="card u-mt-5" style="padding:var(--space-4);text-align:center">
            <p class="u-muted" style="font-size:var(--fs-sm);margin-bottom:var(--space-3)">${doc.arquivoNome}</p>
            <a href="${doc.arquivoBase64}" download="${doc.arquivoNome}" class="btn btn--secondary">${I().upload} Baixar arquivo</a>
          </div>` : ''}
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Fechar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function openForm() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2>Novo documento</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="field field--full">
            <label>Título *</label>
            <input type="text" class="js-titulo" placeholder="Ex: Regulamento interno 2026">
          </div>
          <div class="field field--full">
            <label>Tipo *</label>
            <select class="js-tipo">
              ${TIPOS.map((t) => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div class="field field--full">
            <label>Conteúdo (texto, opcional)</label>
            <textarea class="js-conteudo" rows="6" placeholder="Escreva o comunicado ou as regras aqui..."></textarea>
          </div>
          <div class="field field--full">
            <label>Ou anexar um arquivo (opcional, até 1,5MB)</label>
            <div class="file-drop js-drop">
              <span class="js-drop-label">${I().upload} Clique para selecionar um arquivo (PDF, imagem...)</span>
            </div>
            <input type="file" class="js-arquivo" style="display:none">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Cancelar</button>
          <button class="btn btn--primary js-save">Salvar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    let arquivo = null; // { nome, base64 }

    overlay.querySelector('.js-drop').addEventListener('click', () => overlay.querySelector('.js-arquivo').click());
    overlay.querySelector('.js-arquivo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > TAMANHO_MAX) {
        App.Toast.show('Arquivo muito grande para o armazenamento local (máx. 1,5MB). Prefira um texto ou um arquivo menor.', 'danger');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        arquivo = { nome: file.name, base64: reader.result };
        overlay.querySelector('.js-drop-label').textContent = '📎 ' + file.name + ' (clique para trocar)';
      };
      reader.readAsDataURL(file);
    });

    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('.js-save').addEventListener('click', () => {
      const titulo = overlay.querySelector('.js-titulo').value.trim();
      const conteudo = overlay.querySelector('.js-conteudo').value.trim();
      if (!titulo) {
        App.Toast.show('Título é obrigatório', 'danger');
        return;
      }
      if (!conteudo && !arquivo) {
        App.Toast.show('Escreva um conteúdo ou anexe um arquivo', 'danger');
        return;
      }
      App.DB.saveDocument({
        titulo,
        tipo: overlay.querySelector('.js-tipo').value,
        conteudo: conteudo || null,
        arquivoNome: arquivo ? arquivo.nome : null,
        arquivoBase64: arquivo ? arquivo.base64 : null,
      });
      overlay.remove();
      paint(document.getElementById('app-content'));
      App.Toast.show('Documento salvo', 'success');
    });
  }

  return { render };
})();
