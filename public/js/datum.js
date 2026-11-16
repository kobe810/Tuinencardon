// Datumhulp zonder pagina, zodat de tests hem rechtstreeks kunnen gebruiken.

// De eerstvolgende maandag na vandaag. Is het vandaag maandag, dan is het de maandag van volgende week.
export function volgendeMaandag(vandaag) {
  const d = new Date(vandaag);
  d.setHours(0, 0, 0, 0);
  const tot = ((8 - d.getDay()) % 7) || 7;
  d.setDate(d.getDate() + tot);
  return d;
}
