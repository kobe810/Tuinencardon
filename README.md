# Tuinman (werknaam Tuinen Cardon)

Website voor een zelfstandige tuinman in Dilbeek. Tijdelijk op tuinman.denkwerf.com, later op een eigen domein.

## Wat erin zit

- `public/index.html`: startpagina met diensten, buurtdagen, voor en na, over mij en contact
- `public/prijs/`: prijstool in vier stappen, met een richtprijs per jaar en een plan per maand
- `public/afspraak/`: plaatsbezoek kiezen of werk aanvragen
- `public/voorwaarden/` en `public/privacy/`: concepten, nog na te kijken
- `public/data/`: de gegevens die je zonder code aanpast
  - `tarieven.json`: alle tarieven, inclusief btw. `null` betekent nog niet ingevuld.
  - `buurten.json`: buurten, vaste dagen en postcodes
  - `planning.json`: beurten per maand voor elke keuze in de prijstool
  - `momenten.json`: voorbeeld van vrije momenten voor een plaatsbezoek
  - `fotos.json`: werven voor de voor-en-na-galerij

Statische site zonder framework: HTML, CSS en gewoon JavaScript. Geen cookies, geen tracking, lettertypes staan in `public/fonts/`.

## Testen

```
npm install
npm test
npx playwright install chromium
npm run test:browser
```

`npm test` controleert de rekenlogica, de gegevens, links, labels, de schrijfstijl en dat er niets geheims in `public/` staat. Het toont ook welke plaatshouders nog ingevuld moeten worden. `npm run test:browser` test de pagina's op computer en gsm.

Wil je een eigen Chrome gebruiken: `CHROME_PATH=/pad/naar/chrome npm run test:browser`.

## Online zetten op Cloudflare

Elke push op `main` zet de site live. Er is geen buildstap.

- Als Worker: `wrangler.jsonc` staat klaar en serveert `public/`.
- Als Pages-project: uitvoermap `public`, geen buildcommando.

Het subdomein `tuinman.denkwerf.com` stel je in bij het project onder "Custom domains".

## Nog te doen voor de echte lancering

- Plaatshouders invullen: zoek op `[` in `public/`. Het WhatsApp-nummer staat enkel in de links (`[WHATSAPPNUMMER]`).
- Tarieven, buurten en planning nakijken en daarna `nagekeken` op `true` zetten. Dan verdwijnt de melding "nog niet nagekeken".
- Voorwaarden en privacyverklaring laten nalezen.
- Een server voor aanvragen en afspraken (Supabase Edge Function met koppeling naar Google Agenda). Tot dan zeggen de formulieren eerlijk dat online versturen nog niet werkt.
- Beheerpagina voor de tuinman: aanvragen bevestigen, foto's opladen, tarieven aanpassen.
- Bij de lancering op het eigen domein: `noindex` uit de pagina's en uit `public/_headers` halen en `public/robots.txt` openzetten.
