pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoKeyStore.sol";

contract DeployAutoKeyStore is Script {
    function run() external {
        vm.startBroadcast();

        AutoKeyStore autoKeyStore = new AutoKeyStore(msg.sender);

        // Set a key-value pair
        autoKeyStore.setValue("exampleKey", "exampleValue");

        // Retrieve the value for the key
        autoKeyStore.getValue("exampleKey");

        vm.stopBroadcast();
    }
}