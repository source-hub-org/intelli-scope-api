import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { Request } from 'express';
import { JwtRefreshTokenStrategy } from '../../strategies/jwt-refresh.strategy';
import { UsersService } from '../../../users/users.service';
import { UserDocument } from '../../../users/schemas/user.schema';
import {
  createMockI18nService,
  createMockConfigService,
} from '../../../common/__tests__/test-utils';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('JwtRefreshTokenStrategy', () => {
  let strategy: JwtRefreshTokenStrategy;
  let usersService: UsersService;
  let configService: ConfigService;
  let i18nService: I18nService;

  // Create a properly typed mock user
  const mockUser: Partial<UserDocument> = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    hashedRefreshToken: 'hashed_refresh_token',
  };

  const mockUsersService = {
    findUserByIdForAuth: jest.fn(),
  };

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
      service: {
        hbsHelper: jest.fn().mockReturnValue(''),
      },
    } as unknown as I18nContext<unknown>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRefreshTokenStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
          }),
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    strategy = module.get<JwtRefreshTokenStrategy>(JwtRefreshTokenStrategy);
    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  // Define types for the test
  type JwtPayload = {
    sub: string;
    username: string;
    tokenType: string;
  };

  // Create a type for the request with refresh token
  type RefreshTokenRequest = Request & {
    body: {
      refresh_token?: string;
    };
  };

  describe('validate', () => {
    it('should return user info when refresh token is valid', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = {
        body: { refresh_token: 'refresh_token' },
      };
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await strategy.validate(
        request as RefreshTokenRequest,
        payload,
      );

      // Assert
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
      expect(result).toEqual({
        userId: 'user-id',
        email: 'test@example.com',
        refreshToken: 'refresh_token',
      });
    });

    it('should throw UnauthorizedException when refresh token is missing from request', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = { body: {} };

      // Act & Assert
      await expect(
        strategy.validate(request as RefreshTokenRequest, payload),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not found', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'nonexistent-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = {
        body: { refresh_token: 'refresh_token' },
      };
      jest.spyOn(usersService, 'findUserByIdForAuth').mockResolvedValue(null);

      // Act & Assert
      await expect(
        strategy.validate(request as RefreshTokenRequest, payload),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should throw ForbiddenException when user has no stored refresh token', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = {
        body: { refresh_token: 'refresh_token' },
      };
      const userWithoutRefreshToken: Partial<UserDocument> = {
        ...mockUser,
        hashedRefreshToken: null,
      };
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(userWithoutRefreshToken as UserDocument);

      // Act & Assert
      await expect(
        strategy.validate(request as RefreshTokenRequest, payload),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
    });

    it('should throw ForbiddenException when refresh token does not match', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = {
        body: { refresh_token: 'invalid_refresh_token' },
      };
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        strategy.validate(request as RefreshTokenRequest, payload),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        'invalid_refresh_token',
        'hashed_refresh_token',
      );
    });

    it('should throw ForbiddenException when bcrypt.compare throws an error', async () => {
      // Arrange
      const payload: JwtPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      const request: Partial<RefreshTokenRequest> = {
        body: { refresh_token: 'refresh_token' },
      };
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser as UserDocument);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Bcrypt error'),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act & Assert
      await expect(
        strategy.validate(request as RefreshTokenRequest, payload),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      expect(bcryptCompareSpy).toHaveBeenCalledWith(
        'refresh_token',
        'hashed_refresh_token',
      );
    });
  });

  describe('constructor', () => {
    it('should throw Error when JWT_REFRESH_SECRET is not defined', () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValue(null);

      // Act & Assert
      expect(() => {
        new JwtRefreshTokenStrategy(configService, usersService, i18nService);
      }).toThrow();
    });
  });
});
