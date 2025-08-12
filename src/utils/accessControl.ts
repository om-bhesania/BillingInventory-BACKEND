import { BaseUser } from '../types';
import { ModuleName } from '../types/modules';
import { createError } from '../middlewares/ErrorHandlers/errorHandler';

export function hasModuleAccess(user: BaseUser, module: ModuleName): boolean {
  if (!user.Role || !user.Role.permissions) {
    return false;
  }

  return user.Role.permissions.some(
    perm => perm.permission.resource === module && perm.permission.action === 'access'
  );
}

export function verifyModuleAccess(user: BaseUser, module: ModuleName): void {
  if (!hasModuleAccess(user, module)) {
    throw createError(
      `Access to module ${module} denied`,
      403,
      'MODULE_ACCESS_DENIED'
    );
  }
}
