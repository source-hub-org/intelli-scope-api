import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { UserAuthenticationService } from '../../users/services/user-authentication.service';
import { TokenService } from '../services/token.service';
import {
  createMockDocument,
  createMockI18nService,
  createMockConfigService,
} from '../../common/__tests__/test-utils';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let userAuthService: UserAuthenticationService;
  let tokenService: TokenService;
  let i18nService: I18nService;
  let configService: ConfigService;

  const mockUser = createMockDocument({
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
    hashedRefreshToken: 'hashed_refresh_token',
  });

  const mockUserWithoutSensitiveFields = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Create mock implementations
    const mockUsersService = {
      findOneByEmail: jest.fn(),
      findUserByIdForAuth: jest.fn(),
      setCurrentRefreshToken: jest.fn(),
      findById: jest.fn(),
    };

    const mockUserAuthService = {
      comparePasswords: jest.fn(),
      validateRefreshToken: jest.fn(),
    };

    const mockTokenService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: UserAuthenticationService,
          useValue: mockUserAuthService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            JWT_ACCESS_EXPIRATION_TIME: '3600',
          }),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    userAuthService = module.get<UserAuthenticationService>(
      UserAuthenticationService,
    );
    tokenService = module.get<TokenService>(TokenService);
    i18nService = module.get<I18nService>(I18nService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without sensitive fields when credentials are valid', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userAuthService, 'comparePasswords').mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(userAuthService.comparePasswords).toHaveBeenCalledWith(
        'password',
        'hashed_password',
      );
      expect(result).toEqual(
        expect.objectContaining({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        }),
      );
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.validateUser('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        'nonexistent@example.com',
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userAuthService, 'comparePasswords').mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(userAuthService.comparePasswords).toHaveBeenCalledWith(
        'wrong_password',
        'hashed_password',
      );
    });

    it('should throw Error when user object does not have toObject method', async () => {
      // Arrange
      const userWithoutToObject = { ...mockUser };
      delete userWithoutToObject.toObject;
      jest
        .spyOn(usersService, 'findOneByEmail')
        .mockResolvedValue(userWithoutToObject);
      jest.spyOn(userAuthService, 'comparePasswords').mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow('User object does not have toObject method');
    });
  });

  describe('getTokens', () => {
    it('should return tokens when user exists', async () => {
      // Arrange
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser);
      jest
        .spyOn(tokenService, 'generateAccessToken')
        .mockReturnValue('access_token');
      jest
        .spyOn(tokenService, 'generateRefreshToken')
        .mockReturnValue('refresh_token');

      // Act
      const result = await service.getTokens('user-id', 'test@example.com');

      // Assert
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith('user-id');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(mockUser);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findUserByIdForAuth').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getTokens('nonexistent-id', 'test@example.com'),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith(
        'nonexistent-id',
      );
    });

    it('should throw InternalServerErrorException when access token expiration is invalid', async () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValue('invalid');

      // Act & Assert
      await expect(
        service.getTokens('user-id', 'test@example.com'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('login', () => {
    it('should return login response with tokens and user info', async () => {
      // Arrange
      jest.spyOn(service, 'getTokens').mockResolvedValue({
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
      });
      jest.spyOn(usersService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      const result = await service.login(mockUserWithoutSensitiveFields as any);

      // Assert
      expect(service.getTokens).toHaveBeenCalledWith(
        'user-id',
        'test@example.com',
      );
      expect(usersService.setCurrentRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'refresh_token',
      );
      expect(result).toEqual({
        message: expect.any(String),
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
      });
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      // Arrange
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser);
      jest
        .spyOn(userAuthService, 'validateRefreshToken')
        .mockResolvedValue(true);
      jest.spyOn(service, 'getTokens').mockResolvedValue({
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      });
      jest.spyOn(usersService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      const result = await service.refreshToken('user-id', 'refresh_token');

      // Assert
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith('user-id');
      expect(userAuthService.validateRefreshToken).toHaveBeenCalledWith(
        'refresh_token',
        'user-id',
      );
      expect(service.getTokens).toHaveBeenCalledWith(
        'user-id',
        'test@example.com',
      );
      expect(usersService.setCurrentRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'new_refresh_token',
      );
      expect(result).toEqual({
        message: expect.any(String),
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      });
    });

    it('should throw ForbiddenException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findUserByIdForAuth').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.refreshToken('nonexistent-id', 'refresh_token'),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith(
        'nonexistent-id',
      );
    });

    it('should throw ForbiddenException when user has no stored refresh token', async () => {
      // Arrange
      const userWithoutRefreshToken = { ...mockUser, hashedRefreshToken: null };
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(userWithoutRefreshToken);

      // Act & Assert
      await expect(
        service.refreshToken('user-id', 'refresh_token'),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith('user-id');
    });

    it('should throw ForbiddenException when refresh token is invalid', async () => {
      // Arrange
      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser);
      jest
        .spyOn(userAuthService, 'validateRefreshToken')
        .mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.refreshToken('user-id', 'invalid_refresh_token'),
      ).rejects.toThrow(ForbiddenException);
      expect(usersService.findUserByIdForAuth).toHaveBeenCalledWith('user-id');
      expect(userAuthService.validateRefreshToken).toHaveBeenCalledWith(
        'invalid_refresh_token',
        'user-id',
      );
    });
  });

  describe('logout', () => {
    it('should clear refresh token and return success message', async () => {
      // Arrange
      jest.spyOn(usersService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      const result = await service.logout('user-id');

      // Assert
      expect(usersService.setCurrentRefreshToken).toHaveBeenCalledWith(
        'user-id',
        null,
      );
      expect(result).toEqual({
        message: expect.any(String),
      });
    });
  });
});
