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
import { UserDocument } from '../../users/schemas/user.schema';
import {
  // Import the correct function name
  createMockI18nService,
  createMockConfigService,
} from '../../common/__tests__/test-utils';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let userAuthService: UserAuthenticationService;
  let tokenService: TokenService;
  let _i18nService: I18nService; // Prefixed with underscore to indicate intentionally unused
  let configService: ConfigService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
    hashedRefreshToken: 'hashed_refresh_token',
    toObject: jest.fn().mockReturnValue({
      _id: 'user-id',
      email: 'test@example.com',
      name: 'Test User',
      password_hash: 'hashed_password',
      hashedRefreshToken: 'hashed_refresh_token',
    }),
  } as unknown as UserDocument;

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
    jest.spyOn(I18nContext, 'current').mockReturnValue({
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
      service: {
        hbsHelper: jest.fn().mockReturnValue(''),
      },
    } as unknown as I18nContext<unknown>);

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
    _i18nService = module.get<I18nService>(I18nService);
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
      const findOneByEmailSpy = jest.spyOn(usersService, 'findOneByEmail');
      expect(findOneByEmailSpy).toHaveBeenCalledWith('test@example.com');
      const comparePasswordsSpy = jest.spyOn(
        userAuthService,
        'comparePasswords',
      );
      expect(comparePasswordsSpy).toHaveBeenCalledWith(
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
      const findOneByEmailSpy = jest.spyOn(usersService, 'findOneByEmail');
      expect(findOneByEmailSpy).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      // Arrange
      jest.spyOn(usersService, 'findOneByEmail').mockResolvedValue(mockUser);
      jest.spyOn(userAuthService, 'comparePasswords').mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.validateUser('test@example.com', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
      const findOneByEmailSpy = jest.spyOn(usersService, 'findOneByEmail');
      expect(findOneByEmailSpy).toHaveBeenCalledWith('test@example.com');
      const comparePasswordsSpy = jest.spyOn(
        userAuthService,
        'comparePasswords',
      );
      expect(comparePasswordsSpy).toHaveBeenCalledWith(
        'wrong_password',
        'hashed_password',
      );
    });

    it('should throw Error when user object does not have toObject method', async () => {
      // Arrange
      const userWithoutToObject = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        hashedRefreshToken: 'hashed_refresh_token',
      } as unknown as UserDocument;

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
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const generateAccessTokenSpy = jest.spyOn(
        tokenService,
        'generateAccessToken',
      );
      expect(generateAccessTokenSpy).toHaveBeenCalledWith(mockUser);
      const generateRefreshTokenSpy = jest.spyOn(
        tokenService,
        'generateRefreshToken',
      );
      expect(generateRefreshTokenSpy).toHaveBeenCalledWith(mockUser);
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
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('nonexistent-id');
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
      // Create a properly typed user object for the login method
      const userForLogin = {
        ...mockUserWithoutSensitiveFields,
      } as Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>;
      const result = await service.login(userForLogin);

      // Assert
      const getTokensSpy = jest.spyOn(service, 'getTokens');
      expect(getTokensSpy).toHaveBeenCalledWith('user-id', 'test@example.com');
      const setCurrentRefreshTokenSpy = jest.spyOn(
        usersService,
        'setCurrentRefreshToken',
      );
      expect(setCurrentRefreshTokenSpy).toHaveBeenCalledWith(
        'user-id',
        'refresh_token',
      );
      // Use a type for the expected result to avoid unsafe assignment
      type LoginResponse = {
        message: string;
        user: {
          id: string;
          email: string;
          name: string;
        };
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      // Using a string literal for message to avoid unsafe assignment
      const expectedResponse: LoginResponse = {
        message: 'translated:translation.AUTH.LOGIN_SUCCESS', // Match the translated message
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
      };

      expect(result).toEqual(expectedResponse);
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
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const validateRefreshTokenSpy = jest.spyOn(
        userAuthService,
        'validateRefreshToken',
      );
      expect(validateRefreshTokenSpy).toHaveBeenCalledWith(
        'refresh_token',
        'user-id',
      );
      const getTokensSpy = jest.spyOn(service, 'getTokens');
      expect(getTokensSpy).toHaveBeenCalledWith('user-id', 'test@example.com');
      const setCurrentRefreshTokenSpy = jest.spyOn(
        usersService,
        'setCurrentRefreshToken',
      );
      expect(setCurrentRefreshTokenSpy).toHaveBeenCalledWith(
        'user-id',
        'new_refresh_token',
      );
      // Use a type for the expected result to avoid unsafe assignment
      type RefreshTokenResponse = {
        message: string;
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      // Using a string literal for message to avoid unsafe assignment
      const expectedResponse: RefreshTokenResponse = {
        message: 'translated:translation.AUTH.REFRESH_SUCCESS', // Match the translated message
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      };

      expect(result).toEqual(expectedResponse);
    });

    it('should throw ForbiddenException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findUserByIdForAuth').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.refreshToken('nonexistent-id', 'refresh_token'),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('nonexistent-id');
    });

    it('should throw ForbiddenException when user has no stored refresh token', async () => {
      // Arrange
      const userWithoutRefreshToken = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: 'hashed_password',
        hashedRefreshToken: null,
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          password_hash: 'hashed_password',
          hashedRefreshToken: null,
        }),
      } as unknown as UserDocument;

      jest
        .spyOn(usersService, 'findUserByIdForAuth')
        .mockResolvedValue(userWithoutRefreshToken);

      // Act & Assert
      await expect(
        service.refreshToken('user-id', 'refresh_token'),
      ).rejects.toThrow(ForbiddenException);
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
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
      const findUserByIdForAuthSpy = jest.spyOn(
        usersService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      const validateRefreshTokenSpy = jest.spyOn(
        userAuthService,
        'validateRefreshToken',
      );
      expect(validateRefreshTokenSpy).toHaveBeenCalledWith(
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
      const setCurrentRefreshTokenSpy = jest.spyOn(
        usersService,
        'setCurrentRefreshToken',
      );
      expect(setCurrentRefreshTokenSpy).toHaveBeenCalledWith('user-id', null);
      // Use a type for the expected result to avoid unsafe assignment
      type LogoutResponse = {
        message: string;
      };

      // Using a string literal for message to avoid unsafe assignment
      const expectedResponse: LogoutResponse = {
        message: 'translated:translation.AUTH.LOGOUT_SUCCESS', // Match the translated message
      };

      expect(result).toEqual(expectedResponse);
    });
  });
});
