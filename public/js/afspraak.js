// Afspraakpagina: een plaatsbezoek kiezen of werk aanvragen.
// Online versturen werkt pas als de server er is. Tot dan zegt de pagina dat eerlijk en verwijst ze naar telefoon of mail.
import { volgendeMaandag } from './datum.js';

const WEEKDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag'];
const $ = (id) => document.getElementById(id);

const staat = {
  week: 0,
  moment: null,
  wens: 'buurt',
  dagen: new Set()
};

let weken = [];
let plan = null;

function leesPlan() {
  try {
    return JSON.parse(sessionStorage.getItem('tuinman-plan') || 'null');
  } catch (fout) {
    return null;
  }
}

function maakWeken(momenten, vandaag) {
  const start = volgendeMaandag(vandaag);
  const datum = new Intl.DateTimeFormat('nl-BE', { day: 'numeric', month: 'long' });
  const lijst = [];
  for (let w = 0; w < (momenten.weken || 2); w += 1) {
    const dagen = WEEKDAGEN.map((naam, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + i);
      const sleutel = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      return {
        naam,
        datum: datum.format(d),
        tijden: (momenten.perDag[naam] || []).map((tijd) => ({ id: sleutel + 'T' + tijd, tijd }))
      };
    });
    lijst.push({ label: dagen[0].datum, dagen });
  }
  return lijst;
}

function hoofdletter(tekst) {
  return tekst.charAt(0).toUpperCase() + tekst.slice(1);
}

function momentLabel(id) {
  for (const week of weken) {
    for (const dag of week.dagen) {
      const t = dag.tijden.find((x) => x.id === id);
      if (t) return dag.naam + ' ' + dag.datum + ' om ' + t.tijd;
    }
  }
  return '';
}

function toonDagen() {
  const week = weken[staat.week];
  $('week-label').textContent = 'Week van ' + week.label;
  $('week-vorige').disabled = staat.week === 0;
  $('week-volgende').disabled = staat.week === weken.length - 1;
  const buurtdag = plan && plan.buurt ? plan.buurt.dag : null;

  const vakken = week.dagen.map((dag) => {
    const vak = document.createElement('div');
    vak.className = dag.naam === buurtdag ? 'dag dag--buurt' : 'dag';
    const kop = document.createElement('div');
    const naam = document.createElement('div');
    naam.className = 'dag__naam';
    naam.textContent = hoofdletter(dag.naam);
    const datum = document.createElement('div');
    datum.className = 'dag__datum';
    datum.textContent = dag.datum;
    kop.append(naam, datum);
    vak.append(kop);
    if (dag.naam === buurtdag) {
      const tag = document.createElement('span');
      tag.className = 'dag__tag';
      tag.textContent = 'Jouw buurtdag';
      vak.append(tag);
    }
    if (dag.tijden.length === 0) {
      const vol = document.createElement('span');
      vol.className = 'zacht';
      vol.textContent = 'Volzet';
      vak.append(vol);
    }
    dag.tijden.forEach((t) => {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'moment';
      knop.textContent = t.tijd;
      knop.setAttribute('aria-label', hoofdletter(dag.naam) + ' ' + dag.datum + ' om ' + t.tijd);
      knop.setAttribute('aria-pressed', String(staat.moment === t.id));
      knop.addEventListener('click', () => kiesMoment(t.id));
      vak.append(knop);
    });
    return vak;
  });
  $('dagen').replaceChildren(...vakken);
}

function kiesMoment(id) {
  staat.moment = id;
  $('bezoek-niet-actief').hidden = true;
  toonDagen();
  const formulier = $('form-bezoek');
  formulier.hidden = false;
  $('keuze-label').textContent = momentLabel(id);
  $('b-naam').focus({ preventScroll: true });
  formulier.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toonTab(tab) {
  document.querySelectorAll('[data-tab]').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(knop.dataset.tab === tab));
  });
  $('paneel-bezoek').hidden = tab !== 'bezoek';
  $('paneel-werk').hidden = tab !== 'werk';
}

function toonWens() {
  document.querySelectorAll('[data-wens]').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(knop.dataset.wens === staat.wens));
  });
  $('dagkeuze').hidden = staat.wens !== 'ander';
  document.querySelectorAll('[data-dag]').forEach((knop) => {
    knop.setAttribute('aria-pressed', String(staat.dagen.has(knop.dataset.dag)));
  });
}

function toonPlan() {
  const heeftPlan = Boolean(plan && plan.diensten && plan.diensten.length > 0);
  $('plan-vol').hidden = !heeftPlan;
  $('plan-leeg').hidden = heeftPlan;
  if (heeftPlan) {
    $('plan-chips').replaceChildren(...plan.diensten.map((tekst) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = tekst;
      return chip;
    }));
    $('plan-totaal').textContent = 'Richtprijs: ' + plan.totaal + ' per jaar';
  }
  const buurtKnop = $('wens-buurt');
  if (plan && plan.buurt) {
    buurtKnop.hidden = false;
    buurtKnop.textContent = 'Op mijn buurtdag, ' + plan.buurt.dag;
    staat.wens = plan.buurtdag === false ? 'ander' : 'buurt';
  } else {
    buurtKnop.hidden = true;
    staat.wens = 'ander';
  }
}

function koppel() {
  document.querySelectorAll('[data-tab]').forEach((knop) => {
    knop.addEventListener('click', () => {
      toonTab(knop.dataset.tab);
      history.replaceState(null, '', knop.dataset.tab === 'werk' ? '#werk' : '#bezoek');
    });
  });
  $('week-vorige').addEventListener('click', () => {
    staat.week = Math.max(0, staat.week - 1);
    toonDagen();
  });
  $('week-volgende').addEventListener('click', () => {
    staat.week = Math.min(weken.length - 1, staat.week + 1);
    toonDagen();
  });
  document.querySelectorAll('[data-wens]').forEach((knop) => {
    knop.addEventListener('click', () => {
      staat.wens = knop.dataset.wens;
      toonWens();
    });
  });
  document.querySelectorAll('[data-dag]').forEach((knop) => {
    knop.addEventListener('click', () => {
      const dag = knop.dataset.dag;
      if (staat.dagen.has(dag)) {
        staat.dagen.delete(dag);
      } else {
        staat.dagen.add(dag);
      }
      toonWens();
    });
  });
  $('form-bezoek').addEventListener('submit', (e) => {
    e.preventDefault();
    $('bezoek-moment').textContent = momentLabel(staat.moment);
    const melding = $('bezoek-niet-actief');
    melding.hidden = false;
    melding.focus();
  });
  $('form-werk').addEventListener('submit', (e) => {
    e.preventDefault();
    const melding = $('werk-niet-actief');
    melding.hidden = false;
    melding.focus();
  });
}

async function start() {
  plan = leesPlan();
  toonTab(location.hash === '#werk' ? 'werk' : 'bezoek');
  toonPlan();
  toonWens();
  koppel();
  try {
    const antwoord = await fetch('/data/momenten.json');
    if (!antwoord.ok) throw new Error('momenten');
    const momenten = await antwoord.json();
    document.querySelectorAll('[data-concept="momenten"]').forEach((b) => {
      b.hidden = !momenten.voorbeeld;
    });
    weken = maakWeken(momenten, new Date());
    toonDagen();
  } catch (fout) {
    const melding = document.createElement('p');
    melding.className = 'zacht';
    melding.textContent = 'De vrije momenten konden niet laden. Bel of mail gerust voor een afspraak.';
    $('dagen').replaceChildren(melding);
  }
}

start();
