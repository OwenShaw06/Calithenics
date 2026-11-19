/* Low Orbit — UI primitives: sheets, toast, confirm, rest timer, forms, delegated events */
(function () {
  const LO = window.LO, $ = LO.$, esc = LO.esc;

  /* ---------- toast ---------- */
  let tt;
  LO.toast = function (msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ---------- sheets ---------- */
  LO.sheet = function (html, mount) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="backdrop" data-close></div><div class="sheet" role="dialog" aria-modal="true"><i class="grab"></i>${html}</div>`;
    $('#sheets').appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('in'));
    let closed = false;
    const api = {
      el: wrap.querySelector('.sheet'),
      close() {
        if (closed) return; closed = true;
        wrap.classList.remove('in'); wrap.classList.add('out');
        setTimeout(() => wrap.remove(), LO.reduced() ? 0 : 260);
      },
    };
    wrap._api = api;
    if (mount) mount(api.el, api);
    return api;
  };
  LO.closeSheet = (el) => { const w = el.closest('.sheet-wrap'); if (w && w._api) w._api.close(); };
  LO.confirm = function (msg, okLabel, cb, danger = true, title = 'Confirm') {
    LO.sheet(`<h3>${esc(title)}</h3><p class="mut">${msg}</p><div class="row2"><button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'solid'}" data-ok>${esc(okLabel)}</button></div>`, (el, api) => {
      $('[data-ok]', el).onclick = () => { api.close(); cb(); };
    });
  };

  /* ---------- rest timer ---------- */
  const bar = $('#restbar');
  LO.rest = null;
  let rt = 0;
  LO.restStart = function (sec) {
    LO.rest = { end: Date.now() + sec * 1000, total: sec, fired: false };
    bar.classList.remove('hide', 'done'); bar.classList.add('show');
    if (!rt) rt = setInterval(restTick, 250);
    restTick();
  };
  LO.restStop = function () {
    LO.rest = null; clearInterval(rt); rt = 0;
    bar.classList.remove('show', 'done');
    setTimeout(() => { if (!LO.rest) bar.classList.add('hide'); }, 300);
  };
  function restTick() {
    if (!LO.rest) return;
    const left = (LO.rest.end - Date.now()) / 1000;
    $('#rb-time').textContent = left > 0 ? LO.mmss(Math.ceil(left)) : 'GO';
    bar.querySelector('.rb-fill').style.transform = 'scaleX(' + Math.max(0, Math.min(1, left / LO.rest.total)) + ')';
    if (left <= 0 && !LO.rest.fired) {
      LO.rest.fired = true; bar.classList.add('done');
      LO.chime();
      setTimeout(() => { if (LO.rest && LO.rest.fired) LO.restStop(); }, 6000);
    } else if (left > 0 && left <= 3 && Math.ceil(left) !== LO.rest.lastBeep) { LO.rest.lastBeep = Math.ceil(left); LO.beep(520, 0.05, 0.08); }
  }
  LO.acts.restAdd = (el) => { if (LO.rest) { LO.rest.end += LO.num(el.dataset.n) * 1000; LO.rest.total = Math.max(LO.rest.total, (LO.rest.end - Date.now()) / 1000); LO.rest.fired = false; bar.classList.remove('done'); restTick(); } };
  LO.acts.restSkip = () => LO.restStop();

  /* ---------- form helpers ---------- */
  LO.field = (label, inner, cls = '') => `<label class="fld ${cls}"><span class="lbl">${esc(label)}</span>${inner}</label>`;
  LO.numIn = (name, val, o = {}) => `<input class="in" type="text" inputmode="${o.dec ? 'decimal' : 'numeric'}" name="${name}" value="${esc(val ?? '')}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} autocomplete="off">`;

  /* ---------- exercise form / picker ---------- */
  LO.exerciseForm = function (ex, cb, preset) {
    const S = LO.S, isNew = !ex;
    const e = ex || Object.assign({ name: '', kind: 'reps', sets: 3, min: 8, max: 12, w: 0, inc: 5, weighted: false, bwf: 0, ladder: null, step: 0, rest: 75, side: false, skill: false, note: '' }, preset || {});
    const lad = Object.entries(S.ladders).map(([id, l]) => `<option value="${id}" ${e.ladder === id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
    LO.sheet(`<h3>${isNew ? 'New exercise' : 'Edit exercise'}</h3>
      ${LO.field('Name', `<input class="in" name="name" value="${esc(e.name)}" placeholder="e.g. Ring row" autocomplete="off">`)}
      <div class="row2">${LO.field('Tracks', `<select class="in" name="kind"><option value="reps" ${e.kind === 'reps' ? 'selected' : ''}>Reps</option><option value="hold" ${e.kind === 'hold' ? 'selected' : ''}>Hold time (s)</option></select>`)}
      ${LO.field('Rest (sec)', LO.numIn('rest', e.rest))}</div>
      <div class="row3">${LO.field('Sets', LO.numIn('sets', e.sets))}${LO.field('Min', LO.numIn('min', e.min))}${LO.field('Max', LO.numIn('max', e.max))}</div>
      <div class="row2">${LO.field('Weight step (lb)', LO.numIn('inc', e.inc, { dec: 1 }))}${LO.field('Bodyweight share', LO.numIn('bwf', e.bwf, { dec: 1 }))}</div>
      ${LO.field('Progression line', `<select class="in" name="ladder"><option value="">None</option>${lad}</select>`)}
      <div class="checks">
        <label class="chk"><input type="checkbox" name="weighted" ${e.weighted ? 'checked' : ''}><span>Uses added weight</span></label>
        <label class="chk"><input type="checkbox" name="side" ${e.side ? 'checked' : ''}><span>Per side</span></label>
        <label class="chk"><input type="checkbox" name="skill" ${e.skill ? 'checked' : ''}><span>Skill (shows in Skill tracker)</span></label>
      </div>
      <div class="row2"><button class="btn" data-close>Cancel</button><button class="btn solid" data-ok>Save</button></div>`, (el, api) => {
      $('[data-ok]', el).onclick = () => {
        const g = (n) => el.querySelector(`[name="${n}"]`);
        const name = g('name').value.trim();
        if (!name) { LO.toast('Give it a name'); return; }
        const o = { name, kind: g('kind').value, rest: Math.max(0, LO.num(g('rest').value, 75)), sets: Math.max(1, LO.num(g('sets').value, 3) | 0), min: Math.max(1, LO.num(g('min').value, 8) | 0), max: Math.max(1, LO.num(g('max').value, 12) | 0), inc: Math.max(0, LO.num(g('inc').value, 5)), bwf: Math.max(0, Math.min(1.5, LO.num(g('bwf').value, 0))), ladder: g('ladder').value || null, weighted: g('weighted').checked, side: g('side').checked, skill: g('skill').checked };
        if (o.max < o.min) o.max = o.min;
        let out = ex;
        if (isNew) { out = Object.assign({ id: 'x_' + LO.uid(), w: 0, step: 0, note: '' }, o); S.exercises[out.id] = out; }
        else { if (o.ladder !== ex.ladder) ex.step = 0; Object.assign(ex, o); }
        LO.save(); api.close(); cb && cb(out);
      };
    });
  };

  LO.pickExercise = function (cb, title = 'Choose exercise') {
    const S = LO.S;
    LO.sheet(`<h3>${esc(title)}</h3>
      <input class="in search" placeholder="Search exercises" autocomplete="off" aria-label="Search exercises">
      <div class="plist"></div>
      <button class="btn" data-new>+ Create custom exercise</button>`, (el, api) => {
      const list = $('.plist', el);
      const draw = (q = '') => {
        const items = LO.exList().filter((x) => (x.name + ' ' + LO.exName(x)).toLowerCase().includes(q.toLowerCase()));
        list.innerHTML = items.map((x) => `<button class="pitem" data-id="${x.id}"><b>${esc(LO.exName(x))}</b><small class="mono">${x.kind === 'hold' ? x.sets + ' × ' + x.min + '–' + x.max + ' s' : x.sets + ' × ' + x.min + '–' + x.max}${x.skill ? ' · skill' : ''}</small></button>`).join('') || '<div class="empty">No match.</div>';
      };
      draw();
      $('.search', el).oninput = (e) => draw(e.target.value);
      list.onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { api.close(); cb(b.dataset.id); } };
      $('[data-new]', el).onclick = () => { api.close(); LO.exerciseForm(null, (x) => cb(x.id)); };
    });
  };

  /* ---------- delegated events ---------- */
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]');
    if (c && c.closest('.sheet-wrap')) { LO.closeSheet(c); return; }
    const t = e.target.closest('[data-act]');
    if (t) { const f = LO.acts[t.dataset.act]; if (f) f(t, e); }
  });
  const inh = (e) => { const t = e.target.closest('[data-in]'); if (t) { const f = LO.ins[t.dataset.in]; if (f) f(t, e); } };
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.btn, .chip, .tile, .ib, .ck, .seg button, .dc, .cd, .rb-btns button');
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--rx', (e.clientX - r.left) + 'px'); t.style.setProperty('--ry', (e.clientY - r.top) + 'px');
    t.classList.remove('rip'); void t.offsetWidth; t.classList.add('rip');
  }, { passive: true });
  document.addEventListener('animationend', (e) => { if (e.animationName === 'ripple') e.target.classList.remove('rip'); });
  document.addEventListener('input', inh);
  document.addEventListener('change', inh);
  document.addEventListener('focusin', (e) => { const t = e.target; if (t.matches && t.matches('input.num') && t.select) setTimeout(() => t.select(), 0); });
})();
