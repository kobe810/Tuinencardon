// Rekenlogica van de prijstool. Deze module raakt de pagina niet aan, zodat de tests ze rechtstreeks kunnen gebruiken.

export const DIENSTEN = ['gras', 'haag', 'borders', 'terras', 'blad', 'gazon', 'struik', 'afvoer'];
export const WERKDIENSTEN = DIENSTEN.filter((d) => d !== 'afvoer');

export const NAMEN = {
  gras: 'Gras maaien',
  haag: 'Hagen snoeien',
  borders: 'Borders en plantvakken',
  terras: 'Terras en oprit',
  blad: 'Bladruimen',
  gazon: 'Gazonverzorging',
  struik: 'Struiken snoeien',
  afvoer: 'Groenafval afvoeren'
};

export const KORT = {
  gras: 'Maaien',
  haag: 'Haag',
  borders: 'Borders',
  terras: 'Terras',
  blad: 'Blad',
  gazon: 'Gazon',
  struik: 'Struiken'
};

export const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MAANDEN_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const STANDAARD_VAAK = {
  gras: 'w2',
  haag: '2',
  haagHoogte: 'laag',
  haagKanten: '2',
  borders: 'm2',
  terras: '3',
  blad: '2',
  gazon: '1',
  struik: '1'
};

// Een getal uit een invulveld. Komma of punt mag. Alles wat geen positief getal is, telt als 0.
export function getal(waarde) {
  const n = Number.parseFloat(String(waarde ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toonGetal(n) {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

export function euro(bedrag) {
  return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(bedrag);
}

function beurten(n) {
  return n + (n === 1 ? ' beurt' : ' beurten');
}

function bezoeken(n) {
  return n + (n === 1 ? ' bezoek' : ' bezoeken');
}

function tarief(waarde) {
  return typeof waarde === 'number' && Number.isFinite(waarde) && waarde > 0 ? waarde : null;
}

function som(lijst) {
  return lijst.reduce((a, b) => a + b, 0);
}

export function isPostcode(postcode) {
  return /^[0-9]{4}$/.test(String(postcode ?? '').trim());
}

export function zoekBuurt(postcode, buurten) {
  const pc = String(postcode ?? '').trim();
  if (!isPostcode(pc)) return null;
  return buurten.buurten.find((b) => b.postcodes.includes(pc)) ?? null;
}

function reeks(planning, dienst, keuze) {
  const r = planning[dienst] && planning[dienst][String(keuze)];
  return Array.isArray(r) && r.length === 12 ? r : new Array(12).fill(0);
}

// invoer = {
//   kies: { gras: true, ... },
//   hoeveel: { gras, haagLengte, borders, terras, blad, gazon, struikKlein, struikMidden, struikGroot },
//   vaak: zoals STANDAARD_VAAK,
//   buurtdag: true als de klant de buurtdag kiest,
//   postcode: '1701'
// }
export function berekenPlan(invoer, tarieven, planning, buurten) {
  const kies = invoer.kies || {};
  const hoeveel = invoer.hoeveel || {};
  const vaak = Object.assign({}, STANDAARD_VAAK, invoer.vaak || {});
  const buurt = buurten ? zoekBuurt(invoer.postcode, buurten) : null;

  const actief = WERKDIENSTEN.filter((d) => kies[d]);
  const plan = {};
  actief.forEach((d) => {
    plan[d] = reeks(planning, d, vaak[d]);
  });

  const bezoekenPerMaand = MAANDEN.map((_, i) => Math.max(0, ...actief.map((d) => plan[d][i])));
  const totaalBezoeken = som(bezoekenPerMaand);

  const lijnen = [];
  const voeg = (id, detail, hoeveelheid, prijs) => {
    lijnen.push({ id, naam: NAMEN[id] || id, detail, bedrag: prijs === null ? null : hoeveelheid * prijs });
  };

  if (kies.gras) {
    const b = som(plan.gras);
    const m2 = getal(hoeveel.gras);
    voeg('gras', toonGetal(m2) + ' m² × ' + beurten(b), m2 * b, tarief(tarieven.gras.prijs));
  }
  if (kies.haag) {
    const b = som(plan.haag);
    const meter = getal(hoeveel.haagLengte);
    const kanten = String(vaak.haagKanten) === '1' ? 1 : 2;
    const prijs = tarief(tarieven.haag[vaak.haagHoogte]);
    voeg('haag', toonGetal(meter) + ' m × ' + kanten + (kanten === 1 ? ' zijkant' : ' zijkanten') + ' × ' + beurten(b), meter * kanten * b, prijs);
  }
  ['borders', 'terras', 'blad', 'gazon'].forEach((d) => {
    if (!kies[d]) return;
    const b = som(plan[d]);
    const m2 = getal(hoeveel[d]);
    voeg(d, toonGetal(m2) + ' m² × ' + beurten(b), m2 * b, tarief(tarieven[d].prijs));
  });
  if (kies.struik) {
    const b = som(plan.struik);
    const aantallen = {
      klein: getal(hoeveel.struikKlein),
      midden: getal(hoeveel.struikMidden),
      groot: getal(hoeveel.struikGroot)
    };
    const stuks = aantallen.klein + aantallen.midden + aantallen.groot;
    let bedrag = 0;
    let compleet = true;
    Object.keys(aantallen).forEach((maat) => {
      if (aantallen[maat] === 0) return;
      const prijs = tarief(tarieven.struik[maat]);
      if (prijs === null) {
        compleet = false;
      } else {
        bedrag += aantallen[maat] * prijs * b;
      }
    });
    lijnen.push({
      id: 'struik',
      naam: NAMEN.struik,
      detail: toonGetal(stuks) + (stuks === 1 ? ' struik' : ' struiken') + ' × ' + beurten(b),
      bedrag: compleet ? bedrag : null
    });
  }
  if (kies.afvoer && totaalBezoeken > 0) {
    voeg('afvoer', bezoeken(totaalBezoeken), totaalBezoeken, tarief(tarieven.afvoer.prijs));
  }
  const verplaatsing = actief.length > 0 && (!buurt || !invoer.buurtdag);
  if (verplaatsing) {
    lijnen.push({
      id: 'verplaatsing',
      naam: 'Verplaatsing',
      detail: bezoeken(totaalBezoeken) + ' buiten de buurtdag',
      bedrag: tarief(tarieven.verplaatsing.prijs) === null ? null : totaalBezoeken * tarief(tarieven.verplaatsing.prijs)
    });
  }

  const compleet = lijnen.every((l) => l.bedrag !== null);
  const totaal = compleet ? som(lijnen.map((l) => l.bedrag)) : null;

  const maanden = MAANDEN.map((naam, i) => ({
    naam,
    kort: MAANDEN_KORT[i],
    bezoeken: bezoekenPerMaand[i],
    werk: actief.filter((d) => plan[d][i] > 0).map((d) => KORT[d])
  }));

  return {
    leeg: actief.length === 0,
    buurt,
    verplaatsing,
    lijnen,
    compleet,
    totaal,
    totaalBezoeken,
    maanden
  };
}

export function bedragTekst(bedrag) {
  return bedrag === null ? '[tarief]' : euro(bedrag);
}

export function totaalTekst(plan, deler = 1) {
  if (plan.leeg) return euro(0);
  return plan.totaal === null ? '€ [BEDRAG]' : euro(plan.totaal / deler);
}

export function niveau(aantalBezoeken) {
  if (aantalBezoeken >= 4) return '4';
  if (aantalBezoeken >= 2) return '2';
  if (aantalBezoeken >= 1) return '1';
  return '0';
}
