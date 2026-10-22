# Release Process

This document describes the release process for the Autonomys Auto SDK.

## Overview

The Autonomys Auto SDK follows a structured release process that includes version management, changelog generation, and package publishing. We use:

- **Lerna**: For coordinating package versions in our monorepo
- **Conventional Commits**: For structured commit messages and PR titles
- **GitHub Actions**: For automating the release workflow
- **PR-Based Changelog**: We generate changelogs exclusively based on merged Pull Requests

## Release Cycle

1. **Development Phase**: Features, fixes, and improvements are developed and merged into the main branch
2. **Pre-release Testing**: Code is thoroughly tested in preparation for release
3. **Release Preparation**: Changelog is updated and version is bumped
4. **Publishing**: Packages are published to npm and a GitHub release is created

## Pull Request Requirements

Since our changelog is exclusively generated from merged Pull Requests, it's important that all changes are submitted through PRs rather than direct commits to the main branch.

### Pull Request Title Format

Pull request titles must follow the conventional commits format:

```
<type>(<scope>): <subject>
```

For example:

- `feat(auto-utils): add new wallet activation method`
- `fix(auto-drive): resolve file upload timeout issue`
- `docs: update installation instructions in README`

> **Note**: PR titles are automatically checked by our GitHub Action workflow to ensure they follow this format. Non-compliant PR titles will be flagged.

### PR Labels

You can also use labels on PRs to help categorize changes:

- `feature` or `enhancement`: New features or enhancements
- `bug`: Bug fixes
- `documentation`: Documentation changes
- `refactor`: Code refactoring
- `performance`: Performance improvements
- `test`: Test-related changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes
- `style`: Code style changes
- `revert`: Reverts
- `dependencies`: Dependency updates

### Commit Message Format

While individual commits don't directly appear in the changelog, we still follow the conventional commits format for all commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Where `<type>` is one of:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes
- **style**: Changes that don't affect the code's behavior (formatting, etc.)
- **refactor**: Code changes that neither fix a bug nor add a feature
- **perf**: Performance improvements
- **test**: Adding or modifying tests
- **build**: Changes to the build system or dependencies
- **ci**: Changes to CI configuration
- **chore**: Other changes that don't modify src or test files

The `<scope>` is optional and should be the name of the affected package or component.

## Making a Release

1. Run **Prepare release** from the Actions tab on `main`. Choose a stable bump (`patch`, `minor`, `major`) or a beta bump (`prepatch`, `preminor`, `premajor`, `prerelease`).
2. Open the release PR using the link in the run summary. Preparation pushes `chore-vX.Y.Z` with updated package versions, internal dependencies, lockfile, and changelog. It creates no tag and publishes nothing. A maintainer opens the PR so normal PR checks run; no additional bot token is needed.
3. Review the generated changelog and version changes, wait for required checks, obtain approval, and merge. If other work lands on `main` before the release PR merges, update the branch and include that work in the changelog review: the merge commit is what ships.
4. The version-changing push starts **Release**. It builds and tests the merged commit, assembles tarballs in a fresh job, and verifies installation in another unprivileged job.
5. Approve the `npm-publish` environment when requested. Its isolated job publishes the exact verified tarballs using npm trusted publishing and provenance.
6. Once every package is verified on npm, a separate job tags the original commit and creates the GitHub release using that version's changelog section.

`patch` promotes an existing beta to its stable version without incrementing the patch number again: `1.7.0-beta.2` becomes `1.7.0`. `prerelease` advances an existing beta counter; from a stable version it starts the next patch beta. `preminor` and `premajor` start beta versions of the next minor or major release. Stable versions use npm's `latest` channel; beta versions use `beta` and do not become the latest GitHub release.

Preparation requires the current version to have both a Git tag and a completed GitHub release. Finish a partial release before preparing another. If a proposal branch already exists, review or resolve it explicitly; preparation never force-pushes over it.

To exercise the production build/assembly/installation path without publishing, manually dispatch **Release** on `main`. Manual runs have no publishing job, OIDC permission, or repository-writing finalizer. They do not test live npm authentication. There is no canary phase; the first real version-changing merge is a normal release.

The preparation workflow runs Lerna and changelog generation with read-only repository access. A fresh job with repository write permission imports only validated release metadata and pushes the proposal branch. It accepts no workflow/script changes from the preparation artifact and runs no project install, lifecycle hooks, or package code. Changelog generation uses the job's read-only GitHub token; local use of `yarn changelog` still requires a suitable `GITHUB_TOKEN`.

### Package and publisher checks

#### Package assembly checks (shadow pipeline)

`Release package checks` runs on PRs, pushes to `main`, and manual dispatches.
It does not publish or tag. Production uses the same assembly and publisher scripts in separate jobs.
All three jobs have read-only repository access and no OIDC permission.

1. **Build** installs with the lockfile and builds. Unit tests run in the existing
   `Build` workflow. Only compiled `dist/`
   trees are uploaded, with paths relative to `packages/`.
2. **Assemble** uses a fresh checkout of the same workflow commit, without
   installing project dependencies. `scripts/release/package-layout.json` lists
   every public package. Only regular files inside those packages' `dist/` trees
   are accepted from the build artifact; links, special files, missing outputs,
   and other paths are rejected. Artifacts are downloaded outside the checkout.
   Tracked package files, manifests, and licenses come from the fresh checkout.
   Existing npm `files`/ignore rules are preserved. The only supported source
   `publishConfig` is `access: public`; it is removed from assembled manifests.
   Publication explicitly sets public access. `gitHead` is set to the
   checkout commit. The pinned npm CLI packs with scripts disabled, and assembly
   fails if a declared entry point or compiled file is omitted.
3. **Verify installation** installs those exact tarballs in a temporary consumer with scripts
   disabled, verifies installed contents and recorded tarball bin permissions, and
   exercises an SDK API. It uses `--legacy-peer-deps` because the repository has
   existing conflicting React peer ranges; this checks packaging, not peer
   compatibility. Package execution remains in a separate unprivileged job.

The assembled artifact includes `manifest.json`, the source commit, tool versions,
package identities, SHA-512 tarball integrity, and SHA-256 compiled-file hashes.
Downloads select the preceding job's artifact ID, not a name from another run.
These hashes establish artifact identity, not the safety of compiled code.
Compiled-output artifacts expire after 7 days; assembled-package artifacts expire
after 14 days. Neither is a production release store.

To run boundary tests locally (Node 24):

```sh
node --test scripts/release/*.test.js
```

After building, copy each declared package's `dist/` into an external input
directory, retaining paths relative to `packages/`, then run:

```sh
node scripts/release/assemble.js /absolute/path/to/compiled-outputs /absolute/path/to/new-packages
node scripts/release/verify-installation.js /absolute/path/to/new-packages
```

The output directory must not already exist. For authoritative checks, use the
workflow's fresh checkout; local assembly reads tracked files from the working
tree, including local edits, while recording `HEAD`.

#### Artifact publisher

`scripts/release/publish.js` consumes the assembled tarballs without installing dependencies, building, repacking, or running package scripts. Its default mode is an offline dry run. Both the shadow workflow and production installation-verification job exercise that mode without publishing permissions. Only the protected production publisher adds `--publish`.

Assembly emits `source-commit` and `manifest-sha256` as job outputs, alongside the uploaded artifact ID. The publisher requires those independently supplied values, checks its checkout against the source commit, authenticates the manifest, and verifies the complete package set and every tarball before contacting npm. Package identities, versions, and dependency ordering come from metadata in the committed source. Verified tarballs are copied into a private temporary directory so subsequent changes to the downloaded files cannot change the upload.

Before invoking npm, the publisher uses the runner's system `tar` to read `package/package.json` from each verified snapshot without extracting files to disk. It requires canonical, unique archive paths, checks the packaged name/version against committed source, and rejects any `publishConfig` field, including empty or null values. This is a separate check on assembly's removal of publishing configuration: the manifest digest alone authenticates bytes, not npm's interpretation of them. Both archive reads continue past zero blocks and reject any stderr output, even when tar exits successfully, so a warning or early end marker cannot hide another manifest. Reads have bounded output and execution time and receive no credentials. Assembly remains trusted for the package payload; these checks do not make compromised build output safe to execute.

```sh
node scripts/release/publish.js /absolute/path/to/release-packages \
  --source-commit "$SOURCE_COMMIT" \
  --manifest-sha256 "$MANIFEST_SHA256" \
  --tag latest
```

Use the commit and digest recorded by trusted assembly, not a digest supplied inside the downloaded artifact. Stable `X.Y.Z` versions require `latest`; `X.Y.Z-beta.N` versions require `beta`. Other version/channel formats fail explicitly. The dry run validates files and publication order without invoking npm, querying the registry, or requesting OIDC tokens. It does not verify registry availability or trusted publisher configuration.

The production job invokes `--publish`. That mode:

1. Requires a GitHub-hosted run of `.github/workflows/release.yaml` from the original `main` push, with the workflow SHA, event SHA, checkout SHA, and assembly SHA all matching. It also requires the same Node and npm versions used by assembly. These checks catch wiring errors; GitHub environment protection and npm's trusted publisher configuration enforce authorization.
2. Checks every package/version on the fixed public npm registry before uploading any. Only HTTP 404 means absent. An existing version must have the exact expected SHA-512 integrity. Missing integrity, mismatched identity, malformed responses, redirects, and other HTTP/network failures stop the run.
3. Publishes absent versions in internal dependency order, including optional and peer dependencies. It uses the standard npm CLI with explicit default and `@autonomys` scope registries, public access, channel, provenance, disabled lifecycle scripts, and disabled workspaces. npm receives empty user/global config, an isolated home/cache, and only the required GitHub OIDC/provenance context. Project npm configuration, tokens, environment proxy settings, and Node preload options are not inherited; tarball-supplied `publishConfig` is rejected separately before this step.
4. Checks the registry immediately before each upload and verifies its integrity afterward. A failed npm command can represent a lost response after a successful upload, so the publisher checks the registry instead of blindly uploading again. Brief visibility delays get bounded read retries; a missing or conflicting version stops subsequent packages.
5. Skips already published matching versions without changing their dist-tags. Before publishing a missing version, it refuses to move `latest` or `beta` backwards. Existing tag versions must also use the supported stable/beta formats. It does not automatically repair manually changed tags.

New packages require a one-time manual first publish before joining automated releases, followed by [trusted-publisher configuration](https://docs.npmjs.com/trusted-publishers/) for `autonomys/auto-sdk`, `release.yaml`, and the `npm-publish` environment. Publish a reviewed, functional bootstrap version using a maintainer's normal npm login/2FA, then include the package in a subsequent release with a new version. Do not add a maintainer token or an automatic first-publish fallback to this workflow. npm can return HTTP 401 for an unpublished package's dist-tags even though its version endpoint returns 404; the publisher stops and provides a setup hint, rather than interpreting 401 as permission to upload. The hint is not proof the package is new: existing packages' authorization failures must also be resolved before retrying.

The publisher intentionally keeps its environment isolation and small validation helpers independent of assembly and installation verification. Changes to build/assembly utilities must not silently change the code that receives publishing authority. Review equivalent policies in all release stages when updating them; this duplication keeps the privileged publisher's dependency surface small.

After a partial failure, rerun the original publisher job using the **same artifact ID, manifest digest, and source commit**. Completed versions are verified and skipped; the remaining versions are published from the retained bytes. Never rebuild to resume a partially published version. If the original artifact or trusted identity record is unavailable, stop and resolve recovery explicitly. The publisher does not delete or overwrite published packages, create tags, or create GitHub releases.

### Retry and retention rules

Production builds and assemblies are retained for 90 days, subject to the repository/organization retention policy. The assembly job records the artifact ID, source commit, and manifest SHA-256 in its outputs and summary. Downloads always use the exact artifact ID, and the publisher receives the source commit and digest independently through `needs.assemble.outputs`.

For a failed verification, publication, or finalization, select **Re-run failed jobs** on the **original Release run**. GitHub retains the successful upstream jobs and their outputs; a publisher retry downloads the original artifact and skips only versions with matching integrity. If only finalization failed, only finalization needs to run. Existing lightweight or annotated tags must resolve to the original commit; conflicting tags or GitHub releases are never overwritten.

Do not select **Re-run all jobs**, rerun a successful build/assembly, or dispatch a new workflow to finish a partial release. A guard checks previous attempts before building or assembling and refuses to replace artifacts after any successful assembly or publication attempt. Retrying a build or assembly that has never succeeded is allowed. If the wrong jobs were rerun, stop and use the original failed job/attempt; do not delete artifacts or change the guard to force a rebuild.

GitHub permits [rerunning jobs for up to 30 days](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs). Complete automated recovery within that window and while the original artifacts and trusted outputs remain available. If a required artifact/output is missing or expired, or the original workflow code needs fixing to recover, stop for a separately reviewed maintainer recovery using the retained exact bytes and recorded identity. A new build or a newly computed digest is not a substitute for that identity.

Production releases share a [queued concurrency group](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency) and are never automatically cancelled by a newer run. The queue prevents concurrent channel updates; previous-release checks also prevent advancing past an unfinished release. Manual dry runs use that group too. The final GitHub release records the source SHA, manifest digest, and original artifact link for investigation.

### Required rollout configuration

Before the first production release:

- Require reviewed PRs, current required checks, and code-owner review on `main`. Enforce these rules for administrators and remove applicable bypasses: reviewed source is a security boundary.
- Restrict the `npm-publish` environment to `main` only. Remove the legacy `chore-v*` allowance; old branches retain the previous release workflow. Keep required reviewers and prevent self-review during rollout. Do not remove reviewers as part of this change.
- Confirm every package's npm trusted publisher binds to `autonomys/auto-sdk`, workflow filename `release.yaml`, and environment `npm-publish`, with direct publishing permitted. No npm token or custom OIDC exchange is needed. The old `verify-npm-trusted-publishing.js` preflight has been removed; npm handles its own token exchange.
- Ensure artifact/log retention supports the 90-day request, and preserve the assembly summary/outputs throughout recovery. Never use the shadow pipeline's seven-day compiled or fourteen-day assembled artifacts for production recovery.
- Merge the assembly and publisher changes before this integration. Do not bump `lerna.json` in the workflow integration PR. A manual production dry run can verify wiring before the next normal release.

At implementation review, `npm-publish` allowed both `main` and `chore-v*`, required reviewers, and prevented self-review. `main` required one code-owner approval and an up-to-date Build check, but administrator enforcement was disabled. These settings must be rechecked and tightened for rollout; this code change does not modify repository or npm settings.

## Changelog Format

Our changelog follows a specific format:

1. The next version appears at the top of the changelog
2. Each release includes grouped changes (features, bug fixes, etc.)
3. Each entry links to the PR and credits the contributor
4. An "Unreleased" section is maintained for future changes

The format makes it easy to see what's included in each release and who contributed to it.

## After Release

After a release is made:

1. Verify the npm packages are correctly published
2. Check the GitHub release was created with the correct changelog
3. Announce the release to users as needed

## Troubleshooting

1. Inspect the failed job in the original Release run. A waiting publisher needs an `npm-publish` reviewer other than the person who initiated it.
2. For partial publication, follow the retry rules above. A successful npm command is not sufficient: the publisher must verify the registry's exact integrity before continuing.
3. For an authorization failure, check the package's trusted-publisher repository, workflow, environment, and direct-publish permission. For a new package, complete the manual first-publish setup described above.
4. A mismatched registry integrity, unsupported existing dist-tag, conflicting Git tag, or conflicting GitHub release needs explicit maintainer investigation. Do not bypass checks or overwrite the conflicting state.
5. If preparation says the previous release is incomplete, finish that release's publication and finalization. If the version branch already exists, open its PR from the compare view instead of rerunning preparation over it.
6. Review changelog output before merging, especially after updating a release branch with newer `main` changes.
