import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  HttpException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  ArgumentsHost,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { GlobalExceptionFilter } from '../../filters/global-exception.filter';
import { ConfigService } from '@nestjs/config';
import { createMockI18nService } from '../test-utils';
import { Request, Response } from 'express';

// Define types for our mock objects
interface MockRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
}

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

interface MockHttpContext {
  getRequest: jest.Mock;
  getResponse: jest.Mock;
  getNext: jest.Mock;
}

// Create a helper function to create a mock context
function createMockContext(url = '/api/test', method = 'GET'): ArgumentsHost {
  // Create the mock request
  const mockRequest: MockRequest = {
    url,
    method,
    headers: { 'accept-language': 'en' },
  };

  // Create the mock response with proper typing
  const statusMock = jest.fn().mockReturnThis() as jest.Mock<MockResponse>;
  const jsonMock = jest.fn() as jest.Mock<void, [Record<string, unknown>]>;

  const mockResponse: MockResponse = {
    status: statusMock,
    json: jsonMock,
  };

  // Create the HTTP context with proper typing
  const getRequestMock = jest
    .fn()
    .mockReturnValue(mockRequest) as jest.Mock<MockRequest>;
  const getResponseMock = jest
    .fn()
    .mockReturnValue(mockResponse) as jest.Mock<MockResponse>;
  const getNextMock = jest.fn();

  const mockHttpContext: MockHttpContext = {
    getRequest: getRequestMock,
    getResponse: getResponseMock,
    getNext: getNextMock,
  };

  // Create and return the ArgumentsHost
  return {
    switchToHttp: jest.fn().mockReturnValue(mockHttpContext),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn().mockReturnValue('http'),
    getArgs: jest.fn().mockReturnValue([]),
    getArgByIndex: jest.fn(),
  } as ArgumentsHost;
}

// Define response type for better type safety
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown[];
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let i18nService: I18nService;
  let _configService: ConfigService;

  beforeEach(async () => {
    // Mock I18nContext.current()
    const i18nContextMock = {
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
      service: {
        hbsHelper: jest.fn().mockReturnValue(''),
      },
    } as unknown as I18nContext<unknown>;

    jest.spyOn(I18nContext, 'current').mockReturnValue(i18nContextMock);

    // Mock Logger to prevent console output during tests
    const _loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const _loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});

    const mockConfigService = {
      get: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) => {
          if (key === 'NODE_ENV') return 'development';
          return defaultValue ?? null;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    i18nService = module.get<I18nService>(I18nService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch', () => {
    it('should handle HttpException', () => {
      // Arrange
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const mockContext = createMockContext();

      // Get the mock response in a type-safe way
      const httpContext = mockContext.switchToHttp();
      const response = httpContext.getResponse();

      // Act
      filter.catch(exception, mockContext);

      // Assert - using the response methods directly
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ErrorResponse>>({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          error: 'Bad Request',
        }),
      );
    });

    it('should handle NotFoundException', () => {
      // Arrange
      const exception = new NotFoundException('Resource not found');
      const mockContext = createMockContext('/api/nonexistent');

      // Get the mock response in a type-safe way
      const httpContext = mockContext.switchToHttp();
      const response = httpContext.getResponse();

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ErrorResponse>>({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
          error: 'Not Found',
        }),
      );
    });

    it('should handle BadRequestException with validation errors', () => {
      // Arrange
      const validationErrors = [
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be a valid email',
          },
        },
      ];
      const exception = new BadRequestException({
        message: 'Validation failed',
        errors: validationErrors,
      });
      const mockContext = createMockContext('/api/users', 'POST');

      // Get the mock response in a type-safe way
      const httpContext = mockContext.switchToHttp();
      const response = httpContext.getResponse();

      // Mock i18n translate method
      const _i18nSpy = jest
        .spyOn(i18nService, 't')
        .mockReturnValue('Validation failed');

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ErrorResponse>>({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          error: 'Bad Request',
          details: validationErrors,
        }),
      );
    });

    it('should handle InternalServerErrorException', () => {
      // Arrange
      const exception = new InternalServerErrorException(
        'Something went wrong',
      );
      const mockContext = createMockContext();

      // Get the mock response in a type-safe way
      const httpContext = mockContext.switchToHttp();
      const response = httpContext.getResponse();

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ErrorResponse>>({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
          error: 'Internal Server Error',
        }),
      );
    });

    it('should handle generic Error as InternalServerError', () => {
      // Arrange
      const exception = new Error('Unexpected error');
      const mockContext = createMockContext();

      // Get the mock response in a type-safe way
      const httpContext = mockContext.switchToHttp();
      const response = httpContext.getResponse();

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      // Define expected response with proper typing
      const expectedResponse: ErrorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'translated:translation.COMMON.INTERNAL_ERROR',
        error: 'Internal Server Error',
      };

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining<ErrorResponse>(expectedResponse),
      );
    });
  });
});
