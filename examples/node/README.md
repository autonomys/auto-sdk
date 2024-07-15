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
yarn autoid-register

# self revoke certificate
yarn autoid-revoke

# deactivate auto id
yarn autoid-deactivate

# renew auto id
yarn autoid-renew

# view certificate
yarn autoid-view-cert <AUTO_ID_IDENTIFIER>

# view revoked certificates
yarn autoid-view-revoked-certs
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
