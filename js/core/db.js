/* ==========================================================================
   DB — camada de dados
   HOJE: localStorage. DEPOIS: trocar o corpo destes métodos por chamadas
   ao Firestore/Storage, mantendo exatamente a mesma assinatura (contrato)
   para que módulos e stats-engine não precisem mudar.
   ========================================================================== */

window.App = window.App || {};

App.DB = (function () {
  const PREFIX = 'clube_';
  const KEYS = {
    CONFIG: PREFIX + 'config',
    PLAYERS: PREFIX + 'jogadores',
    MATCHES: PREFIX + 'jogos',
    CHAMPIONSHIPS: PREFIX + 'campeonatos',
    DOCUMENTS: PREFIX + 'documentos',
  };

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('DB read error', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB write error', key, e);
      return false;
    }
  }

  /* ---------------- Config do clube ---------------- */
  const DEFAULT_CONFIG = {
    nomeClube: 'Ressacados',
    escudo: null, // base64
    temporadaAtual: String(new Date().getFullYear()),
    tema: 'light',
    diasAlerta: 3,
  };

  function getConfig() {
    return Object.assign({}, DEFAULT_CONFIG, read(KEYS.CONFIG, {}));
  }
  function saveConfig(partial) {
    const current = getConfig();
    const next = Object.assign({}, current, partial);
    write(KEYS.CONFIG, next);
    App.Store && App.Store.emit('config:changed', next);
    return next;
  }

  /* ---------------- Jogadores ---------------- */
  function getPlayers() {
    return read(KEYS.PLAYERS, []);
  }
  function getPlayer(id) {
    return getPlayers().find((p) => p.id === id) || null;
  }
  function savePlayer(player) {
    const players = getPlayers();
    if (player.id) {
      const idx = players.findIndex((p) => p.id === player.id);
      if (idx >= 0) players[idx] = Object.assign({}, players[idx], player);
      else players.push(player);
    } else {
      player.id = uid();
      player.criadoEm = Date.now();
      players.push(player);
    }
    write(KEYS.PLAYERS, players);
    App.Store && App.Store.emit('players:changed', players);
    return player;
  }
  function deletePlayer(id) {
    const players = getPlayers().filter((p) => p.id !== id);
    write(KEYS.PLAYERS, players);
    App.Store && App.Store.emit('players:changed', players);
  }

  /* ---------------- Jogos ---------------- */
  function getMatches() {
    return read(KEYS.MATCHES, []);
  }
  function getMatch(id) {
    return getMatches().find((m) => m.id === id) || null;
  }
  function saveMatch(match) {
    const matches = getMatches();
    if (match.id) {
      const idx = matches.findIndex((m) => m.id === match.id);
      if (idx >= 0) matches[idx] = Object.assign({}, matches[idx], match);
      else matches.push(match);
    } else {
      match.id = uid();
      match.criadoEm = Date.now();
      matches.push(match);
    }
    write(KEYS.MATCHES, matches);
    App.Store && App.Store.emit('matches:changed', matches);
    return match;
  }
  function deleteMatch(id) {
    const matches = getMatches().filter((m) => m.id !== id);
    write(KEYS.MATCHES, matches);
    App.Store && App.Store.emit('matches:changed', matches);
  }

  /* ---------------- Campeonatos ---------------- */
  function getChampionships() {
    return read(KEYS.CHAMPIONSHIPS, []);
  }
  function saveChampionship(champ) {
    const list = getChampionships();
    if (champ.id) {
      const idx = list.findIndex((c) => c.id === champ.id);
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], champ);
      else list.push(champ);
    } else {
      champ.id = uid();
      list.push(champ);
    }
    write(KEYS.CHAMPIONSHIPS, list);
    App.Store && App.Store.emit('championships:changed', list);
    return champ;
  }
  function deleteChampionship(id) {
    const list = getChampionships().filter((c) => c.id !== id);
    write(KEYS.CHAMPIONSHIPS, list);
    App.Store && App.Store.emit('championships:changed', list);
  }

  /* ---------------- Documentos ---------------- */
  function getDocuments() {
    return read(KEYS.DOCUMENTS, []);
  }
  function saveDocument(doc) {
    const docs = getDocuments();
    if (doc.id) {
      const idx = docs.findIndex((d) => d.id === doc.id);
      if (idx >= 0) docs[idx] = Object.assign({}, docs[idx], doc);
      else docs.push(doc);
    } else {
      doc.id = uid();
      doc.criadoEm = Date.now();
      docs.push(doc);
    }
    const ok = write(KEYS.DOCUMENTS, docs);
    App.Store && App.Store.emit('documents:changed', docs);
    return ok ? doc : null;
  }
  function deleteDocument(id) {
    const docs = getDocuments().filter((d) => d.id !== id);
    write(KEYS.DOCUMENTS, docs);
    App.Store && App.Store.emit('documents:changed', docs);
  }

  /* ---------------- Backup ---------------- */
  function exportBackup() {
    return {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      config: getConfig(),
      jogadores: getPlayers(),
      jogos: getMatches(),
      campeonatos: getChampionships(),
      documentos: getDocuments(),
    };
  }
  function importBackup(data) {
    if (!data || typeof data !== 'object') throw new Error('Backup inválido');
    if (data.config) write(KEYS.CONFIG, data.config);
    if (data.jogadores) write(KEYS.PLAYERS, data.jogadores);
    if (data.jogos) write(KEYS.MATCHES, data.jogos);
    if (data.campeonatos) write(KEYS.CHAMPIONSHIPS, data.campeonatos);
    if (data.documentos) write(KEYS.DOCUMENTS, data.documentos);
    App.Store && App.Store.emit('data:imported', data);
  }

  function clearAll() {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  }

  return {
    KEYS,
    uid,
    getConfig, saveConfig,
    getPlayers, getPlayer, savePlayer, deletePlayer,
    getMatches, getMatch, saveMatch, deleteMatch,
    getChampionships, saveChampionship, deleteChampionship,
    getDocuments, saveDocument, deleteDocument,
    exportBackup, importBackup, clearAll,
  };
})();
