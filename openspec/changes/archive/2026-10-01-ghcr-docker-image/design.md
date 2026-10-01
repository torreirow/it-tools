# Design: eigen Docker-image op GHCR

## Context

- De fork is sinds 2026-10-01 een fork van `sharevb/it-tools`. De default branch is
  `chore/all-my-stuffs`, dezelfde als upstream. Eigen wijzigingen ten opzichte van upstream: nog geen.
- Actions staan aan in de fork. Er is nog niet gepusht, dus er heeft nog niets gedraaid.
- In `.github/workflows/` staan 9 sharevb-workflows. Bij een push zouden `deploy.yaml` (Vercel),
  `sharevb-ci.yml`, `sharevb-codeql-analysis.yml`, `sharevb-e2e-tests.yml` en
  `sharevb-github-pages-publish.yml` starten, en via `workflow_run` op `ci` ook de twee
  Docker-release-workflows. `sharevb-docker-nightly-release.yml` draait op een cron. Cron-workflows
  staan in forks standaard uit, totdat iemand ze aanzet.
- De `Dockerfile` (sharevb) bouwt al zonder vaste BASE_URL, draait op `nginx-unprivileged` en
  luistert standaard op 8080. Hij zet COOP/COEP-headers die de WASM-tools (zoals argon2 via hash-wasm)
  nodig hebben.
- malandro is x86_64.

## Goals / Non-Goals

**Goals:**

- Eén eigen workflow, los van de sharevb-bestanden.
- Een upstream-sync (`gh repo sync` of "Sync fork") moet conflictvrij blijven.

**Non-Goals:**

- arm64-images en varianten per locale (`latest-en`).
- Docker Hub.
- Automatische upstream-sync op schema. Syncen gaat voorlopig met de hand.
- Automatisch uitrollen naar malandro. Dat valt onder de NixOS-change `ittools-own-image`.

## Decisions

### Eigen workflow-bestand in plaats van de sharevb-workflow aanpassen

Het nieuwe bestand heet `.github/workflows/torreirow-docker-ghcr.yml`.

- *Alternatief:* `sharevb-docker-realease-latest.yml` aanpassen (image-namen, Docker Hub-login
  eruit). Nadeel: elke upstream-wijziging aan dat bestand geeft een merge-conflict.
- Een nieuw bestand verandert nooit upstream, dus een sync blijft schoon.

### sharevb-workflows uitschakelen via de API, niet verwijderen

`gh workflow disable <naam> --repo torreirow/it-tools` voor alle 9. Die status staat in de
repo-instellingen en niet in git, dus de bestanden blijven gelijk aan upstream.

- *Risico:* een workflow die upstream nieuw toegevoegd wordt, staat na een sync gewoon aan. Zie
  Risks.

### Trigger: `push` op de default branch + `workflow_dispatch`, geen `workflow_run` op `ci`

sharevb laat de image-build pas starten nadat `ci` geslaagd is. Wij schakelen `ci` uit, want die
draait lint, typecheck, unit- en e2e-tests op een arm-runner en kost veel minuten. Daardoor kan de
eigen workflow direct op `push` reageren. De `pnpm build` in de Dockerfile valt al om bij compile-
fouten. Tests draaien lokaal tijdens `/opsx:apply`.

- *Alternatief:* `ci` aan laten en `workflow_run` gebruiken. Dat is dubbele build-tijd per push en
  levert voor een persoonlijke fork weinig op.

### Runner en build

- `runs-on: ubuntu-latest` (amd64). Geen QEMU, `platforms: linux/amd64`.
- `docker/metadata-action` genereert de tags `latest` (alleen op de default branch) en
  `type=sha,prefix=sha-,format=short`.
- Inloggen bij `ghcr.io` met `GITHUB_TOKEN`. De job krijgt `permissions: contents: read,
  packages: write`.
- De OCI-labels `org.opencontainers.image.source=https://github.com/torreirow/it-tools` koppelen het
  package aan de repo. In de Dockerfile staat het sharevb-label hard ingesteld. Het label van de
  metadata-action overschrijft dat bij de build.
- `concurrency: group: ${{ github.workflow }}, cancel-in-progress: true`, zodat de nieuwste commit
  wint, net als bij sharevb.
- Actions vastzetten op dezelfde SHA's die sharevb gebruikt. Die zijn al gecontroleerd en zo blijven
  ze bij Renovate-updates in de pas.

### Package publiek maken

Een nieuw GHCR-package is standaard privé. Na de eerste succesvolle run zet je in de
package-instellingen de zichtbaarheid op public. Dat is eenmalig handwerk: via de REST-API kan
je de zichtbaarheid van een user-package niet wijzigen.

## Risks / Trade-offs

- [Upstream voegt een nieuwe workflow toe die na een sync meteen aan staat] → In de sync-instructie
  staat: controleer na elke sync `gh workflow list --all` en schakel nieuwe `sharevb-*`- of
  deploy-workflows uit. Zonder secrets falen ze meestal toch.
- [Upstream verplaatst of hernoemt de `Dockerfile`] → De build faalt zichtbaar in Actions. Pas dan
  het `file:`-pad aan.
- [Geen CI-tests in de fork] → Een kapotte upstream-commit kan als `latest` uitgerold worden.
  Opvang: de tag `sha-<short>` maakt terugrollen op malandro mogelijk door die tag vast te zetten.
- [Het label `org.opencontainers.image.source` in de Dockerfile wijst naar sharevb] → Het
  metadata-label overschrijft het. Controleer dit met `docker inspect` na de eerste run.

## Migration Plan

1. Actions voor de repo uitzetten. Een verse fork heeft nog geen geregistreerde workflows, en
   `gh workflow disable` geeft 404 totdat er gepusht is.
2. Workflow toevoegen, committen en pushen. Er draait niets, maar de workflows zijn dan geregistreerd.
3. De 9 sharevb-workflows uitschakelen, Actions weer aanzetten en de eigen workflow starten met
   `workflow_dispatch`. De run wordt groen.
4. Package publiek zetten en een anonieme pull testen.
5. Daarna de NixOS-change `ittools-own-image` uitvoeren.

Terugrollen: schakel de workflow uit. malandro kan terug naar `corentinth/it-tools:latest` of
`ghcr.io/sharevb/it-tools:latest`.
