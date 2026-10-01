# Tasks

## 1. Testvector en service-laag

- [x] 1.1 Maak een Authelia-testvector met `nix run nixpkgs#authelia -- crypto hash generate argon2 --password 'test'` en leg de PHC-string vast (testwachtwoord, geen geheim). Controleer met `authelia crypto hash validate` dat hij geldig is
- [x] 1.2 Maak `src/tools/argon2-hash/argon2-hash.service.ts` met `ARGON2_PRESETS`, `matchPreset`, `validateParams`, `parseHexSalt` en `verifyArgon2` volgens design.md, en controleer dat `pnpm typecheck` slaagt
- [x] 1.3 Maak `argon2-hash.service.test.ts` met tests voor: presetwaarden, `matchPreset` (preset en custom), validatie (m < 8·p, m > 1 GiB, waarschuwing > 256 MiB, salt-lengte 8–64, ongeldige hex), `verifyArgon2` met de Authelia-vector (`match` voor `test`, `no-match` voor `wrong`), een round-trip voor argon2id/i/d, en `invalid` voor een bcrypt-hash en voor willekeurige tekst. Controleer dat `pnpm test:unit run src/tools/argon2-hash` groen is

## 2. Hash-kaart

- [x] 2.1 Zet de defaults in `argon2-hash.vue` op de Authelia-waarden, voeg `saltLength` toe (storage `argon2:sl`, query `saltlen`) en gebruik `parseHexSalt`. Controleer in `pnpm dev` dat een eerste bezoek (lege localStorage) de Authelia-preset toont
- [x] 2.2 Voeg de preset-select toe (Authelia / OWASP minimum / Custom, afgeleid via `matchPreset`). Controleer in de browser dat een preset kiezen de velden vult en dat een veld aanpassen naar "Custom" springt
- [x] 2.3 Toon validatiefouten en -waarschuwingen, en schakel Generate uit bij fouten. Controleer de scenario's "Memory te laag", "Veel geheugen" en "Ongeldige hex-salt" uit de spec in de browser
- [x] 2.4 Voeg de laadstatus toe (`isHashing`, `await nextTick()` voor het hashen) en controleer dat de copy-knop bij het resultaat werkt. Controleer in de browser dat de knop bezig toont tijdens een hash van 64 MiB
- [x] 2.5 Plak een in de tool gemaakte Authelia-preset-hash voor `test` in `nix run nixpkgs#authelia -- crypto hash validate --password test -- '<hash>'` en controleer dat die geldig is

## 3. Verify-kaart

- [x] 3.1 Voeg de verify-kaart toe (wachtwoord + hash, debounce ~300 ms, `verifyArgon2`, resultaat Match/No match/Invalid in de stijl van de bcrypt-compare). Controleer in de browser de spec-scenario's "Juist wachtwoord", "Onjuist wachtwoord", "Hash uit Authelia", "Ongeldige hash" en "Lege invoer"

## 4. Teksten, metadata en afronding

- [x] 4.1 Voeg de nieuwe teksten toe aan `locales/en.yml` onder `tools.argon2-hash.texts`, en de keywords `authelia`, `phc`, `verify`, `password` aan `index.ts`. Controleer dat er geen ruwe i18n-keys in de UI staan en dat zoeken op "authelia" de tool vindt
- [x] 4.2 Controleer dat het wachtwoord na een herlaadactie leeg is en niet in de URL of `localStorage` staat (spec "Wachtwoord niet bewaard")
- [x] 4.3 Draai `pnpm lint`, `pnpm fmt:check`, `pnpm typecheck` en `pnpm test:unit run` en controleer dat alles groen is
- [x] 4.4 Voeg een entry toe onder `### NEXT VERSION` in `FORK.md` (fork-changelog; `CHANGELOG.md` is van upstream) (### Added/Changed) en controleer dat de entry de verify-kaart en de presets noemt
