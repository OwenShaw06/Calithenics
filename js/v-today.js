/* Low Orbit — Today */
(function () {
  const LO = window.LO, esc = LO.esc;

  LO.hdr = (title, o = {}) => `<header class="hdr rv">${o.back === false ? '' : `<button class="ib" data-act="back" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>`}<div class="ht"><small class="mono">${esc(o.kicker || '')}</small><h1>${esc(title)}</h1></div><div class="hr">${o.right || ''}</div></header>`;
  LO.panel = (title, body, o = {}) => `<section class="panel rv ${o.cls || ''}">${title ? `<div class="ph"><span class="mono">${esc(title)}</span>${o.right || ''}</div>` : ''}${body}</section>`;

  const CODE = { cardio: 'CAR', mobility: 'MOB', skill: 'SKL', flex: 'FLX', rest: '—' };
  const doneDate = (d) => LO.activityOn(d).some((a) => a.type !== 'body');

  LO.startBurn = function (wid, btn, date) {
    const S = LO.S;
    if (S.active) { LO.nav('#/workout'); return; }
    const sess = LO.makeSession(wid, date || LO.ymd());
    S.active = sess; LO.save();
    const go = () => LO.nav('#/workout');
    if (S.settings.countdown !== false && !LO.reduced()) LO.launch(sess, btn, go); else LO.ignite(btn, go);
  };
  const estMin = (w) => Math.round(w.items.reduce((a, i) => { const e = LO.S.exercises[i.ex]; if (!e) return a; const work = e.kind === 'hold' ? i.max : i.max * 3 + 10; return a + i.sets * (work + (e.rest || 75)); }, 0) / 60);

  function todayCard(p, today) {
    const S = LO.S;
    const act = S.active;
    const doneToday = S.sessions.filter((s) => s.date === today && LO.sessionStats(s).sets > 0);
    let kicker = p.swapped ? 'SWAPPED · TODAY' : 'SCHEDULED · TODAY';
    let body = '';
    if (act) {
      const st = LO.sessionStats(act);
      body = `<div class="big">${esc(act.name)}</div><div class="sub mono">BURN IN PROGRESS · ${st.sets} SETS LOGGED</div>
        <button class="btn solid xl" data-act="resume">Resume burn</button>`;
      kicker = 'IN FLIGHT';
    } else if (p.k === 'workout') {
      const w = S.workouts[p.ref];
      const nSets = w.items.reduce((a, i) => a + i.sets, 0);
      body = `<div class="kick mono">BURN ${esc(String(p.ref).toUpperCase())} · PRE-FLIGHT</div><div class="big">${esc(w.name)}</div>
        <div class="mfst mono"><div><b>${w.items.length}</b><small>STAGES</small></div><div><b>${nSets}</b><small>SETS</small></div><div><b>~${estMin(w)}</b><small>MIN</small></div></div>
        <ul class="exl">${w.items.map((i, n) => { const e = S.exercises[i.ex]; return e ? `<li style="--n:${n}"><em class="mono">S${n + 1}</em><span>${esc(LO.exName(e))}</span><i class="mono">${i.sets}×${i.min === i.max ? i.min : i.min + '–' + i.max}${e.kind === 'hold' ? 's' : ''}</i></li>` : ''; }).join('')}</ul>
        <button class="btn solid xl ignite-btn" data-act="start" data-w="${esc(p.ref)}"><svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z"/></svg>Start burn</button>`;
    } else if (p.k === 'cardio') {
      body = `<div class="big">Easy cardio</div><div class="sub mono">20–30 MIN · CONVERSATIONAL PACE</div><button class="btn solid xl" data-act="nav" data-to="#/cardio">Log cardio</button>`;
    } else if (p.k === 'mobility') {
      body = `<div class="big">Mobility only</div><div class="sub mono">${LO.mobTotal()} MIN ROUTINE</div><button class="btn solid xl" data-act="nav" data-to="#/mobility">Start routine</button>`;
    } else if (p.k === 'skill') {
      body = `<div class="big">Skill session</div><div class="sub mono">HOLDS · PROGRESSIONS</div><button class="btn solid xl" data-act="nav" data-to="#/skills">Open skill tracker</button>`;
    } else if (p.k === 'flex') {
      body = `<div class="big">Optional day</div><div class="sub mono">CARDIO OR SKILLS — YOUR CALL</div><div class="row2"><button class="btn solid" data-act="nav" data-to="#/cardio">Cardio</button><button class="btn solid" data-act="nav" data-to="#/skills">Skills</button></div>`;
    } else {
      body = `<div class="big">Rest day</div><div class="sub mono">RECOVERY IS PART OF THE PLAN</div>`;
    }
    const done = doneToday.length && !act ? `<div class="donebar mono">✓ BURN LOGGED TODAY · ${doneToday.map((s) => esc(s.name)).join(', ').toUpperCase()}</div>` : '';
    return `<section class="panel hero rv">
      <svg class="orb" viewBox="0 0 240 240" aria-hidden="true"><defs><radialGradient id="pg" cx="35%" cy="30%"><stop offset="0" stop-color="#9ff5e6" stop-opacity=".55"/><stop offset="1" stop-color="#62e6d2" stop-opacity=".04"/></radialGradient></defs>
        <circle cx="120" cy="120" r="54" fill="url(#pg)" class="plan"/>
        <g class="ticks"><circle cx="120" cy="120" r="108" class="tk"/></g>
        <g class="spin"><ellipse cx="120" cy="120" rx="104" ry="38" transform="rotate(-24 120 120)"/><circle cx="196" cy="76" r="3.6" class="sat"/></g>
        <g class="spin2"><ellipse cx="120" cy="120" rx="84" ry="84" class="r2"/><circle cx="120" cy="36" r="2.4" class="sat2"/></g></svg>
      <div class="ph"><span class="mono">${kicker}</span></div>${body}
      <div class="row2 tight"><button class="btn ghost" data-act="swap">Swap day</button>${p.k === 'workout' && !act ? `<button class="btn ghost" data-act="startEmpty">Empty burn</button>` : `<button class="btn ghost" data-act="nav" data-to="#/plan">Flight plan</button>`}</div>
      ${done}</section>`;
  }

  LO.views.today = {
    depth: () => 0, tab: 0,
    html() {
      const S = LO.S, today = LO.ymd(), p = LO.planFor(today);
      const mon = LO.monday(today);
      const strip = LO.DAYS.map((dn, i) => {
        const d = LO.addDays(mon, i), pl = LO.planFor(d);
        const code = pl.k === 'workout' ? pl.ref : CODE[pl.k];
        return `<button class="dc ${d === today ? 'now' : ''} ${doneDate(d) ? 'done' : ''}" data-act="goDay" data-d="${d}"><small class="mono">${dn.toUpperCase()}</small><b class="mono">${esc(String(code).slice(0, 3))}</b><i></i></button>`;
      }).join('');
      const ws = LO.weekStats(mon), pw = LO.weekStats(LO.addDays(mon, -7));
      const dlt = (a, b) => (b ? `<em class="${a >= b ? 'up' : 'dn'}">${a >= b ? '+' : ''}${LO.fmtN(a - b)} vs last wk</em>` : '<em>first week on record</em>');
      const traj = LO.keyMoves.map(([id, label]) => {
        const t = LO.trajectory(id);
        const cur = t.best || t.base || 0, base = t.base || 0, dd = t.best ? t.best - base : 0;
        return `<button class="trow" data-act="nav" data-to="#/ex/${id}"><div><b>${label}</b><small class="mono">${base ? 'START ' + base : 'NO BASELINE'}</small></div>${LO.spark(t.pts.map((x) => x.v), { w: 96, h: 30 })}<div class="tn mono"><b>${cur || '—'}</b><em class="${dd > 0 ? 'up' : dd < 0 ? 'dn' : ''}">${t.best ? (dd >= 0 ? '+' : '') + dd : 'no data'}</em></div></button>`;
      }).join('');
      const dt = new Date();
      return `<div class="pad">
        <header class="top rv"><div><small class="mono">LOW ORBIT · FLIGHT DECK</small><h1>${LO.DAYS_L[LO.dow(today)]}</h1></div><div class="clock mono"><b>${dt.getDate()}</b><span>${LO.MONTHS[dt.getMonth()].toUpperCase()}</span></div></header>
        ${todayCard(p, today)}
        ${LO.panel('THIS WEEK', `<div class="strip">${strip}</div>`)}
        ${LO.panel('TRAJECTORY', `<div class="traj">${traj}</div><p class="foot mono">Best reps in a single set, all time. Start values are your stated baseline.</p>`)}
        ${LO.panel('WEEK SO FAR', `<div class="stats3"><div><b class="mono" data-count="${ws.sessions}">0</b><small class="mono">BURNS</small></div><div><b class="mono" data-count="${ws.sets}">0</b><small class="mono">SETS</small></div><div><b class="mono" ${ws.vol > 0 ? `data-count="${Math.round(ws.vol)}"` : ''}>${ws.vol > 0 ? 0 : LO.fmtVol(0)}</b><small class="mono">VOLUME LB</small></div></div><div class="deltas mono">${dlt(ws.sets, pw.sets)}</div>`, { right: `<button class="lnk mono" data-act="nav" data-to="#/progress/week">DETAIL ›</button>` })}
        <div class="tiles rv">
          <button class="tile" data-act="nav" data-to="#/cardio"><svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg><span>Cardio</span></button>
          <button class="tile" data-act="nav" data-to="#/mobility"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 7v6M6 10l6 2 6-2M9 21l3-8 3 8"/></svg><span>Mobility</span></button>
          <button class="tile" data-act="nav" data-to="#/skills"><svg viewBox="0 0 24 24"><path d="M5 20h14M8 20V9l4-5 4 5v11"/></svg><span>Skills</span></button>
          <button class="tile" data-act="nav" data-to="#/progress/body"><svg viewBox="0 0 24 24"><path d="M12 3v18M6 8h12M5 21h14"/></svg><span>Body wt</span></button>
        </div>
      </div>`;
    },
    mount(el) { LO.countUp(el); },
  };

  LO.mobTotal = () => Math.round(LO.S.mobility.reduce((a, m) => a + m.s, 0) / 60);

  /* ---- actions ---- */
  LO.acts.nav = (el) => LO.nav(el.dataset.to);
  LO.acts.start = (el) => LO.startBurn(el.dataset.w, el);
  LO.acts.resume = () => LO.nav('#/workout');
  LO.acts.startEmpty = (el) => { const sess = LO.makeSession(null, LO.ymd()); LO.S.active = sess; LO.save(); LO.ignite(el, () => LO.nav('#/workout')); };
  LO.acts.goDay = (el) => { LO.histSel = el.dataset.d; LO.nav('#/history'); };
  LO.acts.swap = function () {
    const S = LO.S, today = LO.ymd();
    const ws = Object.values(S.workouts).map((w) => `<button class="pitem" data-k="workout" data-ref="${esc(w.id)}"><b>${esc(w.name)}</b><small class="mono">${w.items.length} EXERCISES</small></button>`).join('');
    LO.sheet(`<h3>Swap today</h3><p class="mut">Changes today only. The weekly schedule stays as planned.</p><div class="plist">${ws}
      <button class="pitem" data-k="cardio"><b>Easy cardio</b></button><button class="pitem" data-k="mobility"><b>Mobility</b></button><button class="pitem" data-k="skill"><b>Skill session</b></button><button class="pitem" data-k="rest"><b>Rest</b></button></div>
      ${S.overrides[today] ? '<button class="btn" data-reset>Back to the schedule</button>' : ''}`, (el, api) => {
      el.onclick = (e) => {
        const b = e.target.closest('[data-k]');
        if (b) { S.overrides[today] = b.dataset.k === 'workout' ? { k: 'workout', ref: b.dataset.ref } : { k: b.dataset.k }; LO.save(); api.close(); LO.refresh(); }
        if (e.target.closest('[data-reset]')) { delete S.overrides[today]; LO.save(); api.close(); LO.refresh(); }
      };
    });
  };
})();
