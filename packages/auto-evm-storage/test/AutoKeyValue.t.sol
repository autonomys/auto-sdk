// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/AutoKeyValue.sol";

contract AutoKeyValueTest is Test {
    AutoKeyValue autoKeyValue;
    address admin = address(1);
    address writer = address(2);
    address editor = address(3);
    address unauthorized = address(4);

    function setUp() public {
        vm.startPrank(admin);
        autoKeyValue = new AutoKeyValue(admin);
        autoKeyValue.grantWriterRole(writer);
        autoKeyValue.grantEditorRole(editor);
        vm.stopPrank();
    }

    /// @notice Test that a writer can set and get a value
    function testSetAndGetValue() public {
        vm.prank(writer);
        autoKeyValue.setValue("key1", "value1");
        string memory value = autoKeyValue.getValue("key1");
        assertEq(value, "value1");
    }

    /// @notice Test that an unauthorized user cannot set a value
    function testUnauthorizedCannotSetValue() public {
        vm.prank(unauthorized);
        vm.expectRevert("Access denied: No write permissions");
        autoKeyValue.setValue("key1", "value1");
    }

    /// @notice Test that an editor can set and get a value
    function testEditorCanSetValue() public {
        vm.prank(editor);
        autoKeyValue.setValue("key2", "value2");
        string memory value = autoKeyValue.getValue("key2");
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

        autoKeyValue.setMultipleValues(keys, values);

        string memory value1 = autoKeyValue.getValue("key1");
        string memory value2 = autoKeyValue.getValue("key2");

        assertEq(value1, "value1");
        assertEq(value2, "value2");
    }

    /// @notice Test getting multiple values
    function testGetMultipleValues() public {
        vm.startPrank(writer);
        autoKeyValue.setValue("key1", "value1");
        autoKeyValue.setValue("key2", "value2");
        vm.stopPrank();

        string[] memory keys = new string[](2); // Declare and initialize keys array
        keys[0] = "key1";
        keys[1] = "key2";

        string[] memory values = autoKeyValue.getMultipleValues(keys);

        assertEq(values[0], "value1");
        assertEq(values[1], "value2");
    }

    /// @notice Test that only admin can grant roles
    function testOnlyAdminCanGrantRoles() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        autoKeyValue.grantWriterRole(unauthorized);
    }

    /// @notice Test that admin can grant roles
    function testAdminCanGrantRoles() public {
        vm.prank(admin);
        autoKeyValue.grantWriterRole(unauthorized);

        vm.prank(unauthorized);
        autoKeyValue.setValue("key3", "value3");
        string memory value = autoKeyValue.getValue("key3");
        assertEq(value, "value3");
    }
}
