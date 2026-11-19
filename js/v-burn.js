/* Low Orbit — Burn (workout logging) and shared session editor */
(function () {
  const LO = window.LO, esc = LO.esc, $ = LO.$;

  const lastBefore = (exId, sess) => { const a = LO.entriesFor(exId).filter((x) => x.sess.id !== sess.id && x.date <= sess.date); return a.length ? a[a.length - 1] : null; };
  const exOf = (e) => LO.S.exercises[e.ex];
  const wStep = (e) => { const ex = exOf(e); return ex && ex.inc > 0 && ex.inc < 5 ? ex.inc : 5; };
  const showW = (e) => { const ex = exOf(e); return (ex && LO.isWeighted(ex)) || e.sets.some((s) => s.w > 0); };
  const fmtSets = (e) => { const ds = LO.doneSets(e); const mw = ds.reduce((m, s) => Math.max(m, s.w || 0), 0); return ds.map((s) => s.r).join(' · ') + (mw ? '  @ +' + mw + ' lb' : '') + (e.kind === 'hold' ? ' s' : ''); };

  function setRow(e, s, i, live) {
    const hold = e.kind === 'hold', sw = showW(e);
    return `<div class="sr ${s.done ? 'done' : ''}" data-s="${i}">
      <span class="sn mono">${i + 1}</span>
      <div class="step"><button data-act="stp" data-f="r" data-d="-1" aria-label="less">−</button><input class="num" data-in="setv" data-f="r" type="text" inputmode="numeric" value="${s.r || ''}" placeholder="0" aria-label="${hold ? 'seconds' : 'reps'}"><button data-act="stp" data-f="r" data-d="1" aria-label="more">+</button></div>
      ${sw ? `<div class="step w"><button data-act="stp" data-f="w" data-d="-1" aria-label="less weight">−</button><input class="num" data-in="setv" data-f="w" type="text" inputmode="decimal" value="${s.w || ''}" placeholder="0" aria-label="added weight"><button data-act="stp" data-f="w" data-d="1" aria-label="more weight">+</button></div>` : ''}
      <button class="nb ${s.n ? 'has' : ''}" data-act="setNote" aria-label="note"><svg viewBox="0 0 24 24"><path d="M5 4h14v12H9l-4 4z"/></svg></button>
      <button class="ck" data-act="setDone" aria-label="${s.done ? 'logged' : 'log set'}"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></button>
      <div class="note ${s.n ? 'open' : ''}"><input class="in" data-in="setnote" value="${esc(s.n)}" placeholder="Note for this set" autocomplete="off"></div>
    </div>`;
  }

  function entryCard(e, i, sess, live) {
    const ex = exOf(e), hold = e.kind === 'hold';
    const last = lastBefore(e.ex, sess);
    const sug = live && ex ? LO.suggest(e.ex) : null;
    const done = LO.doneSets(e).length;
    const t = e.tgt || { sets: e.sets.length, min: 0, max: 0 };
    const lastTxt = last ? `<div class="elast mono"><span>LAST · ${LO.fmtDs(last.date).toUpperCase()}</span><b>${esc(fmtSets(last.e))}</b></div>` : `<div class="elast mono"><span>LAST</span><b class="mut">first time logged</b></div>`;
    const sw = showW(e);
    return `<section class="panel ecard rv ${done && done >= e.sets.length ? 'alldone' : ''}" data-e="${i}">
      <div class="eh"><div><b>${esc(e.name)}</b><small class="mono">TARGET ${t.sets} × ${t.min === t.max ? t.min : t.min + '–' + t.max}${hold ? ' s' : ''}${e.side ? ' per side' : ''}${ex ? ' · REST ' + LO.mmss(ex.rest) : ''}</small></div><button class="ib" data-act="exMenu" aria-label="Exercise options"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg></button></div>
      ${lastTxt}
      ${sug ? `<div class="sug"><div><b class="mono">▲ INCREASE DIFFICULTY</b><span>Top of range on every set last time.</span></div>${sug.opts.map((o, k) => `<button class="chip" data-act="applyLive" data-k="${k}">${esc(o.label)}<small>${esc(o.detail)}</small></button>`).join('')}</div>` : ''}
      ${ex && ex.note ? `<div class="enote">${esc(ex.note)}</div>` : ''}
      <div class="sh mono"><span></span><span>${hold ? 'SECONDS' : 'REPS'}</span>${sw ? '<span>+ LB</span>' : ''}</div>
      ${e.sets.map((s, k) => setRow(e, s, k, live)).join('')}
      <div class="eadd"><button class="btn sm" data-act="addSet">+ Set</button><button class="btn sm" data-act="delSet" ${e.sets.length <= 1 ? 'disabled' : ''}>− Set</button><span class="mono cnt">${done}/${e.sets.length}</span></div>
    </section>`;
  }

  const pct = (a) => { const t = a.entries.reduce((n, e) => n + e.sets.length, 0); return t ? Math.min(100, Math.round(LO.sessionStats(a).sets / t * 100)) : 0; };
  function sessionBody(sess, live) {
    return `<div data-sid="${sess.id}" data-live="${live ? 1 : 0}">
      ${sess.entries.map((e, i) => entryCard(e, i, sess, live)).join('') || '<div class="empty rv">No exercises yet. Add one below.</div>'}
      <button class="btn xl rv" data-act="addEx">+ Add exercise</button>
    </div>`;
  }

  /* ---------- live burn ---------- */
  let clock = 0;
  LO.views.workout = {
    depth: () => 1, tab: 0,
    html() {
      const a = LO.S.active;
      if (!a) return `<div class="pad">${LO.hdr('No burn in progress', { kicker: 'BURN' })}<div class="panel rv"><p class="mut">Start one from the Today screen.</p><button class="btn solid" data-act="nav" data-to="#/today">Go to Today</button></div></div>`;
      const st = LO.sessionStats(a);
      return `<div class="pad">
        ${LO.hdr(a.name, { kicker: 'BURN · IN PROGRESS', right: `<button class="btn sm solid" data-act="finish">Finish</button>` })}
        <div class="telem rv mono"><div><small>ELAPSED</small><b id="elapsed">${LO.mmss((Date.now() - a.start) / 1000)}</b></div><div><small>SETS</small><b id="sets">${st.sets}</b></div><div><small>VOLUME</small><b id="vol">${LO.fmtVol(st.vol)}</b></div><div class="pbar"><i id="pfill" style="width:${pct(a)}%"></i><span>${pct(a)}% OF PLANNED SETS</span></div></div>
        ${sessionBody(a, true)}
        <button class="btn solid xl rv" data-act="finish">Finish burn</button>
        <button class="btn danger sm rv" data-act="discard">Discard burn</button>
        <div class="spacer"></div>
      </div>`;
    },
    mount() {
      LO.wantWake = true; LO.wake(true);
      clearInterval(clock);
      clock = setInterval(() => { const a = LO.S.active, el = $('#elapsed'); if (a && el) el.textContent = LO.mmss((Date.now() - a.start) / 1000); }, 1000);
    },
    unmount() { clearInterval(clock); LO.wantWake = false; LO.wake(false); },
  };

  /* ---------- session editor (past) ---------- */
  LO.views.session = {
    depth: () => 1, tab: 2,
    html(p) {
      const s = LO.getSession(p[0]);
      if (!s) return `<div class="pad">${LO.hdr('Not found')}<div class="panel"><p class="mut">That entry no longer exists.</p></div></div>`;
      return `<div class="pad">
        ${LO.hdr(s.name, { kicker: 'EDIT BURN · ' + LO.fmtD(s.date).toUpperCase(), right: `<button class="ib" data-act="delSession" data-id="${s.id}" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>` })}
        <div class="panel rv"><div class="row2">${LO.field('Date', `<input class="in" type="date" value="${s.date}" data-in="sessDate" data-id="${s.id}">`)}${LO.field('Name', `<input class="in" value="${esc(s.name)}" data-in="sessName" data-id="${s.id}">`)}</div></div>
        ${sessionBody(s, false)}
        <div class="spacer"></div></div>`;
    },
  };
  LO.ins.sessDate = (el) => { const s = LO.getSession(el.dataset.id); if (s && /^\d{4}-\d{2}-\d{2}$/.test(el.value)) { s.date = el.value; LO.save(); } };
  LO.ins.sessName = (el) => { const s = LO.getSession(el.dataset.id); if (s) { s.name = el.value; LO.save(); } };
  LO.acts.delSession = (el) => LO.confirm('Delete this burn and all its sets? This cannot be undone.', 'Delete', () => { LO.S.sessions = LO.S.sessions.filter((s) => s.id !== el.dataset.id); LO.save(); LO.toast('Deleted'); history.back(); });

  /* ---------- context ---------- */
  function ctx(el) {
    const root = el.closest('[data-sid]'), sess = LO.getSession(root.dataset.sid), card = el.closest('.ecard');
    const ei = card ? +card.dataset.e : -1, row = el.closest('.sr');
    return { root, sess, card, ei, e: sess.entries[ei], row, si: row ? +row.dataset.s : -1, live: root.dataset.live === '1' };
  }
  const refreshTelem = (sess) => { const st = LO.sessionStats(sess); const a = $('#sets'), b = $('#vol'); if (a) a.textContent = st.sets; const pf = $('#pfill'); if (pf) { const p = pct(sess); pf.style.width = p + '%'; pf.nextElementSibling.textContent = p + '% OF PLANNED SETS'; pf.parentNode.classList.toggle('full', p >= 100); } if (b) b.textContent = LO.fmtVol(st.vol); };
  const upd = (c) => { const done = LO.doneSets(c.e).length; $('.cnt', c.card).textContent = done + '/' + c.e.sets.length; c.card.classList.toggle('alldone', done >= c.e.sets.length); refreshTelem(c.sess); };

  LO.acts.stp = (el) => {
    const c = ctx(el), s = c.e.sets[c.si], f = el.dataset.f, d = +el.dataset.d;
    const step = f === 'r' ? (c.e.kind === 'hold' ? 5 : 1) : wStep(c.e);
    s[f] = Math.max(0, LO.round1((s[f] || 0) + d * step));
    c.row.querySelector(`input[data-f="${f}"]`).value = s[f] || '';
    if (s.done && f === 'r' && !s.r) { s.done = false; c.row.classList.remove('done'); }
    LO.tick(); LO.save(); upd(c);
  };
  LO.ins.setv = (el) => { const c = ctx(el); c.e.sets[c.si][el.dataset.f] = Math.max(0, LO.num(el.value)); LO.save(); if (el.dataset.f === 'w' || true) upd(c); };
  LO.ins.setnote = (el) => { const c = ctx(el); c.e.sets[c.si].n = el.value; c.row.querySelector('.nb').classList.toggle('has', !!el.value); LO.save(); };
  LO.acts.setNote = (el) => { const row = el.closest('.sr'), n = row.querySelector('.note'); n.classList.toggle('open'); if (n.classList.contains('open')) n.querySelector('input').focus(); };
  LO.acts.setDone = (el) => {
    const c = ctx(el), s = c.e.sets[c.si];
    if (!s.done && !(s.r > 0)) { LO.toast(c.e.kind === 'hold' ? 'Enter the hold time first' : 'Enter the reps first'); return; }
    s.done = !s.done;
    c.row.classList.toggle('done', s.done);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    LO.save(); upd(c);
    if (s.done) {
      LO.tick();
      const b = document.createElement('div'); b.className = 'burst';
      b.style.left = el.offsetLeft + el.offsetWidth / 2 + 'px'; b.style.top = el.offsetTop + el.offsetHeight / 2 + 'px';
      b.innerHTML = '<i class="ring"></i>' + Array.from({ length: 8 }, (_, i) => `<i class="sp" style="--a:${i * 45}deg"></i>`).join('');
      c.row.appendChild(b); setTimeout(() => b.remove(), 800);
      if (c.live) { const ex = exOf(c.e); const r = ex ? ex.rest : 75; if (r > 0) LO.restStart(r); }
    }
  };
  LO.acts.addSet = (el) => { const c = ctx(el), l = c.e.sets[c.e.sets.length - 1]; c.e.sets.push({ r: l ? l.r : 0, w: l ? l.w : 0, n: '', done: false }); LO.save(); LO.refresh(); };
  LO.acts.delSet = (el) => { const c = ctx(el); if (c.e.sets.length > 1) { c.e.sets.pop(); LO.save(); LO.refresh(); } };
  LO.acts.applyLive = (el) => { const c = ctx(el), sug = LO.suggest(c.e.ex); if (sug) { LO.applyProg(c.e.ex, sug.opts[+el.dataset.k], c.e); LO.toast('Updated target'); LO.refresh(); } };

  LO.acts.addEx = (el) => {
    const c = ctx(el);
    LO.pickExercise((id) => { c.sess.entries.push(LO.makeEntry(id, c.live ? {} : { blank: true })); LO.save(); LO.refresh(); setTimeout(() => { const v = $('.view'); if (v) v.scrollTo({ top: v.scrollHeight, behavior: 'smooth' }); }, 50); }, 'Add exercise');
  };

  LO.acts.exMenu = (el) => {
    const c = ctx(el), ex = exOf(c.e), S = LO.S;
    const hasDone = LO.doneSets(c.e).length > 0;
    const lad = ex && ex.ladder && S.ladders[ex.ladder];
    const canUp = lad && ex.step < lad.steps.length - 1, canDown = lad && ex.step > 0;
    LO.sheet(`<h3>${esc(c.e.name)}</h3><div class="plist">
      <button class="pitem" data-m="swap"><b>Swap exercise</b><small class="mono">REPLACE WITH ANOTHER</small></button>
      ${canUp ? `<button class="pitem" data-m="up"><b>Advance variation</b><small class="mono">→ ${esc(lad.steps[ex.step + 1].n)}</small></button>` : ''}
      ${canDown ? `<button class="pitem" data-m="down"><b>Easier variation</b><small class="mono">← ${esc(lad.steps[ex.step - 1].n)}</small></button>` : ''}
      ${ex ? `<button class="pitem" data-m="edit"><b>Edit exercise</b><small class="mono">SETS · RANGE · REST</small></button>` : ''}
      ${ex ? `<button class="pitem" data-m="detail"><b>Charts and history</b></button>` : ''}
      <button class="pitem" data-m="mvup"><b>Move up</b></button><button class="pitem" data-m="mvdn"><b>Move down</b></button>
      <button class="pitem danger" data-m="remove"><b>Remove from this burn</b></button></div>`, (m, api) => {
      m.onclick = (ev) => {
        const b = ev.target.closest('[data-m]'); if (!b) return;
        const k = b.dataset.m; api.close();
        const guard = (fn) => (hasDone ? LO.confirm('This exercise has logged sets. They will be lost.', 'Continue', fn, true, 'Heads up') : fn());
        if (k === 'swap') guard(() => LO.pickExercise((id) => { c.sess.entries[c.ei] = LO.makeEntry(id, c.live ? {} : { blank: true }); LO.save(); LO.refresh(); }, 'Swap for'));
        if (k === 'up' || k === 'down') {
          if (hasDone) { LO.toast('Clear or finish this exercise’s sets first'); return; }
          ex.step += k === 'up' ? 1 : -1; ex.w = 0;
          const ne = LO.makeEntry(ex.id, Object.assign({}, c.e.tgt, c.live ? {} : { blank: true })); c.sess.entries[c.ei] = ne; LO.save(); LO.refresh(); LO.toast('Now: ' + ne.name);
        }
        if (k === 'edit') LO.exerciseForm(ex, () => LO.refresh());
        if (k === 'detail') LO.nav('#/ex/' + ex.id);
        if (k === 'mvup' && c.ei > 0) { const a = c.sess.entries; [a[c.ei - 1], a[c.ei]] = [a[c.ei], a[c.ei - 1]]; LO.save(); LO.refresh(); }
        if (k === 'mvdn' && c.ei < c.sess.entries.length - 1) { const a = c.sess.entries; [a[c.ei + 1], a[c.ei]] = [a[c.ei], a[c.ei + 1]]; LO.save(); LO.refresh(); }
        if (k === 'remove') guard(() => { c.sess.entries.splice(c.ei, 1); LO.save(); LO.refresh(); });
      };
    });
  };

  /* ---------- finishing ---------- */
  LO.acts.discard = () => LO.confirm('Throw away this burn and everything logged in it?', 'Discard', () => { LO.S.active = null; LO.restStop(); LO.save(); LO.nav('#/today'); });
  LO.acts.finish = function () {
    const S = LO.S, a = S.active;
    if (!a) return;
    const st = LO.sessionStats(a);
    if (!st.sets) { LO.confirm('No sets logged yet. Discard this burn instead?', 'Discard', () => { S.active = null; LO.restStop(); LO.save(); LO.nav('#/today'); }, true, 'Nothing logged'); return; }
    const before = {};
    a.entries.forEach((e) => { if (!before[e.ex]) before[e.ex] = LO.records(e.ex); });
    a.entries = a.entries.filter((e) => LO.doneSets(e).length);
    a.end = Date.now();
    S.sessions.push(a); S.active = null; LO.restStop(); LO.save();
    const fin = LO.sessionStats(a);
    const recs = [];
    a.entries.forEach((e) => {
      const b = before[e.ex], n = LO.records(e.ex);
      if (b && b.top && n.top && n.top.date === a.date && n.top.r > b.top.r) recs.push(`${esc(e.name)}: ${n.top.r}${e.kind === 'hold' ? ' s' : ' reps'}`);
      else if (b && b.heavy && n.heavy && n.heavy.date === a.date && n.heavy.w > b.heavy.w) recs.push(`${esc(e.name)}: +${n.heavy.w} lb × ${n.heavy.r}`);
    });
    const sugs = [...new Set(a.entries.map((e) => e.ex))].map((id) => LO.suggest(id)).filter(Boolean);
    LO.chime(); LO.shock();
    const mins = Math.max(1, Math.round((a.end - a.start) / 60000));
    LO.sheet(`<div class="debrief"><svg class="bring sm" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" class="r1"/><ellipse cx="60" cy="60" rx="54" ry="20" transform="rotate(-24 60 60)" class="r2" pathLength="1"/><circle cx="96" cy="37" r="3.2" class="rd"/></svg><h3>Burn complete</h3></div>
      <div class="stats3"><div><b class="mono">${mins}</b><small class="mono">MIN</small></div><div><b class="mono">${fin.sets}</b><small class="mono">SETS</small></div><div><b class="mono">${LO.fmtVol(fin.vol)}</b><small class="mono">VOLUME LB</small></div></div>
      ${recs.length ? `<div class="dsec"><small class="mono">NEW BESTS</small>${recs.map((r) => `<div class="dline">${r}</div>`).join('')}</div>` : ''}
      ${sugs.length ? `<div class="dsec"><small class="mono">READY TO PROGRESS</small>${sugs.map((sg, i) => `<div class="dline sg"><b>${esc(LO.S.exercises[sg.exId] ? LO.exName(LO.S.exercises[sg.exId]) : '')}</b>${sg.opts.map((o, k) => `<button class="chip" data-sg="${i}" data-k="${k}">${esc(o.label)}<small>${esc(o.detail)}</small></button>`).join('')}</div>`).join('')}</div>` : ''}
      <button class="btn solid xl" data-ok>Done</button>`, (el, api) => {
      el.onclick = (ev) => {
        const b = ev.target.closest('[data-sg]');
        if (b) { const sg = sugs[+b.dataset.sg]; LO.applyProg(sg.exId, sg.opts[+b.dataset.k]); b.closest('.dline').innerHTML = '<span class="ok mono">✓ TARGET UPDATED</span>'; }
        if (ev.target.closest('[data-ok]')) api.close();
      };
    });
    LO.nav('#/today');
  };
})();
