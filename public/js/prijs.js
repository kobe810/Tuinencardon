// Prijstool: vier stappen, een samenvatting opzij en een plan per maand.
import { berekenPlan, bedragTekst, totaalTekst, niveau, STANDAARD_VAAK, NAMEN } from './rekenen.js';

const OPSLAG_TOOL = 'tuinman-prijs';
const OPSLAG_PLAN = 'tuinman-plan';

const VAAK_TEKST = {
  gras: { w1: 'wekelijks', w2: 'om de twee weken' },
  haag: { 1: '1 keer per jaar', 2: '2 keer per jaar' },
  borders: { m1: 'maandelijks', m2: 'om de twee maanden' },
  terras: { 2: '2 keer per jaar', 3: '3 keer per jaar', 4: '4 keer per jaar' },
  blad: { 1: '1 keer in de herfst', 2: '2 keer in de herfst', 3: '3 keer in de herfst' },
  gazon: { 1: 'in het voorjaar', 2: 'voorjaar en najaar' },
  struik: { 1: '1 keer per jaar', 2: '2 keer per jaar' }
};

let tarieven;
let planning;
let buurten;

const staat = laadStaat();

function laadStaat() {
  const leeg = { stap: 1, postcode: '', dag: 'buurt', kies: {}, hoeveel: {}, vaak: Object.assign({}, STANDAARD_VAAK) };
  try {
    const bewaard = JSON.parse(sessionStorage.getItem(OPSLAG_TOOL) || 'null');
    if (bewaard && typeof bewaard === 'object') {
      return Object.assign(leeg, bewaard, { vaak: Object.assign({}, STANDAARD_VAAK, bewaard.vaak || {}) });
    }
  } catch (fout) {
    // Geen opslag beschikbaar: de tool werkt gewoon zonder.
  }
  return leeg;
}

function bewaar(plan) {
  const samenvatting = {
    diensten: Object.keys(NAMEN)
      .filter((d) => staat.kies[d])
      .map((d) => (VAAK_TEKST[d] ? NAMEN[d] + ', ' + VAAK_TEKST[d][staat.vaak[d]] : NAMEN[d])),
    buurt: plan.buurt ? { dag: plan.buurt.dag, naam: plan.buurt.naam } : null,
    buurtdag: staat.dag === 'buurt',
    totaal: totaalTekst(plan)
  };
  try {
    sessionStorage.setItem(OPSLAG_TOOL, JSON.stringify(staat));
    sessionStorage.setItem(OPSLAG_PLAN, JSON.stringify(samenvatting));
  } catch (fout) {
    // Zonder opslag toont de afspraakpagina gewoon geen plan.
  }
}

const $ = (id) => document.getElementById(id);

function gaNaar(stap) {
  staat.stap = stap;
  toon();
  const nav = document.querySelector('.stappen');
  if (nav.getBoundingClientRect().top < 0) nav.scrollIntoView({ block: 'start' });
  const titel = document.querySelector('.stap[data-stap="' + stap + '"] h2');
  if (titel) {
    titel.setAttribute('tabindex', '-1');
    titel.focus({ preventScroll: true });
  }
}

function koppel() {
  const postcode = $('postcode');
  postcode.value = staat.postcode;
  postcode.addEventListener('input', () => {
    const schoon = postcode.value.replace(/[^0-9]/g, '').slice(0, 4);
    if (schoon !== postcode.value) postcode.value = schoon;
    staat.postcode = schoon;
    toon();
  });

  document.querySelectorAll('.segment[data-veld]').forEach((knop) => {
    knop.addEventListener('click', () => {
      if (knop.dataset.veld === 'dag') {
        staat.dag = knop.dataset.waarde;
      } else {
        staat.vaak[knop.dataset.veld] = knop.dataset.waarde;
      }
      toon();
    });
  });

  document.querySelectorAll('[data-kies]').forEach((tegel) => {
    tegel.addEventListener('click', () => {
      staat.kies[tegel.dataset.kies] = !staat.kies[tegel.dataset.kies];
      toon();
    });
  });

  document.querySelectorAll('[data-hoeveel]').forEach((veld) => {
    veld.value = staat.hoeveel[veld.dataset.hoeveel] || '';
    veld.addEventListener('input', () => {
      staat.hoeveel[veld.dataset.hoeveel] = veld.value;
      toon();
    });
  });

  document.querySelectorAll('[data-naar]').forEach((knop) => {
    knop.addEventListener('click', () => gaNaar(Number(knop.dataset.naar)));
  });
  $('vorige').addEventListener('click', () => gaNaar(Math.max(1, staat.stap - 1)));
  $('volgende').addEventListener('click', () => gaNaar(Math.min(4, staat.stap + 1)));
  $('afdrukken').addEventListener('click', () => window.print());
}

function maakRegel(lijn, klein) {
  const regel = document.createElement('div');
  regel.className = klein ? 'regel regel--klein' : 'regel';
  const links = document.createElement('div');
  links.className = 'regel__links';
  const naam = document.createElement('span');
  naam.className = klein ? '' : 'label';
  naam.textContent = lijn.naam;
  links.append(naam);
  if (!klein) {
    const detail = document.createElement('span');
    detail.className = 'regel__detail';
    detail.textContent = lijn.detail;
    links.append(detail);
  }
  const bedrag = document.createElement('span');
  bedrag.className = 'regel__bedrag';
  bedrag.textContent = bedragTekst(lijn.bedrag);
  regel.append(links, bedrag);
  return regel;
}

function maakMaand(maand) {
  const vak = document.createElement('div');
  vak.className = 'maand';
  vak.dataset.niveau = niveau(maand.bezoeken);
  const naam = document.createElement('span');
  naam.className = 'maand__naam';
  naam.textContent = maand.kort.charAt(0).toUpperCase() + maand.kort.slice(1);
  naam.title = maand.naam;
  const aantal = document.createElement('span');
  aantal.className = 'maand__aantal';
  aantal.textContent = maand.bezoeken === 0 ? 'Rust' : maand.bezoeken + (maand.bezoeken === 1 ? ' bezoek' : ' bezoeken');
  const werk = document.createElement('span');
  werk.className = 'maand__werk';
  werk.textContent = maand.werk.join(', ');
  vak.append(naam, aantal, werk);
  return vak;
}

function toon() {
  const plan = berekenPlan(
    { kies: staat.kies, hoeveel: staat.hoeveel, vaak: staat.vaak, buurtdag: staat.dag === 'buurt', postcode: staat.postcode },
    tarieven,
    planning,
    buurten
  );

  document.querySelectorAll('.stap[data-stap]').forEach((sectie) => {
    sectie.hidden = Number(sectie.dataset.stap) !== staat.stap;
  });
  document.querySelectorAll('.stapknop').forEach((knop) => {
    if (Number(knop.dataset.naar) === staat.stap) {
      knop.setAttribute('aria-current', 'step');
    } else {
      knop.removeAttribute('aria-current');
    }
  });
  $('vorige').hidden = staat.stap === 1;
  $('volgende').hidden = staat.stap === 4;
  $('volgende-tekst').textContent = staat.stap === 3 ? 'Toon mijn plan' : 'Volgende stap';
  $('samenvatting').hidden = staat.stap === 4;

  const postcodeIngevuld = /^[0-9]{4}$/.test(staat.postcode);
  $('buurt-ok').hidden = !plan.buurt;
  $('buurt-buiten').hidden = !postcodeIngevuld || Boolean(plan.buurt);
  if (plan.buurt) {
    $('buurt-naam').textContent = plan.buurt.naam;
    $('buurt-dag').textContent = plan.buurt.dag;
  }
  if (!plan.buurt) {
    $('dag-uitleg').textContent = 'Buiten de vaste buurten reken ik een verplaatsingskost per bezoek.';
  } else if (staat.dag === 'buurt') {
    $('dag-uitleg').textContent = 'Op de buurtdag betaal je geen verplaatsingskost.';
  } else {
    $('dag-uitleg').textContent = 'Buiten de buurtdag reken ik een verplaatsingskost per bezoek.';
  }

  document.querySelectorAll('.segment[data-veld]').forEach((knop) => {
    const huidig = knop.dataset.veld === 'dag' ? staat.dag : String(staat.vaak[knop.dataset.veld]);
    knop.setAttribute('aria-pressed', String(huidig === knop.dataset.waarde));
  });
  document.querySelectorAll('[data-kies]').forEach((tegel) => {
    tegel.setAttribute('aria-pressed', String(Boolean(staat.kies[tegel.dataset.kies])));
  });
  let gekozen = 0;
  document.querySelectorAll('[data-kaart]').forEach((kaart) => {
    const aan = Boolean(staat.kies[kaart.dataset.kaart]);
    kaart.hidden = !aan;
    if (aan) gekozen += 1;
  });
  $('geen-diensten').hidden = gekozen > 0;

  const jaar = totaalTekst(plan);
  $('totaal-jaar').textContent = jaar;
  $('totaal-maand').textContent = totaalTekst(plan, 12);
  $('totaal-bezoeken').textContent = String(plan.totaalBezoeken);
  $('regels-totaal').textContent = jaar;
  $('regels').replaceChildren(...plan.lijnen.map((l) => maakRegel(l, false)));
  $('regels-kaart').hidden = plan.lijnen.length === 0;
  $('maanden').replaceChildren(...plan.maanden.map(maakMaand));

  $('zij-buurt').textContent = plan.buurt
    ? 'Buurtdag: ' + plan.buurt.dag + ', ' + plan.buurt.naam
    : (postcodeIngevuld ? 'Buiten de vaste buurten' : 'Vul je postcode in');
  $('zij-leeg').hidden = !plan.leeg;
  $('zij-regels').replaceChildren(...plan.lijnen.map((l) => maakRegel(l, true)));
  $('zij-totaal').textContent = jaar;

  document.querySelectorAll('[data-concept="tarieven"]').forEach((b) => {
    b.hidden = Boolean(tarieven.nagekeken && planning.nagekeken);
  });
  document.querySelectorAll('[data-concept="buurten"]').forEach((b) => {
    b.hidden = Boolean(buurten.nagekeken);
  });

  bewaar(plan);
}

async function laadJson(naam) {
  const antwoord = await fetch('/data/' + naam + '.json');
  if (!antwoord.ok) throw new Error('Kon ' + naam + ' niet laden');
  return antwoord.json();
}

async function start() {
  try {
    [tarieven, planning, buurten] = await Promise.all([laadJson('tarieven'), laadJson('planning'), laadJson('buurten')]);
  } catch (fout) {
    const melding = document.createElement('div');
    melding.className = 'melding melding--geel';
    melding.textContent = 'De prijstool kon niet laden. Probeer het later opnieuw, of bel of mail gerust.';
    document.querySelector('.stappen').before(melding);
    return;
  }
  koppel();
  toon();
}

start();
