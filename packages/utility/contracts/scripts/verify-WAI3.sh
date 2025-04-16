#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found in the contracts directory"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$CONTRACT_ADDRESS" ] || [ -z "$BLOCKSCOUT_API" ]; then
    echo "Error: CONTRACT_ADDRESS and BLOCKSCOUT_API must be set in .env file"
    exit 1
fi

forge verify-contract \
            --verifier blockscout \
            --verifier-url $BLOCKSCOUT_API \
            --evm-version london --chain 490000 --compiler-version 0.8.28 \
            --watch \
            $CONTRACT_ADDRESS \
            src/WAI3.sol:WAI3