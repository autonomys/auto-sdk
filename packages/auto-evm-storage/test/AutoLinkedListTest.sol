// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoLinkedList.sol";

contract AutoLinkedListTest is Test {
    AutoLinkedList autoLinkedList;
    address admin = address(1);
    address writer = address(2);
    address unauthorized = address(3);

    function setUp() public {
        vm.startPrank(admin);
        autoLinkedList = new AutoLinkedList(admin);
        autoLinkedList.grantWriterRole(writer);
        vm.stopPrank();
    }

    function testAddAndGetNode() public {
        vm.prank(writer);
        autoLinkedList.addNode(100);

        (uint256 data, uint256 next) = autoLinkedList.getNode(0);
        assertEq(data, 100);
        assertEq(next, type(uint256).max);
    }

    function testTraverse() public {
        vm.prank(writer);
        autoLinkedList.addNode(100);
        autoLinkedList.addNode(200);
        autoLinkedList.addNode(300);

        uint256[] memory dataList = autoLinkedList.traverse();
        assertEq(dataList.length, 3);
        assertEq(dataList[0], 300);
        assertEq(dataList[1], 200);
        assertEq(dataList[2], 100);
    }

    function testUnauthorizedCannotAddNode() public {
        vm.prank(unauthorized);
        vm.expectRevert("Access denied: No write permissions");
        autoLinkedList.addNode(400);
    }
}
