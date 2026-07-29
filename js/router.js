/* ==========================================================================
   ROUTER — troca de telas via hash, sem reload de página
   ========================================================================== */

window.App = window.App || {};

App.Router = (function () {
  const routes = {}; // { 'dashboard': renderFn }
  let current = null;

  function register(name, renderFn) {
    routes[name] = renderFn;
  }

  function navigate(name) {
    if (!routes[name]) name = 'dashboard';
    window.location.hash = '#/' + name;
  }

  function parseHash() {
    const raw = window.location.hash.replace('#/', '').trim();
    return raw || 'dashboard';
  }

  function renderCurrent() {
    const name = parseHash();
    current = name;
    const container = document.getElementById('app-content');
    if (!container) return;

    // marca link ativo (sidebar + topbar mobile)
    document.querySelectorAll('.nav-link').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.route === name);
    });

    container.innerHTML = '';
    const fn = routes[name] || routes['placeholder'];
    try {
      fn(container, name);
    } catch (e) {
      console.error('Erro ao renderizar rota', name, e);
      container.innerHTML = '<div class="empty-state"><h3>Algo deu errado ao carregar esta tela</h3><p>' + (e.message || '') + '</p></div>';
    }
    container.classList.remove('view-enter');
    void container.offsetWidth; // reinicia animação
    container.classList.add('view-enter');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function init() {
    window.addEventListener('hashchange', renderCurrent);
    renderCurrent();
  }

  return { register, navigate, init, get current() { return current; } };
})();
