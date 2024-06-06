# Autonomys Auto SDK Monorepo

This monorepo contains multiple packages for the Autonomys Auto SDK, including utility, consensus and identity functions.

## Structure

The repository is organized as follows:

- `packages/auto-utils`: Utility functions for the SDK.
- `packages/auto-consensus`: Consensus functions.
- `packages/auto-id`: Identity functions.

## Requirements

- Node.js
- Yarn 4

## Setup

1. **Clone the repository:**

   `git clone https://github.com/subspace/auto-sdk.git`

2. **Navigate to the project directory:**

   `cd auto-sdk`

3. **Set Yarn to use the Berry version:**

   `yarn set version berry`

4. **Install dependencies:**

   `yarn install`

## Scripts

### Build

To build all packages:

`yarn run build`

### Test

To run tests for all packages:

`yarn run test`

### Localhost testing

To test the packages against a local node, you can use the script at `scripts/localhost.sh`.

1. Verify that the line 3-7 of the script matches your current OS and architecture.

   ```bash
   # Change the following variables as needed
   # OS to download
   OS="macos" # macos | ubuntu | windows
   # Architecture to download
   ARCHITECTURE="aarch64" # aarch64 | x86_64-skylake | x86_64-v2
   ```

2. Run the script:

   ```bash
   ./scripts/localhost.sh
   ```

   This script will download the latest version of the node and farmer for your OS and architecture, start the node, and farmer

3. Run the tests:

   ```bash
   bash scripts/localhost-run-test.sh
   ```

   The tests will detect the local node and farmer and run the tests against them instead of the public testnet.

## Workspaces

This project uses workspaces. Packages are located in the `packages` directory. Each package can have its own dependencies and build scripts.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
