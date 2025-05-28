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
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'VERBOSE_REQUEST_LOGGING') return false as boolean;
        if (key === 'REQUEST_LOG_EXCLUDE_PATHS')
          return '/health,/metrics' as string;
        return defaultValue as string;
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

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      handleSpy.mockReturnValue(of(responseData));
      const getSpy = jest.spyOn(clsService, 'get');
      getSpy.mockReturnValue(Date.now() - 100); // 100ms ago
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      const result$ = interceptor.intercept(mockContext, mockCallHandler);

      // Assert
      result$.subscribe({
        next: (response) => {
          expect(response).toEqual(responseData);
        },
        complete: () => {
          const logCalls = logSpy.mock.calls;
          expect(logCalls.length).toBeGreaterThanOrEqual(2);

          // Check if any call contains the expected strings
          const requestLogFound = logCalls.some((call) => {
            const message = String(call[0]);
            return (
              message.includes('GET /api/test') &&
              message.includes('Incoming Request')
            );
          });

          const responseLogFound = logCalls.some((call) => {
            const message = String(call[0]);
            return (
              message.includes('GET /api/test') && message.includes('Response:')
            );
          });

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

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      handleSpy.mockReturnValue(of(responseData));
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      void interceptor.intercept(mockContext, mockCallHandler).subscribe();

      // Assert
      expect(logSpy).not.toHaveBeenCalled();
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

      const getSpy = jest.spyOn(clsService, 'get');
      getSpy.mockReturnValue(Date.now() - 100); // 100ms ago
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      // Create an observable that will emit an error
      const errorObservable = new Observable((subscriber) => {
        subscriber.error(new Error('Test error'));
      });

      // Mock the call handler to return our error observable
      const mockCallHandler = {
        handle: () => errorObservable,
      } as CallHandler;

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      handleSpy.mockReturnValue(errorObservable);

      // Act - subscribe to trigger the error
      interceptor.intercept(mockContext, mockCallHandler).subscribe({
        error: (err) => {
          // Assert
          const errorMessage = err instanceof Error ? err.message : String(err);
          expect(errorMessage).toBe('Test error');
          expect(errorSpy).toHaveBeenCalled();
          const errorLogCalls = errorSpy.mock.calls;
          expect(errorLogCalls.length).toBeGreaterThanOrEqual(1);

          // Check if any call contains the expected strings
          const errorLogFound = errorLogCalls.some((call) => {
            const message = String(call[0]);
            return (
              message.includes('GET /api/test') && message.includes('Error:')
            );
          });

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

      const handleSpy = jest.spyOn(mockCallHandler, 'handle');
      handleSpy.mockReturnValue(of({}));
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      void interceptor.intercept(mockContext, mockCallHandler).subscribe();

      // Assert
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('should log request body in verbose mode', (done) => {
      // Arrange - create a new interceptor with verbose logging enabled
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: unknown) => {
          if (key === 'VERBOSE_REQUEST_LOGGING') return true as boolean;
          if (key === 'REQUEST_LOG_EXCLUDE_PATHS')
            return '/health,/metrics' as string;
          return defaultValue as string;
        }),
      };

      // Use async/await with proper error handling to avoid floating promises
      void (async () => {
        try {
          const compiledModule = await Test.createTestingModule({
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

          const handleSpy = jest.spyOn(mockCallHandler, 'handle');
          handleSpy.mockReturnValue(of(responseData));
          const debugSpy = jest.spyOn(Logger.prototype, 'debug');

          // Act
          verboseInterceptor.intercept(mockContext, mockCallHandler).subscribe({
            complete: () => {
              // Assert
              const debugCalls = debugSpy.mock.calls;
              expect(debugCalls.length).toBeGreaterThanOrEqual(2);

              // Check if any call contains the expected strings
              const requestBodyLogFound = debugCalls.some((call) => {
                const message = String(call[0]);
                return (
                  message.includes('Request Body:') &&
                  !message.includes('secret123')
                );
              });

              const responseBodyLogFound = debugCalls.some((call) => {
                const message = String(call[0]);
                return (
                  message.includes('Response Body:') &&
                  message.includes('testuser')
                );
              });

              expect(requestBodyLogFound).toBe(true);
              expect(responseBodyLogFound).toBe(true);
              done();
            },
          });
        } catch (error) {
          done(error instanceof Error ? error : new Error(String(error)));
        }
      })();
    });
  });
});
