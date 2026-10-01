# Design: argon2-tool uitbreiden

## Context

- `src/tools/argon2-hash/argon2-hash.vue` (sharevb) gebruikt `argon2id`/`argon2i`/`argon2d` uit
  `hash-wasm`. De parameters worden bewaard met `useQueryParamOrStorage`. Het wachtwoord is een gewone
  `ref('')` en wordt dus niet bewaard. Hashen gebeurt via een Generate-knop. Er zijn nog geen tests
  en er is geen verify.
- `bcrypt` in dezelfde codebase is het voorbeeld voor een tool met hash- en compare-kaart, en voor
  logica in een los `*.models.ts`-bestand met vitest-tests ernaast.
- Teksten gaan via `t('tools.argon2-hash.texts.<key>')`. Alle 20 locales hebben al keys voor deze
  tool.
- De container-nginx zet COOP/COEP, dus WASM werkt in de image. In de dev-server ook.

## Goals / Non-Goals

**Goals:**

- Zo dicht mogelijk bij de bestaande structuur blijven: kleine diff, makkelijk te upstreamen.

**Non-Goals:**

- Andere Authelia-algoritmes (pbkdf2, scrypt, sha2crypt). bcrypt heeft al een eigen tool.
- Hashen in een Web Worker. Bij ≤ 256 MiB duurt het hooguit een paar seconden. hash-wasm is async,
  dus de UI kan tussendoor de laadstatus tekenen. Zie Risks.
- Vertalingen buiten `en.yml`.

## Decisions

### Logica in `argon2-hash.service.ts`, UI in de `.vue`

Het service-bestand bevat:

- `ARGON2_PRESETS`: de presettabel uit de spec.
- `matchPreset(params)`: geeft de naam van de preset terug, of `'custom'`.
- `validateParams(params)`: geeft fouten (blokkerend) en waarschuwingen terug.
- `parseHexSalt(hex)`: vervangt de huidige `hexToBytes`, die ongeldige hex stilzwijgend naar `NaN`
  omzet.
- `verifyArgon2(password, hash)`: geeft `'match' | 'no-match' | 'invalid'` terug.

Waarom: dat is te testen met vitest zonder de component te mounten, en het volgt het patroon van
`bcrypt.models.ts`.

### Preset als afgeleide waarde, niet als opgeslagen state

De preset-select toont `matchPreset(huidige params)`. Een andere preset kiezen schrijft de zes
parameters. Er is geen apart `preset`-veld dat uit de pas kan raken met de parameters. Nieuwe
defaults voor `useQueryParamOrStorage` = de Authelia-waarden.

- *Gevolg:* wie de tool eerder gebruikte, heeft oude waarden in `localStorage` (512 KiB, p=1) en
  ziet "Custom". Dat is acceptabel en eerlijk: die waarden zijn ook custom.
- *Nieuw opgeslagen veld:* `saltLength` (storage key `argon2:sl`, query `saltlen`).

### Verify met `argon2Verify` van hash-wasm

`argon2Verify({ password, hash })` leest variant, versie, parameters en salt uit de PHC-string. Een
`$argon2…$`-string die niet te parsen is, laat hij een exception gooien. Die vangen we af als
`'invalid'`. Vooraf doen we een goedkope regex-check
(`^\$argon2(id|i|d)\$v=\d+\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$`). Zo krijgt
duidelijke onzin, zoals een bcrypt-hash, meteen "invalid" zonder dat WASM geladen wordt.

- De verify-kaart werkt live, met een debounce van ongeveer 300 ms, net als de bcrypt-compare.
- Een PHC-hash met een enorme `m=` zou de browser kunnen laten vastlopen. Daarom gelden de
  validatiegrenzen (≤ 1 GiB) ook voor de geparste `m`. Daarboven: "invalid" met uitleg.

### Generate blijft een knop

Elke keer een nieuwe salt plus zware berekening maakt live herberekenen onrustig en zwaar. De
bestaande knop blijft dus. Er komt `isHashing` bij voor `:loading`/`:disabled`.

### Copy via de bestaande `textarea-copyable`

Die zit al in de component en heeft een copy-knop. Er is geen extra knop nodig, behalve als blijkt
dat `textarea-copyable` geen zichtbare knop heeft (controleren tijdens implementatie).

## Risks / Trade-offs

- [64 MiB+ hashen blokkeert de main thread kort] → De laadstatus wordt eerst gezet, daarna volgt een
  `await nextTick()` en pas dan de hash. Daardoor is de status zichtbaar. Een Web Worker volgt pas als
  het in de praktijk hapert.
- [Authelia-compatibiliteit is een aanname zolang er niet getest is] → Een vaste testvector die met
  de echte Authelia-CLI gemaakt is, gaat in de unit-test (zie tasks), samen met een
  round-trip-test de andere kant op.
- [Andere locales tonen Engelse tekst voor de nieuwe keys] → Dat is acceptabel. vue-i18n valt terug
  op `en`.
