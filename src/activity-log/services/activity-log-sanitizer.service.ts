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

  constructor(private configService: ConfigService) {
    // Configure sensitive fields that should be masked or excluded
    this.sensitiveFields = this.configService
      .get<string>(
        'ACTIVITY_LOG_SENSITIVE_FIELDS',
        'password,password_hash,token,secret',
      )
      .split(',');
  }

  /**
   * Sanitize log data to remove or mask sensitive information
   * @param logData Raw log data
   * @returns Sanitized log data
   */
  sanitizeLogData(
    logData: Partial<ActivityLog> & { userId: string },
  ): Partial<ActivityLog> & { userId: string | Types.ObjectId } {
    const sanitized = { ...logData };

    // Sanitize input payload summary if present
    if (sanitized.details?.inputPayloadSummary) {
      sanitized.details.inputPayloadSummary = this.sanitizeObject(
        sanitized.details.inputPayloadSummary,
      );
    }

    // Sanitize entity snapshot if present
    if (sanitized.details?.entitySnapshot) {
      sanitized.details.entitySnapshot = this.sanitizeObject(
        sanitized.details.entitySnapshot,
      );
    }

    // Sanitize changed fields if present
    if (sanitized.details?.changedFields?.length) {
      sanitized.details.changedFields = sanitized.details.changedFields.map(
        (field) => {
          if (this.sensitiveFields.includes(field.field)) {
            return {
              field: field.field,
              oldValue: '[REDACTED]',
              newValue: '[REDACTED]',
            };
          }
          return field;
        },
      );
    }

    return sanitized;
  }

  /**
   * Recursively sanitize an object to mask sensitive fields
   * @param obj Object to sanitize
   * @returns Sanitized object
   */
  sanitizeObject(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = { ...obj };

    for (const key in sanitized) {
      if (this.sensitiveFields.includes(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (
        typeof sanitized[key] === 'object' &&
        sanitized[key] !== null
      ) {
        sanitized[key] = this.sanitizeObject(
          sanitized[key] as Record<string, any>,
        );
      }
    }

    return sanitized;
  }
}
