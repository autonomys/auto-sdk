// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { WAI3 } from "../src/WAI3.sol";
import { console } from "forge-std/console.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public returns (WAI3) {
        // Log deployment info
        console.log("Deploying WAI3 contract");
        console.log("Deployer address:", msg.sender);
        console.log("Chain ID:", block.chainid);

        // Begin sending transactions
        vm.startBroadcast();

        // Deploy WAI3 contract
        WAI3 wai3 = new WAI3();
        console.log("WAI3 deployed to:", address(wai3));

        // Stop sending transactions
        vm.stopBroadcast();

        return wai3;
    }
}