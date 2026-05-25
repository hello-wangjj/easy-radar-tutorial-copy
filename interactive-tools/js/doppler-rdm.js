
(function () {
  const R = window.RadarLab;
  const lambda = 0.03;
  const prf = 1000;
  function draw() {
    const rangeKm = Number(R.$('range').value);
    const velocity = Number(R.$('velocity').value);
    const snr = Number(R.$('snr').value) / 100;
    const clutter = Number(R.$('clutter').value) / 100;
    const fd = 2 * velocity / lambda;
    const phase = ((R.TAU * fd / prf) + Math.PI) % R.TAU - Math.PI;
    R.$('fd').textContent = fd.toFixed(0) + ' Hz';
    R.$('phaseStep').textContent = (phase * 180 / Math.PI).toFixed(0) + '°/pulse';
    drawSlow(fd, snr);
    drawRdm(rangeKm, velocity, snr, clutter);
  }
  function drawSlow(fd, snr) {
    const { ctx, w, h } = R.setupCanvas(R.$('slowPlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const ptsI = [], ptsQ = [];
    for (let n = 0; n < 64; n++) {
      const p = R.TAU * fd * n / prf;
      ptsI.push({ x: n / 63, y: 0.5 + 0.28 * snr * Math.cos(p) });
      ptsQ.push({ x: n / 63, y: 0.5 + 0.28 * snr * Math.sin(p) });
    }
    R.linePlot(ctx, ptsI, box, '#0d4746', 2.2);
    R.linePlot(ctx, ptsQ, box, '#b65f4a', 2.0);
    R.label(ctx, 'I 路相位变化', box.left + 12, box.top + 18, '#0d4746');
    R.label(ctx, 'Q 路相位变化', box.left + 12, box.top + 38, '#b65f4a');
    R.label(ctx, '脉冲序号', box.left + box.pw - 60, h - 12);
  }
  function color(v) {
    v = Math.max(0, Math.min(1, v));
    const stops = [
      [246,239,227], [135,182,162], [30,107,104], [201,137,63], [182,95,74]
    ];
    const p = v * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(p));
    const t = p - i;
    const a = stops[i], b = stops[i+1];
    return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
  }
  function drawRdm(rangeKm, velocity, snr, clutter) {
    const { ctx, w, h } = R.setupCanvas(R.$('rdmPlot'));
    R.clear(ctx, w, h);
    const left = 52, top = 24, right = 22, bottom = 44;
    const pw = w - left - right, ph = h - top - bottom;
    const cols = 72, rows = 52;
    const rng = R.lcg(44);
    const r0 = rangeKm / 90;
    const v0 = (velocity + 100) / 200;
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = ix / (cols - 1), y = iy / (rows - 1);
        const target = R.gaussian(x, r0, .035, snr) * R.gaussian(y, 1 - v0, .055, 1.2);
        const zeroClutter = R.gaussian(y, .5, .045, clutter) * (.45 + .4 * Math.sin(ix * .7) ** 2);
        const noise = .08 * rng();
        const val = target + zeroClutter + noise;
        ctx.fillStyle = color(Math.min(1, val));
        ctx.fillRect(left + ix * pw / cols, top + iy * ph / rows, Math.ceil(pw / cols) + 1, Math.ceil(ph / rows) + 1);
      }
    }
    ctx.strokeStyle = 'rgba(23,33,29,.32)'; ctx.strokeRect(left, top, pw, ph);
    ctx.strokeStyle = 'rgba(255,253,248,.9)'; ctx.lineWidth = 2;
    const xPeak = left + r0 * pw, yPeak = top + (1 - v0) * ph;
    ctx.beginPath(); ctx.arc(xPeak, yPeak, 12, 0, R.TAU); ctx.stroke();
    R.label(ctx, '距离', left + pw - 28, h - 14);
    R.label(ctx, '+速度', 8, top + 12);
    R.label(ctx, '0', 26, top + ph / 2 + 4);
    R.label(ctx, '-速度', 8, top + ph - 2);
  }
  window.addEventListener('resize', draw);
  R.bindControls(draw);
}());
