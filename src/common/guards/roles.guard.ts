import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { I18nService, I18nContext } from 'nestjs-i18n';

/**
 * Guard to check if a user has the required roles
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Check if the user has the required roles
   * @param context Execution context
   * @returns True if the user has the required roles
   */
  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the route handler
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get the user from the request
    const { user } = context.switchToHttp().getRequest();

    // If no user is present, deny access
    if (!user) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Check if the user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.INSUFFICIENT_PERMISSIONS', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    return true;
  }
}
