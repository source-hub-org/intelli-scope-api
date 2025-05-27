import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import { of, Observable } from 'rxjs';
import { RequestLoggingInterceptor } from '../../interceptors/request-logging.interceptor';
import { createMockClsService } from '../test-utils';

describe('RequestLoggingInterceptor', () => {
  let interceptor: RequestLoggingInterceptor;
  let clsService: ClsService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key, defaultValue) => {
        if (key === 'VERBOSE_REQUEST_LOGGING') return false;
        if (key === 'REQUEST_LOG_EXCLUDE_PATHS') return '/health,/metrics';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLoggingInterceptor,
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

    interceptor = module.get<RequestLoggingInterceptor>(
      RequestLoggingInterceptor,
    );
    clsService = module.get<ClsService>(ClsService);
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept', () => {
    it('should log request and response information', (done) => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        path: '/api/test',
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
      } as unknown as ExecutionContext;

      const responseData = { id: 1, name: 'Test' };
      const mockCallHandler = {
        handle: () => of(responseData),
      } as CallHandler;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(responseData));
      jest.spyOn(clsService, 'get').mockReturnValue(Date.now() - 100); // 100ms ago
      jest.spyOn(Logger.prototype, 'log');

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (response) => {
          expect(response).toEqual(responseData);
        },
        complete: () => {
          const logCalls = (Logger.prototype.log as jest.Mock).mock.calls;
          expect(logCalls.length).toBeGreaterThanOrEqual(2);

          // Check if any call contains the expected strings
          const requestLogFound = logCalls.some(
            (call) =>
              call[0].includes('GET /api/test') &&
              call[0].includes('Incoming Request'),
          );

          const responseLogFound = logCalls.some(
            (call) =>
              call[0].includes('GET /api/test') &&
              call[0].includes('Response:'),
          );

          expect(requestLogFound).toBe(true);
          expect(responseLogFound).toBe(true);
          done();
        },
      });
    });

    it('should skip logging for excluded paths', () => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/health',
        path: '/health',
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
      } as unknown as ExecutionContext;

      const responseData = { status: 'ok' };
      const mockCallHandler = {
        handle: () => of(responseData),
      } as CallHandler;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(responseData));
      jest.spyOn(Logger.prototype, 'log');

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe();

      // Assert
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('should log errors', (done) => {
      // Arrange
      const mockRequest = {
        method: 'GET',
        url: '/api/test',
        path: '/api/test',
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
      } as unknown as ExecutionContext;

      jest.spyOn(clsService, 'get').mockReturnValue(Date.now() - 100); // 100ms ago
      jest.spyOn(Logger.prototype, 'error');

      // Create an observable that will emit an error
      const errorObservable = new Observable((subscriber) => {
        subscriber.error(new Error('Test error'));
      });

      // Mock the call handler to return our error observable
      const mockCallHandler = {
        handle: () => errorObservable,
      } as CallHandler;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(errorObservable);

      // Act - subscribe to trigger the error
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: (err) => {
          // Assert
          expect(err.message).toBe('Test error');
          expect(Logger.prototype.error).toHaveBeenCalled();
          const errorLogCalls = (Logger.prototype.error as jest.Mock).mock
            .calls;
          expect(errorLogCalls.length).toBeGreaterThanOrEqual(1);

          // Check if any call contains the expected strings
          const errorLogFound = errorLogCalls.some(
            (call) =>
              call[0].includes('GET /api/test') && call[0].includes('Error:'),
          );

          expect(errorLogFound).toBe(true);
          done();
        },
      });
    });

    it('should not log for non-http requests', () => {
      // Arrange
      const mockContext = {
        getType: jest.fn().mockReturnValue('rpc'),
      } as unknown as ExecutionContext;

      const mockCallHandler = {
        handle: () => of({}),
      } as CallHandler;

      jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of({}));
      jest.spyOn(Logger.prototype, 'log');

      // Act
      interceptor.intercept(mockContext, mockCallHandler).subscribe();

      // Assert
      expect(Logger.prototype.log).not.toHaveBeenCalled();
    });

    it('should log request body in verbose mode', (done) => {
      // Arrange - create a new interceptor with verbose logging enabled
      const mockConfigService = {
        get: jest.fn((key, defaultValue) => {
          if (key === 'VERBOSE_REQUEST_LOGGING') return true;
          if (key === 'REQUEST_LOG_EXCLUDE_PATHS') return '/health,/metrics';
          return defaultValue;
        }),
      };

      const module = Test.createTestingModule({
        providers: [
          RequestLoggingInterceptor,
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

      module.then((compiledModule) => {
        const verboseInterceptor =
          compiledModule.get<RequestLoggingInterceptor>(
            RequestLoggingInterceptor,
          );

        const mockRequest = {
          method: 'POST',
          url: '/api/users',
          path: '/api/users',
          ip: '127.0.0.1',
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
          body: {
            username: 'testuser',
            password: 'secret123',
          },
        };

        const mockContext = {
          switchToHttp: jest.fn().mockReturnValue({
            getRequest: jest.fn().mockReturnValue(mockRequest),
            getResponse: jest.fn().mockReturnValue({
              statusCode: 201,
            }),
          }),
          getType: jest.fn().mockReturnValue('http'),
        } as unknown as ExecutionContext;

        const responseData = { id: 1, username: 'testuser' };
        const mockCallHandler = {
          handle: () => of(responseData),
        } as CallHandler;

        jest.spyOn(mockCallHandler, 'handle').mockReturnValue(of(responseData));
        jest.spyOn(Logger.prototype, 'debug');

        // Act
        verboseInterceptor.intercept(mockContext, mockCallHandler).subscribe({
          complete: () => {
            // Assert
            const debugCalls = (Logger.prototype.debug as jest.Mock).mock.calls;
            expect(debugCalls.length).toBeGreaterThanOrEqual(2);

            // Check if any call contains the expected strings
            const requestBodyLogFound = debugCalls.some(
              (call) =>
                call[0].includes('Request Body:') &&
                !call[0].includes('secret123'),
            );

            const responseBodyLogFound = debugCalls.some(
              (call) =>
                call[0].includes('Response Body:') &&
                call[0].includes('testuser'),
            );

            expect(requestBodyLogFound).toBe(true);
            expect(responseBodyLogFound).toBe(true);
            done();
          },
        });
      });
    });
  });
});
