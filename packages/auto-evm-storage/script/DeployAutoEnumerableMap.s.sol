// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoEnumerableMap.sol";

contract DeployAutoEnumerableMap is Script {
    function run() external {
        vm.startBroadcast();

        AutoEnumerableMap autoEnumerableMap = new AutoEnumerableMap(msg.sender);

        // Example usage
        bytes32 key = keccak256(abi.encodePacked("exampleKey"));
        bytes32 value = keccak256(abi.encodePacked("exampleValue"));
        autoEnumerableMap.set(key, value);

        vm.stopBroadcast();
    }
}
