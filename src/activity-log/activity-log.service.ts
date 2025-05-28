import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './schemas';
import { ConfigService } from '@nestjs/config';
import {
  ActivityLogSanitizerService,
  ActivityLogQueryService,
} from './services';

/**
 * Main service for activity logging functionality
 */
@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  private readonly isEnabled: boolean;

  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
    private configService: ConfigService,
    private sanitizerService: ActivityLogSanitizerService,
    private queryService: ActivityLogQueryService,
  ) {
    // Allow disabling activity logging via configuration
    this.isEnabled = this.configService.get<boolean>(
      'ACTIVITY_LOGGING_ENABLED',
      true,
    );
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
      const sanitizedLogData = this.sanitizerService.sanitizeLogData(logData);

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
    return this.queryService.queryLogs(filter, options);
  }
}
