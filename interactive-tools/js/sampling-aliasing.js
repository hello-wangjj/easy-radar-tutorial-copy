
(function () {
  const R = window.RadarLab;
  function signedAliasFreq(f, fs) {
    return ((f + fs / 2) % fs + fs) % fs - fs / 2;
  }
  function draw() {
    const f = Number(R.$('freq').value);
    const fs = Number(R.$('fs').value);
    const phase = Number(R.$('phase').value) * Math.PI / 180;
    const signedFa = signedAliasFreq(f, fs);
    const fa = Math.abs(signedFa);
    R.$('nyq').textContent = (fs / 2).toFixed(1) + ' Hz';
    R.$('alias').textContent = fa.toFixed(1) + ' Hz';
    drawTime(f, fs, phase, signedFa);
    drawFreq(f, fs, fa);
  }
  function drawTime(f, fs, phase, fa) {
    const canvas = R.$('timePlot');
    const { ctx, w, h } = R.setupCanvas(canvas);
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const duration = 1;
    const real = [];
    const alias = [];
    for (let i = 0; i <= 700; i++) {
      const t = i / 700 * duration;
      real.push({ x: t / duration, y: 0.5 + 0.34 * Math.sin(R.TAU * f * t + phase) });
      alias.push({ x: t / duration, y: 0.5 + 0.34 * Math.sin(R.TAU * fa * t + phase) });
    }
    R.linePlot(ctx, alias, box, 'rgba(182,95,74,.72)', 2);
    R.linePlot(ctx, real, box, '#0d4746', 2.4);
    const n = Math.floor(duration * fs);
    for (let k = 0; k <= n; k++) {
      const t = k / fs;
      const y = 0.5 + 0.34 * Math.sin(R.TAU * f * t + phase);
      const xPix = box.left + (t / duration) * box.pw;
      const yPix = box.top + (1 - y) * box.ph;
      ctx.strokeStyle = 'rgba(201,137,63,.34)';
      ctx.beginPath(); ctx.moveTo(xPix, box.top + box.ph * .5); ctx.lineTo(xPix, yPix); ctx.stroke();
      R.dot(ctx, xPix, yPix, 4.2, '#c9893f');
    }
    R.label(ctx, '真实连续信号', box.left + 10, box.top + 18, '#0d4746');
    R.label(ctx, '采样点也可能支持的低频假象', box.left + 10, box.top + 38, '#b65f4a');
    R.label(ctx, '时间 1 秒', box.left + box.pw - 72, h - 12);
  }
  function drawFreq(f, fs, fa) {
    const canvas = R.$('freqPlot');
    const { ctx, w, h } = R.setupCanvas(canvas);
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h, { top: 34, bottom: 48 });
    const maxF = 25;
    const nyq = fs / 2;
    function xOf(v) { return box.left + Math.min(v / maxF, 1) * box.pw; }
    ctx.fillStyle = 'rgba(13,71,70,.07)';
    ctx.fillRect(box.left, box.top, Math.min(nyq / maxF, 1) * box.pw, box.ph);
    ctx.strokeStyle = 'rgba(23,33,29,.25)';
    ctx.beginPath(); ctx.moveTo(xOf(nyq), box.top); ctx.lineTo(xOf(nyq), box.top + box.ph); ctx.stroke();
    [[f, '#0d4746', '真实频率'], [fa, '#b65f4a', '采样后看到的频率']].forEach(([v, color, text], idx) => {
      const x = xOf(v);
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x, box.top + box.ph); ctx.lineTo(x, box.top + 38 + idx * 18); ctx.stroke();
      R.label(ctx, text + ' ' + Number(v).toFixed(1) + ' Hz', Math.min(x + 8, w - 170), box.top + 44 + idx * 20, color);
    });
    R.label(ctx, '0', box.left - 5, h - 16);
    R.label(ctx, maxF + ' Hz', box.left + box.pw - 42, h - 16);
    R.label(ctx, 'Nyquist 区域', box.left + 12, box.top + 18, '#50615a');
  }
  window.addEventListener('resize', draw);
  R.bindControls(draw);
}());
