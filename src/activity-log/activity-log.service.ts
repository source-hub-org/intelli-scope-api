import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
} from './schemas/activity-log.schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly isEnabled: boolean;
  private readonly sensitiveFields: string[];

  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
    private configService: ConfigService,
  ) {
    // Allow disabling activity logging via configuration
    this.isEnabled = this.configService.get<boolean>(
      'ACTIVITY_LOGGING_ENABLED',
      true,
    );

    // Configure sensitive fields that should be masked or excluded
    this.sensitiveFields = this.configService
      .get<string>(
        'ACTIVITY_LOG_SENSITIVE_FIELDS',
        'password,password_hash,token,secret',
      )
      .split(',');
  }

  /**
   * Log an activity asynchronously
   * @param logData Activity log data
   */
  async logActivity(
    logData: Partial<ActivityLog> & { userId: string },
  ): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    try {
      // Create a sanitized copy of the log data
      const sanitizedLogData = this.sanitizeLogData(logData);

      // Convert string userId to ObjectId
      if (typeof sanitizedLogData.userId === 'string') {
        // Using type assertion to handle the mongoose type mismatch
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sanitizedLogData.userId = new Types.ObjectId(
          sanitizedLogData.userId,
        ) as any;
      }

      // Create and save the log entry asynchronously
      const activityLog = new this.activityLogModel(sanitizedLogData);
      await activityLog.save();
    } catch (error: unknown) {
      // Log the error but don't throw it to prevent affecting the main application flow
      const err = error as Error;
      this.logger.error(
        `Failed to save activity log: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Sanitize log data to remove or mask sensitive information
   * @param logData Raw log data
   * @returns Sanitized log data
   */
  private sanitizeLogData(
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
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
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

  /**
   * Query activity logs with pagination
   * @param filter Filter criteria
   * @param options Pagination options
   * @returns Paginated activity logs
   */
  async queryLogs(
    filter: Record<string, any> = {},
    options: {
      page?: number;
      limit?: number;
      sort?: Record<string, 1 | -1>;
    } = {},
  ) {
    const { page = 1, limit = 20, sort = { timestamp: -1 } } = options;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.activityLogModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
