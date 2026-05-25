
(function () {
  const R = window.RadarLab;
  function makeSeries(target, noise) {
    const rng = R.lcg(88);
    const n = 120;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const background = 0.11 + noise * (0.16 + 0.18 * R.gaussian(x, .72, .16));
      const speckle = noise * 0.34 * Math.pow(rng(), 2.2);
      const clutterEdge = noise * 0.28 * R.gaussian(x, .78, .035);
      const tgt = target * R.gaussian(x, .42, .018);
      arr.push(Math.min(.98, background + speckle + clutterEdge + tgt));
    }
    return arr;
  }
  function cfarLine(arr, scale) {
    const n = arr.length, out = [];
    const guard = 3, train = 9;
    for (let i = 0; i < n; i++) {
      let sum = 0, count = 0;
      for (let k = i - guard - train; k <= i + guard + train; k++) {
        if (k < 0 || k >= n || Math.abs(k - i) <= guard) continue;
        sum += arr[k]; count++;
      }
      out.push(Math.min(.96, (sum / Math.max(1, count)) * scale));
    }
    return out;
  }
  function draw() {
    const target = Number(R.$('target').value) / 100;
    const noise = Number(R.$('noise').value) / 100;
    const threshold = Number(R.$('threshold').value) / 100;
    const cfarScale = Number(R.$('cfar').value);
    const arr = makeSeries(target, noise);
    const line = cfarLine(arr, cfarScale);
    const targetIdx = Math.round(.42 * (arr.length - 1));
    const fixedHit = arr[targetIdx] > threshold;
    const cfarHit = arr[targetIdx] > line[targetIdx];
    const fixedFalse = arr.some((v, i) => Math.abs(i - targetIdx) > 5 && v > threshold);
    const cfarFalse = arr.some((v, i) => Math.abs(i - targetIdx) > 5 && v > line[i]);
    R.$('fixedState').textContent = fixedHit ? (fixedFalse ? '检出 + 有虚警' : '检出目标') : '可能漏检';
    R.$('cfarState').textContent = cfarHit ? (cfarFalse ? '检出 + 少量虚警' : '检出目标') : '可能漏检';
    drawFixed(arr, threshold, targetIdx);
    drawCfar(arr, line, targetIdx);
  }
  function drawSeries(canvas, arr, extraLine, targetIdx, titleColor) {
    const { ctx, w, h } = R.setupCanvas(canvas);
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const pts = arr.map((y, i) => ({ x: i / (arr.length - 1), y }));
    R.linePlot(ctx, pts, box, '#0d4746', 2.1);
    if (extraLine) R.linePlot(ctx, extraLine.map((y, i) => ({ x: i / (extraLine.length - 1), y })), box, titleColor, 2.2);
    const xT = box.left + targetIdx / (arr.length - 1) * box.pw;
    ctx.strokeStyle = 'rgba(201,137,63,.7)'; ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(xT, box.top); ctx.lineTo(xT, box.top + box.ph); ctx.stroke(); ctx.setLineDash([]);
    R.label(ctx, '目标所在距离门', Math.min(xT + 8, w - 116), box.top + 22, '#9b5834');
    return { ctx, w, h, box };
  }
  function drawFixed(arr, threshold, targetIdx) {
    const { ctx, w, box } = drawSeries(R.$('fixedPlot'), arr, null, targetIdx, '#b65f4a');
    const y = box.top + (1 - threshold) * box.ph;
    ctx.strokeStyle = '#b65f4a'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(box.left, y); ctx.lineTo(box.left + box.pw, y); ctx.stroke();
    R.label(ctx, '固定阈值', box.left + box.pw - 72, Math.max(box.top + 14, y - 8), '#b65f4a');
  }
  function drawCfar(arr, line, targetIdx) {
    drawSeries(R.$('cfarPlot'), arr, line, targetIdx, '#b65f4a');
  }
  window.addEventListener('resize', draw);
  R.bindControls(draw);
}());
