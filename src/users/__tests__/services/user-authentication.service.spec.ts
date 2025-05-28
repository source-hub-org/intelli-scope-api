import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
  let _i18nService: I18nService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
    hashedRefreshToken: 'hashed_refresh_token',
  };

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

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
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_password');

      // Act
      const result = await service.hashPassword('password');

      // Assert
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('password', 10);
      expect(result).toBe('hashed_password');
    });

    it('should throw InternalServerErrorException when bcrypt.hash fails', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(
        new Error('Bcrypt error'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(service.hashPassword('password')).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
    });
  });

  describe('comparePasswords', () => {
    it('should return true when passwords match', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      // Act
      const result = await service.comparePasswords(
        'password',
        'hashed_password',
      );

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password',
        'hashed_password',
      );
      expect(result).toBe(true);
    });

    it('should return false when passwords do not match', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      // Act
      const result = await service.comparePasswords(
        'wrong_password',
        'hashed_password',
      );

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrong_password',
        'hashed_password',
      );
      expect(result).toBe(false);
    });

    it('should throw InternalServerErrorException when bcrypt.compare fails', async () => {
      // Arrange
      (bcrypt.compare as jest.Mock).mockRejectedValueOnce(
        new Error('Bcrypt error'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(
        service.comparePasswords('password', 'hashed_password'),
      ).rejects.toThrow(InternalServerErrorException);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password',
        'hashed_password',
      );
    });
  });

  describe('setCurrentRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockResolvedValueOnce('hashed_refresh_token');
      jest
        .spyOn(userModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(mockUser as any);

      // Act
      await service.setCurrentRefreshToken('user-id', 'refresh_token');

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('refresh_token', 10);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith('user-id', {
        hashedRefreshToken: 'hashed_refresh_token',
      });
    });

    it('should clear refresh token when null is provided', async () => {
      // Arrange
      jest
        .spyOn(userModel, 'findByIdAndUpdate')
        .mockResolvedValueOnce(mockUser as any);

      // Act
      await service.setCurrentRefreshToken('user-id', null);

      // Assert
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).not.toHaveBeenCalled();
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');
      expect(findByIdAndUpdateSpy).toHaveBeenCalledWith('user-id', {
        hashedRefreshToken: null,
      });
    });

    it('should throw InternalServerErrorException when bcrypt.hash fails', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockRejectedValueOnce(
        new Error('Bcrypt error'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(
        service.setCurrentRefreshToken('user-id', 'refresh_token'),
      ).rejects.toThrow(InternalServerErrorException);
      const hashSpy = jest.spyOn(bcrypt, 'hash');
      expect(hashSpy).toHaveBeenCalledWith('refresh_token', 10);
      const findByIdAndUpdateSpy = jest.spyOn(userModel, 'findByIdAndUpdate');
      expect(findByIdAndUpdateSpy).not.toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true when refresh token is valid', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(true);
    });

    it('should return false when user is not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'nonexistent-id',
      );

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when user has no stored refresh token', async () => {
      // Arrange
      const userWithoutRefreshToken = { ...mockUser, hashedRefreshToken: null };
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(userWithoutRefreshToken),
      } as any);

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should return false when refresh token does not match', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      // Act
      const result = await service.validateRefreshToken(
        'invalid_refresh_token',
        'user-id',
      );

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'invalid_refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(false);
    });

    it('should return false when bcrypt.compare fails', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);
      (bcrypt.compare as jest.Mock).mockRejectedValueOnce(
        new Error('Bcrypt error'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      const result = await service.validateRefreshToken(
        'refresh_token',
        'user-id',
      );

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toBe(false);
    });
  });
});
