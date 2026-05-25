
(function () {
  const R = window.RadarLab;
  function draw() {
    const rangeKm = Number(R.$('range').value);
    const widthUs = Number(R.$('width').value);
    const bwMHz = Number(R.$('bandwidth').value);
    const noise = Number(R.$('noise').value) / 100;
    const delayUs = 2 * rangeKm * 1000 / 3e8 * 1e6;
    const resM = 3e8 / (2 * bwMHz * 1e6);
    R.$('delay').textContent = delayUs.toFixed(1) + ' μs';
    R.$('resolution').textContent = resM.toFixed(1) + ' m';
    drawEcho(rangeKm, widthUs, noise);
    drawMatched(rangeKm, bwMHz, noise);
  }
  function drawEcho(rangeKm, widthUs, noise) {
    const { ctx, w, h } = R.setupCanvas(R.$('echoPlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const rng = R.lcg(12);
    const pts = [];
    const center = rangeKm / 80;
    const sigma = 0.012 + widthUs / 260;
    for (let i = 0; i <= 520; i++) {
      const x = i / 520;
      let y = 0.24 + 0.12 * (rng() - .5) * noise + R.gaussian(x, center, sigma, 0.55);
      pts.push({ x, y: Math.max(.04, Math.min(.92, y)) });
    }
    R.linePlot(ctx, pts, box, '#0d4746', 2.2);
    const xPeak = box.left + center * box.pw;
    ctx.strokeStyle = 'rgba(201,137,63,.75)'; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(xPeak, box.top); ctx.lineTo(xPeak, box.top + box.ph); ctx.stroke(); ctx.setLineDash([]);
    R.label(ctx, '目标回波延迟', Math.min(xPeak + 8, w - 104), box.top + 22, '#9b5834');
    R.label(ctx, '距离门', box.left + box.pw - 48, h - 12);
  }
  function drawMatched(rangeKm, bwMHz, noise) {
    const { ctx, w, h } = R.setupCanvas(R.$('mfPlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const rng = R.lcg(24);
    const center = rangeKm / 80;
    const sigma = Math.max(0.006, 0.055 / Math.sqrt(bwMHz));
    const pts = [];
    for (let i = 0; i <= 620; i++) {
      const x = i / 620;
      const sidelobe = 0.08 * Math.sin(180 * (x - center)) / (1 + 70 * Math.abs(x - center));
      let y = 0.16 + 0.1 * (rng() - .5) * noise + R.gaussian(x, center, sigma, 0.72) + sidelobe;
      pts.push({ x, y: Math.max(.04, Math.min(.95, y)) });
    }
    R.linePlot(ctx, pts, box, '#1e6b68', 2.2);
    const xPeak = box.left + center * box.pw;
    ctx.strokeStyle = 'rgba(182,95,74,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xPeak, box.top + box.ph); ctx.lineTo(xPeak, box.top + 10); ctx.stroke();
    R.dot(ctx, xPeak, box.top + (1 - .88) * box.ph, 5, '#b65f4a');
    R.label(ctx, '读峰的位置得到距离', Math.min(xPeak + 8, w - 138), box.top + 24, '#b65f4a');
  }
  window.addEventListener('resize', draw);
  R.bindControls(draw);
}());
