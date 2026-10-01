# container-image-publishing Specification

## Purpose

Zorgt dat elke wijziging op de default branch van de fork `torreirow/it-tools` automatisch
beschikbaar komt als container-image op GHCR, klaar om door malandro gepulld te worden.

## Requirements

### Requirement: Image wordt gepubliceerd bij een push naar de default branch

Bij elke push naar de default branch (`chore/all-my-stuffs`) SHALL een container-image gebouwd
worden uit de `Dockerfile` in de repo-root en gepusht naar `ghcr.io/torreirow/it-tools`.

#### Scenario: Push naar default branch

- **WHEN** er een commit naar `chore/all-my-stuffs` gepusht wordt
- **THEN** verschijnt er binnen één workflow-run een nieuw image onder `ghcr.io/torreirow/it-tools`
- **AND** draagt dat image de tags `latest` en `sha-<eerste 7 tekens van de commit-sha>`

#### Scenario: Push naar een andere branch of pull request

- **WHEN** er gepusht wordt naar een andere branch, of er een pull request geopend wordt
- **THEN** wordt er geen image gepubliceerd

#### Scenario: Handmatig starten

- **WHEN** de workflow handmatig gestart wordt (`workflow_dispatch`) op de default branch
- **THEN** wordt het image gebouwd en gepubliceerd zoals bij een push

### Requirement: Image draait op malandro

Het gepubliceerde image SHALL een `linux/amd64`-variant bevatten. Zonder extra configuratie SHALL
de container op poort 8080 luisteren.

#### Scenario: Pullen en starten op een amd64-host

- **WHEN** `docker run -p 8085:8080 ghcr.io/torreirow/it-tools:latest` op een amd64-host gestart wordt
- **THEN** antwoordt `http://127.0.0.1:8085/` met de it-tools-startpagina (HTTP 200)

### Requirement: Image is anoniem te pullen

Het image SHALL zonder authenticatie te pullen zijn.

#### Scenario: Anonieme pull

- **WHEN** een host die niet ingelogd is bij `ghcr.io` `docker pull ghcr.io/torreirow/it-tools:latest` uitvoert
- **THEN** slaagt de pull

### Requirement: Geen publicatie naar derden

Workflows in de fork SHALL niets publiceren of deployen naar andere doelen dan
`ghcr.io/torreirow/it-tools`, dus niet naar Docker Hub, Vercel of GitHub Pages.

#### Scenario: Push triggert alleen de eigen build

- **WHEN** er een commit naar de default branch gepusht wordt
- **THEN** draait er in de Actions-tab alleen de eigen GHCR-workflow
- **AND** is er geen run van de sharevb-workflows (Vercel deploy, Pages, Docker Hub, CodeQL, e2e)
