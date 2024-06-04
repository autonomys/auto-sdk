# Autonomys Auto SDK Monorepo

This monorepo contains multiple packages for the Autonomys Auto SDK, including utility, consensus and identity functions.

## Structure

The repository is organized as follows:

- `packages/auto-utils`: Utility functions for the SDK.
- `packages/auto-consensus`: Consensus functions.
- `packages/auto-id`: Identity functions.

## Requirements

- Node.js
- Yarn 2 (Berry) or later

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

`yarn build`

### Test

To run tests for all packages:

`yarn test`

## Workspaces

This project uses Yarn workspaces. Packages are located in the `packages` directory. Each package can have its own dependencies and build scripts.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
