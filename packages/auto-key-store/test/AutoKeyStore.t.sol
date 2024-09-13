// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoKeyStore.sol";

contract AutoKeyStoreTest is Test {
    AutoKeyStore autoKeyStore;
    address admin = address(1);
    address writer = address(2);
    address editor = address(3);
    address unauthorized = address(4);

    function setUp() public {
        vm.startPrank(admin);
        autoKeyStore = new AutoKeyStore(admin);
        autoKeyStore.grantWriterRole(writer);
        autoKeyStore.grantEditorRole(editor);
        vm.stopPrank();
    }

    /// @notice Test that a writer can set and get a value
    function testSetAndGetValue() public {
        vm.prank(writer);
        autoKeyStore.setValue("key1", "value1");
        string memory value = autoKeyStore.getValue("key1");
        assertEq(value, "value1");
    }

    /// @notice Test that an unauthorized user cannot set a value
    function testUnauthorizedCannotSetValue() public {
        vm.prank(unauthorized);
        vm.expectRevert("Access denied: No write permissions");
        autoKeyStore.setValue("key1", "value1");
    }

    /// @notice Test that an editor can set and get a value
    function testEditorCanSetValue() public {
        vm.prank(editor);
        autoKeyStore.setValue("key2", "value2");
        string memory value = autoKeyStore.getValue("key2");
        assertEq(value, "value2");
    }

    /// @notice Test setting multiple values
    function testSetMultipleValues() public {
        vm.prank(writer);
        
        string[] memory keys = new string[](2); // Declare and initialize keys array
        keys[0] = "key1";
        keys[1] = "key2";

        string[] memory values = new string[](2); // Declare and initialize values array
        values[0] = "value1";
        values[1] = "value2";

        autoKeyStore.setMultipleValues(keys, values);

        string memory value1 = autoKeyStore.getValue("key1");
        string memory value2 = autoKeyStore.getValue("key2");

        assertEq(value1, "value1");
        assertEq(value2, "value2");
    }

    /// @notice Test getting multiple values
    function testGetMultipleValues() public {
        vm.startPrank(writer);
        autoKeyStore.setValue("key1", "value1");
        autoKeyStore.setValue("key2", "value2");
        vm.stopPrank();

        string[] memory keys = new string[](2); // Declare and initialize keys array
        keys[0] = "key1";
        keys[1] = "key2";

        string[] memory values = autoKeyStore.getMultipleValues(keys);

        assertEq(values[0], "value1");
        assertEq(values[1], "value2");
    }

    /// @notice Test that only admin can grant roles
    function testOnlyAdminCanGrantRoles() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        autoKeyStore.grantWriterRole(unauthorized);
    }

    /// @notice Test that admin can grant roles
    function testAdminCanGrantRoles() public {
        vm.prank(admin);
        autoKeyStore.grantWriterRole(unauthorized);

        vm.prank(unauthorized);
        autoKeyStore.setValue("key3", "value3");
        string memory value = autoKeyStore.getValue("key3");
        assertEq(value, "value3");
    }
}
