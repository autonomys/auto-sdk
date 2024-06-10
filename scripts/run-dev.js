const { spawn } = require('node:child_process')
const { readdir, readFile } = require('node:fs/promises')
const { ApiPromise, Keyring, WsProvider } = require('@polkadot/api')
const { u8aToHex } = require('@polkadot/util')
const { createType } = require('@polkadot/types')

let runner = {
  node: null,
  farmer: null,
}
let operatorRegistered = false

function downloadNodeAndFarmer() {
  console.log('First lets download the node and farmer')
  const download = spawn('bash', ['scripts/download.sh'])

  download.stdout.on('data', (data) => {
    const message = data.toString()
    console.log('\x1b[33m', 'Download: ', '\x1b[0m', message)

    if (message.includes('Downloaded and unzipped the latest node and farmer assets.'))
      runner.node = runSimpleNode()
  })
  download.stderr.on('data', (data) => console.error(`First script error: ${data}`))
  download.on('close', (code) => console.log(`First script exited with code ${code}`))
  return download
}

function runSimpleNode() {
  console.log('Now lets start a simple node.')
  const node = spawn('bash', ['scripts/run-node.sh'])
  let farmerStarted = false

  node.stdout.on('data', (data) => {
    const message = data.toString()
    console.log('\x1b[36m', 'Node: ', '\x1b[0m', message)

    if (!farmerStarted && message.includes('Idle (0 peers)')) {
      farmerStarted = true
      runner.farmer = runFarmer()
    }
  })
  node.stderr.on('data', (data) => console.error('\x1b[31m', 'Node error: ', '\x1b[0m', data))
  node.on('close', (code) => console.log('\x1b[31m', 'Node exited with code: ', '\x1b[0m', code))
  return node
}

function runFarmer() {
  console.log('Now lets start the farmer.')
  const farmer = spawn('bash', ['scripts/run-farmer.sh'])

  farmer.stdout.on('data', (data) => {
    const message = data.toString()
    console.log('\x1b[35m', 'Farmer: ', '\x1b[0m', message)

    if (!operatorRegistered && message.includes('Successfully signed reward hash')) {
      operatorRegistered = true
      registerOperator()
    }
  })
  farmer.stderr.on('data', (data) => console.error('\x1b[31m', 'Farmer error: ', '\x1b[0m', data))
  farmer.on('close', (code) =>
    console.log('\x1b[31m', 'Farmer exited with code: ', '\x1b[0m', code),
  )
  return farmer
}

function runOperatorNode() {
  console.log('Now lets start a operator node.')
  const operator = spawn('bash', ['scripts/run-operator.sh'])
  let farmerStarted = false

  operator.stdout.on('data', (data) => {
    const message = data.toString()
    console.log('\x1b[32m', 'Operator: ', '\x1b[0m', message)

    if (!farmerStarted && message.includes('Idle (0 peers)')) {
      farmerStarted = true
      runner.farmer = runFarmer()
    }
  })
  operator.stderr.on('data', (data) =>
    console.error('\x1b[31m', 'Operator error: ', '\x1b[0m', data),
  )
  operator.on('close', (code) =>
    console.log('\x1b[31m', 'Operator exited with code: ', '\x1b[0m', code),
  )
  return operator
}

async function registerOperator() {
  console.log('Now lets register the operator.')

  const keystorePath = 'executables/node-temp/domains/0/keystore/'
  const files = await readdir(keystorePath)
  if (files.length === 0) throw new Error('No files found in keystore directory.')

  // Read the contents of the first file in the directory
  const seedFile = await readFile(`${keystorePath}/${files[0]}`, 'utf-8')
  const seed = seedFile.trim().replace(/"/g, '') // Extract and clean the seed

  // Create the provider
  const provider = new WsProvider('ws://127.0.0.1:9944/ws')
  // Create the API instance
  const api = await ApiPromise.create({ provider })

  const AliceKeyring = new Keyring({ type: 'sr25519' })
  const OperatorKeyring = new Keyring({ type: 'sr25519' })

  const Alice = AliceKeyring.addFromUri('//Alice')
  const Operator = OperatorKeyring.addFromUri(seed)

  const message = createType(api.registry, 'AccountId', Alice.address)
  const signingKey = u8aToHex(Operator.publicKey)
  const signature = Operator.sign(message.toU8a())

  const tx = await api.tx.domains.registerOperator(
    '0',
    '100000000000000000000',
    {
      signingKey,
      minimumNominatorStake: '1000000000000000000',
      nominationTax: '2',
    },
    signature,
  )

  await new Promise((resolve, reject) => {
    tx.signAndSend(Alice, ({ status }) => {
      if (status.isInBlock) {
        txHash = status.asInBlock.toHex()
        console.log(
          '\x1b[33m',
          'Registering operator: ',
          '\x1b[0m',
          'Successful transaction with tx.hash ' + txHash,
        )
        // Wait for 12 seconds before killing the node and farmer to make sure the operator is registered
        setTimeout(() => {
          console.log('\x1b[33m', 'Registering operator: ', '\x1b[0m', 'Killing node and farmer.')
          runner.node.kill()
          runner.farmer.kill()
          console.log('\x1b[33m', 'Registering operator: ', '\x1b[0m', 'Node and farmer killed.')

          // Wait for 2 seconds before starting the operator node
          setTimeout(() => {
            runner.node = runOperatorNode()
          }, 2000)
        }, 12000)

        resolve()
      } else if (
        status.isRetracted ||
        status.isFinalityTimeout ||
        status.isDropped ||
        status.isInvalid
      ) {
        console.log('\x1b[31m', 'Registering operator: ', '\x1b[0m', 'Transaction failed')
        reject(new Error('Transaction failed'))
      } else {
        console.log('\x1b[33m', 'Registering operator: ', '\x1b[0m', 'Status of tx: ' + status.type)
      }
    })
  })

  await api.disconnect()
}

downloadNodeAndFarmer()
