// ==UserScript==
// @name         Легион - Гильдийское расширение
// @namespace    https://legiongame.gg/
// @version      1.9.0
// @description  Гильдийское расширение для чата Легиона: переливание ника, общий список гильдии и безопасное распределение лута.
// @author       faldoorch
// @match        https://legiongame.gg/*
// @match        https://play.multidonate.ru/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      xqwdpnpvfxvzmtmmupev.supabase.co
// @updateURL    https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.9.0/legion-guild.user.js
// @downloadURL  https://raw.githubusercontent.com/faldoor/legion-guild-extension/refs/tags/v1.9.0/legion-guild.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TEST = window.__FDS_TEST__ === true;
  const HOST_OK = /(^|\.)legiongame\.gg$/i.test(location.hostname)
    || /(^|\.)multidonate\.ru$/i.test(location.hostname);
  if (!HOST_OK && !TEST) return;

  const KEY = 'fds_cfg_v1';
  const PLACEHOLDER = 'твой ник';
  const SHARED_URL = 'https://raw.githubusercontent.com/faldoor/legion-guild-extension/main/paints.json';
  const SHARED_KEY = 'fds_shared_v1';
  const SHARED_TTL = 6 * 60 * 60 * 1000;
  const SUPABASE_URL = 'https://xqwdpnpvfxvzmtmmupev.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qK3o1yioybygYWo3R-BQvA_ks7maFKn';
  const SUPABASE_AUTH_KEY = 'fds_supabase_auth_v1';
  const LOOT_OWNER_KEY = 'fds_loot_owner_v1';
  const LOOT_FUNCTION_PATH = '/functions/v1/loot';
  const CLOUD_POLL_MS = 5000;
  const LOOT_RARITIES = ['серая', 'необычная', 'редкая', 'эпическая', 'легендарная', 'мифическая'];

  const PAINTS = [
    { id: 'aurora',  name: 'Аврора',     glow: '124,140,255', colors: ['#6ef3ff', '#7c8cff', '#d16bff', '#ff8ad8'] },
    { id: 'rainbow', name: 'Радуга',     glow: '255,120,200', colors: ['#ff3d5a', '#ffb03a', '#f7f14a', '#4dff88', '#45d0ff', '#8a5cff'] },
    { id: 'holo',    name: 'Голография', glow: '168,255,240', colors: ['#ffd1f7', '#a8fff0', '#b8c6ff', '#ffe9a8'] },
    { id: 'sunset',  name: 'Закат',      glow: '255,110,60',  colors: ['#ff2d6f', '#ff7a18', '#ffd166', '#ff6a3d'] },
    { id: 'gold',    name: 'Золото',     glow: '247,215,116', colors: ['#fff3c4', '#f7d774', '#c9962b', '#ffe9a8'] },
    { id: 'cyber',   name: 'Кибер',      glow: '0,245,255',   colors: ['#00f5ff', '#8a5cff', '#ff00e5', '#00f5ff'] },
    { id: 'candy',   name: 'Карамель',   glow: '255,158,203', colors: ['#ff9ecb', '#ffd1e8', '#a78bfa', '#7dd3fc'] },
    { id: 'ice',     name: 'Лёд',        glow: '125,211,252', colors: ['#eaf9ff', '#9fe3ff', '#38bdf8', '#eaf9ff'] },
    { id: 'mint',    name: 'Мята',       glow: '125,255,207', colors: ['#7dffcf', '#4de1ff', '#7dffcf'] },
    { id: 'ocean',   name: 'Океан',      glow: '43,127,255',  colors: ['#6ef3ff', '#2b7fff', '#6ef3ff'] },
    { id: 'sakura',  name: 'Сакура',     glow: '255,158,203', colors: ['#ffd1e8', '#ff9ecb', '#c78bff', '#ffd1e8'] },
    { id: 'lava',    name: 'Лава',       glow: '255,90,0',    colors: ['#ff3d00', '#ffb300', '#ff6a00', '#ff3d00'] },
    { id: 'matrix',  name: 'Матрица',    glow: '0,255,136',   colors: ['#b6ff2e', '#00ff88', '#0aa06e', '#b6ff2e'] },
    { id: 'toxic',   name: 'Токсин',     glow: '124,255,58',  colors: ['#b6ff2e', '#22ffa0', '#b6ff2e'] },
    { id: 'fire',    name: 'Огонь',      glow: '255,120,40',  colors: ['#ff2d00', '#ff7a00', '#ffd166', '#fff1a8', '#ff6a00'] },
    { id: 'emerald', name: 'Изумруд',    glow: '0,220,140',   colors: ['#b6ffcf', '#00e08a', '#007a52', '#7dffcf'] },
    { id: 'chrome',  name: 'Хром',       glow: '200,215,255', colors: ['#ffffff', '#e6eeff', '#a9bce8', '#ffffff', '#cfdcff'] },
    { id: 'lavender',name: 'Лаванда',    glow: '190,160,255', colors: ['#e6dcff', '#b9a0ff', '#8f7aff', '#ffd1f0'] },
    { id: 'tropical',name: 'Тропики',    glow: '80,240,210',  colors: ['#4dffd2', '#b6ff2e', '#ffd166', '#ff7a9c', '#4dffd2'] },
    { id: 'cosmos',  name: 'Космос',     glow: '140,110,255', colors: ['#b8c6ff', '#6e5cff', '#ff5cc8', '#6ef3ff', '#b8c6ff'] },
  ];

  const DEFAULTS = {
    enabled: true,
    nick: '',
    aliases: '',
    paint: 'aurora',
    speed: 8,
    glow: 7,
    shine: true,
    mentions: true,
    asked: false,
    posR: 16,
    posT: 16,
    shared: true,
  };

  function readJson(raw) {
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function loadCfg() {
    let a = null;
    let b = null;
    try { a = readJson(typeof GM_getValue === 'function' ? GM_getValue(KEY, '') : ''); } catch (e) { a = null; }
    try { b = readJson(localStorage.getItem(KEY) || ''); } catch (e) { b = null; }
    const rich = (a && Object.keys(a).length) || 0;
    const lrich = (b && Object.keys(b).length) || 0;
    const base = rich >= lrich ? a : b;
    return Object.assign({}, DEFAULTS, base || {});
  }

  let cfg = loadCfg();
  if (!cfg.nick) cfg.nick = DEFAULTS.nick;
  if (!PAINTS.some((p) => p.id === cfg.paint)) cfg.paint = DEFAULTS.paint;
  cfg.speed = Math.min(20, Math.max(3, Number(cfg.speed) || DEFAULTS.speed));
  cfg.glow = Math.min(16, Math.max(0, Number(cfg.glow) || 0));

  function saveCfg() {
    const s = JSON.stringify(cfg);
    try { if (typeof GM_setValue === 'function') GM_setValue(KEY, s); } catch (e) { /* ignore */ }
    try { localStorage.setItem(KEY, s); } catch (e) { /* ignore */ }
  }

  /* ---------- shared guild list ---------- */

  let sharedPaints = {};
  let sharedStamp = 0;
  let sharedState = 'idle';
  let cloudPaints = {};
  let cloudRows = {};
  let cloudSession = null;
  let cloudAuthPromise = null;
  let cloudState = 'idle';
  let cloudSocket = null;
  let cloudHeartbeat = 0;
  let cloudPoll = 0;
  let cloudPublishTimer = 0;
  let cloudSyncInterval = 0;

  let lootState = { round: null, rolls: [], serverNow: '', loaded: false, error: '' };
  let lootOwnerToken = '';
  let lootSocket = null;
  let lootHeartbeat = 0;
  let lootPoll = 0;
  let lootTimer = 0;
  let lootAnnouncementId = '';

  function paintById(id) {
    return PAINTS.find((p) => p.id === id) || null;
  }

  function sanitizeShared(data) {
    const src = data && typeof data === 'object' && data.users ? data.users : data;
    const out = {};
    if (!src || typeof src !== 'object' || Array.isArray(src)) return out;
    for (const [nick, value] of Object.entries(src)) {
      const key = cleanNick(nick);
      const id = typeof value === 'string' ? value : value && value.paint;
      if (key && paintById(id)) out[key] = id;
    }
    return out;
  }

  function paintForNick(value) {
    const key = cleanNick(value);
    const local = [cfg.nick, ...String(cfg.aliases || '').split(/[\s,;]+/)]
      .some((nick) => cleanNick(nick) === key);
    if (local) return currentPaint();
    if (!cfg.shared) return null;
    const id = key ? (cloudPaints[key] || sharedPaints[key]) : '';
    return id ? paintById(id) : null;
  }

  function allSharedPaints() {
    return Object.assign({}, sharedPaints, cloudPaints);
  }

  function readSharedCache() {
    let raw = '';
    try { if (typeof GM_getValue === 'function') raw = GM_getValue(SHARED_KEY, ''); } catch (e) { raw = ''; }
    if (!raw) {
      try { raw = localStorage.getItem(SHARED_KEY) || ''; } catch (e) { raw = ''; }
    }
    const cached = readJson(raw);
    if (!cached || !cached.paints) return;
    sharedPaints = sanitizeShared(cached.paints);
    sharedStamp = Number(cached.ts) || 0;
    if (sharedStamp) sharedState = 'ok';
  }

  function writeSharedCache() {
    const raw = JSON.stringify({ ts: sharedStamp, paints: sharedPaints });
    try { if (typeof GM_setValue === 'function') GM_setValue(SHARED_KEY, raw); } catch (e) { /* ignore */ }
    try { localStorage.setItem(SHARED_KEY, raw); } catch (e) { /* ignore */ }
  }

  function applySharedPayload(raw) {
    const data = typeof raw === 'string' ? readJson(raw) : raw;
    if (!data || typeof data !== 'object') {
      sharedState = 'error';
      updateSharedInfo();
      return;
    }
    const src = data.users && typeof data.users === 'object' ? data.users : data;
    sharedPaints = sanitizeShared(data);
    sharedStamp = Date.now();
    sharedState = Object.keys(sharedPaints).length || !Object.keys(src).length ? 'ok' : 'error';
    writeSharedCache();
    refresh();
    updateSharedInfo();
  }

  function loadShared(force) {
    if (!cfg.shared) {
      sharedState = 'off';
      updateSharedInfo();
      return;
    }
    if (!force && sharedStamp && Date.now() - sharedStamp < SHARED_TTL) {
      sharedState = 'ok';
      updateSharedInfo();
      return;
    }
    if (window.__FDS_SHARED_JSON__ != null) {
      applySharedPayload(window.__FDS_SHARED_JSON__);
      return;
    }
    sharedState = 'loading';
    updateSharedInfo();
    const url = SHARED_URL + (SHARED_URL.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    const fail = () => {
      sharedState = 'error';
      updateSharedInfo();
    };
    if (typeof GM_xmlhttpRequest === 'function') {
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          timeout: 15000,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) applySharedPayload(res.responseText);
            else fail();
          },
          onerror: fail,
          ontimeout: fail,
        });
      } catch (e) { fail(); }
    } else if (typeof fetch === 'function') {
      fetch(url, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(applySharedPayload)
        .catch(fail);
    } else {
      fail();
    }
  }

  /* ---------- realtime guild sync ---------- */

  function readCloudCache() {
    let raw = '';
    try { if (typeof GM_getValue === 'function') raw = GM_getValue(SUPABASE_AUTH_KEY, ''); } catch (e) { raw = ''; }
    if (!raw) {
      try { raw = localStorage.getItem(SUPABASE_AUTH_KEY) || ''; } catch (e) { raw = ''; }
    }
    const cached = readJson(raw);
    if (!cached || typeof cached !== 'object') return;
    if (cached.session && cached.session.access_token) cloudSession = cached.session;
    if (cached.rows && typeof cached.rows === 'object') {
      cloudRows = cached.rows;
      rebuildCloudPaints();
    }
  }

  function writeCloudCache() {
    const raw = JSON.stringify({ session: cloudSession, rows: cloudRows });
    try { if (typeof GM_setValue === 'function') GM_setValue(SUPABASE_AUTH_KEY, raw); } catch (e) { /* ignore */ }
    try { localStorage.setItem(SUPABASE_AUTH_KEY, raw); } catch (e) { /* ignore */ }
  }

  function cloudRequest(method, path, body, token) {
    const url = SUPABASE_URL + path;
    const headers = {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    };
    if (token) headers.Authorization = 'Bearer ' + token;
    return new Promise((resolve, reject) => {
      const done = (status, text) => {
        const value = readJson(text);
        if (status >= 200 && status < 300) resolve(value);
        else reject(new Error('Supabase HTTP ' + status));
      };
      if (typeof GM_xmlhttpRequest === 'function') {
        try {
          GM_xmlhttpRequest({
            method,
            url,
            headers,
            data: body == null ? undefined : JSON.stringify(body),
            timeout: 15000,
            onload: (res) => done(res.status, res.responseText),
            onerror: () => reject(new Error('Supabase network error')),
            ontimeout: () => reject(new Error('Supabase timeout')),
          });
        } catch (e) { reject(e); }
        return;
      }
      fetch(url, {
        method,
        headers,
        body: body == null ? undefined : JSON.stringify(body),
        cache: 'no-store',
      }).then(async (res) => done(res.status, await res.text())).catch(reject);
    });
  }

  async function ensureCloudSession() {
    const validSession = cloudSession && cloudSession.access_token && cloudSession.user
      && (!cloudSession.expires_at || cloudSession.expires_at > Date.now() + 60000);
    if (validSession) return cloudSession;
    if (cloudAuthPromise) return cloudAuthPromise;
    const refresh = cloudSession && cloudSession.refresh_token
      ? cloudRequest('POST', '/auth/v1/token?grant_type=refresh_token', {
        refresh_token: cloudSession.refresh_token,
      })
      : cloudRequest('POST', '/auth/v1/signup', {});
    cloudAuthPromise = refresh
      .then((data) => {
        if (!data || !data.access_token || !data.user) throw new Error('Supabase auth failed');
        data.expires_at = Date.now() + (Number(data.expires_in) || 3600) * 1000;
        cloudSession = data;
        writeCloudCache();
        return cloudSession;
      })
      .catch((error) => {
        cloudSession = null;
        writeCloudCache();
        return cloudRequest('POST', '/auth/v1/signup', {})
          .then((data) => {
            if (!data || !data.access_token || !data.user) throw error;
            data.expires_at = Date.now() + (Number(data.expires_in) || 3600) * 1000;
            cloudSession = data;
            writeCloudCache();
            return cloudSession;
          });
      })
      .finally(() => { cloudAuthPromise = null; });
    return cloudAuthPromise;
  }

  function rebuildCloudPaints() {
    const latest = {};
    for (const row of Object.values(cloudRows)) {
      const key = cleanNick(row.nick);
      if (!key || !paintById(row.paint_id)) continue;
      const previous = latest[key];
      if (!previous || String(row.updated_at || '') >= String(previous.updated_at || '')) latest[key] = row;
    }
    cloudPaints = {};
    for (const [nick, row] of Object.entries(latest)) cloudPaints[nick] = row.paint_id;
  }

  function applyCloudRows(rows) {
    if (!Array.isArray(rows)) return;
    cloudRows = {};
    for (const row of rows) {
      if (row && row.user_id && row.nick && paintById(row.paint_id)) cloudRows[row.user_id] = row;
    }
    rebuildCloudPaints();
    writeCloudCache();
    refresh();
    updateSharedInfo();
  }

  function applyCloudChange(event, record, oldRecord) {
    const row = record || oldRecord;
    if (!row || !row.user_id) return;
    if (event === 'DELETE') delete cloudRows[row.user_id];
    else if (row.nick && paintById(row.paint_id)) cloudRows[row.user_id] = row;
    rebuildCloudPaints();
    writeCloudCache();
    refresh();
    updateSharedInfo();
  }

  async function loadCloudPaints() {
    try {
      const session = await ensureCloudSession();
      const rows = await cloudRequest(
        'GET',
        '/rest/v1/guild_paints?select=user_id,nick,paint_id,updated_at',
        null,
        session.access_token
      );
      applyCloudRows(rows);
      cloudState = 'ok';
      updateSharedInfo();
      connectCloudRealtime();
    } catch (e) {
      cloudState = 'error';
      updateSharedInfo();
      scheduleCloudPoll();
    }
  }

  function scheduleCloudPoll() {
    if (cloudPoll) return;
    cloudPoll = window.setTimeout(() => {
      cloudPoll = 0;
      if (cfg.shared && !document.hidden) loadCloudPaints();
    }, CLOUD_POLL_MS);
  }

  function connectCloudRealtime() {
    if (cloudSocket || !cloudSession || typeof WebSocket !== 'function') return;
    const wsUrl = SUPABASE_URL.replace(/^http/, 'ws')
      + '/realtime/v1/websocket?apikey=' + encodeURIComponent(SUPABASE_KEY) + '&vsn=1.0.0';
    try { cloudSocket = new WebSocket(wsUrl); } catch (e) { scheduleCloudPoll(); return; }
    cloudSocket.addEventListener('open', () => {
      cloudState = 'ok';
      cloudSocket.send(JSON.stringify({
        topic: 'realtime:public:guild_paints',
        event: 'phx_join',
        payload: {
          access_token: cloudSession.access_token,
          config: { postgres_changes: [{ event: '*', schema: 'public', table: 'guild_paints' }] },
        },
        ref: '1',
      }));
      updateSharedInfo();
    });
    cloudSocket.addEventListener('message', (event) => {
      const message = readJson(event.data);
      if (!message) return;
      if (message.event === 'postgres_changes') {
        const payload = message.payload || {};
        const change = payload.data || {};
        const data = change.data && typeof change.data === 'object' ? change.data : change;
        applyCloudChange(
          data.eventType || data.type || data.event,
          data.new || data.record,
          data.old || data.old_record
        );
      } else if (message.event === 'phx_error' || message.event === 'phx_close') {
        scheduleCloudPoll();
      }
    });
    cloudSocket.addEventListener('close', () => {
      if (cloudHeartbeat) window.clearInterval(cloudHeartbeat);
      cloudHeartbeat = 0;
      cloudSocket = null;
      scheduleCloudPoll();
    });
    cloudSocket.addEventListener('error', () => { scheduleCloudPoll(); });
    if (!cloudHeartbeat) {
      cloudHeartbeat = window.setInterval(() => {
        if (cloudSocket && cloudSocket.readyState === WebSocket.OPEN) {
          cloudSocket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(Date.now()) }));
        }
      }, 25000);
    }
  }

  async function publishOwnPaint() {
    if (TEST || !cfg.nick || !cfg.shared) return;
    try {
      const session = await ensureCloudSession();
      await cloudRequest(
        'POST',
        '/rest/v1/guild_paints?on_conflict=user_id',
        { user_id: session.user.id, nick: cfg.nick, paint_id: cfg.paint, updated_at: new Date().toISOString() },
        session.access_token
      );
      cloudState = 'ok';
      loadCloudPaints();
    } catch (e) {
      cloudState = 'error';
      updateSharedInfo();
    }
  }

  /* ---------- loot roll sync ---------- */

  function readLootOwnerToken() {
    let raw = '';
    try { if (typeof GM_getValue === 'function') raw = GM_getValue(LOOT_OWNER_KEY, ''); } catch (e) { raw = ''; }
    if (!raw) {
      try { raw = localStorage.getItem(LOOT_OWNER_KEY) || ''; } catch (e) { raw = ''; }
    }
    const cached = readJson(raw);
    if (cached && cached.token && (!cached.expires_at || Date.parse(cached.expires_at) > Date.now() + 60000)) lootOwnerToken = cached.token;
  }

  function writeLootOwnerToken(token, expiresAt) {
    lootOwnerToken = token || '';
    const raw = JSON.stringify({ token: lootOwnerToken, expires_at: expiresAt || '' });
    try { if (typeof GM_setValue === 'function') GM_setValue(LOOT_OWNER_KEY, raw); } catch (e) { /* ignore */ }
    try { localStorage.setItem(LOOT_OWNER_KEY, raw); } catch (e) { /* ignore */ }
    renderLootPanel();
  }

  async function lootRequest(method, path, body, owner) {
    if (owner) return cloudRequest(method, LOOT_FUNCTION_PATH + path, body, lootOwnerToken);
    const session = await ensureCloudSession();
    return cloudRequest(method, LOOT_FUNCTION_PATH + path, body, session.access_token);
  }

  function applyLootState(payload) {
    if (!payload || typeof payload !== 'object') return;
    lootState = {
      round: payload.round || null,
      rolls: Array.isArray(payload.rolls) ? payload.rolls : [],
      serverNow: payload.server_now || new Date().toISOString(),
      loaded: true,
      error: '',
    };
    renderLootPanel();
  }

  async function loadLootState() {
    if (TEST) return;
    try {
      applyLootState(await lootRequest('GET', '/loot/state'));
      connectLootRealtime();
    } catch (e) {
      lootState.error = 'Не удалось загрузить состояние разролла';
      lootState.loaded = true;
      renderLootPanel();
      scheduleLootPoll();
    }
  }

  function scheduleLootPoll() {
    if (lootPoll) return;
    lootPoll = window.setTimeout(() => {
      lootPoll = 0;
      if (!document.hidden) loadLootState();
    }, CLOUD_POLL_MS);
  }

  function connectLootRealtime() {
    if (lootSocket || !cloudSession || typeof WebSocket !== 'function') return;
    const wsUrl = SUPABASE_URL.replace(/^http/, 'ws')
      + '/realtime/v1/websocket?apikey=' + encodeURIComponent(SUPABASE_KEY) + '&vsn=1.0.0';
    try { lootSocket = new WebSocket(wsUrl); } catch (e) { scheduleLootPoll(); return; }
    lootSocket.addEventListener('open', () => {
      const join = (table, ref) => lootSocket.send(JSON.stringify({
        topic: 'realtime:public:' + table,
        event: 'phx_join',
        payload: {
          access_token: cloudSession.access_token,
          config: { postgres_changes: [{ event: '*', schema: 'public', table }] },
        },
        ref,
      }));
      join('loot_rounds', 'loot-rounds');
      join('loot_rolls', 'loot-rolls');
    });
    lootSocket.addEventListener('message', (event) => {
      const message = readJson(event.data);
      if (message && message.event === 'postgres_changes') loadLootState();
      else if (message && (message.event === 'phx_error' || message.event === 'phx_close')) scheduleLootPoll();
    });
    lootSocket.addEventListener('close', () => {
      lootSocket = null;
      if (lootHeartbeat) window.clearInterval(lootHeartbeat);
      lootHeartbeat = 0;
      scheduleLootPoll();
    });
    lootSocket.addEventListener('error', scheduleLootPoll);
    if (!lootHeartbeat) {
      lootHeartbeat = window.setInterval(() => {
        if (lootSocket && lootSocket.readyState === WebSocket.OPEN) {
          lootSocket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(Date.now()) }));
        }
      }, 25000);
    }
  }

  async function processLootOAuthCallback() {
    const query = new URLSearchParams(location.search);
    const code = query.get('owner_code');
    const oauthError = query.get('loot_error');
    if (!code && !oauthError) return;
    history.replaceState(null, '', location.pathname + location.hash);
    if (oauthError) {
      lootState.error = 'Вход владельца не выполнен: ' + oauthError;
      return;
    }
    try {
      const data = await cloudRequest('POST', LOOT_FUNCTION_PATH + '/owner/exchange', { code });
      writeLootOwnerToken(data.owner_token, data.expires_at);
      await loadLootState();
    } catch (e) {
      lootState.error = 'Не удалось завершить вход владельца';
    }
  }

  async function startLootOwnerLogin() {
    try {
      const data = await cloudRequest('GET', LOOT_FUNCTION_PATH + '/twitch/start');
      if (!data || !data.authorize_url) throw new Error('OAuth URL missing');
      location.href = data.authorize_url;
    } catch (e) {
      lootState.error = 'Не удалось начать вход Twitch';
      renderLootPanel();
    }
  }

  async function createLootRound() {
    if (!lootOwnerToken || !shadow) return;
    const itemName = shadow.getElementById('fdsLootItem').value.trim();
    const rarity = shadow.getElementById('fdsLootRarity').value;
    const duration = Number(shadow.getElementById('fdsLootDuration').value);
    try {
      applyLootState(await lootRequest('POST', '/loot/round', {
        item_name: itemName,
        rarity,
        duration_seconds: duration,
      }, true));
      shadow.getElementById('fdsLootItem').value = '';
    } catch (e) {
      lootState.error = 'Не удалось создать разролл. Проверьте поля.';
      renderLootPanel();
    }
  }

  async function finishLootRound() {
    if (!lootOwnerToken) return;
    try { await lootRequest('POST', '/loot/round/finish', {}, true); await loadLootState(); }
    catch (e) { lootState.error = 'Не удалось завершить разролл'; renderLootPanel(); }
  }

  async function clearLootRolls() {
    if (!lootOwnerToken) return;
    try { await lootRequest('POST', '/loot/clear', {}, true); await loadLootState(); }
    catch (e) { lootState.error = 'Не удалось очистить журнал'; renderLootPanel(); }
  }

  async function rollLoot() {
    const round = lootState.round;
    if (!round || !isLootRoundActive(round)) return;
    const button = shadow && shadow.getElementById('fdsLootRoll');
    if (button) button.disabled = true;
    try {
      const data = await lootRequest('POST', '/loot/roll', { round_id: round.id, nick: cfg.nick || PLACEHOLDER });
      if (data && data.roll) lootState.rolls = [data.roll, ...lootState.rolls.filter((row) => row.id !== data.roll.id)];
      lootState.error = '';
      renderLootPanel();
    } catch (e) {
      lootState.error = 'Ролл не принят: возможно, ты уже бросал или время истекло.';
      renderLootPanel();
      loadLootState();
    }
  }

  function lootServerOffset() {
    const serverTime = Date.parse(lootState.serverNow || '');
    return Number.isFinite(serverTime) ? serverTime - Date.now() : 0;
  }

  function isLootRoundActive(round) {
    return !!round && round.status === 'active' && Date.parse(round.ends_at) > Date.now() + lootServerOffset();
  }

  function lootTimeLeft(round) {
    const seconds = Math.max(0, Math.ceil((Date.parse(round.ends_at) - Date.now() - lootServerOffset()) / 1000));
    const minutes = Math.floor(seconds / 60);
    return minutes + ':' + String(seconds % 60).padStart(2, '0');
  }

  function scheduleCloudPublish() {
    if (cloudPublishTimer) window.clearTimeout(cloudPublishTimer);
    cloudPublishTimer = window.setTimeout(() => {
      cloudPublishTimer = 0;
      publishOwnPaint();
    }, 250);
  }

  /* ---------- text helpers ---------- */

  const JUNK = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g;

  function cleanNick(value) {
    return String(value || '')
      .replace(JUNK, '')
      .replace(/^@+/, '')
      .replace(/\s+/g, '')
      .replace(/[.,;:!?]+$/, '')
      .toLowerCase();
  }

  function nickSet() {
    const list = [cfg.nick, ...String(cfg.aliases || '').split(/[\s,;]+/)];
    const set = new Set();
    for (const n of list) {
      const c = cleanNick(n);
      if (c) set.add(c);
    }
    if (cfg.shared) {
      for (const key of Object.keys(allSharedPaints())) set.add(key);
    }
    return set;
  }

  function phaseDelay() {
    const dur = Math.max(3, Number(cfg.speed) || 8);
    return (-((performance.now() / 1000) % dur)).toFixed(3) + 's';
  }

  function matchesText(value, set) {
    const c = cleanNick(value);
    return !!c && set.has(c);
  }

  function elementText(el) {
    const attr = el.getAttribute && el.getAttribute('data-nick');
    if (attr) return attr;
    if (el.childElementCount > 0) return '';
    const t = el.textContent || '';
    return t.length <= 80 ? t : '';
  }

  const OWN_NICK_SELECTORS = [
    'li.me b[data-nick]',
    'li.me [data-nick]',
    '.me b[data-nick]',
    '#user b[data-nick]',
    '#user [data-nick]',
  ];

  function detectOwnNick() {
    for (const sel of OWN_NICK_SELECTORS) {
      let el = null;
      try { el = document.querySelector(sel); } catch (e) { el = null; }
      if (!el) continue;
      const raw = String(el.getAttribute('data-nick') || el.textContent || '')
        .replace(JUNK, '')
        .trim();
      if (cleanNick(raw)) return raw;
    }
    return '';
  }

  /* ---------- mentions ---------- */

  function escapeRe(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function mentionRe() {
    const list = [...nickSet()].sort((a, b) => b.length - a.length).map(escapeRe);
    if (!list.length) return null;
    return new RegExp('(^|[^\\p{L}\\p{N}_@])@(' + list.join('|') + ')(?![\\p{L}\\p{N}_])', 'giu');
  }

  function unwrapMentions() {
    document.querySelectorAll('[data-fds-mention]').forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize();
    });
  }

  function wrapMentions() {
    if (!cfg.mentions || !cfg.enabled) return;
    const re = mentionRe();
    if (!re) return;

    document.querySelectorAll('ol.cy-chat-l > li > span').forEach((body) => {
      if (body.closest('.fds-name')) return;
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n.parentElement && n.parentElement.closest('.fds-name')) continue;
        nodes.push(n);
      }

      for (const node of nodes) {
        const text = node.nodeValue || '';
        if (text.indexOf('@') < 0) continue;
        const matches = [...text.matchAll(re)];
        if (!matches.length) continue;

        const frag = document.createDocumentFragment();
        let last = 0;
        for (const m of matches) {
          const start = m.index + m[1].length;
          if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
          const mark = document.createElement('span');
          mark.className = 'fds-name';
          mark.setAttribute('data-fds-mention', '1');
          mark.style.setProperty('--fds-delay', phaseDelay());
          mark.textContent = text.slice(start, start + 1 + m[2].length);
          decorate(mark, paintForNick(m[2]));
          frag.appendChild(mark);
          last = start + 1 + m[2].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      }
    });
  }

  /* ---------- stylesheet ---------- */

  function gradientOf(paint) {
    const colors = paint.colors.slice();
    if (colors[colors.length - 1] !== colors[0]) colors.push(colors[0]);
    return 'linear-gradient(90deg, ' + colors.join(', ') + ')';
  }

  function currentPaint() {
    return PAINTS.find((p) => p.id === cfg.paint) || PAINTS[0];
  }

  const PAGE_CSS = `
    .fds-name {
      background-color: transparent !important;
      background-image: var(--fds-shine, linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.62) 50%, rgba(255,255,255,0) 60%)), var(--fds-grad) !important;
      background-size: 70% 100%, 200% 100% !important;
      background-repeat: repeat-x, repeat-x !important;
      background-position: -183.333% 50%, 0% 50%;
      -webkit-background-clip: text !important;
      background-clip: text !important;
      -webkit-text-fill-color: transparent !important;
      color: transparent !important;
      text-shadow: 0 0 var(--fds-glow, 7px) rgba(var(--fds-glowcol, 124,140,255), .55) !important;
      animation: fds-flow var(--fds-speed, 8s) linear infinite;
      animation-delay: var(--fds-delay, 0s);
    }
    html[data-fds-shine="0"] .fds-name {
      background-image: var(--fds-grad) !important;
      background-size: 200% 100% !important;
      background-position: 0% 50%;
      animation-name: fds-flow-plain;
    }
    html[data-fds-off] .fds-name {
      background: none !important;
      -webkit-text-fill-color: currentColor !important;
      color: inherit !important;
      text-shadow: none !important;
      animation: none !important;
      filter: none !important;
    }
    @keyframes fds-flow {
      0%   { background-position: -183.333% 50%, 0% 50%; }
      100% { background-position: 283.333% 50%, 200% 50%; }
    }
    @keyframes fds-flow-plain {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fds-name { animation: none !important; }
    }
  `;

  const pageStyle = document.createElement('style');
  pageStyle.id = 'fds-page-style';
  pageStyle.textContent = PAGE_CSS;
  (document.head || document.documentElement).appendChild(pageStyle);

  function applyVars() {
    const paint = currentPaint();
    const root = document.documentElement;
    root.style.setProperty('--fds-grad', gradientOf(paint));
    root.style.setProperty('--fds-shine',
      'linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.62) 50%, rgba(255,255,255,0) 60%)');
    root.style.setProperty('--fds-glowcol', paint.glow);
    root.style.setProperty('--fds-speed', cfg.speed + 's');
    root.style.setProperty('--fds-glow', cfg.glow + 'px');
    root.toggleAttribute('data-fds-off', !cfg.enabled);
    root.setAttribute('data-fds-shine', cfg.shine ? '1' : '0');
  }

  /* ---------- marking ---------- */

  function clearMarks() {
    document.querySelectorAll('.fds-name').forEach((el) => {
      el.classList.remove('fds-name');
      decorate(el, null);
    });
  }

  function decorate(el, paint) {
    if (!paint) {
      el.style.removeProperty('--fds-grad');
      el.style.removeProperty('--fds-glowcol');
      return;
    }
    const grad = gradientOf(paint);
    if (el.style.getPropertyValue('--fds-grad') !== grad) el.style.setProperty('--fds-grad', grad);
    if (el.style.getPropertyValue('--fds-glowcol') !== paint.glow) el.style.setProperty('--fds-glowcol', paint.glow);
  }

  function scan() {
    if (!cfg.enabled) return;
    const set = nickSet();

    document.querySelectorAll('.fds-name').forEach((el) => {
      if (!matchesText(elementText(el), set) || !paintForNick(elementText(el))) {
        el.classList.remove('fds-name');
        decorate(el, null);
      }
    });

    const mark = (el) => {
      const paint = paintForNick(elementText(el));
      if (!paint) return;
      decorate(el, paint);
      if (el.classList.contains('fds-name')) return;
      el.style.setProperty('--fds-delay', phaseDelay());
      el.classList.add('fds-name');
    };

    const base = 'b[data-nick], [data-nick]';
    document.querySelectorAll(base).forEach((el) => {
      if (matchesText(elementText(el), set)) mark(el);
    });

    if (cfg.mentions) {
      document.querySelectorAll('ol.cy-chat-l a, .cy-chat a').forEach((el) => {
        if (el.querySelector('[data-nick]')) return;
        if (matchesText(elementText(el), set)) mark(el);
      });
    }

    wrapMentions();
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  function refresh() {
    applyVars();
    unwrapMentions();
    clearMarks();
    scan();
  }

  /* ---------- panel ---------- */

  const PANEL_CSS = `
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }
    .panel {
      position: fixed; right: 16px; top: 16px; width: 372px;
      max-height: calc(100vh - 28px); overflow: auto;
      pointer-events: auto; padding: 16px;
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: #e9e3ff;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(27, 22, 42, .985), rgba(16, 13, 26, .99));
      border: 1px solid rgba(160, 130, 255, .22);
      box-shadow: 0 28px 80px rgba(0, 0, 0, .62), inset 0 1px 0 rgba(255, 255, 255, .06);
      backdrop-filter: blur(14px);
      z-index: 2147483000;
    }
    .panel.dragging { box-shadow: 0 34px 90px rgba(0, 0, 0, .7), 0 0 0 1px rgba(180, 139, 255, .4); }
    .panel::-webkit-scrollbar { width: 8px; }
    .panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 8px; }
    .head {
      display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px;
      cursor: grab; user-select: none; touch-action: none;
    }
    .panel.dragging .head { cursor: grabbing; }
    .logo {
      width: 30px; height: 30px; flex: none; border-radius: 9px; display: grid; place-items: center;
      background: linear-gradient(135deg, #7c5cff, #ff5cc8);
      box-shadow: 0 6px 18px rgba(124, 92, 255, .4);
      font-size: 15px;
    }
    .titles { flex: 1; min-width: 0; }
    .title { font-size: 15px; font-weight: 750; letter-spacing: .2px; }
    .sub { font-size: 11.5px; color: #9a92b8; margin-top: 2px; }
    .x {
      flex: none; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(255,255,255,.09);
      background: rgba(255,255,255,.03); color: #b9b0d6; font-size: 15px; line-height: 1; cursor: pointer;
    }
    .x:hover { background: rgba(255,255,255,.09); color: #fff; }

    .preview {
      display: grid; place-items: center; min-height: 96px; margin-bottom: 14px; padding: 14px;
      border-radius: 13px; background:
        radial-gradient(120% 140% at 50% 0%, rgba(124, 92, 255, .16), transparent 60%),
        #0d0a17;
      border: 1px solid rgba(255,255,255,.06);
    }
    .pv { font-size: 27px; font-weight: 800; letter-spacing: .2px; }

    .sec { margin-top: 14px; }
    .sec-h { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 7px; }
    .sec-t { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #8d84ad; }
    .val { font-size: 11.5px; color: #b9b0d6; font-variant-numeric: tabular-nums; }

    .paints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
    .paint {
      padding: 0; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; overflow: hidden;
      background: #15111f; cursor: pointer; text-align: center; color: #b9b0d6;
    }
    .paint .chip { height: 30px; display: grid; place-items: center; overflow: hidden; }
    .paint .chip b {
      max-width: 100%; padding: 0 4px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      font-size: 11px; font-weight: 800; letter-spacing: .2px;
      background-image: var(--pp); background-size: 200% 100%; background-repeat: repeat-x;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .paint.on .chip b { animation: fds-flow-plain 6s linear infinite; }
    .paint .nm { display: block; font-size: 10px; padding: 3px 2px 4px; }
    .paint:hover { border-color: rgba(180, 139, 255, .5); }
    .paint.on { border-color: #b48bff; box-shadow: 0 0 0 1px rgba(180, 139, 255, .55), 0 6px 18px rgba(124, 92, 255, .22); color: #fff; }

    .setup {
      display: grid; gap: 4px; margin-bottom: 12px; padding: 10px 12px; border-radius: 11px;
      background: linear-gradient(135deg, rgba(124, 92, 255, .18), rgba(255, 92, 200, .12));
      border: 1px solid rgba(180, 139, 255, .32); font-size: 11.5px; line-height: 1.45;
    }
    .setup b { font-size: 12px; color: #fff; }
    .setup span { color: #c9c0e4; }

    .row { display: flex; align-items: center; gap: 10px; }
    input[type="range"] {
      -webkit-appearance: none; appearance: none; width: 100%; height: 22px; background: transparent; cursor: pointer;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 5px; border-radius: 99px; background: linear-gradient(90deg, #7c5cff, #ff5cc8);
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 15px; height: 15px; margin-top: -5px; border-radius: 50%;
      background: #fff; border: 2px solid #1a1528; box-shadow: 0 2px 8px rgba(0,0,0,.5);
    }
    input[type="range"]::-moz-range-track {
      height: 5px; border-radius: 99px; background: linear-gradient(90deg, #7c5cff, #ff5cc8);
    }
    input[type="range"]::-moz-range-thumb {
      width: 13px; height: 13px; border-radius: 50%; background: #fff;
      border: 2px solid #1a1528; box-shadow: 0 2px 8px rgba(0,0,0,.5);
    }

    .sw { display: flex; align-items: center; gap: 11px; padding: 7px 0; cursor: pointer; user-select: none; }
    .sw + .sw { border-top: 1px solid rgba(255,255,255,.045); }
    .sw input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .track {
      position: relative; flex: none; width: 38px; height: 22px; border-radius: 99px;
      background: #2a2440; border: 1px solid rgba(255,255,255,.08); transition: background .18s;
    }
    .track::after {
      content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%;
      background: #cfc7e8; transition: transform .18s, background .18s;
    }
    .sw input:checked + .track { background: linear-gradient(90deg, #7c5cff, #c86bff); }
    .sw input:checked + .track::after { transform: translateX(16px); background: #fff; }
    .sw input:focus-visible + .track { outline: 2px solid #b48bff; outline-offset: 2px; }
    .sw .lbl { font-size: 12.5px; color: #ddd6f2; }

    .fields { display: grid; gap: 8px; }
    .field { display: grid; gap: 4px; }
    .field span { font-size: 11px; color: #8d84ad; }
    .field input {
      width: 100%; padding: 8px 10px; border-radius: 9px; font: inherit; font-size: 12.5px;
      background: #0e0b18; color: #ece7ff; border: 1px solid rgba(255,255,255,.09); outline: none;
    }
    .field input:focus { border-color: #b48bff; box-shadow: 0 0 0 3px rgba(180, 139, 255, .14); }
    .withbtn { display: flex; gap: 6px; }
    .withbtn input { flex: 1; min-width: 0; }
    .mini {
      flex: none; padding: 0 10px; border-radius: 9px; border: 1px solid rgba(180, 139, 255, .4);
      background: rgba(124, 92, 255, .16); color: #d9ccff; font: inherit; font-size: 11.5px;
      font-weight: 650; cursor: pointer; white-space: nowrap;
    }
    .mini:hover { background: rgba(124, 92, 255, .28); }
    .hint2 { font-size: 10.5px; line-height: 1.45; color: #7d7599; }
    .hint2.ok { color: #8ff0c8; }
    .hint2.warn { color: #ffb4c8; }
    .sharedrow { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .sharedrow .hint2 { flex: 1; }

    .foot { display: flex; gap: 8px; margin-top: 16px; }
    .btn {
      flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04); color: #d9d2ef; font: inherit; font-weight: 600; cursor: pointer;
    }
    .btn:hover { background: rgba(255,255,255,.09); }
    .btn.primary {
      border-color: transparent; color: #170f26;
      background: linear-gradient(135deg, #c9b3ff, #ff9ede);
      box-shadow: 0 8px 22px rgba(200, 130, 255, .28);
    }
    .btn.primary:hover { filter: brightness(1.06); }
    .hint { margin-top: 10px; font-size: 10.5px; line-height: 1.5; color: #7d7599; text-align: center; }

    .loot-launch { width: 100%; margin-top: 12px; }
    .loot-window { margin-top: 4px; }
    .loot-card {
      padding: 13px; border-radius: 13px; background:
        radial-gradient(120% 140% at 50% 0%, rgba(255, 190, 92, .16), transparent 60%), #0d0a17;
      border: 1px solid rgba(255,255,255,.08);
    }
    .loot-kicker { color: #a99ec8; font-size: 10px; letter-spacing: .8px; text-transform: uppercase; }
    .loot-item { margin-top: 4px; color: #fff; font-size: 19px; font-weight: 800; overflow-wrap: anywhere; }
    .loot-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; }
    .loot-rarity { display: inline-flex; align-items: center; gap: 5px; color: #ffd166; font-weight: 700; }
    .loot-rarity::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; }
    .loot-timer { color: #fff; font: 800 17px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .loot-timer.done { color: #ff9eb8; }
    .loot-announcement { margin-top: 10px; padding: 9px 10px; border-radius: 9px; color: #f1eaff; background: rgba(124,92,255,.13); border: 1px solid rgba(180,139,255,.2); font-size: 11.5px; line-height: 1.45; }
    .loot-roll { width: 100%; margin-top: 12px; padding: 13px 14px; border: 0; border-radius: 11px; color: #1b1028; background: linear-gradient(135deg, #ffd166, #ff9ede); box-shadow: 0 9px 24px rgba(255, 172, 100, .23); font: inherit; font-size: 16px; font-weight: 850; cursor: pointer; }
    .loot-roll:hover { filter: brightness(1.06); }
    .loot-roll:disabled { opacity: .52; cursor: not-allowed; filter: none; }
    .loot-empty { padding: 20px 8px; color: #aaa0c4; text-align: center; line-height: 1.55; }
    .loot-journal { display: grid; gap: 5px; margin-top: 13px; max-height: 180px; overflow: auto; }
    .loot-roll-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; background: rgba(255,255,255,.045); }
    .loot-roll-row .loot-nick { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #ddd6f2; }
    .loot-roll-row .loot-value { color: #ffd166; font: 800 14px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }
    .loot-owner { display: grid; gap: 8px; margin-top: 13px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,.07); }
    .loot-owner-title { color: #cfc3ef; font-size: 11px; font-weight: 750; letter-spacing: .4px; }
    .loot-owner-actions { display: flex; gap: 6px; }
    .loot-owner-actions .mini { flex: 1; min-height: 30px; }
    .loot-owner-login { width: 100%; }
    .loot-error { margin-top: 8px; color: #ffb4c8; font-size: 11px; line-height: 1.4; }
    .loot-back { margin-top: 12px; }
    .rarity-grey { color: #b8b8c4; } .rarity-unusual { color: #6ee7a1; } .rarity-rare { color: #69a7ff; }
    .rarity-epic { color: #c78bff; } .rarity-legendary { color: #ffad5c; } .rarity-mythic { color: #ff6b9d; }

    .bubble {
      position: fixed; right: 16px; top: 16px; z-index: 2147483000;
      width: 56px; height: 56px; padding: 0; border: 0; border-radius: 50%;
      background: transparent; pointer-events: auto; cursor: grab;
      touch-action: none; user-select: none; -webkit-tap-highlight-color: transparent;
    }
    .bubble .halo {
      position: absolute; inset: -7px; border-radius: 50%; z-index: 0;
      background: conic-gradient(from 0deg, #6ef3ff, #7c5cff, #ff5cc8, #ffd166, #6ef3ff);
      filter: blur(9px); opacity: .55; animation: fds-spin 9s linear infinite;
    }
    .bubble .ball {
      position: relative; z-index: 1; width: 100%; height: 100%; border-radius: 50%;
      display: grid; place-items: center;
      background: radial-gradient(120% 120% at 30% 20%, #c9b3ff, #7c5cff 48%, #c44dff 78%, #ff5cc8);
      border: 1px solid rgba(255,255,255,.36);
      box-shadow: 0 14px 34px rgba(110, 70, 255, .5), inset 0 1px 0 rgba(255,255,255,.35);
      transition: transform .16s, box-shadow .16s;
    }
    .bubble .bicon {
      color: #fff; font-size: 23px; line-height: 1; text-shadow: 0 1px 4px rgba(20, 8, 40, .55);
    }
    .bubble:hover .ball {
      transform: scale(1.06);
      box-shadow: 0 18px 44px rgba(140, 90, 255, .66), inset 0 1px 0 rgba(255,255,255,.45);
    }
    .bubble:active .ball, .bubble.dragging .ball { transform: scale(.98); }
    .bubble.dragging { cursor: grabbing; }
    .bubble.off .ball { filter: grayscale(.72) brightness(.82); }
    .bubble:focus-visible { outline: 2px solid #d9ccff; outline-offset: 4px; }
    @keyframes fds-spin { to { transform: rotate(360deg); } }

    @keyframes fds-flow {
      0%   { background-position: -183.333% 50%, 0% 50%; }
      100% { background-position: 283.333% 50%, 200% 50%; }
    }
    @keyframes fds-flow-plain {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .pv {
      background-image: var(--fds-shine, linear-gradient(90deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.62) 50%, rgba(255,255,255,0) 60%)), var(--fds-grad);
      background-size: 70% 100%, 200% 100%;
      background-repeat: repeat-x, repeat-x;
      background-position: -183.333% 50%, 0% 50%;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
      animation: fds-flow var(--fds-speed, 8s) linear infinite;
      animation-delay: var(--fds-delay, 0s);
      text-shadow: 0 0 var(--fds-glow, 7px) rgba(var(--fds-glowcol, 124,140,255), .55);
    }
    .pv.no-shine {
      background-image: var(--fds-grad); background-size: 200% 100%; background-position: 0% 50%;
      animation-name: fds-flow-plain;
    }
    .pv.off {
      background: none; -webkit-text-fill-color: currentColor; color: #9a92b8;
      animation: none; filter: none; text-shadow: none;
    }
    @media (prefers-reduced-motion: reduce) { .pv { animation: none; } }
    @media (max-width: 460px) { .panel { width: calc(100vw - 20px); } }
  `;

  let host = null;
  let shadow = null;
  let lootOpen = false;

  const BUBBLE_SIZE = 56;

  function clampNum(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function placePanel() {
    if (!shadow) return;
    const panel = shadow.querySelector('.panel');
    if (!panel || panel.hidden) return;
    const w = panel.offsetWidth || 372;
    cfg.posR = clampNum(Number(cfg.posR) || 16, 6, Math.max(6, innerWidth - w - 6));
    cfg.posT = clampNum(Number(cfg.posT) || 16, 6, Math.max(6, innerHeight - 150));
    panel.style.right = cfg.posR + 'px';
    panel.style.top = cfg.posT + 'px';
    panel.style.maxHeight = Math.max(140, innerHeight - cfg.posT - 8) + 'px';
  }

  function placeBubble() {
    if (!shadow) return;
    const bubble = shadow.querySelector('.bubble');
    if (!bubble || bubble.hidden) return;
    cfg.posR = clampNum(Number(cfg.posR) || 16, 6, Math.max(6, innerWidth - BUBBLE_SIZE - 6));
    cfg.posT = clampNum(Number(cfg.posT) || 16, 6, Math.max(6, innerHeight - BUBBLE_SIZE - 6));
    bubble.style.right = cfg.posR + 'px';
    bubble.style.top = cfg.posT + 'px';
  }

  function syncBubble() {
    if (!shadow) return;
    const bubble = shadow.querySelector('.bubble');
    if (bubble) bubble.classList.toggle('off', !cfg.enabled);
  }

  function makeDraggable(el, handle, ignore, onDone) {
    let drag = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.isPrimary === false) return;
      if (ignore && e.target.closest && e.target.closest(ignore)) return;
      const r = el.getBoundingClientRect();
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        right: innerWidth - r.right,
        top: r.top,
        moved: false,
      };
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      drag.moved = true;
      el.classList.add('dragging');
      const w = el.offsetWidth || BUBBLE_SIZE;
      cfg.posR = clampNum(drag.right - dx, 6, Math.max(6, innerWidth - w - 6));
      if (el.classList.contains('panel')) {
        cfg.posT = clampNum(drag.top + dy, 6, Math.max(6, innerHeight - 150));
        el.style.maxHeight = Math.max(140, innerHeight - cfg.posT - 8) + 'px';
      } else {
        const h = el.offsetHeight || BUBBLE_SIZE;
        cfg.posT = clampNum(drag.top + dy, 6, Math.max(6, innerHeight - h - 6));
      }
      el.style.right = cfg.posR + 'px';
      el.style.top = cfg.posT + 'px';
      e.preventDefault();
    });

    const end = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      const moved = drag.moved;
      drag = null;
      el.classList.remove('dragging');
      if (moved) {
        saveCfg();
        if (onDone) onDone();
      }
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function lootRarityClass(rarity) {
    return {
      серая: 'rarity-grey', необычная: 'rarity-unusual', редкая: 'rarity-rare',
      эпическая: 'rarity-epic', легендарная: 'rarity-legendary', мифическая: 'rarity-mythic',
    }[rarity] || '';
  }

  function isOwnLootRoll(round) {
    const userId = cloudSession && cloudSession.user && cloudSession.user.id;
    return !!userId && lootState.rolls.some((row) => row.round_id === round.id && row.user_id === userId);
  }

  function lootAnnouncement(round) {
    if (!round) return '';
    return 'ВНИМАНИЕ ЛЕГИОН! На разролле предмет «' + round.item_name + '», редкость: ' + round.rarity + '. Кидайте свой ролл на удачу.';
  }

  function renderLootPanel() {
    if (!shadow) return;
    const windowEl = shadow.getElementById('fdsLootWindow');
    if (!windowEl) return;
    const round = lootState.round;
    const owner = !!lootOwnerToken;
    const empty = !round;
    windowEl.hidden = !lootOpen;
    shadow.getElementById('fdsMainWindow').hidden = lootOpen;
    shadow.getElementById('fdsLootOwner').hidden = !owner || empty;
    shadow.getElementById('fdsLootLogin').hidden = owner;
    shadow.getElementById('fdsLootError').textContent = lootState.error || '';
    shadow.getElementById('fdsLootError').hidden = !lootState.error;
    if (empty) {
      shadow.getElementById('fdsLootBody').innerHTML = '<div class="loot-empty">Сейчас нет активного разролла.<br>Когда владелец создаст предмет, он появится здесь у всех участников.</div>';
      shadow.getElementById('fdsLootOwner').hidden = !owner;
      return;
    }
    const active = isLootRoundActive(round);
    const ownRoll = isOwnLootRoll(round);
    const rarityClass = lootRarityClass(round.rarity);
    const rows = lootState.rolls.map((row) =>
      '<div class="loot-roll-row"><span class="loot-nick">' + escapeHtml(row.nick) + '</span><span class="loot-value">' + Number(row.roll) + '</span></div>'
    ).join('');
    shadow.getElementById('fdsLootBody').innerHTML =
      '<div class="loot-card">' +
        '<div class="loot-kicker">' + (active ? 'Текущий предмет' : 'Разролл завершён') + '</div>' +
        '<div class="loot-item">' + escapeHtml(round.item_name) + '</div>' +
        '<div class="loot-meta"><span class="loot-rarity ' + rarityClass + '">' + escapeHtml(round.rarity) + '</span>' +
          '<span class="loot-timer ' + (active ? '' : 'done') + '">' + (active ? lootTimeLeft(round) : 'завершён') + '</span></div>' +
        '<div class="loot-announcement">' + escapeHtml(lootAnnouncement(round)) + '</div>' +
        '<button class="loot-roll" type="button" id="fdsLootRoll" ' + ((!active || ownRoll) ? 'disabled' : '') + '>' + (ownRoll ? 'Ты уже роллил: ' + Number(lootState.rolls.find((row) => row.user_id === cloudSession.user.id && row.round_id === round.id).roll) : (active ? 'Роллить' : 'Время истекло')) + '</button>' +
      '</div>' +
      '<div class="sec"><div class="sec-h"><span class="sec-t">Журнал роллов</span><span class="val">' + lootState.rolls.length + '</span></div>' +
        '<div class="loot-journal">' + (rows || '<div class="hint2">Пока никто не роллил.</div>') + '</div></div>';
    const rollButton = shadow.getElementById('fdsLootRoll');
    if (rollButton) rollButton.addEventListener('click', rollLoot);
    if (round.id !== lootAnnouncementId) {
      lootAnnouncementId = round.id;
      shadow.getElementById('fdsLootNotice').textContent = lootAnnouncement(round);
      shadow.getElementById('fdsLootNotice').hidden = false;
    }
    shadow.getElementById('fdsLootOwner').hidden = !owner;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function syncLootTimer() {
    if (!lootOpen || !lootState.round || !shadow) return;
    const active = isLootRoundActive(lootState.round);
    const timer = shadow.querySelector('.loot-timer');
    if (!timer) return;
    const next = active ? lootTimeLeft(lootState.round) : 'завершён';
    if (timer.textContent !== next) renderLootPanel();
  }

  function buildPanel() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'fds-host';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + PANEL_CSS + '</style>' + `
      <section class="panel" role="dialog" aria-label="Переливание ника" hidden>
        <div class="head" id="fdsDrag">
          <div class="logo">✦</div>
          <div class="titles">
            <div class="title">Гильдийское расширение</div>
            <div class="sub" id="fdsSub">Переливание ника · твой ник</div>
          </div>
          <button class="x" type="button" data-close aria-label="Свернуть в кружок" title="Свернуть в кружок">✕</button>
        </div>

          <div id="fdsMainWindow">
          <div class="setup" id="fdsSetup">
            <b>Сначала впиши свой ник</b>
            <span>Переливка включается только для указанного ника и работает у каждого в его браузере.</span>
          </div>

          <div class="preview"><span class="pv" id="fdsPv">твой ник</span></div>

          <div class="sec">
            <div class="sec-h"><span class="sec-t">Переливашка</span><span class="val" id="fdsPaintName">Аврора</span></div>
            <div class="paints" id="fdsPaints"></div>
          </div>

          <div class="sec">
            <div class="sec-h"><span class="sec-t">Скорость</span><span class="val" id="fdsSpeedV">8 с</span></div>
            <input type="range" id="fdsSpeed" min="3" max="20" step="1" value="8" aria-label="Скорость переливания">
          </div>

          <div class="sec">
            <div class="sec-h"><span class="sec-t">Свечение</span><span class="val" id="fdsGlowV">7 px</span></div>
            <input type="range" id="fdsGlow" min="0" max="16" step="1" value="7" aria-label="Сила свечения">
          </div>

          <div class="sec">
            <label class="sw"><input type="checkbox" id="fdsShine"><span class="track"></span><span class="lbl">Блик поверх краски</span></label>
            <label class="sw"><input type="checkbox" id="fdsMentions"><span class="track"></span><span class="lbl">Подсвечивать @упоминания</span></label>
            <label class="sw"><input type="checkbox" id="fdsEnabled"><span class="track"></span><span class="lbl">Включено</span></label>
            <label class="sw"><input type="checkbox" id="fdsShared"><span class="track"></span><span class="lbl">Красить общий список гильдии</span></label>
          </div>
          <div class="sharedrow">
            <span class="hint2" id="fdsSharedInfo">Общий список: …</span>
            <button class="mini" type="button" id="fdsSharedReload" title="Обновить общий список">↻</button>
          </div>

          <div class="sec fields">
            <div class="field">
              <span>Чей ник переливается</span>
              <div class="withbtn">
                <input id="fdsNick" type="text" spellcheck="false" autocomplete="off" placeholder="твой ник в чате">
                <button class="mini" type="button" id="fdsPickMe">Мой ник</button>
              </div>
              <div class="hint2" id="fdsNickHint">Впиши ник из чата. У каждого в браузере свой — скрипт можно передать друзьям.</div>
            </div>
            <label class="field"><span>Доп. ники через запятую</span><input id="fdsAliases" type="text" spellcheck="false" autocomplete="off" placeholder="твинк, второй_ник"></label>
          </div>

          <div class="foot">
            <button class="btn" type="button" id="fdsReset">Сбросить</button>
            <button class="btn primary" type="button" data-close>Готово</button>
          </div>
          <button class="btn loot-launch" type="button" id="fdsLootOpen">🎲 Распределение лута</button>
          <div class="hint">Работает только у тебя в браузере · Alt+Shift+F</div>
          </div>

          <div class="loot-window" id="fdsLootWindow" hidden>
            <div class="sec-h"><span class="sec-t">Распределение лута</span><span class="val">общий раунд</span></div>
            <div class="loot-announcement" id="fdsLootNotice" hidden></div>
            <div id="fdsLootBody"><div class="loot-empty">Загружаю состояние разролла…</div></div>
            <div class="loot-owner" id="fdsLootLogin">
              <div class="loot-owner-title">Управление владельца</div>
              <button class="mini loot-owner-login" type="button" id="fdsLootLoginBtn">Войти через Twitch</button>
            </div>
            <div class="loot-owner" id="fdsLootOwner" hidden>
              <div class="loot-owner-title">Новый предмет</div>
              <div class="field"><span>Название</span><input id="fdsLootItem" type="text" maxlength="160" placeholder="Название предмета"></div>
              <div class="field"><span>Редкость</span><select id="fdsLootRarity">${LOOT_RARITIES.map((rarity) => '<option value="' + rarity + '">' + rarity + '</option>').join('')}</select></div>
              <div class="field"><span>Таймер, секунд</span><input id="fdsLootDuration" type="number" min="10" max="86400" step="1" value="120"></div>
              <div class="loot-owner-actions"><button class="mini" type="button" id="fdsLootCreate">Создать</button><button class="mini" type="button" id="fdsLootFinish">Завершить</button><button class="mini" type="button" id="fdsLootClear">Очистить журнал</button></div>
            </div>
            <div class="loot-error" id="fdsLootError" hidden></div>
            <button class="btn loot-back" type="button" id="fdsLootBack">← К настройкам</button>
          </div>
        </section>
      <button class="bubble" type="button" hidden aria-label="Открыть настройки переливания" title="Переливание ника · настройки">
        <span class="halo"></span>
        <span class="ball"><span class="bicon">✦</span></span>
      </button>
    `;
    document.documentElement.appendChild(host);

    shadow.getElementById('fdsPaints').innerHTML = PAINTS.map((p) =>
      '<button class="paint" type="button" data-paint="' + p.id + '" style="--pp:' + gradientOf(p) + '">' +
        '<span class="chip"><b>ник</b></span>' +
        '<span class="nm">' + p.name + '</span>' +
      '</button>'
    ).join('');

    const panel = shadow.querySelector('.panel');
    const bubble = shadow.querySelector('.bubble');
    makeDraggable(panel, shadow.getElementById('fdsDrag'), 'button, input, label, a', placePanel);

    let bubbleDragAt = 0;
    makeDraggable(bubble, bubble, null, () => { bubbleDragAt = performance.now(); });
    bubble.addEventListener('click', () => {
      if (performance.now() - bubbleDragAt < 350) return;
      openPanel();
    });

    shadow.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { closePanel(); return; }
      const pb = e.target.closest('[data-paint]');
      if (pb) {
        cfg.paint = pb.dataset.paint;
        saveCfg();
        refresh();
        syncPanel();
        scheduleCloudPublish();
      }
    });

    const speed = shadow.getElementById('fdsSpeed');
    speed.addEventListener('input', () => {
      cfg.speed = Number(speed.value) || DEFAULTS.speed;
      saveCfg();
      applyVars();
      shadow.getElementById('fdsSpeedV').textContent = cfg.speed + ' с';
    });

    const glow = shadow.getElementById('fdsGlow');
    glow.addEventListener('input', () => {
      cfg.glow = Number(glow.value) || 0;
      saveCfg();
      applyVars();
      shadow.getElementById('fdsGlowV').textContent = cfg.glow + ' px';
    });

    shadow.getElementById('fdsShine').addEventListener('change', (e) => {
      cfg.shine = e.target.checked;
      saveCfg();
      applyVars();
      syncPanel();
    });

    shadow.getElementById('fdsMentions').addEventListener('change', (e) => {
      cfg.mentions = e.target.checked;
      saveCfg();
      refresh();
    });

    shadow.getElementById('fdsEnabled').addEventListener('change', (e) => {
      cfg.enabled = e.target.checked;
      saveCfg();
      refresh();
      if (shadow) syncPanel();
    });

    shadow.getElementById('fdsShared').addEventListener('change', (e) => {
      cfg.shared = e.target.checked;
      saveCfg();
      refresh();
      if (cfg.shared) {
        loadShared(false);
        scheduleCloudPublish();
      } else {
        sharedState = 'off';
        updateSharedInfo();
      }
      syncPanel();
    });

    shadow.getElementById('fdsSharedReload').addEventListener('click', () => {
      if (cfg.shared) loadShared(true);
    });

    const nick = shadow.getElementById('fdsNick');
    nick.addEventListener('input', () => {
      cfg.nick = nick.value.trim();
      saveCfg();
      refresh();
      syncNickUi();
      scheduleCloudPublish();
    });
    nick.addEventListener('blur', () => {
      cfg.nick = nick.value.trim();
      nick.value = cfg.nick;
      saveCfg();
      refresh();
      syncNickUi();
      scheduleCloudPublish();
    });

    shadow.getElementById('fdsPickMe').addEventListener('click', () => {
      const found = detectOwnNick();
      if (!found) {
        const hint = shadow.getElementById('fdsNickHint');
        hint.textContent = 'Не нашёл твой ник в чате. Впиши его вручную в поле выше.';
        hint.classList.remove('ok');
        hint.classList.add('warn');
        return;
      }
      cfg.nick = found;
      saveCfg();
      nick.value = found;
      refresh();
      syncNickUi();
      scheduleCloudPublish();
    });

    const aliases = shadow.getElementById('fdsAliases');
    aliases.addEventListener('input', () => {
      cfg.aliases = aliases.value;
      saveCfg();
      refresh();
    });

    shadow.getElementById('fdsReset').addEventListener('click', () => {
      const keepNick = cfg.nick;
      Object.assign(cfg, DEFAULTS);
      cfg.nick = keepNick;
      cfg.asked = true;
      saveCfg();
      applyVars();
      refresh();
      syncPanel();
      scheduleCloudPublish();
    });

    shadow.getElementById('fdsLootOpen').addEventListener('click', () => {
      lootOpen = true;
      renderLootPanel();
      if (!lootState.loaded) loadLootState();
    });
    shadow.getElementById('fdsLootBack').addEventListener('click', () => {
      lootOpen = false;
      renderLootPanel();
    });
    shadow.getElementById('fdsLootLoginBtn').addEventListener('click', startLootOwnerLogin);
    shadow.getElementById('fdsLootCreate').addEventListener('click', createLootRound);
    shadow.getElementById('fdsLootFinish').addEventListener('click', finishLootRound);
    shadow.getElementById('fdsLootClear').addEventListener('click', clearLootRolls);
    renderLootPanel();
  }

  function syncNickUi() {
    if (!shadow) return;
    const label = cfg.nick || PLACEHOLDER;
    shadow.querySelectorAll('[data-paint] .chip b').forEach((el) => { el.textContent = label; });
    shadow.getElementById('fdsSub').textContent = 'Переливание ника · ' + label;
    shadow.getElementById('fdsPv').textContent = label;
    shadow.getElementById('fdsSetup').hidden = !!cfg.nick;
    const hint = shadow.getElementById('fdsNickHint');
    hint.textContent = cfg.nick
      ? 'Готово: переливается ник «' + cfg.nick + '». У каждого в браузере свой — скрипт можно передать друзьям.'
      : 'Впиши ник из чата или нажми «Мой ник». У каждого в браузере свой — скрипт можно передать друзьям.';
    hint.classList.toggle('ok', !!cfg.nick);
    hint.classList.toggle('warn', !cfg.nick);
  }

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function updateSharedInfo() {
    if (!shadow) return;
    const el = shadow.getElementById('fdsSharedInfo');
    if (!el) return;
    const count = Object.keys(allSharedPaints()).length;
    el.classList.remove('ok', 'warn');
    if (!cfg.shared) {
      el.textContent = 'Общий список выключен';
      return;
    }
    if (sharedState === 'loading' || cloudState === 'loading') {
      el.textContent = 'Общий список: загружаю…';
      return;
    }
    if (sharedState === 'error' && !count) {
      el.textContent = count
        ? 'Общий список: ' + count + ' ' + plural(count, 'ник', 'ника', 'ников') + ' (из кэша, нет связи)'
        : 'Общий список не загрузился';
      el.classList.add('warn');
      return;
    }
    if (count) {
      el.textContent = 'Общий список: ' + count + ' ' + plural(count, 'ник', 'ника', 'ников');
      el.classList.add(cloudState === 'error' ? 'warn' : 'ok');
    } else {
      el.textContent = 'Общий список пуст';
    }
  }

  function syncPanel() {
    if (!shadow) return;
    const paint = currentPaint();
    shadow.querySelectorAll('[data-paint]').forEach((b) => {
      b.classList.toggle('on', b.dataset.paint === cfg.paint);
    });
    shadow.getElementById('fdsPaintName').textContent = paint.name;
    syncNickUi();
    shadow.getElementById('fdsSpeed').value = cfg.speed;
    shadow.getElementById('fdsSpeedV').textContent = cfg.speed + ' с';
    shadow.getElementById('fdsGlow').value = cfg.glow;
    shadow.getElementById('fdsGlowV').textContent = cfg.glow + ' px';
    shadow.getElementById('fdsShine').checked = !!cfg.shine;
    shadow.getElementById('fdsMentions').checked = !!cfg.mentions;
    shadow.getElementById('fdsEnabled').checked = !!cfg.enabled;
    shadow.getElementById('fdsShared').checked = !!cfg.shared;
    shadow.getElementById('fdsNick').value = cfg.nick;
    shadow.getElementById('fdsAliases').value = cfg.aliases;
    shadow.getElementById('fdsPv').classList.toggle('off', !cfg.enabled);
    shadow.getElementById('fdsPv').classList.toggle('no-shine', !cfg.shine);
    syncBubble();
    updateSharedInfo();
    renderLootPanel();
  }

  function openPanel() {
    buildPanel();
    const panel = shadow.querySelector('.panel');
    const bubble = shadow.querySelector('.bubble');
    bubble.hidden = true;
    panel.hidden = false;
    syncPanel();
    placePanel();
  }

  function closePanel() {
    if (!shadow) return;
    const panel = shadow.querySelector('.panel');
    const bubble = shadow.querySelector('.bubble');
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    bubble.hidden = false;
    placeBubble();
    saveCfg();
  }

  function showBubble() {
    buildPanel();
    const panel = shadow.querySelector('.panel');
    const bubble = shadow.querySelector('.bubble');
    panel.hidden = true;
    bubble.hidden = false;
    syncBubble();
    placeBubble();
  }

  /* ---------- boot ---------- */

  applyVars();

  const start = () => {
    const firstRun = !cfg.asked;
    readSharedCache();
    readCloudCache();
    readLootOwnerToken();
    processLootOAuthCallback();
    if (!cfg.nick) {
      const found = detectOwnNick();
      if (found) {
        cfg.nick = found;
        saveCfg();
      }
    }
    refresh();
    loadShared(false);
    if (!TEST && cfg.shared) {
      cloudState = 'loading';
      updateSharedInfo();
      loadCloudPaints();
      scheduleCloudPublish();
    }
    if (!TEST) loadLootState();
    if (firstRun || !cfg.nick) {
      if (firstRun) {
        cfg.asked = true;
        saveCfg();
      }
      openPanel();
    } else {
      showBubble();
    }
    setInterval(() => { if (!document.hidden && cfg.enabled) scan(); }, 2500);
    cloudSyncInterval = window.setInterval(() => {
      if (cfg.shared && !document.hidden) loadCloudPaints();
    }, CLOUD_POLL_MS);
    lootTimer = window.setInterval(syncLootTimer, 1000);
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-nick'],
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  document.addEventListener('keydown', (e) => {
    const panel = shadow && shadow.querySelector('.panel');
    if (e.altKey && e.shiftKey && !e.ctrlKey && (e.code === 'KeyF' || e.key.toLowerCase() === 'f')) {
      e.preventDefault();
      if (panel && !panel.hidden) closePanel();
      else openPanel();
    } else if (e.key === 'Escape' && panel && !panel.hidden) {
      closePanel();
    }
  });

  window.addEventListener('resize', () => {
    if (!shadow) return;
    placePanel();
    placeBubble();
  });

  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('Настройки переливания ника', openPanel);
      GM_registerMenuCommand('Вкл/выкл переливание', () => {
        cfg.enabled = !cfg.enabled;
        saveCfg();
        refresh();
        if (shadow) syncPanel();
      });
    }
  } catch (e) { /* ignore */ }

  window.FaldoorchShimmer = {
    cfg,
    open: openPanel,
    close: closePanel,
    scan,
    refresh,
    applyVars,
    paints: PAINTS,
    PAINTS,
    loot: {
      setState: (payload) => applyLootState(payload),
      open: () => { lootOpen = true; renderLootPanel(); },
      close: () => { lootOpen = false; renderLootPanel(); },
      state: () => lootState,
    },
  };
})();
