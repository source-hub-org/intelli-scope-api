import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Decorator to extract the user from the request
 * @param data Optional property to extract from the user object
 * @param ctx Execution context
 * @returns The user object or a specific property
 */
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user;

    // If data is provided, return the specific property
    if (data) {
      return user?.[data];
    }

    // Otherwise, return the entire user object
    return user;
  },
);
