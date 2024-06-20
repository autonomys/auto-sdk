#!/bin/bash

# Set the base-path and domain-id variables
BASE_PATH="executables/node-temp"
DOMAIN_ID=0

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Instructions for setting variables
echo -e "Using base-path: ${GREEN}$BASE_PATH${NC}"
echo -e "Using domain-id: ${GREEN}$DOMAIN_ID${NC}\n"
echo -e "${YELLOW}You can change these variables at the top of the script.${NC}"

# Run an operator
echo "Running an operator..."
./executables/node run --dev --farmer --timekeeper --base-path "$BASE_PATH" --name "localhost-operator" --rpc-rate-limit 1000 --rpc-max-connections 10000 --state-pruning archive-canonical --blocks-pruning archive-canonical --rpc-cors all --force-synced --force-authoring -- --domain-id 0 --operator-id 1 --state-pruning archive-canonical --blocks-pruning 512 --rpc-cors all