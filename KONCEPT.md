# Ljuslabbet – koncept och testplan

**Mål (en sak):** eleven ska kunna räkna ut hur en ljusstråle reflekteras och bryts, och själv
ställa in den vinkel som krävs för att nå ett mål.

**Målgrupp:** fysik åk 7–9 (13–15 år). Läser korta texter. Testas mot Lgr22 FY.7-9.1.6.

**Kärnmekanik (touch först):** en laser skjuter en stråle. Eleven drar i den runda ratten på en
spegel (eller trycker −10° / −1° / +1° / +10°) och strålen ritas om direkt, med vinklarna i grader
ovanför spelplanen. Nivå 3–4 går strålen ner i vatten: den bryts vid ytan, och brytningsvinkeln
visas mindre än infallsvinkeln. När strålen träffar lampan tänds den.

**Session:** fyra nivåer à 1–2 minuter, ca 5 minuter totalt. Ingen tid, inga liv; fel vinkel kostar
ingenting, man vrider bara vidare.

**Belöning barnet kan berätta om:** fyra tända lampor och regeln ”infallsvinkeln är lika stor som
reflektionsvinkeln – utom när ljuset går ner i vatten, då blir vinkeln mindre”.

**Vad eleven lär:**
- reflektionslagen (infall = reflektion, mätt mot normalen) – nivå 1–2
- att en spegelvänd stråle kräver att spegeln står på halva vinkeln mellan in och ut
- brytning vid en vattenyta med n = 1,33, och att bryningen bara sker vid ytan – nivå 3–4
- totalreflexion (visas som text om strålen träffar ytan inifrån med för stor vinkel)

**Lgr22:** FY.7-9.1.6 – ”Hur ljus breder ut sig, reflekteras och bryts.” (ordagrant ur Skolverkets
syllabus-API, citerat på startskärmen).

**iPad:** ratten har 44–56 px träffyta (växer när skalan krymper), vridknapparna 48–52 px, allt
ryms utan scroll i båda orienteringarna.

## Testplan (mätbart)

1. `node verify.cjs` – egen vektormatte, delar bara nivådata med appen:
   - reflektionslagen: 20 000 slumpade spegel-/strålevinklar, in = ut inom 1e-6 grader
   - Snells lag: 20 000 fall nedåt (luft→vatten) och 5 000 uppåt, plus totalreflexion över 48,6°
   - varje nivå: lösningen träffar lampan (<1 enhet), strålen träffar exakt nivåns speglar,
     alla strålpunkter innanför 1000×700, brytningen sker vid ytan och vinkeln minskar
   - pusslet är lagom svårt: 2–5 % av alla vinklar träffar (inte 0, inte 40)
   - 25° fel ger bom
   - röstdäckning: varje mening appen säger har en mp3-fil > 2 kB
2. 0 px scroll (båda axlarna) i 1024×768, 768×1024, 390×844, 1440×900, efter start.
3. Hela spelet spelat: fyra nivåer till ”Alla nivåer klara! 4 stjärnor”, felväg prövad
   (25° fel = bom, ingen förlust), ledtråd prövad.
4. Röst: mp3-filer för alla 13 meningar, `window.__rostFinns()` sant för varje.
5. Kortbild 1200×900 ur spelmoment (nivå 3, strålen på väg ner i vattnet).

## Validering (egen granskning – ingen andre agent finns i cron-körningen)
(a) Spelar ett barn frivilligt fem minuter? Ja: fyra korta pussel, strålen rör sig direkt under
fingret, lampan tänds med ljud och stjärna. Nivå 2 kräver två vridningar, vilket ger en andra
”aha”-upplevelse utan att bli långtråkigt.
(b) Verkligt kunskapskrav? Ja: FY.7-9.1.6 är ordagrant ”Hur ljus breder ut sig, reflekteras och
bryts”, och mekaniken är just reflektion och brytning – inte ett quiz om dem.
(c) Teknisk risk? Låg: statisk HTML/CSS/JS, en canvas, all fysik i `fysik.js` som verify.cjs
räknar om oberoende. Känd risk: vinkeln är känslig (±2°) – därför snappar ratten till lösningen
inom 3,5° och knapparna ger 1°-steg.