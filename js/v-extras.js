/* Low Orbit — Cardio, Mobility runner, Skill tracker */
(function () {
  const LO = window.LO, esc = LO.esc, $ = LO.$;

  /* ================= CARDIO ================= */
  const EFF = ['Very easy', 'Easy', 'Easy', 'Light', 'Moderate', 'Moderate', 'Hard', 'Hard', 'Very hard', 'Max'];
  LO.views.cardio = {
    depth: () => 1, tab: 0,
    html() {
      const S = LO.S, list = S.cardio.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.t || 0) - (a.t || 0))).slice(0, 12);
      const wk = LO.weekStats(LO.monday(LO.ymd()));
      const last = list[0];
      return `<div class="pad" id="cardio">${LO.hdr('Cardio', { kicker: 'LOG', right: '' })}
        ${LO.panel('NEW ENTRY', `<div class="chips wrap" data-grp="type">${LO.CARDIO_TYPES.map((t) => `<button class="chip ${((last && last.type) || 'Run') === t ? 'on' : ''}" data-act="pickType" data-v="${t}">${t}</button>`).join('')}</div>
          <div class="row3">${LO.field('Minutes', LO.numIn('min', '', { ph: '25' }))}${LO.field('Dist (' + S.settings.distUnit + ')', LO.numIn('dist', '', { dec: 1, ph: 'optional' }))}${LO.field('Date', `<input class="in" type="date" name="date" value="${LO.ymd()}">`)}</div>
          <span class="lbl">Effort <b class="mono" id="effl">4 · ${EFF[3]}</b></span>
          <div class="eff" data-grp="eff">${EFF.map((_, i) => `<button class="${i === 3 ? 'on' : ''}" data-act="pickEff" data-v="${i + 1}">${i + 1}</button>`).join('')}</div>
          ${LO.field('Note', '<input class="in" name="note" placeholder="Optional" autocomplete="off">')}
          <button class="btn solid xl" data-act="cardioSave">Log cardio</button>`)}
        ${LO.panel('THIS WEEK', `<div class="stats3"><div><b class="mono">${wk.cardioN}</b><small class="mono">SESSIONS</small></div><div><b class="mono">${wk.cardioMin}</b><small class="mono">MINUTES</small></div><div><b class="mono">${LO.S.cardio.length}</b><small class="mono">ALL TIME</small></div></div>`)}
        ${list.length ? LO.panel('RECENT', list.map((c) => `<button class="lrow" data-act="editEntry" data-type="cardio" data-id="${c.id}"><span class="tag mono">${LO.fmtDs(c.date).toUpperCase()}</span><div><b>${esc(c.type)} · ${c.min} min</b><small class="mono">${c.dist ? c.dist + ' ' + S.settings.distUnit + ' · ' : ''}EFFORT ${c.eff}</small></div><i>›</i></button>`).join('')) : ''}
        <div class="spacer"></div></div>`;
    },
  };
  LO.acts.pickType = (el) => { LO.$$('[data-act="pickType"]', el.parentNode).forEach((b) => b.classList.toggle('on', b === el)); };
  LO.acts.pickEff = (el) => { LO.$$('[data-act="pickEff"]', el.parentNode).forEach((b) => b.classList.toggle('on', b === el)); $('#effl').textContent = el.dataset.v + ' · ' + EFF[+el.dataset.v - 1]; };
  LO.acts.cardioSave = (el) => {
    const r = el.closest('#cardio'), g = (n) => r.querySelector(`[name="${n}"]`).value;
    const type = (r.querySelector('[data-act="pickType"].on') || {}).dataset;
    const eff = (r.querySelector('[data-act="pickEff"].on') || {}).dataset;
    const min = LO.num(g('min'));
    if (!(min > 0)) { LO.toast('Enter the minutes'); return; }
    LO.S.cardio.push({ id: LO.uid(), t: Date.now(), date: g('date') || LO.ymd(), type: type ? type.v : 'Run', min, dist: g('dist') ? LO.num(g('dist')) : '', eff: eff ? +eff.v : 4, note: g('note') });
    LO.save(); LO.chime(); LO.toast('Cardio logged'); LO.refresh();
  };

  /* ================= MOBILITY ================= */
  LO.mobRun = null;
  let mt = 0;
  const CIRC = 2 * Math.PI * 92;
  function mobEnd() { clearInterval(mt); mt = 0; }
  function mobStep(i, keepPause) {
    const m = LO.S.mobility, r = LO.mobRun;
    if (i >= m.length) { mobEnd(); r.done = true; r.finishedAt = Date.now(); LO.chime(); LO.shock(); LO.refresh(); return; }
    r.i = Math.max(0, i); r.remain = m[r.i].s; r.endAt = Date.now() + r.remain * 1000; r.lastBeep = 0;
    if (!keepPause) r.paused = false;
    LO.beep(660, 0.1, 0.1); LO.refresh();
  }
  function mobTick() {
    const r = LO.mobRun; if (!r || r.done) return;
    const s = LO.S.mobility[r.i]; if (!s) return;
    const left = r.paused ? r.remain : (r.endAt - Date.now()) / 1000;
    const t = $('#mt-time'), ring = $('#mt-ring');
    if (t) t.textContent = LO.mmss(Math.ceil(Math.max(0, left)));
    if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - Math.max(0, left) / s.s));
    if (!r.paused && left <= 3 && left > 0 && Math.ceil(left) !== r.lastBeep) { r.lastBeep = Math.ceil(left); LO.beep(520, 0.05, 0.08); }
    if (!r.paused && left <= 0) mobStep(r.i + 1);
  }
  function logMob(min) {
    LO.S.mobLog.push({ id: LO.uid(), t: Date.now(), date: LO.ymd(), min: min || LO.mobTotal() }); LO.save(); LO.toast('Mobility logged');
  }
  LO.views.mobility = {
    depth: () => 1, tab: 0,
    html() {
      const S = LO.S, r = LO.mobRun, m = S.mobility;
      if (r && r.done) return `<div class="pad">${LO.hdr('Routine complete', { kicker: 'MOBILITY' })}<section class="panel rv center"><svg class="bring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" class="r1"/><ellipse cx="60" cy="60" rx="54" ry="20" transform="rotate(-24 60 60)" class="r2" pathLength="1"/><circle cx="96" cy="37" r="3.2" class="rd"/></svg><div class="big">${LO.mobTotal()} minutes done</div><p class="mut">Log it to your history.</p>${r.logged ? '<div class="ok mono">✓ LOGGED</div>' : '<button class="btn solid xl" data-act="mobLog">Log as done</button>'}<button class="btn" data-act="mobExit">Close</button></section></div>`;
      if (r) {
        const s = m[r.i], nx = m[r.i + 1];
        return `<div class="pad runner">${LO.hdr('Mobility', { kicker: 'STEP ' + (r.i + 1) + ' OF ' + m.length, right: `<button class="btn sm" data-act="mobExit">End</button>` })}
          <div class="ringbox rv"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" class="rtrack"/><circle id="mt-ring" cx="100" cy="100" r="92" class="rprog" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC * (1 - (r.paused ? r.remain : (r.endAt - Date.now()) / 1000) / s.s)}" transform="rotate(-90 100 100)"/></svg><div class="rin"><b id="mt-time" class="mono">${LO.mmss(r.remain)}</b><small class="mono">${r.paused ? 'PAUSED' : 'HOLD'}</small></div></div>
          <div class="mstep rv"><h2>${esc(s.n)}</h2><p>${esc(s.cue || '')}</p></div>
          <div class="mctl rv"><button class="btn" data-act="mobPrev" ${r.i === 0 ? 'disabled' : ''}>◀ Back</button><button class="btn solid" data-act="mobPause">${r.paused ? 'Resume' : 'Pause'}</button><button class="btn" data-act="mobNext">Skip ▶</button></div>
          ${nx ? `<div class="next mono rv">NEXT · ${esc(nx.n.toUpperCase())} · ${nx.s}s</div>` : '<div class="next mono rv">LAST STEP</div>'}</div>`;
      }
      const lastLog = S.mobLog.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      return `<div class="pad">${LO.hdr('Mobility', { kicker: LO.mobTotal() + ' MIN ROUTINE' })}
        <button class="btn solid xl rv" data-act="mobStart">Start routine</button>
        ${LO.panel('STEPS', m.map((s, i) => `<div class="mrow"><i class="mono">${i + 1}</i><span>${esc(s.n)}</span><em class="mono">${s.s}s</em></div>`).join('') + '<button class="btn sm" data-act="nav" data-to="#/plan/mob">Edit routine</button>')}
        <button class="btn rv" data-act="mobLogNow">Log as done without running</button>
        ${lastLog ? `<p class="foot mono rv">LAST LOGGED ${LO.fmtD(lastLog.date).toUpperCase()}</p>` : ''}<div class="spacer"></div></div>`;
    },
    mount() { if (LO.mobRun && !LO.mobRun.done) { LO.wantWake = true; LO.wake(true); if (!mt) mt = setInterval(mobTick, 200); } },
    unmount() { if (LO.mobRun && !LO.mobRun.done) { LO.mobRun.paused = true; LO.mobRun.remain = Math.max(0, (LO.mobRun.endAt - Date.now()) / 1000); } mobEnd(); LO.wantWake = false; LO.wake(false); },
  };
  LO.acts.mobStart = () => { if (!LO.S.mobility.length) { LO.toast('Add steps first'); return; } LO.unlockAudio(); LO.mobRun = { i: 0, paused: false, done: false, started: Date.now() }; mobStep(0); };
  LO.acts.mobPause = () => { const r = LO.mobRun; if (r.paused) { r.endAt = Date.now() + r.remain * 1000; r.paused = false; } else { r.remain = Math.max(0, (r.endAt - Date.now()) / 1000); r.paused = true; } LO.refresh(); };
  LO.acts.mobNext = () => mobStep(LO.mobRun.i + 1);
  LO.acts.mobPrev = () => mobStep(LO.mobRun.i - 1);
  LO.acts.mobExit = () => { LO.mobRun = null; mobEnd(); LO.refresh(); };
  LO.acts.mobLog = () => { logMob(); LO.mobRun.logged = true; LO.refresh(); };
  LO.acts.mobLogNow = () => LO.confirm('Log a ' + LO.mobTotal() + ' minute mobility session for today?', 'Log it', () => logMob(), false, 'Log mobility');

  /* ================= SKILLS ================= */
  LO.views.skills = {
    depth: () => 1, tab: 0,
    html() {
      const sk = LO.exList().filter((x) => x.skill);
      const cards = sk.map((x) => {
        const ser = LO.series(x.id), r = LO.records(x.id), last = ser[ser.length - 1];
        return `<section class="panel skill rv"><button class="skh" data-act="nav" data-to="#/ex/${x.id}"><div><b>${esc(LO.exName(x))}</b><small class="mono">${ser.length ? ser.length + ' DAYS LOGGED · LAST ' + LO.fmtDs(last.date).toUpperCase() : 'NO HOLDS LOGGED YET'}</small></div>${LO.spark(ser.slice(-14).map((d) => d.top), { w: 84, h: 30 })}</button>
          <div class="stats3"><div><b class="mono">${r.top ? r.top.r : '—'}</b><small class="mono">BEST HOLD S</small></div><div><b class="mono">${last ? last.top : '—'}</b><small class="mono">LAST S</small></div><div><b class="mono">${ser.length ? LO.fmtN(ser.reduce((a, d) => a + d.total, 0)) : '—'}</b><small class="mono">TOTAL S</small></div></div>
          <button class="btn solid" data-act="logHold" data-id="${x.id}">Log a hold</button></section>`;
      }).join('');
      return `<div class="pad">${LO.hdr('Skills', { kicker: 'HOLD TRACKER' })}${cards || '<div class="empty">No skills yet.</div>'}<button class="btn rv" data-act="newSkill">+ Add a skill</button><div class="spacer"></div></div>`;
    },
  };
  LO.acts.newSkill = () => LO.exerciseForm(null, () => LO.refresh(), { kind: 'hold', skill: true, sets: 5, min: 10, max: 30, inc: 0 });
  LO.acts.logHold = (el) => {
    const ex = LO.S.exercises[el.dataset.id];
    LO.sheet(`<h3>${esc(LO.exName(ex))}</h3><div class="swatch"><b class="mono" id="sw">0.0</b><small class="mono">SECONDS</small></div>
      <button class="btn solid xl" id="swgo">Start stopwatch</button>
      ${LO.field('Or enter the time', LO.numIn('sec', '', { dec: 1, ph: 'seconds' }))}
      <div class="row2"><button class="btn" data-close>Cancel</button><button class="btn solid" data-ok>Save hold</button></div>`, (m) => {
      let t0 = 0, iv = 0, secs = 0;
      const go = $('#swgo', m), disp = $('#sw', m), inp = m.querySelector('[name="sec"]');
      const stop = () => { clearInterval(iv); iv = 0; };
      go.onclick = () => {
        LO.unlockAudio();
        if (iv) { stop(); secs = (Date.now() - t0) / 1000; inp.value = secs.toFixed(1); go.textContent = 'Start again'; LO.beep(880, 0.1, 0.1); }
        else { t0 = Date.now(); go.textContent = 'Stop'; iv = setInterval(() => { if (!document.body.contains(m)) { stop(); return; } disp.textContent = ((Date.now() - t0) / 1000).toFixed(1); }, 100); }
      };
      $('[data-ok]', m).onclick = () => {
        stop();
        const sec = LO.num(inp.value);
        if (!(sec > 0)) { LO.toast('Time a hold or enter seconds'); return; }
        LO.S.holds.push({ id: LO.uid(), t: Date.now(), date: LO.ymd(), ex: ex.id, sec: LO.round1(sec), name: LO.exName(ex), step: ex.step });
        LO.save(); LO.closeSheet(m); LO.chime(); LO.toast('Hold logged'); LO.refresh();
      };
    });
  };
})();
