/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ActivityLogService } from '../activity-log.service';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { Request } from 'express';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);
  private readonly excludePaths: string[];

  constructor(
    private readonly activityLogService: ActivityLogService,
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
  ) {
    // Configure paths to exclude from logging (e.g., health checks, metrics)
    this.excludePaths = this.configService
      .get<string>('ACTIVITY_LOG_EXCLUDE_PATHS', '/health,/metrics')
      .split(',');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only process HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const { path, user } = request;

      // Skip logging for excluded paths
      if (this.shouldExcludePath(path)) {
        return next.handle();
      }

      // Skip logging for unauthenticated users
      if (!user) {
        return next.handle();
      }

      // Store request start time
      const startTime = Date.now();

      // Store the trace ID in the CLS context for correlation
      const traceId = this.clsService.getId();

      return next.handle().pipe(
        tap({
          next: (_data) => {
            // Log successful API access asynchronously
            this.logApiAccess({
              request,
              user,
              traceId,
              responseTime: Date.now() - startTime,
              status: 'SUCCESS',
            });
          },
          error: (error) => {
            // Log failed API access asynchronously
            this.logApiAccess({
              request,
              user,
              traceId,
              responseTime: Date.now() - startTime,
              status: 'FAILURE',
              error,
            });
          },
        }),
      );
    } catch (_error) {
      // If anything fails in our wrapper, just proceed with the original method
      return next.handle();
    }
  }

  private shouldExcludePath(path: string): boolean {
    return this.excludePaths.some(
      (excludePath) =>
        path === excludePath || path.startsWith(`${excludePath}/`),
    );
  }

  private logApiAccess({
    request,
    user,
    traceId,
    status,
    error = null,
  }: {
    request: Request;
    user: Record<string, unknown>;
    traceId: string;
    responseTime?: number;
    status: 'SUCCESS' | 'FAILURE';
    error?: unknown;
  }): void {
    try {
      const { method, path, params, query, headers } = request;
      const userAgent = headers['user-agent'];
      const ipAddress = this.getClientIp(request);

      // Prepare log data
      const logData = {
        userId: user._id as string,
        actionType: 'API_ACCESS',
        timestamp: new Date(),
        actor: {
          username:
            (user.name as string) || (user.email as string) || 'unknown',
          ipAddress,
          userAgent,
        },
        resource: {
          type: 'SystemRoute',
          id: path,
          displayName: `${method} ${path}`,
        },
        details: {
          httpMethod: method,
          httpPath: path,
          requestParams: params,
          requestQuery: query,
        },
        operationStatus: status,
        traceId,
      };

      // Add failure details if applicable
      if (status === 'FAILURE' && error) {
        const err = error as Record<string, unknown>;
        logData['failureDetails'] = {
          errorCode:
            (err.code as string) || (err.status as string) || 'UNKNOWN',
          message: (err.message as string) || 'Unknown error',
        };
      }

      // Log asynchronously
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      void this.activityLogService.logActivity(logData as any);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `Failed to log API access: ${error.message}`,
        error.stack,
      );
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
