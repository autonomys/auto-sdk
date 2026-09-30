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
