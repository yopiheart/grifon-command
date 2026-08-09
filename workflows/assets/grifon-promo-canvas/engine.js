/* ============================================================================
   GRIFON LAUNCH PROMO — motion-promo engine, Grifon house style
   ----------------------------------------------------------------------------
   Same script as the Neil-approved Hyperframes launch video (v3, 2026-07-22),
   rendered through the motion-promo canvas engine instead. Same words, different
   renderer, so the comparison is about the tool and not about the copy.

   DELIBERATE DEVIATION FROM THE SKILL'S HOUSE STYLE:
   the skill mandates pure #000 + a rotating neon cyan/violet/magenta spectrum.
   DESIGN.md mandates zinc-950 (never black) and ONE accent, Grifon Gold #FFCC00.
   DESIGN.md wins. What is kept from the skill is its craft, which is palette
   independent: shape-following bloom, breathing light, hard cuts, 2-3 frame
   snaps, the hot flash on the last typed character, arranged-not-scattered.

   drawFrame(ctx, t) is pure and seekable — same file drives preview and encode.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PROMO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 720, H = 1280, FPS = 30;

  var BRAND = {
    name: 'GRIFON',
    font: 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif',
    ink: '#ffffff',
    gold: '#FFCC00',        // Grifon Gold — the only accent
    goldDeep: '#B88A00',
    goldHot: '#FFE680',
    bg: '#09090b',          // zinc-950. DESIGN.md: never pure black.
    steel: '#52525b',       // zinc-600, the "cost / problem" colour
    steelLit: '#a1a1aa',
  };

  var TIMELINE = [
    { name: 'hook',  end: 3.30,  fn: sceneHook },
    { name: 'pain',  end: 6.70,  fn: scenePain },
    { name: 'brand', end: 9.80,  fn: sceneBrand },
    { name: 'steps', end: 13.30, fn: sceneSteps },
    { name: 'offer', end: 16.70, fn: sceneOffer },
    { name: 'cta',   end: 20.00, fn: sceneCta },
  ];
  var DUR = TIMELINE[TIMELINE.length - 1].end;

  /* ------------------------------------------------------------- math ---- */
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function inv(t, a, b) { return clamp((t - a) / (b - a)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOut4(t) { return 1 - Math.pow(1 - t, 4); }
  function easeIn(t) { return t * t * t; }
  function easeBack(t) { var c = 1.24; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function hexa(h, a) {
    var n = parseInt(h.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mix(h1, h2, t) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
    var g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
    var l = Math.round(lerp(a & 255, b & 255, t));
    return '#' + (((1 << 24) + (r << 16) + (g << 8) + l).toString(16).slice(1));
  }
  function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  /* -------------------------------------------------------- primitives --- */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function glow(ctx, x, y, r, color, a, add) {
    if (r <= 0 || a <= 0) return;
    ctx.save();
    if (add !== false) ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexa(color, a));
    g.addColorStop(0.30, hexa(color, a * 0.55));
    g.addColorStop(0.62, hexa(color, a * 0.18));
    g.addColorStop(1, hexa(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function glowE(ctx, x, y, rx, ry, color, a, add) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    glow(ctx, x, y, rx, color, a, add);
    ctx.restore();
  }

  /* Bloom in the SHAPE of the object — the single biggest quality tell. */
  function shapeBloom(ctx, path, color, amount, layers) {
    layers = layers || [[4.2, 0.24], [3.1, 0.32], [2.2, 0.38], [1.5, 0.42], [1.15, 0.38]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      try { ctx.filter = 'blur(' + (10 + k * 16).toFixed(0) + 'px)'; } catch (e) { }
      path(k);
      ctx.fillStyle = hexa(color, a); ctx.fill();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }

  /* Light breathes across a beat. Constant glow reads dead. */
  function swell(p) {
    var big = Math.sin(clamp(p) * Math.PI);
    var small = 0.5 - 0.5 * Math.cos(clamp(p) * Math.PI * 3.1);
    return 0.34 + 0.50 * big + 0.18 * small * big;
  }

  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + BRAND.font; }
  function trackW(ctx, txt, sp) {
    var w = 0; for (var i = 0; i < txt.length; i++) w += ctx.measureText(txt[i]).width + sp;
    return txt.length ? w - sp : 0;
  }
  function trackFill(ctx, txt, x, y, sp) {
    var c = x; for (var i = 0; i < txt.length; i++) { ctx.fillText(txt[i], c, y); c += ctx.measureText(txt[i]).width + sp; }
    return c;
  }
  function centerText(ctx, txt, y, size, weight, color, alpha) {
    setFont(ctx, weight || '900', size);
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(txt, W / 2, y);
    ctx.restore();
  }

  /*  ---- THE PESO SIGN ----------------------------------------------------
      Inter Black has no U+20B1, so fillText('₱') paints a tofu box — and the
      first contact sheet had one sitting exactly where every price goes. The
      other repo fonts that DO carry it (Montserrat, Anton) are a different
      weight and width, so swapping mid-word makes the price look pasted on.
      So draw it: a Latin P with two bars across the stem, sized off the same
      font metrics as the digits. No font dependency, no tofu, identical every
      seek. A glyph gap becomes 12 lines instead of a font hunt.               */
  function pesoAdvance(ctx, size) {
    setFont(ctx, '900', size);
    return ctx.measureText('P').width + size * 0.035;
  }
  function drawPeso(ctx, x, y, size, color) {
    setFont(ctx, '900', size);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText('P', x, y);
    var pw = ctx.measureText('P').width;
    var bar = size * 0.076;
    var x0 = x - size * 0.055, x1 = x + pw * 0.60;
    ctx.fillRect(x0, y - size * 0.475, x1 - x0, bar);
    ctx.fillRect(x0, y - size * 0.315, x1 - x0, bar);
    ctx.restore();
    return pw + size * 0.035;
  }
  /** Centred "₱" + tail (e.g. "30K/MO"). Returns the block width. */
  function drawPrice(ctx, tail, cx, y, size, color, alpha) {
    setFont(ctx, '900', size);
    var tw = ctx.measureText(tail).width;
    var total = pesoAdvance(ctx, size) + tw;
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    var x = cx - total / 2;
    x += drawPeso(ctx, x, y, size, color);
    setFont(ctx, '900', size);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color;
    ctx.fillText(tail, x, y);
    ctx.restore();
    return total;
  }

  /* A soft dark scrim so type never lands on a bright patch. */
  function scrim(ctx, y, h, a) {
    ctx.save();
    var g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, hexa('#000000', 0));
    g.addColorStop(0.5, hexa('#000000', a));
    g.addColorStop(1, hexa('#000000', 0));
    ctx.fillStyle = g; ctx.fillRect(0, y - h, W, h * 2);
    ctx.restore();
  }

  /* Typewriter with the hot flash on the freshest characters. */
  function typeOut(ctx, txt, x, y, p, size, ink, hot, hotHold, weight) {
    setFont(ctx, weight || '900', size);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    var n = Math.min(txt.length, Math.floor(clamp(p) * (txt.length + 0.6)));
    var cx = x;
    for (var i = 0; i < n; i++) {
      var recent = i >= n - 2 ? (i === n - 1 ? 1 : 0.6) : 0;
      ctx.fillStyle = recent > 0 && hotHold > 0 ? mix(ink, hot, hotHold * recent) : ink;
      ctx.fillText(txt[i], cx, y);
      cx += ctx.measureText(txt[i]).width;
    }
    return { x: cx, done: n >= txt.length, n: n };
  }

  /* ---------------------------------------------------------- backdrop --- */
  var grain = rng(20260810);
  var GRAIN = (function () {
    var pts = [];
    for (var i = 0; i < 900; i++) pts.push([grain() * W, grain() * H, grain() * 0.030 + 0.006]);
    return pts;
  })();

  function backdrop(ctx, t, warm) {
    ctx.fillStyle = BRAND.bg;
    ctx.fillRect(0, 0, W, H);
    // One slow vignette-lit field so the frame is never flat.
    var breathe = 0.5 + 0.5 * Math.sin(t * 0.45);
    glowE(ctx, W / 2, H * 0.42, W * 0.95, H * 0.40,
      warm ? BRAND.goldDeep : '#1e2030', warm ? 0.055 + 0.02 * breathe : 0.10 + 0.03 * breathe);
    // Grain. Static seed, so identical every seek.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < GRAIN.length; i++) {
      ctx.fillStyle = hexa('#ffffff', GRAIN[i][2]);
      ctx.fillRect(GRAIN[i][0], GRAIN[i][1], 1.4, 1.4);
    }
    ctx.restore();
  }

  function watermark(ctx) {
    setFont(ctx, '700', 17);
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('GRIFON.AI', W - 30, 34);
    ctx.restore();
  }

  /* ============================ SCENE 1 — HOOK ============================
     STATEMENT + STAT-SLAM. The cost lands as a gold slam on a steel line.  */
  function sceneHook(ctx, t, p) {
    backdrop(ctx, t, false);

    // Beat openings are fast on purpose. After a hard cut, a beat that spends
    // 0.3s arriving reads as a dropped frame, and the hook is the worst place
    // in the film to spend it.
    var l1 = inv(t, 0.02, 0.42);                 // "GASTOS KA"
    var slam = inv(t, 0.62, 0.78);               // ₱30K/MO arrives hard
    var l3 = inv(t, 1.05, 1.62);                 // "SA AGENCY?"
    var sw = swell(inv(t, 0.5, 3.0));

    // Line 1 — rises and settles. easeOut, never a long easeIn.
    var y1 = lerp(H * 0.30, H * 0.275, easeOut(l1));
    centerText(ctx, 'GASTOS KA', y1, 62, '900', BRAND.steelLit, easeOut(l1));

    // The number. Bloom takes the shape of the text block, not a soft oval.
    if (slam > 0) {
      var s = lerp(1.35, 1.0, easeOut4(slam));
      var yb = H * 0.415;
      setFont(ctx, '900', 92);
      var w = pesoAdvance(ctx, 92) + ctx.measureText('30K/MO').width;
      ctx.save();
      ctx.translate(W / 2, yb); ctx.scale(s, s); ctx.translate(-W / 2, -yb);
      shapeBloom(ctx, function (k) {
        var bw = w * k * 0.44, bh = 62 * k * 0.42;
        rr(ctx, W / 2 - bw, yb - 34 - bh * 0.35, bw * 2, bh * 1.4 + 34, 18);
      }, BRAND.gold, 0.42 * slam * sw);
      drawPrice(ctx, '30K/MO', W / 2, yb, 92, BRAND.gold, 1);
      ctx.restore();

      // Hairline under the number, drawing out from centre.
      var lw = W * 0.30 * easeOut(inv(t, 1.20, 1.75));
      ctx.save();
      ctx.globalAlpha = 0.85 * slam;
      ctx.fillStyle = hexa(BRAND.gold, 0.55);
      ctx.fillRect(W / 2 - lw, yb + 26, lw * 2, 2);
      ctx.restore();
    }

    var y3 = lerp(H * 0.545, H * 0.525, easeOut(l3));
    centerText(ctx, 'SA AGENCY?', y3, 62, '900', BRAND.steelLit, easeOut(l3));

    watermark(ctx);
  }

  /* ============================ SCENE 2 — PAIN ============================
     CARD-SWEEP x2. Arranged, not scattered. Steel, no gold — gold is the
     answer's colour, so the problem must not borrow it.                    */
  function scenePain(ctx, t, p) {
    backdrop(ctx, t, false);

    var lead = inv(t, 0.02, 0.38);
    centerText(ctx, 'PARA SA ISANG AD', H * 0.235, 34, '700', BRAND.steel, easeOut(lead) * 0.95);

    var cards = [
      { txt: '3 DAYS', sub: '// ANG HINTAY', at: 0.18, peso: false },
      { txt: '5,000', sub: '// KADA VIDEO', at: 0.95, peso: true },
    ];

    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var a = inv(t, c.at, c.at + 0.42);
      if (a <= 0) continue;
      var e = easeOut4(a);
      var cy = H * 0.345 + i * 232;
      var cx = lerp(i % 2 === 0 ? -W * 0.5 : W * 1.5, W / 2, e);
      var cw = W * 0.78, ch = 176;

      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.4);
      // Glass panel — DESIGN.md's surface, not the skill's neon tile.
      rr(ctx, cx - cw / 2, cy - ch / 2, cw, ch, 26);
      var g = ctx.createLinearGradient(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2);
      g.addColorStop(0, 'rgba(39,39,42,0.92)');
      g.addColorStop(1, 'rgba(15,15,18,0.92)');
      ctx.fillStyle = g; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.stroke();

      if (c.peso) {
        drawPrice(ctx, c.txt, cx, cy + 6, 66, BRAND.ink, 1);
      } else {
        setFont(ctx, '900', 66);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = BRAND.ink;
        ctx.fillText(c.txt, cx, cy + 6);
      }

      setFont(ctx, '700', 21);
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = BRAND.steel;
      ctx.fillText(c.sub, cx, cy + 46);
      ctx.restore();
    }

    // A cold rim under the stack so the beat has depth, not a flat plate.
    glowE(ctx, W / 2, H * 0.70, W * 0.6, 90, '#2a2d3a', 0.30 * swell(inv(t, 0.6, 3.0)));

    watermark(ctx);
  }

  /* =========================== SCENE 3 — BRAND ===========================
     SHOCKWAVE + WORDMARK-SNAP. The mark holds small and ember, then snaps
     to full size and white-gold in 2 frames. Interpolating this is exactly
     what makes branding look glitchy.                                      */
  function sceneBrand(ctx, t, p) {
    backdrop(ctx, t, true);

    var SNAP = 0.62;                          // the instant
    var pre = inv(t, 0.05, SNAP);
    var post = clamp((t - SNAP) / (3.10 - SNAP));
    var snapped = t >= SNAP;

    // Expanding ring out of the impact point, constant rate, fading as it grows.
    if (snapped) {
      for (var r = 0; r < 2; r++) {
        var rt = clamp((t - SNAP - r * 0.13) / 0.78);
        if (rt <= 0 || rt >= 1) continue;
        var rad = 165 + rt * W * 1.05;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(W / 2, H * 0.44, rad, 0, Math.PI * 2);
        ctx.lineWidth = lerp(22, 1.2, rt);
        ctx.strokeStyle = hexa(BRAND.gold, 0.20 * (1 - rt) * (1 - rt));
        ctx.stroke();
        ctx.restore();
      }
    }

    var y = H * 0.44;
    // MEET — small, ember, above.
    centerText(ctx, 'MEET', y - 104, snapped ? 30 : 26, '700',
      snapped ? BRAND.gold : BRAND.goldDeep, snapped ? 0.9 : 0.55 * easeOut(pre));

    // The wordmark. 2-frame snap: size and colour both jump.
    var size = snapped ? 108 : 62;
    var col = snapped ? BRAND.gold : BRAND.goldDeep;
    var sw2 = swell(clamp(post * 1.1));

    setFont(ctx, '900', size);
    var wm = 'GRIFON.';
    var sp = snapped ? 3 : 1.5;
    var tw = trackW(ctx, wm, sp);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (snapped) {
      shapeBloom(ctx, function (k) {
        rr(ctx, W / 2 - tw / 2 * k * 0.62, y - 42 * k * 0.55, tw * k * 0.62, 60 * k * 0.55, 14);
      }, BRAND.gold, 0.50 * sw2);
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = snapped ? 1 : 0.65 * easeOut(pre);
    trackFill(ctx, wm, W / 2 - tw / 2, y, sp);
    ctx.restore();

    if (snapped) {
      var sub = inv(t, SNAP + 0.30, SNAP + 0.95);
      centerText(ctx, 'Buong ad campaign.', y + 86, 30, '700', BRAND.steelLit, easeOut(sub) * 0.9);
      centerText(ctx, 'Isang AI.', y + 128, 30, '700', BRAND.ink, easeOut(inv(t, SNAP + 0.50, SNAP + 1.15)) * 0.95);
    }

    watermark(ctx);
  }

  /* =========================== SCENE 4 — STEPS ===========================
     LINE-DRAW + arranged nodes. Three steps on a vertical spine with a
     bright leading dot. Process reads as designed, never scattered.        */
  function sceneSteps(ctx, t, p) {
    backdrop(ctx, t, true);

    var steps = ['DESCRIBE', 'BUILD', 'LAUNCH'];
    var topY = H * 0.30, gap = 168;
    var spineH = gap * 2;

    // The spine draws itself with a leading dot.
    var draw = easeOut(inv(t, 0.02, 1.15));
    ctx.save();
    ctx.fillStyle = hexa('#ffffff', 0.10);
    ctx.fillRect(W * 0.215 - 1, topY, 2, spineH);
    ctx.fillStyle = hexa(BRAND.gold, 0.75);
    ctx.fillRect(W * 0.215 - 1.5, topY, 3, spineH * draw);
    ctx.restore();
    if (draw > 0 && draw < 1) {
      glow(ctx, W * 0.215, topY + spineH * draw, 44, BRAND.gold, 0.55);
    }

    for (var i = 0; i < steps.length; i++) {
      var at = 0.08 + i * 0.52;
      var a = inv(t, at, at + 0.40);
      if (a <= 0) continue;
      var e = easeOut4(a);
      var yy = topY + i * gap;
      var sw3 = swell(inv(t, at, at + 2.0));

      // Node
      ctx.save();
      ctx.globalAlpha = e;
      glow(ctx, W * 0.215, yy, 34 * sw3, BRAND.gold, 0.42 * sw3);
      ctx.beginPath();
      ctx.arc(W * 0.215, yy, lerp(4, 11, e), 0, Math.PI * 2);
      ctx.fillStyle = BRAND.gold; ctx.fill();
      ctx.restore();

      // Label slides in from the spine, arriving on easeOut.
      var lx = lerp(W * 0.215 + 6, W * 0.305, e);
      ctx.save();
      ctx.globalAlpha = e;
      setFont(ctx, '900', 52);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = BRAND.ink;
      ctx.fillText(steps[i], lx, yy);
      setFont(ctx, '700', 19);
      ctx.fillStyle = hexa(BRAND.gold, 0.72);
      ctx.fillText('// 0' + (i + 1), lx + 2, yy + 40);
      ctx.restore();
    }

    var tail = inv(t, 2.00, 2.55);
    centerText(ctx, '30 MINUTES.', H * 0.775, 40, '900', BRAND.gold, easeOut(tail));
    centerText(ctx, 'Hindi 3 days.', H * 0.775 + 44, 30, '700', BRAND.steelLit, easeOut(inv(t, 2.22, 2.78)) * 0.9);

    watermark(ctx);
  }

  /* =========================== SCENE 5 — OFFER ===========================
     STAT-SLAM. One number, big and centred, gold on darkness.             */
  function sceneOffer(ctx, t, p) {
    backdrop(ctx, t, true);

    var lead = inv(t, 0.02, 0.34);
    centerText(ctx, 'LAHAT NG TO, KADA BUWAN', H * 0.265, 27, '700', BRAND.steel, easeOut(lead) * 0.9);

    var slam = inv(t, 0.42, 0.60);
    var sw4 = swell(inv(t, 0.42, 2.9));
    var yb = H * 0.42;

    if (slam > 0) {
      var s = lerp(1.28, 1.0, easeOut4(slam));
      setFont(ctx, '900', 114);
      var w = pesoAdvance(ctx, 114) + ctx.measureText('997').width;
      ctx.save();
      ctx.translate(W / 2, yb); ctx.scale(s, s); ctx.translate(-W / 2, -yb);
      scrim(ctx, yb - 20, 130, 0.5);
      shapeBloom(ctx, function (k) {
        var bw = w * k * 0.42, bh = 74 * k * 0.40;
        rr(ctx, W / 2 - bw, yb - 42 - bh * 0.30, bw * 2, bh * 1.3 + 42, 22);
      }, BRAND.gold, 0.46 * sw4);
      drawPrice(ctx, '997', W / 2, yb, 114, BRAND.gold, 1);
      ctx.restore();

      setFont(ctx, '900', 30);
      centerText(ctx, '/ BUWAN', yb + 44, 30, '900', hexa(BRAND.gold, 0.62), Math.min(1, slam * 1.6));
    }

    // The free-first-ad line, held to the end of the beat.
    var f = inv(t, 1.20, 1.68);
    if (f > 0) {
      var bw2 = W * 0.72, bh2 = 84, by = H * 0.605;
      ctx.save();
      ctx.globalAlpha = easeOut(f);
      rr(ctx, W / 2 - bw2 / 2, by, bw2, bh2, 20);
      ctx.fillStyle = 'rgba(255,204,0,0.10)';
      ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = hexa(BRAND.gold, 0.45); ctx.stroke();
      centerText(ctx, 'UNANG AD — LIBRE', by + 53, 34, '900', BRAND.gold, 1);
      ctx.restore();
    }

    watermark(ctx);
  }

  /* ============================ SCENE 6 — CTA ============================
     HERO-PEEL. The gold from the offer drifts to centre, swells, and the
     mark lands on top of it. Nothing pops in from nowhere at the end.     */
  function sceneCta(ctx, t, p) {
    backdrop(ctx, t, true);

    var rise = easeOut(inv(t, 0.01, 0.42));
    var cy = lerp(H * 0.52, H * 0.415, rise);
    var sw5 = swell(inv(t, 0.05, 2.6));

    // The hero glow, carried over from the offer beat's gold.
    glow(ctx, W / 2, cy, lerp(150, 300, rise) * sw5, BRAND.gold, 0.20 * sw5);

    // Emblem stand-in: a gold ring with the wordmark inside. Drawn, not
    // imported — the PNG emblem is 2.8 MB and would bloat every frame.
    ctx.save();
    ctx.globalAlpha = rise;
    ctx.beginPath();
    ctx.arc(W / 2, cy, 86, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = hexa(BRAND.gold, 0.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W / 2, cy, 86, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.lineWidth = 4;
    ctx.strokeStyle = hexa(BRAND.goldHot, 0.95);
    ctx.stroke();
    setFont(ctx, '900', 54);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = BRAND.gold;
    ctx.fillText('G', W / 2, cy + 3);
    ctx.restore();

    var wm = inv(t, 0.34, 0.76);
    if (wm > 0) {
      setFont(ctx, '900', 46);
      var txt = 'GRIFON.AI';
      var tw2 = trackW(ctx, txt, 5);
      ctx.save();
      ctx.globalAlpha = easeOut(wm);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = BRAND.ink;
      trackFill(ctx, txt, W / 2 - tw2 / 2, cy + 152, 5);
      ctx.restore();
    }

    // CTA pill — arrives on easeOut4, holds. Site's own button copy.
    var btn = inv(t, 0.70, 1.02);
    if (btn > 0) {
      var e = easeOut4(btn);
      var bw3 = W * 0.80, bh3 = 92, by2 = cy + 208;
      ctx.save();
      ctx.globalAlpha = e;
      var s = lerp(0.90, 1, e);
      ctx.translate(W / 2, by2 + bh3 / 2); ctx.scale(s, s); ctx.translate(-W / 2, -(by2 + bh3 / 2));
      shapeBloom(ctx, function (k) {
        rr(ctx, W / 2 - bw3 / 2 * k * 0.55, by2 - bh3 * (k - 1) * 0.3, bw3 * k * 0.55, bh3 * k * 0.55, 26);
      }, BRAND.gold, 0.30 * swell(inv(t, 0.70, 3.2)));
      rr(ctx, W / 2 - bw3 / 2, by2, bw3, bh3, 22);
      var g = ctx.createLinearGradient(W / 2 - bw3 / 2, by2, W / 2 + bw3 / 2, by2 + bh3);
      g.addColorStop(0, BRAND.goldHot); g.addColorStop(0.45, BRAND.gold); g.addColorStop(1, '#F0B800');
      ctx.fillStyle = g; ctx.fill();
      setFont(ctx, '900', 27);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0b0b0d';
      ctx.fillText('GUMAWA NG UNANG AD — LIBRE', W / 2, by2 + bh3 / 2 + 1);
      ctx.restore();
    }

    var foot = inv(t, 1.25, 1.72);
    centerText(ctx, 'PARA SA NEGOSYANTENG PINOY', H * 0.905, 20, '700', BRAND.steel, easeOut(foot) * 0.85);

    watermark(ctx);
  }

  /* ============================================================ driver --- */
  function drawFrame(ctx, t) {
    t = Math.max(0, Math.min(DUR - 1e-6, t));
    var start = 0;
    for (var i = 0; i < TIMELINE.length; i++) {
      if (t < TIMELINE[i].end) {
        var local = t - start;
        var span = TIMELINE[i].end - start;
        TIMELINE[i].fn(ctx, local, span > 0 ? local / span : 0);
        return;
      }
      start = TIMELINE[i].end;
    }
  }

  return { W: W, H: H, FPS: FPS, DUR: DUR, drawFrame: drawFrame, TIMELINE: TIMELINE, BRAND: BRAND };
});
