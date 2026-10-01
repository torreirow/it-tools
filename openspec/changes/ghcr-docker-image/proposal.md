# Proposal: eigen Docker-image op GHCR

## Why

malandro draait nu `corentinth/it-tools:latest`, een image dat sinds oktober 2024 niet meer
bijgewerkt is. De fork `torreirow/it-tools` is net opnieuw opgezet als fork van
`sharevb/it-tools`. Om eigen uitbreidingen (zoals de argon2 verify-kaart) op malandro te krijgen,
is een image nodig dat vanuit deze fork gebouwd wordt.

De sharevb-workflows zijn daar niet geschikt voor. Ze publiceren onder vaste namen
(`sharevb/it-tools`, `ghcr.io/sharevb/...`), loggen in bij Docker Hub met secrets die in deze fork
ontbreken, en zetten daarnaast deploys naar Vercel en GitHub Pages in gang.

## What Changes

- Een nieuwe, eigen workflow bouwt bij elke push naar de default branch
  (`chore/all-my-stuffs`) een `linux/amd64`-image en pusht dat naar
  `ghcr.io/torreirow/it-tools` met de tags `latest` en `sha-<short>`. Handmatig starten
  (`workflow_dispatch`) kan ook.
- Alle sharevb-workflows worden **uitgeschakeld via de repo-instellingen** (`gh workflow disable`).
  De bestanden zelf blijven ongewijzigd, zodat een upstream-sync geen merge-conflicten geeft.
- Het GHCR-package wordt publiek gemaakt, zodat malandro zonder credentials kan pullen. De app staat
  daar achter Authelia en de broncode is toch al publiek.
- Een nieuw `FORK.md` in de repo-root beschrijft hoe je upstream synct en een image bouwt.

## Capabilities

### New Capabilities

- `container-image-publishing`: het automatisch bouwen en publiceren van het it-tools-image van deze
  fork naar GHCR.

### Modified Capabilities

(geen)

## Impact

- `.github/workflows/`: één nieuw bestand (`torreirow-docker-ghcr.yml`). Er wordt geen bestaand
  bestand aangepast.
- `FORK.md`: nieuw.
- GitHub repo-instellingen: 9 sharevb-workflows uitgeschakeld, het package `it-tools` publiek.
- Voorwaarde voor de NixOS-change `ittools-own-image` (repo `torreirow-nixos`), die het image op
  malandro gaat gebruiken.
- GitHub Actions-minuten: één amd64-build per push (geen QEMU/arm64, geen locale-matrix).
