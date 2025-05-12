#!/usr/bin/env node

/**
 * This script generates a changelog based on merged PRs.
 * It uses the GitHub API to fetch merged PRs between tags and categorizes them based on labels.
 *
 * IMPORTANT: To avoid GitHub API rate limits, set a GITHUB_TOKEN environment variable:
 * export GITHUB_TOKEN=your_github_personal_access_token
 */

// Replace require with dynamic import at the top level
let Octokit
import('@octokit/rest').then((module) => {
  Octokit = module.Octokit
  updateChangelog()
})

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const config = {
  owner: 'autonomys',
  repo: 'auto-sdk',
  changelogFile: path.join(__dirname, '..', 'CHANGELOG.md'),
  categories: {
    feat: '### Features',
    fix: '### Bug Fixes',
    docs: '### Documentation',
    refactor: '### Code Refactoring',
    perf: '### Performance Improvements',
    test: '### Tests',
    build: '### Build System',
    ci: '### CI',
    chore: '### Chores',
    style: '### Code Style',
    revert: '### Reverts',
    deps: '### Dependencies',
  },
  // Mapping from PR labels to categories
  labelToCategory: {
    feature: 'feat',
    enhancement: 'feat',
    bug: 'fix',
    documentation: 'docs',
    refactor: 'refactor',
    performance: 'perf',
    test: 'test',
    build: 'build',
    ci: 'ci',
    chore: 'chore',
    style: 'style',
    revert: 'revert',
    dependencies: 'deps',
  },
}

// Check for GitHub token
if (!process.env.GITHUB_TOKEN) {
  console.error('\n❌ ERROR: GITHUB_TOKEN environment variable not set!')
  console.error('This script requires a GitHub token to access PR data.')
  console.error('Run ./scripts/setup-github-token.sh to set it up.')
  process.exit(1)
}

// Create Octokit instance with auth token - moved to updateChangelog function
let octokit

/**
 * Get all tags sorted by date
 */
async function getTags() {
  try {
    // First get tags
    const { data: tags } = await octokit.repos.listTags({
      owner: config.owner,
      repo: config.repo,
      per_page: 100,
    })

    if (tags.length === 0) {
      console.warn('No tags found. Creating placeholder tag based on current version.')
      const currentVersion = getCurrentVersion()
      return [
        {
          name: `v${currentVersion}`,
          date: new Date(),
          sha: 'HEAD',
        },
      ]
    }

    // Sort tags by date (this requires fetching commit info for each tag)
    console.log(`Processing ${tags.length} tags...`)

    const tagsWithDates = []
    for (const tag of tags.slice(0, 10)) {
      // Limit to 10 most recent tags to avoid rate limits
      try {
        const { data: commit } = await octokit.repos.getCommit({
          owner: config.owner,
          repo: config.repo,
          ref: tag.commit.sha,
        })

        tagsWithDates.push({
          name: tag.name,
          date: new Date(commit.commit.author.date),
          sha: tag.commit.sha,
        })
      } catch (error) {
        console.warn(`Failed to get commit info for tag ${tag.name}:`, error.message)
      }
    }

    return tagsWithDates.sort((a, b) => b.date - a.date)
  } catch (error) {
    console.error('Error getting tags:', error.message)

    // Return a dummy tag based on the current version as fallback
    const currentVersion = getCurrentVersion()
    return [
      {
        name: `v${currentVersion}`,
        date: new Date(),
        sha: 'HEAD',
      },
    ]
  }
}

/**
 * Get the current version from lerna.json
 */
function getCurrentVersion() {
  try {
    const lernaConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'lerna.json'), 'utf8'),
    )
    return lernaConfig.version
  } catch (error) {
    console.error('Error reading lerna.json:', error.message)
    return '1.0.0' // Default fallback version
  }
}

/**
 * Get the next version based on current version and bump type
 */
function getNextVersion(currentVersion, bumpType = 'patch') {
  const [major, minor, patch] = currentVersion.split('.').map((part) => parseInt(part, 10))

  switch (bumpType.toLowerCase()) {
    case 'major':
      return `${major + 1}.0.0`
    case 'minor':
      return `${major}.${minor + 1}.0`
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`
  }
}

/**
 * Generate a changelog from merged PRs between two tags
 */
async function generateChangelogBetweenTags(startTag, endTag, version) {
  try {
    // Get all merged PRs between the two tags
    const dateQuery = startTag
      ? ` merged:${startTag.date.toISOString()}..${endTag ? endTag.date.toISOString() : '*'}`
      : ''

    const query = `repo:${config.owner}/${config.repo} is:pr is:merged${dateQuery}`

    console.log(`Fetching PRs with query: ${query}`)

    const { data: searchResults } = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 100,
    })

    // If no PRs found, return empty changelog
    if (searchResults.items.length === 0) {
      console.warn('No PRs found in this time period.')
      const date = new Date().toISOString().split('T')[0]

      if (version) {
        return `## [${version}] - ${date}\n\nNo changes in this version.\n\n`
      } else {
        return `## [Unreleased]\n\nNo unreleased changes yet.\n\n`
      }
    }

    // Group PRs by category
    const categorizedPRs = {}

    for (const pr of searchResults.items) {
      // Determine category from PR labels
      let category = 'chore' // Default category

      for (const label of pr.labels) {
        if (config.labelToCategory[label.name.toLowerCase()]) {
          category = config.labelToCategory[label.name.toLowerCase()]
          break
        }
      }

      // Extract the conventional commit type if present in the PR title
      const conventionalMatch = pr.title.match(
        /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:/i,
      )
      if (conventionalMatch) {
        category = conventionalMatch[1].toLowerCase()
      }

      if (!categorizedPRs[category]) {
        categorizedPRs[category] = []
      }

      // Add the PR to its category
      categorizedPRs[category].push({
        title: pr.title,
        number: pr.number,
        url: pr.html_url,
        author: pr.user.login,
        authorUrl: pr.user.html_url,
      })
    }

    // Generate the markdown
    let markdown = ''

    if (version) {
      const date = endTag
        ? endTag.date.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      markdown += `## [${version}] - ${date}\n\n`
    } else {
      markdown += `## [Unreleased]\n\n`
    }

    // Add each category and its PRs
    let hasEntries = false
    for (const [category, title] of Object.entries(config.categories)) {
      const prs = categorizedPRs[category] || []

      if (prs.length > 0) {
        hasEntries = true
        markdown += `${title}\n\n`

        for (const pr of prs) {
          // Clean the PR title
          let cleanTitle = pr.title
          if (cleanTitle.startsWith(`${category}:`)) {
            cleanTitle = cleanTitle.substring(category.length + 1).trim()
          }
          if (cleanTitle.startsWith(`${category}(`)) {
            const closingParenIndex = cleanTitle.indexOf('):')
            if (closingParenIndex !== -1) {
              cleanTitle = cleanTitle.substring(closingParenIndex + 2).trim()
            }
          }

          markdown += `- ${cleanTitle} ([#${pr.number}](${pr.url})) [@${pr.author}](${pr.authorUrl})\n`
        }

        markdown += '\n'
      }
    }

    // If no categorized PRs found, add a note
    if (!hasEntries) {
      markdown += `No categorized changes in this version.\n\n`
    }

    return markdown
  } catch (error) {
    console.error('Error generating changelog from PRs:', error.message)

    if (version) {
      return `## [${version}] - ${new Date().toISOString().split('T')[0]}\n\n### Note\n\nUnable to generate detailed changelog due to API error.\n\n`
    } else {
      return `## [Unreleased]\n\n### Note\n\nUnable to generate detailed changelog due to API error.\n\n`
    }
  }
}

/**
 * Update the changelog file
 */
async function updateChangelog() {
  try {
    octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    })

    // Get all tags
    console.log('Fetching tags...')
    const tags = await getTags()
    const currentVersion = getCurrentVersion()

    // Calculate the next version (for upcoming release)
    const bumpType = process.env.BUMP_TYPE || 'patch'
    const nextVersion = getNextVersion(currentVersion, bumpType)

    console.log(`Current version: ${currentVersion}`)
    console.log(`Next version: ${nextVersion}`)
    console.log(`Found ${tags.length} tags`)

    // Find the tag for the current version
    const currentTag = tags.find((tag) => tag.name === `v${currentVersion}`)
    const previousTag = currentTag ? tags[tags.indexOf(currentTag) + 1] : null

    // Get existing changelog content
    let changelogContent = ''
    if (fs.existsSync(config.changelogFile)) {
      changelogContent = fs.readFileSync(config.changelogFile, 'utf8')
    } else {
      // Initialize new changelog
      changelogContent = `# Changelog\n\nAll notable changes to the Autonomys Auto SDK will be documented in this file.\n\n`
    }

    console.log('Generating changelog for next version...')
    // Generate changelog for changes that will go into the next version
    const nextVersionChangelog = await generateChangelogBetweenTags(currentTag, null, nextVersion)

    console.log('Generating changelog for current version...')
    // Generate changelog for current version if it exists
    const currentVersionChangelog = currentTag
      ? await generateChangelogBetweenTags(previousTag, currentTag, currentVersion)
      : ''

    // Combine changelogs
    let newChangelog = changelogContent

    // Find existing headers
    const unreleasedHeaderRegex = /## \[Unreleased\]/
    const versionHeaderRegex = /## \[\d+\.\d+\.\d+\]/
    const nextVersionHeaderRegex = new RegExp(`## \\[${nextVersion}\\]`)

    // Add the next version changes at the top
    if (nextVersionHeaderRegex.test(newChangelog)) {
      // Replace the existing next version section
      newChangelog = newChangelog.replace(
        new RegExp(`${nextVersionHeaderRegex.source}[\\s\\S]*?(?=${versionHeaderRegex.source}|$)`),
        nextVersionChangelog.replace('## [Unreleased]', `## [${nextVersion}]`),
      )
    } else if (unreleasedHeaderRegex.test(newChangelog)) {
      // Replace the unreleased section with the next version
      newChangelog = newChangelog.replace(
        new RegExp(`${unreleasedHeaderRegex.source}[\\s\\S]*?(?=${versionHeaderRegex.source}|$)`),
        nextVersionChangelog.replace('## [Unreleased]', `## [${nextVersion}]`),
      )
    } else {
      // Add the next version section at the top
      const introEndIndex = newChangelog.indexOf('\n\n') + 2
      newChangelog =
        newChangelog.slice(0, introEndIndex) +
        nextVersionChangelog.replace('## [Unreleased]', `## [${nextVersion}]`) +
        '\n' +
        newChangelog.slice(introEndIndex)
    }

    // Add a small unreleased section after the next version
    const emptyUnreleased = '\n## [Unreleased]\n\nFuture changes will appear here.\n\n'
    if (!unreleasedHeaderRegex.test(newChangelog)) {
      const nextVersionEndIndex =
        newChangelog.indexOf(`## [${nextVersion}]`) +
        nextVersionChangelog.replace('## [Unreleased]', `## [${nextVersion}]`).length
      newChangelog =
        newChangelog.slice(0, nextVersionEndIndex) +
        emptyUnreleased +
        newChangelog.slice(nextVersionEndIndex)
    }

    // Add the current version changelog if needed and not already present
    if (currentVersionChangelog && !newChangelog.includes(`## [${currentVersion}]`)) {
      const unreleasedEndIndex = newChangelog.indexOf('## [Unreleased]') + emptyUnreleased.length
      newChangelog =
        newChangelog.slice(0, unreleasedEndIndex) +
        currentVersionChangelog +
        newChangelog.slice(unreleasedEndIndex)
    }

    // Update the links at the bottom
    let links =
      `\n\n[Unreleased]: https://github.com/${config.owner}/${config.repo}/compare/v${nextVersion}...HEAD\n` +
      `[${nextVersion}]: https://github.com/${config.owner}/${config.repo}/compare/v${currentVersion}...v${nextVersion}\n`

    if (currentTag) {
      links += `[${currentVersion}]: https://github.com/${config.owner}/${config.repo}/releases/tag/v${currentVersion}\n`
    }

    // Make sure we end with the links section
    if (newChangelog.includes('[Unreleased]:')) {
      newChangelog = newChangelog.replace(/\[Unreleased\]:.*(\n\[\d+\.\d+\.\d+\]:.*)*$/, links)
    } else {
      newChangelog += links
    }

    // Write the updated changelog
    fs.writeFileSync(config.changelogFile, newChangelog)
    console.log(`Changelog updated successfully at ${config.changelogFile}`)
  } catch (error) {
    console.error('Error updating changelog:', error)
    process.exit(1)
  }
}

// Don't immediately call updateChangelog() here anymore since we call it after importing Octokit
