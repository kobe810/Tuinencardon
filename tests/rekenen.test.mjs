// Tests voor de rekenlogica van de prijstool. De tarieven hier zijn testwaarden, geen echte prijzen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getal,
  zoekBuurt,
  berekenPlan,
  totaalTekst,
  bedragTekst,
  euro,
  niveau,
  STANDAARD_VAAK
} from '../public/js/rekenen.js';
import { volgendeMaandag } from '../public/js/datum.js';

const lees = (pad) => JSON.parse(readFileSync(new URL('../public/' + pad, import.meta.url), 'utf8'));
const buurten = lees('data/buurten.json');
const planning = lees('data/planning.json');
const leegTarief = lees('data/tarieven.json');

function testTarieven() {
  const t = structuredClone(leegTarief);
  t.gras.prijs = 0.1;
  t.borders.prijs = 1;
  t.terras.prijs = 1;
  t.blad.prijs = 0.05;
  t.gazon.prijs = 0.2;
  t.haag.laag = 2;
  t.haag.midden = 3;
  t.haag.hoog = 4;
  t.struik.klein = 5;
  t.struik.midden = 10;
  t.struik.groot = 20;
  t.afvoer.prijs = 6;
  t.verplaatsing.prijs = 5;
  return t;
}

const basis = {
  kies: { gras: true, haag: true },
  hoeveel: { gras: '150', haagLengte: '20' },
  vaak: STANDAARD_VAAK,
  buurtdag: true,
  postcode: '1701'
};

test('getal leest invulvelden veilig', () => {
  assert.equal(getal('12,5'), 12.5);
  assert.equal(getal('7'), 7);
  assert.equal(getal(''), 0);
  assert.equal(getal('-3'), 0);
  assert.equal(getal('abc'), 0);
  assert.equal(getal(undefined), 0);
});

test('postcode vindt de juiste buurt', () => {
  assert.equal(zoekBuurt('1701', buurten).naam, 'Dilbeek');
  assert.equal(zoekBuurt(' 1740 ', buurten).dag, 'dinsdag');
  assert.equal(zoekBuurt('9000', buurten), null);
  assert.equal(zoekBuurt('17', buurten), null);
  assert.equal(zoekBuurt('', buurten), null);
});

test('zonder tarieven toont het plan plaatshouders en geen verzonnen bedragen', () => {
  const plan = berekenPlan(basis, leegTarief, planning, buurten);
  assert.equal(plan.lijnen.length, 2);
  assert.ok(plan.lijnen.every((l) => l.bedrag === null));
  assert.equal(plan.compleet, false);
  assert.equal(plan.totaal, null);
  assert.equal(totaalTekst(plan), '€ [BEDRAG]');
  assert.equal(bedragTekst(null), '[tarief]');
});

test('met tarieven rekent het plan juist', () => {
  const plan = berekenPlan(basis, testTarieven(), planning, buurten);
  // Gras om de twee weken van april tot oktober: 14 beurten, 150 m² aan 0,1 euro = 210.
  // Haag tot 1,5 m, 20 m, twee kanten, twee keer per jaar aan 2 euro = 160.
  assert.equal(plan.lijnen.find((l) => l.id === 'gras').bedrag, 210);
  assert.equal(plan.lijnen.find((l) => l.id === 'haag').bedrag, 160);
  assert.equal(plan.totaal, 370);
  assert.equal(plan.verplaatsing, false);
  assert.equal(plan.totaalBezoeken, 14);
  assert.equal(totaalTekst(plan), euro(370));
});

test('werk in dezelfde maand telt als één bezoek', () => {
  const plan = berekenPlan(basis, testTarieven(), planning, buurten);
  const juni = plan.maanden[5];
  assert.equal(juni.bezoeken, 2);
  assert.deepEqual(juni.werk, ['Maaien', 'Haag']);
  assert.deepEqual(plan.maanden.map((m) => m.kort), ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']);
  assert.equal(plan.maanden[0].bezoeken, 0);
});

test('verplaatsing komt erbij buiten de buurt of op een andere dag', () => {
  const buiten = berekenPlan({ ...basis, postcode: '9000' }, testTarieven(), planning, buurten);
  assert.equal(buiten.verplaatsing, true);
  assert.equal(buiten.lijnen.find((l) => l.id === 'verplaatsing').bedrag, 14 * 5);

  const anderedag = berekenPlan({ ...basis, buurtdag: false }, testTarieven(), planning, buurten);
  assert.equal(anderedag.verplaatsing, true);
});

test('groenafval rekent per bezoek', () => {
  const plan = berekenPlan({ ...basis, kies: { ...basis.kies, afvoer: true } }, testTarieven(), planning, buurten);
  assert.equal(plan.lijnen.find((l) => l.id === 'afvoer').bedrag, 14 * 6);
});

test('struiken: een ontbrekend tarief voor een gebruikte maat geeft een plaatshouder', () => {
  const t = testTarieven();
  t.struik.groot = null;
  const zonderGroot = berekenPlan(
    { ...basis, kies: { struik: true }, hoeveel: { struikKlein: '3', struikMidden: '1', struikGroot: '0' } },
    t, planning, buurten
  );
  assert.equal(zonderGroot.lijnen.find((l) => l.id === 'struik').bedrag, 3 * 5 + 1 * 10);

  const metGroot = berekenPlan(
    { ...basis, kies: { struik: true }, hoeveel: { struikGroot: '1' } },
    t, planning, buurten
  );
  assert.equal(metGroot.lijnen.find((l) => l.id === 'struik').bedrag, null);
});

test('een leeg plan kost niets en heeft geen bezoeken', () => {
  const plan = berekenPlan({ ...basis, kies: {} }, testTarieven(), planning, buurten);
  assert.equal(plan.leeg, true);
  assert.equal(plan.lijnen.length, 0);
  assert.equal(plan.totaalBezoeken, 0);
  assert.equal(totaalTekst(plan), euro(0));
});

test('kleur per maand volgt het aantal bezoeken', () => {
  assert.equal(niveau(0), '0');
  assert.equal(niveau(1), '1');
  assert.equal(niveau(3), '2');
  assert.equal(niveau(4), '4');
});

test('planning heeft voor elke keuze twaalf maanden', () => {
  for (const [dienst, keuzes] of Object.entries(planning)) {
    if (dienst.startsWith('_') || dienst === 'nagekeken') continue;
    for (const [keuze, maanden] of Object.entries(keuzes)) {
      assert.equal(maanden.length, 12, dienst + ' ' + keuze);
      assert.ok(maanden.every((n) => Number.isInteger(n) && n >= 0), dienst + ' ' + keuze);
    }
  }
});

test('elke keuzeknop in de prijstool bestaat in de planning', () => {
  const html = readFileSync(new URL('../public/prijs/index.html', import.meta.url), 'utf8');
  const knoppen = [...html.matchAll(/data-veld="([a-z]+)" data-waarde="([a-z0-9]+)"/gi)];
  const zonderPlanning = ['dag', 'haagHoogte', 'haagKanten'];
  assert.ok(knoppen.length > 10);
  for (const [, veld, waarde] of knoppen) {
    if (zonderPlanning.includes(veld)) continue;
    assert.ok(planning[veld] && planning[veld][waarde], veld + ' ' + waarde + ' ontbreekt in planning.json');
  }
});

test('volgende maandag', () => {
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  assert.equal(iso(volgendeMaandag(new Date(2026, 10, 16, 12))), '2026-11-23');
  assert.equal(iso(volgendeMaandag(new Date(2026, 10, 18, 9))), '2026-11-23');
  assert.equal(iso(volgendeMaandag(new Date(2026, 10, 22, 20))), '2026-11-23');
  assert.equal(iso(volgendeMaandag(new Date(2026, 11, 30, 8))), '2027-01-04');
});
