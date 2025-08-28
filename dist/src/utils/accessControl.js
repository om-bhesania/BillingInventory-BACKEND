"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasModuleAccess = hasModuleAccess;
exports.verifyModuleAccess = verifyModuleAccess;
const errorHandler_1 = require("../middlewares/ErrorHandlers/errorHandler");
function hasModuleAccess(user, module) {
    if (!user.Role || !user.Role.permissions) {
        return false;
    }
    return user.Role.permissions.some(perm => perm.permission.resource === module && perm.permission.action === 'access');
}
function verifyModuleAccess(user, module) {
    if (!hasModuleAccess(user, module)) {
        throw (0, errorHandler_1.createError)(`Access to module ${module} denied`, 403, 'MODULE_ACCESS_DENIED');
    }
}
