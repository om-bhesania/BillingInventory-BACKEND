"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailablePermissions = exports.deleteRole = exports.updateRolePermissions = exports.updateRole = exports.getRoleById = exports.getAllRoles = exports.createRole = void 0;
const client_1 = require("../../config/client");
const modules_1 = require("../../types/modules");
const console_log_colors_1 = require("console-log-colors");
// Utility function to validate actions
const validateActions = (actions) => {
    const validActions = ["read", "write", "update", "delete"];
    return actions.filter((action) => validActions.includes(action));
};
// Utility function to get permissions for a role
const getRolePermissions = (roleName, customModules, customPermissions) => {
    // First check if we have custom permissions
    if (customPermissions) {
        return customPermissions;
    }
    // Then check for default permissions by role name
    const defaultPerms = modules_1.DEFAULT_PERMISSIONS[roleName] ||
        modules_1.DEFAULT_PERMISSIONS[roleName.replace(/\s+/g, "_")];
    if (defaultPerms) {
        return defaultPerms;
    }
    // If custom modules are provided without permissions, give read access only
    if (customModules) {
        return Object.fromEntries(customModules.map((module) => [module, ["read"]]));
    }
    // Default fallback - minimal permissions
    return {
        Home: ["read"],
    };
};
// CREATE
const createRole = async (req, res) => {
    const { name, description, modules, customPermissions } = req.body || {};
    if (!name?.trim()) {
        res.status(400).json({ message: "Name is required and cannot be empty" });
        return;
    }
    try {
        // Get permissions for this role
        const rolePermissions = getRolePermissions(name, modules, customPermissions);
        console.log(`Creating role "${name}" with permissions:`, (0, console_log_colors_1.greenBright)(JSON.stringify(rolePermissions, null, 2)));
        // First create the role
        const role = await client_1.prisma.role.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
            },
        });
        // Then create permissions for each module
        const permissionPromises = Object.entries(rolePermissions).map(async ([module, actions]) => {
            const validActions = validateActions(actions);
            if (validActions.length === 0) {
                console.log(`No valid actions for module ${module}, skipping...`);
                return;
            }
            // Create permission records if they don't exist
            const permissions = validActions.map((action) => ({
                action,
                resource: module,
                description: `${action} access to ${module} module`,
            }));
            await client_1.prisma.permission.createMany({
                data: permissions,
                skipDuplicates: true,
            });
            // Get the created/existing permissions
            const createdPermissionRecords = await client_1.prisma.permission.findMany({
                where: {
                    resource: module,
                    action: { in: validActions },
                },
            });
            // Create role-permission relationships
            const rolePermissions = createdPermissionRecords.map((permission) => ({
                roleId: role.id,
                permissionId: permission.id,
            }));
            await client_1.prisma.rolePermission.createMany({
                data: rolePermissions,
                skipDuplicates: true,
            });
            console.log(`Added ${validActions.length} permissions for ${module} to role ${name}`);
        });
        await Promise.all(permissionPromises);
        // Fetch the created role with its permissions
        const roleWithPermissions = await client_1.prisma.role.findUnique({
            where: { id: role.id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        roleId: true,
                        email: true,
                        contact: true,
                    },
                },
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        console.log(`Successfully created role: ${name}`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(201).json(roleWithPermissions);
    }
    catch (error) {
        console.error("Error creating role:", error);
        if (error.code === "P2002") {
            res.status(400).json({ message: "Role with this name already exists" });
            return;
        }
        res
            .status(500)
            .json({ message: "Failed to create role", error: error.message });
    }
};
exports.createRole = createRole;
// READ ALL
const getAllRoles = async (req, res) => {
    console.log("Fetching all roles...");
    try {
        const roles = (await client_1.prisma.role.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        roleId: true,
                        email: true,
                        contact: true,
                    },
                },
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        }));
        console.log(`Found ${roles.length} roles`, (0, console_log_colors_1.yellowBG)("INFO"));
        // Transform the roles to group permissions by module
        const transformedRoles = roles.map((role) => {
            // Initialize permissions map for all system modules
            const modulePermissionsMap = Object.fromEntries(modules_1.SYSTEM_MODULES.map((module) => [module, []]));
            // Group permissions by module
            role.permissions.forEach((rolePermission) => {
                const { resource, action } = rolePermission.permission;
                // Validate that the resource is a known system module and action is valid
                if (modules_1.SYSTEM_MODULES.includes(resource) &&
                    ["read", "write", "update", "delete"].includes(action)) {
                    const module = resource;
                    const validAction = action;
                    if (!modulePermissionsMap[module].includes(validAction)) {
                        modulePermissionsMap[module].push(validAction);
                    }
                }
                else {
                    console.warn(`Invalid permission found: ${action} on ${resource} for role ${role.name}`);
                }
            });
            // Convert map into the expected array format, only including modules with permissions
            const permissionsArray = modules_1.SYSTEM_MODULES.map((module) => ({
                module,
                actions: modulePermissionsMap[module].sort(), // Sort actions for consistency
            }));
            return {
                id: role.id,
                name: role.name,
                description: role.description,
                users: role.users,
                permissions: permissionsArray,
                createdAt: role.createdAt,
                updatedAt: role.updatedAt,
            };
        });
        // Filter out Super_Admin role from the response
        const filteredRoles = transformedRoles.filter((role) => role.name !== "Super_Admin" && role.name !== "Super Admin");
        console.log(`Successfully transformed ${transformedRoles.length} roles (${filteredRoles.length} after filtering Super_Admin)`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(200).json(filteredRoles);
    }
    catch (error) {
        console.error("Error fetching roles:", error);
        res.status(500).json({ message: "Failed to fetch roles" });
    }
};
exports.getAllRoles = getAllRoles;
// READ ONE
const getRoleById = async (req, res) => {
    const { id } = req.params;
    if (!id?.trim()) {
        res.status(400).json({ message: "Role ID is required" });
        return;
    }
    try {
        const role = await client_1.prisma.role.findUnique({
            where: { id: id.trim() },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        roleId: true,
                        email: true,
                        contact: true,
                    },
                },
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        if (!role) {
            res.status(404).json({ message: "Role not found" });
            return;
        }
        console.log(`Found role: ${role.name}`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(200).json(role);
    }
    catch (error) {
        console.error("Error fetching role:", error);
        res.status(500).json({ message: "Failed to fetch role" });
    }
};
exports.getRoleById = getRoleById;
// UPDATE ROLE BASIC INFO
const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body || {};
    if (!id?.trim()) {
        res.status(400).json({ message: "Role ID is required" });
        return;
    }
    if (!name?.trim()) {
        res.status(400).json({ message: "Name is required and cannot be empty" });
        return;
    }
    try {
        const updated = await client_1.prisma.role.update({
            where: { id: id.trim() },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
            },
            include: {
                users: true,
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        console.log(`Successfully updated role: ${updated.name}`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(200).json(updated);
    }
    catch (error) {
        console.error("Error updating role:", error);
        if (error.code === "P2025") {
            res.status(404).json({ message: "Role not found" });
            return;
        }
        if (error.code === "P2002") {
            res.status(400).json({ message: "Role with this name already exists" });
            return;
        }
        res.status(500).json({ message: "Failed to update role" });
    }
};
exports.updateRole = updateRole;
// UPDATE ROLE PERMISSIONS
const updateRolePermissions = async (req, res) => {
    const { id } = req.params;
    const { modules } = req.body || {};
    if (!id?.trim()) {
        res.status(400).json({ message: "Role ID is required" });
        return;
    }
    if (!modules || typeof modules !== "object") {
        res.status(400).json({ message: "Modules configuration is required" });
        return;
    }
    try {
        // Verify role exists
        const role = await client_1.prisma.role.findUnique({
            where: { id: id.trim() },
        });
        if (!role) {
            res.status(404).json({ message: "Role not found" });
            return;
        }
        // Start a transaction to update permissions
        await client_1.prisma.$transaction(async (tx) => {
            // Remove existing role permissions
            await tx.rolePermission.deleteMany({
                where: { roleId: id.trim() },
            });
            // Add new permissions
            const permissionPromises = Object.entries(modules).map(async ([module, actions]) => {
                const validActions = validateActions(actions);
                if (validActions.length === 0) {
                    console.log(`No valid actions for module ${module}, skipping...`);
                    return;
                }
                // Ensure permissions exist
                const permissions = validActions.map((action) => ({
                    action,
                    resource: module,
                    description: `${action} access to ${module} module`,
                }));
                await tx.permission.createMany({
                    data: permissions,
                    skipDuplicates: true,
                });
                // Get permission records
                const permissionRecords = await tx.permission.findMany({
                    where: {
                        resource: module,
                        action: { in: validActions },
                    },
                });
                // Create role-permission relationships
                const rolePermissions = permissionRecords.map((permission) => ({
                    roleId: id.trim(),
                    permissionId: permission.id,
                }));
                await tx.rolePermission.createMany({
                    data: rolePermissions,
                });
                console.log(`Updated ${validActions.length} permissions for ${module}`);
            });
            await Promise.all(permissionPromises);
        });
        // Fetch updated role
        const updatedRole = await client_1.prisma.role.findUnique({
            where: { id: id.trim() },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                        roleId: true,
                        email: true,
                        contact: true,
                    },
                },
                permissions: {
                    include: {
                        permission: true,
                    },
                },
            },
        });
        console.log(`Successfully updated permissions for role: ${role.name}`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(200).json(updatedRole);
    }
    catch (error) {
        console.error("Error updating role permissions:", error);
        res.status(500).json({ message: "Failed to update role permissions" });
    }
};
exports.updateRolePermissions = updateRolePermissions;
// DELETE
const deleteRole = async (req, res) => {
    const { id } = req.params;
    if (!id?.trim()) {
        res.status(400).json({ message: "Role ID is required" });
        return;
    }
    try {
        // Check if role has users assigned
        const roleWithUsers = await client_1.prisma.role.findUnique({
            where: { id: id.trim() },
            include: {
                users: true,
            },
        });
        if (!roleWithUsers) {
            res.status(404).json({ message: "Role not found" });
            return;
        }
        if (roleWithUsers.users.length > 0) {
            res.status(400).json({
                message: "Cannot delete role with assigned users",
                assignedUsers: roleWithUsers.users.length,
            });
            return;
        }
        // Delete role (cascade will handle role permissions)
        await client_1.prisma.role.delete({
            where: { id: id.trim() },
        });
        console.log(`Successfully deleted role: ${roleWithUsers.name}`, (0, console_log_colors_1.greenBright)("✓"));
        res.status(200).json({ message: "Role deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting role:", error);
        if (error.code === "P2025") {
            res.status(404).json({ message: "Role not found" });
            return;
        }
        res.status(500).json({ message: "Failed to delete role" });
    }
};
exports.deleteRole = deleteRole;
// GET AVAILABLE PERMISSIONS (utility endpoint)
const getAvailablePermissions = async (req, res) => {
    try {
        const availablePermissions = modules_1.SYSTEM_MODULES.map((module) => ({
            module,
            availableActions: ["read", "write", "update", "delete"],
        }));
        res.status(200).json({
            modules: availablePermissions,
            defaultRoles: Object.keys(modules_1.DEFAULT_PERMISSIONS),
        });
    }
    catch (error) {
        console.error("Error fetching available permissions:", error);
        res.status(500).json({ message: "Failed to fetch available permissions" });
    }
};
exports.getAvailablePermissions = getAvailablePermissions;
