// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AutoEnumerableMap is AccessControl {
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    mapping(bytes32 => bytes32) private map;
    bytes32[] private keys;

    event KeyValueSet(bytes32 indexed key, bytes32 value);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function set(bytes32 key, bytes32 value) public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );

        if (map[key] == bytes32(0)) {
            keys.push(key);
        }

        map[key] = value;
        emit KeyValueSet(key, value);
    }

    function get(bytes32 key) public view returns (bytes32) {
        return map[key];
    }

    function getKeys() public view returns (bytes32[] memory) {
        return keys;
    }

    function grantWriterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WRITER_ROLE, account);
    }
}
