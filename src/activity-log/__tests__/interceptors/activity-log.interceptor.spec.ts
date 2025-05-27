import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { ActivityLogInterceptor } from '../../interceptors/activity-log.interceptor';
import { ActivityLogService } from '../../activity-log.service';
import { createMockClsService } from '../../../common/__tests__/test-utils';

describe('ActivityLogInterceptor', () => {
  let interceptor: ActivityLogInterceptor;
  let activityLogService: ActivityLogService;
  let clsService: ClsService;

  const mockActivityLogService = {
    logActivity: jest.fn(),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'ACTIVITY_LOG_EXCLUDE_PATHS') return '/health,/metrics';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogInterceptor,
        {
          provide: ActivityLogService,
          useValue: mockActivityLogService,
        },
        {
          provide: ClsService,
          useValue: createMockClsService(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    interceptor = module.get<ActivityLogInterceptor>(ActivityLogInterceptor);
    activityLogService = module.get<ActivityLogService>(ActivityLogService);
    clsService = module.get<ClsService>(ClsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log activity when user is authenticated', async () => {
      // Arrange
      const mockRequest = {
        method: 'POST',
        url: '/api/auth/login',
        path: '/api/auth/login',
        user: { userId: 'user-id', email: 'test@example.com' },
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getHandler: jest.fn().mockReturnValue({
          name: 'login',
        }),
        getClass: jest.fn().mockReturnValue({
          name: 'AuthController',
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ success: true })),
      } as CallHandler;

      jest.spyOn(clsService, 'getId').mockReturnValue('trace-id');

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Wait for observable to complete
      await new Promise<void>((resolve) => {
        result$.subscribe({
          complete: () => {
            resolve();
          },
        });
      });

      // Assert
      expect(activityLogService.logActivity).toHaveBeenCalled();
      const callArg = (activityLogService.logActivity as jest.Mock).mock
        .calls[0][0];
      expect(callArg.traceId).toBe('trace-id');
    });

    it('should not log activity when user is not authenticated', async () => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/public/data',
        path: '/api/public/data',
        // No user property
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 200,
          }),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getHandler: jest.fn().mockReturnValue({
          name: 'getData',
        }),
        getClass: jest.fn().mockReturnValue({
          name: 'PublicController',
        }),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: jest.fn().mockReturnValue(of({ data: 'public data' })),
      } as CallHandler;

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Wait for observable to complete
      await new Promise<void>((resolve) => {
        result$.subscribe({
          complete: () => {
            resolve();
          },
        });
      });

      // Assert
      expect(activityLogService.logActivity).not.toHaveBeenCalled();
    });

    it('should handle errors in the request pipeline', async () => {
      // Arrange
      const mockRequest = {
        method: 'POST',
        url: '/api/users',
        path: '/api/users',
        user: { userId: 'user-id', email: 'test@example.com' },
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mozilla/5.0',
        },
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
          getResponse: jest.fn().mockReturnValue({
            statusCode: 500,
          }),
        }),
        getType: jest.fn().mockReturnValue('http'),
        getHandler: jest.fn().mockReturnValue({
          name: 'createUser',
        }),
        getClass: jest.fn().mockReturnValue({
          name: 'UsersController',
        }),
      } as unknown as ExecutionContext;

      const error = new Error('Test error');
      const mockCallHandler = {
        handle: jest.fn().mockImplementation(() => {
          throw error;
        }),
      } as unknown as CallHandler;

      jest.spyOn(clsService, 'getId').mockReturnValue('trace-id');

      // Act & Assert
      expect(() => interceptor.intercept(mockContext, mockCallHandler)).toThrow(
        error,
      );
    });
  });
});
