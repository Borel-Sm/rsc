/* ==========================================================================
   APP — bootstrap
   ========================================================================== */

window.App = window.App || {};

App.refreshBrand = function () {
  const config = App.DB.getConfig();
  document.querySelectorAll('.js-brand-name').forEach((el) => { el.textContent = config.nomeClube; });
  document.querySelectorAll('.js-brand-season').forEach((el) => { el.textContent = 'Temporada ' + config.temporadaAtual; });
  document.querySelectorAll('.js-brand-crest').forEach((el) => {
    el.innerHTML = config.escudo
      ? `<img src="${config.escudo}" alt="">`
      : (config.nomeClube || '?').slice(0, 2).toUpperCase();
  });
};

App.applyTheme = function (theme) {
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
};

(function init() {
  document.addEventListener('DOMContentLoaded', () => {
    // Tema
    const config = App.DB.getConfig();
    App.applyTheme(config.tema);
    App.refreshBrand();

    // Toggle de tema (existe no desktop e pode existir no mobile no futuro)
    document.querySelectorAll('.js-theme-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        App.applyTheme(next);
        App.DB.saveConfig({ tema: next });
      });
    });

    // Navegação (sidebar + topbar mobile)
    document.querySelectorAll('.nav-link[data-route]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        App.Router.navigate(link.dataset.route);
      });
    });

    // Registro de rotas
    App.Router.register('dashboard', App.Modules.dashboard.render);
    App.Router.register('jogadores', App.Modules.players.render);
    App.Router.register('jogos', App.Modules.matches.render);
    App.Router.register('campeonatos', App.Modules.championships.render);
    App.Router.register('calendario', App.Modules.calendar.render);
    App.Router.register('estatisticas', App.Modules.statistics.render);
    App.Router.register('confrontos', App.Modules.confrontos.render);
    App.Router.register('compartilhamentos', App.Modules.sharing.render);
    App.Router.register('documentos', App.Modules.documents.render);
    App.Router.register('escalacao', App.Modules.lineup.render);
    App.Router.register('configuracoes', App.Modules.settings.render);
    ['amistosos']
      .forEach((r) => App.Router.register(r, App.Modules.placeholder.render));
    App.Router.register('placeholder', App.Modules.placeholder.render);

    App.Router.init();

    // Pergunta sobre jogos já ocorridos sem resultado lançado (dá um tempinho pra tela assentar)
    setTimeout(() => App.PendingCheck.runCheck(), 500);

    // Atualiza o dashboard sozinho a cada minuto (contagem regressiva viva)
    setInterval(() => {
      if (App.Router.current === 'dashboard') App.Modules.dashboard.render(document.getElementById('app-content'));
    }, 60000);
  });
})();
