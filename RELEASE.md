# Release Process

This document describes the release process for the Autonomys Auto SDK.

## Overview

The Autonomys Auto SDK follows a structured release process that includes version management, changelog generation, and package publishing. We use:

- **Release Please**: Google's automated release tool for version management and PR creation
- **Conventional Commits**: For structured commit messages and PR titles
- **GitHub Actions**: For automating the release workflow
- **PR-Based Changelog**: We generate changelogs exclusively based on merged Pull Requests

## Release Cycle

1. **Development Phase**: Features, fixes, and improvements are developed and merged into the main branch
2. **Automated Release PR**: Release-please automatically creates a release PR when conventional commits are detected
3. **Release PR Review**: The team reviews the generated changelog and version bumps
4. **Publishing**: Once the Release PR is merged, packages are published to npm and a GitHub release is created automatically

## How Release Please Works

Release-please automates our release process by:

1. Monitoring commits to the main branch
2. Creating and maintaining a release PR when it detects conventional commits
3. Automatically determining which version to bump based on commit types:
   - `feat:` triggers a minor version bump
   - `fix:` triggers a patch version bump
   - `feat!:` or `fix!:` or any commit with `BREAKING CHANGE:` in the footer triggers a major version bump
4. Generating a changelog based on conventional commits
5. When the release PR is merged, it automatically:
   - Creates a GitHub release with the changelog
   - Tags the repository with the new version
   - Triggers the npm publishing workflow

## Pull Request Requirements

Since our changelog is exclusively generated from conventional commits, it's important that all changes follow the conventional commit format.

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

We strictly follow the conventional commits format for all commits:

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

### Automated Release Process

1. Make changes using conventional commit messages
2. Push or merge these changes to the main branch
3. Release-please will automatically create or update a release PR
4. Review the release PR and its generated changelog
5. Merge the release PR when ready to release
6. Release-please will automatically create a GitHub release and tag
7. The workflow will publish packages to npm

### Manual Release (if needed)

In rare cases where you need to manually trigger a release:

1. Ensure all changes are properly committed with conventional commit messages
2. Create a PR titled "chore: release X.Y.Z" where X.Y.Z is the version you want to release
3. Include all the changelog entries in the PR description
4. Review and merge the PR
5. Create a GitHub release and tag manually

## Changelog Format

Our automatically generated changelog follows a specific format:

1. Changes are grouped by type (Features, Bug Fixes, etc.)
2. Each entry shows the commit message and PR number
3. Breaking changes are highlighted at the top
4. Each release has its own section with a version number and date

## Troubleshooting

If you encounter issues with the release process:

1. Check that your commits follow the conventional commit format
2. Verify that the release-please workflow has the necessary permissions
3. Check GitHub Actions logs for any errors
4. Ensure npm authentication is correctly set up

For more assistance, contact the core development team.
