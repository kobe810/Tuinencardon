// Kleine lokale server voor public/, voor de browsertests. Geen afhankelijkheden.
// Hij stuurt ook de headers uit public/_headers mee, zodat de tests fouten tegen het beveiligingsbeleid (CSP) zien.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const MAP = resolve(new URL('../public', import.meta.url).pathname);
const POORT = Number(process.env.PORT || 4173);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

// Alleen het blok voor /* uit _headers: dat geldt voor elke pagina.
function leesHeaders() {
  const headers = {};
  let actief = false;
  for (const regel of readFileSync(join(MAP, '_headers'), 'utf8').split('\n')) {
    if (!regel.trim() || regel.trim().startsWith('#')) continue;
    if (!/^\s/.test(regel)) {
      actief = regel.trim() === '/*';
      continue;
    }
    if (actief) {
      const plek = regel.indexOf(':');
      headers[regel.slice(0, plek).trim()] = regel.slice(plek + 1).trim();
    }
  }
  return headers;
}

const VASTE_HEADERS = leesHeaders();

async function bestand(pad) {
  const info = await stat(pad).catch(() => null);
  if (info && info.isDirectory()) return bestand(join(pad, 'index.html'));
  return info && info.isFile() ? pad : null;
}

createServer(async (vraag, antwoord) => {
  const url = new URL(vraag.url, 'http://localhost');
  const pad = normalize(join(MAP, decodeURIComponent(url.pathname)));
  if (!pad.startsWith(MAP)) {
    antwoord.writeHead(400).end();
    return;
  }
  const gevonden = await bestand(pad);
  if (!gevonden) {
    antwoord.writeHead(404, { ...VASTE_HEADERS, 'Content-Type': TYPES['.html'] });
    antwoord.end(await readFile(join(MAP, '404.html')));
    return;
  }
  antwoord.writeHead(200, { ...VASTE_HEADERS, 'Content-Type': TYPES[extname(gevonden)] || 'application/octet-stream' });
  antwoord.end(await readFile(gevonden));
}).listen(POORT, () => {
  console.log('Site draait op http://localhost:' + POORT);
});
