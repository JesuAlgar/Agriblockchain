/**
 * SCRIPT PARA CARGAR DATOS EN EL CONTRATO
 * Usar en Remix después de desplegar el contrato
 */

// DATOS DE PLANTA01 (desde tu JSON)
const planta01 = {
    plantId: "planta01",
    eventType: "SEEDING",
    eventId: "01HXZZ4G26NQY0XJZK9VG7QVB",
    batchId: "01HXZZ4G26NS3D8JK8DZXY03",
    lotCode: "FARM456-2025-03-15-PLOT-3",
    timestamp: 1728568222, // 2025-10-10T14:30:22.000Z en Unix timestamp
    recordedBy: "device-SENSOR-03",
    fieldId: "PLOT-3",
    seed_LotId: "SEED-LOT-B12-89",
    seedVariety: "Cherry Tomato Hybrid",
    seedSupplier: "BioSeeds International",
    seedTreatment: "organic-certified",
    quantity_kg: 1800, // 1.8 kg = 1800 gramos
    plantingMethod: "hydroponic-system",
    rowSpacing_cm: 45,
    plantingDepth_cm: 20, // 2.0 cm = 20 mm
    germinationRate_pct: 94
};

// FUNCIÓN PARA USAR EN REMIX CONSOLE
async function cargarPlanta01(contractAddress) {
    // Obtener el contrato desplegado
    const contract = await ethers.getContractAt("PlantRegistry", contractAddress);
    
    // Registrar la planta
    const tx = await contract.registerPlant(
        planta01.plantId,
        planta01.eventType,
        planta01.eventId,
        planta01.batchId,
        planta01.lotCode,
        planta01.timestamp,
        planta01.recordedBy,
        planta01.fieldId,
        planta01.seed_LotId,
        planta01.seedVariety,
        planta01.seedSupplier,
        planta01.seedTreatment,
        planta01.quantity_kg,
        planta01.plantingMethod,
        planta01.rowSpacing_cm,
        planta01.plantingDepth_cm,
        planta01.germinationRate_pct
    );
    
    await tx.wait();
    console.log("✅ Planta01 registrada!");
    console.log("Transaction hash:", tx.hash);
}

// LLAMADA MANUAL EN REMIX (copiar esto después de desplegar):
/*
registerPlant(
    "planta01",
    "SEEDING",
    "01HXZZ4G26NQY0XJZK9VG7QVB",
    "01HXZZ4G26NS3D8JK8DZXY03",
    "FARM456-2025-03-15-PLOT-3",
    1728568222,
    "device-SENSOR-03",
    "PLOT-3",
    "SEED-LOT-B12-89",
    "Cherry Tomato Hybrid",
    "BioSeeds International",
    "organic-certified",
    1800,
    "hydroponic-system",
    45,
    20,
    94
)
*/
