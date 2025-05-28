import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ActivityLog } from '../schemas';
import { Types } from 'mongoose';

/**
 * Service responsible for sanitizing activity log data
 * to remove or mask sensitive information
 */
@Injectable()
export class ActivityLogSanitizerService {
  private readonly sensitiveFields: string[];

  constructor(private configService?: ConfigService) {
    // Configure sensitive fields that should be masked or excluded
    const defaultSensitiveFields =
      'password,password_confirmation,token,access_token,refresh_token,secret,authorization,creditCard,ssn';

    // Use ConfigService if available, otherwise use default values
    const sensitiveFieldsStr =
      this.configService?.get<string>(
        'ACTIVITY_LOG_SENSITIVE_FIELDS',
        defaultSensitiveFields,
      ) || defaultSensitiveFields;

    this.sensitiveFields = sensitiveFieldsStr.split(',');
  }

  /**
   * Sanitize log data to remove or mask sensitive information
   * @param logData Raw log data
   * @returns Sanitized log data
   */
  sanitizeLogData(
    logData: Partial<ActivityLog> & { userId: string | Types.ObjectId },
  ): Partial<ActivityLog> & { userId: string | Types.ObjectId } {
    const sanitized = { ...logData };

    // Sanitize details if it's an object
    if (sanitized.details && typeof sanitized.details === 'object') {
      sanitized.details = this.sanitizeObject(sanitized.details) as Record<
        string,
        unknown
      >;
    }

    return sanitized;
  }

  /**
   * Recursively sanitize an object to mask sensitive fields
   * @param obj Object to sanitize
   * @returns Sanitized object
   */
  sanitizeObject(obj: unknown): unknown {
    // Handle non-objects
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    // Handle objects
    const sanitized = { ...obj } as Record<string, unknown>;

    for (const key in sanitized) {
      if (this.sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeObject(
          sanitized[key] as Record<string, unknown>,
        );
      }
    }

    return sanitized;
  }
}
