// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoEventLogger.sol";

contract AutoEventLoggerTest is Test {
    AutoEventLogger autoEventLogger;
    address user1 = address(1);
    address user2 = address(2);

    function setUp() public {
        autoEventLogger = new AutoEventLogger();
    }

    function testLogAction() public {
        vm.prank(user1);
        autoEventLogger.logAction("User1 did something");

        vm.prank(user2);
        autoEventLogger.logAction("User2 did something else");

        uint256 count = autoEventLogger.getEventsCount();
        assertEq(count, 2);

        AutoEventLogger.Event memory event1 = autoEventLogger.getEvent(0);
        assertEq(event1.user, user1);
        assertEq(event1.action, "User1 did something");

        AutoEventLogger.Event memory event2 = autoEventLogger.getEvent(1);
        assertEq(event2.user, user2);
        assertEq(event2.action, "User2 did something else");
    }
}
