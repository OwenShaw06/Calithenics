/* Low Orbit — Progress: trajectory, lifts, records, body weight, weekly summary, exercise detail */
(function () {
  const LO = window.LO, esc = LO.esc, $ = LO.$, C = () => LO.C;
  const TABS = [['traj', 'Trajectory'], ['ex', 'Lifts'], ['rec', 'Records'], ['body', 'Body'], ['week', 'Week']];
  LO.exMetric = 'top';
  LO.weekOff = 0;

  const seg = (cur) => `<div class="seg rv" role="tablist">${TABS.map((t) => `<button role="tab" aria-selected="${t[0] === cur}" class="${t[0] === cur ? 'on' : ''}" data-act="nav" data-to="#/progress/${t[0]}">${t[1]}</button>`).join('')}</div>`;
  const hasData = (id) => LO.entriesFor(id).length || (LO.S.exercises[id] && LO.S.exercises[id].skill && LO.S.holds.some((h) => h.ex === id));

  function tabTraj() {
    const rows = LO.keyMoves.map(([id, label]) => {
      const t = LO.trajectory(id), best = t.best, base = t.base;
      return `<button class="trow" data-act="nav" data-to="#/ex/${id}"><div><b>${label}</b><small class="mono">START ${base || '—'}</small></div><div class="tn mono"><b>${best || '—'}</b><em class="${best > base ? 'up' : ''}">${best ? (best - base >= 0 ? '+' : '') + (best - base) : 'no data'}</em></div></button>`;
    }).join('');
    return LO.panel('TRAJECTORY · BEST SET PER DAY', `<div data-chart="traj" class="chartbox"></div>${rows}<p class="foot mono">The first point is your stated starting level. Every other point is a logged session. Nothing is projected.</p>`);
  }
  function tabEx() {
    const ex = LO.exList().sort((a, b) => (hasData(b.id) ? 1 : 0) - (hasData(a.id) ? 1 : 0));
    return LO.panel('LIFTS', ex.map((x) => {
      const ser = LO.series(x.id), best = ser.reduce((m, d) => Math.max(m, d.top), 0), lastD = ser[ser.length - 1];
      return `<button class="trow ${ser.length ? '' : 'dim'}" data-act="nav" data-to="#/ex/${x.id}"><div><b>${esc(LO.exName(x))}</b><small class="mono">${ser.length ? ser.length + ' SESSIONS · LAST ' + LO.fmtDs(lastD.date).toUpperCase() : 'NO DATA YET'}</small></div>${LO.spark(ser.slice(-12).map((d) => d.top), { w: 70, h: 26 })}<div class="tn mono"><b>${best || '—'}</b><em>${x.kind === 'hold' ? 'sec' : 'reps'}</em></div></button>`;
    }).join(''));
  }
  function tabRec() {
    const items = LO.exList().map((x) => ({ x, r: LO.records(x.id) })).filter((o) => o.r.top);
    if (!items.length) return LO.panel('PERSONAL RECORDS', '<div class="empty">Records appear after your first logged sets.</div>');
    return LO.panel('PERSONAL RECORDS', items.map(({ x, r }) => `<div class="rec"><b>${esc(x.name)}</b>
      <div class="rl mono"><span>${x.kind === 'hold' ? 'LONGEST HOLD' : 'MOST REPS (SET)'}</span><em>${r.top.r}${x.kind === 'hold' ? ' s' : ''}${r.top.w ? ' @ +' + r.top.w : ''}<i>${LO.fmtDs(r.top.date)}${r.top.name !== x.name ? ' · ' + esc(r.top.name) : ''}</i></em></div>
      ${r.heavy ? `<div class="rl mono"><span>HEAVIEST ADDED</span><em>+${r.heavy.w} lb × ${r.heavy.r}<i>${LO.fmtDs(r.heavy.date)}</i></em></div>` : ''}
      ${r.vol ? `<div class="rl mono"><span>BEST SESSION VOLUME</span><em>${LO.fmtN(Math.round(r.vol.v))} lb<i>${LO.fmtDs(r.vol.date)}</i></em></div>` : ''}</div>`).join(''));
  }
  function tabBody() {
    const b = LO.bodySorted(), tr = LO.bodyTrend();
    const cur = b.length ? b[b.length - 1] : null;
    const rate = tr.rate;
    const log = LO.panel('LOG WEIGHT', `<div class="row2 end">${LO.field('Weight (lb)', LO.numIn('bw', cur ? cur.w : '', { dec: 1, ph: '155' }), 'grow')}${LO.field('Date', `<input class="in" type="date" name="bd" value="${LO.ymd()}">`)}</div><button class="btn solid" data-act="bodyAdd">Save weight</button>`);
    const stats = `<div class="stats3"><div><b class="mono">${cur ? cur.w : '—'}</b><small class="mono">LATEST LB</small></div><div><b class="mono">${tr.pts.length ? tr.pts[tr.pts.length - 1].v : '—'}</b><small class="mono">TREND LB</small></div><div><b class="mono">${rate == null ? '—' : (rate >= 0 ? '+' : '') + rate.toFixed(2)}</b><small class="mono">LB / WEEK</small></div></div>`;
    const list = b.slice(-6).reverse().map((x) => `<button class="lrow" data-act="editEntry" data-type="body" data-id="${x.id}"><span class="mono">${LO.fmtD(x.date)}</span><b class="mono">${x.w} lb</b><i>›</i></button>`).join('');
    return log + LO.panel('BODY WEIGHT', `<div data-chart="body" class="chartbox"></div>${stats}${rate == null && b.length ? '<p class="foot mono">Trend rate needs 3+ weigh-ins over at least a week.</p>' : ''}`) + (list ? LO.panel('RECENT', list) : '');
  }
  function tabWeek() {
    const mon = LO.addDays(LO.monday(LO.ymd()), LO.weekOff * 7);
    const w = LO.weekStats(mon), p = LO.weekStats(LO.addDays(mon, -7));
    const d = (a, b) => (b ? `<em class="${a >= b ? 'up' : 'dn'}">${a >= b ? '+' : ''}${LO.fmtN(a - b)}</em>` : '<em></em>');
    const cell = (lab, v, pv, dec, isVol) => `<div><b class="mono">${isVol ? LO.fmtVol(v) : LO.fmtN(v)}</b><small class="mono">${lab}</small>${d(v, pv)}</div>`;
    return `<div class="weeknav rv"><button class="ib" data-act="weekNav" data-d="-1" aria-label="Previous week"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button><div class="mono"><small>${LO.weekOff === 0 ? 'THIS WEEK' : LO.weekOff === -1 ? 'LAST WEEK' : Math.abs(LO.weekOff) + ' WEEKS ' + (LO.weekOff < 0 ? 'AGO' : 'AHEAD')}</small><b>${LO.fmtDs(mon)} – ${LO.fmtDs(w.end)}</b></div><button class="ib" data-act="weekNav" data-d="1" aria-label="Next week" ${LO.weekOff >= 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button></div>`
      + LO.panel('SUMMARY · VS PREVIOUS WEEK', `<div class="grid3">${cell('BURNS', w.sessions, p.sessions)}${cell('SETS', w.sets, p.sets)}${cell('VOLUME LB', Math.round(w.vol), Math.round(p.vol), 0, true)}${cell('HOLD SEC', w.holdSec, p.holdSec)}${cell('CARDIO MIN', w.cardioMin, p.cardioMin)}${cell('MOBILITY', w.mobN, p.mobN)}</div><p class="foot mono">Volume is an estimate: reps × (added weight + your bodyweight share). Log your body weight so bodyweight moves count.</p>`)
      + LO.panel('SETS PER WEEK · LAST 8', `<div data-chart="weeks" class="chartbox"></div>`);
  }

  LO.views.progress = {
    depth: () => 0, tab: 1,
    html(p) {
      const cur = TABS.some((t) => t[0] === p[0]) ? p[0] : 'traj';
      const body = { traj: tabTraj, ex: tabEx, rec: tabRec, body: tabBody, week: tabWeek }[cur]();
      return `<div class="pad" data-sub="${cur}"><header class="top rv"><div><small class="mono">TELEMETRY</small><h1>Progress</h1></div></header>${seg(cur)}${body}</div>`;
    },
    mount(el, p) {
      const cur = TABS.some((t) => t[0] === p[0]) ? p[0] : 'traj';
      const q = (n) => el.querySelector(`[data-chart="${n}"]`);
      if (cur === 'traj' && q('traj')) {
        const col = [C().amber, C().cy, '#c9d6e2'];
        LO.lineChart(q('traj'), { label: 'Trajectory', zero: true, area: false, h: 210, series: LO.keyMoves.map(([id, n], i) => ({ name: n, color: col[i], pts: LO.trajectory(id).pts })) });
      }
      if (cur === 'body' && q('body')) {
        const b = LO.bodySorted(), tr = LO.bodyTrend();
        LO.lineChart(q('body'), { label: 'Body weight', area: false, h: 200, fmt: (v) => LO.round1(v), series: [
          { name: 'Weigh-ins', color: C().dim, dots: true, pts: b.map((x) => ({ t: LO.parse(x.date).getTime(), v: x.w, tip: LO.fmtDs(x.date) + ' · ' + x.w + ' lb' })) },
          { name: 'Trend', color: C().amber, dots: false, pts: tr.pts.map((x, i) => ({ t: x.t, v: x.v, tip: LO.fmtDs(b[i].date) + ' · trend ' + x.v + ' lb' })) },
        ] });
      }
      if (cur === 'week' && q('weeks')) {
        const mon = LO.monday(LO.ymd()), items = [];
        for (let i = 7; i >= 0; i--) { const m = LO.addDays(mon, -7 * i), w = LO.weekStats(m); items.push({ label: LO.fmtDs(m).replace(/ \w+$/, ''), v: w.sets, cur: m === LO.addDays(mon, LO.weekOff * 7), tip: LO.fmtDs(m) + ': ' + w.sets + ' sets' }); }
        LO.barChart(q('weeks'), items);
      }
      LO.countUp(el);
    },
  };
  LO.acts.weekNav = (el) => { LO.weekOff = Math.min(0, LO.weekOff + LO.num(el.dataset.d)); LO.refresh(); };
  LO.acts.bodyAdd = (el) => {
    const root = el.closest('.pad'), w = LO.num(root.querySelector('[name="bw"]').value), d = root.querySelector('[name="bd"]').value || LO.ymd();
    if (!(w > 40 && w < 700)) { LO.toast('Enter a weight in lb'); return; }
    LO.S.body = LO.S.body.filter((b) => b.date !== d);
    LO.S.body.push({ id: LO.uid(), date: d, w: LO.round1(w), t: Date.now() }); LO.save(); LO.toast('Weight saved'); LO.refresh();
  };

  /* ---------- exercise detail ---------- */
  function exChart(host, id) {
    const ex = LO.S.exercises[id], ser = LO.series(id), m = LO.exMetric, hold = ex.kind === 'hold';
    const key = m === 'vol' ? 'vol' : m === 'w' ? 'maxW' : m === 'tot' ? 'total' : 'top';
    const unit = { top: hold ? ' s' : ' reps', vol: ' lb', maxW: ' lb', total: ' s' }[key];
    const data = ser.filter((d) => key !== 'maxW' || d.maxW > 0).filter((d) => key !== 'vol' || d.vol > 0);
    const markers = [];
    ser.forEach((d, i) => { if (i && d.step !== ser[i - 1].step) markers.push({ t: LO.parse(d.date).getTime(), label: '→ ' + (d.name || '').slice(0, 16) }); });
    LO.lineChart(host, { label: ex.name + ' chart', zero: key === 'vol', h: 200, markers, fmt: (v) => LO.fmtN(v), series: [{ name: ex.name, color: key === 'maxW' ? C().cy : C().amber, pts: data.map((d) => ({ t: LO.parse(d.date).getTime(), v: key === 'vol' ? Math.round(d.vol) : d[key], tip: LO.fmtDs(d.date) + ' · ' + LO.fmtN(key === 'vol' ? Math.round(d.vol) : d[key]) + unit + (d.name && d.name !== ex.name ? ' · ' + d.name : '') })) }] });
  }
  LO.views.ex = {
    depth: () => 1, tab: 1,
    html(p) {
      const ex = LO.S.exercises[p[0]];
      if (!ex) return `<div class="pad">${LO.hdr('Not found')}<div class="panel"><p class="mut">This exercise was removed.</p></div></div>`;
      const hold = ex.kind === 'hold', lad = ex.ladder && LO.S.ladders[ex.ladder], sug = LO.suggest(ex.id), rec = LO.records(ex.id);
      const metrics = hold ? [['top', 'Best hold'], ['tot', 'Total time']] : [['top', 'Best set'], ['vol', 'Est. volume']].concat(LO.isWeighted(ex) || LO.series(ex.id).some((d) => d.maxW) ? [['w', 'Added weight']] : []);
      if (!metrics.some((x) => x[0] === LO.exMetric)) LO.exMetric = 'top';
      const hist = LO.entriesFor(ex.id).slice(-8).reverse().map((x) => `<button class="lrow" data-act="nav" data-to="#/session/${x.sess.id}"><span class="mono">${LO.fmtDs(x.date)}</span><b class="mono">${esc(x.e.sets.filter((s) => s.done).map((s) => s.r + (s.w ? '+' + s.w : '')).join(' · '))}</b><i>›</i></button>`).join('');
      const ladder = lad ? LO.panel('PROGRESSION LINE · ' + lad.name.toUpperCase(), `<div class="ladder">${lad.steps.map((s, i) => `<button class="rung ${i === ex.step ? 'cur' : i < ex.step ? 'past' : ''}" data-act="setStep" data-id="${ex.id}" data-i="${i}"><i class="mono">${i + 1}</i><span>${esc(s.n)}${s.w ? ' <small class="mono">+WT</small>' : ''}</span>${i === ex.step ? '<em class="mono">NOW</em>' : ''}</button>`).join('')}</div>
        <div class="row2"><button class="btn sm" data-act="stepMove" data-id="${ex.id}" data-d="-1" ${ex.step <= 0 ? 'disabled' : ''}>← Easier</button><button class="btn sm solid" data-act="stepMove" data-id="${ex.id}" data-d="1" ${ex.step >= lad.steps.length - 1 ? 'disabled' : ''}>Advance →</button></div>`) : '';
      const sugH = sug ? `<section class="panel sugp rv"><div class="ph"><span class="mono">▲ INCREASE DIFFICULTY</span></div><p class="mut">You hit the top of the range (${sug.tgt.max}${hold ? ' s' : ''}) on every set last session.</p><div class="chips">${sug.opts.map((o, k) => `<button class="chip" data-act="applyEx" data-id="${ex.id}" data-k="${k}">${esc(o.label)}<small>${esc(o.detail)}</small></button>`).join('')}</div></section>` : '';
      return `<div class="pad">
        ${LO.hdr(LO.exName(ex), { kicker: ex.skill ? 'SKILL' : 'EXERCISE', right: `<button class="ib" data-act="editEx" data-id="${ex.id}" aria-label="Edit"><svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></button>` })}
        ${sugH}
        ${LO.panel('CURRENT TARGET', `<div class="stats3"><div><b class="mono">${ex.sets} × ${ex.min === ex.max ? ex.min : ex.min + '–' + ex.max}</b><small class="mono">SETS × ${hold ? 'SEC' : 'REPS'}</small></div><div><b class="mono">${LO.isWeighted(ex) ? '+' + ex.w : 'BW'}</b><small class="mono">${LO.isWeighted(ex) ? 'LB ADDED' : 'LOAD'}</small></div><div><b class="mono">${LO.mmss(ex.rest)}</b><small class="mono">REST</small></div></div>${LO.isWeighted(ex) ? `<div class="row2 end">${LO.field('Working added weight (lb)', LO.numIn('exw', ex.w, { dec: 1 }).replace('name="exw"', `name="exw" data-in="exW" data-id="${ex.id}"`))}<span></span></div>` : ''}`)}
        ${ladder}
        ${LO.panel('CHART', `<div class="seg sm">${metrics.map((m) => `<button class="${m[0] === LO.exMetric ? 'on' : ''}" data-act="exMetric" data-m="${m[0]}" data-id="${ex.id}">${m[1]}</button>`).join('')}</div><div data-chart="ex" data-id="${ex.id}" class="chartbox"></div>`)}
        ${rec.top ? LO.panel('RECORDS', `<div class="rl mono"><span>${hold ? 'LONGEST HOLD' : 'MOST REPS (SET)'}</span><em>${rec.top.r}${hold ? ' s' : ''}${rec.top.w ? ' @ +' + rec.top.w : ''}<i>${LO.fmtDs(rec.top.date)}</i></em></div>${rec.heavy ? `<div class="rl mono"><span>HEAVIEST ADDED</span><em>+${rec.heavy.w} lb × ${rec.heavy.r}<i>${LO.fmtDs(rec.heavy.date)}</i></em></div>` : ''}${rec.vol ? `<div class="rl mono"><span>BEST SESSION VOLUME</span><em>${LO.fmtN(Math.round(rec.vol.v))} lb<i>${LO.fmtDs(rec.vol.date)}</i></em></div>` : ''}`) : ''}
        ${ex.skill ? `<button class="btn solid xl rv" data-act="logHold" data-id="${ex.id}">Log a hold</button>` : ''}
        ${hist ? LO.panel('RECENT SESSIONS', hist) : ''}
        <div class="spacer"></div></div>`;
    },
    mount(el, p) { const h = el.querySelector('[data-chart="ex"]'); if (h) exChart(h, p[0]); },
  };
  LO.acts.exMetric = (el) => { LO.exMetric = el.dataset.m; LO.$$('.seg.sm button', el.closest('.panel')).forEach((b) => b.classList.toggle('on', b === el)); exChart(el.closest('.panel').querySelector('[data-chart="ex"]'), el.dataset.id); };
  LO.acts.setStep = (el) => { const ex = LO.S.exercises[el.dataset.id], i = +el.dataset.i; if (i !== ex.step) { ex.step = i; ex.w = 0; LO.save(); LO.toast('Now: ' + LO.exName(ex)); LO.refresh(); } };
  LO.acts.stepMove = (el) => { const ex = LO.S.exercises[el.dataset.id], lad = LO.S.ladders[ex.ladder]; ex.step = Math.max(0, Math.min(lad.steps.length - 1, ex.step + LO.num(el.dataset.d))); ex.w = 0; LO.save(); LO.toast('Now: ' + LO.exName(ex)); LO.refresh(); };
  LO.acts.applyEx = (el) => { const sug = LO.suggest(el.dataset.id); if (sug) { LO.applyProg(el.dataset.id, sug.opts[+el.dataset.k]); LO.toast('Target updated'); LO.refresh(); } };
  LO.acts.editEx = (el) => LO.exerciseForm(LO.S.exercises[el.dataset.id], () => LO.refresh());
  LO.ins.exW = (el) => { LO.S.exercises[el.dataset.id].w = Math.max(0, LO.num(el.value)); LO.save(); };
})();
