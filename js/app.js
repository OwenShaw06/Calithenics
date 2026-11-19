/* Low Orbit — router, transitions, startup */
(function () {
  const LO = window.LO, $ = LO.$, $$ = LO.$$;
  const stage = $('#app'), tabline = $('#tabline');
  let cur = null, navs = 0, busy = 0;
  const scrollMem = {};

  const parseHash = () => {
    let parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    if (!parts.length) parts = ['today'];
    return { name: parts[0], params: parts.slice(1), key: parts.join('/') };
  };
  LO.nav = (h) => { if (location.hash === h) route(); else location.hash = h; };
  LO.acts.back = () => { if (navs > 0) history.back(); else LO.nav('#/today'); };

  const stagger = (el) => $$('.rv', el).forEach((n, i) => n.style.setProperty('--i', Math.min(i, 11)));
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  let lastTab = -1;
  function setChrome(view, depth) {
    document.body.dataset.depth = depth > 0 ? 1 : 0;
    $$('#tabs a').forEach((a) => { const on = +a.dataset.tab === view.tab; a.classList.toggle('on', on); a.setAttribute('aria-current', on ? 'page' : 'false'); });
    tabline.style.transform = 'translateX(' + view.tab * 100 + '%)';
    $('#aurora').style.setProperty('--tabx', view.tab);
    if (lastTab !== -1 && lastTab !== view.tab) { tabline.classList.remove('stretch'); void tabline.offsetWidth; tabline.classList.add('stretch'); }
    lastTab = view.tab;
  }

  function route() {
    const { name, params, key } = parseHash();
    let view = LO.views[name];
    if (!view) { location.replace('#/today'); return; }
    const depth = view.depth(params);
    if (cur && cur.name === name && same(cur.params, params)) { LO.refresh(); return; }
    const first = !cur;
    const prev = cur;
    if (prev) { scrollMem[prev.key] = prev.el.scrollTop; if (prev.view.unmount) prev.view.unmount(prev.el); }

    const el = document.createElement('section');
    el.className = 'view';
    el.innerHTML = view.html(params);
    stagger(el);

    let kind = 'fade';
    if (!first) {
      if (prev.name === name && prev.depth === depth) kind = 'swap';
      else if (depth > prev.depth || (depth === prev.depth && depth > 0)) kind = 'push';
      else if (depth < prev.depth) kind = 'pop';
      else kind = view.tab >= prev.view.tab ? 'dockR' : 'dockL';
    }
    if (kind === 'swap' && prev) {
      // sub-tab change inside the same view: swap content in place
      prev.el.innerHTML = el.innerHTML; prev.params = params; prev.key = key; prev.view = view; prev.depth = depth;
      prev.el.classList.remove('enter'); void prev.el.offsetWidth; prev.el.classList.add('enter');
      prev.el.scrollTop = 0; setChrome(view, depth); view.mount && view.mount(prev.el, params); navs++;
      setTimeout(() => prev.el.classList.remove('enter'), 700);
      return;
    }
    const reduced = LO.reduced();
    if (!first) LO.warp(kind === 'push' ? 0.9 : kind === 'pop' ? 0.5 : 0.75);
    el.classList.add('enter', 'in-' + kind);
    stage.appendChild(el);
    cur = { name, params, key, el, view, depth };
    setChrome(view, depth);
    if (view.mount) view.mount(el, params);
    if (scrollMem[key] && kind === 'pop') el.scrollTop = scrollMem[key];
    if (!first) navs++;

    if (prev) {
      const old = prev.el;
      old.classList.add('out-' + kind); old.setAttribute('aria-hidden', 'true'); old.style.pointerEvents = 'none';
      setTimeout(() => old.remove(), reduced ? 0 : 420);
      if (!reduced && kind.startsWith('dock')) { const sc = $('#scan'); sc.className = ''; void sc.offsetWidth; sc.className = 'go'; }
    }
    setTimeout(() => el.classList.remove('enter', 'in-' + kind), reduced ? 0 : 750);
  }

  LO.refresh = function () {
    if (!cur) return;
    const st = cur.el.scrollTop;
    const a = document.activeElement, keep = a && a.dataset && a.dataset.in ? null : null;
    cur.el.classList.remove('enter');
    cur.el.innerHTML = cur.view.html(cur.params);
    $$('.rv', cur.el).forEach((n) => { n.style.animation = 'none'; });
    cur.el.scrollTop = st;
    if (cur.view.mount) cur.view.mount(cur.el, cur.params);
  };

  window.addEventListener('hashchange', route);

  /* swipe from the left edge to go back on pushed screens (iOS standalone has no back gesture) */
  let sx = 0, sy = 0, tracking = false;
  document.addEventListener('touchstart', (e) => { const t = e.touches[0]; tracking = t.clientX < 22 && document.body.dataset.depth === '1'; sx = t.clientX; sy = t.clientY; }, { passive: true });
  document.addEventListener('touchend', (e) => { if (!tracking) return; const t = e.changedTouches[0]; tracking = false; if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) LO.acts.back(); }, { passive: true });

  /* ---------- startup ---------- */
  function start() {
    LO.starsApply();
    if (!location.hash) location.replace('#/today');
    const run = () => route();
    LO.boot(run);
    if (!LO.storageOk) setTimeout(() => LO.toast('Storage is blocked — data will not be saved'), 1500);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  /* midnight rollover: refresh the Today screen when the app returns to the foreground on a new day */
  let day = LO.ymd();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && LO.ymd() !== day) { day = LO.ymd(); if (cur && cur.name === 'today') LO.refresh(); } });
})();
