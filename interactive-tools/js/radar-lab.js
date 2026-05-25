
(function () {
  const R = window.RadarLab;
  const C = 3e8;
  const SCENE = { cx: 320, cy: 360, maxKm: 90, radius: 275 };
  const controls = ['targetRange', 'targetAngle', 'targetVelocity', 'beamCenter', 'beamWidth', 'bandwidth', 'fc', 'prf', 'noise', 'clutter'];
  const scenarios = {
    baseline: { targetRange: 35, targetAngle: 28, targetVelocity: 45, beamCenter: 28, beamWidth: 36, bandwidth: 20, fc: 10, prf: 1.2, noise: 25, clutter: 22 },
    far: { targetRange: 72, targetAngle: -34, targetVelocity: 18, beamCenter: -34, beamWidth: 30, bandwidth: 12, fc: 8, prf: 1.0, noise: 32, clutter: 18 },
    fast: { targetRange: 38, targetAngle: 18, targetVelocity: 118, beamCenter: 18, beamWidth: 28, bandwidth: 26, fc: 12, prf: 1.0, noise: 24, clutter: 18 },
    clutter: { targetRange: 44, targetAngle: 10, targetVelocity: 16, beamCenter: 10, beamWidth: 42, bandwidth: 18, fc: 10, prf: 1.4, noise: 42, clutter: 78 }
  };
  const focusCopy = {
    range: {
      title: '距离怎么被测出来？',
      prompt: '雷达发射信号后，目标回波在时间上延迟。距离压缩可以把“时间延迟”变成“距离位置”。',
      hint: '<span class="tip-icon">💡</span><div><strong>观察要点</strong><br>峰往右 = 回波更晚到 = 目标更远。<br><small>拖动目标，看峰值如何移动。</small></div>'
    },
    doppler: {
      title: '速度怎么变成频率？',
      prompt: '目标有径向速度时，连续脉冲之间的相位会变化，这个变化会表现为多普勒频率。',
      hint: '<span class="tip-icon">💡</span><div><strong>观察要点</strong><br>速度变大，多普勒峰离 0 Hz 更远。<br><small>调速度，看峰在频率轴上移动。</small></div>'
    },
    rdm: {
      title: '距离和速度能不能一起看？',
      prompt: '距离-多普勒图把距离处理和速度处理放到同一张二维图里，一个亮点对应一个目标。',
      hint: '<span class="tip-icon">💡</span><div><strong>观察要点</strong><br>横向读距离，纵向读多普勒。<br><small>拖距离、调速度，看亮点怎么走。</small></div>'
    },
    cfar: {
      title: '这个峰算不算目标？',
      prompt: '检测不是只找最高点，而是判断目标峰是否明显高过附近背景。CFAR 会让门限跟着背景变化。',
      hint: '<span class="tip-icon">💡</span><div><strong>观察要点</strong><br>噪声变大，门限也要抬高。<br><small>加噪声，看检测是否还稳。</small></div>'
    }
  };

  function value(id) { return Number(R.$(id).value); }
  function setValue(id, val) { R.$(id).value = val; }
  function degToRad(d) { return d * Math.PI / 180; }
  function signedAlias(v, span) { return ((v + span / 2) % span + span) % span - span / 2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function angleDiff(a, b) { return ((a - b + 180) % 360 + 360) % 360 - 180; }
  function state() {
    const s = {
      rangeKm: value('targetRange'),
      angleDeg: value('targetAngle'),
      velocity: value('targetVelocity'),
      beamCenter: value('beamCenter'),
      beamWidth: value('beamWidth'),
      bandwidthMHz: value('bandwidth'),
      fcGHz: value('fc'),
      prfHz: value('prf') * 1000,
      noise: value('noise') / 100,
      clutter: value('clutter') / 100
    };
    s.lambda = C / (s.fcGHz * 1e9);
    s.delayUs = 2 * s.rangeKm * 1000 / C * 1e6;
    s.rangeResM = C / (2 * s.bandwidthMHz * 1e6);
    s.fdActual = 2 * s.velocity / s.lambda;
    s.fdObserved = signedAlias(s.fdActual, s.prfHz);
    s.unambVelocity = s.lambda * s.prfHz / 4;
    s.beamDelta = angleDiff(s.angleDeg, s.beamCenter);
    s.beamGain = Math.exp(-0.5 * Math.pow(s.beamDelta / Math.max(3, s.beamWidth / 2.35), 2));
    s.targetAmp = 0.18 + 0.88 * s.beamGain;
    return s;
  }
  function point(angleDeg, rangeKm) {
    const r = clamp(rangeKm / SCENE.maxKm, 0, 1) * SCENE.radius;
    const a = degToRad(angleDeg);
    return { x: SCENE.cx + r * Math.sin(a), y: SCENE.cy - r * Math.cos(a), r };
  }
  function syncOutputs() {
    controls.forEach((id) => {
      const input = R.$(id);
      const out = document.querySelector(`[data-for="${id}"]`);
      if (!input || !out) return;
      const unit = input.dataset.unit || '';
      const decimals = Number(input.dataset.decimals || 0);
      out.textContent = `${Number(input.value).toFixed(decimals)}${unit}`;
    });
  }
  function buildStaticScene() {
    const rings = [20, 40, 60, 80].map((km) => {
      const r = km / SCENE.maxKm * SCENE.radius;
      return `<circle cx="${SCENE.cx}" cy="${SCENE.cy}" r="${r.toFixed(1)}" class="range-ring"></circle><text x="${SCENE.cx + 8}" y="${(SCENE.cy - r - 6).toFixed(1)}" class="scene-label">${km} km</text>`;
    }).join('');
    R.$('rangeRings').innerHTML = rings;
    const lines = [-60, -30, 0, 30, 60].map((ang) => {
      const p = point(ang, SCENE.maxKm);
      return `<line x1="${SCENE.cx}" y1="${SCENE.cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="az-line"></line><text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" class="scene-label">${ang}°</text>`;
    }).join('');
    R.$('azimuthLines').innerHTML = lines;
  }
  function drawScene(s) {
    const left = point(s.beamCenter - s.beamWidth / 2, SCENE.maxKm);
    const right = point(s.beamCenter + s.beamWidth / 2, SCENE.maxKm);
    const largeArc = s.beamWidth > 180 ? 1 : 0;
    R.$('beamWedge').setAttribute('d', `M ${SCENE.cx} ${SCENE.cy} L ${left.x.toFixed(1)} ${left.y.toFixed(1)} A ${SCENE.radius} ${SCENE.radius} 0 ${largeArc} 1 ${right.x.toFixed(1)} ${right.y.toFixed(1)} Z`);
    const target = point(s.angleDeg, s.rangeKm);
    R.$('targetGroup').setAttribute('transform', `translate(${target.x.toFixed(1)} ${target.y.toFixed(1)})`);
    R.$('losLine').setAttribute('x2', target.x.toFixed(1));
    R.$('losLine').setAttribute('y2', target.y.toFixed(1));
    const ux = (target.x - SCENE.cx) / Math.max(1, target.r);
    const uy = (target.y - SCENE.cy) / Math.max(1, target.r);
    const len = Math.max(18, Math.min(78, Math.abs(s.velocity) / 140 * 82));
    const sign = s.velocity >= 0 ? 1 : -1;
    R.$('velocityArrow').setAttribute('x1', target.x.toFixed(1));
    R.$('velocityArrow').setAttribute('y1', target.y.toFixed(1));
    R.$('velocityArrow').setAttribute('x2', (target.x + sign * ux * len).toFixed(1));
    R.$('velocityArrow').setAttribute('y2', (target.y + sign * uy * len).toFixed(1));
    R.$('targetLabel').textContent = `目标  R=${s.rangeKm.toFixed(0)} km`;
    R.$('angleLabel').textContent = `方位角 θ = ${s.angleDeg.toFixed(0)}°`;
    R.$('rangeLabel').textContent = `径向速度 vr = ${s.velocity.toFixed(0)} m/s`;
    const hit = Math.abs(s.beamDelta) <= s.beamWidth / 2;
    const beamState = R.$('beamState');
    beamState.textContent = hit ? `波束命中 · 增益 ${(s.beamGain * 100).toFixed(0)}%` : `偏出波束 · 增益 ${(s.beamGain * 100).toFixed(0)}%`;
    beamState.classList.toggle('miss', !hit);
  }
  function updateMetrics(s, detected) {
    const write = (id, value) => { const el = R.$(id); if (el) el.textContent = value; };
    write('delayReadout', `${s.delayUs.toFixed(1)} μs`);
    write('rangeResReadout', `${s.rangeResM.toFixed(1)} m`);
    write('lambdaReadout', `${(s.lambda * 100).toFixed(1)} cm`);
    write('dopplerReadout', `${s.fdActual.toFixed(0)} Hz`);
    write('unambReadout', `±${s.unambVelocity.toFixed(1)} m/s`);
    write('detectReadout', detected ? '检出' : '可能漏检');
  }
  function drawRangePlot(s) {
    const { ctx, w, h } = R.setupCanvas(R.$('labRangePlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const rng = R.lcg(101);
    const x0 = s.rangeKm / SCENE.maxKm;
    const visualWidth = Math.max(0.006, 0.038 * Math.sqrt(20 / s.bandwidthMHz));
    const pts = [];
    for (let i = 0; i <= 640; i++) {
      const x = i / 640;
      const noise = s.noise * 0.11 * (rng() - 0.3);
      const clutter = s.clutter * 0.09 * R.gaussian(x, 0.18, 0.12);
      const target = R.gaussian(x, x0, visualWidth, 0.78 * s.targetAmp);
      pts.push({ x, y: clamp(0.16 + noise + clutter + target, 0.03, 0.96) });
    }
    R.linePlot(ctx, pts, box, '#0d4746', 2.2);
    const px = box.left + x0 * box.pw;
    ctx.strokeStyle = 'rgba(182,95,74,.78)'; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(px, box.top); ctx.lineTo(px, box.top + box.ph); ctx.stroke(); ctx.setLineDash([]);
    R.label(ctx, `R = ${s.rangeKm.toFixed(0)} km`, Math.min(px + 8, w - 86), box.top + 24, '#b65f4a');
    R.label(ctx, '距离门 0-90 km', box.left + box.pw - 104, h - 12);
  }
  function drawDopplerPlot(s) {
    const { ctx, w, h } = R.setupCanvas(R.$('labDopplerPlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    const x0 = (s.fdObserved + s.prfHz / 2) / s.prfHz;
    const pts = [];
    for (let i = 0; i <= 520; i++) {
      const x = i / 520;
      const target = R.gaussian(x, x0, 0.032, 0.74 * s.targetAmp);
      const clutter = R.gaussian(x, 0.5, 0.035, 0.42 * s.clutter);
      pts.push({ x, y: clamp(0.12 + clutter + target, 0.03, 0.96) });
    }
    R.linePlot(ctx, pts, box, '#1e6b68', 2.2);
    const px = box.left + x0 * box.pw;
    R.dot(ctx, px, box.top + (1 - 0.88) * box.ph, 5.2, '#b65f4a');
    R.label(ctx, `观测 fd = ${s.fdObserved.toFixed(0)} Hz`, Math.min(px + 8, w - 140), box.top + 24, '#b65f4a');
    if (Math.abs(s.fdActual - s.fdObserved) > 1) R.label(ctx, '已折叠到 PRF 内', box.left + 10, box.top + 24, '#9b5834');
    R.label(ctx, `-${(s.prfHz / 2).toFixed(0)} Hz`, box.left - 2, h - 12);
    R.label(ctx, `+${(s.prfHz / 2).toFixed(0)} Hz`, box.left + box.pw - 60, h - 12);
  }
  function heatColor(v) {
    v = clamp(v, 0, 1);
    const stops = [[247,241,230], [135,182,162], [30,107,104], [201,137,63], [182,95,74]];
    const p = v * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(p));
    const t = p - i, a = stops[i], b = stops[i + 1];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  }
  function drawRdmPlot(s) {
    const { ctx, w, h } = R.setupCanvas(R.$('labRdmPlot'));
    R.clear(ctx, w, h);
    const left = 54, top = 24, right = 22, bottom = 44;
    const pw = w - left - right, ph = h - top - bottom;
    const cols = 82, rows = 58;
    const rng = R.lcg(202);
    const x0 = s.rangeKm / SCENE.maxKm;
    const y0 = 1 - (s.fdObserved + s.prfHz / 2) / s.prfHz;
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const x = ix / (cols - 1), y = iy / (rows - 1);
        const target = R.gaussian(x, x0, 0.032, s.targetAmp) * R.gaussian(y, y0, 0.045, 1);
        const clutter = R.gaussian(y, 0.5, 0.035, 0.8 * s.clutter) * (0.55 + 0.35 * Math.sin(ix * 0.55) ** 2);
        const noise = s.noise * 0.18 * rng();
        ctx.fillStyle = heatColor(target + clutter + noise);
        ctx.fillRect(left + ix * pw / cols, top + iy * ph / rows, Math.ceil(pw / cols) + 1, Math.ceil(ph / rows) + 1);
      }
    }
    ctx.strokeStyle = 'rgba(23,33,29,.35)'; ctx.strokeRect(left, top, pw, ph);
    const px = left + x0 * pw, py = top + y0 * ph;
    ctx.strokeStyle = 'rgba(255,253,248,.95)'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(px, py, 12, 0, R.TAU); ctx.stroke();
    R.label(ctx, '距离', left + pw - 28, h - 14);
    R.label(ctx, '+fd', 14, top + 14);
    R.label(ctx, '0', 26, top + ph / 2 + 4);
    R.label(ctx, '-fd', 14, top + ph - 4);
  }
  function makeRangeCut(s) {
    const rng = R.lcg(303);
    const n = 128, arr = [];
    const x0 = s.rangeKm / SCENE.maxKm;
    const width = Math.max(0.008, 0.03 * Math.sqrt(20 / s.bandwidthMHz));
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const localBackground = 0.1 + s.noise * 0.16 + s.clutter * 0.18 * R.gaussian(x, 0.72, 0.16);
      const speckle = s.noise * 0.24 * Math.pow(rng(), 2.0);
      const target = R.gaussian(x, x0, width, 0.68 * s.targetAmp);
      arr.push(clamp(localBackground + speckle + target, 0.02, 0.98));
    }
    return arr;
  }
  function cfar(arr, scale) {
    const out = [], guard = 3, train = 11;
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, count = 0;
      for (let k = i - train - guard; k <= i + train + guard; k++) {
        if (k < 0 || k >= arr.length || Math.abs(k - i) <= guard) continue;
        sum += arr[k]; count++;
      }
      out.push(clamp(sum / Math.max(1, count) * scale, 0.03, 0.96));
    }
    return out;
  }
  function drawCfarPlot(s) {
    const arr = makeRangeCut(s);
    const line = cfar(arr, 2.35);
    const targetIdx = Math.round((s.rangeKm / SCENE.maxKm) * (arr.length - 1));
    const detected = arr[targetIdx] > line[targetIdx];
    const { ctx, w, h } = R.setupCanvas(R.$('labCfarPlot'));
    R.clear(ctx, w, h);
    const box = R.drawGrid(ctx, w, h);
    R.linePlot(ctx, arr.map((y, i) => ({ x: i / (arr.length - 1), y })), box, '#0d4746', 2.1);
    R.linePlot(ctx, line.map((y, i) => ({ x: i / (line.length - 1), y })), box, '#b65f4a', 2.1);
    const px = box.left + targetIdx / (arr.length - 1) * box.pw;
    ctx.strokeStyle = detected ? 'rgba(30,107,104,.82)' : 'rgba(182,95,74,.82)'; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(px, box.top); ctx.lineTo(px, box.top + box.ph); ctx.stroke(); ctx.setLineDash([]);
    R.label(ctx, detected ? '目标超过 CFAR 门限' : '目标低于 CFAR 门限', Math.min(px + 8, w - 150), box.top + 24, detected ? '#0d4746' : '#b65f4a');
    R.label(ctx, '信号幅度', box.left + 12, box.top + 20, '#0d4746');
    R.label(ctx, 'CFAR 门限', box.left + 12, box.top + 40, '#b65f4a');
    return detected;
  }
  function draw() {
    syncOutputs();
    const s = state();
    drawScene(s);
    drawRangePlot(s);
    drawDopplerPlot(s);
    drawRdmPlot(s);
    const detected = drawCfarPlot(s);
    updateMetrics(s, detected);
  }
  function applyScenario(name) {
    Object.entries(scenarios[name]).forEach(([id, val]) => setValue(id, val));
    document.querySelectorAll('[data-scenario]').forEach((btn) => btn.classList.toggle('active', btn.dataset.scenario === name));
    draw();
  }
  function setFocus(name) {
    const copy = focusCopy[name] || focusCopy.range;
    document.body.dataset.focus = name;
    const title = R.$('focusTitle');
    const prompt = R.$('focusPrompt');
    const hint = R.$('focusHint');
    if (title) title.textContent = copy.title;
    if (prompt) prompt.textContent = copy.prompt;
    if (hint) hint.innerHTML = copy.hint;
    document.querySelectorAll('.lesson-step[data-focus]').forEach((btn) => btn.classList.toggle('active', btn.dataset.focus === name));
    document.querySelectorAll('[data-view]').forEach((card) => card.classList.toggle('active-card', card.dataset.view === name));
    requestAnimationFrame(draw);
  }
  function setupDrag() {
    const svg = R.$('sceneSvg');
    const target = R.$('targetGroup');
    let dragging = false;
    function eventPoint(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    function move(evt) {
      if (!dragging) return;
      evt.preventDefault();
      const p = eventPoint(evt);
      const dx = p.x - SCENE.cx, dy = p.y - SCENE.cy;
      const rPx = Math.sqrt(dx * dx + dy * dy);
      const km = clamp(rPx / SCENE.radius * SCENE.maxKm, 5, 85);
      const ang = clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -80, 80);
      setValue('targetRange', Math.round(km));
      setValue('targetAngle', Math.round(ang));
      draw();
    }
    target.addEventListener('pointerdown', (evt) => { dragging = true; target.setPointerCapture(evt.pointerId); move(evt); });
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', () => { dragging = false; });
    target.addEventListener('pointercancel', () => { dragging = false; });
  }
  document.querySelectorAll('[data-scenario]').forEach((btn) => btn.addEventListener('click', () => applyScenario(btn.dataset.scenario)));
  document.querySelectorAll('.lesson-step[data-focus]').forEach((btn) => btn.addEventListener('click', () => setFocus(btn.dataset.focus)));
  document.querySelectorAll('[data-view]').forEach((card) => card.addEventListener('click', () => setFocus(card.dataset.view)));
  window.addEventListener('resize', draw);
  buildStaticScene();
  setupDrag();
  R.bindControls(draw);
}());
