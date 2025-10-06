"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePackagingType = exports.updatePackagingType = exports.getPackagingTypes = exports.createPackagingType = void 0;
const client_1 = require("../config/client");
const audit_1 = require("../utils/audit");
const createPackagingType = async (req, res) => {
    try {
        const { name } = req.body;
        const pt = await client_1.prisma.packagingType.create({ data: { name } });
        res.status(201).json(pt);
        await (0, audit_1.logActivity)({
            type: "packaging",
            action: "created",
            entity: "PackagingType",
            entityId: pt.id,
            userId: req.user?.publicId,
            metadata: { name }
        });
    }
    catch (error) {
        if (error?.code === "P2002") {
            return res.status(400).json({ error: "Packaging type already exists" });
        }
        console.log(error);
        res.status(500).json({ error: "Failed to create packaging type" });
    }
};
exports.createPackagingType = createPackagingType;
const getPackagingTypes = async (_req, res) => {
    try {
        const list = await client_1.prisma.packagingType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
        res.json(list);
    }
    catch {
        res.status(500).json({ error: "Failed to fetch packaging types" });
    }
};
exports.getPackagingTypes = getPackagingTypes;
const updatePackagingType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;
        const pt = await client_1.prisma.packagingType.update({ where: { id }, data: { name, isActive } });
        res.json(pt);
    }
    catch (error) {
        if (error?.code === "P2002") {
            return res.status(400).json({ error: "Packaging type already exists" });
        }
        res.status(500).json({ error: "Failed to update packaging type" });
    }
};
exports.updatePackagingType = updatePackagingType;
const deletePackagingType = async (req, res) => {
    try {
        const { id } = req.params;
        await client_1.prisma.packagingType.update({ where: { id }, data: { isActive: false } });
        res.json({ message: "Packaging type deactivated" });
    }
    catch {
        res.status(500).json({ error: "Failed to delete packaging type" });
    }
};
exports.deletePackagingType = deletePackagingType;
