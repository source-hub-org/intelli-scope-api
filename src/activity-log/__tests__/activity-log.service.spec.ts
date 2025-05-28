import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Document, Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ActivityLogService } from '../activity-log.service';
import {
  ActivityLog,
  ActivityLogDocument,
} from '../schemas/activity-log.schema';
import { ActivityLogSanitizerService } from '../services/activity-log-sanitizer.service';
import { ActivityLogQueryService } from '../services/activity-log-query.service';
import {
  createMockConfigService,
  // Removed unused import
} from '../../common/__tests__/test-utils';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let activityLogModel: Model<ActivityLogDocument>;
  let configService: ConfigService;
  let sanitizerService: ActivityLogSanitizerService;
  let queryService: ActivityLogQueryService;

  const mockActivityLog = {
    _id: 'log-id',
    userId: new Types.ObjectId('507f1f77bcf86cd799439011'),
    actionType: 'LOGIN_SUCCESS',
    actor: {
      username: 'Test User',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    },
    resource: {
      type: 'auth',
      id: 'auth-1',
      displayName: 'Authentication',
    },
    details: {
      httpMethod: 'POST',
      httpPath: '/api/auth/login',
      requestParams: {},
      requestQuery: {},
    },
    operationStatus: 'SUCCESS',
    timestamp: new Date(),
    traceId: 'test-trace-id',
    __v: 0,
  };

  beforeEach(async () => {
    const mockSanitizerService = {
      sanitizeLogData: jest
        .fn()
        .mockImplementation(
          (data) =>
            data as unknown as Partial<ActivityLog> & { userId: string },
        ),
    };

    const mockQueryService = {
      queryLogs: jest.fn(),
    };

    // Create a mock ActivityLog model with a working save method
    const mockActivityLogModel = function () {
      return {
        save: jest.fn().mockResolvedValue(mockActivityLog),
      };
    };
    mockActivityLogModel.prototype = {
      save: jest.fn().mockResolvedValue(mockActivityLog),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogService,
        {
          provide: getModelToken(ActivityLog.name),
          useValue: mockActivityLogModel,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            ACTIVITY_LOGGING_ENABLED: true,
          }),
        },
        {
          provide: ActivityLogSanitizerService,
          useValue: mockSanitizerService,
        },
        {
          provide: ActivityLogQueryService,
          useValue: mockQueryService,
        },
      ],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
    activityLogModel = module.get<Model<ActivityLogDocument>>(
      getModelToken(ActivityLog.name),
    );
    configService = module.get<ConfigService>(ConfigService);
    sanitizerService = module.get<ActivityLogSanitizerService>(
      ActivityLogSanitizerService,
    );
    queryService = module.get<ActivityLogQueryService>(ActivityLogQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      // Arrange
      const logData = {
        userId: 'user-id',
        actionType: 'LOGIN_SUCCESS',
        actor: {
          username: 'Test User',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        },
        resource: {
          type: 'auth',
          id: 'auth-1',
        },
        details: {
          httpMethod: 'POST',
          httpPath: '/api/auth/login',
        },
        operationStatus: 'SUCCESS',
      };

      // Mock the sanitizer to return the data
      jest
        .spyOn(sanitizerService, 'sanitizeLogData')
        .mockReturnValueOnce(
          logData as unknown as Partial<ActivityLog> & { userId: string },
        );

      // Mock the ObjectId constructor
      const mockObjectId = function () {
        return 'user-id';
      };
      mockObjectId.prototype = Object.create(
        Types.ObjectId.prototype,
      ) as Record<string, unknown>;
      jest
        .spyOn(Types, 'ObjectId')
        .mockImplementation(() => mockObjectId as unknown as Types.ObjectId);

      // Create a spy for the save method
      const saveSpy = jest
        .fn()
        .mockResolvedValue(mockActivityLog as unknown as ActivityLogDocument);

      // Create a custom model that uses our spy
      const testModel = function () {
        return {
          save: saveSpy,
        };
      };

      // Replace the model in the service
      service['activityLogModel'] =
        testModel as unknown as Model<ActivityLogDocument>;

      // Act
      await service.logActivity(
        logData as unknown as Partial<ActivityLog> & { userId: string },
      );

      // Assert
      expect(
        jest.spyOn(sanitizerService, 'sanitizeLogData'),
      ).toHaveBeenCalledWith(logData);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should not log activity when logging is disabled', async () => {
      // Arrange
      const logData = {
        userId: 'user-id',
        actionType: 'LOGIN_SUCCESS',
        actor: {
          username: 'Test User',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        },
        resource: {
          type: 'auth',
          id: 'auth-1',
        },
        details: {
          httpMethod: 'POST',
          httpPath: '/api/auth/login',
        },
        operationStatus: 'SUCCESS',
      };

      // Mock the ConfigService to return false for ACTIVITY_LOGGING_ENABLED
      jest.spyOn(configService, 'get').mockReturnValueOnce(false);

      // Create a new instance of the service with logging disabled
      const disabledService = new ActivityLogService(
        activityLogModel,
        configService,
        sanitizerService,
        queryService,
      );

      // Reset mocks
      jest.clearAllMocks();

      // Act
      await disabledService.logActivity(
        logData as unknown as Partial<ActivityLog> & { userId: string },
      );

      // Assert
      expect(
        jest.spyOn(sanitizerService, 'sanitizeLogData'),
      ).not.toHaveBeenCalled();
    });

    it('should handle errors during logging', async () => {
      // Arrange
      const logData = {
        userId: 'user-id',
        actionType: 'LOGIN_SUCCESS',
        actor: {
          username: 'Test User',
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
        },
        resource: {
          type: 'auth',
          id: 'auth-1',
        },
        details: {
          httpMethod: 'POST',
          httpPath: '/api/auth/login',
        },
        operationStatus: 'SUCCESS',
      };

      // Mock the sanitizer to return the data
      jest
        .spyOn(sanitizerService, 'sanitizeLogData')
        .mockReturnValueOnce(
          logData as unknown as Partial<ActivityLog> & { userId: string },
        );

      // Create a custom mock for the model that throws an error
      const errorModel = function () {
        return {
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        };
      };

      // Replace the model in the service
      service['activityLogModel'] =
        errorModel as unknown as Model<ActivityLogDocument>;

      // Mock the logger to prevent console output
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(
        service.logActivity(
          logData as unknown as Partial<ActivityLog> & { userId: string },
        ),
      ).resolves.not.toThrow();
      expect(
        jest.spyOn(sanitizerService, 'sanitizeLogData'),
      ).toHaveBeenCalledWith(logData);
    });
  });

  describe('queryLogs', () => {
    it('should call queryService.queryLogs with filter and options', async () => {
      // Arrange
      const filter = { userId: 'user-id' };
      const options = { page: 1, limit: 10 };
      const expectedResult = {
        data: [
          { ...mockActivityLog, __v: 0 } as unknown as ActivityLogDocument,
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      // Use a more specific type that matches what the actual service returns
      // The Document type from mongoose adds additional properties to ActivityLog
      type CompleteActivityLogDocument = Document<
        unknown,
        {},
        ActivityLogDocument
      > &
        ActivityLog &
        Document<unknown, any, any, Record<string, any>> &
        Required<{ _id: unknown }> & { __v: number };

      jest.spyOn(queryService, 'queryLogs').mockResolvedValueOnce({
        data: expectedResult.data as CompleteActivityLogDocument[],
        meta: expectedResult.meta,
      });

      // Act
      const result = await service.queryLogs(filter, options);

      // Assert
      const queryLogsSpy = jest.spyOn(queryService, 'queryLogs');
      expect(queryLogsSpy).toHaveBeenCalledWith(filter, options);
      expect(result).toEqual(expectedResult);
    });
  });
});
