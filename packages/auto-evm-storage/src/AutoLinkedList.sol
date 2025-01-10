// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract AutoLinkedList is AccessControl {
    bytes32 public constant WRITER_ROLE = keccak256("WRITER_ROLE");

    struct Node {
        uint256 data;
        uint256 next;
    }

    mapping(uint256 => Node) public nodes;
    uint256 public head;
    uint256 public size;

    event NodeAdded(uint256 indexed index, uint256 data);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        head = type(uint256).max; // Indicates the end of the list
        size = 0;
    }

    function addNode(uint256 data) public {
        require(
            hasRole(WRITER_ROLE, msg.sender),
            "Access denied: No write permissions"
        );

        nodes[size] = Node(data, head);
        head = size;
        emit NodeAdded(size, data);
        size++;
    }

    function getNode(uint256 index) public view returns (uint256 data, uint256 next) {
        require(index < size, "Index out of bounds");
        Node storage node = nodes[index];
        return (node.data, node.next);
    }

    function traverse() public view returns (uint256[] memory) {
        uint256[] memory dataList = new uint256[](size);
        uint256 currentIndex = head;
        for (uint256 i = 0; i < size; i++) {
            dataList[i] = nodes[currentIndex].data;
            currentIndex = nodes[currentIndex].next;
        }
        return dataList;
    }

    function grantWriterRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(WRITER_ROLE, account);
    }
}
