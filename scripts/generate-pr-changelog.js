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
 * Compare two semantic versions
 * @param {string} a - First version (e.g., "1.2.3")
 * @param {string} b - Second version (e.g., "1.2.4")
 * @returns {number} - Negative if a < b, positive if a > b, 0 if equal
 */
function compareVersions(a, b) {
  // Remove 'v' prefix if present
  const cleanA = a.replace(/^v/, '')
  const cleanB = b.replace(/^v/, '')

  const partsA = cleanA.split('.').map((x) => parseInt(x, 10) || 0)
  const partsB = cleanB.split('.').map((x) => parseInt(x, 10) || 0)

  // Ensure both arrays have the same length
  const maxLength = Math.max(partsA.length, partsB.length)
  while (partsA.length < maxLength) partsA.push(0)
  while (partsB.length < maxLength) partsB.push(0)

  for (let i = 0; i < maxLength; i++) {
    if (partsA[i] !== partsB[i]) {
      return partsA[i] - partsB[i]
    }
  }

  return 0
}

/**
 * Remove Markdown link reference definitions from a changelog content string.
 * This prevents duplicating definitions like [Unreleased]: ... and [x.y.z]: ...
 * when we later append freshly computed links at the end of the file.
 *
 * @param {string} content
 * @returns {string}
 */
function removeLinkReferenceDefinitionsForLabels(content, labels) {
  if (!content) return content
  if (!Array.isArray(labels) || labels.length === 0) return content

  const pattern = new RegExp(
    `^\\[(?:${labels.map((l) => l.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\]:\\s+\\S+`,
    'i',
  )

  const lines = content.split('\n')
  const filtered = lines.filter((line) => !pattern.test(line.trim()))
  return filtered.join('\n')
}

/**
 * Get all tags sorted by semantic version (descending)
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

    // Sort by semantic version (descending - newest first)
    return tagsWithDates.sort((a, b) => compareVersions(b.name, a.name))
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
 * Extract version sections from changelog content
 */
function extractVersionSections(content) {
  const sections = []
  const lines = content.split('\n')
  let currentSection = null
  let currentContent = []

  for (const line of lines) {
    const versionMatch = line.match(/^## \[([^\]]+)\]/)
    if (versionMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          version: currentSection,
          content: currentContent.join('\n'),
        })
      }

      // Start new section
      currentSection = versionMatch[1]
      currentContent = [line]
    } else if (currentSection) {
      currentContent.push(line)
    }
  }

  // Add the last section
  if (currentSection) {
    sections.push({
      version: currentSection,
      content: currentContent.join('\n'),
    })
  }

  return sections
}

/**
 * Rebuild changelog with proper version ordering
 */
function rebuildChangelog(sections, header) {
  // Sort sections by version (Unreleased first, then by semantic version descending)
  const sortedSections = sections.sort((a, b) => {
    if (a.version === 'Unreleased') return -1
    if (b.version === 'Unreleased') return 1
    return compareVersions(b.version, a.version)
  })

  let content = header
  for (const section of sortedSections) {
    // Normalize section spacing to avoid extra blank lines between sections
    const normalizedSection = (section.content || '').replace(/\s+$/g, '')
    content += normalizedSection + '\n\n'
  }

  return content.trim()
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
    let changelogHeader =
      '# Changelog\n\nAll notable changes to the Autonomys Auto SDK will be documented in this file.\n\n'

    if (fs.existsSync(config.changelogFile)) {
      changelogContent = fs.readFileSync(config.changelogFile, 'utf8')
      // Extract header (everything before first version section)
      const firstVersionMatch = changelogContent.match(/^([\s\S]*?)## \[/m)
      if (firstVersionMatch) {
        changelogHeader = firstVersionMatch[1]
      }
    }

    console.log('Generating changelog for next version...')
    // Generate changelog for changes that will go into the next version
    const nextVersionChangelog = await generateChangelogBetweenTags(currentTag, null, nextVersion)

    console.log('Generating changelog for current version...')
    // Generate changelog for current version if it exists
    const currentVersionChangelog = currentTag
      ? await generateChangelogBetweenTags(previousTag, currentTag, currentVersion)
      : ''

    // Extract existing version sections
    const existingSections = extractVersionSections(changelogContent)

    // Update or add the next version section
    const nextVersionSection = {
      version: nextVersion,
      content: nextVersionChangelog.replace('## [Unreleased]', `## [${nextVersion}]`).trim(),
    }

    // Update or add the current version section
    const currentVersionSection = currentVersionChangelog
      ? {
          version: currentVersion,
          content: currentVersionChangelog.trim(),
        }
      : null

    // Combine all sections
    const allSections = [...existingSections]

    // Update or add next version
    const nextVersionIndex = allSections.findIndex((s) => s.version === nextVersion)
    if (nextVersionIndex !== -1) {
      allSections[nextVersionIndex] = nextVersionSection
    } else {
      allSections.push(nextVersionSection)
    }

    // Update or add current version
    if (currentVersionSection) {
      const currentVersionIndex = allSections.findIndex((s) => s.version === currentVersion)
      if (currentVersionIndex !== -1) {
        allSections[currentVersionIndex] = currentVersionSection
      } else {
        allSections.push(currentVersionSection)
      }
    }

    // Ensure there's an Unreleased section
    const unreleasedIndex = allSections.findIndex((s) => s.version === 'Unreleased')
    if (unreleasedIndex === -1) {
      allSections.push({
        version: 'Unreleased',
        content: '## [Unreleased]\n\nFuture changes will appear here.',
      })
    }

    // Rebuild changelog with proper ordering
    let newChangelog = rebuildChangelog(allSections, changelogHeader)

    // Remove existing link reference definitions for the labels we're about to append
    const labelsToReplace = ['Unreleased', nextVersion]
    if (currentTag) labelsToReplace.push(currentVersion)
    newChangelog = removeLinkReferenceDefinitionsForLabels(newChangelog, labelsToReplace)

    // Add version links at the bottom
    let links = `\n\n[Unreleased]: https://github.com/${config.owner}/${config.repo}/compare/v${nextVersion}...HEAD\n`
    links += `[${nextVersion}]: https://github.com/${config.owner}/${config.repo}/compare/v${currentVersion}...v${nextVersion}\n`

    if (currentTag) {
      links += `[${currentVersion}]: https://github.com/${config.owner}/${config.repo}/releases/tag/v${currentVersion}\n`
    }

    const finalChangelog = newChangelog + links

    // Write the updated changelog
    fs.writeFileSync(config.changelogFile, finalChangelog)
    console.log(`Changelog updated successfully at ${config.changelogFile}`)
  } catch (error) {
    console.error('Error updating changelog:', error)
    process.exit(1)
  }
}
