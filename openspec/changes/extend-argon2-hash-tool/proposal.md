# Proposal: argon2-tool uitbreiden met verify en presets

## Why

Een argon2-wachtwoordhash voor Authelia (`users_database.yml`) maken kan nu alleen met
`authelia crypto hash generate argon2 --password '...'`. Daar heb je de Authelia-binary voor nodig,
en het wachtwoord komt in je shell-history terecht.

De sharevb-fork heeft al een tool `argon2-hash`, maar die schiet op twee punten tekort:

- De standaardwaarden (512 KiB, parallelism 1) wijken flink af van wat Authelia gebruikt
  (64 MiB, parallelism 4).
- Je kunt een bestaande hash niet controleren tegen een wachtwoord.

## What Changes

- **Preset-keuze** in de hash-kaart: "Authelia (default)", "OWASP minimum" en "Custom". Een preset
  vult variant, iterations, memory, parallelism, hash-lengte en salt-lengte in. Wie zelf een
  parameter aanpast, komt op "Custom" uit.
- **Authelia als standaard** voor nieuwe gebruikers: argon2id, t=3, m=65536 KiB, p=4, key 32 bytes,
  salt 16 bytes.
- **Salt-lengte instelbaar** voor de random salt (nu vast op 16). De bestaande hex-salt-invoer
  blijft.
- **Grenzen en waarschuwing voor memory**: een harde grens van 1 GiB, een waarschuwing boven
  256 MiB, en een validatie dat memory ≥ 8 × parallelism (eis van argon2).
- **Laadstatus** tijdens het hashen. De Generate-knop is dan uitgeschakeld en de knop toont dat er
  gewerkt wordt.
- **Copy-knop** bij het resultaat.
- **Nieuwe verify-kaart**: wachtwoord + PHC-hash (`$argon2id$v=19$...`) → "Match" of "No match".
  De variant en parameters worden uit de hash gelezen. Een ongeldige hash geeft een foutmelding in
  plaats van een crash.
- Nieuwe teksten in `locales/en.yml`. Andere locales vallen terug op Engels.

## Capabilities

### New Capabilities

- `argon2-hash-tool`: argon2-wachtwoordhashes maken (met presets en instelbare parameters) en
  controleren in de browser, compatibel met Authelia en andere PHC-consumers.

### Modified Capabilities

(geen; er bestaat nog geen spec voor deze tool)

## Impact

- `src/tools/argon2-hash/argon2-hash.vue`: uitgebreid (hash-kaart) + verify-kaart.
- `src/tools/argon2-hash/argon2-hash.service.ts` + `.test.ts`: nieuw (presets, validatie,
  hash/verify-wrappers).
- `src/tools/argon2-hash/index.ts`: extra keywords (`authelia`, `phc`, `verify`, `password`).
- `locales/en.yml`: nieuwe keys onder `tools.argon2-hash.texts`.
- Geen nieuwe dependencies: `hash-wasm` zit er al in (`^4.12.0`), inclusief `argon2Verify`.
- Kleine, op zichzelf staande wijziging. Geschikt om later als PR naar `sharevb/it-tools` te sturen.
