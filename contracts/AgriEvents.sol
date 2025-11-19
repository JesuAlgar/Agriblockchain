// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgriEvents {
    event PlantEvent(
        string indexed plantId,
        string indexed eventType,
        string jsonPayload,
        address indexed recordedBy,
        uint256 timestamp,
        uint256 idx
    );

    mapping(string => uint256) private _counters;

    function addPlantEvent(
        string calldata plantId,
        string calldata eventType,
        string calldata jsonPayload
    ) external {
        uint256 eventIdx = _counters[plantId];
        _counters[plantId] = eventIdx + 1;
        emit PlantEvent(
            plantId,
            eventType,
            jsonPayload,
            msg.sender,
            block.timestamp,
            eventIdx
        );
    }

    function getEventCount(string calldata plantId) external view returns (uint256) {
        return _counters[plantId];
    }
}
