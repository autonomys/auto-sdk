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

Releases go through a release PR, and merging it publishes the packages. Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC), so no npm token is involved, and only runs from `main`.

1. Go to the GitHub Actions tab in the repository
2. Select the "Prepare release" workflow
3. Click "Run workflow" on `main`, select the release type (major, minor, patch), and click "Run workflow"
4. When the run finishes, open the release PR from the link in its summary. It is titled `chore: release vX.Y.Z` and contains the changelog and the version bump
5. Get the release PR reviewed, then merge it. If GitHub asks you to update its branch first, other PRs have merged into `main` since Prepare release ran. They will ship in this release, so add them to `CHANGELOG.md` on the release branch before merging
6. The merge starts the "Release" workflow, which publishes the new version

Prepare release will:

- Check that the current version has been released
- Generate the PR-based changelog with the next version at the top
- Bump the version of every package and push both commits to a `chore-vX.Y.Z` branch

Release will:

- Stop straight away unless the version in `lerna.json` has no tag yet, so merges that don't change the version publish nothing
- Build and test what was merged, then pack every package
- Check that npm trusted publishing is set up for every package, then publish them to npm with provenance, skipping any version already on npm
- Tag the release and create a GitHub release with the changelog

To check the npm setup without publishing, run the "Release" workflow on `main` with "Dry run" ticked. It builds and packs the packages, runs the trusted publishing check, and lists what it would publish.

Pre-releases (beta versions) are not currently supported.

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
2. If publishing fails partway, fix the cause and click "Re-run failed jobs" on the Release run. Versions already on npm are skipped, and the tag and GitHub release are only created once every package is published. Don't run Prepare release again: that would bump the version a second time
3. If Prepare release says the current version is not tagged, the previous release didn't finish. Re-run the failed jobs of its Release run first
4. If either workflow refuses to run, check that it was started on `main`
5. If the "Verify npm trusted publishing" step fails, its output lists each package npm rejected and the settings that package's trusted publisher needs on npmjs.com
6. If publishing fails with an authorization error after that step passed, check that the package's trusted publisher allows publishing directly. The step can't check this, and npm defaults new trusted publishers to staged publishing only
7. Verify your Git configuration is correct
8. For changelog generation issues, ensure your GITHUB_TOKEN has adequate permissions

For more assistance, contact the core development team.
