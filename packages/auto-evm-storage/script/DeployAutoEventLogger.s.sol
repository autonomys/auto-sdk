// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoEventLogger.sol";

contract DeployAutoEventLogger is Script {
    function run() external {
        vm.startBroadcast();

        AutoEventLogger autoEventLogger = new AutoEventLogger();

        // Example usage
        autoEventLogger.logAction("Deployed contract");

        vm.stopBroadcast();
    }
}
