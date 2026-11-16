// Browsertests: de pagina's werken op computer en gsm, zonder fouten in de console en zonder horizontaal scrollen.
// Live (npm run test:live) vangt dit ook scripts op die Cloudflare zelf in de pagina zou zetten.
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  const fouten = [];
  page.on('pageerror', (fout) => fouten.push(fout.message));
  page.on('console', (bericht) => {
    if (bericht.type() === 'error' && !bericht.text().includes('404')) fouten.push(bericht.text());
  });
  testInfo.fouten = fouten;
});

test.afterEach(async ({}, testInfo) => {
  expect(testInfo.fouten, 'fouten in de console').toEqual([]);
});

async function geenHorizontaalScrollen(page) {
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(breed, 'pagina is breder dan het scherm').toBeLessThanOrEqual(1);
}

for (const pad of ['/', '/prijs/', '/afspraak/', '/voorwaarden/', '/privacy/']) {
  test('pagina laadt: ' + pad, async ({ page }) => {
    const antwoord = await page.goto(pad);
    expect(antwoord.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    await geenHorizontaalScrollen(page);
  });
}

test('onbekende pagina geeft 404', async ({ page }) => {
  const antwoord = await page.goto('/bestaat-niet');
  expect(antwoord.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Deze pagina bestaat niet');
});

test('startpagina: diensten en voor en na', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dienst-gras')).toBeVisible();
  await expect(page.locator('#dienst-haag')).toBeHidden();
  await page.getByRole('button', { name: 'Hagen snoeien' }).click();
  await expect(page.locator('#dienst-haag')).toBeVisible();
  await expect(page.locator('#dienst-gras')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Hagen snoeien' })).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#voorna-schuif').fill('20');
  await expect(page.locator('#voorna-voor')).toHaveAttribute('style', /inset\(0px 80% 0px 0px\)|inset\(0 80% 0 0\)/);
});

test('prijstool: van postcode tot plan', async ({ page }) => {
  await page.goto('/prijs/');
  await page.getByLabel('Postcode').fill('1701');
  await expect(page.locator('#buurt-ok')).toContainText('Dilbeek');
  await expect(page.locator('#buurt-ok')).toContainText('maandag');
  await expect(page.locator('#zij-buurt')).toHaveText('Buurtdag: maandag, Dilbeek');

  await page.locator('#volgende').click();
  await page.locator('[data-kies="gras"]').click();
  await page.locator('[data-kies="haag"]').click();
  await expect(page.locator('[data-kies="gras"]')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#volgende').click();
  await page.getByLabel('Oppervlakte gazon in m²').fill('150');
  await page.getByLabel('Lengte haag in meter').fill('20');
  await expect(page.locator('[data-kaart="borders"]')).toBeHidden();

  await page.locator('#volgende').click();
  await expect(page.locator('#stap4-titel')).toBeVisible();
  await expect(page.locator('#totaal-jaar')).toHaveText('€ [BEDRAG]');
  await expect(page.locator('#totaal-bezoeken')).toHaveText('14');
  await expect(page.locator('#maanden .maand')).toHaveCount(12);
  await expect(page.locator('#maanden .maand').nth(5)).toContainText('2 bezoeken');
  await expect(page.locator('#regels')).toContainText('150 m² × 14 beurten');
  await expect(page.locator('#regels')).toContainText('20 m × 2 zijkanten × 2 beurten');
  await expect(page.locator('[data-concept="tarieven"]')).toBeVisible();
  await expect(page.locator('#samenvatting')).toBeHidden();
  await geenHorizontaalScrollen(page);
});

test('prijstool: postcode buiten de buurten', async ({ page }) => {
  await page.goto('/prijs/');
  await page.getByLabel('Postcode').fill('9000');
  await expect(page.locator('#buurt-buiten')).toBeVisible();
  await expect(page.locator('#buurt-ok')).toBeHidden();
});

test('afspraak: plaatsbezoek kiezen toont eerlijk dat online boeken nog niet werkt', async ({ page }) => {
  await page.goto('/prijs/');
  await page.getByLabel('Postcode').fill('1702');
  await page.goto('/afspraak/');
  await expect(page.locator('.dag--buurt .dag__tag')).toHaveText('Jouw buurtdag');
  await page.locator('.moment').first().click();
  await expect(page.locator('#form-bezoek')).toBeVisible();
  await expect(page.locator('#keuze-label')).toContainText(' om ');
  await page.locator('#b-naam').fill('Test');
  await page.locator('#b-tel').fill('0400000000');
  await page.locator('#b-straat').fill('Teststraat 1');
  await page.locator('#b-gemeente').fill('1702 Groot-Bijgaarden');
  await page.getByRole('button', { name: 'Bevestig je plaatsbezoek' }).click();
  await expect(page.locator('#bezoek-niet-actief')).toBeVisible();
  await expect(page.locator('#bezoek-niet-actief')).toContainText('werkt nog niet');
});

test('afspraak: werk aanvragen met het plan uit de prijstool', async ({ page }) => {
  await page.goto('/prijs/');
  await page.getByLabel('Postcode').fill('1740');
  await page.locator('#volgende').click();
  await page.locator('[data-kies="gras"]').click();
  await page.goto('/afspraak/#werk');
  await expect(page.locator('#paneel-werk')).toBeVisible();
  await expect(page.locator('#plan-chips')).toContainText('Gras maaien, om de twee weken');
  await expect(page.locator('#wens-buurt')).toHaveText('Op mijn buurtdag, dinsdag');
  await page.getByRole('button', { name: 'Andere dagen' }).click();
  await expect(page.locator('#dagkeuze')).toBeVisible();
  await page.locator('#w-naam').fill('Test');
  await page.locator('#w-tel').fill('0400000000');
  await page.locator('#w-straat').fill('Teststraat 1');
  await page.getByRole('button', { name: 'Aanvraag versturen' }).click();
  await expect(page.locator('#werk-niet-actief')).toBeVisible();
});

test('afspraak zonder plan verwijst naar de prijstool', async ({ page }) => {
  await page.goto('/afspraak/#werk');
  await expect(page.locator('#plan-leeg')).toBeVisible();
  await expect(page.locator('#wens-buurt')).toBeHidden();
});
