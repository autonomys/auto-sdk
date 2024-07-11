# Autonomys SDK - Node Example

Simple list of scripts to query data and execute extrinsics:

## Install

```bash
yarn
```

## Run queries

```bash
yarn balance
yarn operators
```

## Execute extrinsics

```bash
yarn transfer
yarn register-operator
yarn nominate-operator
yarn withdraw-stake
yarn deregister-operator
yarn unlock-funds
yarn unlock-nominator
```

## Auto Id

```bash
# register certificate
yarn registry register

# self revoke certificate
yarn registry revoke <AUTO_ID_IDENTIFIER>

# deactivate auto id
yarn registry deactivate <AUTO_ID_IDENTIFIER>
```

> NOTE: Deactivation not possible for certificates that are already revoked.

## Utility

```bash
yarn address
```

## Run All

```bash
yarn all
```
