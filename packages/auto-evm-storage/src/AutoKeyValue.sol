// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AutoKeyValue is AccessControl {
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");
    bytes32 public constant EDITOR_ROLE = keccak256("EDITOR_ROLE");

    mapping(string => string) private store;

    event KeyValueSet(string indexed key, string value);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setValue(string memory key, string memory value) public {
        require(
            hasRole(WRITER_ROLE, msg.sender) || hasRole(EDITOR_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        store[key] = value;
        emit KeyValueSet(key, value);
    }

    function getValue(string memory key) public view returns (string memory) {
        return store[key];
    }

    function grantWriterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WRITER_ROLE, account);
    }

    function grantEditorRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(EDITOR_ROLE, account);
    }

    function setMultipleValues(string[] memory keys, string[] memory values) public {
        require(keys.length == values.length, "Keys and values arrays must have the same length");
        require(
            hasRole(WRITER_ROLE, msg.sender) || hasRole(EDITOR_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        for (uint i = 0; i < keys.length; i++) {
            store[keys[i]] = values[i];
            emit KeyValueSet(keys[i], values[i]);
        }
    }

    function getMultipleValues(string[] memory keys) public view returns (string[] memory) {
        string[] memory values = new string[](keys.length);
        for (uint i = 0; i < keys.length; i++) {
            values[i] = store[keys[i]];
        }
        return values;
    }
}
