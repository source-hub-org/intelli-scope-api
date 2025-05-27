import { SetMetadata } from '@nestjs/common';

/**
 * Key for the roles metadata
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route
 * @param roles Array of required roles
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
