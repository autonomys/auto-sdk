import * as fs from 'fs'
import * as path from 'path'

// Ensure the abi directory exists
const abiDir = path.join(__dirname, '..', 'src', 'abi')
if (!fs.existsSync(abiDir)) {
  fs.mkdirSync(abiDir, { recursive: true })
}

try {
  // Read the contract JSON file
  const contractPath = path.join(__dirname, '..', 'out', 'UserSession.sol', 'UserSession.json')
  const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf-8'))

  // Extract the ABI
  const abi = contractJson.abi

  // Write the ABI to a new file
  const abiPath = path.join(abiDir, 'UserSession.json')
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2))

  console.log('ABI successfully extracted and saved to:', abiPath)
} catch (error) {
  console.error('Error:', error)
}
