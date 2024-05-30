import {
    generateRsaKeyPair,
    saveKey,
    loadPrivateKey,
} from "../src/keyManagement";

// Example usage:
const [privateKey, publicKey] = generateRsaKeyPair();
saveKey(Buffer.from(privateKey), "./privateKey.pem");
const loadedPrivateKey = loadPrivateKey("./privateKey.pem");
console.log(
    `Private keys match: ${
        loadedPrivateKey.toString() === privateKey.toString()
    }`
);
