/* ==========================================================================
   PENDING CHECK
   Ao abrir o sistema, verifica jogos cuja data já chegou (hoje ou antes)
   e que ainda não têm resultado lançado. Pergunta ao usuário se o jogo
   já aconteceu:
     - Sim  -> abre o formulário do jogo direto na seção de resultado
     - Não  -> marca o jogo como "pendente" (não pergunta de novo sozinho;
               fica visível como aviso no Dashboard até ser resolvido)
   ========================================================================== */

window.App = window.App || {};

App.PendingCheck = (function () {
  function todayStr() {
    const d = new Date();
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  // Jogos que precisam de uma resposta (ainda não perguntado / não marcado como pendente)
  function getAwaitingConfirmation() {
    const today = todayStr();
    return App.DB.getMatches().filter((m) =>
      m.data && m.data <= today && !App.Stats.isPlayed(m) && !m.pendente
    );
  }

  // Jogos já marcados como pendentes (usuário respondeu "não" antes) — para mostrar no Dashboard
  function getPending() {
    return App.DB.getMatches().filter((m) => m.pendente && !App.Stats.isPlayed(m));
  }

  function askAbout(match) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const dataFmt = match.data.split('-').reverse().join('/');
    overlay.innerHTML = `
      <div class="modal" style="max-width:420px; text-align:center;">
        <div class="empty-state__icon" style="margin:0 auto var(--space-4)">${App.Icons.bell}</div>
        <h2 style="font-size:var(--fs-lg); font-weight:700; margin-bottom:var(--space-2)">Jogo contra ${match.adversario}</h2>
        <p class="u-muted" style="margin-bottom:var(--space-6)">Estava marcado para ${dataFmt}. Esse confronto já foi concluído?</p>
        <div class="u-flex u-gap-3" style="justify-content:center">
          <button class="btn btn--secondary js-nao">Ainda não aconteceu</button>
          <button class="btn btn--primary js-sim">Sim, já aconteceu</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.js-nao').addEventListener('click', () => {
      App.DB.saveMatch({ id: match.id, pendente: true });
      overlay.remove();
      App.Toast.show('Jogo marcado como pendente — você pode confirmar depois pelo Dashboard', 'success');
      refreshDashboardIfVisible();
    });

    overlay.querySelector('.js-sim').addEventListener('click', () => {
      overlay.remove();
      App.Modules.matches.openModal(match, App.DB.getPlayers(), true);
    });
  }

  function refreshDashboardIfVisible() {
    if (App.Router.current === 'dashboard') {
      App.Modules.dashboard.render(document.getElementById('app-content'));
    }
  }

  // Pergunta sobre no máximo 1 jogo por vez, para não empilhar popups
  function runCheck() {
    const list = getAwaitingConfirmation();
    if (list.length) askAbout(list[0]);
  }

  return { runCheck, getAwaitingConfirmation, getPending };
})();
