#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found in the contracts directory"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$RPC_URL" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "Error: RPC_URL and PRIVATE_KEY must be set in .env file"
    exit 1
fi

forge script scripts/WAI3.s.sol:DeployScript \
            --rpc-url $RPC_URL \
            --private-key $PRIVATE_KEY \
            --evm-version london \
            --via-ir \
            --broadcast