// ==UserScript==
// @name         Легион - Аддон для чата (colors)
// @namespace    https://legiongame.gg/
// @version      1.11.0
// @description  Аддон для чата Легиона: сорок переливашек ника.
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
// @updateURL    https://raw.githubusercontent.com/faldoor/Legion-chat-extension/main/legion-chat.user.js
// @downloadURL  https://raw.githubusercontent.com/faldoor/Legion-chat-extension/main/legion-chat.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TEST = window.__FDS_TEST__ === true;
  const HOST_OK = /(^|\.)legiongame\.gg$/i.test(location.hostname)
    || /(^|\.)multidonate\.ru$/i.test(location.hostname);
  if (!HOST_OK && !TEST) return;

  const KEY = 'fds_cfg_v1';
  const PLACEHOLDER = 'твой ник';
  const SHARED_URL = 'https://raw.githubusercontent.com/faldoor/Legion-chat-extension/main/paints.json';
  const SHARED_KEY = 'fds_shared_v1';
  const SHARED_TTL = 6 * 60 * 60 * 1000;
  const SUPABASE_URL = 'https://xqwdpnpvfxvzmtmmupev.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qK3o1yioybygYWo3R-BQvA_ks7maFKn';
  const SUPABASE_AUTH_KEY = 'fds_supabase_auth_v1';
  const CLOUD_POLL_MS = 5000;

  const PAINTS = [
    { id: 'aurora', name: 'Аврора', glow: '96,214,255', colors: ['#7dffb0', '#35e0c0', '#4aa8ff', '#a06bff'] },
    { id: 'rainbow', name: 'Радуга', glow: '255,120,200', colors: ['#ff2d55', '#ff9500', '#ffe83d', '#35d94f', '#22c7ff', '#7a5cff'] },
    { id: 'holo', name: 'Голография', glow: '168,255,240', colors: ['#ff8fe0', '#6ff0e0', '#b18cff', '#ffe07a'] },
    { id: 'sunset', name: 'Закат', glow: '255,110,60', colors: ['#ff2d6f', '#ff6a1f', '#ffc247', '#ff9d5c'] },
    { id: 'gold', name: 'Золото', glow: '247,215,116', colors: ['#fff6cf', '#f2c94c', '#a87a1f', '#6b4a0a'] },
    { id: 'cyber', name: 'Кибер', glow: '0,245,255', colors: ['#22f5ff', '#3d7bff', '#a24bff', '#ff3dcf'] },
    { id: 'candy', name: 'Карамель', glow: '255,158,203', colors: ['#ff8fc7', '#ffc2e2', '#b18cff', '#7fd0ff'] },
    { id: 'ice', name: 'Лёд', glow: '125,211,252', colors: ['#f2ffff', '#b0f0f5', '#4fd0e0', '#1f9fb8'] },
    { id: 'mint', name: 'Мята', glow: '125,255,207', colors: ['#9dffd8', '#4fe3c1', '#2bb0a8'] },
    { id: 'ocean', name: 'Океан', glow: '43,127,255', colors: ['#4fe0ff', '#1f7ae0', '#12307a'] },
    { id: 'sakura', name: 'Сакура', glow: '255,158,203', colors: ['#fff0f6', '#ffc6dd', '#e88ab0', '#b85a80'] },
    { id: 'lava', name: 'Лава', glow: '255,90,0', colors: ['#4a0505', '#b81200', '#ff5a00', '#ffab2e'] },
    { id: 'matrix', name: 'Матрица', glow: '0,255,136', colors: ['#c8ff5c', '#35e06a', '#0a8f4f', '#065c3a'] },
    { id: 'toxic', name: 'Токсин', glow: '124,255,58', colors: ['#eaff3d', '#9dff2e', '#2ee88f', '#00b8a0'] },
    { id: 'fire', name: 'Огонь', glow: '255,120,40', colors: ['#c40023', '#ff4d00', '#ff9d00', '#ffe66b'] },
    { id: 'emerald', name: 'Изумруд', glow: '0,220,140', colors: ['#b6ffd9', '#2ee08f', '#0a9e6a', '#046b52'] },
    { id: 'chrome', name: 'Хром', glow: '200,215,255', colors: ['#ffffff', '#d7e2ef', '#7f93a8', '#e8f1fb'] },
    { id: 'lavender', name: 'Лаванда', glow: '190,160,255', colors: ['#e8ecff', '#c2c9ff', '#8f9aff', '#d9dcff'] },
    { id: 'tropical', name: 'Тропики', glow: '80,240,210', colors: ['#3df5cf', '#a7ff3d', '#ffcf3d', '#ff6f8f'] },
    { id: 'cosmos', name: 'Космос', glow: '120,110,255', colors: ['#8f9bff', '#2f2fa8', '#6a1fb0', '#00c2d9'] },
    { id: 'neon', name: 'Неон', glow: '57,255,20', colors: ['#39ff14', '#00e5ff', '#ff00e5'] },
    { id: 'peach', name: 'Персик', glow: '255,158,122', colors: ['#fff0e0', '#ffc09a', '#ff8f6b', '#d95a4a'] },
    { id: 'rose', name: 'Роза', glow: '217,122,154', colors: ['#f2d2d8', '#d98a9a', '#b04a60', '#7a2a3c'] },
    { id: 'steel', name: 'Сталь', glow: '159,184,216', colors: ['#eaf4ff', '#b7d0e8', '#6f9cc8', '#2f5c8a'] },
    { id: 'copper', name: 'Медь', glow: '224,139,75', colors: ['#ffd9a8', '#e07a2a', '#8f3a12', '#1f9e82'] },
    { id: 'sky', name: 'Небо', glow: '120,190,255', colors: ['#eaf7ff', '#a8dcff', '#4a9eff', '#1f5fd0'] },
    { id: 'forest', name: 'Лес', glow: '111,207,111', colors: ['#d8f5b0', '#7fbf4a', '#2f7a3a', '#144a2a'] },
    { id: 'sand', name: 'Песок', glow: '217,191,150', colors: ['#fbf1dc', '#dcc39a', '#b99b70', '#8a6f4c'] },
    { id: 'violet', name: 'Фиалка', glow: '185,140,255', colors: ['#e8d0ff', '#b06bff', '#7a2ee8', '#ff4fc8'] },
    { id: 'ruby', name: 'Рубин', glow: '255,77,109', colors: ['#ffd2dc', '#ff3d5a', '#b8002f', '#6e001c'] },
    { id: 'amber', name: 'Янтарь', glow: '255,194,71', colors: ['#ffd08a', '#f0851f', '#b34a08', '#6b2503'] },
    { id: 'graphite', name: 'Графит', glow: '148,163,184', colors: ['#d7dce2', '#9aa2ac', '#4f565f', '#23272c'] },
    { id: 'gum', name: 'Жвачка', glow: '255,138,226', colors: ['#ff2f8f', '#ff86c8', '#5cf0b8', '#00c2a0'] },
    { id: 'lagoon', name: 'Лагуна', glow: '77,225,208', colors: ['#d9fff8', '#5fe8d8', '#1f9e9e', '#0a5f6b'] },
    { id: 'plasma', name: 'Плазма', glow: '176,107,255', colors: ['#ff2fb0', '#c02eff', '#6a2ee8', '#2f3db0'] },
    { id: 'honey', name: 'Мёд', glow: '255,209,102', colors: ['#fffdf0', '#fff0c2', '#f5d98f', '#d9b96a'] },
    { id: 'storm', name: 'Гроза', glow: '127,156,245', colors: ['#e6e4ff', '#7f7ac8', '#2a2666', '#a8e8ff'] },
    { id: 'cotton', name: 'Хлопок', glow: '255,233,243', colors: ['#fffdf8', '#f5ece2', '#e6d9cc', '#fffaf2'] },
    { id: 'jade', name: 'Нефрит', glow: '127,240,189', colors: ['#e8fff0', '#a8f0c8', '#5fbf8f', '#2f7a5c'] },
    { id: 'dusk', name: 'Сумерки', glow: '143,107,255', colors: ['#ffd2b8', '#ff8f8f', '#a86bff', '#4a3db0'] },
  ];

  const DEFAULTS = {
    enabled: true,
    nick: '',
    paint: 'aurora',
    speed: 8,
    glow: 7,
    shine: true,
    mentions: true,
    asked: false,
    posR: 16,
    posT: 16,
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
  delete cfg.shared;

  function saveCfg() {
    const s = JSON.stringify(cfg);
    try { if (typeof GM_setValue === 'function') GM_setValue(KEY, s); } catch (e) { /* ignore */ }
    try { localStorage.setItem(KEY, s); } catch (e) { /* ignore */ }
  }

  /* ---------- shared paint list ---------- */

  let sharedPaints = {};
  let sharedStamp = 0;
  let cloudPaints = {};
  let cloudRows = {};
  let cloudSession = null;
  let cloudAuthPromise = null;
  let cloudPoll = 0;
  let cloudPublishTimer = 0;
  let cloudSyncInterval = 0;

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
    if (!key) return null;
    if (key === cleanNick(cfg.nick)) return currentPaint();
    const id = cloudPaints[key] || sharedPaints[key];
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
  }

  function writeSharedCache() {
    const raw = JSON.stringify({ ts: sharedStamp, paints: sharedPaints });
    try { if (typeof GM_setValue === 'function') GM_setValue(SHARED_KEY, raw); } catch (e) { /* ignore */ }
    try { localStorage.setItem(SHARED_KEY, raw); } catch (e) { /* ignore */ }
  }

  function applySharedPayload(raw) {
    const data = typeof raw === 'string' ? readJson(raw) : raw;
    if (!data || typeof data !== 'object') return;
    sharedPaints = sanitizeShared(data);
    sharedStamp = Date.now();
    writeSharedCache();
    refresh();
  }

  function loadShared(force) {
    if (!force && sharedStamp && Date.now() - sharedStamp < SHARED_TTL) return;
    if (window.__FDS_SHARED_JSON__ != null) {
      applySharedPayload(window.__FDS_SHARED_JSON__);
      return;
    }
    const url = SHARED_URL + (SHARED_URL.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    if (typeof GM_xmlhttpRequest === 'function') {
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          timeout: 15000,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) applySharedPayload(res.responseText);
          },
        });
      } catch (e) { /* keep the cached list */ }
    } else if (typeof fetch === 'function') {
      fetch(url, { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(applySharedPayload)
        .catch(() => { /* keep the cached list */ });
    }
  }

  /* ---------- realtime paint sync ---------- */

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
        else {
          const failure = new Error('Supabase HTTP ' + status);
          failure.status = status;
          reject(failure);
        }
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
  }

  function applyCloudChange(event, record, oldRecord) {
    const row = record || oldRecord;
    if (!row || !row.user_id) return;
    if (event === 'DELETE') delete cloudRows[row.user_id];
    else if (row.nick && paintById(row.paint_id)) cloudRows[row.user_id] = row;
    rebuildCloudPaints();
    writeCloudCache();
    refresh();
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
    } catch (e) {
      scheduleCloudPoll();
    }
  }

  function scheduleCloudPoll() {
    if (cloudPoll) return;
    cloudPoll = window.setTimeout(() => {
      cloudPoll = 0;
      if (!document.hidden) loadCloudPaints();
    }, CLOUD_POLL_MS);
  }

  async function publishOwnPaint() {
    if (TEST || !cfg.nick) return;
    try {
      const session = await ensureCloudSession();
      await cloudRequest(
        'POST',
        '/rest/v1/guild_paints?on_conflict=user_id',
        { user_id: session.user.id, nick: cfg.nick, paint_id: cfg.paint, updated_at: new Date().toISOString() },
        session.access_token
      );
      loadCloudPaints();
    } catch (e) {
      /* keep the last known list */
    }
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
    const set = new Set();
    const own = cleanNick(cfg.nick);
    if (own) set.add(own);
    for (const key of Object.keys(allSharedPaints())) set.add(key);
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

  function isLiveChatItem(el) {
    const item = el && el.closest ? el.closest('ol.cy-chat-l > li') : null;
    if (!item || !item.parentElement) return false;
    return item === item.parentElement.firstElementChild || item === item.parentElement.lastElementChild;
  }

  function isLiveChatContainer(el) {
    const item = el && el.closest ? el.closest('ol.cy-chat-l > li') : null;
    return !!(item && item === el);
  }

  function unwrapMentions() {
    document.querySelectorAll('[data-fds-mention]').forEach((el) => {
      if (isLiveChatItem(el)) return;
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
      // The chat renderer is still writing the newest item. Do not replace its
      // text nodes while it is live; the next scan will process it after a new
      // message arrives and this avoids losing the newest message.
      if (isLiveChatItem(body)) return;
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

    const base = 'b[data-nick], a[data-nick], [data-nick]';
    document.querySelectorAll(base).forEach((el) => {
      const chatItem = el.closest ? el.closest('ol.cy-chat-l > li') : null;
      if (chatItem && !el.matches('b[data-nick], a[data-nick]')) return;
      if (isLiveChatContainer(el)) return;
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
    :host {
      --p-paper: #f4efe2;
      --p-paper-2: #ece4d2;
      --p-paper-3: #e2d9c2;
      --p-ink: #1a1712;
      --p-ink-2: #3d372c;
      --p-muted: #6b6352;
      --p-rule: #d8cfba;
      --p-rule-hi: #b6ab90;
      --p-accent: #9a3324;
      --p-accent-ink: #fdf7ec;
      --p-focus: #9a3324;
      --p-tile: #191611;
    }
    * { box-sizing: border-box; }
    [hidden] { display: none !important; }

    .panel {
      position: fixed; right: 16px; top: 16px; width: 366px;
      max-height: calc(100vh - 28px); overflow: auto; overscroll-behavior: contain;
      pointer-events: auto; padding: 13px 14px 12px;
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      color: var(--p-ink);
      border-radius: 6px;
      background: var(--p-paper);
      border: 1px solid var(--p-rule-hi);
      box-shadow: 0 18px 44px rgba(26, 20, 10, .32), 0 2px 6px rgba(26, 20, 10, .14);
      z-index: 2147483000;
      scrollbar-width: thin;
      scrollbar-color: var(--p-rule-hi) transparent;
    }
    .panel.dragging { box-shadow: 0 24px 56px rgba(26, 20, 10, .38), 0 0 0 1px var(--p-accent); }
    .panel::-webkit-scrollbar { width: 8px; }
    .panel::-webkit-scrollbar-thumb { background: var(--p-rule-hi); border-radius: 0; }

    .head {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding-bottom: 7px; margin-bottom: 10px; border-bottom: 1px solid var(--p-rule);
      cursor: grab; user-select: none; touch-action: none;
    }
    .panel.dragging .head { cursor: grabbing; }
    .wordmark {
      font: 600 12px/1 Georgia, "Times New Roman", serif;
      letter-spacing: .06em; color: var(--p-accent);
    }
    .x {
      flex: none; width: 24px; height: 24px; border-radius: 3px; border: 1px solid var(--p-rule-hi);
      background: transparent; color: var(--p-ink-2); font-size: 16px; line-height: 1; cursor: pointer;
      display: grid; place-items: center; padding: 0;
      transition: background .15s, color .15s, border-color .15s;
    }
    .x:hover { background: var(--p-paper-3); color: var(--p-accent); border-color: var(--p-accent); }
    .x:focus-visible { outline: 2px solid var(--p-focus); outline-offset: 2px; }

    .titles { margin-bottom: 10px; }
    .title {
      font: 600 18px/1.2 Georgia, "Times New Roman", serif;
      letter-spacing: -.1px; overflow-wrap: break-word;
    }
    .sub {
      margin-top: 3px; font-size: 11.5px; color: var(--p-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .preview {
      display: grid; place-items: center; min-height: 64px; margin-bottom: 10px; padding: 10px 12px;
      border-radius: 3px; overflow: hidden;
      background: var(--p-paper-2);
      border: 1px solid var(--p-rule);
      box-shadow: inset 0 1px 3px rgba(26, 20, 10, .09);
    }
    .sec { margin-top: 11px; }
    .sec-h { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
    .sec-t { font-size: 11.5px; color: var(--p-muted); }
    .val {
      min-width: 0; font-size: 11px; color: var(--p-ink-2); text-align: right;
      font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .paints { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
    .paint {
      height: 30px; padding: 0; border: 1px solid #2b2519; border-radius: 3px; overflow: hidden;
      background: var(--p-tile); cursor: pointer; color: var(--p-paper);
      transition: border-color .15s, background .15s, transform .15s;
    }
    .paint .chip { height: 100%; display: grid; place-items: center; overflow: hidden; }
    .paint .chip b {
      max-width: 100%; padding: 0 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      font-size: 8.5px; font-weight: 800; letter-spacing: -.2px;
      background-image: var(--pp); background-size: 200% 100%; background-repeat: repeat-x;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
    }
    .paint:hover { border-color: #6b6252; background: #221d15; }
    .paint:active { transform: scale(.96); }
    .paint.on {
      border-color: var(--p-accent);
      box-shadow: 0 0 0 2px var(--p-accent);
    }
    .paint.on .chip b { animation: fds-flow-plain 6s linear infinite; }
    .paint:focus-visible { outline: 2px solid var(--p-focus); outline-offset: 2px; }

    .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 11px; }
    .duo .sec { margin-top: 0; }

    input[type="range"] {
      -webkit-appearance: none; appearance: none; width: 100%; height: 18px; background: transparent; cursor: pointer;
    }
    input[type="range"]::-webkit-slider-runnable-track {
      height: 3px; background: var(--p-rule-hi);
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 11px; height: 11px; margin-top: -4px; border-radius: 1px;
      background: var(--p-ink); border: 0;
    }
    input[type="range"]::-moz-range-track { height: 3px; background: var(--p-rule-hi); }
    input[type="range"]::-moz-range-thumb {
      width: 11px; height: 11px; border-radius: 1px; background: var(--p-ink); border: 0;
    }
    input[type="range"]:focus-visible { outline: 2px solid var(--p-focus); outline-offset: 3px; }

    .checks { margin-top: 12px; border-top: 1px solid var(--p-rule); }
    .chk {
      display: flex; align-items: center; gap: 9px; padding: 6px 0;
      cursor: pointer; user-select: none; border-bottom: 1px solid var(--p-rule);
    }
    .chk input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .box {
      position: relative; flex: none; width: 16px; height: 16px; border-radius: 2px;
      border: 1px solid var(--p-rule-hi); background: #fffdf6;
      transition: background .15s, border-color .15s;
    }
    .chk:hover .box { border-color: var(--p-ink-2); }
    .chk input:checked + .box { background: var(--p-accent); border-color: var(--p-accent); }
    .chk input:checked + .box::after {
      content: ''; position: absolute; left: 4px; top: 0; width: 4px; height: 9px;
      border: solid var(--p-accent-ink); border-width: 0 2px 2px 0;
      transform: rotate(42deg);
    }
    .chk input:focus-visible + .box { outline: 2px solid var(--p-focus); outline-offset: 2px; }
    .chk .lbl { font-size: 12px; color: var(--p-ink-2); }

    .hint { margin: 0; font-size: 10.5px; line-height: 1.45; color: var(--p-muted); }
    .hint.ok { color: #4a6b3a; }
    .hint.warn { color: var(--p-accent); }

    .field { display: grid; gap: 5px; margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--p-rule); }
    .field > span { font-size: 11px; color: var(--p-muted); }
    .field input {
      width: 100%; padding: 7px 9px; border-radius: 3px; font: inherit; font-size: 12.5px;
      background: #fffdf6; color: var(--p-ink); border: 1px solid var(--p-rule-hi); outline: none;
      transition: border-color .15s, box-shadow .15s;
    }
    .field input:focus { border-color: var(--p-accent); box-shadow: 0 0 0 3px rgba(154, 51, 36, .13); }
    .withbtn { display: flex; gap: 6px; }
    .withbtn input { flex: 1; min-width: 0; }
    .mini {
      flex: none; min-height: 34px; padding: 0 11px; border-radius: 3px;
      border: 1px solid var(--p-ink-2); background: transparent; color: var(--p-ink-2);
      font: inherit; font-size: 11.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
      transition: background .15s, color .15s, border-color .15s;
    }
    .mini:hover { background: var(--p-ink); color: var(--p-accent-ink); border-color: var(--p-ink); }
    .mini:focus-visible { outline: 2px solid var(--p-focus); outline-offset: 2px; }

    .foot { display: flex; gap: 8px; margin-top: 12px; }
    .btn {
      flex: 1; min-height: 34px; padding: 8px 12px; border-radius: 3px; border: 1px solid var(--p-rule-hi);
      background: transparent; color: var(--p-ink-2); font: inherit; font-size: 12.5px; font-weight: 500;
      cursor: pointer; transition: background .15s, border-color .15s, color .15s;
    }
    .btn:hover { background: var(--p-paper-3); border-color: var(--p-ink-2); }
    .btn:focus-visible { outline: 2px solid var(--p-focus); outline-offset: 2px; }
    .btn.primary {
      border-color: var(--p-ink); background: var(--p-ink); color: var(--p-accent-ink);
    }
    .btn.primary:hover { background: #2b2519; border-color: #2b2519; }

    .bubble {
      position: fixed; right: 16px; top: 16px; z-index: 2147483000;
      width: 38px; height: 38px; padding: 0; border: 0; border-radius: 10px;
      background: transparent; pointer-events: auto; cursor: grab;
      touch-action: none; user-select: none; -webkit-tap-highlight-color: transparent;
      opacity: .58; transition: opacity .18s ease, transform .18s ease;
    }
    .bubble .ball {
      width: 100%; height: 100%; border-radius: 10px; display: grid; place-items: center;
      background: #f4efe2; border: 1px solid #c9bfa8;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .38), inset 0 1px 0 rgba(255, 255, 255, .7);
      transition: border-color .18s ease, box-shadow .18s ease;
    }
    .bubble .cat { width: 21px; height: 21px; color: #2a2418; transition: color .18s ease; }
    .bubble .cat svg { display: block; width: 100%; height: 100%; }
    .bubble:hover { opacity: 1; transform: translateY(-1px); }
    .bubble:hover .cat { color: var(--p-accent); }
    .bubble:hover .ball {
      border-color: var(--p-accent);
      box-shadow: 0 8px 20px rgba(0, 0, 0, .44), inset 0 1px 0 rgba(255, 255, 255, .8);
    }
    .bubble:active .ball, .bubble.dragging .ball { transform: scale(.95); }
    .bubble.dragging { cursor: grabbing; opacity: 1; }
    .bubble.off .cat { opacity: .35; }
    .bubble:focus-visible { opacity: 1; outline: 2px solid var(--p-focus); outline-offset: 3px; }

    @keyframes fds-flow {
      0%   { background-position: -183.333% 50%, 0% 50%; }
      100% { background-position: 283.333% 50%, 200% 50%; }
    }
    @keyframes fds-flow-plain {
      0%   { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }
    .pv {
      max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 27px; font-weight: 800; letter-spacing: .2px;
      background-image: var(--fds-shine, linear-gradient(90deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, .62) 50%, rgba(255, 255, 255, 0) 60%)), var(--fds-grad);
      background-size: 70% 100%, 200% 100%;
      background-repeat: repeat-x, repeat-x;
      background-position: -183.333% 50%, 0% 50%;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent; color: transparent;
      animation: fds-flow var(--fds-speed, 8s) linear infinite;
      animation-delay: var(--fds-delay, 0s);
      text-shadow: 0 0 var(--fds-glow, 7px) rgba(var(--fds-glowcol, 124, 140, 255), .55);
    }
    .pv.no-shine {
      background-image: var(--fds-grad); background-size: 200% 100%; background-position: 0% 50%;
      animation-name: fds-flow-plain;
    }
    .pv.off {
      background: none; -webkit-text-fill-color: currentColor; color: var(--p-muted);
      animation: none; filter: none; text-shadow: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .pv, .paint.on .chip b { animation: none; }
      .paint, .btn, .mini, .x, .bubble, .bubble .ball, .bubble .cat, .box, .field input { transition: none; }
      .paint:active { transform: none; }
      .bubble:hover { transform: none; }
    }
    @media (max-width: 460px) {
      .panel { width: calc(100vw - 20px); right: 10px; top: 10px; }
    }
  `;

  let host = null;
  let shadow = null;

  const BUBBLE_SIZE = 38;

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

  function buildPanel() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'fds-host';
    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + PANEL_CSS + '</style>' + `
      <section class="panel" role="dialog" aria-label="Переливание ника" hidden>
        <div class="head" id="fdsDrag">
          <span class="wordmark">Легион</span>
          <button class="x" type="button" data-close aria-label="Свернуть в кружок" title="Свернуть в кружок">×</button>
        </div>

        <div class="titles">
          <div class="title">Переливание ника</div>
          <div class="sub" id="fdsSub">Ник не выбран</div>
        </div>

        <div class="preview"><span class="pv" id="fdsPv">твой ник</span></div>

        <div class="sec">
          <div class="sec-h"><span class="sec-t">Краска</span><span class="val" id="fdsPaintName">Аврора</span></div>
          <div class="paints" id="fdsPaints" role="group" aria-label="Краски"></div>
        </div>

        <div class="duo">
          <div class="sec">
            <div class="sec-h"><span class="sec-t">Скорость</span><span class="val" id="fdsSpeedV">8 с</span></div>
            <input type="range" id="fdsSpeed" min="3" max="20" step="1" value="8" aria-label="Скорость переливания">
          </div>
          <div class="sec">
            <div class="sec-h"><span class="sec-t">Свечение</span><span class="val" id="fdsGlowV">7 px</span></div>
            <input type="range" id="fdsGlow" min="0" max="16" step="1" value="7" aria-label="Сила свечения">
          </div>
        </div>

        <div class="checks">
          <label class="chk"><input type="checkbox" id="fdsShine"><span class="box"></span><span class="lbl">Блик поверх краски</span></label>
          <label class="chk"><input type="checkbox" id="fdsMentions"><span class="box"></span><span class="lbl">Подсвечивать @упоминания</span></label>
          <label class="chk"><input type="checkbox" id="fdsEnabled"><span class="box"></span><span class="lbl">Включено</span></label>
        </div>

        <div class="field">
          <span>Чей ник переливается</span>
          <div class="withbtn">
            <input id="fdsNick" type="text" spellcheck="false" autocomplete="off" placeholder="твой ник в чате">
            <button class="mini" type="button" id="fdsPickMe">Мой ник</button>
          </div>
          <p class="hint" id="fdsNickHint">Впиши ник из чата или нажми «Мой ник».</p>
        </div>

        <div class="foot">
          <button class="btn" type="button" id="fdsReset">Сбросить</button>
          <button class="btn primary" type="button" data-close>Готово</button>
        </div>
      </section>

      <button class="bubble" type="button" hidden aria-label="Открыть настройки переливания" title="Переливание ника">
        <span class="ball"><span class="cat" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" focusable="false">
            <path d="M4.6 10.1 4 4.9c-.05-.55.55-.85.99-.52l3.2 2.4a9.9 9.9 0 0 1 7.62 0l3.2-2.4c.44-.33 1.04-.03.99.52l-.6 5.2c.66 1.1 1.02 2.35 1.02 3.6 0 4.2-3.7 6.7-8.42 6.7S3.58 17.9 3.58 13.7c0-1.25.36-2.5 1.02-3.6Z" fill="currentColor"/>
            <circle cx="9.5" cy="12.1" r="1.15" fill="#f4efe2"/>
            <circle cx="14.5" cy="12.1" r="1.15" fill="#f4efe2"/>
            <path d="M11.3 14.4h1.4L12 15.5Z" fill="#f4efe2"/>
          </svg>
        </span></span>
      </button>
    `;
    document.documentElement.appendChild(host);

    shadow.getElementById('fdsPaints').innerHTML = PAINTS.map((p) =>
      '<button class="paint" type="button" data-paint="' + p.id + '" style="--pp:' + gradientOf(p) + '"' +
        ' title="' + p.name + '" aria-label="' + p.name + '" aria-pressed="false">' +
        '<span class="chip"><b aria-hidden="true">' + p.name + '</b></span>' +
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
  }

  function syncNickUi() {
    if (!shadow) return;
    const label = cfg.nick || PLACEHOLDER;
    shadow.getElementById('fdsSub').textContent = cfg.nick ? 'Ник: ' + cfg.nick : 'Ник не выбран';
    shadow.getElementById('fdsPv').textContent = label;
    const hint = shadow.getElementById('fdsNickHint');
    hint.textContent = cfg.nick
      ? 'Переливается ник «' + cfg.nick + '».'
      : 'Впиши ник из чата или нажми «Мой ник».';
    hint.classList.toggle('ok', !!cfg.nick);
    hint.classList.toggle('warn', !cfg.nick);
  }

  function syncPanel() {
    if (!shadow) return;
    const paint = currentPaint();
    shadow.querySelectorAll('[data-paint]').forEach((b) => {
      const on = b.dataset.paint === cfg.paint;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
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
    shadow.getElementById('fdsNick').value = cfg.nick;
    shadow.getElementById('fdsPv').classList.toggle('off', !cfg.enabled);
    shadow.getElementById('fdsPv').classList.toggle('no-shine', !cfg.shine);
    syncBubble();
  }

  function openPanel() {
    buildPanel();
    const panel = shadow.querySelector('.panel');
    const bubble = shadow.querySelector('.bubble');
    bubble.hidden = true;
    panel.hidden = false;
    syncPanel();
    placePanel();
    if (!cfg.nick) shadow.getElementById('fdsNick').focus();
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
    if (!cfg.nick) {
      const found = detectOwnNick();
      if (found) {
        cfg.nick = found;
        saveCfg();
      }
    }
    refresh();
    loadShared(false);
    if (!TEST) {
      loadCloudPaints();
      scheduleCloudPublish();
    }
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
      if (!document.hidden) loadCloudPaints();
    }, CLOUD_POLL_MS);
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
  };
})();
