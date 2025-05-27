import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  constructor(private readonly clsService: ClsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Store request and response objects in CLS context
      this.clsService.set('request', req);
      this.clsService.set('response', res);

      // Store start time for request duration tracking
      this.clsService.set('startTime', Date.now());

      // Store user information in CLS context if authenticated
      if (req.user) {
        this.clsService.set('user', req.user);
      }

      // Store request information in CLS context
      this.clsService.set('ipAddress', this.getClientIp(req));
      this.clsService.set('userAgent', req.headers['user-agent']);
      this.clsService.set(
        'requestId',
        (req.headers['x-request-id'] as string) || this.clsService.getId(),
      );

      next();
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(
        `Failed to set request context: ${err.message}`,
        err.stack,
      );
      next(err);
    }
  }

  private getClientIp(request: Request): string {
    // Try to get IP from various headers
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip || 'unknown';
  }
}
