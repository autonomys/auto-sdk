#!/bin/bash

# Set the base-path and domain-id variables
BASE_PATH="executables/node-temp"
DOMAIN_ID=0

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Create keystore...${NC}\n"

# Instructions for setting variables
echo -e "Using base-path: ${GREEN}$BASE_PATH${NC}"
echo -e "Using domain-id: ${GREEN}$DOMAIN_ID${NC}\n"
echo -e "${YELLOW}You can change these variables at the top of the script.${NC}"

# Create keystore
output=$(./executables/node domain key create --base-path "$BASE_PATH" --domain-id "$DOMAIN_ID")

# # Log the result of the first command
echo "$output"

# Extract the seed
seed=$(echo "$output" | grep "Seed:" | awk -F '"' '{print $2}')

# Check if seed was extracted
if [ -z "$seed" ]; then
  echo -e "${RED}Failed to extract seed from the output.${NC}"
  exit 1
fi

# Insert keystore with the extracted seed
echo -e "\n${YELLOW}Insert keystore...${NC}"
./executables/node domain key insert --base-path "$BASE_PATH" --domain-id "$DOMAIN_ID" --keystore-suri "$seed"
# Run node
echo -e "${GREEN}Keystore created successfully!${NC}"

# Run an node
echo "Running an node..."
./executables/node run --dev --farmer --timekeeper --base-path executables/node-temp --name "localhost-node" --rpc-rate-limit 1000 --rpc-max-connections 10000 --state-pruning archive-canonical --blocks-pruning 512 --rpc-cors all --force-synced --force-authoring