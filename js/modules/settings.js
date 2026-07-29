/* ==========================================================================
   MÓDULO: CONFIGURAÇÕES (versão inicial — nome, escudo, temporada, tema)
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.settings = (function () {
  const I = () => App.Icons;

  function render(container) {
    const config = App.DB.getConfig();
    let escudoBase64 = config.escudo;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Configurações</h1>
          <div class="page-header__subtitle">Dados gerais do clube</div>
        </div>
      </div>

      <div class="card" style="padding:var(--space-6);max-width:560px">
        <div class="form-grid">
          <div class="field field--full">
            <label>Escudo do clube</label>
            <div class="file-drop js-drop">
              ${escudoBase64 ? `<img src="${escudoBase64}" style="width:64px;height:64px;border-radius:12px;object-fit:cover;margin:0 auto 8px;">` : ''}
              <span>${I().upload} Clique para enviar o escudo</span>
            </div>
            <input type="file" accept="image/*" class="js-escudo" style="display:none">
          </div>
          <div class="field field--full">
            <label>Nome do clube</label>
            <input type="text" class="js-nome" value="${config.nomeClube}">
          </div>
          <div class="field">
            <label>Temporada atual</label>
            <input type="text" class="js-temporada" value="${config.temporadaAtual}">
          </div>
          <div class="field">
            <label>Avisar com quantos dias de antecedência</label>
            <input type="number" min="1" class="js-dias" value="${config.diasAlerta}">
          </div>
        </div>
        <div class="modal-footer" style="border-top:none;padding-top:var(--space-5)">
          <button class="btn btn--primary js-save">Salvar alterações</button>
        </div>
      </div>

      <div class="card u-mt-5" style="padding:var(--space-6);max-width:560px">
        <div class="section-title">Aparência</div>
        <div class="field--switch u-flex" style="align-items:center;gap:var(--space-3)">
          <label style="margin:0">Modo escuro</label>
          <button type="button" class="theme-toggle js-settings-theme"><span class="theme-toggle__knob"></span></button>
        </div>
      </div>

      <div class="card u-mt-5" style="padding:var(--space-6);max-width:560px">
        <div class="section-title">Backup</div>
        <p class="u-muted" style="font-size:var(--fs-sm);margin-bottom:var(--space-4)">Exporte seus dados em JSON para guardar uma cópia, ou importe um backup anterior.</p>
        <div class="u-flex u-gap-3">
          <button class="btn btn--secondary js-export">Exportar backup</button>
          <button class="btn btn--secondary js-import">Importar backup</button>
        </div>
        <input type="file" accept="application/json" class="js-import-file" style="display:none">
      </div>
    `;

    container.querySelector('.js-drop').addEventListener('click', () => container.querySelector('.js-escudo').click());
    container.querySelector('.js-escudo').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { escudoBase64 = reader.result; };
      reader.readAsDataURL(file);
    });

    container.querySelector('.js-save').addEventListener('click', () => {
      App.DB.saveConfig({
        nomeClube: container.querySelector('.js-nome').value.trim() || 'Meu Clube',
        temporadaAtual: container.querySelector('.js-temporada').value.trim(),
        diasAlerta: parseInt(container.querySelector('.js-dias').value, 10) || 3,
        escudo: escudoBase64,
      });
      App.Toast.show('Configurações salvas', 'success');
      App.refreshBrand();
    });

    container.querySelector('.js-export').addEventListener('click', () => {
      const data = App.DB.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${config.nomeClube.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    container.querySelector('.js-import').addEventListener('click', () => container.querySelector('.js-import-file').click());
    container.querySelector('.js-import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          App.DB.importBackup(JSON.parse(reader.result));
          App.Toast.show('Backup importado com sucesso', 'success');
          App.refreshBrand();
          App.Router.navigate('dashboard');
        } catch (err) {
          App.Toast.show('Arquivo de backup inválido', 'danger');
        }
      };
      reader.readAsText(file);
    });
  }

  return { render };
})();

/* ==========================================================================
   MÓDULO GENÉRICO — placeholder para telas ainda não construídas
   ========================================================================== */
App.Modules.placeholder = (function () {
  const TITLES = {
    campeonatos: ['Campeonatos', 'Cadastro de campeonatos, pontuação e classificação automática'],
    amistosos: ['Amistosos', 'Estatísticas independentes dos campeonatos'],
    calendario: ['Calendário', 'Visão mensal dos jogos'],
    estatisticas: ['Estatísticas', 'Rankings completos da temporada'],
    confrontos: ['Confrontos', 'Tela de divulgação das partidas, pronta para postar'],
    compartilhamentos: ['Compartilhamentos', 'Textos automáticos para WhatsApp e redes sociais'],
    documentos: ['Documentos', 'Regulamentos, tabelas e comunicados'],
    escalacao: ['Escalação', 'Campo tático com drag and drop'],
  };

  function render(container, routeName) {
    const [title, desc] = TITLES[routeName] || ['Em breve', 'Este módulo ainda será construído'];
    container.innerHTML = `
      <div class="page-header"><div><h1>${title}</h1></div></div>
      <div class="card empty-state">
        <div class="empty-state__icon">${App.Icons.settings}</div>
        <h3>Módulo em construção</h3>
        <p>${desc}. Este é o próximo passo do sistema — a fundação e o Dashboard já estão prontos.</p>
      </div>
    `;
  }
  return { render };
})();