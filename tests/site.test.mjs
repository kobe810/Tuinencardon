// Tests op de bestanden in public/: opbouw van de pagina's, links, gegevens, schrijfstijl en geen geheimen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const MAP = resolve(new URL('../public', import.meta.url).pathname);

function alleBestanden(map) {
  return readdirSync(map).flatMap((naam) => {
    const pad = join(map, naam);
    return statSync(pad).isDirectory() ? alleBestanden(pad) : [pad];
  });
}

const BESTANDEN = alleBestanden(MAP);
const PAGINAS = BESTANDEN.filter((p) => p.endsWith('.html'));
const TEKSTBESTANDEN = BESTANDEN.filter((p) => /\.(html|css|js|json|txt|svg)$|_headers$/.test(p));
const lees = (pad) => readFileSync(pad, 'utf8');
const naam = (pad) => relative(MAP, pad);

// Zichtbare tekst van een pagina, zonder scripts, stijl en tags.
function tekst(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
}

test('er zijn pagina\'s', () => {
  for (const pagina of ['index.html', 'prijs/index.html', 'afspraak/index.html', 'voorwaarden/index.html', 'privacy/index.html', '404.html']) {
    assert.ok(existsSync(join(MAP, pagina)), pagina);
  }
});

test('elke pagina heeft de basis in orde', () => {
  for (const pad of PAGINAS) {
    const html = lees(pad);
    assert.match(html, /<html lang="nl-BE">/, naam(pad) + ': taal');
    assert.match(html, /<title>[^<]+<\/title>/, naam(pad) + ': titel');
    assert.match(html, /<meta name="viewport"/, naam(pad) + ': viewport');
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, naam(pad) + ': precies één h1');
  }
});

test('geen inline stijl of inline scripts, zodat het beveiligingsbeleid (CSP) streng kan blijven', () => {
  for (const pad of PAGINAS) {
    const html = lees(pad);
    assert.doesNotMatch(html, /\sstyle="/, naam(pad) + ': style-attribuut');
    assert.doesNotMatch(html, /<style[\s>]/, naam(pad) + ': style-element');
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, naam(pad) + ': inline script');
    assert.doesNotMatch(html, /\son[a-z]+="/, naam(pad) + ': inline event');
  }
});

test('geen diensten van derden: geen tracking, geen externe lettertypes of scripts', () => {
  for (const pad of TEKSTBESTANDEN) {
    const inhoud = lees(pad);
    assert.doesNotMatch(inhoud, /googletagmanager|google-analytics|fonts\.googleapis|fonts\.gstatic|facebook\.net|hotjar/i, naam(pad));
  }
  for (const pad of PAGINAS) {
    const html = lees(pad);
    assert.doesNotMatch(html, /<(script|link|img|iframe)[^>]+(src|href)="(https?:)?\/\//i, naam(pad) + ': externe bron');
  }
});

test('externe links gaan alleen naar bekende plaatsen', () => {
  const toegestaan = ['https://wa.me/', 'https://www.gegevensbeschermingsautoriteit.be/'];
  for (const pad of PAGINAS) {
    for (const [, href] of lees(pad).matchAll(/<a[^>]+href="(https?:[^"]+)"/g)) {
      assert.ok(toegestaan.some((t) => href.startsWith(t)), naam(pad) + ': ' + href);
    }
  }
});

test('interne links en ankers bestaan', () => {
  for (const pad of PAGINAS) {
    const html = lees(pad);
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    for (const [, href] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:)/.test(href)) continue;
      if (href.startsWith('#')) {
        assert.ok(ids.has(href.slice(1)), naam(pad) + ': anker ' + href);
        continue;
      }
      const zonderAnker = href.split('#')[0].split('?')[0];
      const doel = zonderAnker.endsWith('/') ? join(MAP, zonderAnker, 'index.html') : join(MAP, zonderAnker);
      assert.ok(existsSync(doel), naam(pad) + ': ' + href);
    }
  }
});

test('elk invulveld heeft een label', () => {
  for (const pad of PAGINAS) {
    const html = lees(pad);
    for (const [veld, id] of html.matchAll(/<(?:input|select|textarea)[^>]*\sid="([^"]+)"[^>]*>/g)) {
      const heeftLabel = html.includes('for="' + id + '"') || /aria-label="/.test(veld);
      assert.ok(heeftLabel, naam(pad) + ': ' + id);
    }
  }
});

test('schrijfstijl: geen gedachtestreepjes of streepjes als scheidingsteken', () => {
  for (const pad of PAGINAS) {
    const zichtbaar = tekst(lees(pad));
    assert.doesNotMatch(zichtbaar, /[–—]/, naam(pad) + ': gedachtestreepje');
    assert.doesNotMatch(zichtbaar, /\s-\s/, naam(pad) + ': streepje als scheidingsteken');
  }
  for (const pad of BESTANDEN.filter((p) => p.endsWith('.json'))) {
    assert.doesNotMatch(lees(pad), /[–—]|\s-\s/, naam(pad));
  }
});

test('buurten: geldige postcodes, nergens dubbel', () => {
  const { buurten } = JSON.parse(lees(join(MAP, 'data/buurten.json')));
  const gezien = new Set();
  for (const buurt of buurten) {
    for (const pc of buurt.postcodes) {
      assert.match(pc, /^[0-9]{4}$/, buurt.naam + ': ' + pc);
      assert.ok(!gezien.has(pc), 'dubbele postcode ' + pc);
      gezien.add(pc);
    }
  }
});

test('de buurtdagen op de startpagina komen overeen met buurten.json', () => {
  const html = lees(join(MAP, 'index.html'));
  const { buurten, flexdag } = JSON.parse(lees(join(MAP, 'data/buurten.json')));
  for (const buurt of [...buurten, { ...flexdag, gemeenten: [] }]) {
    const blok = html.match(new RegExp('data-buurt-dag="' + buurt.dag + '">([\\s\\S]*?)</div>'));
    assert.ok(blok, 'blok voor ' + buurt.dag);
    assert.ok(blok[1].includes(buurt.naam), buurt.dag + ': ' + buurt.naam);
    for (const gemeente of buurt.gemeenten) {
      assert.ok(blok[1].includes(gemeente), buurt.dag + ': ' + gemeente);
    }
  }
});

test('tarieven zijn leeg of een positief getal', () => {
  const tarieven = JSON.parse(lees(join(MAP, 'data/tarieven.json')));
  const waarden = [];
  for (const [sleutel, waarde] of Object.entries(tarieven)) {
    if (sleutel.startsWith('_') || sleutel === 'nagekeken') continue;
    for (const [k, v] of Object.entries(waarde)) {
      if (k !== 'eenheid') waarden.push([sleutel + '.' + k, v]);
    }
  }
  assert.ok(waarden.length >= 13);
  for (const [sleutel, v] of waarden) {
    assert.ok(v === null || (typeof v === 'number' && v > 0), sleutel);
  }
});

test('zolang iets niet nagekeken is, staat de melding op de site', () => {
  const tarieven = JSON.parse(lees(join(MAP, 'data/tarieven.json')));
  const buurten = JSON.parse(lees(join(MAP, 'data/buurten.json')));
  const prijs = lees(join(MAP, 'prijs/index.html'));
  const start = lees(join(MAP, 'index.html'));
  if (!tarieven.nagekeken) assert.match(prijs, /data-concept="tarieven">[^<]*nog niet nagekeken/);
  if (!buurten.nagekeken) {
    assert.match(prijs, /data-concept="buurten">[^<]*nog niet nagekeken/);
    assert.match(start, /data-concept="buurten">[^<]*nog niet nagekeken/);
  }
});

test('geen geheimen in public/', () => {
  const patronen = [
    /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\./,
    /service_role/i,
    /sk_(live|test)_[A-Za-z0-9]/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /AKIA[0-9A-Z]{16}/,
    /(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/i
  ];
  for (const pad of TEKSTBESTANDEN) {
    const inhoud = lees(pad);
    for (const patroon of patronen) {
      assert.doesNotMatch(inhoud, patroon, naam(pad));
    }
  }
});

test('overzicht van plaatshouders die nog ingevuld moeten worden', (t) => {
  const teller = new Map();
  for (const pad of PAGINAS) {
    for (const [plaatshouder] of tekst(lees(pad)).matchAll(/\[[A-Z][^\][]*\]/g)) {
      teller.set(plaatshouder, (teller.get(plaatshouder) || 0) + 1);
    }
  }
  for (const [plaatshouder, aantal] of [...teller].sort()) {
    t.diagnostic(plaatshouder + ' (' + aantal + ' keer)');
  }
  assert.ok(true);
});
