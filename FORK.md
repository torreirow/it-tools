# Fork maintenance (torreirow/it-tools)

This repository is a fork of [sharevb/it-tools](https://github.com/sharevb/it-tools).
Default branch: `chore/all-my-stuffs` (same as upstream).

Fork-specific changes live in **new files** wherever possible, so syncing with upstream stays
conflict-free:

| File                                         | Purpose                                     |
|----------------------------------------------|---------------------------------------------|
| `.github/workflows/torreirow-docker-ghcr.yml` | builds and pushes `ghcr.io/torreirow/it-tools` |
| `FORK.md`                                    | this document, incl. fork changelog         |

## Container image

Every push to `chore/all-my-stuffs` builds a `linux/amd64` image and pushes it as:

- `ghcr.io/torreirow/it-tools:latest`
- `ghcr.io/torreirow/it-tools:sha-<short-sha>`

The image listens on port **8080**.

```sh
docker run --rm -p 8085:8080 ghcr.io/torreirow/it-tools:latest
```

Trigger a build manually:

```sh
gh workflow run torreirow-docker-ghcr.yml --repo torreirow/it-tools --ref chore/all-my-stuffs
```

## Upstream workflows are disabled

All `sharevb-*` workflows and `deploy.yaml` (Vercel) are **disabled in the repository settings**,
not edited or deleted. They publish to sharevb's Docker Hub/GHCR, Vercel and GitHub Pages, which
this fork must not do.

GitHub only registers a workflow file after a push that contains it. A workflow that upstream adds
later is therefore **enabled** right after the sync that brings it in.

## Syncing with upstream

```sh
gh repo sync torreirow/it-tools --source sharevb/it-tools --branch chore/all-my-stuffs

# then disable any newly added upstream workflow
gh workflow list --all --repo torreirow/it-tools
gh workflow disable <workflow-file> --repo torreirow/it-tools

# update the local clone
git pull origin chore/all-my-stuffs
```

The sync is a push to the default branch, so it also triggers a new image build.

## Changelog

Fork-specific changes only. Upstream changes are in `CHANGELOG.md`, which sharevb generates on
every release and which this fork leaves untouched, to keep syncs conflict-free.

### NEXT VERSION

#### Added

- **GHCR container image**: every push to `chore/all-my-stuffs` publishes
  `ghcr.io/torreirow/it-tools` (`linux/amd64`), publicly pullable
  - tags `latest` and `sha-<short-sha>`, manual builds via `workflow_dispatch`
  - the sharevb workflows (Vercel, Pages, Docker Hub, CI, CodeQL, e2e) are disabled in the
    repository settings, so the fork publishes nowhere else
- **Fork maintenance guide**: this document, covering upstream sync and workflow hygiene
- **Argon2 verify card**: check a password against an argon2 PHC hash (`$argon2id$v=19$...`)
  - variant and parameters are read from the hash; shows Match / No match / Invalid
  - verified against hashes from `authelia crypto hash generate argon2`
- **Argon2 presets**: "Authelia (default)" and "OWASP minimum"; editing a parameter shows "Custom"

#### Changed

- **Argon2 hasher defaults**: now match Authelia (argon2id, t=3, m=64 MiB, p=4, 32-byte key,
  16-byte salt) instead of 512 KiB / p=1
  - configurable salt length (8–64 bytes) for the random salt
  - parameter validation: memory ≥ 8 × parallelism, at most 1 GiB, warning above 256 MiB; invalid
    hex salt is rejected
  - loading state on Generate; password fields are masked
