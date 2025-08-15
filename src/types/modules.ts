export type ModuleName =
  | "Inventory"
  | "Billing"
  | "Shop"
  | "Employee"
  | "Home"
  | "Shop Inventory";

export type ActionType = "read" | "write" | "update" | "delete";

export const SYSTEM_MODULES: ModuleName[] = [
  "Inventory",
  "Billing",
  "Shop",
  "Employee",
  "Home",
  "Shop Inventory",
];

export const ADMIN_MODULE_PERMISSIONS: Record<ModuleName, ActionType[]> = {
  Inventory: ["read", "write", "update", "delete"],
  Billing: ["read", "write", "update", "delete"],
  Shop: ["read", "write", "update", "delete"],
  Employee: ["read", "write", "update", "delete"],
  Home: ["read"],
  "Shop Inventory": [],
};

export const SHOP_OWNER_MODULE_PERMISSIONS: Record<ModuleName, ActionType[]> = {
  Inventory: [],
  Billing: ["read", "write"],
  Shop: [],
  Employee: [],
  Home: ["read"],
  "Shop Inventory": ["read", "write", "update", "delete"],
};

export const DEFAULT_PERMISSIONS: any = {
  Admin: ADMIN_MODULE_PERMISSIONS,
  Shop_Owner: SHOP_OWNER_MODULE_PERMISSIONS,
};
