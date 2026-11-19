/* Low Orbit — Systems (settings, backup, reset) */
(function () {
  const LO = window.LO, esc = LO.esc;
  const VERSION = '1.0.0';

  const tog = (key, label, hint) => `<label class="trw"><div><b>${label}</b>${hint ? `<small class="mono">${hint}</small>` : ''}</div><input type="checkbox" class="sw" data-in="tog" data-k="${key}" ${LO.S.settings[key] ? 'checked' : ''}><i class="swi"></i></label>`;

  LO.views.settings = {
    depth: () => 0, tab: 4,
    html() {
      const S = LO.S, b = S.settings.baseline;
      let size = 0; try { size = (localStorage.getItem(LO.KEY) || '').length; } catch (e) {}
      return `<div class="pad"><header class="top rv"><div><small class="mono">SHIP SYSTEMS</small><h1>Systems</h1></div></header>
        ${LO.panel('ALERTS', tog('sound', 'Rest timer sound', 'Short tones when rest ends'))}
        ${LO.panel('DISPLAY', tog('countdown', 'Pre-burn countdown', 'Short launch sequence when you start a burn') + tog('stars', 'Starfield', 'Slow drifting background. Auto-off with Reduce Motion.') + `<label class="trw"><div><b>Launch sequence</b><small class="mono">Full once per day, quick after</small></div><select class="in sel" data-in="bootMode"><option value="auto" ${S.settings.boot === 'auto' ? 'selected' : ''}>Auto</option><option value="quick" ${S.settings.boot === 'quick' ? 'selected' : ''}>Always quick</option><option value="off" ${S.settings.boot === 'off' ? 'selected' : ''}>Off</option></select></label><button class="btn sm" data-act="replayBoot">Replay launch sequence</button>`)}
        ${LO.panel('UNITS AND BASELINE', `<label class="trw"><div><b>Cardio distance</b></div><select class="in sel" data-in="distUnit"><option value="mi" ${S.settings.distUnit === 'mi' ? 'selected' : ''}>Miles</option><option value="km" ${S.settings.distUnit === 'km' ? 'selected' : ''}>Kilometres</option></select></label><p class="foot mono">Weights are in lb. Starting reps feed the Trajectory chart.</p><div class="row3">${LO.field('Pull-ups', LO.numIn('bp', b.pullup).replace('name="bp"', 'data-in="base" data-k="pullup"'))}${LO.field('Push-ups', LO.numIn('bq', b.pushup).replace('name="bq"', 'data-in="base" data-k="pushup"'))}${LO.field('Dips', LO.numIn('bd', b.dip).replace('name="bd"', 'data-in="base" data-k="dip"'))}</div>`)}
        ${LO.panel('DATA', `<p class="mut">Everything lives on this phone only. Export a backup now and then.</p><div class="row2"><button class="btn solid" data-act="export">Export backup</button><label class="btn filebtn">Import backup<input type="file" accept="application/json,.json" data-in="importFile" hidden></label></div><button class="btn sm" data-act="copyJson">Copy backup as text</button><p class="foot mono">${S.sessions.length} BURNS · ${S.cardio.length} CARDIO · ${S.body.length} WEIGH-INS · ${(size / 1024).toFixed(1)} KB STORED${LO.storageOk ? '' : ' · STORAGE BLOCKED'}</p><button class="btn danger" data-act="reset">Reset all data…</button>`)}
        ${LO.panel('ABOUT', `<p class="mut">Low Orbit ${VERSION}. Built for one person. Works offline. No accounts, no tracking, no points. Just your numbers.</p><p class="foot mono">Add to Home Screen: Safari → Share → Add to Home Screen.</p>`)}
        <div class="spacer"></div></div>`;
    },
  };
  LO.ins.tog = (el) => { LO.S.settings[el.dataset.k] = el.checked; LO.save(); if (el.dataset.k === 'stars') LO.starsApply(); if (el.dataset.k === 'sound' && el.checked) { LO.unlockAudio(); LO.beep(660, 0.1, 0.1); } };
  LO.ins.bootMode = (el) => { LO.S.settings.boot = el.value; LO.save(); };
  LO.ins.distUnit = (el) => { LO.S.settings.distUnit = el.value; LO.save(); };
  LO.ins.base = (el) => { LO.S.settings.baseline[el.dataset.k] = Math.max(0, LO.num(el.value) | 0); LO.save(); };
  LO.acts.replayBoot = () => LO.boot(() => {}, 'full');

  const payload = () => JSON.stringify({ app: 'low-orbit', exported: new Date().toISOString(), data: LO.S }, null, 1);
  LO.acts.export = async () => {
    LO.saveNow();
    const name = 'low-orbit-backup-' + LO.ymd() + '.json', text = payload();
    try {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Low Orbit backup' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    LO.toast('Backup exported');
  };
  LO.acts.copyJson = async () => { try { await navigator.clipboard.writeText(payload()); LO.toast('Backup copied'); } catch (e) { LO.toast('Copy failed — use Export'); } };
  LO.ins.importFile = (el) => {
    const f = el.files && el.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result), d = j && j.data ? j.data : j;
        if (!d || typeof d !== 'object' || !d.exercises || !d.workouts || !Array.isArray(d.sessions)) throw new Error('bad');
        LO.confirm(`Replace everything on this phone with this backup (${d.sessions.length} burns)? Your current data is kept as a safety copy.`, 'Import', () => {
          try { localStorage.setItem(LO.KEY + '.prev', localStorage.getItem(LO.KEY) || ''); } catch (e) {}
          LO.S = LO.normalize(d); LO.S.active = null; LO.saveNow(); LO.toast('Backup imported'); setTimeout(() => location.reload(), 600);
        }, false, 'Import backup');
      } catch (e) { LO.toast('That file is not a Low Orbit backup'); }
      el.value = '';
    };
    rd.readAsText(f);
  };
  LO.acts.reset = () => {
    LO.sheet(`<h3>Reset all data</h3><p class="mut">This erases every burn, set, weigh-in and plan change on this phone and restores the starting plan. Export a backup first if you might want anything back.</p>${LO.field('Type RESET to confirm', '<input class="in" name="c" autocomplete="off" autocapitalize="characters">')}<div class="row2"><button class="btn" data-close>Cancel</button><button class="btn danger" data-ok disabled>Erase everything</button></div>`, (el, api) => {
      const inp = el.querySelector('[name="c"]'), ok = el.querySelector('[data-ok]');
      inp.oninput = () => { ok.disabled = inp.value.trim().toUpperCase() !== 'RESET'; };
      ok.onclick = () => { try { localStorage.removeItem(LO.KEY); } catch (e) {} LO.S = LO.defaults(); LO.saveNow(); api.close(); LO.toast('Reset complete'); setTimeout(() => { location.hash = '#/today'; location.reload(); }, 500); };
    });
  };
})();
