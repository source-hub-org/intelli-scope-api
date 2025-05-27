import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  createMockModel,
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
    action: 'login',
    resource: 'auth',
    details: { ip: '127.0.0.1' },
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const mockSanitizerService = {
      sanitizeLogData: jest.fn().mockImplementation((data) => data),
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
        resource: { type: 'auth' },
        details: { ip: '127.0.0.1' },
      };

      // Mock the sanitizer to return the data
      jest
        .spyOn(sanitizerService, 'sanitizeLogData')
        .mockReturnValueOnce(logData as any);

      // Mock the ObjectId constructor
      const mockObjectId = function () {
        return 'user-id';
      };
      mockObjectId.prototype = Object.create(Types.ObjectId.prototype);
      jest
        .spyOn(Types, 'ObjectId')
        .mockImplementation(() => mockObjectId as any);

      // Create a spy for the save method
      const saveSpy = jest.fn().mockResolvedValue(mockActivityLog);

      // Create a custom model that uses our spy
      const testModel = function () {
        return {
          save: saveSpy,
        };
      };

      // Replace the model in the service
      service['activityLogModel'] = testModel as any;

      // Act
      await service.logActivity(logData as any);

      // Assert
      expect(sanitizerService.sanitizeLogData).toHaveBeenCalledWith(logData);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should not log activity when logging is disabled', async () => {
      // Arrange
      const logData = {
        userId: 'user-id',
        actionType: 'LOGIN_SUCCESS',
        resource: { type: 'auth' },
        details: { ip: '127.0.0.1' },
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
      await disabledService.logActivity(logData as any);

      // Assert
      expect(sanitizerService.sanitizeLogData).not.toHaveBeenCalled();
    });

    it('should handle errors during logging', async () => {
      // Arrange
      const logData = {
        userId: 'user-id',
        actionType: 'LOGIN_SUCCESS',
        resource: { type: 'auth' },
        details: { ip: '127.0.0.1' },
      };

      // Mock the sanitizer to return the data
      jest
        .spyOn(sanitizerService, 'sanitizeLogData')
        .mockReturnValueOnce(logData as any);

      // Create a custom mock for the model that throws an error
      const errorModel = function () {
        return {
          save: jest.fn().mockRejectedValue(new Error('Database error')),
        };
      };

      // Replace the model in the service
      service['activityLogModel'] = errorModel as any;

      // Mock the logger to prevent console output
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(service.logActivity(logData as any)).resolves.not.toThrow();
      expect(sanitizerService.sanitizeLogData).toHaveBeenCalledWith(logData);
    });
  });

  describe('queryLogs', () => {
    it('should call queryService.queryLogs with filter and options', async () => {
      // Arrange
      const filter = { userId: 'user-id' };
      const options = { page: 1, limit: 10 };
      const expectedResult = {
        data: [mockActivityLog as any],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1,
        },
      };

      jest
        .spyOn(queryService, 'queryLogs')
        .mockResolvedValueOnce(expectedResult as any);

      // Act
      const result = await service.queryLogs(filter, options);

      // Assert
      expect(queryService.queryLogs).toHaveBeenCalledWith(filter, options);
      expect(result).toEqual(expectedResult);
    });
  });
});
