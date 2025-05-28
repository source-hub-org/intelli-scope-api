import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { ActivityLogQueryService } from '../../services/activity-log-query.service';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../../schemas/activity-log.schema';
import { createMockModel } from '../../../common/__tests__/test-utils';

/**
 * Creates a mock query object for testing
 *
 * @param resolvedValue - The value that will be resolved when exec() is called
 * @returns A mock query object with chainable methods
 */
// We're using a more specific return type with generics to handle both find and countDocuments

// Helper function to create a type-safe mock query
function createMockQuery<T, TDoc = ActivityLogDocument>(
  resolvedValue: T,
): Query<T, TDoc> {
  // Using type assertion with unknown as intermediate step for safety
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValueOnce(resolvedValue),
    // Add other necessary methods that might be called on the query
    $where: jest.fn().mockReturnThis(),
  } as unknown as Query<T, TDoc>;
}

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
      actionType: 'LOGIN_SUCCESS',
      actor: {
        username: 'testuser',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
      operationStatus: 'SUCCESS',
    },
    {
      _id: 'log-id-2',
      userId: 'user-id',
      action: 'logout',
      resource: 'auth',
      details: { ip: '127.0.0.1' },
      timestamp: new Date(),
      actionType: 'LOGOUT',
      actor: {
        username: 'testuser',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      },
      operationStatus: 'SUCCESS',
    },
  ] as unknown as ActivityLogDocument[];

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

      const findSpy = jest
        .spyOn(activityLogModel, 'find')
        .mockReturnValueOnce(createMockQuery(mockActivityLogs));

      const countSpy = jest
        .spyOn(activityLogModel, 'countDocuments')
        .mockReturnValueOnce(createMockQuery(2));

      // Act
      const result = await service.queryLogs(filter);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(filter);
      expect(countSpy).toHaveBeenCalledWith(filter);
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

      const findSpy = jest
        .spyOn(activityLogModel, 'find')
        .mockReturnValueOnce(createMockQuery(mockActivityLogs));

      const countSpy = jest
        .spyOn(activityLogModel, 'countDocuments')
        .mockReturnValueOnce(createMockQuery(12));

      // Act
      const result = await service.queryLogs(filter, options);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(filter);
      expect(countSpy).toHaveBeenCalledWith(filter);
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

      const findSpy = jest
        .spyOn(activityLogModel, 'find')
        .mockReturnValueOnce(createMockQuery([]));

      const countSpy = jest
        .spyOn(activityLogModel, 'countDocuments')
        .mockReturnValueOnce(createMockQuery(0));

      // Act
      const result = await service.queryLogs(filter);

      // Assert
      expect(findSpy).toHaveBeenCalledWith(filter);
      expect(countSpy).toHaveBeenCalledWith(filter);
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
