/* ==========================================================================
   STORE — pub/sub minimalista para desacoplar módulos
   ========================================================================== */

window.App = window.App || {};

App.Store = (function () {
  const listeners = {};

  function on(event, fn) {
    (listeners[event] = listeners[event] || []).push(fn);
    return () => off(event, fn);
  }
  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter((f) => f !== fn);
  }
  function emit(event, payload) {
    (listeners[event] || []).forEach((fn) => {
      try { fn(payload); } catch (e) { console.error('Store listener error', event, e); }
    });
  }

  return { on, off, emit };
})();

/* ---------------- Toasts ---------------- */
App.Toast = (function () {
  function show(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast--' + type : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 200ms ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 220);
    }, 2800);
  }
  return { show };
})();
