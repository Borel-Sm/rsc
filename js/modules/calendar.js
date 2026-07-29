/* ==========================================================================
   MÓDULO: CALENDÁRIO
   Visão mensal. Cada jogo aparece no dia marcado; ao clicar, abre os
   detalhes completos da partida (local, hora, campeonato, resultado).
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.calendar = (function () {
  const I = () => App.Icons;
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  let viewYear, viewMonth; // 0-indexed month, estado do módulo (mês sendo exibido)

  function pad(n) { return String(n).padStart(2, '0'); }
  function dateKey(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function championshipName(campeonatoId) {
    if (!campeonatoId) return null;
    const c = App.DB.getChampionships().find((x) => x.id === campeonatoId);
    return c ? c.nome : null;
  }

  function render(container) {
    const now = new Date();
    if (viewYear === undefined) { viewYear = now.getFullYear(); viewMonth = now.getMonth(); }
    paint(container);
  }

  function paint(container) {
    const matches = App.DB.getMatches();
    const byDate = {};
    matches.forEach((m) => {
      if (!m.data) return;
      (byDate[m.data] = byDate[m.data] || []).push(m);
    });

    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay(); // 0 = domingo
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayKey = dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

    const cells = [];
    // dias do mês anterior pra preencher a primeira semana
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: daysInPrevMonth - startWeekday + 1 + i, outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, outside: false, key: dateKey(viewYear, viewMonth, d) });
    }
    // completa a última semana com dias do próximo mês
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: nextDay, outside: true });
      nextDay++;
    }

    function eventChip(m) {
      const jogado = App.Stats.isPlayed(m);
      const tipoClass = m.tipo === 'campeonato' ? 'badge--accent' : 'badge--neutral';
      const resultTxt = jogado ? `${m.resultado.golsClube}-${m.resultado.golsAdversario}` : (m.hora || '');
      return `<div class="badge ${jogado ? (App.Stats.resultOf(m) === 'vitoria' ? 'badge--win' : App.Stats.resultOf(m) === 'derrota' ? 'badge--loss' : 'badge--draw') : tipoClass} js-event"
                   data-id="${m.id}" style="cursor:pointer;display:block;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">
                ${resultTxt} ${m.adversario}
              </div>`;
    }

    const gridHtml = cells.map((c) => {
      const dayMatches = c.key ? (byDate[c.key] || []) : [];
      const isToday = c.key === todayKey;
      return `
        <div class="cal-cell ${c.outside ? 'cal-cell--outside' : ''} ${isToday ? 'cal-cell--today' : ''}">
          <span class="cal-cell__day">${c.day}</span>
          <div class="cal-cell__events">${dayMatches.map(eventChip).join('')}</div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Calendário</h1>
          <div class="page-header__subtitle">Visão mensal dos jogos</div>
        </div>
        <div class="u-flex u-gap-2" style="align-items:center">
          <button class="btn btn--secondary btn--icon js-prev" title="Mês anterior">‹</button>
          <div class="badge badge--neutral" style="font-size:var(--fs-sm);padding:8px 16px;font-weight:700">${MESES[viewMonth]} ${viewYear}</div>
          <button class="btn btn--secondary btn--icon js-next" title="Próximo mês">›</button>
          <button class="btn btn--secondary btn--sm js-hoje">Hoje</button>
        </div>
      </div>

      <div class="card" style="padding:var(--space-4)">
        <div class="cal-weekdays">${DIAS_SEMANA.map((d) => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid">${gridHtml}</div>
      </div>
    `;

    container.querySelector('.js-prev').addEventListener('click', () => {
      viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
      paint(container);
    });
    container.querySelector('.js-next').addEventListener('click', () => {
      viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
      paint(container);
    });
    container.querySelector('.js-hoje').addEventListener('click', () => {
      const now = new Date();
      viewYear = now.getFullYear(); viewMonth = now.getMonth();
      paint(container);
    });
    container.querySelectorAll('.js-event').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetail(App.DB.getMatch(chip.dataset.id));
      });
    });
  }

  function formatDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }

  function openDetail(m) {
    const config = App.DB.getConfig();
    const jogado = App.Stats.isPlayed(m);
    const champName = m.tipo === 'campeonato' ? (championshipName(m.campeonatoId) || 'Campeonato') : 'Amistoso';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:460px">
        <div class="modal-header">
          <h2>${config.nomeClube} × ${m.adversario}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="u-flex u-gap-2" style="flex-wrap:wrap;margin-bottom:var(--space-4)">
          <span class="badge ${m.tipo === 'campeonato' ? 'badge--accent' : 'badge--neutral'}">${champName}</span>
          <span class="badge badge--neutral">${m.mandante !== false ? 'Mandante' : 'Visitante'}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:var(--fs-sm);color:var(--text-secondary)">
          <div class="u-flex u-gap-2" style="align-items:center">${I().calendar}<span>${formatDate(m.data)}</span></div>
          <div class="u-flex u-gap-2" style="align-items:center">${I().clock}<span>${m.hora || '--:--'}</span></div>
          <div class="u-flex u-gap-2" style="align-items:center">${I().pin}<span>${m.local || 'Local a definir'}</span></div>
        </div>
        ${jogado ? `
          <div class="card" style="margin-top:var(--space-5);padding:var(--space-4);text-align:center">
            <div style="font-size:var(--fs-2xl);font-weight:700">${m.resultado.golsClube} - ${m.resultado.golsAdversario}</div>
            <div class="u-tertiary" style="font-size:var(--fs-xs);margin-top:4px">Resultado final</div>
          </div>
        ` : `<div class="alert u-mt-5">${I().bell}<span>Resultado ainda não lançado.</span></div>`}
        ${m.observacoes ? `<p class="u-muted u-mt-5" style="font-size:var(--fs-sm)">${m.observacoes}</p>` : ''}
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Fechar</button>
          <button class="btn btn--primary js-editar">Editar em Jogos</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.js-editar').addEventListener('click', () => {
      overlay.remove();
      App.Router.navigate('jogos');
      setTimeout(() => App.Modules.matches.openModal(App.DB.getMatch(m.id), App.DB.getPlayers()), 60);
    });
  }

  return { render };
})();
