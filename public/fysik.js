/* Ljuslabbet – geometri och fysik. Delas av appen (webbläsare) och verify.cjs (Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FYSIK = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VATTEN_N = 1.333;

  function unit(a) { return { x: Math.cos(a), y: Math.sin(a) }; }
  function deg(r) { return r * 180 / Math.PI; }
  function rad(d) { return d * Math.PI / 180; }

  // Spegel: mittpunkt (x,y) och vinkel i grader (spegelns riktning, 0 = vågrät).
  function mirrorSeg(m, len) {
    var L = (len || 92) / 2, c = Math.cos(rad(m.th)), s = Math.sin(rad(m.th));
    return { a: { x: m.x - c * L, y: m.y - s * L }, b: { x: m.x + c * L, y: m.y + s * L } };
  }
  function normal(m) { var c = Math.cos(rad(m.th)), s = Math.sin(rad(m.th)); return { x: -s, y: c }; }

  function reflect(d, n) {
    var k = d.x * n.x + d.y * n.y;
    return { x: d.x - 2 * k * n.x, y: d.y - 2 * k * n.y };
  }

  // Brytning över en vågrät yta. d är enhetsvektor, n1 luft (1,0), n2 vatten (1,333).
  function refract(d) {
    var n1, n2;
    if (d.y > 0) { n1 = 1; n2 = VATTEN_N; } else { n1 = VATTEN_N; n2 = 1; }
    var st = d.x * n1 / n2;
    if (Math.abs(st) > 1) return { x: d.x, y: -d.y, tir: true };   // totalreflexion
    var y = Math.sqrt(1 - st * st);
    return { x: st, y: d.y > 0 || d.y < 0 ? (d.y > 0 ? y : -y) : y, tir: false };
  }

  function raySeg(p, d, a, b) {
    var rx = b.x - a.x, ry = b.y - a.y;
    var den = d.x * ry - d.y * rx;
    if (Math.abs(den) < 1e-9) return null;
    var t = ((a.x - p.x) * ry - (a.y - p.y) * rx) / den;
    var u = ((a.x - p.x) * d.y - (a.y - p.y) * d.x) / den;
    if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9) return t;
    return null;
  }

  // Kör strålen genom nivån. Returnerar punkter och vad som hände vid varje träff.
  function trace(level, mirrors, maxBounce) {
    var p = { x: level.emitter.x, y: level.emitter.y };
    var d = unit(rad(level.emitter.dir));
    var pts = [p], events = [];
    var mb = maxBounce || 10;
    for (var i = 0; i < mb; i++) {
      var best = null, kind = null, idx = null;
      for (var j = 0; j < mirrors.length; j++) {
        var sg = mirrorSeg(mirrors[j]), t = raySeg(p, d, sg.a, sg.b);
        if (t !== null && (best === null || t < best)) { best = t; kind = 'spegel'; idx = j; }
      }
      if (level.water != null && Math.abs(d.y) > 1e-9) {
        var tw = (level.water - p.y) / d.y;
        if (tw > 1e-6 && (best === null || tw < best)) { best = tw; kind = 'vatten'; idx = null; }
      }
      if (best === null) break;
      var q = { x: p.x + d.x * best, y: p.y + d.y * best };
      pts.push(q);
      if (kind === 'spegel') {
        var n = normal(mirrors[idx]);
        var inc = deg(Math.acos(Math.min(1, Math.abs(-d.x * n.x - d.y * n.y))));
        d = reflect(d, n);
        events.push({ x: q.x, y: q.y, kind: 'spegel', idx: idx, inAngle: inc, outAngle: inc });
      } else {
        var before = Math.abs(deg(Math.asin(Math.max(-1, Math.min(1, d.x)))));
        var r = refract(d);
        var after = Math.abs(deg(Math.asin(Math.max(-1, Math.min(1, r.x)))));
        d = { x: r.x, y: r.y };
        events.push({ x: q.x, y: q.y, kind: 'vatten', tir: !!r.tir, inAngle: before, outAngle: after });
      }
      p = { x: q.x + d.x * 0.01, y: q.y + d.y * 0.01 };
    }
    pts.push({ x: p.x + d.x * 2400, y: p.y + d.y * 2400 });
    return { pts: pts, events: events, dir: d };
  }

  function distToSeg(pt, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy;
    var t = L === 0 ? 0 : Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / L));
    return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
  }

  // Närmaste avstånd från strålen till målet (oändliga slutstrålen räknas inte).
  function missDistance(level, mirrors) {
    var r = trace(level, mirrors), best = 1e9;
    for (var i = 0; i < r.pts.length - 1; i++) {
      best = Math.min(best, distToSeg(level.target, r.pts[i], r.pts[i + 1]));
    }
    return best;
  }

  var LEVELS = [
    {
      id: 1, namn: 'En spegel',
      intro: 'En spegel. Dra i ratten tills strålen träffar lampan.',
      emitter: { x: 80, y: 620, dir: -1.95 },
      mirrors: [{ x: 520, y: 605, th: 0, losning: -27 }],
      target: { x: 815, y: 227 },
      water: null,
      tips: 'Ljuset studsar lika mycket ut som det kom in. Vinkeln mot spegelns normal är lika stor på båda sidor.',
      avslut: 'Rätt! Ljuset studsar lika mycket ut som det kommer in – infallsvinkeln och reflektionsvinkeln är lika stora.'
    },
    {
      id: 2, namn: 'Två speglar',
      intro: 'Två speglar. Båda måste vridas rätt – först den ena, sedan den andra.',
      emitter: { x: 80, y: 640, dir: -37.69 },
      mirrors: [{ x: 300, y: 470, th: 0, losning: -33.85 }, { x: 700, y: 239, th: 0, losning: 7.5 }],
      target: { x: 880, y: 419 },
      water: null,
      tips: 'Strålen mellan speglarna måste träffa den andra spegeln. Ta en spegel i taget.',
      avslut: 'Rätt! Båda speglarna följer samma regel: lika mycket in som ut.'
    },
    {
      id: 3, namn: 'Ner i vattnet',
      intro: 'Vattnet bryter ljuset. Dra i ratten så att strålen når lampan under ytan.',
      emitter: { x: 80, y: 170, dir: 0 },
      mirrors: [{ x: 400, y: 170, th: 0, losning: 30 }],
      target: { x: 614, y: 600 },
      water: 400,
      tips: 'När ljuset går ner i vattnet böjs det mot normalen. Vinkeln blir mindre i vattnet än i luften.',
      avslut: 'Rätt! I vattnet böjs ljuset mot normalen, och vinkeln blir mindre än i luften.'
    },
    {
      id: 4, namn: 'Spegel under ytan',
      intro: 'Ljuset bryts ner i vattnet, studsar i spegeln och träffar lampan under ytan.',
      emitter: { x: 80, y: 170, dir: 0 },
      mirrors: [{ x: 380, y: 170, th: 0, losning: 22 }, { x: 765, y: 610, th: 0, losning: 3.67 }],
      target: { x: 880, y: 472 },
      water: 430,
      tips: 'Brytningen sker bara vid ytan. Under vattnet gäller samma spegelregel som i luften.',
      avslut: 'Rätt! Brytningen sker bara vid ytan. Under vattnet gäller samma spegelregel som i luften.'
    }
  ];

  return {
    VATTEN_N: VATTEN_N, LEVELS: LEVELS, trace: trace, reflect: reflect, refract: refract,
    mirrorSeg: mirrorSeg, normal: normal, missDistance: missDistance, distToSeg: distToSeg,
    unit: unit, deg: deg, rad: rad
  };
});