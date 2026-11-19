/* Low Orbit — engine: plan resolution, stats, double progression */
(function () {
  const LO = window.LO;
  const S = () => LO.S;

  /* ---------- exercise helpers ---------- */
  LO.stepOf = (ex) => (ex.ladder && S().ladders[ex.ladder] ? S().ladders[ex.ladder].steps[ex.step] || null : null);
  LO.exName = (ex) => { const st = LO.stepOf(ex); return st ? st.n : ex.name; };
  LO.isWeighted = (ex) => !!(ex.weighted || (LO.stepOf(ex) && LO.stepOf(ex).w));
  LO.unit = (ex) => (ex.kind === 'hold' ? 's' : '');
  LO.exList = () => Object.values(S().exercises);

  /* ---------- plan ---------- */
  LO.weekIndex = (date) => Math.round((LO.parse(LO.monday(date)) - LO.parse(S().settings.anchor)) / (7 * 864e5));
  LO.planFor = function (date) {
    const ov = S().overrides[date];
    const base = ov || S().week[LO.dow(date)] || { k: 'rest' };
    const r = Object.assign({ swapped: !!ov }, base);
    if (r.k === 'alt') {
      const n = (r.refs || []).length || 1;
      const i = ((LO.weekIndex(date) % n) + n) % n;
      r.k = 'workout';
      r.ref = r.refs[i];
    }
    if (r.k === 'workout' && !S().workouts[r.ref]) r.k = 'rest';
    r.label = LO.planLabel(r);
    return r;
  };
  LO.planLabel = (r) => {
    switch (r.k) {
      case 'workout': return S().workouts[r.ref] ? S().workouts[r.ref].name : 'Workout';
      case 'cardio': return 'Easy cardio';
      case 'mobility': return 'Mobility';
      case 'skill': return 'Skill session';
      case 'flex': return 'Cardio or skills';
      default: return 'Rest';
    }
  };

  /* ---------- body weight ---------- */
  LO.bodySorted = () => S().body.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  LO.bwAt = (date) => {
    const b = LO.bodySorted();
    if (!b.length) return 0;
    let w = b[0].w;
    for (const x of b) if (x.date <= date) w = x.w;
    return w;
  };

  /* ---------- sessions ---------- */
  LO.sessionsSorted = () => S().sessions.slice().sort((a, b) => (a.date === b.date ? (a.start || 0) - (b.start || 0) : a.date < b.date ? -1 : 1));
  LO.doneSets = (e) => e.sets.filter((s) => s.done && (s.r > 0));
  LO.setVol = (e, s, bw) => (e.kind === 'hold' ? 0 : (s.r || 0) * ((s.w || 0) + (e.bwf || 0) * bw));
  LO.entryStats = function (e, date) {
    const ds = LO.doneSets(e);
    const bw = LO.bwAt(date);
    return {
      n: ds.length,
      top: ds.reduce((m, s) => Math.max(m, s.r), 0),
      maxW: ds.reduce((m, s) => Math.max(m, s.w || 0), 0),
      vol: ds.reduce((a, s) => a + LO.setVol(e, s, bw), 0),
      reps: ds.reduce((a, s) => a + s.r, 0),
    };
  };
  LO.fmtVol = (v) => (v > 0 ? LO.fmtN(Math.round(v)) : S().body.length ? '0' : '—');
  LO.sessionStats = function (sess) {
    let sets = 0, vol = 0;
    sess.entries.forEach((e) => { const st = LO.entryStats(e, sess.date); sets += st.n; vol += st.vol; });
    return { sets, vol };
  };
  LO.entriesFor = function (exId) {
    const out = [];
    LO.sessionsSorted().forEach((sess) => sess.entries.forEach((e) => { if (e.ex === exId && LO.doneSets(e).length) out.push({ sess, e, date: sess.date }); }));
    return out;
  };
  LO.lastEntry = (exId) => { const a = LO.entriesFor(exId); return a.length ? a[a.length - 1] : null; };

  /* per-day series for an exercise (sessions + standalone holds for skills) */
  LO.series = function (exId) {
    const ex = S().exercises[exId];
    const days = {};
    LO.entriesFor(exId).forEach(({ e, date }) => {
      const st = LO.entryStats(e, date);
      const d = (days[date] = days[date] || { date, top: 0, maxW: 0, vol: 0, total: 0, name: e.name, step: e.step });
      d.top = Math.max(d.top, st.top); d.maxW = Math.max(d.maxW, st.maxW); d.vol += st.vol; d.total += st.reps; d.name = e.name; d.step = e.step;
    });
    if (ex && ex.skill) {
      S().holds.filter((h) => h.ex === exId).forEach((h) => {
        const d = (days[h.date] = days[h.date] || { date: h.date, top: 0, maxW: 0, vol: 0, total: 0, name: h.name, step: h.step });
        d.top = Math.max(d.top, h.sec); d.total += h.sec; d.name = h.name || d.name;
      });
    }
    return Object.values(days).sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  /* ---------- records ---------- */
  LO.records = function (exId) {
    const ex = S().exercises[exId];
    const out = { top: null, heavy: null, vol: null };
    LO.entriesFor(exId).forEach(({ e, date }) => {
      LO.doneSets(e).forEach((s) => {
        if (!out.top || s.r > out.top.r) out.top = { r: s.r, w: s.w || 0, date, name: e.name };
        if ((s.w || 0) > 0 && (!out.heavy || s.w > out.heavy.w || (s.w === out.heavy.w && s.r > out.heavy.r))) out.heavy = { r: s.r, w: s.w, date, name: e.name };
      });
      const st = LO.entryStats(e, date);
      if (st.vol > 0 && (!out.vol || st.vol > out.vol.v)) out.vol = { v: st.vol, date };
    });
    if (ex && ex.skill) S().holds.filter((h) => h.ex === exId).forEach((h) => { if (!out.top || h.sec > out.top.r) out.top = { r: h.sec, w: 0, date: h.date, name: h.name || ex.name }; });
    return out;
  };

  /* ---------- double progression ---------- */
  LO.suggest = function (exId) {
    const ex = S().exercises[exId];
    const last = LO.lastEntry(exId);
    if (!ex || !last || last.e.applied) return null;
    const e = last.e;
    if ((e.step || 0) !== (ex.step || 0)) return null;
    const tgt = e.tgt || { sets: ex.sets, min: ex.min, max: ex.max };
    const ds = LO.doneSets(e);
    if (ds.length < tgt.sets || !ds.every((s) => s.r >= tgt.max)) return null;
    const opts = [];
    const baseW = ds.reduce((m, s) => Math.max(m, s.w || 0), 0);
    const st = ex.ladder && S().ladders[ex.ladder];
    if (LO.isWeighted(ex) && ex.inc > 0) opts.push({ kind: 'weight', to: baseW + ex.inc, label: 'Add ' + ex.inc + ' lb', detail: baseW ? baseW + ' → ' + (baseW + ex.inc) + ' lb' : 'start at ' + ex.inc + ' lb' });
    if (st && ex.step < st.steps.length - 1) opts.push({ kind: 'step', to: ex.step + 1, label: 'Harder variation', detail: st.steps[ex.step + 1].n });
    if (!opts.length) {
      if (ex.kind === 'hold') opts.push({ kind: 'range', label: 'Raise the target', detail: (ex.min + 5) + '–' + (ex.max + 10) + ' s' });
      else if (ex.inc > 0) opts.push({ kind: 'load', to: ex.inc, label: 'Start adding weight', detail: ex.inc + ' lb' });
      else opts.push({ kind: 'range', label: 'Raise the target', detail: (ex.min + 2) + '–' + (ex.max + 2) + ' reps' });
    }
    return { exId, ref: e, tgt, opts };
  };
  LO.applyProg = function (exId, opt, liveEntry) {
    const ex = S().exercises[exId];
    const last = LO.lastEntry(exId);
    if (opt.kind === 'weight') { ex.w = opt.to; }
    else if (opt.kind === 'step') { ex.step = opt.to; ex.w = 0; }
    else if (opt.kind === 'load') { ex.weighted = true; ex.w = opt.to; }
    else if (opt.kind === 'range') {
      const dmin = ex.kind === 'hold' ? 5 : 2, dmax = ex.kind === 'hold' ? 10 : 2;
      ex.min += dmin; ex.max += dmax;
      Object.values(S().workouts).forEach((w) => w.items.forEach((i) => { if (i.ex === exId) { i.min += dmin; i.max += dmax; } }));
    }
    if (last) last.e.applied = true;
    if (liveEntry) {
      liveEntry.step = ex.step; liveEntry.name = LO.exName(ex);
      liveEntry.sets.forEach((s) => { if (!s.done) { if (opt.kind === 'step') s.w = 0; if (opt.kind === 'weight' || opt.kind === 'load') s.w = ex.w; } });
      if (opt.kind === 'step') liveEntry.sets.forEach((s) => { if (!s.done) s.r = (liveEntry.tgt && liveEntry.tgt.min) || ex.min; });
    }
    LO.save();
  };

  /* ---------- building sessions ---------- */
  LO.makeEntry = function (exId, o = {}) {
    const ex = S().exercises[exId];
    const last = o.blank ? null : LO.lastEntry(exId);
    const tgt = { sets: o.sets ?? ex.sets, min: o.min ?? ex.min, max: o.max ?? ex.max };
    const prev = last && (last.e.step || 0) === (ex.step || 0) ? LO.doneSets(last.e) : [];
    const sets = [];
    for (let i = 0; i < tgt.sets; i++) {
      const ps = prev[i] || prev[prev.length - 1];
      sets.push({ r: o.blank ? 0 : ps ? ps.r : tgt.min, w: o.blank ? 0 : LO.isWeighted(ex) ? ex.w : 0, n: '', done: false });
    }
    return { ex: exId, name: LO.exName(ex), step: ex.step || 0, kind: ex.kind, bwf: ex.bwf, side: ex.side, tgt, sets, note: '' };
  };
  LO.makeSession = function (wid, date, o = {}) {
    const w = S().workouts[wid];
    const entries = [];
    if (w) w.items.forEach((i) => { if (S().exercises[i.ex]) entries.push(LO.makeEntry(i.ex, Object.assign({ sets: i.sets, min: i.min, max: i.max }, o))); });
    return { id: LO.uid(), date, start: Date.now(), workout: wid || null, name: w ? w.name : 'Custom burn', entries };
  };
  LO.getSession = (id) => (S().active && S().active.id === id ? S().active : S().sessions.find((s) => s.id === id));

  /* ---------- weekly summary ---------- */
  LO.weekStats = function (monday) {
    const end = LO.addDays(monday, 6);
    const inW = (d) => d >= monday && d <= end;
    let sessions = 0, sets = 0, vol = 0, holdSec = 0;
    S().sessions.filter((s) => inW(s.date)).forEach((s) => {
      const st = LO.sessionStats(s);
      if (st.sets) sessions++;
      sets += st.sets; vol += st.vol;
      s.entries.forEach((e) => { if (e.kind === 'hold') holdSec += LO.doneSets(e).reduce((a, x) => a + x.r, 0); });
    });
    const cardio = S().cardio.filter((c) => inW(c.date));
    return {
      monday, end, sessions, sets, vol, holdSec,
      cardioMin: cardio.reduce((a, c) => a + (c.min || 0), 0), cardioN: cardio.length,
      mobN: S().mobLog.filter((m) => inW(m.date)).length,
    };
  };

  /* key-move trajectory: baseline (stated at setup) + best top-reps per day */
  LO.keyMoves = [['pullup', 'Pull-ups'], ['pushup', 'Push-ups'], ['dip', 'Dips']];
  LO.trajectory = function (exId) {
    const base = S().settings.baseline[exId];
    const ser = LO.series(exId);
    const pts = [];
    if (base) {
      const firstS = LO.sessionsSorted()[0];
      const d0 = firstS && firstS.date < S().settings.installed ? LO.addDays(firstS.date, -1) : S().settings.installed;
      pts.push({ t: LO.parse(d0).getTime(), v: base, tip: 'Starting point · ' + base });
    }
    ser.forEach((d) => pts.push({ t: LO.parse(d.date).getTime(), v: d.top, tip: LO.fmtDs(d.date) + ' · ' + d.top + (d.name && d.name !== S().exercises[exId].name ? ' · ' + d.name : '') }));
    return { base, pts, best: ser.reduce((m, d) => Math.max(m, d.top), 0), last: ser.length ? ser[ser.length - 1].top : null };
  };

  /* ---------- day activity map (for calendar/history) ---------- */
  LO.activityOn = function (date) {
    const a = [];
    S().sessions.forEach((s) => { if (s.date === date) a.push({ type: 'burn', id: s.id, title: s.name, sub: (() => { const st = LO.sessionStats(s); return st.sets + ' sets'; })(), t: s.start || 0 }); });
    S().cardio.forEach((c) => { if (c.date === date) a.push({ type: 'cardio', id: c.id, title: c.type, sub: c.min + ' min' + (c.dist ? ' · ' + c.dist + ' ' + S().settings.distUnit : '') + ' · effort ' + c.eff, t: c.t || 0 }); });
    S().mobLog.forEach((m) => { if (m.date === date) a.push({ type: 'mob', id: m.id, title: 'Mobility', sub: m.min + ' min', t: m.t || 0 }); });
    S().holds.forEach((h) => { if (h.date === date) { const ex = S().exercises[h.ex]; a.push({ type: 'hold', id: h.id, title: h.name || (ex ? ex.name : 'Skill'), sub: h.sec + ' s hold', t: h.t || 0 }); } });
    S().body.forEach((b) => { if (b.date === date) a.push({ type: 'body', id: b.id, title: 'Body weight', sub: b.w + ' lb', t: b.t || 0 }); });
    return a.sort((x, y) => x.t - y.t);
  };
  LO.allDates = function () {
    const set = new Set();
    S().sessions.forEach((s) => set.add(s.date));
    S().cardio.forEach((s) => set.add(s.date));
    S().mobLog.forEach((s) => set.add(s.date));
    S().holds.forEach((s) => set.add(s.date));
    S().body.forEach((s) => set.add(s.date));
    return set;
  };

  /* ---------- body trend ---------- */
  LO.bodyTrend = function () {
    const b = LO.bodySorted();
    let ema = null;
    const pts = b.map((x) => { ema = ema == null ? x.w : ema + 0.3 * (x.w - ema); return { t: LO.parse(x.date).getTime(), v: LO.round1(ema) }; });
    let rate = null;
    const recent = b.filter((x) => x.date >= LO.addDays(LO.ymd(), -42));
    if (recent.length >= 3) {
      const xs = recent.map((x) => LO.parse(x.date).getTime() / 864e5), ys = recent.map((x) => x.w);
      const span = Math.max(...xs) - Math.min(...xs);
      if (span >= 7) {
        const mx = xs.reduce((a, c) => a + c, 0) / xs.length, my = ys.reduce((a, c) => a + c, 0) / ys.length;
        let nu = 0, de = 0;
        xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de += (x - mx) ** 2; });
        if (de) rate = (nu / de) * 7;
      }
    }
    return { pts, rate };
  };
})();
