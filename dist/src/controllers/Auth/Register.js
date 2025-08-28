"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("../../config/client");
const publicId_1 = __importDefault(require("../../utils/publicId"));
const register = async (req, res) => {
    const { email, password, role, name, contact, roleId } = req.body || {};
    console.log({
        email,
        password,
        role,
        name,
        contact,
        roleId,
    });
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }
    if (!role) {
        return res.status(400).json({ message: "Role is required" });
    }
    if (!name) {
        return res.status(400).json({ message: "Name is required" });
    }
    if (!contact) {
        return res.status(400).json({ message: "Contact is required" });
    }
    const roleExists = await client_1.prisma.role.findUnique({
        where: { id: roleId },
    });
    if (!roleExists) {
        return res.status(400).json({ message: "Invalid roleId" });
    }
    try {
        const user = await client_1.prisma.user.create({
            data: {
                name: name,
                publicId: (0, publicId_1.default)(),
                email: email,
                password: await bcryptjs_1.default.hash(password, 10),
                contact: contact,
                role: role,
                roleId: roleId,
            },
        });
        console.log("user", user);
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ message: "Email already exists" });
    }
};
exports.register = register;
