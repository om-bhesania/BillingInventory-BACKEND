"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableShops = exports.getEmployeeRoles = exports.deleteEmployee = exports.updateEmployeeStatus = exports.updateEmployee = exports.createEmployee = exports.getEmployeeById = exports.getAllEmployees = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
// Get all employees with role and shop information
const getAllEmployees = async (req, res) => {
    try {
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        // Check if user is admin
        const isAdmin = user.Role?.name === 'Admin';
        let employees;
        if (isAdmin) {
            // Admin sees all employees
            employees = await prisma.user.findMany({
                where: {
                    id: { not: user.id } // Exclude current user
                },
                include: {
                    Role: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    },
                    managedShops: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
        else {
            // Shop owners see only employees in their shops
            const managedShops = await prisma.shop.findMany({
                where: { managerId: userPublicId },
                select: { id: true }
            });
            const shopIds = managedShops.map(shop => shop.id);
            if (shopIds.length === 0) {
                return res.status(200).json([]);
            }
            // Get employees who manage these shops or are assigned to them
            employees = await prisma.user.findMany({
                where: {
                    id: { not: user.id },
                    OR: [
                        { managedShops: { some: { id: { in: shopIds } } } },
                        { shopIds: { hasSome: shopIds } }
                    ]
                },
                include: {
                    Role: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    },
                    managedShops: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
        }
        // Format response
        const formattedEmployees = employees.map(emp => ({
            id: emp.publicId,
            name: emp.name,
            email: emp.email,
            contact: emp.contact,
            role: emp.Role?.name || 'No Role',
            roleId: emp.roleId,
            shopName: emp.managedShops?.[0]?.name || 'No Shop',
            shopId: emp.managedShops?.[0]?.id || null,
            isActive: emp.role !== 'inactive',
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt
        }));
        res.status(200).json(formattedEmployees);
    }
    catch (error) {
        logger_1.logger.error("Error fetching employees:", error);
        res.status(500).json({ error: "Failed to fetch employees" });
    }
};
exports.getAllEmployees = getAllEmployees;
// Get employee by ID
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const employee = await prisma.user.findUnique({
            where: { publicId: id },
            include: {
                Role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                managedShops: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Check access permissions
        const isAdmin = user.Role?.name === 'Admin';
        if (!isAdmin) {
            const managedShops = await prisma.shop.findMany({
                where: { managerId: userPublicId },
                select: { id: true }
            });
            const userShopIds = managedShops.map(shop => shop.id);
            const employeeShopIds = employee.managedShops?.map(shop => shop.id) || [];
            const hasAccess = userShopIds.some(shopId => employeeShopIds.includes(shopId));
            if (!hasAccess) {
                return res.status(403).json({ error: "Access denied to this employee" });
            }
        }
        const formattedEmployee = {
            id: employee.publicId,
            name: employee.name,
            email: employee.email,
            contact: employee.contact,
            role: employee.Role?.name || 'No Role',
            roleId: employee.roleId,
            shopName: employee.managedShops?.[0]?.name || 'No Shop',
            shopId: employee.managedShops?.[0]?.id || null,
            isActive: employee.role !== 'inactive',
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt
        };
        res.status(200).json(formattedEmployee);
    }
    catch (error) {
        logger_1.logger.error("Error fetching employee:", error);
        res.status(500).json({ error: "Failed to fetch employee" });
    }
};
exports.getEmployeeById = getEmployeeById;
// Create new employee
const createEmployee = async (req, res) => {
    try {
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const isAdmin = user.Role?.name === 'Admin';
        if (!isAdmin) {
            return res.status(403).json({ error: "Only admins can create employees" });
        }
        const { name, email, contact, password, roleId, shopId } = req.body;
        // Validate required fields
        if (!name || !email || !password || !roleId) {
            return res.status(400).json({
                error: "Missing required fields: name, email, password, roleId"
            });
        }
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({ error: "Email already exists" });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create employee
        const employee = await prisma.user.create({
            data: {
                name,
                email,
                contact,
                password: hashedPassword,
                roleId,
                publicId: `EMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                shopIds: shopId ? [shopId] : []
            },
            include: {
                Role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                }
            }
        });
        // If shopId is provided, assign employee to shop
        if (shopId) {
            await prisma.shop.update({
                where: { id: shopId },
                data: { managerId: employee.publicId }
            });
        }
        const formattedEmployee = {
            id: employee.publicId,
            name: employee.name,
            email: employee.email,
            contact: employee.contact,
            role: employee.Role?.name || 'No Role',
            roleId: employee.roleId,
            shopName: 'No Shop',
            shopId: null,
            isActive: true,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt
        };
        res.status(201).json(formattedEmployee);
    }
    catch (error) {
        logger_1.logger.error("Error creating employee:", error);
        res.status(500).json({ error: "Failed to create employee" });
    }
};
exports.createEmployee = createEmployee;
// Update employee
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const isAdmin = user.Role?.name === 'Admin';
        if (!isAdmin) {
            return res.status(403).json({ error: "Only admins can update employees" });
        }
        const { name, email, contact, roleId, shopId, isActive } = req.body;
        const employee = await prisma.user.findUnique({
            where: { publicId: id }
        });
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Check if email already exists (excluding current employee)
        if (email && email !== employee.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email }
            });
            if (existingUser) {
                return res.status(409).json({ error: "Email already exists" });
            }
        }
        // Update employee
        const updatedEmployee = await prisma.user.update({
            where: { publicId: id },
            data: {
                ...(name && { name }),
                ...(email && { email }),
                ...(contact && { contact }),
                ...(roleId && { roleId }),
                ...(isActive !== undefined && { role: isActive ? 'active' : 'inactive' }),
                ...(shopId && { shopIds: [shopId] })
            },
            include: {
                Role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                managedShops: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // Update shop assignment if provided
        if (shopId) {
            // Remove from old shop
            await prisma.shop.updateMany({
                where: { managerId: id },
                data: { managerId: null }
            });
            // Assign to new shop
            await prisma.shop.update({
                where: { id: shopId },
                data: { managerId: id }
            });
        }
        const formattedEmployee = {
            id: updatedEmployee.publicId,
            name: updatedEmployee.name,
            email: updatedEmployee.email,
            contact: updatedEmployee.contact,
            role: updatedEmployee.Role?.name || 'No Role',
            roleId: updatedEmployee.roleId,
            shopName: updatedEmployee.managedShops?.[0]?.name || 'No Shop',
            shopId: updatedEmployee.managedShops?.[0]?.id || null,
            isActive: updatedEmployee.role !== 'inactive',
            createdAt: updatedEmployee.createdAt,
            updatedAt: updatedEmployee.updatedAt
        };
        res.status(200).json(formattedEmployee);
    }
    catch (error) {
        logger_1.logger.error("Error updating employee:", error);
        res.status(500).json({ error: "Failed to update employee" });
    }
};
exports.updateEmployee = updateEmployee;
// Update employee status (PATCH endpoint)
const updateEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const isAdmin = user.Role?.name === 'Admin';
        if (!isAdmin) {
            return res.status(403).json({ error: "Only admins can update employee status" });
        }
        // Validate isActive is a boolean
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({ error: "isActive must be a boolean value" });
        }
        const employee = await prisma.user.findUnique({
            where: { publicId: id }
        });
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Update employee status
        const updatedEmployee = await prisma.user.update({
            where: { publicId: id },
            data: {
                role: isActive ? 'active' : 'inactive',
                updatedAt: new Date()
            },
            include: {
                Role: {
                    select: {
                        id: true,
                        name: true,
                        description: true
                    }
                },
                managedShops: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        // If deactivating, remove from all shops
        if (!isActive) {
            await prisma.shop.updateMany({
                where: { managerId: id },
                data: { managerId: null }
            });
        }
        const formattedEmployee = {
            id: updatedEmployee.publicId,
            name: updatedEmployee.name,
            email: updatedEmployee.email,
            contact: updatedEmployee.contact,
            role: updatedEmployee.Role?.name || 'No Role',
            roleId: updatedEmployee.roleId,
            shopName: updatedEmployee.managedShops?.[0]?.name || 'No Shop',
            shopId: updatedEmployee.managedShops?.[0]?.id || null,
            isActive: updatedEmployee.role !== 'inactive',
            createdAt: updatedEmployee.createdAt,
            updatedAt: updatedEmployee.updatedAt
        };
        res.status(200).json({
            message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
            employee: formattedEmployee
        });
    }
    catch (error) {
        logger_1.logger.error("Error updating employee status:", error);
        res.status(500).json({ error: "Failed to update employee status" });
    }
};
exports.updateEmployeeStatus = updateEmployeeStatus;
// Delete employee (hard delete)
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const isAdmin = user.Role?.name === 'Admin';
        if (!isAdmin) {
            return res.status(403).json({ error: "Only admins can delete employees" });
        }
        const employee = await prisma.user.findUnique({
            where: { publicId: id }
        });
        if (!employee) {
            return res.status(404).json({ error: "Employee not found" });
        }
        // Remove from all shops first
        await prisma.shop.updateMany({
            where: { managerId: id },
            data: { managerId: null }
        });
        // Hard delete - actually remove from database
        await prisma.user.delete({
            where: { publicId: id }
        });
        res.status(200).json({ message: "Employee deleted successfully" });
    }
    catch (error) {
        logger_1.logger.error("Error deleting employee:", error);
        res.status(500).json({ error: "Failed to delete employee" });
    }
};
exports.deleteEmployee = deleteEmployee;
// Get available roles for employee assignment
const getEmployeeRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            where: {
                name: { not: 'Admin' } // Exclude admin role from employee assignment
            },
            select: {
                id: true,
                name: true,
                description: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.status(200).json(roles);
    }
    catch (error) {
        logger_1.logger.error("Error fetching employee roles:", error);
        res.status(500).json({ error: "Failed to fetch roles" });
    }
};
exports.getEmployeeRoles = getEmployeeRoles;
// Get available shops for employee assignment
const getAvailableShops = async (req, res) => {
    try {
        const userPublicId = req.user?.publicId;
        if (!userPublicId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const user = await prisma.user.findUnique({
            where: { publicId: userPublicId },
            include: { Role: true }
        });
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }
        const isAdmin = user.Role?.name === 'Admin';
        let shops;
        if (isAdmin) {
            // Admin sees all shops
            shops = await prisma.shop.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    contactNumber: true,
                    email: true
                },
                orderBy: {
                    name: 'asc'
                }
            });
        }
        else {
            // Shop owners see only their shops
            shops = await prisma.shop.findMany({
                where: {
                    managerId: userPublicId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    address: true,
                    contactNumber: true,
                    email: true
                },
                orderBy: {
                    name: 'asc'
                }
            });
        }
        res.status(200).json(shops);
    }
    catch (error) {
        logger_1.logger.error("Error fetching available shops:", error);
        res.status(500).json({ error: "Failed to fetch shops" });
    }
};
exports.getAvailableShops = getAvailableShops;
