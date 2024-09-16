// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoMultiMap.sol";

contract DeployAutoMultiMap is Script {
    function run() external {
        vm.startBroadcast();

        AutoMultiMap autoMultiMap = new AutoMultiMap(msg.sender);

        // Example usage
        bytes32 key = keccak256(abi.encodePacked("exampleKey"));
        bytes32 value1 = keccak256(abi.encodePacked("value1"));
        bytes32 value2 = keccak256(abi.encodePacked("value2"));
        autoMultiMap.addValue(key, value1);
        autoMultiMap.addValue(key, value2);

        vm.stopBroadcast();
    }
}
