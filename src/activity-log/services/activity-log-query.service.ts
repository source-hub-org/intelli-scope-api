import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../schemas/activity-log.schema';

/**
 * Service responsible for querying activity logs
 */
@Injectable()
export class ActivityLogQueryService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

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
