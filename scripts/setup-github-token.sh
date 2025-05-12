#!/bin/bash

# This script helps set up the GitHub token for changelog generation

echo "===== GitHub Token Setup for PR-Based Changelog Generation ====="
echo ""
echo "This script will help you set up a GitHub token for generating PR-based changelogs."
echo ""

# Check if token already exists
if [ -n "$GITHUB_TOKEN" ]; then
  echo "GitHub token is already set in your environment."
  echo "Current token: ${GITHUB_TOKEN:0:4}...${GITHUB_TOKEN: -4}"
  echo ""
  read -p "Do you want to replace it? (y/n): " replace_token
  if [[ "$replace_token" != "y" && "$replace_token" != "Y" ]]; then
    echo "Keeping existing token. Exiting."
    exit 0
  fi
fi

echo "You need a GitHub Personal Access Token (PAT) with 'repo' scope to access PR data."
echo ""
echo "How to create a GitHub PAT:"
echo "1. Go to https://github.com/settings/tokens"
echo "2. Click 'Generate new token' (classic)"
echo "3. Give it a name like 'Autonomys SDK Changelog Generator'"
echo "4. Select the 'repo' scope"
echo "5. Click 'Generate token'"
echo "6. Copy the generated token"
echo ""

read -p "Paste your GitHub token: " github_token

if [ -z "$github_token" ]; then
  echo "No token provided. Exiting."
  exit 1
fi

# Determine shell configuration file
shell_config=""
if [ -n "$ZSH_VERSION" ]; then
  shell_config="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
  shell_config="$HOME/.bashrc"
else
  echo "Unknown shell. Please manually add the token to your shell configuration."
  echo "Add this line: export GITHUB_TOKEN=your_token_here"
  exit 1
fi

# Check if token already exists in the config file
if grep -q "export GITHUB_TOKEN=" "$shell_config"; then
  # Update existing token
  sed -i.bak "s|export GITHUB_TOKEN=.*|export GITHUB_TOKEN=\"$github_token\"|" "$shell_config"
  echo "Updated existing GITHUB_TOKEN in $shell_config"
else
  # Add new token
  echo "" >> "$shell_config"
  echo "# GitHub token for Autonomys SDK changelog generation" >> "$shell_config"
  echo "export GITHUB_TOKEN=$github_token" >> "$shell_config"
  echo "Added GITHUB_TOKEN to $shell_config"
fi

# Export for current session
export GITHUB_TOKEN="$github_token"

echo ""
echo "GitHub token has been set up!"
echo "To use it in your current terminal session, run:"
echo "  source $shell_config"
echo ""
echo "You can now generate PR-based changelogs with:"
echo "  yarn changelog"
echo ""
echo "To specify a version bump type (default is patch):"
echo "  BUMP_TYPE=minor yarn changelog"
echo "  BUMP_TYPE=major yarn changelog"
echo ""
echo "The changelog will show the next version at the top, based on the bump type."
echo ""
echo "To verify your token is working:"
echo "  node -e \"console.log('Token (first/last 4 chars):', process.env.GITHUB_TOKEN.substring(0, 4) + '...' + process.env.GITHUB_TOKEN.slice(-4))\"" 