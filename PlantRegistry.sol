// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PlantRegistry
 * @dev Registro de plantas en blockchain compatible con la estructura de datos existente
 */
contract PlantRegistry {
    
    // Estructura de datos de planta (15 campos)
    struct PlantData {
        string eventType;
        string eventId;
        string batchId;
        string lotCode;
        uint256 timestamp;
        string recordedBy;
        string fieldId;
        string seed_LotId;
        string seedVariety;
        string seedSupplier;
        string seedTreatment;
        uint256 quantity_kg;      // En gramos (multiplicar por 1000)
        string plantingMethod;
        uint256 rowSpacing_cm;
        uint256 plantingDepth_cm; // En mm (multiplicar por 10)
        uint256 germinationRate_pct;
    }
    
    // Mapeo de ID de planta -> Datos
    mapping(string => PlantData) public plants;
    
    // Array de IDs de plantas registradas
    string[] public plantIds;
    
    // Propietario del contrato
    address public owner;
    
    // Eventos
    event PlantRegistered(string indexed plantId, string seedVariety, uint256 timestamp);
    event PlantUpdated(string indexed plantId, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el propietario puede ejecutar esto");
        _;
    }
    
    /**
     * @dev Registrar o actualizar una planta
     */
    function registerPlant(
        string memory _plantId,
        string memory _eventType,
        string memory _eventId,
        string memory _batchId,
        string memory _lotCode,
        uint256 _timestamp,
        string memory _recordedBy,
        string memory _fieldId,
        string memory _seed_LotId,
        string memory _seedVariety,
        string memory _seedSupplier,
        string memory _seedTreatment,
        uint256 _quantity_kg,
        string memory _plantingMethod,
        uint256 _rowSpacing_cm,
        uint256 _plantingDepth_cm,
        uint256 _germinationRate_pct
    ) public onlyOwner {
        
        // Si es una planta nueva, agregar al array
        if (bytes(plants[_plantId].eventId).length == 0) {
            plantIds.push(_plantId);
            emit PlantRegistered(_plantId, _seedVariety, block.timestamp);
        } else {
            emit PlantUpdated(_plantId, block.timestamp);
        }
        
        // Guardar datos
        plants[_plantId] = PlantData({
            eventType: _eventType,
            eventId: _eventId,
            batchId: _batchId,
            lotCode: _lotCode,
            timestamp: _timestamp,
            recordedBy: _recordedBy,
            fieldId: _fieldId,
            seed_LotId: _seed_LotId,
            seedVariety: _seedVariety,
            seedSupplier: _seedSupplier,
            seedTreatment: _seedTreatment,
            quantity_kg: _quantity_kg,
            plantingMethod: _plantingMethod,
            rowSpacing_cm: _rowSpacing_cm,
            plantingDepth_cm: _plantingDepth_cm,
            germinationRate_pct: _germinationRate_pct
        });
    }
    
    /**
     * @dev Obtener datos de una planta
     */
    function getPlant(string memory _plantId) public view returns (PlantData memory) {
        require(bytes(plants[_plantId].eventId).length > 0, "Planta no encontrada");
        return plants[_plantId];
    }
    
    /**
     * @dev Verificar si existe una planta
     */
    function plantExists(string memory _plantId) public view returns (bool) {
        return bytes(plants[_plantId].eventId).length > 0;
    }
    
    /**
     * @dev Obtener total de plantas registradas
     */
    function getTotalPlants() public view returns (uint256) {
        return plantIds.length;
    }
    
    /**
     * @dev Obtener ID de planta por índice
     */
    function getPlantIdByIndex(uint256 _index) public view returns (string memory) {
        require(_index < plantIds.length, "Indice fuera de rango");
        return plantIds[_index];
    }
}
