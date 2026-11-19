/* Low Orbit — hand-drawn SVG charts. Real data only. */
(function () {
  const LO = window.LO;
  const C = { amber: '#ffb454', cy: '#62e6d2', red: '#ff5b4a', dim: '#7c8ea1', grid: 'rgba(120,150,180,.14)' };
  LO.C = C;
  let uid = 0;

  LO.niceTicks = function (min, max, n = 4) {
    if (max - min < 1e-9) { max = min + 1; }
    const step0 = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
    for (let v = lo; v <= hi + step * 1e-6; v += step) t.push(+v.toFixed(6));
    return t;
  };
  const dfmt = (t) => { const d = new Date(t); return d.getDate() + ' ' + LO.MONTHS[d.getMonth()]; };

  /* o: {series:[{name,color,pts:[{t,v,tip}],dash,dots}], h, zero, fmt, area, markers:[{t,label}]} */
  LO.lineChart = function (host, o) {
    const series = o.series.filter((s) => s.pts.length);
    if (!series.length) { host.innerHTML = '<div class="empty">No data yet. Log a set and it shows up here.</div>'; return; }
    const W = host.clientWidth || 320, H = o.h || 190, L = 38, R = 14, T = 12, B = 24;
    const all = series.flatMap((s) => s.pts);
    let tmin = Math.min(...all.map((p) => p.t)), tmax = Math.max(...all.map((p) => p.t));
    const day = 864e5;
    if (tmax - tmin < 6 * day) { const pad = (6 * day - (tmax - tmin)) / 2; tmin -= pad; tmax += pad; }
    else { const pad = (tmax - tmin) * 0.03; tmin -= pad; tmax += pad; }
    let vmin = Math.min(...all.map((p) => p.v)), vmax = Math.max(...all.map((p) => p.v));
    if (o.zero) vmin = Math.min(vmin, 0);
    const ticks = LO.niceTicks(o.zero ? 0 : vmin - (vmax - vmin) * 0.06, vmax + (vmax - vmin) * 0.06 + (vmax === vmin ? 1 : 0), 4);
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const X = (t) => L + ((t - tmin) / (tmax - tmin)) * (W - L - R);
    const Y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const id = 'g' + ++uid;
    const fmt = o.fmt || ((v) => LO.fmtN(v));
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="chart" role="img" aria-label="${LO.esc(o.label || 'chart')}">`;
    s += `<defs>`;
    series.forEach((sr, i) => { s += `<linearGradient id="${id}a${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sr.color}" stop-opacity=".28"/><stop offset="1" stop-color="${sr.color}" stop-opacity="0"/></linearGradient>`; });
    s += `</defs>`;
    ticks.forEach((v) => { const y = Y(v); s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${C.grid}" stroke-dasharray="2 4"/><text x="${L - 6}" y="${y + 3}" text-anchor="end" class="ax">${fmt(v)}</text>`; });
    const xt = [tmin + (tmax - tmin) * 0.03, (tmin + tmax) / 2, tmax - (tmax - tmin) * 0.03];
    xt.forEach((t, i) => { s += `<text x="${X(t)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}" class="ax">${dfmt(t)}</text>`; });
    (o.markers || []).forEach((m) => { const x = X(m.t); s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="${C.amber}" stroke-opacity=".35" stroke-dasharray="1 3"/><text x="${x + 3}" y="${T + 8}" class="ax" fill="${C.amber}" style="fill:${C.amber}">${LO.esc(m.label)}</text>`; });
    series.forEach((sr, i) => {
      const pts = sr.pts.map((p) => [X(p.t), Y(p.v)]);
      const d = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (o.area !== false && pts.length > 1 && !sr.dash) s += `<path d="${d} L${pts[pts.length - 1][0]} ${H - B} L${pts[0][0]} ${H - B} Z" fill="url(#${id}a${i})" class="area"/>`;
      if (pts.length > 1) s += `<path d="${d}" fill="none" stroke="${sr.color}" stroke-width="${sr.dash ? 1.6 : 2}" ${sr.dash ? 'stroke-dasharray="4 4"' : ''} stroke-linejoin="round" stroke-linecap="round" pathLength="1" class="ln"/>`;
      if (sr.dots !== false) pts.forEach((p, j) => { const last = j === pts.length - 1 && !sr.dash; s += `<circle cx="${p[0]}" cy="${p[1]}" r="${last ? 4.2 : 2.6}" fill="${last ? sr.color : '#04060b'}" stroke="${sr.color}" stroke-width="1.5" class="dot"/>`; });
      const lp = pts[pts.length - 1];
      if (!sr.dash) s += `<circle cx="${lp[0]}" cy="${lp[1]}" r="9" fill="none" stroke="${sr.color}" stroke-opacity=".4" class="pulse"/>`;
    });
    s += `<line class="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="${C.dim}" stroke-opacity=".6" style="display:none"/>`;
    s += `<rect class="hit" x="0" y="0" width="${W}" height="${H}" fill="transparent"/></svg>`;
    const lastSr = series[0].pts[series[0].pts.length - 1];
    const legend = series.length > 1 ? `<div class="legend">${series.map((sr) => `<span><i style="background:${sr.color}"></i>${LO.esc(sr.name)}</span>`).join('')}</div>` : '';
    host.innerHTML = `<div class="ro mono">${LO.esc(lastSr.tip || fmt(lastSr.v))}</div>${s}${legend}`;
    const svg = host.querySelector('svg'), ro = host.querySelector('.ro'), xh = host.querySelector('.xh');
    const pick = (ev) => {
      const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * W;
      let best = null, bd = 1e9;
      series.forEach((sr) => sr.pts.forEach((p) => { const dd = Math.abs(X(p.t) - x); if (dd < bd) { bd = dd; best = p; } }));
      if (best) { ro.textContent = best.tip || fmt(best.v); xh.style.display = ''; xh.setAttribute('x1', X(best.t)); xh.setAttribute('x2', X(best.t)); }
    };
    svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') pick(e); });
  };

  LO.spark = function (vals, o = {}) {
    const w = o.w || 84, h = o.h || 28, col = o.color || C.cy;
    if (!vals.length) return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><line x1="2" x2="${w - 2}" y1="${h / 2}" y2="${h / 2}" stroke="${C.dim}" stroke-opacity=".4" stroke-dasharray="2 3"/></svg>`;
    const mn = Math.min(...vals), mx = Math.max(...vals), span = mx - mn || 1;
    const pts = vals.map((v, i) => [vals.length === 1 ? w / 2 : 3 + (i / (vals.length - 1)) * (w - 6), h - 4 - ((v - mn) / span) * (h - 8) * (mx === mn ? 0 : 1) - (mx === mn ? h / 2 - 4 : 0)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const lp = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${pts.length > 1 ? `<path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>` : ''}<circle cx="${lp[0]}" cy="${lp[1]}" r="3" fill="${col}"/></svg>`;
  };

  /* simple vertical bars: items [{label, v, tip}] */
  LO.barChart = function (host, items, o = {}) {
    const W = host.clientWidth || 320, H = o.h || 130, L = 8, R = 8, T = 16, B = 20;
    const mx = Math.max(1, ...items.map((i) => i.v));
    const bw = (W - L - R) / items.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="chart">`;
    items.forEach((it, i) => {
      const h = (it.v / mx) * (H - T - B), x = L + i * bw + bw * 0.2, y = H - B - h;
      s += `<rect x="${x}" y="${H - B - 1}" width="${bw * 0.6}" height="${Math.max(1, h)}" rx="1.5" fill="${it.cur ? C.amber : C.cy}" fill-opacity="${it.v ? (it.cur ? 1 : 0.7) : 0.15}" class="bar" style="--d:${i * 40}ms;transform-origin:${x + bw * 0.3}px ${H - B}px"><title>${LO.esc(it.tip || '')}</title></rect>`;
      if (it.v) s += `<text x="${x + bw * 0.3}" y="${y - 4}" text-anchor="middle" class="ax">${LO.fmtN(it.v)}</text>`;
      s += `<text x="${x + bw * 0.3}" y="${H - 6}" text-anchor="middle" class="ax">${LO.esc(it.label)}</text>`;
    });
    host.innerHTML = s + '</svg>';
  };
})();
