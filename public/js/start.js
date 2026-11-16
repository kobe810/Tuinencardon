// Startpagina: diensten tonen en de schuif voor en na.

function diensten() {
  const tegels = Array.from(document.querySelectorAll('.tegel[data-dienst]'));
  const kies = (id) => {
    tegels.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.dienst === id)));
    document.querySelectorAll('.dienstdetail').forEach((d) => {
      d.classList.toggle('is-actief', d.id === 'dienst-' + id);
    });
    // Op een gsm staat de uitleg onder de tegels: schuif ze in beeld als ze buiten het scherm valt.
    const detail = document.getElementById('dienst-' + id);
    if (detail && detail.getBoundingClientRect().bottom > window.innerHeight) {
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };
  tegels.forEach((t) => t.addEventListener('click', () => kies(t.dataset.dienst)));
}

function zetSchuif(waarde) {
  const voor = document.getElementById('voorna-voor');
  const lijn = document.getElementById('voorna-lijn');
  voor.style.clipPath = 'inset(0 ' + (100 - waarde) + '% 0 0)';
  lijn.style.left = waarde + '%';
}

function maakFoto(src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  return img;
}

function toonWerf(werf) {
  const voor = document.getElementById('voorna-voor');
  const na = document.getElementById('voorna-na');
  voor.querySelector('img')?.remove();
  na.querySelector('img')?.remove();
  voor.prepend(maakFoto(werf.voor, 'Voor: ' + werf.wat + ' in ' + werf.gemeente));
  na.prepend(maakFoto(werf.na, 'Na: ' + werf.wat + ' in ' + werf.gemeente));
  document.getElementById('voorna-uitleg').textContent = werf.gemeente + ', ' + werf.wat;
}

async function voorEnNa() {
  const schuif = document.getElementById('voorna-schuif');
  schuif.addEventListener('input', () => zetSchuif(Number(schuif.value)));
  zetSchuif(Number(schuif.value));

  let werven = [];
  try {
    const antwoord = await fetch('/data/fotos.json');
    if (antwoord.ok) werven = (await antwoord.json()).werven || [];
  } catch (fout) {
    werven = [];
  }
  if (werven.length === 0) return;

  const keuzes = document.getElementById('werven');
  const knoppen = werven.map((werf, i) => {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'segment';
    knop.textContent = werf.gemeente;
    knop.setAttribute('aria-pressed', String(i === 0));
    knop.addEventListener('click', () => {
      knoppen.forEach((k) => k.setAttribute('aria-pressed', String(k === knop)));
      schuif.value = '50';
      zetSchuif(50);
      toonWerf(werf);
    });
    keuzes.append(knop);
    return knop;
  });
  keuzes.hidden = werven.length < 2;
  toonWerf(werven[0]);
}

diensten();
voorEnNa();
