"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    const driverId = req.driverId;
    const missions = await db_1.prisma.mission.findMany({
        where: {
            OR: [{ status: "Offered" }, { driverId: driverId }],
        },
    });
    const formattedMissions = missions.map((m) => ({
        id: m.id,
        code: m.code,
        driverId: m.driverId,
        originCity: m.originCity,
        originArea: m.originArea,
        originLocation: { lat: m.originLat, lng: m.originLng },
        destCity: m.destCity,
        destArea: m.destArea,
        destExact: m.visibleDestinationExact
            ? { lat: m.destLat, lng: m.destLng, address: m.destAddress }
            : undefined,
        visibleDestinationExact: m.visibleDestinationExact,
        cargo: {
            type: m.cargoType,
            weightTons: m.cargoWeightTons,
            dimensions: m.cargoDimensions,
            value: m.cargoValue,
            packing: m.cargoPacking,
            sensitive: m.cargoSensitive,
        },
        timeWindow: { pickupFrom: m.pickupFrom, pickupTo: m.pickupTo },
        flag: m.flag,
        status: m.status,
        vehicleTypeRequired: m.vehicleTypeRequired,
        price: m.price,
        offerExpiresAt: m.offerExpiresAt?.toISOString(),
        routePlanned: {
            distanceKm: m.distanceKm,
            estimatedHours: m.estimatedHours,
        },
        photosUploaded: m.photosUploaded,
    }));
    res.json({ missions: formattedMissions });
});
router.post("/:id/change-status", async (req, res) => {
    const { status } = req.body;
    const missionId = req.params.id;
    const updateData = { status };
    if (status === "Accepted")
        updateData.driverId = req.driverId;
    if (status === "InTransit")
        updateData.moveStartedAt = new Date();
    if (status === "WaybillIssued")
        updateData.visibleDestinationExact = true;
    const mission = await db_1.prisma.mission.update({
        where: { id: missionId },
        data: updateData,
    });
    res.json({ message: "وضعیت بروزرسانی شد", status: mission.status });
});
module.exports = router;
module.exports.default = router;
