// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoEnumerableMap.sol";

contract AutoEnumerableMapTest is Test {
    AutoEnumerableMap autoEnumerableMap;
    address admin = address(1);
    address writer = address(2);
    address unauthorized = address(3);

    function setUp() public {
        vm.startPrank(admin);
        autoEnumerableMap = new AutoEnumerableMap(admin);
        autoEnumerableMap.grantWriterRole(writer);
        vm.stopPrank();
    }

    function testSetAndGet() public {
        vm.prank(writer);
        bytes32 key = keccak256(abi.encodePacked("key1"));
        bytes32 value = keccak256(abi.encodePacked("value1"));
        autoEnumerableMap.set(key, value);

        bytes32 retrievedValue = autoEnumerableMap.get(key);
        assertEq(retrievedValue, value);
    }

    function testUnauthorizedCannotSet() public {
        vm.prank(unauthorized);
        bytes32 key = keccak256(abi.encodePacked("key1"));
        bytes32 value = keccak256(abi.encodePacked("value1"));
        vm.expectRevert("Access denied: No write permissions");
        autoEnumerableMap.set(key, value);
    }

    function testGetKeys() public {
        vm.prank(writer);
        bytes32 key1 = keccak256(abi.encodePacked("key1"));
        bytes32 value1 = keccak256(abi.encodePacked("value1"));
        autoEnumerableMap.set(key1, value1);

        bytes32 key2 = keccak256(abi.encodePacked("key2"));
        bytes32 value2 = keccak256(abi.encodePacked("value2"));
        autoEnumerableMap.set(key2, value2);

        bytes32[] memory keys = autoEnumerableMap.getKeys();
        assertEq(keys.length, 2);
        assertEq(keys[0], key1);
        assertEq(keys[1], key2);
    }

    function testGrantWriterRole() public {
        vm.prank(admin);
        autoEnumerableMap.grantWriterRole(unauthorized);

        bytes32 key = keccak256(abi.encodePacked("key3"));
        bytes32 value = keccak256(abi.encodePacked("value3"));
        vm.prank(unauthorized);
        autoEnumerableMap.set(key, value);

        bytes32 retrievedValue = autoEnumerableMap.get(key);
        assertEq(retrievedValue, value);
    }
}
