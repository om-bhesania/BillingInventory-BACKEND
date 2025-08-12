// Simplified RBAC Configuration
export interface Permission {
  name: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export const ROLES: Role[] = [
  {
    id: "37db443d-4198-4764-97dc-12b549b855bd",
    name: "Admin",
    description: "Administrator role with full system access",
    permissions: [
      "Inventory",
      "Billing", 
      "Shop",
      "Home",
      "Employee"
    ]
  },
  {
    id: "1a6bbf72-a96f-4965-904b-0fc9c8cdba62", 
    name: "Shop_Owner",
    description: "Shop owner with permissions to manage their store and products",
    permissions: [
      "Billing",
      "Shop Inventory",
      "Home"
    ]
  }
];

// Helper functions for role checking
export const getRoleByName = (roleName: string): Role | undefined => {
  return ROLES.find(role => role.name === roleName);
};

export const getRoleById = (roleId: string): Role | undefined => {
  return ROLES.find(role => role.id === roleId);
};

export const hasPermission = (roleName: string, permission: string): boolean => {
  const role = getRoleByName(roleName);
  return role ? role.permissions.includes(permission) : false;
};

export const isAdmin = (roleName: string): boolean => {
  return roleName === "Admin";
};

export const isShopOwner = (roleName: string): boolean => {
  return roleName === "Shop_Owner";
};

export const getRolePermissions = (roleName: string): string[] => {
  const role = getRoleByName(roleName);
  return role ? role.permissions : [];
};

// Export default roles for easy access
export default ROLES;
