import { Request } from 'express';

/**
 * Utility functions for handling HTTP requests
 */
export class RequestUtils {
  /**
   * Extract the client IP address from a request
   * @param request Express request object
   * @returns Client IP address or 'unknown' if not found
   */
  static getClientIp(request: Request): string {
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

  /**
   * Prepare log data from a request
   * @param request Express request object
   * @param user User object from the request
   * @param options Additional options
   * @returns Prepared log data
   */
  static prepareLogData(
    request: Request,
    user: Record<string, unknown>,
    options: {
      traceId: string;
      status: 'SUCCESS' | 'FAILURE';
      responseTime?: number;
      error?: unknown;
    },
  ): Record<string, any> {
    const { method, path, params, query, headers } = request;
    const userAgent = headers['user-agent'];
    const ipAddress = this.getClientIp(request);
    const { traceId, status, error } = options;

    // Prepare log data
    const logData = {
      userId: user._id as string,
      actionType: 'API_ACCESS',
      timestamp: new Date(),
      actor: {
        username: (user.name as string) || (user.email as string) || 'unknown',
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
        errorCode: (err.code as string) || (err.status as string) || 'UNKNOWN',
        message: (err.message as string) || 'Unknown error',
      };
    }

    return logData;
  }
}
