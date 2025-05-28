import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { ErrorHandlerService } from '../../services/error-handler.service';
import { createMockI18nService } from '../test-utils';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let i18nService: I18nService;

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest
      .spyOn(I18nContext, 'current')
      .mockReturnValue({ lang: 'en' } as I18nContext<unknown>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorHandlerService,
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDatabaseError', () => {
    it('should throw ConflictException for duplicate key error', () => {
      // Arrange
      const duplicateKeyError = {
        code: 11000,
        message: 'Duplicate key error',
      };
      jest.spyOn(i18nService, 't').mockReturnValueOnce('User already exists');
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act & Assert
      expect(() =>
        service.handleDatabaseError(duplicateKeyError, 'User', 'create'),
      ).toThrow(ConflictException);
      expect(i18nService.t).toHaveBeenCalledWith(
        'translation.USER.ALREADY_EXISTS',
        expect.any(Object),
      );
    });

    it('should throw InternalServerErrorException for other database errors', () => {
      // Arrange
      const otherError = new Error('Database connection error');
      jest.spyOn(i18nService, 't').mockReturnValueOnce('Error creating user');
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act & Assert
      expect(() =>
        service.handleDatabaseError(otherError, 'User', 'create'),
      ).toThrow(InternalServerErrorException);
      expect(i18nService.t).toHaveBeenCalledWith(
        'translation.USER.CREATE_ERROR',
        expect.any(Object),
      );
    });
  });

  describe('handleNotFoundError', () => {
    it('should throw NotFoundException with translated message', () => {
      // Arrange
      const entityId = '123456789012';
      jest.spyOn(i18nService, 't').mockReturnValueOnce('User not found');

      // Act & Assert
      expect(() => service.handleNotFoundError('User', entityId)).toThrow(
        NotFoundException,
      );
      expect(i18nService.t).toHaveBeenCalledWith('translation.USER.NOT_FOUND', {
        lang: 'en',
        args: { id: entityId },
      });
    });
  });

  describe('logError', () => {
    it('should log error with default message', () => {
      // Arrange
      const error = new Error('Test error');
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act
      service.logError(error, 'TestContext');

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should log error with custom message', () => {
      // Arrange
      const error = new Error('Test error');
      const customMessage = 'Custom error message';
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      // Act
      service.logError(error, 'TestContext', customMessage);

      // Assert
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
