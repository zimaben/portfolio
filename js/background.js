// Background + blob layer — full-viewport ambient background (fixed,
// pointer-events:none — it never captures clicks; content sits on top of
// it). Draws hand-shaped inkblot silhouettes on <canvas> in the Terrain
// Renderer identity (color). Other scripts (e.g. work.js) drive where the
// cluster reconfigures to via window.reconfigureBlobAt(xNorm, yNorm).
// No libraries.

(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var SLOT_COUNT = 14;
  var CORE_COUNT = 9; // dense, overlapping "main mass" blobs
  // remaining slots are smaller satellite droplets scattered further out

  // '--identity' is written live, every frame, to the canvas's current
  // interpolated fill color (see draw()) — so it's always in sync with the
  // blobs, mid-transition included. Everything that reads var(--identity)
  // in CSS (the byline's last name, the work tabs, the bullet dots/link)
  // rides along automatically.
  var PALETTE = ['--terrain', '--ledger', '--nimbus', '--notes'];
  var paletteIndex = 0;
  var IDENTITY = { cx: 0.32, cy: 0.48 };

  var canvas = document.getElementById('canvas');
  if (!canvas) return; // not on the preview page

  var ctx = canvas.getContext('2d');

  // The work tabs row sits above the blob layer visually; blobs must never
  // draw above its bottom edge. Since #canvas is position:fixed inset:0,
  // canvas-local pixel coordinates already match viewport coordinates, so
  // this needs no conversion.
  var tabsBoundaryEl = document.getElementById('work-tabs');
  function tabsBottomPx(){
    return tabsBoundaryEl ? tabsBoundaryEl.getBoundingClientRect().bottom : 0;
  }

  var clusterSeedCounter = 1;
  var clamp01 = function(v){ return Math.max(0.02, Math.min(0.98, v)); };

  // A fresh random cluster of overlapping "core" blobs plus scattered
  // satellite droplets, centered on (cx, cy). Never the same twice, even at
  // the same center — clusterSeedCounter always advances.
  //
  // Every blob is clamped by its OWN radius (plus a pad covering the idle
  // pulse/wobble and the shared halo stroke — see draw()) so nothing can
  // ever land partway off the stage, no matter how close to an edge the
  // triggering click was. This is a free fix — pure position math, no extra
  // draw cost — so the canvas stays its current size rather than growing to
  // avoid clipping (a bigger canvas would cost real CPU: shadowBlur fills
  // scale with pixel area). Near an edge, blobs simply settle as close to
  // the click as their own size allows.
  function proceduralCluster(cx, cy){
    clusterSeedCounter++;
    var base = clusterSeedCounter * 97.7;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || 1, h = rect.height || 1;
    var minDim = Math.min(w, h);
    var tabsMinYNorm = tabsBottomPx() / h;

    function place(seed, distMin, distMax, rMin, rMax){
      var angle = hash(seed * 1.7) * Math.PI * 2;
      var dist = distMin + hash(seed * 2.3) * (distMax - distMin);
      var r = rMin + hash(seed * 3.1) * (rMax - rMin);
      var rawX = cx + Math.cos(angle) * dist;
      var rawY = cy + Math.sin(angle) * dist;
      // Padded radius: +10% for the idle pulse/wobble, +0.025 flat for the
      // shared halo stroke (sized off the cluster's biggest blob, so a tiny
      // satellite next to a large core blob still needs real headroom).
      var effR = r * 1.10 + 0.025;
      var marginX = Math.min(0.46, effR * minDim / w);
      var marginY = Math.min(0.46, effR * minDim / h);
      // Never let a blob's top edge rise above the tabs row.
      var minY = Math.max(marginY, tabsMinYNorm + marginY);
      return {
        x: Math.max(marginX, Math.min(1 - marginX, rawX)),
        y: Math.max(minY, Math.min(1 - marginY, rawY)),
        r: r
      };
    }

    var blobs = [];
    for (var i = 0; i < CORE_COUNT; i++){
      blobs.push(place(base + i * 7.3, 0, 0.24, 0.14, 0.29));
    }
    for (var j = CORE_COUNT; j < SLOT_COUNT; j++){
      blobs.push(place(base + j * 11.9 + 500, 0.22, 0.46, 0.03, 0.09));
    }
    return blobs;
  }

  var current = proceduralCluster(IDENTITY.cx, IDENTITY.cy);
  var target = current.map(function(b){ return {x:b.x,y:b.y,r:b.r}; });
  var currentColorVar = PALETTE[paletteIndex];
  var targetColorVar = PALETTE[paletteIndex];
  var colorMix = 1;
  var animStart = 0;
  var ANIM_MS = reduceMotion ? 1 : 900;

  function hexToRgb(hex){
    var v = hex.replace('#','');
    var n = parseInt(v, 16);
    return [(n>>16)&255, (n>>8)&255, n&255];
  }
  function currentColorHex(varName){
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }
  function lerp(a,b,t){ return a + (b-a)*t; }
  function easeInOutCubic(t){ t = Math.max(0, Math.min(1,t)); return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function easeOutBack(t){
    var c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function hash(n){ var s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); }

  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max=Math.max(r,g,b), min=Math.min(r,g,b), h, s, l=(max+min)/2;
    if(max===min){ h=s=0; }
    else{
      var d=max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        default: h=(r-g)/d+4;
      }
      h/=6;
    }
    return [h*360, s*100, l*100];
  }
  function hslToRgb(h,s,l){
    h/=360; s/=100; l/=100;
    var r,g,b;
    if(s===0){ r=g=b=l; }
    else{
      var hue2rgb = function(p,q,t){
        if(t<0) t+=1;
        if(t>1) t-=1;
        if(t<1/6) return p+(q-p)*6*t;
        if(t<1/2) return q;
        if(t<2/3) return p+(q-p)*(2/3-t)*6;
        return p;
      };
      var q = l<0.5 ? l*(1+s) : l+s-l*s;
      var p = 2*l-q;
      r = hue2rgb(p,q,h+1/3);
      g = hue2rgb(p,q,h);
      b = hue2rgb(p,q,h-1/3);
    }
    return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
  }
  function darkerRgb(rgb, deltaL){
    var hsl = rgbToHsl(rgb[0],rgb[1],rgb[2]);
    var l2 = Math.max(8, hsl[2] - deltaL);
    return hslToRgb(hsl[0], hsl[1], l2);
  }

  // Bilaterally symmetric point set (like a real inkblot folded on its own
  // axis), narrow radius variance so the silhouette reads as rounded rather
  // than jagged. Stable per seed; only rotation/position/scale animate.
  var inkblotPointsCache = {};
  function inkblotPoints(seed){
    if (inkblotPointsCache[seed]) return inkblotPointsCache[seed];
    var halfSegments = 3 + Math.floor(hash(seed * 3.1) * 2);
    var rot = hash(seed * 5.7) * Math.PI * 2;
    var half = [];
    for (var i = 0; i <= halfSegments; i++){
      var localTheta = -Math.PI/2 + (i / halfSegments) * Math.PI;
      var variance = 0.90 + hash(seed * 97 + i * 13.7) * 0.16;
      half.push({ theta: localTheta, r: variance });
    }
    var mirrored = [];
    for (var j = half.length - 2; j >= 1; j--){
      mirrored.push({ theta: Math.PI - half[j].theta, r: half[j].r });
    }
    var all = half.concat(mirrored).map(function(p){ return { theta: p.theta + rot, r: p.r }; });
    inkblotPointsCache[seed] = all;
    return all;
  }

  function inkblotPath(ctx, cx, cy, baseR, seed){
    var pts = inkblotPoints(seed).map(function(p){
      return { x: cx + Math.cos(p.theta) * p.r * baseR, y: cy + Math.sin(p.theta) * p.r * baseR };
    });
    var len = pts.length;
    var mid0x = (pts[0].x + pts[len-1].x) / 2;
    var mid0y = (pts[0].y + pts[len-1].y) / 2;
    ctx.beginPath();
    ctx.moveTo(mid0x, mid0y);
    for (var j = 0; j < len; j++){
      var p1 = pts[j], p2 = pts[(j + 1) % len];
      var mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, mx, my);
    }
    ctx.closePath();
  }

  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  var fromSnapshot = current.map(function(b){ return {x:b.x,y:b.y,r:b.r}; });

  function draw(ts){
    if (!animStart) animStart = ts;
    var t = ANIM_MS <= 1 ? 1 : Math.min(1, (ts - animStart) / ANIM_MS);
    var eShape = reduceMotion ? 1 : easeOutBack(t);
    var eColor = easeInOutCubic(t);
    colorMix = eColor;

    var rect = canvas.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    ctx.clearRect(0,0,w,h);

    var fromRgb = hexToRgb(currentColorHex(currentColorVar));
    var toRgb = hexToRgb(currentColorHex(targetColorVar));
    var fillRgb = [
      Math.round(lerp(fromRgb[0], toRgb[0], colorMix)),
      Math.round(lerp(fromRgb[1], toRgb[1], colorMix)),
      Math.round(lerp(fromRgb[2], toRgb[2], colorMix))
    ];
    var strokeRgb = darkerRgb(fillRgb, 18);
    var fillCss = 'rgb(' + fillRgb[0] + ',' + fillRgb[1] + ',' + fillRgb[2] + ')';
    var strokeCss = 'rgb(' + strokeRgb[0] + ',' + strokeRgb[1] + ',' + strokeRgb[2] + ')';

    // Push this frame's interpolated color into --identity so everything
    // reading it in CSS (byline last name, tabs, bullet dots, link) animates
    // in lockstep with the blobs, not just snaps at the end.
    document.documentElement.style.setProperty('--identity', fillCss);

    var visible = [];
    for (var i = 0; i < current.length; i++){
      var f = fromSnapshot[i];
      var tg = target[i];
      var x = lerp(f.x, tg.x, eShape);
      var y = lerp(f.y, tg.y, eShape);
      var rNorm = Math.max(0, lerp(f.r, tg.r, eShape));
      current[i].x = x; current[i].y = y; current[i].r = rNorm;
      if (rNorm <= 0.0005) continue;

      var pulse = reduceMotion ? 1 : 1 + Math.sin(ts/1900 + i*1.7) * 0.035;
      var rad = rNorm * Math.min(w,h) * pulse;
      var cx = x * w + (reduceMotion?0:Math.sin(ts/2200 + i)* rad*0.05);
      var cy = y * h + (reduceMotion?0:Math.cos(ts/2600 + i)* rad*0.05);
      visible.push({ cx: cx, cy: cy, rad: rad, seed: i + 1 });
    }

    // Pass 1: every blob's silhouette expanded by the SAME halo width and
    // filled in the darker "stroke" shade, with the same drop shadow. The
    // width is sized off the largest blob in the frame, not each blob's own
    // radius — so a merged cluster shows one uniform rim thickness all the
    // way around, instead of thick-around-big/thin-around-small seams.
    var maxRad = 0;
    for (var m = 0; m < visible.length; m++){ maxRad = Math.max(maxRad, visible[m].rad); }
    var haloWidth = Math.min(7, Math.max(3, maxRad * 0.065));
    var shadowBlur = Math.max(4, Math.min(10, maxRad * 0.09));
    var shadowOffsetY = Math.max(2, Math.min(4, maxRad * 0.04));

    // Hard containment clamp, applied to the actual pixel values about to be
    // drawn this frame — not just the resting target. The reconfigure bounce
    // (easeOutBack) deliberately overshoots past the target position/size
    // before settling, and the halo stroke + a blob's own irregular silhouette
    // extend a bit past its nominal radius too, so this accounts for the true
    // worst-case on-screen extent (radius + halo, padded ~8% for silhouette
    // irregularity) rather than trying to predict it upstream. Whatever the
    // animation produces, nothing drawn can ever cross the frame edge — and
    // the top bound is also pinned to the tabs row, not just y=0, so blobs
    // stay entirely below it even mid-bounce.
    var tabsBottom = tabsBottomPx();
    for (var c = 0; c < visible.length; c++){
      var vc = visible[c];
      var reach = (vc.rad + haloWidth) * 1.08;
      var loX = Math.min(reach, w / 2), hiX = w - loX;
      var loY = Math.max(Math.min(reach, h / 2), tabsBottom + reach), hiY = h - Math.min(reach, h / 2);
      vc.cx = Math.max(loX, Math.min(hiX, vc.cx));
      vc.cy = Math.max(loY, Math.min(hiY, vc.cy));
    }

    ctx.save();
    ctx.shadowColor = 'rgba(20,18,15,0.20)';
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetY = shadowOffsetY;
    for (var a = 0; a < visible.length; a++){
      var vb = visible[a];
      inkblotPath(ctx, vb.cx, vb.cy, vb.rad + haloWidth, vb.seed);
      ctx.fillStyle = strokeCss;
      ctx.fill();
    }
    ctx.restore();

    // Pass 2: normal-size silhouettes filled in the true project color on
    // top, covering everything but the halo margin — so only the outer edge
    // of the merged cluster shows the darker rim.
    for (var b = 0; b < visible.length; b++){
      var vb2 = visible[b];
      inkblotPath(ctx, vb2.cx, vb2.cy, vb2.rad, vb2.seed);
      ctx.fillStyle = fillCss;
      ctx.fill();
    }

    if (t < 1 || !reduceMotion){
      requestAnimationFrame(draw);
    }
  }

  function reconfigureTo(newTarget){
    fromSnapshot = current.map(function(b){ return {x:b.x,y:b.y,r:b.r}; });
    target = newTarget;
    animStart = 0;
    requestAnimationFrame(draw);
  }

  // Public hook: other scripts (work.js) call this with viewport-normalized
  // coordinates (0-1) to reshuffle the cluster to a new center — e.g. the
  // top-right corner of whichever content is currently on screen. Each call
  // also cycles to the next palette color, so every new selection is both a
  // new shape AND a new color.
  window.reconfigureBlobAt = function(xNorm, yNorm){
    currentColorVar = targetColorVar;
    paletteIndex = (paletteIndex + 1) % PALETTE.length;
    targetColorVar = PALETTE[paletteIndex];
    reconfigureTo(proceduralCluster(clamp01(xNorm), clamp01(yNorm)));
  };

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
})();
