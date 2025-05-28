import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

/**
 * Interceptor to log all incoming requests and their responses
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);
  private readonly isVerboseLogging: boolean;
  private readonly excludePaths: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
  ) {
    // Enable verbose logging based on configuration
    this.isVerboseLogging = this.configService.get<boolean>(
      'VERBOSE_REQUEST_LOGGING',
      false,
    );

    // Configure paths to exclude from logging (e.g., health checks, metrics)
    this.excludePaths = this.configService
      .get<string>('REQUEST_LOG_EXCLUDE_PATHS', '/health,/metrics')
      .split(',');
  }

  /**
   * Intercept the request and log it
   * @param context The execution context
   * @param next The call handler
   * @returns The response observable
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const { method, path, ip, headers } = request;

    // Skip logging for excluded paths
    if (this.shouldExcludePath(path)) {
      return next.handle();
    }

    // Get the user agent
    const userAgent = headers['user-agent'] || 'unknown';

    // Log the request
    this.logger.log(
      `Incoming Request: ${method} ${path} from ${ip} (${userAgent})`,
    );

    // Log request body in verbose mode
    if (this.isVerboseLogging && request.body) {
      this.logger.debug(`Request Body: ${this.sanitizeBody(request.body)}`);
    }

    // Get the start time from CLS if available, or use current time
    const startTime: number = this.clsService?.get('startTime') || Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - startTime;

          // Log the response
          this.logger.log(
            `Response: ${method} ${path} - ${response.statusCode} (${duration}ms)`,
          );

          // Log response data in verbose mode
          if (this.isVerboseLogging && data) {
            this.logger.debug(`Response Body: ${this.sanitizeBody(data)}`);
          }
        },
        error: (error: { status?: number; message?: string }) => {
          const duration = Date.now() - startTime;

          // Log the error
          this.logger.error(
            `Error: ${method} ${path} - ${error.status || 500} (${duration}ms): ${error.message || 'Unknown error'}`,
          );
        },
      }),
    );
  }

  /**
   * Check if a path should be excluded from logging
   * @param path Request path
   * @returns True if the path should be excluded
   */
  private shouldExcludePath(path: string): boolean {
    return this.excludePaths.some(
      (excludePath) =>
        path === excludePath || path.startsWith(`${excludePath}/`),
    );
  }

  /**
   * Sanitize the request/response body for logging
   * @param body The body to sanitize
   * @returns Sanitized body as a string
   */
  private sanitizeBody(body: unknown): string {
    if (!body) {
      return 'empty';
    }

    try {
      // Create a copy of the body
      const sanitized: Record<string, unknown> =
        typeof body === 'object' && body !== null
          ? { ...(body as Record<string, unknown>) }
          : {};

      // Mask sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'authorization'];

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return JSON.stringify(sanitized);
    } catch (_error) {
      return 'unable to stringify body';
    }
  }
}
