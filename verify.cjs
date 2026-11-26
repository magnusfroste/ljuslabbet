#!/usr/bin/env node
/* Oberoende kontroll av Ljuslabbets fysik och nivåer.
 * Räknar om allt med egen vektormatte – delar bara nivådata med appen. */
'use strict';
var F = require('./public/fysik.js');
var LEVELS = F.LEVELS;
var fel = 0, prov = 0;
function ok(villkor, text) {
  prov++;
  if (!villkor) { fel++; console.log('FEL: ' + text); }
}
function reflektera(d, n) {
  var k = d[0] * n[0] + d[1] * n[1];
  return [d[0] - 2 * k * n[0], d[1] - 2 * k * n[1]];
}
function vinkel(a, b) {
  var l = Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]);
  var c = Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1]) / l));
  return Math.acos(c) * 180 / Math.PI;
}

/* 1. Reflektionslagen: ut lika mycket som in, mätt mot normalen. */
var worstRefl = 0;
for (var i = 0; i < 20000; i++) {
  var th = Math.random() * 360, dth = Math.random() * 360;
  var n = [-Math.sin(th * Math.PI / 180), Math.cos(th * Math.PI / 180)];
  var d = [Math.cos(dth * Math.PI / 180), Math.sin(dth * Math.PI / 180)];
  var r = reflektera(d, n);
  var inV = vinkel([-d[0], -d[1]], n);
  var utV = vinkel(r, n);
  worstRefl = Math.max(worstRefl, Math.abs(inV - utV));
  ok(Math.abs(Math.hypot(r[0], r[1]) - 1) < 1e-9, 'reflektion bevarar längden');
}
ok(worstRefl < 1e-6, 'infalls- och reflektionsvinkel skiljer sig ' + worstRefl.toFixed(9) + ' grader');

/* 2. Snells lag och totalreflexion i appens egen brytningsfunktion. */
var N = 1.333, worstSnell = 0, tirRatt = 0, tirFel = 0;
for (var j = 0; j < 20000; j++) {
  var a = (Math.random() * 89) * Math.PI / 180;      // från normalen, i luft
  var d2 = [Math.sin(a), Math.cos(a)];                // nedåt i luft
  var br = F.refract({ x: d2[0], y: d2[1] });
  var ut = Math.asin(Math.max(-1, Math.min(1, br.x))) * 180 / Math.PI;
  var vantat = Math.asin(Math.sin(a) / N) * 180 / Math.PI;
  worstSnell = Math.max(worstSnell, Math.abs(ut - vantat));
  ok(Math.abs(Math.hypot(br.x, br.y) - 1) < 1e-9, 'brytning bevarar riktningen som enhetsvektor (ned)');
}
for (var k = 0; k < 5000; k++) {
  var au = (Math.random() * 89) * Math.PI / 180;      // i vatten, uppåt
  var du = { x: Math.sin(au), y: -Math.cos(au) };
  var bu = F.refract(du);
  var kritisk = Math.asin(1 / N) * 180 / Math.PI;      // 48,6° från normalen
  var grader = au * 180 / Math.PI;
  if (grader > kritisk) { if (bu.tir) tirRatt++; else tirFel++; }
  else {
    ok(!bu.tir, 'ingen totalreflexion under kritisk vinkel');
    var utu = Math.asin(Math.max(-1, Math.min(1, bu.x))) * 180 / Math.PI;
    var v2 = Math.asin(N * Math.sin(au)) * 180 / Math.PI;
    ok(Math.abs(utu - v2) < 1e-6, 'Snell uppåt: ' + utu.toFixed(3) + ' mot ' + v2.toFixed(3));
  }
}
ok(worstSnell < 1e-6, 'Snell nedåt avviker ' + worstSnell.toFixed(9));
ok(tirFel === 0 && tirRatt > 1000, 'totalreflexion över kritisk vinkel (' + tirRatt + ' fall)');

/* 3. Varje nivå har en exakt lösning och den ligger inom spegelns räckvidd. */
var TOLERANS = 30;   // appens träffradie i världsenheter
LEVELS.forEach(function (lv) {
  lv.mirrors.forEach(function (m) {
    ok(typeof m.losning === 'number' && m.losning >= -90 && m.losning <= 90,
      'nivå ' + lv.id + ': lösningen ' + m.losning + ' ligger inom ±90°');
    ok(Math.abs(m.th) <= 90, 'nivå ' + lv.id + ': startvinkeln är rimlig');
  });
  var speglar = lv.mirrors.map(function (m, idx) { return { x: m.x, y: m.y, th: lv.mirrors[idx].losning }; });
  var miss = F.missDistance(lv, speglar);
  ok(miss < 1, 'nivå ' + lv.id + ': lösningen missar lampan med ' + miss.toFixed(2) + ' enheter');

  // Strålen ska stanna inom spelplanen (1000×700).
  var r = F.trace(lv, speglar);
  r.pts.slice(0, -1).forEach(function (p) {
    ok(p.x > -5 && p.x < 1005 && p.y > -5 && p.y < 705,
      'nivå ' + lv.id + ': strålpunkten (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ') ligger innanför planen');
  });

  // Antalet spegelträffar ska vara exakt antalet speglar.
  var träffar = r.events.filter(function (e) { return e.kind === 'spegel'; }).length;
  ok(träffar === lv.mirrors.length, 'nivå ' + lv.id + ': strålen träffar ' + träffar + ' av ' + lv.mirrors.length + ' speglar');

  // Nivå 3–4 ska ha en brytning vid vattenytan.
  if (lv.water != null) {
    var bryt = r.events.filter(function (e) { return e.kind === 'vatten'; });
    ok(bryt.length >= 1, 'nivå ' + lv.id + ': strålen går genom vattenytan');
    ok(bryt[0].inAngle > bryt[0].outAngle, 'nivå ' + lv.id + ': ljuset böjs mot normalen ner i vattnet (' +
      bryt[0].inAngle.toFixed(1) + '° → ' + bryt[0].outAngle.toFixed(1) + '°)');
  }

  // Pusslet: få vinklar får träffa, men det ska finnas en rimlig tolerans runt lösningen.
  var n = 0, traff = 0;
  for (var v = -90; v <= 90; v += 0.25) {
    var sp = lv.mirrors.map(function (m, idx) {
      return { x: m.x, y: m.y, th: idx === lv.mirrors.length - 1 ? v : m.losning };
    });
    n++;
    if (F.missDistance(lv, sp) < TOLERANS) traff++;
  }
  var andel = traff / n * 100;
  ok(andel > 0.8 && andel < 22, 'nivå ' + lv.id + ': ' + andel.toFixed(1) + '% av vinklarna träffar (lagom svårt)');
  console.log('nivå ' + lv.id + ' (' + lv.namn + '): lösning ' +
    lv.mirrors.map(function (m) { return m.losning + '°'; }).join(' + ') +
    ', träffvidd ' + andel.toFixed(1) + '% av vinklarna');
});

/* 4. Fel vinkel ska ge bom, inte träff. */
LEVELS.forEach(function (lv) {
  var sp = lv.mirrors.map(function (m) { return { x: m.x, y: m.y, th: m.losning + 25 }; });
  ok(F.missDistance(lv, sp) > TOLERANS, 'nivå ' + lv.id + ': 25° fel ger bom');
});

/* 5. Vattnet får inte ligga över lasern eller målet i fel nivåer. */
LEVELS.forEach(function (lv) {
  if (lv.water == null) return;
  ok(lv.emitter.y !== lv.water, 'nivå ' + lv.water + ': lasern står inte på ytan');
  ok(lv.water > 150 && lv.water < 650, 'nivå ' + lv.id + ': vattenytan ligger i bild');
});


/* 6. Varje mening appen säger har en färdig mp3-fil. */
var fs = require('fs');
var TAL = require('./public/tal.js');
var linesSrc = fs.readFileSync('./public/ljud/lines.js', 'utf8');
var ROST = JSON.parse(linesSrc.slice(linesSrc.indexOf('{'), linesSrc.lastIndexOf('}') + 1));
var sagt = [TAL.valkommen];
LEVELS.forEach(function (lv) { sagt.push(lv.intro, lv.tips, lv.avslut); });
sagt.forEach(function (t) {
  ok(!!ROST[t], 'mp3 saknas för: ' + t.slice(0, 40));
  if (ROST[t]) {
    var fil = './public/ljud/' + ROST[t] + '.mp3';
    ok(fs.existsSync(fil) && fs.statSync(fil).size > 2000, 'mp3-filen är tom eller saknas: ' + fil);
  }
});
console.log('röstdäckning: ' + sagt.length + ' meningar, ' + Object.keys(ROST).length + ' mp3-filer');

console.log('\n' + prov + ' kontroller, ' + fel + ' fel');
process.exit(fel ? 1 : 0);