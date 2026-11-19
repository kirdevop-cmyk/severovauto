/* =========================================================
   КАРТА МАРШРУТІВ — реальна географія на canvas
   Матерія карти: текстура Землі (equirectangular) семплиться
   в піксельну сітку; суша стає крапками, океан відкидається.
   Вузли розставлені за справжніми координатами.
========================================================= */
(function(){
  const cv = document.getElementById('routeMap');
  if(!cv) return;
  const ctx = cv.getContext('2d');
  const reducedMo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // видима частина світу: без Антарктиди та порожньої Пацифіки по краях
  const LON0 = -168, LON1 = 152, LAT0 = -58, LAT1 = 84;
  // спекулярна карта Землі: вода світла, суша темна — чистіша маска, ніж кольорове фото
  const EARTH = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/planets/earth_specular_2048.jpg';

  const HUB = { lat: 49.99, lon: 36.23, label: 'ХАРКІВ' };
  const NODES = [
    { lat: 39.5,  lon: -98.5, label: 'США'    },
    { lat: 51.0,  lon: 6.5,   label: 'ЄВРОПА' },
    { lat: 35.2,  lon: 129.1, label: 'КОРЕЯ'  }   // Пусан
  ];

  const GOLD = '216,164,74', CHROME = '194,203,216';

  let W = 0, H = 0, dpr = 1, dotsLayer = null, land = null, ready = false;

  function proj(lat, lon){
    return [ (lon - LON0) / (LON1 - LON0) * W,
             (LAT1 - lat) / (LAT1 - LAT0) * H ];
  }

  /* --- зчитування суші з текстури Землі --- */
  function readLand(img){
    const sw = 1024, sh = 512;
    const off = document.createElement('canvas');
    off.width = sw; off.height = sh;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, sw, sh);
    let px;
    try { px = octx.getImageData(0, 0, sw, sh).data; }
    catch(e){ return null; }              // канвас забруднено — працюємо без крапок
    const mask = new Uint8Array(sw * sh);
    for(let i = 0, p = 0; i < mask.length; i++, p += 4){
      // поріг 110 підібрано тестом на 22 контрольних точках (міста vs відкритий океан)
      mask[i] = ((px[p] + px[p+1] + px[p+2]) / 3 < 110) ? 1 : 0;
    }
    return { mask, sw, sh };
  }

  function isLand(lat, lon){
    if(!land) return false;
    const u = Math.floor((lon + 180) / 360 * land.sw);
    const v = Math.floor((90 - lat) / 180 * land.sh);
    if(u < 0 || v < 0 || u >= land.sw || v >= land.sh) return false;
    return land.mask[v * land.sw + u] === 1;
  }

  /* --- крапки суші малюємо один раз в окремий шар --- */
  function buildDots(){
    dotsLayer = document.createElement('canvas');
    dotsLayer.width = cv.width; dotsLayer.height = cv.height;
    const c = dotsLayer.getContext('2d');
    c.scale(dpr, dpr);

    const step = W < 560 ? 5 : 7;
    const r = W < 560 ? 0.9 : 1.15;
    for(let y = step; y < H; y += step){
      for(let x = step/2; x < W; x += step){
        const lon = LON0 + x / W * (LON1 - LON0);
        const lat = LAT1 - y / H * (LAT1 - LAT0);
        if(!isLand(lat, lon)) continue;
        // легка варіація яскравості — карта «дихає», а не виглядає штампом
        const a = 0.10 + ((x * 7 + y * 13) % 5) * 0.016;
        c.fillStyle = 'rgba(237,232,222,' + a.toFixed(3) + ')';
        c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
      }
    }
  }

  /* --- дуга як квадратична крива з підйомом на північ --- */
  function arcOf(n){
    const [x0, y0] = proj(n.lat, n.lon);
    const [x1, y1] = proj(HUB.lat, HUB.lon);
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const cxp = (x0 + x1) / 2;
    const cyp = (y0 + y1) / 2 - dist * 0.30 - H * 0.05;
    return { x0, y0, x1, y1, cx: cxp, cy: cyp, dist };
  }
  function pointAt(a, t){
    const it = 1 - t;
    return [ it*it*a.x0 + 2*it*t*a.cx + t*t*a.x1,
             it*it*a.y0 + 2*it*t*a.cy + t*t*a.y1 ];
  }

  function resize(){
    const rect = cv.getBoundingClientRect();
    if(!rect.width) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    cv.width  = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(land) buildDots();
  }

  function drawNode(n, t, isHub){
    const [x, y] = proj(n.lat, n.lon);
    const col = isHub ? GOLD : CHROME;

    if(isHub){
      const g = ctx.createRadialGradient(x, y, 0, x, y, 68);
      g.addColorStop(0,   'rgba(' + GOLD + ',0.55)');
      g.addColorStop(0.4, 'rgba(' + GOLD + ',0.16)');
      g.addColorStop(1,   'rgba(' + GOLD + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 68, 0, 6.2832); ctx.fill();
    }

    // розбіжні кільця
    if(!reducedMo){
      for(let k = 0; k < 2; k++){
        const p = ((t * 0.45 + k * 0.5) % 1);
        ctx.strokeStyle = 'rgba(' + col + ',' + (0.42 * (1 - p)).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, (isHub ? 9 : 5) + p * (isHub ? 34 : 22), 0, 6.2832);
        ctx.stroke();
      }
    }

    ctx.fillStyle = 'rgba(' + col + ',1)';
    ctx.beginPath(); ctx.arc(x, y, isHub ? 5.5 : 3.4, 0, 6.2832); ctx.fill();

    const fs = isHub ? Math.max(13, W * 0.0135) : Math.max(10, W * 0.0105);
    ctx.font = (isHub ? '800 ' : '400 ') + fs + 'px ' + (isHub ? "'Onest',sans-serif" : "'Onest',sans-serif");
    try { ctx.letterSpacing = isHub ? '1px' : '2px'; } catch(e){}
    ctx.textAlign = 'center';
    ctx.fillStyle = isHub ? 'rgba(' + GOLD + ',1)' : 'rgba(237,232,222,0.92)';
    ctx.fillText(n.label, x, isHub ? y + fs + 12 : y - 13);
    try { ctx.letterSpacing = '0px'; } catch(e){}
  }

  const arcs = [];
  function frame(ms){
    if(!W){ requestAnimationFrame(frame); return; }
    const t = ms / 1000;
    ctx.clearRect(0, 0, W, H);

    // 1. суша
    if(dotsLayer){
      ctx.drawImage(dotsLayer, 0, 0, W, H);
      // 2. світлова хвиля по крапках (тільки поверх наявних пікселів)
      if(!reducedMo){
        const sweep = ((t * 0.11) % 1.4 - 0.2) * W;
        const g = ctx.createLinearGradient(sweep - W * 0.22, 0, sweep + W * 0.22, 0);
        g.addColorStop(0,   'rgba(' + GOLD + ',0)');
        g.addColorStop(0.5, 'rgba(' + GOLD + ',0.5)');
        g.addColorStop(1,   'rgba(' + GOLD + ',0)');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // 3. маршрути
    arcs.forEach((a, i) => {
      ctx.strokeStyle = 'rgba(237,232,222,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x0, a.y0);
      ctx.quadraticCurveTo(a.cx, a.cy, a.x1, a.y1);
      ctx.stroke();

      if(reducedMo) return;

      // «комета» — вантаж у дорозі
      const tp = ((t * 0.16 + i * 0.33) % 1);
      const tail = 0.16;
      ctx.lineWidth = 2;
      for(let s = 0; s < 12; s++){
        const t2 = tp - (s / 12) * tail, t1 = tp - ((s + 1) / 12) * tail;
        if(t1 < 0) break;
        const [px1, py1] = pointAt(a, t1), [px2, py2] = pointAt(a, t2);
        const al = (1 - s / 12) * 0.9;
        ctx.strokeStyle = 'rgba(' + GOLD + ',' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
      }
      const [hx, hy] = pointAt(a, tp);
      const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 9);
      hg.addColorStop(0, 'rgba(255,235,190,0.95)');
      hg.addColorStop(1, 'rgba(' + GOLD + ',0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 6.2832); ctx.fill();
    });

    // 4. вузли
    NODES.forEach(n => drawNode(n, t, false));
    drawNode(HUB, t, true);

    requestAnimationFrame(frame);
  }

  function start(){
    resize();
    arcs.length = 0;
    NODES.forEach(n => arcs.push(arcOf(n)));
    ready = true;
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { land = readLand(img); start(); };
  img.onerror = () => { start(); };        // без текстури — лише маршрути
  img.src = EARTH;

  addEventListener('resize', () => {
    if(!ready) return;
    clearTimeout(cv._rt);
    cv._rt = setTimeout(() => {
      resize();
      arcs.length = 0;
      NODES.forEach(n => arcs.push(arcOf(n)));
    }, 180);
  }, { passive: true });

  requestAnimationFrame(frame);
})();
