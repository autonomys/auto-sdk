// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

contract UserSession {
    mapping(address => mapping(uint256 => bytes)) public appUserSessions;


    function setUserSession(uint256 userId, bytes memory userSessionCID) public {
        appUserSessions[msg.sender][userId] = userSessionCID;
    }

    function getUserSession(uint256 userId) public view returns (bytes memory) {
        return appUserSessions[msg.sender][userId];
    }
}
