/* ==========================================================================
   MÓDULO: CONFRONTOS
   Tela de divulgação: escudo x escudo, data/hora/local/competição, com
   visual pronto pra postar — e um botão que gera essa arte como imagem PNG.
   ========================================================================== */

window.App = window.App || {};
App.Modules = App.Modules || {};

App.Modules.confrontos = (function () {
  const I = () => App.Icons;
  let filtro = 'proximos'; // 'proximos' | 'todos'

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  function championshipName(campeonatoId) {
    if (!campeonatoId) return 'Campeonato';
    const c = App.DB.getChampionships().find((x) => x.id === campeonatoId);
    return c ? c.nome : 'Campeonato';
  }
  function crestHtml(url, fallbackText) {
    if (url) return `<div class="crest" style="width:72px;height:72px;border-radius:18px"><img src="${url}" alt=""></div>`;
    const initials = (fallbackText || '?').slice(0, 2).toUpperCase();
    return `<div class="crest" style="width:72px;height:72px;border-radius:18px;font-size:var(--fs-lg)">${initials}</div>`;
  }

  function render(container) {
    paint(container);
  }

  function paint(container) {
    const config = App.DB.getConfig();
    const todayKey = new Date().toISOString().slice(0, 10);
    let matches = App.DB.getMatches().slice().sort((a, b) => (a.data || '').localeCompare(b.data || ''));
    if (filtro === 'proximos') matches = matches.filter((m) => m.data >= todayKey);

    const cardsHtml = matches.length ? matches.map((m) => `
      <div class="card card--glass hero-match" style="grid-template-columns:1fr;text-align:center;gap:var(--space-4)">
        <div>
          <div class="hero-match__label" style="text-align:center">${m.tipo === 'campeonato' ? championshipName(m.campeonatoId) : 'Amistoso'}</div>
          <div class="hero-match__teams" style="justify-content:center;margin-top:var(--space-4)">
            <div style="text-align:center">
              ${crestHtml(config.escudo, config.nomeClube)}
              <div class="hero-match__team-name">${config.nomeClube}</div>
            </div>
            <div class="hero-match__vs" style="font-size:var(--fs-lg)">×</div>
            <div style="text-align:center">
              ${crestHtml(m.escudoAdversario, m.adversario)}
              <div class="hero-match__team-name">${m.adversario}</div>
            </div>
          </div>
          <div class="hero-match__meta" style="justify-content:center;margin-top:var(--space-4)">
            <span>${I().calendar}${formatDate(m.data)}</span>
            <span>${I().clock}${m.hora || '--:--'}</span>
            <span>${I().pin}${m.local || 'Local a definir'}</span>
          </div>
        </div>
        <button class="btn btn--primary js-gerar-arte" data-id="${m.id}" style="justify-self:center">${I().share} Gerar imagem para postagem</button>
      </div>
    `).join('') : `
      <div class="card empty-state">
        <div class="empty-state__icon">${I().versus}</div>
        <h3>Nenhum confronto para mostrar</h3>
        <p>Cadastre um jogo na aba Jogos para ele aparecer aqui pronto pra divulgação.</p>
      </div>
    `;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Confrontos</h1>
          <div class="page-header__subtitle">Arte pronta para divulgar nas redes e no WhatsApp</div>
        </div>
        <div class="segmented">
          <button data-f="proximos" class="${filtro === 'proximos' ? 'is-active' : ''}">Próximos</button>
          <button data-f="todos" class="${filtro === 'todos' ? 'is-active' : ''}">Todos</button>
        </div>
      </div>
      <div class="stagger" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:var(--space-5)">
        ${cardsHtml}
      </div>
    `;

    container.querySelectorAll('.segmented button').forEach((btn) => {
      btn.addEventListener('click', () => { filtro = btn.dataset.f; paint(container); });
    });
    container.querySelectorAll('.js-gerar-arte').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const match = App.DB.getMatch(btn.dataset.id);
        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = 'Gerando...';
        try {
          await gerarImagemConfronto(match, config);
          App.Toast.show('Imagem gerada! Confira os downloads.', 'success');
        } catch (e) {
          console.error(e);
          App.Toast.show('Não foi possível gerar a imagem', 'danger');
        }
        btn.disabled = false;
        btn.innerHTML = originalText;
      });
    });
  }

  /* ---------- Geração da imagem (canvas) ---------- */

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      if (!src) { resolve(null); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function drawCrest(ctx, img, initials, cx, cy, size) {
    const r = size / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.clip();
    if (img) {
      ctx.drawImage(img, cx - r, cy - r, size, size);
    } else {
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(cx - r, cy - r, size, size);
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(size * 0.36)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, cx, cy + size * 0.02);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  async function gerarImagemConfronto(match, config) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }

    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // fundo — gradiente escuro premium
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0B0D12');
    bg.addColorStop(1, '#151925');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // brilho radial azul decorativo
    const glow = ctx.createRadialGradient(W * 0.2, H * 0.15, 20, W * 0.2, H * 0.15, 620);
    glow.addColorStop(0, 'rgba(59,130,246,0.35)');
    glow.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const champName = match.tipo === 'campeonato' ? championshipName(match.campeonatoId) : 'Amistoso';

    // rótulo da competição
    ctx.textAlign = 'center';
    ctx.fillStyle = '#60A5FA';
    ctx.font = '700 30px Inter, sans-serif';
    ctx.fillText(champName.toUpperCase(), W / 2, 190);

    // escudos
    const crestSize = 300;
    const crestY = 430;
    const [clubeImg, adversarioImg] = await Promise.all([
      loadImage(config.escudo),
      loadImage(match.escudoAdversario),
    ]);
    drawCrest(ctx, clubeImg, (config.nomeClube || '?').slice(0, 2).toUpperCase(), W * 0.28, crestY, crestSize);
    drawCrest(ctx, adversarioImg, (match.adversario || '?').slice(0, 2).toUpperCase(), W * 0.72, crestY, crestSize);

    // "X" central
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '700 46px Inter, sans-serif';
    ctx.fillText('×', W / 2, crestY + 16);

    // nomes dos times
    ctx.fillStyle = '#fff';
    ctx.font = '700 42px Inter, sans-serif';
    wrapCenteredText(ctx, config.nomeClube || 'Meu Clube', W * 0.28, crestY + 210, 380);
    wrapCenteredText(ctx, match.adversario || 'Adversário', W * 0.72, crestY + 210, 380);

    // faixa inferior com data/hora/local
    const footerY = H - 330;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, 60, footerY, W - 120, 260, 28);
    ctx.fill();

    const [y, m, d] = (match.data || '').split('-');
    const dataFmt = match.data ? `${d}/${m}/${y}` : 'Data a definir';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = '700 34px Inter, sans-serif';
    ctx.fillText(dataFmt + (match.hora ? '  ·  ' + match.hora : ''), 100, footerY + 80);

    ctx.fillStyle = '#9AA3B2';
    ctx.font = '500 28px Inter, sans-serif';
    ctx.fillText(match.local || 'Local a definir', 100, footerY + 130);

    ctx.fillStyle = '#60A5FA';
    ctx.font = '600 26px Inter, sans-serif';
    ctx.fillText((config.nomeClube || 'Meu Clube') + ' · Temporada ' + (config.temporadaAtual || ''), 100, footerY + 190);

    // baixa a imagem
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `confronto-${(match.adversario || 'jogo').toLowerCase().replace(/\s+/g, '-')}-${match.data || ''}.png`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      }, 'image/png');
    });
  }

  function wrapCenteredText(ctx, text, cx, y, maxWidth) {
    ctx.textAlign = 'center';
    if (ctx.measureText(text).width <= maxWidth) { ctx.fillText(text, cx, y); return; }
    const words = text.split(' ');
    let line = '';
    const lines = [];
    words.forEach((word) => {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    });
    lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, cx, y + i * 46));
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

  return { render };
})();
