
(function () {
  const TAU = Math.PI * 2;
  function $(id) { return document.getElementById(id); }
  function bindControls(onChange) {
    document.querySelectorAll('input[type="range"]').forEach((input) => {
      const out = document.querySelector(`[data-for="${input.id}"]`);
      const unit = input.dataset.unit || '';
      const decimals = Number(input.dataset.decimals || 0);
      const refresh = () => {
        if (out) out.textContent = `${Number(input.value).toFixed(decimals)}${unit}`;
        onChange();
      };
      input.addEventListener('input', refresh);
      refresh();
    });
  }
  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(320, Math.floor(rect.width * dpr));
    canvas.height = Math.max(220, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
  }
  function clear(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,.72)');
    g.addColorStop(1, 'rgba(237,243,234,.64)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  function drawGrid(ctx, w, h, opt = {}) {
    const left = opt.left ?? 46, right = opt.right ?? 16, top = opt.top ?? 20, bottom = opt.bottom ?? 34;
    ctx.save();
    ctx.strokeStyle = 'rgba(13,71,70,.09)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const x = left + (w - left - right) * i / 6;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, h - bottom); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      const y = top + (h - top - bottom) * i / 4;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(w - right, y); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(23,33,29,.34)';
    ctx.beginPath(); ctx.moveTo(left, h - bottom); ctx.lineTo(w - right, h - bottom); ctx.stroke();
    ctx.restore();
    return { left, right, top, bottom, pw: w - left - right, ph: h - top - bottom };
  }
  function linePlot(ctx, pts, box, color = '#0d4746', width = 2.2) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = box.left + p.x * box.pw;
      const y = box.top + (1 - p.y) * box.ph;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function label(ctx, text, x, y, color = '#50615a') {
    ctx.save(); ctx.fillStyle = color; ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.fillText(text, x, y); ctx.restore();
  }
  function gaussian(x, mu, sigma, amp = 1) { const z = (x - mu) / sigma; return amp * Math.exp(-0.5 * z * z); }
  function lcg(seed) {
    let s = seed >>> 0;
    return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
  }
  window.RadarLab = { $, bindControls, setupCanvas, clear, drawGrid, linePlot, dot, label, gaussian, lcg, TAU };
}());
