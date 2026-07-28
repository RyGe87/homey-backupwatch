# Backup Watch

Een Homey-app die back-uptaken bewaakt en waarschuwt wanneer er één mislukt —
of, belangrijker nog, wanneer er helemaal niets meer binnenkomt.

## Waarom

Een back-up die stilvalt, doet dat meestal geruisloos. Het script logt netjes
een fout, maar niemand leest dat logbestand. Zo lag de appdata-back-up hier
negentien dagen stil zonder dat het opviel.

Bewaking hoort daarom níét op de machine die je bewaakt. Homey staat er los
van: valt de server helemaal uit, dan merkt Homey dat er niets meer
binnenkomt en slaat alarm. Dat is precies het geval dat een script op de
server zelf nooit kan melden.

## Hoe het werkt

Elke back-uptaak wordt een device in Homey. Je back-upscript stuurt na afloop
één HTTP-verzoek; de app werkt het device bij en zet de bijbehorende flow in
gang.

```bash
curl -X POST "http://<homey-ip>/api/app/dev.rymenants.backupwatch/report" \
  -H 'Content-Type: application/json' \
  -d '{"job":"books","status":"ok","message":"270 bestanden, 1.3G","files":270}'
```

Het endpoint is `public`, dus er is **geen token of OAuth-flow** nodig. Dat
maakt het bruikbaar vanuit een cron-script zonder sessie.

Velden: `job` (verplicht, komt overeen met het device), `status` (`ok` of
iets anders = mislukt), `message` (vrije toelichting, verschijnt in de flow)
en `files` (optioneel aantal).

Met `GET /api/app/dev.rymenants.backupwatch/jobs` zie je welke taken bekend
zijn en welke zich wel gemeld hebben maar nog niet gekoppeld zijn.

## Koppelen

Draai eerst je back-upscript één keer. De taak meldt zich dan aan en
verschijnt bij *Apparaat toevoegen → Backup Watch → Back-uptaak* in de lijst.
Zo weet je zeker dat de naam klopt, want die komt uit een echt rapport.

## Flows

- **Een back-up is mislukt** — met de taaknaam en de reden als tags.
- **Een back-up is geslaagd** — met het aantal bestanden en de toelichting.
- **Een back-up is stilgevallen** — de waakhond. Slaat aan wanneer er binnen
  de ingestelde termijn niets binnenkwam, en meldt hoeveel uur het stil is.
- Voorwaarde: **de back-up is (niet) in orde**.

Stel per device in binnen hoeveel uur je een resultaat verwacht. Een
dagelijkse back-up heeft wat speling nodig; 26 uur is een bruikbare
standaard.

## Licentie

MIT
