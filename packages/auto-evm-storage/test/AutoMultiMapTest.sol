// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoMultiMap.sol";

contract AutoMultiMapTest is Test {
    AutoMultiMap autoMultiMap;
    address admin = address(1);
    address writer = address(2);
    address unauthorized = address(3);

    function setUp() public {
        vm.startPrank(admin);
        autoMultiMap = new AutoMultiMap(admin);
        autoMultiMap.grantWriterRole(writer);
        vm.stopPrank();
    }

    function testAddAndGetValues() public {
        vm.prank(writer);
        bytes32 key = keccak256(abi.encodePacked("key1"));
        bytes32 value1 = keccak256(abi.encodePacked("value1"));
        bytes32 value2 = keccak256(abi.encodePacked("value2"));
        autoMultiMap.addValue(key, value1);
        autoMultiMap.addValue(key, value2);

        bytes32[] memory values = autoMultiMap.getValues(key);
        assertEq(values.length, 2);
        assertEq(values[0], value1);
        assertEq(values[1], value2);
    }

    function testUnauthorizedCannotAddValue() public {
        vm.prank(unauthorized);
        bytes32 key = keccak256(abi.encodePacked("key1"));
        bytes32 value = keccak256(abi.encodePacked("value1"));
        vm.expectRevert("Access denied: No write permissions");
        autoMultiMap.addValue(key, value);
    }

    function testGrantWriterRole() public {
        vm.prank(admin);
        autoMultiMap.grantWriterRole(unauthorized);

        vm.prank(unauthorized);
        bytes32 key = keccak256(abi.encodePacked("key2"));
        bytes32 value = keccak256(abi.encodePacked("value3"));
        autoMultiMap.addValue(key, value);

        bytes32[] memory values = autoMultiMap.getValues(key);
        assertEq(values.length, 1);
        assertEq(values[0], value);
    }
}
