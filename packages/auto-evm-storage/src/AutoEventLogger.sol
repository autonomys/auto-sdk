// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AutoEventLogger {
    struct Event {
        address user;
        string action;
        uint256 timestamp;
    }

    Event[] public events;

    event ActionLogged(address indexed user, string action, uint256 timestamp);

    function logAction(string memory action) public {
        Event memory newEvent = Event({
            user: msg.sender,
            action: action,
            timestamp: block.timestamp
        });

        events.push(newEvent);
        emit ActionLogged(msg.sender, action, block.timestamp);
    }

    function getEvents() public view returns (Event[] memory) {
        return events;
    }

    function getEvent(uint256 index) public view returns (Event memory) {
        require(index < events.length, "Invalid index");
        return events[index];
    }

    function getEventsCount() public view returns (uint256) {
        return events.length;
    }
}
