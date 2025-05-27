import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { ValidationPipe } from '../../pipes/validation.pipe';
import { createMockI18nService } from '../test-utils';
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import * as classValidator from 'class-validator';
import { plainToInstance } from 'class-transformer';

// Create a test DTO class for validation
class TestDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;
  let i18nService: I18nService;

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationPipe,
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    pipe = module.get<ValidationPipe>(ValidationPipe);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('transform', () => {
    it('should pass validation for valid data', async () => {
      // Arrange
      const validDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: '',
      };

      // Act
      const result = await pipe.transform(validDto, metadata);

      // Assert
      expect(result).toEqual(validDto);
    });

    it('should throw BadRequestException for invalid data', async () => {
      // Arrange
      const invalidDto = {
        name: '',
        email: 'invalid-email',
        password: 'pass',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: '',
      };

      jest
        .spyOn(i18nService, 't')
        .mockReturnValueOnce('Validation error occurred.');

      // Act & Assert
      await expect(pipe.transform(invalidDto, metadata)).rejects.toThrow(
        BadRequestException,
      );
      expect(i18nService.t).toHaveBeenCalledWith(
        'translation.COMMON.VALIDATION_ERROR',
      );
    });

    it('should return the value as is when metatype is not provided', async () => {
      // Arrange
      const value = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        data: '',
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(value);
    });

    it('should return the value as is for primitive types', async () => {
      // Arrange
      const value = 'test-string';

      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(value);
    });

    it('should format validation errors correctly', async () => {
      // Arrange
      const invalidDto = {
        name: '',
        email: 'invalid-email',
        password: 'pass',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: '',
      };

      // Mock the validate function to return specific errors
      const errors = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
          },
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be a valid email',
          },
        },
        {
          property: 'password',
          constraints: {
            minLength: 'password must be at least 6 characters',
          },
        },
      ];

      // Mock the validate function
      jest
        .spyOn(classValidator, 'validate')
        .mockResolvedValueOnce(errors as any);
      jest
        .spyOn(i18nService, 't')
        .mockReturnValueOnce('Validation error occurred.');

      // Act
      try {
        await pipe.transform(invalidDto, metadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        // Assert
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response).toMatchObject({
          message: 'Validation error occurred.',
          error: 'Bad Request',
          errors: expect.arrayContaining([
            expect.objectContaining({
              property: 'name',
              constraints: {
                isNotEmpty: 'name should not be empty',
              },
            }),
            expect.objectContaining({
              property: 'email',
              constraints: {
                isEmail: 'email must be a valid email',
              },
            }),
            expect.objectContaining({
              property: 'password',
              constraints: {
                minLength: 'password must be at least 6 characters',
              },
            }),
          ]),
        });
      }
    });
  });
});
