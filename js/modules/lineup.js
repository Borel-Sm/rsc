/* ==========================================================================
   MÓDULO: ESCALAÇÃO
   Cada jogo cadastrado tem sua própria escalação, salva junto do jogo:
   formação, titulares (por posição, com coordenadas) e reservas.
   Nunca salva uma imagem — só os dados — pra poder reabrir e editar depois.
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.lineup = (function () {
  const I = () => App.Icons;
  let matchId = null;

  /* ---------- Formações (números não contam o goleiro, convenção padrão do futebol) ---------- */
  const FORMACOES = ['1-3-3', '2-2-3', '1-2-1-3', '1-1-2-3', 'Personalizada'];

  function slotsFor(formacao) {
    const GOL = { id: 'GOL', label: 'Goleiro', x: 50, y: 92 };
    switch (formacao) {
      case '1-3-3': return [GOL,
        { id: 'DEF1', label: 'Defesa', x: 50, y: 74 },
        { id: 'MEI1', label: 'Meio', x: 18, y: 50 }, { id: 'MEI2', label: 'Meio', x: 50, y: 48 }, { id: 'MEI3', label: 'Meio', x: 82, y: 50 },
        { id: 'ATA1', label: 'Ataque', x: 18, y: 20 }, { id: 'ATA2', label: 'Ataque', x: 50, y: 14 }, { id: 'ATA3', label: 'Ataque', x: 82, y: 20 },
      ];
      case '2-2-3': return [GOL,
        { id: 'DEF1', label: 'Defesa', x: 28, y: 76 }, { id: 'DEF2', label: 'Defesa', x: 72, y: 76 },
        { id: 'MEI1', label: 'Meio', x: 28, y: 50 }, { id: 'MEI2', label: 'Meio', x: 72, y: 50 },
        { id: 'ATA1', label: 'Ataque', x: 18, y: 20 }, { id: 'ATA2', label: 'Ataque', x: 50, y: 14 }, { id: 'ATA3', label: 'Ataque', x: 82, y: 20 },
      ];
      case '1-2-1-3': return [GOL,
        { id: 'DEF1', label: 'Defesa', x: 50, y: 78 },
        { id: 'VOL1', label: 'Volante', x: 28, y: 60 }, { id: 'VOL2', label: 'Volante', x: 72, y: 60 },
        { id: 'ARM1', label: 'Armador', x: 50, y: 40 },
        { id: 'ATA1', label: 'Ataque', x: 18, y: 16 }, { id: 'ATA2', label: 'Ataque', x: 50, y: 12 }, { id: 'ATA3', label: 'Ataque', x: 82, y: 16 },
      ];
      case '1-1-2-3': return [GOL,
        { id: 'DEF1', label: 'Defesa', x: 50, y: 80 },
        { id: 'VOL1', label: 'Volante', x: 50, y: 62 },
        { id: 'MEI1', label: 'Meio', x: 28, y: 42 }, { id: 'MEI2', label: 'Meio', x: 72, y: 42 },
        { id: 'ATA1', label: 'Ataque', x: 18, y: 16 }, { id: 'ATA2', label: 'Ataque', x: 50, y: 12 }, { id: 'ATA3', label: 'Ataque', x: 82, y: 16 },
      ];
      default: // Personalizada — layout base como ponto de partida livre
        return [GOL,
          { id: 'DEF1', label: 'Defesa', x: 30, y: 76 }, { id: 'DEF2', label: 'Defesa', x: 70, y: 76 },
          { id: 'MEI1', label: 'Meio', x: 30, y: 50 }, { id: 'MEI2', label: 'Meio', x: 70, y: 50 },
          { id: 'ATA1', label: 'Ataque', x: 20, y: 20 }, { id: 'ATA2', label: 'Ataque', x: 50, y: 15 }, { id: 'ATA3', label: 'Ataque', x: 80, y: 20 },
        ];
    }
  }

  function defaultEscalacao() {
    return { formacao: '1-3-3', titulares: {}, reservas: [] };
  }

  function render(container) {
    const matches = App.DB.getMatches().slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    if (!matches.length) {
      container.innerHTML = `
        <div class="page-header"><div><h1>Escalação</h1></div></div>
        <div class="card empty-state">
          <div class="empty-state__icon">${I().lineup}</div>
          <h3>Cadastre um jogo primeiro</h3>
          <p>Cada escalação fica vinculada a uma partida. Crie um jogo na aba Jogos e volte aqui.</p>
        </div>`;
      return;
    }
    if (App.Modules.lineup.pendingMatchId) {
      matchId = App.Modules.lineup.pendingMatchId;
      App.Modules.lineup.pendingMatchId = null;
    }
    if (!matchId || !matches.find((m) => m.id === matchId)) matchId = matches[0].id;

    paint(container, matches);
  }

  function formatDate(d) { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; }

  function paint(container, matches) {
    const match = matches.find((m) => m.id === matchId);
    const players = App.DB.getPlayers().filter((p) => p.status !== 'off');
    const config = App.DB.getConfig();
    const esc = match.escalacao ? JSON.parse(JSON.stringify(match.escalacao)) : defaultEscalacao();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Escalação</h1>
          <div class="page-header__subtitle">Cada jogo tem sua própria escalação salva automaticamente</div>
        </div>
        <div class="field" style="min-width:260px">
          <select class="js-match-select">
            ${matches.map((m) => `<option value="${m.id}" ${m.id === matchId ? 'selected' : ''}>${formatDate(m.data)} · vs ${m.adversario}</option>`).join('')}
          </select>
        </div>
      </div>

      ${players.length < 8 ? `<div class="alert u-mt-5">${I().bell}<span>Você tem ${players.length} jogador(es) ativo(s). O ideal são pelo menos 8 (7 de linha + goleiro) para preencher a escalação toda.</span></div>` : ''}

      <div class="two-col u-mt-5" style="grid-template-columns:1fr 340px">
        <div class="card" style="padding:var(--space-5)">
          <div class="u-flex" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-3)">
            <div class="field" style="min-width:200px">
              <label>Formação</label>
              <select class="js-formacao">
                ${FORMACOES.map((f) => `<option value="${f}" ${esc.formacao === f ? 'selected' : ''}>${f}</option>`).join('')}
              </select>
            </div>
            <div class="u-flex u-gap-2">
              <button class="btn btn--secondary btn--sm js-tatico">${I().lineup} Modo tático</button>
              <button class="btn btn--primary btn--sm js-arte">${I().share} Gerar arte</button>
            </div>
          </div>

          <div class="pitch-wrap u-mt-5">
            <div class="pitch js-pitch"></div>
          </div>
          <p class="u-tertiary" style="font-size:var(--fs-xs);margin-top:var(--space-3);text-align:center">
            Clique numa posição para escolher o jogador · arraste pra ajustar a posição tática
          </p>
        </div>

        <div class="card" style="padding:var(--space-5)">
          <div class="section-title">
            <span>Reservas</span>
            <button class="btn btn--ghost btn--icon btn--sm js-add-reserva" title="Adicionar reserva">${I().plus}</button>
          </div>
          <div class="js-reservas-list u-flex u-gap-2" style="flex-wrap:wrap"></div>
        </div>
      </div>
    `;

    renderPitch(container.querySelector('.js-pitch'), esc, players, match, config, false);
    renderReservas(container, esc, players, match);

    container.querySelector('.js-match-select').addEventListener('change', (e) => {
      matchId = e.target.value;
      paint(container, matches);
    });

    container.querySelector('.js-formacao').addEventListener('change', (e) => {
      esc.formacao = e.target.value;
      esc.titulares = {}; // formação nova = escolher os jogadores de novo nas posições
      App.DB.saveMatch({ id: match.id, escalacao: esc });
      App.Toast.show('Formação alterada — escolha os jogadores nas novas posições', 'success');
      paint(container, matches);
    });

    container.querySelector('.js-tatico').addEventListener('click', () => abrirModoTatico(esc, players, match, config));
    container.querySelector('.js-arte').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.innerHTML = 'Gerando...';
      try {
        await gerarArteEscalacao(match, esc, players, config);
        App.Toast.show('Imagem da escalação gerada!', 'success');
      } catch (err) {
        console.error(err);
        App.Toast.show('Não foi possível gerar a imagem', 'danger');
      }
      btn.disabled = false;
      btn.innerHTML = original;
    });

    container.querySelector('.js-add-reserva').addEventListener('click', () => openReservaPicker(esc, players, match, container, matches));
  }

  /* ---------- Renderização do campo (tokens + drag) ---------- */
  const PITCH_SVG = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="97" height="97" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.6"/>
    <line x1="1.5" y1="50" x2="98.5" y2="50" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
    <circle cx="50" cy="50" r="9" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
    <circle cx="50" cy="50" r="0.8" fill="rgba(255,255,255,0.55)"/>
    <rect x="24" y="1.5" width="52" height="11" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
    <rect x="24" y="87.5" width="52" height="11" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
    <rect x="38" y="1.5" width="24" height="4.5" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
    <rect x="38" y="94" width="24" height="4.5" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="0.5"/>
  </svg>`;

  function renderPitch(pitchEl, esc, players, match, config, isTatico) {
    const slots = slotsFor(esc.formacao);
    pitchEl.innerHTML = PITCH_SVG;

    slots.forEach((slot) => {
      const info = esc.titulares[slot.id];
      const jogador = info ? players.find((p) => p.id === info.jogadorId) : null;
      const x = info && typeof info.x === 'number' ? info.x : slot.x;
      const y = info && typeof info.y === 'number' ? info.y : slot.y;

      const token = document.createElement('div');
      token.className = 'pitch-token' + (jogador ? '' : ' pitch-token--empty');
      token.style.left = x + '%';
      token.style.top = y + '%';
      token.dataset.slot = slot.id;
      token.innerHTML = `
        <span class="pitch-token__num">${jogador ? jogador.numero : '+'}</span>
        <span class="pitch-token__name">${jogador ? jogador.nome.split(' ')[0] : slot.label}</span>
      `;
      pitchEl.appendChild(token);
      wireTokenDrag(token, pitchEl, slot.id, esc, match);
      token.addEventListener('click', () => {
        if (token.dataset.dragged === 'true') { token.dataset.dragged = 'false'; return; }
        openSlotPicker(slot, esc, players, match, pitchEl, config, isTatico);
      });
    });
  }

  function wireTokenDrag(token, pitchEl, slotId, esc, match) {
    let dragging = false;
    let startX, startY;

    token.addEventListener('pointerdown', (e) => {
      dragging = true;
      token.dataset.dragged = 'false';
      startX = e.clientX; startY = e.clientY;
      token.setPointerCapture(e.pointerId);
    });
    token.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 3 || Math.abs(e.clientY - startY) > 3) token.dataset.dragged = 'true';
      const rect = pitchEl.getBoundingClientRect();
      let x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      x = Math.max(3, Math.min(97, x));
      y = Math.max(3, Math.min(97, y));
      token.style.left = x + '%';
      token.style.top = y + '%';
    });
    token.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      if (token.dataset.dragged === 'true') {
        const rect = pitchEl.getBoundingClientRect();
        let x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        x = Math.max(3, Math.min(97, x));
        y = Math.max(3, Math.min(97, y));
        const current = esc.titulares[slotId];
        if (current) {
          esc.titulares[slotId] = Object.assign({}, current, { x, y });
          App.DB.saveMatch({ id: match.id, escalacao: esc });
        }
      }
    });
  }

  /* ---------- Escolher jogador para uma posição ---------- */
  function openSlotPicker(slot, esc, players, match, pitchEl, config, isTatico) {
    const assignedIds = new Set(Object.values(esc.titulares).map((t) => t.jogadorId));
    const atual = esc.titulares[slot.id];
    const disponiveis = players.filter((p) => !assignedIds.has(p.id) || (atual && atual.jogadorId === p.id));

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h2>${slot.label}</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="field field--full">
          <label>Jogador</label>
          <select class="js-jogador">
            <option value="">— Vazio —</option>
            ${disponiveis.map((p) => `<option value="${p.id}" ${atual && atual.jogadorId === p.id ? 'selected' : ''}>#${p.numero} ${p.nome}</option>`).join('')}
          </select>
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
      const val = overlay.querySelector('.js-jogador').value;
      if (val) {
        const prev = esc.titulares[slot.id];
        esc.titulares[slot.id] = { jogadorId: val, x: prev ? prev.x : slot.x, y: prev ? prev.y : slot.y };
        esc.reservas = (esc.reservas || []).filter((id) => id !== val);
      } else {
        delete esc.titulares[slot.id];
      }
      App.DB.saveMatch({ id: match.id, escalacao: esc });
      overlay.remove();
      renderPitch(pitchEl, esc, players, match, config, isTatico);
      const listEl = document.querySelector('.js-reservas-list');
      if (listEl) renderReservasInto(listEl, esc, players, match);
    });
  }

  /* ---------- Reservas ---------- */
  function renderReservas(container, esc, players, match) {
    renderReservasInto(container.querySelector('.js-reservas-list'), esc, players, match);
  }
  function renderReservasInto(listEl, esc, players, match) {
    const reservas = (esc.reservas || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
    listEl.innerHTML = reservas.length ? reservas.map((p) => `
      <div class="reserve-chip">
        <span>#${p.numero} ${p.nome}</span>
        <button class="js-remove-reserva" data-id="${p.id}" title="Remover">✕</button>
      </div>
    `).join('') : `<p class="u-tertiary" style="font-size:var(--fs-sm)">Nenhum reserva adicionado ainda.</p>`;

    listEl.querySelectorAll('.js-remove-reserva').forEach((btn) => {
      btn.addEventListener('click', () => {
        esc.reservas = (esc.reservas || []).filter((id) => id !== btn.dataset.id);
        App.DB.saveMatch({ id: match.id, escalacao: esc });
        renderReservasInto(listEl, esc, players, match);
      });
    });
  }

  function openReservaPicker(esc, players, match, container, matches) {
    const assignedIds = new Set(Object.values(esc.titulares).map((t) => t.jogadorId));
    const reservaIds = new Set(esc.reservas || []);
    const disponiveis = players.filter((p) => !assignedIds.has(p.id) && !reservaIds.has(p.id));

    if (!disponiveis.length) {
      App.Toast.show('Não há mais jogadores disponíveis para adicionar', 'danger');
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h2>Adicionar reserva</h2>
          <button class="btn btn--ghost btn--icon js-close">✕</button>
        </div>
        <div class="field field--full">
          <label>Jogador</label>
          <select class="js-jogador">
            ${disponiveis.map((p) => `<option value="${p.id}">#${p.numero} ${p.nome}</option>`).join('')}
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn btn--secondary js-close">Cancelar</button>
          <button class="btn btn--primary js-save">Adicionar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('.js-close').forEach((b) => b.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.js-save').addEventListener('click', () => {
      const val = overlay.querySelector('.js-jogador').value;
      if (val) {
        esc.reservas = esc.reservas || [];
        esc.reservas.push(val);
        App.DB.saveMatch({ id: match.id, escalacao: esc });
      }
      overlay.remove();
      paint(container, matches);
    });
  }

  /* ---------- Modo tático (campo em tela quase cheia) ---------- */
  function abrirModoTatico(esc, players, match, config) {
    const overlay = document.createElement('div');
    overlay.className = 'pitch--tatico';
    overlay.innerHTML = `
      <button class="btn btn--secondary pitch-tatico-exit js-sair">Sair do modo tático ✕</button>
      <div class="pitch js-pitch-tatico" style="max-width:640px"></div>
    `;
    document.body.appendChild(overlay);
    renderPitch(overlay.querySelector('.js-pitch-tatico'), esc, players, match, config, true);
    overlay.querySelector('.js-sair').addEventListener('click', () => overlay.remove());
  }

  /* ---------- Gerar arte da escalação (canvas) ---------- */
  function loadImg(src) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function gerarArteEscalacao(match, esc, players, config) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0B0D12'); bg.addColorStop(1, '#151925');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    const [clubeImg, advImg] = await Promise.all([loadImg(config.escudo), loadImg(match.escudoAdversario)]);

    ctx.textAlign = 'center';
    function crestTop(img, cx, initials) {
      const r = 46;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, 90, r, 0, Math.PI * 2); ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.clip();
      if (img) ctx.drawImage(img, cx - r, 90 - r, r * 2, r * 2);
      else { ctx.fillStyle = '#2563EB'; ctx.fillRect(cx - r, 90 - r, r * 2, r * 2); ctx.fillStyle = '#fff'; ctx.font = '700 34px Inter, sans-serif'; ctx.fillText(initials, cx, 100); }
      ctx.restore();
    }
    crestTop(clubeImg, W * 0.32, (config.nomeClube || '?').slice(0, 2).toUpperCase());
    crestTop(advImg, W * 0.68, (match.adversario || '?').slice(0, 2).toUpperCase());
    ctx.fillStyle = '#fff'; ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(config.nomeClube || 'Meu Clube', W * 0.32, 165);
    ctx.fillText(match.adversario || 'Adversário', W * 0.68, 165);
    ctx.fillStyle = '#60A5FA'; ctx.font = '700 24px Inter, sans-serif';
    ctx.fillText(`Formação ${esc.formacao}`, W / 2, 210);

    const pitchX = 90, pitchY = 250, pitchW = W - 180, pitchH = 760;
    const pitchGrad = ctx.createLinearGradient(0, pitchY, 0, pitchY + pitchH);
    pitchGrad.addColorStop(0, '#2E9E4F'); pitchGrad.addColorStop(1, '#237A3C');
    roundRect(ctx, pitchX, pitchY, pitchW, pitchH, 24);
    ctx.fillStyle = pitchGrad; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(pitchX + 14, pitchY + 14, pitchW - 28, pitchH - 28);
    ctx.beginPath(); ctx.moveTo(pitchX + 14, pitchY + pitchH / 2); ctx.lineTo(pitchX + pitchW - 14, pitchY + pitchH / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(pitchX + pitchW / 2, pitchY + pitchH / 2, 70, 0, Math.PI * 2); ctx.stroke();

    const slots = slotsFor(esc.formacao);
    slots.forEach((slot) => {
      const info = esc.titulares[slot.id];
      const jogador = info ? players.find((p) => p.id === info.jogadorId) : null;
      const x = pitchX + ((info && typeof info.x === 'number' ? info.x : slot.x) / 100) * pitchW;
      const y = pitchY + ((info && typeof info.y === 'number' ? info.y : slot.y) / 100) * pitchH;
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fillStyle = jogador ? '#fff' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = '#2563EB'; ctx.stroke();
      ctx.fillStyle = '#14171F'; ctx.font = '700 22px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(jogador ? jogador.numero : '', x, y + 8);
      ctx.fillStyle = '#fff'; ctx.font = '700 20px Inter, sans-serif';
      ctx.fillText(jogador ? jogador.nome.split(' ')[0] : slot.label, x, y + 52);
    });

    const reservas = (esc.reservas || []).map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const ry = pitchY + pitchH + 60;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#60A5FA'; ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText('RESERVAS', pitchX, ry);
    ctx.fillStyle = '#9AA3B2'; ctx.font = '500 24px Inter, sans-serif';
    const reservasTxt = reservas.length ? reservas.map((p) => `#${p.numero} ${p.nome}`).join('   ·   ') : 'Nenhum reserva definido';
    wrapText(ctx, reservasTxt, pitchX, ry + 40, pitchW, 32);

    const [ay, am, ad] = (match.data || '').split('-');
    const dataFmt = match.data ? `${ad}/${am}/${ay}` : '';
    ctx.fillStyle = '#fff'; ctx.font = '600 24px Inter, sans-serif';
    ctx.fillText(`${dataFmt}${match.hora ? '  ·  ' + match.hora : ''}${match.local ? '  ·  ' + match.local : ''}`, pitchX, H - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `escalacao-${(match.adversario || 'jogo').toLowerCase().replace(/\s+/g, '-')}-${match.data || ''}.png`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    words.forEach((word) => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else line = test;
    });
    ctx.fillText(line, x, y);
  }

  return { render, pendingMatchId: null };
})();
