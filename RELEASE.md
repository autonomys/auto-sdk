# Release Process

This document describes the release process for the Autonomys Auto SDK.

## Overview

The Autonomys Auto SDK follows a structured release process that includes version management, changelog generation, and package publishing. We use:

- **Lerna**: For managing versioning and publishing in our monorepo
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

## Github Token Requirement

The changelog generator requires a GitHub Personal Access Token to fetch PR data via the GitHub API. Set this up using:

```
./scripts/setup-github-token.sh
```

Follow the instructions to create and set up a token with the `repo` scope.

## Making a Release

### Manual Release

1. Ensure all changes are properly tested and merged into the main branch through Pull Requests
2. Run the following command to generate the PR-based changelog with the next version:
   ```
   BUMP_TYPE=patch yarn changelog  # For patch release (default)
   BUMP_TYPE=minor yarn changelog  # For minor release
   BUMP_TYPE=major yarn changelog  # For major release
   ```
3. Review and edit the CHANGELOG.md file if necessary (the next version will be at the top)
4. Commit the changelog
5. Run the following command to create a new version (should match the bump type used above):
   ```
   yarn lerna version [major|minor|patch]
   ```
6. Push the tags:
   ```
   git push --follow-tags
   ```
7. Publish to npm:
   ```
   yarn publish
   ```

### Automated Release

#### Package assembly checks (shadow pipeline)

`Release package checks` runs on PRs, pushes to `main`, and manual dispatches.
It does not publish, tag, or change the release process described below.
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
   Future publication must explicitly set public access. `gitHead` is set to the
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

#### Artifact publisher (not connected to production yet)

`scripts/release/publish.js` consumes the assembled tarballs without installing dependencies, building, repacking, or running package scripts. Its default mode is an offline dry run. The shadow workflow exercises that mode; it has no publishing permissions. The existing production workflow below remains unchanged.

Assembly now emits `source-commit` and `manifest-sha256` as job outputs, alongside the uploaded artifact ID. The publisher requires those independently supplied values, checks its checkout against the source commit, authenticates the manifest, and verifies the complete package set and every tarball before contacting npm. Package identities, versions, and dependency ordering come from metadata in the committed source. Verified tarballs are copied into a private temporary directory so subsequent changes to the downloaded files cannot change the upload.

Before invoking npm, the publisher uses the runner's system `tar` to read `package/package.json` from each verified snapshot without extracting files to disk. It requires canonical, unique archive paths, checks the packaged name/version against committed source, and rejects any `publishConfig` field, including empty or null values. This is a separate check on assembly's removal of publishing configuration: the manifest digest alone authenticates bytes, not npm's interpretation of them. Both archive reads continue past zero blocks and reject any stderr output, even when tar exits successfully, so a warning or early end marker cannot hide another manifest. Reads have bounded output and execution time and receive no credentials. Assembly remains trusted for the package payload; these checks do not make compromised build output safe to execute.

```sh
node scripts/release/publish.js /absolute/path/to/release-packages \
  --source-commit "$SOURCE_COMMIT" \
  --manifest-sha256 "$MANIFEST_SHA256" \
  --tag latest
```

Use the commit and digest recorded by trusted assembly, not a digest supplied inside the downloaded artifact. Stable `X.Y.Z` versions require `latest`; `X.Y.Z-beta.N` versions require `beta`. Other version/channel formats fail explicitly. The dry run validates files and publication order without invoking npm, querying the registry, or requesting OIDC tokens. It does not verify registry availability or trusted publisher configuration.

The future production job will add `--publish`. That mode:

1. Requires a GitHub-hosted run of `.github/workflows/release.yaml` from the original `main` push, with the workflow SHA, event SHA, checkout SHA, and assembly SHA all matching. It also requires the same Node and npm versions used by assembly. These checks catch wiring errors; GitHub environment protection and npm's trusted publisher configuration enforce authorization.
2. Checks every package/version on the fixed public npm registry before uploading any. Only HTTP 404 means absent. An existing version must have the exact expected SHA-512 integrity. Missing integrity, mismatched identity, malformed responses, redirects, and other HTTP/network failures stop the run.
3. Publishes absent versions in internal dependency order, including optional and peer dependencies. It uses the standard npm CLI with explicit default and `@autonomys` scope registries, public access, channel, provenance, disabled lifecycle scripts, and disabled workspaces. npm receives empty user/global config, an isolated home/cache, and only the required GitHub OIDC/provenance context. Project npm configuration, tokens, environment proxy settings, and Node preload options are not inherited; tarball-supplied `publishConfig` is rejected separately before this step.
4. Checks the registry immediately before each upload and verifies its integrity afterward. A failed npm command can represent a lost response after a successful upload, so the publisher checks the registry instead of blindly uploading again. Brief visibility delays get bounded read retries; a missing or conflicting version stops subsequent packages.
5. Skips already published matching versions without changing their dist-tags. Before publishing a missing version, it refuses to move `latest` or `beta` backwards. Existing tag versions must also use the supported stable/beta formats. It does not automatically repair manually changed tags.

New packages require a one-time manual first publish before joining automated releases, followed by [trusted-publisher configuration](https://docs.npmjs.com/trusted-publishers/) for `autonomys/auto-sdk`, `release.yaml`, and the `npm-publish` environment. Publish a reviewed, functional bootstrap version using a maintainer's normal npm login/2FA, then include the package in a subsequent release with a new version. Do not add a maintainer token or an automatic first-publish fallback to this workflow. npm can return HTTP 401 for an unpublished package's dist-tags even though its version endpoint returns 404; the publisher stops and provides a setup hint, rather than interpreting 401 as permission to upload. The hint is not proof the package is new: existing packages' authorization failures must also be resolved before retrying.

The publisher intentionally keeps its environment isolation and small validation helpers independent of assembly and installation verification. Changes to build/assembly utilities must not silently change the code that receives publishing authority. Review equivalent policies in all release stages when updating them; this duplication keeps the privileged publisher's dependency surface small.

After a partial failure, rerun the original publisher job using the **same artifact ID, manifest digest, and source commit**. Completed versions are verified and skipped; the remaining versions are published from the retained bytes. Never rebuild to resume a partially published version. If the original artifact or trusted identity record is unavailable, stop and resolve recovery explicitly. The publisher does not delete or overwrite published packages, create tags, or create GitHub releases.

Before enabling this in production, the workflow follow-up must connect protected release preparation on `main`, successful assembly and installation verification, an isolated `npm-publish` environment job with OIDC permission, and a separate repository-writing finalizer. It must preserve the original artifact and trusted identity outputs across retries, serialize releases so tag checks cannot race another release, and provide sufficient artifact retention for recovery. The shadow pipeline's seven-day compiled-output retention and fourteen-day assembled-package retention are still only for checks. Keep environment review protection during rollout. Tests here use simulated registry/npm failures and real local npm packing; they do not exercise a live publish or OIDC exchange.

#### Publishing

Releases run from a `chore-vX.Y.Z` branch, where `X.Y.Z` is the version being released. The workflow publishes to npm with [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so no npm token is involved. It runs in the `npm-publish` environment, which refuses runs from any other branch and needs a second person to approve each run.

1. Create a `chore-vX.Y.Z` branch from an up-to-date `main` and push it
2. Go to the GitHub Actions tab in the repository
3. Select the "Release" workflow
4. Click "Run workflow" and select the release branch
5. Select the release type (major, minor, patch)
6. Choose whether it should be a pre-release. Tick "Dry run" to check the npm setup without versioning or publishing anything
7. Click "Run workflow"
8. Ask one of the `npm-publish` environment's reviewers (Settings > Environments) to approve the run. Nothing runs until then, and you can't approve a run you started
9. When the run finishes, open a PR from the release branch into `main` titled `chore: release vX.Y.Z`, so the changelog and version bump land on `main`

The GitHub Action will:

- Check that npm trusted publishing is set up for every package
- Generate the PR-based changelog with the next version at the top
- Bump the version according to the release type, and push the commit and tag to the release branch
- Build and test the code, then publish the packages to npm with provenance
- Create a GitHub release with the changelog

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

If you encounter issues during the release process:

1. Check the GitHub Actions logs for any errors
2. If the run is waiting, it needs approval from an `npm-publish` reviewer other than you. If it was refused, check that it was started from a `chore-v*` branch
3. If the "Verify npm trusted publishing" step fails, its output lists each package npm rejected and the settings that package's trusted publisher needs on npmjs.com
4. If publishing fails with an authorization error after that step passed, check that the package's trusted publisher allows publishing directly. The step can't check this, and npm defaults new trusted publishers to staged publishing only
5. Verify your Git configuration is correct
6. For changelog generation issues, ensure your GITHUB_TOKEN has adequate permissions

For more assistance, contact the core development team.
