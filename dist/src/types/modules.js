"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERMISSIONS = exports.SHOP_OWNER_MODULE_PERMISSIONS = exports.ADMIN_MODULE_PERMISSIONS = exports.SYSTEM_MODULES = void 0;
exports.SYSTEM_MODULES = [
    "Inventory",
    "Billing",
    "Shop",
    "Employee",
    "Home",
    "Shop Inventory",
    "Restock Management",
    "Notifications",
    "Dashboard",
    "Audit Log",
    "Low Stock Alerts",
];
exports.ADMIN_MODULE_PERMISSIONS = {
    Inventory: ["read", "write", "update", "delete"],
    Billing: ["read", "write", "update", "delete"],
    Shop: ["read", "write", "update", "delete"],
    Employee: ["read", "write", "update", "delete"],
    Home: ["read"],
    "Shop Inventory": [],
    "Restock Management": ["read", "write", "update", "delete"],
    Notifications: ["read", "write", "update", "delete"],
    Dashboard: ["read"],
    "Audit Log": ["read"],
    "Low Stock Alerts": ["read"],
};
exports.SHOP_OWNER_MODULE_PERMISSIONS = {
    Inventory: [],
    Billing: ["read", "write"],
    Shop: [],
    Employee: [],
    Home: ["read"],
    "Shop Inventory": ["read", "write", "update", "delete"],
    "Restock Management": [],
    Notifications: ["read", "write", "update", "delete"],
    Dashboard: ["read"],
    "Audit Log": ["read"],
    "Low Stock Alerts": ["read"],
};
exports.DEFAULT_PERMISSIONS = {
    Admin: exports.ADMIN_MODULE_PERMISSIONS,
    Shop_Owner: exports.SHOP_OWNER_MODULE_PERMISSIONS,
};
