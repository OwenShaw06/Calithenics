/* Low Orbit — History: calendar, entries, editing of past data */
(function () {
  const LO = window.LO, esc = LO.esc, $ = LO.$;
  LO.CARDIO_TYPES = ['Run', 'Bike', 'Row', 'Swim', 'Walk', 'Elliptical', 'Stairs', 'Other'];
  LO.histSel = null;
  LO.histMonth = null;
  const ICON = { burn: 'BURN', cardio: 'CARDIO', mob: 'MOBILITY', hold: 'SKILL', body: 'BODY' };

  /* ---------- generic entry editor ---------- */
  LO.entrySheet = function (type, entry, date, cb) {
    const S = LO.S, isNew = !entry, e = entry || {}, d = e.date || date || LO.ymd();
    const dateF = LO.field('Date', `<input class="in" type="date" name="date" value="${d}">`);
    let fields = '', title = '';
    if (type === 'cardio') {
      title = 'Cardio';
      fields = `${LO.field('Type', `<select class="in" name="type">${LO.CARDIO_TYPES.map((t) => `<option ${((e.type || 'Run') === t) ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
        <div class="row3">${LO.field('Minutes', LO.numIn('min', e.min, { ph: '25' }))}${LO.field('Dist (' + S.settings.distUnit + ')', LO.numIn('dist', e.dist, { dec: 1, ph: 'opt.' }))}${LO.field('Effort 1–10', LO.numIn('eff', e.eff, { ph: '4' }))}</div>${LO.field('Note', `<input class="in" name="note" value="${esc(e.note || '')}" autocomplete="off">`)}`;
    } else if (type === 'mob') {
      title = 'Mobility';
      fields = LO.field('Minutes', LO.numIn('min', e.min ?? LO.mobTotal()));
    } else if (type === 'hold') {
      title = 'Skill hold';
      const sk = LO.exList().filter((x) => x.skill);
      fields = `${LO.field('Skill', `<select class="in" name="ex">${sk.map((x) => `<option value="${x.id}" ${x.id === e.ex ? 'selected' : ''}>${esc(LO.exName(x))}</option>`).join('')}</select>`)}${LO.field('Seconds', LO.numIn('sec', e.sec, { dec: 1 }))}`;
    } else if (type === 'body') {
      title = 'Body weight';
      fields = LO.field('Weight (lb)', LO.numIn('w', e.w, { dec: 1 }));
    } else if (type === 'burn') {
      title = 'Past burn';
      fields = LO.field('Template', `<select class="in" name="wid">${Object.values(S.workouts).map((w) => `<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}<option value="">Empty burn</option></select>`) + '<p class="mut">Sets start blank. Fill in what you did, then tick each set.</p>';
    }
    LO.sheet(`<h3>${isNew ? 'Log ' : 'Edit '}${title}</h3>${dateF}${fields}<div class="row2">${isNew ? '<button class="btn" data-close>Cancel</button>' : '<button class="btn danger" data-del>Delete</button>'}<button class="btn solid" data-ok>${type === 'burn' ? 'Create' : 'Save'}</button></div>`, (el, api) => {
      const g = (n) => { const x = el.querySelector(`[name="${n}"]`); return x ? x.value : ''; };
      const del = $('[data-del]', el);
      if (del) del.onclick = () => LO.confirm('Delete this entry? This cannot be undone.', 'Delete', () => {
        const key = { cardio: 'cardio', mob: 'mobLog', hold: 'holds', body: 'body' }[type];
        S[key] = S[key].filter((x) => x.id !== e.id); LO.save(); api.close(); LO.toast('Deleted'); cb ? cb() : LO.refresh();
      });
      $('[data-ok]', el).onclick = () => {
        const dt = g('date') || LO.ymd();
        if (type === 'burn') {
          const sess = LO.makeSession(g('wid') || null, dt, { blank: true }); sess.start = LO.parse(dt).getTime() + 18 * 36e5; sess.end = sess.start;
          S.sessions.push(sess); LO.save(); api.close(); LO.nav('#/session/' + sess.id); return;
        }
        let o;
        if (type === 'cardio') { o = { date: dt, type: g('type'), min: LO.num(g('min')), dist: g('dist') ? LO.num(g('dist')) : '', eff: Math.min(10, Math.max(1, LO.num(g('eff'), 5) | 0)), note: g('note') }; if (!(o.min > 0)) { LO.toast('Enter the minutes'); return; } }
        if (type === 'mob') { o = { date: dt, min: LO.num(g('min'), LO.mobTotal()) }; }
        if (type === 'hold') { o = { date: dt, ex: g('ex'), sec: LO.num(g('sec')) }; if (!(o.sec > 0)) { LO.toast('Enter the seconds'); return; } const x = S.exercises[o.ex]; o.name = x ? LO.exName(x) : ''; o.step = x ? x.step : 0; }
        if (type === 'body') { o = { date: dt, w: LO.round1(LO.num(g('w'))) }; if (!(o.w > 40)) { LO.toast('Enter a weight in lb'); return; } }
        const key = { cardio: 'cardio', mob: 'mobLog', hold: 'holds', body: 'body' }[type];
        if (isNew) S[key].push(Object.assign({ id: LO.uid(), t: Date.now() }, o)); else Object.assign(e, o);
        LO.save(); api.close(); LO.toast('Saved'); cb ? cb() : LO.refresh();
      };
    });
  };
  LO.acts.editEntry = (el) => {
    const t = el.dataset.type, id = el.dataset.id;
    if (t === 'burn') { LO.nav('#/session/' + id); return; }
    const key = { cardio: 'cardio', mob: 'mobLog', hold: 'holds', body: 'body' }[t];
    const e = LO.S[key].find((x) => x.id === id);
    if (e) LO.entrySheet(t, e);
  };
  LO.acts.addPast = (el) => {
    const d = el.dataset.d || LO.ymd();
    LO.sheet(`<h3>Log a past entry</h3><p class="mut">${LO.fmtD(d)}</p><div class="plist">
      <button class="pitem" data-t="burn"><b>Burn (workout)</b></button><button class="pitem" data-t="cardio"><b>Cardio</b></button><button class="pitem" data-t="mob"><b>Mobility</b></button><button class="pitem" data-t="hold"><b>Skill hold</b></button><button class="pitem" data-t="body"><b>Body weight</b></button></div>`, (m, api) => {
      m.onclick = (ev) => { const b = ev.target.closest('[data-t]'); if (b) { api.close(); LO.entrySheet(b.dataset.t, null, d); } };
    });
  };

  /* ---------- view ---------- */
  const row = (a) => `<button class="lrow ${a.type}" data-act="editEntry" data-type="${a.type}" data-id="${a.id}"><span class="tag mono">${ICON[a.type]}</span><div><b>${esc(a.title)}</b><small class="mono">${esc(a.sub)}</small></div><i>›</i></button>`;

  LO.views.history = {
    depth: () => 0, tab: 2,
    html() {
      const today = LO.ymd();
      LO.histSel = LO.histSel || today;
      const [sy, sm] = (LO.histMonth || LO.histSel.slice(0, 7)).split('-').map(Number);
      LO.histMonth = sy + '-' + LO.pad(sm);
      const first = sy + '-' + LO.pad(sm) + '-01', lead = LO.dow(first), dim = new Date(sy, sm, 0).getDate();
      const marks = {};
      LO.S.sessions.forEach((s) => { (marks[s.date] = marks[s.date] || {}).burn = 1; });
      LO.S.cardio.forEach((s) => { (marks[s.date] = marks[s.date] || {}).cardio = 1; });
      LO.S.mobLog.forEach((s) => { (marks[s.date] = marks[s.date] || {}).mob = 1; });
      LO.S.holds.forEach((s) => { (marks[s.date] = marks[s.date] || {}).hold = 1; });
      let cells = '';
      for (let i = 0; i < lead; i++) cells += '<span class="cd empty"></span>';
      for (let d = 1; d <= dim; d++) {
        const ds = sy + '-' + LO.pad(sm) + '-' + LO.pad(d), m = marks[ds] || {};
        cells += `<button class="cd ${ds === today ? 'today' : ''} ${ds === LO.histSel ? 'sel' : ''}" data-act="pickDay" data-d="${ds}" aria-label="${LO.fmtD(ds)}"><b class="mono">${d}</b><span class="dots">${m.burn ? '<i class="a"></i>' : ''}${m.cardio ? '<i class="c"></i>' : ''}${m.mob || m.hold ? '<i class="m"></i>' : ''}</span></button>`;
      }
      const acts = LO.activityOn(LO.histSel);
      const recent = [...LO.allDates()].sort().reverse().slice(0, 8).map((d) => `<div class="dayg"><small class="mono">${LO.fmtD(d).toUpperCase()}</small>${LO.activityOn(d).map(row).join('')}</div>`).join('');
      return `<div class="pad"><header class="top rv"><div><small class="mono">MISSION LOG</small><h1>History</h1></div></header>
        <section class="panel rv"><div class="calh"><button class="ib" data-act="monthNav" data-d="-1" aria-label="Previous month"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><b class="mono">${LO.MONTHS_L[sm - 1].toUpperCase()} ${sy}</b><button class="ib" data-act="monthNav" data-d="1" aria-label="Next month"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>
        <div class="cal"><div class="cdh mono">${LO.DAYS.map((d) => `<span>${d[0]}</span>`).join('')}</div><div class="cg">${cells}</div></div>
        <div class="legend mono"><span><i class="a"></i>Burn</span><span><i class="c"></i>Cardio</span><span><i class="m"></i>Mobility / skill</span></div></section>
        ${LO.panel(LO.fmtD(LO.histSel).toUpperCase(), (acts.length ? acts.map(row).join('') : '<div class="empty">Nothing logged this day.</div>') + `<button class="btn" data-act="addPast" data-d="${LO.histSel}">+ Log entry for this day</button>`)}
        ${recent ? LO.panel('RECENT LOG', recent) : ''}
        <div class="spacer"></div></div>`;
    },
  };
  LO.acts.pickDay = (el) => { LO.histSel = el.dataset.d; LO.refresh(); };
  LO.acts.monthNav = (el) => { const [y, m] = LO.histMonth.split('-').map(Number), d = new Date(y, m - 1 + LO.num(el.dataset.d), 1); LO.histMonth = d.getFullYear() + '-' + LO.pad(d.getMonth() + 1); LO.refresh(); };
})();
