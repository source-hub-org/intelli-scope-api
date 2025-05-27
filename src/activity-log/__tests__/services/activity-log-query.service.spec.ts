import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLogQueryService } from '../../services/activity-log-query.service';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../../schemas/activity-log.schema';
import { createMockModel } from '../../../common/__tests__/test-utils';

describe('ActivityLogQueryService', () => {
  let service: ActivityLogQueryService;
  let activityLogModel: Model<ActivityLogDocument>;

  const mockActivityLogs = [
    {
      _id: 'log-id-1',
      userId: 'user-id',
      action: 'login',
      resource: 'auth',
      details: { ip: '127.0.0.1' },
      timestamp: new Date(),
    },
    {
      _id: 'log-id-2',
      userId: 'user-id',
      action: 'logout',
      resource: 'auth',
      details: { ip: '127.0.0.1' },
      timestamp: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogQueryService,
        {
          provide: getModelToken(ActivityLog.name),
          useValue: createMockModel(mockActivityLogs),
        },
      ],
    }).compile();

    service = module.get<ActivityLogQueryService>(ActivityLogQueryService);
    activityLogModel = module.get<Model<ActivityLogDocument>>(
      getModelToken(ActivityLog.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queryLogs', () => {
    it('should query logs with default pagination options', async () => {
      // Arrange
      const filter = { userId: 'user-id' };

      jest.spyOn(activityLogModel, 'find').mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockActivityLogs),
      } as any);

      jest.spyOn(activityLogModel, 'countDocuments').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(2),
      } as any);

      // Act
      const result = await service.queryLogs(filter);

      // Assert
      expect(activityLogModel.find).toHaveBeenCalledWith(filter);
      expect(activityLogModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        data: mockActivityLogs,
        meta: {
          total: 2,
          page: 1,
          limit: 20,
          pages: 1,
        },
      });
    });

    it('should query logs with custom pagination options', async () => {
      // Arrange
      const filter = { userId: 'user-id' };
      const options = { page: 2, limit: 5, sort: { timestamp: -1 as -1 } };

      jest.spyOn(activityLogModel, 'find').mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockActivityLogs),
      } as any);

      jest.spyOn(activityLogModel, 'countDocuments').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(12),
      } as any);

      // Act
      const result = await service.queryLogs(filter, options);

      // Assert
      expect(activityLogModel.find).toHaveBeenCalledWith(filter);
      expect(activityLogModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        data: mockActivityLogs,
        meta: {
          total: 12,
          page: 2,
          limit: 5,
          pages: 3,
        },
      });
    });

    it('should handle empty results', async () => {
      // Arrange
      const filter = { userId: 'nonexistent-id' };

      jest.spyOn(activityLogModel, 'find').mockReturnValueOnce({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce([]),
      } as any);

      jest.spyOn(activityLogModel, 'countDocuments').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(0),
      } as any);

      // Act
      const result = await service.queryLogs(filter);

      // Assert
      expect(activityLogModel.find).toHaveBeenCalledWith(filter);
      expect(activityLogModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(result).toEqual({
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });
    });
  });
});
