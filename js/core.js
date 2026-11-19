/* Low Orbit — core: utilities, default data, storage */
(function () {
  const LO = (window.LO = { views: {}, acts: {}, ins: {} });

  LO.$ = (s, r = document) => r.querySelector(s);
  LO.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  LO.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  LO.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  LO.pad = (n) => String(n).padStart(2, '0');
  LO.ymd = (d = new Date()) => d.getFullYear() + '-' + LO.pad(d.getMonth() + 1) + '-' + LO.pad(d.getDate());
  LO.parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  LO.addDays = (s, n) => { const d = LO.parse(s); d.setDate(d.getDate() + n); return LO.ymd(d); };
  LO.dow = (s) => (LO.parse(s).getDay() + 6) % 7; // Mon = 0
  LO.monday = (s) => LO.addDays(s, -LO.dow(s));
  LO.DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  LO.DAYS_L = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  LO.MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  LO.MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  LO.fmtD = (s) => { const d = LO.parse(s); return LO.DAYS[LO.dow(s)] + ' ' + d.getDate() + ' ' + LO.MONTHS[d.getMonth()]; };
  LO.fmtDs = (s) => { const d = LO.parse(s); return d.getDate() + ' ' + LO.MONTHS[d.getMonth()]; };
  LO.fmtT = (ms) => { const d = new Date(ms); return LO.pad(d.getHours()) + ':' + LO.pad(d.getMinutes()); };
  LO.mmss = (sec) => { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + LO.pad(sec % 60); };
  LO.num = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
  LO.round1 = (n) => Math.round(n * 10) / 10;
  LO.fmtN = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US');
  LO.clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- defaults ---------- */
  const KEY = 'loworbit.v1';
  LO.KEY = KEY;

  LO.defaults = function () {
    const today = LO.ymd();
    const ex = (id, name, o) => Object.assign({ id, name, kind: 'reps', sets: 3, min: 8, max: 12, w: 0, inc: 5, weighted: false, bwf: 0, ladder: null, step: 0, rest: 75, side: false, skill: false, note: '' }, o);
    const E = {};
    [
      ex('pullup', 'Pull-up', { sets: 4, min: 6, max: 10, bwf: 1, ladder: 'pull', rest: 150, note: 'Stop 1–2 reps short of failure.' }),
      ex('dip', 'Dip', { sets: 3, min: 6, max: 10, bwf: 1, ladder: 'dip', rest: 150 }),
      ex('bss', 'Bulgarian split squat', { sets: 3, min: 8, max: 10, weighted: true, side: true, bwf: 0.7, ladder: 'split', rest: 150, note: 'Bodyweight or dumbbells. Reps are per leg.' }),
      ex('row', 'Row', { sets: 3, min: 8, max: 12, weighted: true, note: 'Machine, dumbbell or inverted.' }),
      ex('legraise', 'Hanging knee / leg raise', { sets: 3, min: 8, max: 12, ladder: 'raise' }),
      ex('handstand', 'Wall handstand hold', { kind: 'hold', sets: 5, min: 10, max: 30, inc: 0, skill: true, ladder: 'hs', note: 'Short, clean holds. Or swap to L-sit.' }),
      ex('pushup', 'Push-up', { sets: 4, min: 15, max: 25, bwf: 0.65, ladder: 'push', rest: 150, note: 'Strict reps. Progress to deficit or weighted.' }),
      ex('chinup', 'Chin-up', { sets: 3, min: 6, max: 10, bwf: 1, ladder: 'chin', rest: 150, note: 'Stop 1–2 reps short of failure.' }),
      ex('rdl', 'Romanian deadlift', { sets: 3, min: 8, max: 10, weighted: true, rest: 150, note: 'Dumbbell or barbell.' }),
      ex('pike', 'Pike push-up', { sets: 3, min: 6, max: 10, bwf: 0.6, ladder: 'pike', rest: 150, note: 'Or overhead press.' }),
      ex('hollow', 'Hollow body hold', { kind: 'hold', sets: 3, min: 30, max: 45, inc: 0, ladder: 'hollow' }),
      ex('plank', 'Plank', { kind: 'hold', sets: 3, min: 30, max: 45, inc: 0 }),
      ex('frontlever', 'Front lever hold', { kind: 'hold', sets: 5, min: 5, max: 15, inc: 0, skill: true, ladder: 'fl', step: 1, note: 'Tuck front lever, or bar hang progressions.' }),
      ex('lsit', 'L-sit', { kind: 'hold', sets: 5, min: 10, max: 30, inc: 0, skill: true, ladder: 'lsit', note: 'On parallettes or the floor.' }),
      ex('ohp', 'Overhead press', { sets: 3, min: 6, max: 10, weighted: true, rest: 150 }),
      ex('dbcurl', 'Dumbbell curl', { sets: 3, min: 8, max: 12, weighted: true }),
      ex('pushdown', 'Triceps pushdown', { sets: 3, min: 8, max: 12, weighted: true }),
      ex('latpull', 'Lat pulldown', { sets: 3, min: 8, max: 12, weighted: true }),
      ex('facepull', 'Face pull', { sets: 3, min: 12, max: 20, weighted: true }),
      ex('calf', 'Calf raise', { sets: 3, min: 10, max: 15, weighted: true }),
    ].forEach((e) => (E[e.id] = e));

    const L = (name, steps) => ({ name, steps: steps.map((s) => (Array.isArray(s) ? { n: s[0], w: 1 } : { n: s })) });
    const ladders = {
      pull: L('Pull-up line', ['Pull-up', ['Weighted pull-up'], 'Archer pull-up', 'One-arm negative', 'Assisted one-arm pull-up']),
      chin: L('Chin-up line', ['Chin-up', ['Weighted chin-up'], 'Archer chin-up']),
      push: L('Push-up line', ['Push-up', 'Deficit push-up', 'Archer push-up', 'Assisted one-arm push-up', 'One-arm push-up']),
      dip: L('Dip line', ['Dip', ['Weighted dip']]),
      pike: L('Pike line', ['Pike push-up', 'Elevated pike push-up', 'Wall handstand push-up negative', 'Wall handstand push-up']),
      split: L('Single-leg line', ['Bulgarian split squat', 'Assisted shrimp squat', 'Shrimp squat', 'Pistol squat']),
      raise: L('Core line', ['Hanging knee raise', 'Hanging leg raise', 'Toes-to-bar']),
      hollow: L('Hollow line', ['Tuck hollow hold', 'Hollow body hold', 'Hollow hold, arms overhead']),
      fl: L('Front lever line', ['Active bar hang', 'Tuck front lever', 'Advanced tuck front lever', 'Single-leg front lever', 'Straddle front lever', 'Full front lever']),
      hs: L('Handstand line', ['Wall handstand hold', 'Back-to-wall handstand', 'Freestanding handstand']),
      lsit: L('L-sit line', ['Tuck L-sit', 'One-leg L-sit', 'L-sit', 'V-sit']),
    };

    const it = (ex, sets, min, max) => ({ ex, sets: sets ?? E[ex].sets, min: min ?? E[ex].min, max: max ?? E[ex].max });
    const workouts = {
      A: { id: 'A', name: 'Workout A', items: [it('pullup'), it('dip'), it('bss'), it('row'), it('legraise'), it('handstand')] },
      B: { id: 'B', name: 'Workout B', items: [it('pushup'), it('chinup'), it('rdl'), it('pike'), it('hollow'), it('plank'), it('frontlever')] },
    };

    const mob = [
      ['Cat–cow', 60, 'Slow spinal waves. Breathe.'],
      ['Thread the needle · left', 40, 'Reach under, rotate the upper back.'],
      ['Thread the needle · right', 40, 'Reach under, rotate the upper back.'],
      ["World's greatest stretch · left", 45, 'Lunge, elbow to instep, then rotate up.'],
      ["World's greatest stretch · right", 45, 'Lunge, elbow to instep, then rotate up.'],
      ['Deep squat hold', 60, 'Heels down, elbows pushing knees out.'],
      ['Couch stretch · left', 50, 'Back knee to wall, squeeze the glute.'],
      ['Couch stretch · right', 50, 'Back knee to wall, squeeze the glute.'],
      ['Figure-4 stretch · left', 50, 'On your back, ankle over knee.'],
      ['Figure-4 stretch · right', 50, 'On your back, ankle over knee.'],
      ['Hamstring fold', 50, 'Soft knees, hang from the hips.'],
      ['Doorway pec stretch', 40, 'Forearm on the frame, step through.'],
      ['Band shoulder pass-throughs', 45, 'Wide grip, slow, arms straight.'],
      ['Wrist rocks and circles', 45, 'Palms down, then backs of hands.'],
      ['Dead hang', 40, 'Relax the shoulders, long spine.'],
      ['Child’s pose, breathing', 60, 'Long exhales to finish.'],
    ].map((m) => ({ n: m[0], s: m[1], cue: m[2] }));

    return {
      v: 1,
      settings: { sound: true, countdown: true, stars: true, boot: 'auto', lastBoot: '', anchor: LO.monday(today), installed: today, distUnit: 'mi', baseline: { pullup: 7, pushup: 20, dip: 7 } },
      exercises: E,
      ladders,
      workouts,
      week: [
        { k: 'workout', ref: 'A' },
        { k: 'cardio' },
        { k: 'workout', ref: 'B' },
        { k: 'mobility' },
        { k: 'alt', refs: ['A', 'B'] },
        { k: 'flex' },
        { k: 'rest' },
      ],
      overrides: {},
      mobility: mob,
      sessions: [],
      cardio: [],
      mobLog: [],
      holds: [],
      body: [],
      active: null,
    };
  };

  /* ---------- storage ---------- */
  LO.storageOk = true;
  LO.load = function () {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { LO.storageOk = false; }
    const d = LO.defaults();
    if (!raw) return d;
    try {
      const s = JSON.parse(raw);
      return LO.normalize(s, d);
    } catch (e) {
      try { localStorage.setItem(KEY + '.corrupt', raw); } catch (_) {}
      return d;
    }
  };
  LO.normalize = function (s, d) {
    d = d || LO.defaults();
    const out = Object.assign({}, d, s);
    out.settings = Object.assign({}, d.settings, s.settings || {});
    out.settings.baseline = Object.assign({}, d.settings.baseline, (s.settings || {}).baseline || {});
    ['exercises', 'ladders', 'workouts', 'overrides'].forEach((k) => { if (!out[k] || typeof out[k] !== 'object') out[k] = d[k]; });
    ['sessions', 'cardio', 'mobLog', 'holds', 'body', 'mobility', 'week'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = d[k]; });
    while (out.week.length < 7) out.week.push({ k: 'rest' });
    return out;
  };
  LO.S = LO.load();

  let t = null;
  LO.save = function () {
    clearTimeout(t);
    t = setTimeout(LO.saveNow, 120);
  };
  LO.saveNow = function () {
    try { localStorage.setItem(KEY, JSON.stringify(LO.S)); LO.storageOk = true; }
    catch (e) { LO.storageOk = false; if (LO.toast) LO.toast('Could not save — storage is full or blocked'); }
  };
  window.addEventListener('pagehide', LO.saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) LO.saveNow(); });
})();
