/* Low Orbit — Flight Plan: schedule, workouts, exercise library, progression lines, mobility routine */
(function () {
  const LO = window.LO, esc = LO.esc;

  const optVal = (d) => (d.k === 'workout' ? 'workout:' + d.ref : d.k === 'alt' ? 'alt:' + d.refs.join(',') : d.k);
  function schedOptions(cur) {
    const S = LO.S, ws = Object.values(S.workouts);
    let o = '';
    ws.forEach((w) => { o += `<option value="workout:${esc(w.id)}">${esc(w.name)}</option>`; });
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) o += `<option value="alt:${esc(ws[i].id)},${esc(ws[j].id)}">Alternate ${esc(ws[i].name)} / ${esc(ws[j].name)}</option>`;
    o += '<option value="cardio">Easy cardio</option><option value="mobility">Mobility</option><option value="skill">Skill session</option><option value="flex">Cardio or skills (optional)</option><option value="rest">Rest</option>';
    return o.replace(`value="${cur}"`, `value="${cur}" selected`);
  }
  const sub = (p) => p[0] || '';

  LO.views.plan = {
    depth: (p) => (p[0] ? 1 : 0), tab: 3,
    html(p) {
      const S = LO.S, s = sub(p);
      if (s === 'w') return wEditor(p[1]);
      if (s === 'lib') return lib();
      if (s === 'ladders') return ladders();
      if (s === 'mob') return mob();
      const sched = S.week.map((d, i) => `<div class="srow"><b class="mono">${LO.DAYS[i].toUpperCase()}</b><select class="in" data-in="sched" data-i="${i}" aria-label="${LO.DAYS_L[i]}">${schedOptions(optVal(d))}</select></div>`).join('');
      const hasAlt = S.week.some((d) => d.k === 'alt');
      const ws = Object.values(S.workouts).map((w) => `<button class="lrow" data-act="nav" data-to="#/plan/w/${esc(w.id)}"><div><b>${esc(w.name)}</b><small class="mono">${w.items.length} EXERCISES · ${w.items.reduce((a, i) => a + i.sets, 0)} SETS</small></div><i>›</i></button>`).join('');
      return `<div class="pad"><header class="top rv"><div><small class="mono">MISSION PLAN</small><h1>Flight Plan</h1></div></header>
        ${LO.panel('WEEKLY SCHEDULE', sched + (hasAlt ? `<p class="foot mono">Alternating days swap each week. This week gives <b>${esc(LO.planFor(LO.addDays(LO.monday(LO.ymd()), S.week.findIndex((d) => d.k === 'alt'))).label)}</b>.</p><button class="btn sm" data-act="flipAlt">Flip the A/B phase</button>` : ''))}
        ${LO.panel('WORKOUTS', ws + '<button class="btn" data-act="newWorkout">+ New workout</button>')}
        ${LO.panel('TOOLKIT', `<button class="lrow" data-act="nav" data-to="#/plan/lib"><div><b>Exercise library</b><small class="mono">${LO.exList().length} EXERCISES · CREATE YOUR OWN</small></div><i>›</i></button>
          <button class="lrow" data-act="nav" data-to="#/plan/ladders"><div><b>Progression lines</b><small class="mono">PUSH-UP, PULL-UP, FRONT LEVER…</small></div><i>›</i></button>
          <button class="lrow" data-act="nav" data-to="#/plan/mob"><div><b>Mobility routine</b><small class="mono">${S.mobility.length} STEPS · ${LO.mobTotal()} MIN</small></div><i>›</i></button>`)}
        <div class="spacer"></div></div>`;
    },
  };
  LO.ins.sched = (el) => {
    const v = el.value, i = +el.dataset.i;
    LO.S.week[i] = v.startsWith('workout:') ? { k: 'workout', ref: v.slice(8) } : v.startsWith('alt:') ? { k: 'alt', refs: v.slice(4).split(',') } : { k: v };
    LO.save(); LO.toast('Schedule updated');
  };
  LO.acts.flipAlt = () => { const s = LO.S.settings; s.anchor = LO.addDays(s.anchor, 7); LO.save(); LO.toast('Alternation flipped'); LO.refresh(); };
  LO.acts.newWorkout = () => {
    LO.sheet(`<h3>New workout</h3>${LO.field('Name', '<input class="in" name="n" placeholder="e.g. Workout C" autocomplete="off">')}<div class="row2"><button class="btn" data-close>Cancel</button><button class="btn solid" data-ok>Create</button></div>`, (el, api) => {
      el.querySelector('[data-ok]').onclick = () => {
        const n = el.querySelector('[name="n"]').value.trim(); if (!n) { LO.toast('Give it a name'); return; }
        const id = 'w' + LO.uid(); LO.S.workouts[id] = { id, name: n, items: [] }; LO.save(); api.close(); LO.nav('#/plan/w/' + id);
      };
    });
  };

  /* ---------- workout editor ---------- */
  function wEditor(id) {
    const w = LO.S.workouts[id];
    if (!w) return `<div class="pad">${LO.hdr('Not found')}<div class="panel"><p class="mut">That workout is gone.</p></div></div>`;
    const items = w.items.map((it, i) => {
      const e = LO.S.exercises[it.ex];
      return `<div class="wi" data-i="${i}"><div class="wih"><b>${e ? esc(LO.exName(e)) : 'Removed exercise'}</b><div class="wib"><button class="ib sm" data-act="wiMove" data-id="${id}" data-i="${i}" data-d="-1" aria-label="Move up"><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg></button><button class="ib sm" data-act="wiMove" data-id="${id}" data-i="${i}" data-d="1" aria-label="Move down"><svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg></button><button class="ib sm" data-act="wiDel" data-id="${id}" data-i="${i}" aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div></div>
        <div class="row3 tight">${LO.field('Sets', LO.numIn('s', it.sets).replace('name="s"', `data-in="wi" data-f="sets" data-id="${id}" data-i="${i}"`))}${LO.field('Min', LO.numIn('a', it.min).replace('name="a"', `data-in="wi" data-f="min" data-id="${id}" data-i="${i}"`))}${LO.field('Max', LO.numIn('b', it.max).replace('name="b"', `data-in="wi" data-f="max" data-id="${id}" data-i="${i}"`))}</div></div>`;
    }).join('');
    return `<div class="pad">${LO.hdr(w.name, { kicker: 'EDIT WORKOUT', right: `<button class="ib" data-act="delWorkout" data-id="${id}" aria-label="Delete workout"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>` })}
      ${LO.panel('', LO.field('Name', `<input class="in" value="${esc(w.name)}" data-in="wName" data-id="${id}" autocomplete="off">`))}
      ${LO.panel('EXERCISES', (items || '<div class="empty">No exercises yet.</div>') + `<button class="btn" data-act="wiAdd" data-id="${id}">+ Add exercise</button>`)}
      <p class="foot mono rv">Range = reps (or seconds for holds). When you hit the top of the range on every set, the app suggests the next step up.</p><div class="spacer"></div></div>`;
  }
  LO.ins.wName = (el) => { LO.S.workouts[el.dataset.id].name = el.value; LO.save(); };
  LO.ins.wi = (el) => { const it = LO.S.workouts[el.dataset.id].items[+el.dataset.i]; it[el.dataset.f] = Math.max(1, LO.num(el.value, 1) | 0); LO.save(); };
  LO.acts.wiMove = (el) => { const a = LO.S.workouts[el.dataset.id].items, i = +el.dataset.i, j = i + LO.num(el.dataset.d); if (j >= 0 && j < a.length) { [a[i], a[j]] = [a[j], a[i]]; LO.save(); LO.refresh(); } };
  LO.acts.wiDel = (el) => { LO.S.workouts[el.dataset.id].items.splice(+el.dataset.i, 1); LO.save(); LO.refresh(); };
  LO.acts.wiAdd = (el) => LO.pickExercise((x) => { const e = LO.S.exercises[x]; LO.S.workouts[el.dataset.id].items.push({ ex: x, sets: e.sets, min: e.min, max: e.max }); LO.save(); LO.refresh(); }, 'Add to workout');
  LO.acts.delWorkout = (el) => LO.confirm('Delete this workout? Past burns stay in History.', 'Delete', () => {
    const id = el.dataset.id; delete LO.S.workouts[id];
    LO.S.week = LO.S.week.map((d) => (d.k === 'workout' && d.ref === id) || (d.k === 'alt' && d.refs.includes(id)) ? { k: 'rest' } : d);
    LO.save(); history.back();
  });

  /* ---------- library ---------- */
  function lib() {
    const rows = LO.exList().map((x) => `<button class="lrow" data-act="libEdit" data-id="${x.id}"><div><b>${esc(LO.exName(x))}</b><small class="mono">${x.sets} × ${x.min}–${x.max}${x.kind === 'hold' ? ' S' : ''} · REST ${LO.mmss(x.rest)}${x.skill ? ' · SKILL' : ''}${x.id.startsWith('x_') ? ' · CUSTOM' : ''}</small></div><i>›</i></button>`).join('');
    return `<div class="pad">${LO.hdr('Exercise library', { kicker: 'FLIGHT PLAN' })}${LO.panel('', rows)}<button class="btn solid xl rv" data-act="libNew">+ New exercise</button><div class="spacer"></div></div>`;
  }
  LO.acts.libNew = () => LO.exerciseForm(null, () => LO.refresh());
  LO.acts.libEdit = (el) => {
    const x = LO.S.exercises[el.dataset.id];
    LO.sheet(`<h3>${esc(x.name)}</h3><div class="plist"><button class="pitem" data-m="edit"><b>Edit settings</b></button><button class="pitem" data-m="chart"><b>Charts and history</b></button><button class="pitem danger" data-m="del"><b>Delete exercise</b><small class="mono">PAST LOGS KEEP THEIR NAME</small></button></div>`, (m, api) => {
      m.onclick = (ev) => {
        const b = ev.target.closest('[data-m]'); if (!b) return; api.close();
        if (b.dataset.m === 'edit') LO.exerciseForm(x, () => LO.refresh());
        if (b.dataset.m === 'chart') LO.nav('#/ex/' + x.id);
        if (b.dataset.m === 'del') LO.confirm('Delete “' + esc(x.name) + '” from the library and from every workout?', 'Delete', () => { delete LO.S.exercises[x.id]; Object.values(LO.S.workouts).forEach((w) => { w.items = w.items.filter((i) => i.ex !== x.id); }); LO.save(); LO.refresh(); });
      };
    });
  };

  /* ---------- ladders ---------- */
  function ladders() {
    const L = LO.S.ladders;
    const ps = Object.entries(L).map(([id, l]) => LO.panel('', `<div class="row2 end">${LO.field('Line name', `<input class="in" value="${esc(l.name)}" data-in="ladName" data-id="${id}" autocomplete="off">`, 'grow')}<button class="ib" data-act="ladDel" data-id="${id}" aria-label="Delete line"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></div>
      ${l.steps.map((s, i) => `<div class="stp"><i class="mono">${i + 1}</i><input class="in" value="${esc(s.n)}" data-in="ladStep" data-id="${id}" data-i="${i}" autocomplete="off" aria-label="Step name"><label class="chk mini" title="Uses added weight"><input type="checkbox" data-in="ladW" data-id="${id}" data-i="${i}" ${s.w ? 'checked' : ''}><span>+WT</span></label><button class="ib sm" data-act="ladMove" data-id="${id}" data-i="${i}" data-d="-1" aria-label="Up"><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg></button><button class="ib sm" data-act="ladRm" data-id="${id}" data-i="${i}" aria-label="Remove step"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('')}
      <button class="btn sm" data-act="ladAdd" data-id="${id}">+ Add step</button>`)).join('');
    return `<div class="pad">${LO.hdr('Progression lines', { kicker: 'FLIGHT PLAN' })}<p class="mut rv">Order steps from easiest to hardest. Link a line to an exercise in the exercise settings, then advance along it from the exercise page or mid-burn.</p>${ps}<button class="btn solid xl rv" data-act="ladNew">+ New line</button><div class="spacer"></div></div>`;
  }
  LO.ins.ladName = (el) => { LO.S.ladders[el.dataset.id].name = el.value; LO.save(); };
  LO.ins.ladStep = (el) => { LO.S.ladders[el.dataset.id].steps[+el.dataset.i].n = el.value; LO.save(); };
  LO.ins.ladW = (el) => { LO.S.ladders[el.dataset.id].steps[+el.dataset.i].w = el.checked ? 1 : 0; LO.save(); };
  LO.acts.ladAdd = (el) => { LO.S.ladders[el.dataset.id].steps.push({ n: 'New step' }); LO.save(); LO.refresh(); };
  LO.acts.ladRm = (el) => { const l = LO.S.ladders[el.dataset.id]; if (l.steps.length <= 1) { LO.toast('A line needs at least one step'); return; } l.steps.splice(+el.dataset.i, 1); LO.exList().forEach((x) => { if (x.ladder === el.dataset.id && x.step >= l.steps.length) x.step = l.steps.length - 1; }); LO.save(); LO.refresh(); };
  LO.acts.ladMove = (el) => { const a = LO.S.ladders[el.dataset.id].steps, i = +el.dataset.i, j = i + LO.num(el.dataset.d); if (j >= 0) { [a[i], a[j]] = [a[j], a[i]]; LO.save(); LO.refresh(); } };
  LO.acts.ladNew = () => { LO.S.ladders['l' + LO.uid()] = { name: 'New line', steps: [{ n: 'Step 1' }, { n: 'Step 2' }] }; LO.save(); LO.refresh(); };
  LO.acts.ladDel = (el) => LO.confirm('Delete this line? Exercises using it go back to a single variation.', 'Delete', () => { const id = el.dataset.id; delete LO.S.ladders[id]; LO.exList().forEach((x) => { if (x.ladder === id) { x.ladder = null; x.step = 0; } }); LO.save(); LO.refresh(); });

  /* ---------- mobility editor ---------- */
  function mob() {
    const m = LO.S.mobility;
    return `<div class="pad">${LO.hdr('Mobility routine', { kicker: 'FLIGHT PLAN · ' + LO.mobTotal() + ' MIN' })}
      ${LO.panel('STEPS', m.map((s, i) => `<div class="stp"><i class="mono">${i + 1}</i><input class="in" value="${esc(s.n)}" data-in="mobN" data-i="${i}" autocomplete="off" aria-label="Step name"><input class="in num sm" type="text" inputmode="numeric" value="${s.s}" data-in="mobS" data-i="${i}" aria-label="Seconds"><button class="ib sm" data-act="mobMove" data-i="${i}" data-d="-1" aria-label="Up"><svg viewBox="0 0 24 24"><path d="M6 14l6-6 6 6"/></svg></button><button class="ib sm" data-act="mobRm" data-i="${i}" aria-label="Remove"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`).join('') + '<button class="btn" data-act="mobAdd">+ Add step</button>')}
      <button class="btn sm rv" data-act="mobReset">Restore the default routine</button><div class="spacer"></div></div>`;
  }
  LO.ins.mobN = (el) => { LO.S.mobility[+el.dataset.i].n = el.value; LO.save(); };
  LO.ins.mobS = (el) => { LO.S.mobility[+el.dataset.i].s = Math.max(5, LO.num(el.value, 30) | 0); LO.save(); };
  LO.acts.mobAdd = () => { LO.S.mobility.push({ n: 'New stretch', s: 45, cue: '' }); LO.save(); LO.refresh(); };
  LO.acts.mobRm = (el) => { LO.S.mobility.splice(+el.dataset.i, 1); LO.save(); LO.refresh(); };
  LO.acts.mobMove = (el) => { const a = LO.S.mobility, i = +el.dataset.i, j = i + LO.num(el.dataset.d); if (j >= 0) { [a[i], a[j]] = [a[j], a[i]]; LO.save(); LO.refresh(); } };
  LO.acts.mobReset = () => LO.confirm('Replace your routine with the default one?', 'Restore', () => { LO.S.mobility = LO.defaults().mobility; LO.save(); LO.refresh(); }, false);
})();
