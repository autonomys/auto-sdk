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

   `git clone https://github.com/autonomys/auto-sdk.git`

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

To test the packages against a local node, you can use the script at `scripts/run-dev.js`.

1. Verify that the line 3-7 of the bash script in `scripts/download.sh` matches your current OS and architecture.

   ```bash
   # Change the following variables as needed
   # OS to download
   OS="macos" # macos | ubuntu | windows
   # Architecture to download
   ARCHITECTURE="aarch64" # aarch64 | x86_64-skylake | x86_64-v2
   ```

2. Run the script:

   ```bash
   node scripts/run-dev.js
   ```

   This script will:

   - Download the latest version of the node and farmer for your OS and architecture (`scripts/download.sh`);
   - Start the node, create and insert the keystore in the node (`scripts/run-node.sh`);
   - Start the farmer (`scripts/run-farmer.sh`);
   - Register the node as operator, wait and kill the node and farmer (inside `scripts/run-dev.js`);
   - Start the node as an operator (`scripts/run-operator.sh`);
   - Restart the farmer (`scripts/run-farmer.sh`).

3. Run the tests:

   ```bash
   bash scripts/localhost-run-test.sh
   ```

   The tests will detect the local node and farmer and run the tests against them instead of the public testnet.

## Workspaces

This project uses workspaces. Packages are located in the `packages` directory. Each package can have its own dependencies and build scripts.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
