# Tasks

## 1. sharevb-workflows uitschakelen

- [x] 1.1 Zet Actions tijdelijk uit (`gh api -X PUT repos/torreirow/it-tools/actions/permissions -F enabled=false`), push (GitHub registreert workflows pas na een push), schakel alle 9 sharevb-workflows uit met `gh workflow disable <naam> --repo torreirow/it-tools` en controleer met `gh workflow list --all --repo torreirow/it-tools` dat ze allemaal `disabled_manually` zijn, en zet Actions daarna weer aan

## 2. Eigen GHCR-workflow

- [x] 2.1 Voeg `.github/workflows/torreirow-docker-ghcr.yml` toe (trigger: push op `chore/all-my-stuffs` en `workflow_dispatch`; amd64; tags `latest` en `sha-<short>`; label `org.opencontainers.image.source` naar torreirow), en controleer de syntax lokaal met `actionlint` (of `nix run nixpkgs#actionlint`) zonder fouten
- [x] 2.2 Controleer dat `git diff upstream/chore/all-my-stuffs --stat -- .github/` alleen het nieuwe bestand toont (geen gewijzigde sharevb-bestanden)
- [x] 2.3 Voeg `FORK.md` toe in de repo-root (nieuw bestand, geen conflict met upstream) met: upstream-sync (`gh repo sync torreirow/it-tools`), daarna `gh workflow list --all` controleren, en een handmatige build (`gh workflow run torreirow-docker-ghcr.yml`); controleer dat de beschreven commando's werken
- [x] 2.4 Commit en push. Controleer dat `gh run list --repo torreirow/it-tools` alleen een run van `torreirow-docker-ghcr` toont en dat die groen eindigt

## 3. Publiceren en verifiëren

- [x] 3.1 Zet het package `it-tools` op **public** (bleek niet nodig: erft de zichtbaarheid van de publieke repo) en controleer met een anonieme `docker logout ghcr.io && docker pull ghcr.io/torreirow/it-tools:latest` dat de pull slaagt
- [x] 3.2 Controleer met `docker inspect` dat de tags `latest` en `sha-<short>` bestaan, dat de architectuur `amd64` is en dat `org.opencontainers.image.source` naar torreirow wijst
- [x] 3.3 Draai `docker run --rm -d -p 8085:8080 ghcr.io/torreirow/it-tools:latest` en controleer dat `curl -sI http://127.0.0.1:8085/` HTTP 200 geeft met de header `Cross-Origin-Embedder-Policy: require-corp`. Ruim de container daarna op
