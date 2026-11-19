/* Low Orbit — FX: starfield, audio, haptics, wake lock, boot sequence, ignition */
(function () {
  const LO = window.LO;
  LO.reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- starfield (cheap: ~28fps, paused when hidden) ---------- */
  const cv = document.getElementById('stars'), cx = cv.getContext('2d');
  let stars = [], W = 0, H = 0, raf = 0, last = 0, warp = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((W * H) / 9000);
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    stars = Array.from({ length: n }, () => ({ x: rnd() * W, y: rnd() * H, z: 0.2 + rnd() * 0.8, p: rnd() * 6.28, c: rnd() }));
  }
  function draw(t) {
    cx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const tw = 0.55 + 0.45 * Math.sin(t / 1400 + s.p);
      cx.globalAlpha = (0.25 + s.z * 0.6) * tw;
      cx.fillStyle = s.c > 0.9 ? '#ffd9a0' : s.c > 0.8 ? '#a8f0e4' : '#cfe0f0';
      const r = s.z * 1.25;
      if (warp > 0.04) { cx.strokeStyle = cx.fillStyle; cx.lineWidth = r; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(s.x, s.y - s.z * warp * 70); cx.stroke(); }
      else cx.fillRect(s.x, s.y, r, r);
    }
    cx.globalAlpha = 1;
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (t - last < (warp > 0.03 ? 15 : 36)) return;
    const dt = Math.min(t - last, 120); last = t;
    warp = Math.max(0, warp - warp * dt / 320);
    const mul = 1 + warp * 70;
    for (const s of stars) { s.y += s.z * dt * 0.0035 * mul; s.x -= s.z * dt * 0.0012; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } if (s.x < -2) s.x = W; }
    draw(t);
  }
  LO.warp = (n = 1) => { if (LO.S.settings.stars && !LO.reduced()) warp = Math.min(2.4, Math.max(warp, n)); };
  LO.starsApply = function () {
    cancelAnimationFrame(raf); raf = 0;
    cv.style.display = LO.S.settings.stars ? '' : 'none';
    if (!LO.S.settings.stars) return;
    size();
    if (LO.reduced()) draw(0); else raf = requestAnimationFrame(loop);
  };
  window.addEventListener('resize', () => { if (LO.S.settings.stars) { size(); if (LO.reduced()) draw(0); } });
  document.addEventListener('visibilitychange', () => {
    if (!LO.S.settings.stars || LO.reduced()) return;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) raf = requestAnimationFrame(loop);
  });

  /* ---------- audio + haptics ---------- */
  let ac = null;
  LO.unlockAudio = function () {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  };
  document.addEventListener('pointerdown', LO.unlockAudio, { passive: true });
  LO.beep = function (freq = 880, dur = 0.12, vol = 0.14, when = 0) {
    if (!LO.S.settings.sound || !ac) return;
    try {
      const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + when;
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  };
  LO.chime = () => { LO.beep(660, 0.14, 0.14, 0); LO.beep(880, 0.14, 0.14, 0.16); LO.beep(1320, 0.28, 0.14, 0.32); };
  LO.tick = () => {};

  let wl = null;
  LO.wake = async function (on) {
    try {
      if (on && 'wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      else if (!on && wl) { await wl.release(); wl = null; }
    } catch (e) {}
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && LO.wantWake) LO.wake(true); });

  /* ---------- pre-burn launch sequence ---------- */
  LO.launch = function (sess, btn, cb) {
    let el = document.getElementById('launch');
    if (!el) { el = document.createElement('div'); el.id = 'launch'; document.body.appendChild(el); }
    const items = sess.entries.slice(0, 5), more = sess.entries.length - items.length;
    const C = 2 * Math.PI * 78;
    el.className = '';
    el.innerHTML = `<div class="lwrap"><div class="lname mono">${LO.esc(sess.name.toUpperCase())} · FINAL CHECKS</div>
      <div class="lring"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="78" class="lt"/><circle cx="90" cy="90" r="78" class="lp" stroke-dasharray="${C}" stroke-dashoffset="${C}" transform="rotate(-90 90 90)"/></svg><b class="lnum mono">—</b></div>
      <div class="llines mono"></div></div><button class="bskip mono">TAP TO SKIP</button>`;
    requestAnimationFrame(() => el.classList.add('in'));
    let done = false; const timers = [];
    const later = (f, ms) => timers.push(setTimeout(f, ms));
    const finish = (skipped) => {
      if (done) return; done = true; timers.forEach(clearTimeout);
      cb();
      if (!skipped) { el.classList.add('fire'); LO.shock(); }
      setTimeout(() => { el.classList.add('out'); }, skipped ? 0 : 120);
      setTimeout(() => { el.className = ''; el.innerHTML = ''; }, skipped ? 400 : 700);
    };
    el.onclick = () => finish(true);
    const ll = el.querySelector('.llines');
    items.forEach((e, i) => later(() => {
      const d = document.createElement('div');
      d.innerHTML = `<em>S${i + 1}</em><span>${LO.esc(e.name)}</span><i></i><b>ARMED</b>`;
      ll.appendChild(d); LO.beep(500 + i * 70, 0.04, 0.05);
    }, 260 + i * 170));
    if (more > 0) later(() => { const d = document.createElement('div'); d.className = 'more'; d.textContent = '+ ' + more + ' MORE STAGES'; ll.appendChild(d); }, 260 + items.length * 170);
    const t0 = 260 + (items.length + 1) * 170 + 200, num = el.querySelector('.lnum'), lp = el.querySelector('.lp');
    [3, 2, 1].forEach((n, i) => later(() => {
      num.textContent = n; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
      lp.style.transition = 'stroke-dashoffset .42s linear'; lp.style.strokeDashoffset = C * (1 - (i + 1) / 3.0) * 0.999;
      LO.beep(440 + i * 110, 0.1, 0.1); if (i === 2) LO.warp(1.4);
    }, t0 + i * 480));
    later(() => { num.textContent = 'GO'; num.classList.add('go'); LO.chime(); LO.warp(2.4); }, t0 + 3 * 480);
    later(() => finish(false), t0 + 3 * 480 + 380);
  };

  /* ---------- shockwave: expanding rings + flash ---------- */
  LO.shock = function () {
    if (LO.reduced()) return;
    const d = document.createElement('div');
    d.className = 'shock'; d.innerHTML = '<i></i><i></i><i></i><b></b>';
    document.body.appendChild(d); LO.warp(1.6);
    setTimeout(() => d.remove(), 1500);
  };

  /* ---------- count-up numbers ---------- */
  LO.countUp = function (root) {
    LO.$$('[data-count]', root).forEach((el) => {
      const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
      const fmt = (v) => (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US'));
      if (LO.reduced() || !isFinite(to) || to === 0) { el.textContent = fmt(to || 0); return; }
      const t0 = performance.now(), dur = 700;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  };

  /* ---------- ignition: expanding glow from a button, then callback ---------- */
  LO.ignite = function (btn, cb) {
    const ig = document.getElementById('ignite');
    if (LO.reduced() || !ig) { cb(); return; }
    const r = btn ? btn.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    ig.style.setProperty('--x', r.left + r.width / 2 + 'px');
    ig.style.setProperty('--y', r.top + r.height / 2 + 'px');
    ig.className = '';
    void ig.offsetWidth;
    ig.className = 'go'; LO.warp(2.2);
    setTimeout(cb, 330);
    setTimeout(() => { ig.className = 'out'; }, 360);
    setTimeout(() => { ig.className = ''; }, 900);
  };

  /* ---------- boot sequence ---------- */
  LO.boot = function (done, force) {
    const S = LO.S, today = LO.ymd(), boot = document.getElementById('boot');
    const mode = S.settings.boot;
    if (mode === 'off' && !force) { done(); return; }
    const full = force === 'full' || (mode !== 'quick' && S.settings.lastBoot !== today);
    S.settings.lastBoot = today; LO.save();
    const reduced = LO.reduced();
    const burns = S.sessions.length;
    const p = LO.planFor(today);
    const ring = `<svg class="bring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" class="r1"/><ellipse cx="60" cy="60" rx="54" ry="20" transform="rotate(-24 60 60)" class="r2" pathLength="1"/><circle cx="96" cy="37" r="3.2" class="rd"/></svg>`;
    boot.className = '';
    let finished = false, timers = [];
    const finish = () => {
      if (finished) return; finished = true; timers.forEach(clearTimeout);
      boot.classList.add('leave');
      setTimeout(() => { boot.className = 'hide'; boot.innerHTML = ''; }, reduced ? 10 : 520);
      done();
    };
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    boot.onclick = finish;
    if (reduced) {
      boot.innerHTML = `<div class="bwrap">${ring}<div class="bword">LOW ORBIT</div></div>`;
      later(finish, 600); return;
    }
    if (!full) {
      boot.innerHTML = `<div class="bwrap quick">${ring}<div class="bword">LOW ORBIT</div><div class="bsub mono">SYSTEMS READY</div></div><button class="bskip mono">TAP TO SKIP</button>`;
      later(() => LO.beep(660, 0.08, 0.08), 150);
      later(finish, 1100); return;
    }
    const lines = [
      ['FLIGHT COMPUTER', 'v1.0'],
      ['TELEMETRY LINK', 'OK'],
      ['LOCAL STORAGE', LO.storageOk ? 'OK · ' + burns + ' BURN' + (burns === 1 ? '' : 'S') + ' ON RECORD' : 'UNAVAILABLE'],
      ['GUIDANCE', 'NOMINAL'],
      ['TODAY', p.label.toUpperCase()],
    ];
    boot.innerHTML = `<div class="bfull"><div class="bring-wrap">${ring}</div><div class="blines mono"></div><div class="bcount"></div></div><button class="bskip mono">TAP TO SKIP</button>`;
    const bl = boot.querySelector('.blines'), bc = boot.querySelector('.bcount');
    lines.forEach((l, i) => later(() => {
      const d = document.createElement('div');
      d.innerHTML = `<span>${LO.esc(l[0])}</span><i></i><b>${LO.esc(l[1])}</b>`;
      bl.appendChild(d); LO.beep(520 + i * 60, 0.04, 0.05);
    }, 220 + i * 260));
    const t0 = 220 + lines.length * 260 + 120;
    ['3', '2', '1'].forEach((n, i) => later(() => { bc.innerHTML = `<b class="pop">${n}</b>`; LO.beep(440, 0.09, 0.1); }, t0 + i * 380));
    later(() => { bc.innerHTML = '<b class="pop go">IGNITION</b>'; boot.classList.add('lift'); LO.warp(2.4); LO.chime(); }, t0 + 3 * 380);
    later(finish, t0 + 3 * 380 + 650);
  };
})();
