import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  HttpException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { GlobalExceptionFilter } from '../../filters/global-exception.filter';
import { ConfigService } from '@nestjs/config';
import { createMockI18nService } from '../test-utils';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let i18nService: I18nService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

    // Mock Logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    const mockConfigService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'NODE_ENV') return 'development';
        return null;
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
    configService = module.get<ConfigService>(ConfigService);
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
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/api/test',
            method: 'GET',
            headers: { 'accept-language': 'en' },
          }),
          getResponse: jest.fn().mockReturnValue({
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          }),
        }),
      } as any;

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(
        mockContext.switchToHttp().getResponse().status,
      ).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(
        mockContext.switchToHttp().getResponse().json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Test error',
          error: 'Bad Request',
        }),
      );
    });

    it('should handle NotFoundException', () => {
      // Arrange
      const exception = new NotFoundException('Resource not found');
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/api/nonexistent',
            method: 'GET',
            headers: { 'accept-language': 'en' },
          }),
          getResponse: jest.fn().mockReturnValue({
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          }),
        }),
      } as any;

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(
        mockContext.switchToHttp().getResponse().status,
      ).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(
        mockContext.switchToHttp().getResponse().json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
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
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/api/users',
            method: 'POST',
            headers: { 'accept-language': 'en' },
          }),
          getResponse: jest.fn().mockReturnValue({
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          }),
        }),
      } as any;

      // Mock i18n translate method
      jest.spyOn(i18nService, 't').mockReturnValue('Validation failed');

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(
        mockContext.switchToHttp().getResponse().status,
      ).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(
        mockContext.switchToHttp().getResponse().json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
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
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/api/test',
            method: 'GET',
            headers: { 'accept-language': 'en' },
          }),
          getResponse: jest.fn().mockReturnValue({
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          }),
        }),
      } as any;

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(
        mockContext.switchToHttp().getResponse().status,
      ).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(
        mockContext.switchToHttp().getResponse().json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something went wrong',
          error: 'Internal Server Error',
        }),
      );
    });

    it('should handle generic Error as InternalServerError', () => {
      // Arrange
      const exception = new Error('Unexpected error');
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url: '/api/test',
            method: 'GET',
            headers: { 'accept-language': 'en' },
          }),
          getResponse: jest.fn().mockReturnValue({
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
          }),
        }),
      } as any;

      // Act
      filter.catch(exception, mockContext);

      // Assert
      expect(
        mockContext.switchToHttp().getResponse().status,
      ).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(
        mockContext.switchToHttp().getResponse().json,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: expect.any(String),
          error: 'Internal Server Error',
        }),
      );
    });
  });
});
