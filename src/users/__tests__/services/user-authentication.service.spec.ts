import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { UserAuthenticationService } from '../../services/user-authentication.service';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  createMockI18nService,
  createMockModel,
} from '../../../common/__tests__/test-utils';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UserAuthenticationService', () => {
  let service: UserAuthenticationService;
  let userModel: Model<UserDocument>;
  // Unused variable prefixed with underscore to indicate it's intentionally unused
  let _i18nService: I18nService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
    hashedRefreshToken: 'hashed_refresh_token',
  };

  // Using _MockUser with underscore prefix to indicate it's used for type checking only
  type _MockUser = typeof mockUser;

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
      service: {} as any,
      id: 'test-id',
      i18n: jest.fn(),
      translate: jest.fn(),
      validate: jest.fn(),
    } as unknown as I18nContext<unknown>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAuthenticationService,
        {
          provide: getModelToken(User.name),
          useValue: createMockModel(mockUser),
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    service = module.get<UserAuthenticationService>(UserAuthenticationService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    _i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      // Arrange
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValueOnce('hashed_password');

      // Act
      const result = await service.hashPassword('password');

      // Assert
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('password', 10);
      expect(result).toBe('hashed_password');
    });

    it('should throw InternalServerErrorException when bcrypt.hash fails', async () => {
      // Arrange
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockRejectedValueOnce(new Error('Bcrypt error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act & Assert
      await expect(service.hashPassword('password')).rejects.toThrow(
        InternalServerErrorException,
      );

      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('password', 10);

      // Clean up
      consoleSpy.mockRestore();
    });
  });

  describe('comparePasswords', () => {
    it('should return true when passwords match', async () => {
      // Arrange
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValueOnce(true);

      // Act
      const result = await service.comparePasswords(
        'password',
        'hashed_password',
      );

      // Assert
      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith('password', 'hashed_password');
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      // Arrange
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValueOnce(false);

      // Act
      const result = await service.comparePasswords(
        'wrong_password',
        'hashed_password',
      );

      // Assert
      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith(
        'wrong_password',
        'hashed_password',
      );
      expect(result).toBe(false);
    });

    it('should throw InternalServerErrorException when bcrypt.compare fails', async () => {
      // Arrange
      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockRejectedValueOnce(new Error('Bcrypt error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act & Assert
      await expect(
        service.comparePasswords('password', 'hashed_password'),
      ).rejects.toThrow(InternalServerErrorException);

      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith('password', 'hashed_password');

      // Clean up
      consoleSpy.mockRestore();
    });
  });

  describe('setCurrentRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      // Arrange
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockResolvedValueOnce('hashed_refresh_token');

      const findByIdAndUpdateSpy = jest
        .spyOn(userModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(mockUser as unknown as UserDocument);

      // Act
      await service.setCurrentRefreshToken('user-id', 'refresh_token');

      // Assert
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('refresh_token', 10);
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('user-id', {
        hashedRefreshToken: 'hashed_refresh_token',
      });
    });

    it('should clear refresh token when null is provided', async () => {
      // Arrange
      const findByIdAndUpdateSpy = jest
        .spyOn(userModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(mockUser as unknown as UserDocument);

      // Act
      await service.setCurrentRefreshToken('user-id', null);

      // Assert
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).not.toHaveBeenCalled();
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('user-id', {
        hashedRefreshToken: null,
      });
    });

    it('should throw InternalServerErrorException when bcrypt.hash fails', async () => {
      // Arrange
      const hashMock = bcrypt.hash as jest.Mock;
      hashMock.mockRejectedValueOnce(new Error('Bcrypt error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');

      // Act & Assert
      await expect(
        service.setCurrentRefreshToken('user-id', 'refresh_token'),
      ).rejects.toThrow(InternalServerErrorException);

      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('refresh_token', 10);
      expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();

      // Clean up
      consoleSpy.mockRestore();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true when refresh token is valid', async () => {
      // Arrange
      // Create a properly typed mock query
      const mockExecFn = jest.fn().mockResolvedValueOnce(mockUser);
      const mockQuery = { exec: mockExecFn } as unknown as Query<
        unknown,
        unknown,
        {},
        UserDocument
      >;

      const findByIdSpy = jest
        .spyOn(userModel, 'findById')
        .mockReturnValueOnce(mockQuery);

      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValueOnce(true);

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');

      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(true);
    });

    it('should return false when user is not found', async () => {
      // Arrange
      // Create a properly typed mock query
      const mockExecFn = jest.fn().mockResolvedValueOnce(null);
      const mockQuery = { exec: mockExecFn } as unknown as Query<
        unknown,
        unknown,
        {},
        UserDocument
      >;

      const findByIdSpy = jest
        .spyOn(userModel, 'findById')
        .mockReturnValueOnce(mockQuery);

      const compareSpy = jest.spyOn(bcrypt, 'compare');

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'nonexistent-id',
      );

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('nonexistent-id');
      expect(compareSpy).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when user has no stored refresh token', async () => {
      // Arrange
      const userWithoutRefreshToken = { ...mockUser, hashedRefreshToken: null };

      // Create a properly typed mock query
      const mockExecFn = jest
        .fn()
        .mockResolvedValueOnce(userWithoutRefreshToken);
      const mockQuery = { exec: mockExecFn } as unknown as Query<
        unknown,
        unknown,
        {},
        UserDocument
      >;

      const findByIdSpy = jest
        .spyOn(userModel, 'findById')
        .mockReturnValueOnce(mockQuery);

      const compareSpy = jest.spyOn(bcrypt, 'compare');

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');
      expect(compareSpy).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when refresh token does not match', async () => {
      // Arrange
      // Create a properly typed mock query
      const mockExecFn = jest.fn().mockResolvedValueOnce(mockUser);
      const mockQuery = { exec: mockExecFn } as unknown as Query<
        unknown,
        unknown,
        {},
        UserDocument
      >;

      const findByIdSpy = jest
        .spyOn(userModel, 'findById')
        .mockReturnValueOnce(mockQuery);

      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockResolvedValueOnce(false);

      // Act
      const result = await service.validateRefreshToken(
        'invalid_refresh_token',
        'user-id',
      );

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');

      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith(
        'invalid_refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(false);
    });

    it('should return false when bcrypt.compare fails', async () => {
      // Arrange
      // Create a properly typed mock query
      const mockExecFn = jest.fn().mockResolvedValueOnce(mockUser);
      const mockQuery = { exec: mockExecFn } as unknown as Query<
        unknown,
        unknown,
        {},
        UserDocument
      >;

      const findByIdSpy = jest
        .spyOn(userModel, 'findById')
        .mockReturnValueOnce(mockQuery);

      const compareMock = bcrypt.compare as jest.Mock;
      compareMock.mockRejectedValueOnce(new Error('Bcrypt error'));

      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');

      const compareSpy = jest.spyOn(bcrypt, 'compare');
      expect(compareSpy).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(false);

      // Clean up
      consoleSpy.mockRestore();
    });
  });
});
