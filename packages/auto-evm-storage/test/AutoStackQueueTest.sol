// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoStackQueue.sol";

contract AutoStackQueueTest is Test {
    AutoStackQueue autoStackQueue;
    address admin = address(1);
    address writer = address(2);
    address unauthorized = address(3);

    function setUp() public {
        vm.startPrank(admin);
        autoStackQueue = new AutoStackQueue(admin);
        autoStackQueue.grantWriterRole(writer);
        vm.stopPrank();
    }

    function testStackPushAndPop() public {
        vm.prank(writer);
        autoStackQueue.push(1);
        autoStackQueue.push(2);
        autoStackQueue.push(3);

        assertEq(autoStackQueue.stackTop(), 3);
        assertEq(autoStackQueue.stackSize(), 3);

        autoStackQueue.pop();
        assertEq(autoStackQueue.stackTop(), 2);
        assertEq(autoStackQueue.stackSize(), 2);

        autoStackQueue.pop();
        autoStackQueue.pop();
        assertEq(autoStackQueue.stackSize(), 0);
    }

    function testQueueEnqueueAndDequeue() public {
        vm.prank(writer);
        autoStackQueue.enqueue(10);
        autoStackQueue.enqueue(20);
        autoStackQueue.enqueue(30);

        assertEq(autoStackQueue.queueFront(), 10);
        assertEq(autoStackQueue.queueSize(), 3);

        autoStackQueue.dequeue();
        assertEq(autoStackQueue.queueFront(), 20);
        assertEq(autoStackQueue.queueSize(), 2);

        autoStackQueue.dequeue();
        autoStackQueue.dequeue();
        assertEq(autoStackQueue.queueSize(), 0);
    }

    function testUnauthorizedCannotModify() public {
        vm.prank(unauthorized);
        vm.expectRevert("Access denied: No write permissions");
        autoStackQueue.push(100);

        vm.prank(unauthorized);
        vm.expectRevert("Access denied: No write permissions");
        autoStackQueue.enqueue(200);
    }
}
