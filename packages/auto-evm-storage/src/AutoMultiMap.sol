// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AutoMultiMap is AccessControl {
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    mapping(bytes32 => bytes32[]) private multimap;

    event ValueAdded(bytes32 indexed key, bytes32 value);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function addValue(bytes32 key, bytes32 value) public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        multimap[key].push(value);
        emit ValueAdded(key, value);
    }

    function getValues(bytes32 key) public view returns (bytes32[] memory) {
        return multimap[key];
    }

    function grantWriterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WRITER_ROLE, account);
    }
}
