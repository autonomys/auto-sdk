// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AutoStackQueue is AccessControl {
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    uint256[] private stack;
    uint256[] private queue;
    uint256 private queueHead;

    event StackPushed(uint256 value);
    event StackPopped(uint256 value);
    event QueueEnqueued(uint256 value);
    event QueueDequeued(uint256 value);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        queueHead = 0;
    }

    // Stack functions
    function push(uint256 value) public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        stack.push(value);
        emit StackPushed(value);
    }

    function pop() public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        require(stack.length > 0, "Stack is empty");
        uint256 value = stack[stack.length - 1];
        stack.pop();
        emit StackPopped(value);
    }

    function stackTop() public view returns (uint256) {
        require(stack.length > 0, "Stack is empty");
        return stack[stack.length - 1];
    }

    function stackSize() public view returns (uint256) {
        return stack.length;
    }

    // Queue functions
    function enqueue(uint256 value) public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        queue.push(value);
        emit QueueEnqueued(value);
    }

    function dequeue() public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );
        require(queueHead < queue.length, "Queue is empty");
        uint256 value = queue[queueHead];
        queueHead++;
        emit QueueDequeued(value);
    }

    function queueFront() public view returns (uint256) {
        require(queueHead < queue.length, "Queue is empty");
        return queue[queueHead];
    }

    function queueSize() public view returns (uint256) {
        return queue.length - queueHead;
    }

    function grantWriterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WRITER_ROLE, account);
    }
}
