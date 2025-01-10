pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoKeyValue.sol";

contract DeployAutoKeyValue is Script {
    function run() external {
        vm.startBroadcast();

        AutoKeyValue autoKeyValue = new AutoKeyValue(msg.sender);

        // Set a key-value pair
        autoKeyValue.setValue("exampleKey", "exampleValue");

        // Retrieve the value for the key
        autoKeyValue.getValue("exampleKey");

        vm.stopBroadcast();
    }
}