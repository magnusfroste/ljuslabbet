/* Ljuslabbet – optik för åk 7–9. Ritning, pekdon och tal. */
(function () {
  'use strict';
  var F = window.FYSIK;
  var W = 1000, H = 700;
  var canvas = document.getElementById('duk');
  var ctx = canvas.getContext('2d');
  var scen = document.getElementById('scen');
  var startskarm = document.getElementById('startskarm');
  var klar = document.getElementById('klarskarm');
  var chipsEl = document.getElementById('niva-chips');
  var starEl = document.getElementById('stjarnor');
  var vinkelEl = document.getElementById('vinkel');
  var tipsEl = document.getElementById('tipsbubbla');
  var ljudKnapp = document.getElementById('ljudknapp');
  var vridKnappar = Array.prototype.slice.call(document.querySelectorAll('.vrid'));

  var S = {
    lage: 'start',       // start | spel | klar
    niva: 0,
    klar: [false, false, false, false],
    stjarnor: 0,
    speglar: [],
    vald: 0,
    ljud: true,
    drag: null,
    skala: 1, ox: 0, oy: 0,
    senasteTraff: 0,
    sistaRo: 0,
    hintVisad: false,
    traff: false
  };

  // ---------- tal ----------
  var ROST = window.TAL;

  function tala(text) {
    if (!S.ljud || !text) return;
    try {
      if (window.__rost && window.__rost(text)) return;
    } catch (e) {}
    try {
      
    } catch (e) {}
  }

  // ---------- layout ----------
  function passaIn() {
    var r = scen.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    S.skala = Math.min(r.width / W, r.height / H);
    S.ox = (r.width - W * S.skala) / 2;
    S.oy = (r.height - H * S.skala) / 2;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    canvas._dpr = dpr;
  }
  window.addEventListener('resize', passaIn);
  window.addEventListener('load', passaIn);
  if (window.ResizeObserver) new ResizeObserver(passaIn).observe(scen);
  window.addEventListener('orientationchange', function () { setTimeout(passaIn, 150); });

  function tillVarld(klientX, klientY) {
    var r = canvas.getBoundingClientRect();
    return { x: (klientX - r.left - S.ox) / S.skala, y: (klientY - r.top - S.oy) / S.skala };
  }

  // ---------- nivåer ----------
  function niva() { return F.LEVELS[S.niva]; }

  function startaNiva(n) {
    S.niva = n;
    var lv = F.LEVELS[n];
    S.speglar = lv.mirrors.map(function (m) { return { x: m.x, y: m.y, th: m.th }; });
    S.vald = 0;
    S.lage = 'spel';
    S.traff = false;
    S.hintVisad = false;
    S.sistaRo = performance.now();
    startskarm.hidden = true;
    klar.hidden = true;
    tipsEl.hidden = true;
    ritaChips();
    tala(lv.intro);
    if (window.skolappar && window.skolappar.event) {
      try { window.skolappar.event('level', n + 1); } catch (e) {}
    }
  }

  function ritaChips() {
    chipsEl.innerHTML = '';
    F.LEVELS.forEach(function (lv, i) {
      var b = document.createElement('button');
      b.className = 'chip' + (i === S.niva && S.lage !== 'start' ? ' nu' : '') + (S.klar[i] ? ' klar' : '');
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', 'Nivå ' + (i + 1));
      b.addEventListener('click', function () { startaNiva(i); });
      chipsEl.appendChild(b);
    });
    starEl.textContent = '★ ' + S.stjarnor;
  }

  // ---------- spegelvridning ----------
  function snappa(i, v) {
    var lv = niva(), mal = lv.mirrors[i].losning;
    if (Math.abs(v - mal) < 3.5) return { th: mal, snapp: true };
    return { th: v, snapp: false };
  }
  function vrid(i, grader) {
    var m = S.speglar[i];
    var r = snappa(i, m.th + grader);
    m.th = Math.round(r.th * 10) / 10;
    S.vald = i;
    S.lage = 'spel';
    uppdatera();
  }

  function valjSpegel(i) { S.vald = i; uppdatera(); }

  // ---------- pekdon ----------
  canvas.addEventListener('pointerdown', function (e) {
    if (S.lage !== 'spel') return;
    passaIn();
    var p = tillVarld(e.clientX, e.clientY);
    for (var i = 0; i < S.speglar.length; i++) {
      var m = S.speglar[i];
      var avst = Math.hypot(p.x - m.x, p.y - m.y);
      if (avst < Math.max(120, 30 / S.skala)) {
        S.vald = i;
        // Greppar man rakt på mitten finns ingen riktning – då utgår vi från rattens nuvarande vinkel.
        var pek = avst < 8 ? m.th : F.deg(Math.atan2(p.y - m.y, p.x - m.x));
        S.drag = { i: i, off: m.th - pek };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        tipsEl.hidden = true;
        uppdatera();
        return;
      }
    }
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!S.drag || S.lage !== 'spel') return;
    passaIn();
    var p = tillVarld(e.clientX, e.clientY);
    var m = S.speglar[S.drag.i];
    var v = F.deg(Math.atan2(p.y - m.y, p.x - m.x)) + S.drag.off;
    while (v > 90) v -= 180;
    while (v < -90) v += 180;
    m.th = Math.round(v * 2) / 2;
    uppdatera();
  });
  function slapp() {
    if (S.drag && S.lage === 'spel') {
      var m = S.speglar[S.drag.i];
      var r = snappa(S.drag.i, m.th);
      if (r.snapp) { m.th = r.th; uppdatera(); }
    }
    S.drag = null;
  }
  canvas.addEventListener('pointerup', slapp);
  canvas.addEventListener('pointercancel', slapp);
  canvas.addEventListener('pointerleave', slapp);

  vridKnappar.forEach(function (b) {
    b.addEventListener('click', function () {
      if (S.lage === 'start') return;
      S.lage = 'spel';
      klar.hidden = true;
      vrid(S.vald, parseFloat(b.dataset.d));
    });
  });

  document.getElementById('hintknapp').addEventListener('click', function () {
    if (S.lage === 'start') return;
    tipsEl.textContent = niva().tips;
    tipsEl.hidden = false;
    S.hintVisad = true;
    tala(niva().tips);
    if (window.skolappar && window.skolappar.event) {
      try { window.skolappar.event('hint'); } catch (e) {}
    }
  });
  function RVO_tips() { return niva().tips; }

  document.getElementById('starta').addEventListener('click', function () {
    if (window.skolappar && window.skolappar.event) {
      try { window.skolappar.event('round_start'); } catch (e) {}
    }
    tala(ROST.valkommen);
    startaNiva(0);
  });
  document.getElementById('nasta').addEventListener('click', function () {
    var n = S.niva + 1;
    if (n < F.LEVELS.length) startaNiva(n);
    else { klar.hidden = true; startskarm.hidden = false; S.lage = 'start'; ritaChips(); }
  });
  document.getElementById('stangKlar').addEventListener('click', function () {
    klar.hidden = true;
    startskarm.hidden = false;
    S.lage = 'start';
    ritaChips();
  });

  ljudKnapp.addEventListener('click', function () {
    S.ljud = !S.ljud;
    ljudKnapp.textContent = S.ljud ? '🔊' : '🔇';
    ljudKnapp.setAttribute('aria-label', S.ljud ? 'Stäng av ljudet' : 'Sätt på ljudet');
    if (!S.ljud) {
      try { if (window.__rostStopp) window.__rostStopp(); } catch (e) {}
      if (window.skolappar && window.skolappar.event) {
        try { window.skolappar.event('sound_off'); } catch (e) {}
      }
    }
    uppdatera();
  });
  // Lås upp ljudet på iOS vid första trycket.
  window.addEventListener('pointerdown', function () {
    if (window.__rost && window.__rost.unlock) { try { window.__rost.unlock(); } catch (e) {} }
  }, { once: true });

  // ---------- ritning ----------
  function uppdatera() {
    var lv = niva();
    var r = F.trace(lv, S.speglar);
    var miss = 1e9;
    for (var i = 0; i < r.pts.length - 1; i++) {
      miss = Math.min(miss, F.distToSeg(lv.target, r.pts[i], r.pts[i + 1]));
    }
    var traff = miss < 30;
    if (traff && !S.traff && S.lage === 'spel') klaraNiva();
    S.traff = traff;
    rita(r, traff);
    skrivVinklar(r);
  }

  function skrivVinklar(r) {
    var delar = [], spegel = null, vatten = null;
    for (var i = 0; i < r.events.length; i++) {
      var e = r.events[i];
      if (e.kind === 'spegel' && e.idx === S.vald && !spegel) spegel = e;
      if (e.kind === 'vatten' && !vatten) vatten = e;
    }
    if (spegel) delar.push('infall ' + Math.round(spegel.inAngle) + '° · ut ' + Math.round(spegel.outAngle) + '°');
    if (vatten) delar.push(vatten.tir ? 'vatten: totalreflexion'
      : 'vatten: in ' + Math.round(vatten.inAngle) + '° · ut ' + Math.round(vatten.outAngle) + '°');
    vinkelEl.textContent = delar.length ? delar.join('   |   ') : 'vrid på spegeln';
  }

  function rita(r, traff) {
    var dpr = canvas._dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(S.ox, S.oy);
    ctx.scale(S.skala, S.skala);

    var lv = niva();
    // papper
    ctx.fillStyle = '#FBF7EE';
    ctx.fillRect(0, 0, W, H);
    // rutnät, mycket svagt
    ctx.strokeStyle = 'rgba(30,58,74,0.05)';
    ctx.lineWidth = 1;
    for (var gx = 100; gx < W; gx += 100) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (var gy = 100; gy < H; gy += 100) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    // vatten
    if (lv.water != null) {
      ctx.fillStyle = 'rgba(78,142,178,0.18)';
      ctx.fillRect(0, lv.water, W, H - lv.water);
      ctx.strokeStyle = 'rgba(58,122,158,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, lv.water); ctx.lineTo(W, lv.water); ctx.stroke();
      ctx.fillStyle = 'rgba(38,96,128,0.75)';
      ctx.font = '500 17px "Nunito", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('vatten  n = 1,33', W - 22, lv.water + 30);
    }

    // stråle
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(232,69,44,0.18)';
    ctx.lineWidth = 13;
    ritaStraka(r.pts);
    ctx.strokeStyle = '#E8452C';
    ctx.lineWidth = 4.5;
    ritaStraka(r.pts);
    ctx.strokeStyle = 'rgba(255,214,190,0.85)';
    ctx.lineWidth = 1.4;
    ritaStraka(r.pts);

    // infallsnormal vid vald spegel
    var ev = null;
    for (var i = 0; i < r.events.length; i++) if (r.events[i].kind === 'spegel' && r.events[i].idx === S.vald) { ev = r.events[i]; break; }
    if (ev) {
      var m = S.speglar[S.vald], n = F.normal(m);
      ctx.save();
      ctx.setLineDash([9, 9]);
      ctx.strokeStyle = 'rgba(30,58,74,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ev.x - n.x * 70, ev.y - n.y * 70);
      ctx.lineTo(ev.x + n.x * 70, ev.y + n.y * 70);
      ctx.stroke();
      ctx.restore();
    }

    // lasern
    var em = lv.emitter;
    ctx.save();
    ctx.translate(em.x, em.y);
    ctx.rotate(F.rad(em.dir));
    runda(-30, -20, 62, 40, 10);
    ctx.fillStyle = '#2C4657';
    ctx.fill();
    ctx.fillStyle = '#8FB7CB';
    runda(20, -9, 12, 18, 5); ctx.fill();
    ctx.rotate(-F.rad(em.dir));
    ctx.restore();
    ctx.fillStyle = 'rgba(30,58,74,0.8)';
    ctx.font = '600 15px "Nunito", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('laser', em.x - 16, em.y + 42);

    // speglarna
    S.speglar.forEach(function (mp, i) {
      var sg = F.mirrorSeg(mp);
      var vald = i === S.vald;
      ctx.strokeStyle = '#7F6A4E';
      ctx.lineWidth = 11;
      ctx.beginPath(); ctx.moveTo(sg.a.x, sg.a.y); ctx.lineTo(sg.b.x, sg.b.y); ctx.stroke();
      ctx.strokeStyle = '#C9D4DE';
      ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(sg.a.x, sg.a.y); ctx.lineTo(sg.b.x, sg.b.y); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sg.a.x, sg.a.y); ctx.lineTo(sg.b.x, sg.b.y); ctx.stroke();

      // ratt
      var puls = vald ? 1 + 0.06 * Math.sin(performance.now() / 300) : 1;
      var kr = Math.max(26, 21 / S.skala);
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, kr * puls, 0, Math.PI * 2);
      ctx.fillStyle = vald ? '#FFD166' : '#EDE3D2';
      ctx.fill();
      ctx.strokeStyle = vald ? '#C98A12' : '#B9AC96';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, Math.max(9, 7 / S.skala), 0, Math.PI * 2);
      ctx.fillStyle = vald ? '#C98A12' : '#B9AC96';
      ctx.fill();
    });

    // lampan
    var T = lv.target;
    ctx.save();
    ctx.translate(T.x, T.y);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(34, 24 / S.skala), 0, Math.PI * 2);
    ctx.fillStyle = traff ? '#FFC93C' : '#E7DCC7';
    ctx.fill();
    ctx.strokeStyle = traff ? '#C98A12' : 'rgba(120,100,70,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(12, 9 / S.skala), 0, Math.PI * 2);
    ctx.fillStyle = traff ? '#FFF6D8' : '#CFC2A8';
    ctx.fill();
    if (traff) {
      ctx.strokeStyle = 'rgba(255,201,60,0.85)';
      ctx.lineWidth = 4;
      for (var k = 0; k < 8; k++) {
        var a = k * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
        ctx.lineTo(Math.cos(a) * 52, Math.sin(a) * 52);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.restore();
  }

  function ritaStraka(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  function runda(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- klart ----------
  function klaraNiva() {
    S.lage = 'klar';
    if (!S.klar[S.niva]) { S.klar[S.niva] = true; S.stjarnor++; }
    ritaChips();
    var lv = niva();
    tala(lv.avslut);
    if (window.skolappar && window.skolappar.event) {
      try {
        window.skolappar.event('round_done', 100);
        window.skolappar.event('level', S.niva + 1);
      } catch (e) {}
    }
    var sista = S.klar.every(function (k) { return k; });
    document.getElementById('klar-rubrik').textContent = sista ? 'Alla nivåer klara!' : 'Nivå ' + (S.niva + 1) + ' klar';
    document.getElementById('klar-stjarna').textContent = '★';
    document.getElementById('nasta').textContent = S.niva + 1 < F.LEVELS.length ? 'Nästa nivå' : 'Spela igen';
    klar.hidden = false;
  }

  // ---------- klocka ----------
  var senaste = performance.now();
  function steg() {
    var nu = performance.now();
    if (document.hidden) { senaste = nu; return; }
    if (nu - senaste > 320) {
      senaste = nu;
      if (S.lage === 'spel') uppdatera();
    }
  }
  function ram() {
    var nu = performance.now();
    senaste = nu;
    if (S.lage === 'spel' || S.lage === 'klar') {
      if (!S.drag) uppdatera();
    }
    requestAnimationFrame(ram);
  }
  setInterval(steg, 100);

  // ---------- start ----------
  function init() {
    passaIn();
    ritaChips();
    S.niva = 0;
    S.speglar = F.LEVELS[0].mirrors.map(function (m) { return { x: m.x, y: m.y, th: m.th }; });
    uppdatera();
    requestAnimationFrame(ram);
  }
  init();

  // Test- och felsökningshandtag.
  window.__ljus = {
    S: S, F: F,
    startaNiva: startaNiva,
    vrid: vrid,
    miss: function () { return F.missDistance(F.LEVELS[S.niva], S.speglar); },
    spelaKlar: klaraNiva
  };
})();
