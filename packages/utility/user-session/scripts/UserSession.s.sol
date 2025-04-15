// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script } from "forge-std/Script.sol";
import { UserSession } from "../src/UserSession.sol";
import { console } from "forge-std/console.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public returns (UserSession) {
        // Log deployment info
        console.log("Deploying UserSession contract");
        console.log("Deployer address:", msg.sender);
        console.log("Chain ID:", block.chainid);

        // Begin sending transactions
        vm.startBroadcast();

        // Deploy UserSession contract
        UserSession userSession = new UserSession();
        console.log("UserSession deployed to:", address(userSession));

        // Stop sending transactions
        vm.stopBroadcast();

        return userSession;
    }
}