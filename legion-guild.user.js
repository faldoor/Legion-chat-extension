// ==UserScript==
// @name         Легион - Гильдийское расширение
// @namespace    https://legiongame.gg/
// @version      1.4.0
// @description  Гильдийское расширение для чата Легиона: красивое анимированное переливание ника, общий список гильдии, настройки у каждого в браузере.
// @author       faldoorch
// @match        https://legiongame.gg/*
// @match        https://play.multidonate.ru/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @updateURL    https://raw.githubusercontent.com/faldoor/legion-guild-extension/main/legion-guild.user.js
// @downloadURL  https://raw.githubusercontent.com/faldoor/legion-guild-extension/main/legion-guild.user.js
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
    if (!cfg.shared) return null;
    const key = cleanNick(value);
    const id = key ? sharedPaints[key] : '';
    return id ? paintById(id) : null;
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
      for (const key of Object.keys(sharedPaints)) set.add(key);
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
      if (!matchesText(elementText(el), set)) {
        el.classList.remove('fds-name');
        decorate(el, null);
      }
    });

    const mark = (el) => {
      decorate(el, paintForNick(elementText(el)));
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
          <div class="hint">Работает только у тебя в браузере · Alt+Shift+F</div>
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
    });
    nick.addEventListener('blur', () => {
      cfg.nick = nick.value.trim();
      nick.value = cfg.nick;
      saveCfg();
      refresh();
      syncNickUi();
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
    });
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
    const count = Object.keys(sharedPaints).length;
    el.classList.remove('ok', 'warn');
    if (!cfg.shared) {
      el.textContent = 'Общий список выключен';
      return;
    }
    if (sharedState === 'loading') {
      el.textContent = 'Общий список: загружаю…';
      return;
    }
    if (sharedState === 'error') {
      el.textContent = count
        ? 'Общий список: ' + count + ' ' + plural(count, 'ник', 'ника', 'ников') + ' (из кэша, нет связи)'
        : 'Общий список не загрузился';
      el.classList.add('warn');
      return;
    }
    if (count) {
      el.textContent = 'Общий список: ' + count + ' ' + plural(count, 'ник', 'ника', 'ников');
      el.classList.add('ok');
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
    if (!cfg.nick) {
      const found = detectOwnNick();
      if (found) {
        cfg.nick = found;
        saveCfg();
      }
    }
    refresh();
    loadShared(false);
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
