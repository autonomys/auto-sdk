// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/AutoStackQueue.sol";

contract DeployAutoStackQueue is Script {
    function run() external {
        vm.startBroadcast();

        AutoStackQueue autoStackQueue = new AutoStackQueue(msg.sender);

        // Example usage
        autoStackQueue.push(1);
        autoStackQueue.push(2);

        autoStackQueue.enqueue(10);
        autoStackQueue.enqueue(20);

        vm.stopBroadcast();
    }
}
