import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../services/token.service';
import { createMockConfigService } from '../../../common/__tests__/test-utils';
import { UserDocument } from '../../../users';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let _configService: ConfigService; // Prefixed with underscore to indicate intentionally unused

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            JWT_ACCESS_SECRET: 'test-jwt-secret',
            JWT_ACCESS_EXPIRATION_TIME: '3600',
            JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
            JWT_REFRESH_EXPIRATION_TIME: '604800',
          }),
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should call jwtService.sign with correct payload and options', () => {
      // Arrange
      jest.spyOn(jwtService, 'sign').mockReturnValue('access_token');

      // Act
      const result = service.generateAccessToken(mockUser as UserDocument);

      // Assert
      const signSpy = jest.spyOn(jwtService, 'sign');
      expect(signSpy).toHaveBeenCalledWith(
        {
          username: 'test@example.com',
          sub: 'user-id',
        },
        {
          secret: 'test-jwt-secret',
          expiresIn: 3600,
        },
      );
      expect(result).toBe('access_token');
    });
  });

  describe('generateRefreshToken', () => {
    it('should call jwtService.sign with correct payload and options', () => {
      // Arrange
      jest.spyOn(jwtService, 'sign').mockReturnValue('refresh_token');

      // Act
      const result = service.generateRefreshToken(mockUser as UserDocument);

      // Assert
      const signSpy = jest.spyOn(jwtService, 'sign');
      expect(signSpy).toHaveBeenCalledWith(
        {
          username: 'test@example.com',
          sub: 'user-id',
          tokenType: 'refresh',
        },
        {
          secret: 'test-jwt-refresh-secret',
          expiresIn: 604800,
        },
      );
      expect(result).toBe('refresh_token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should call jwtService.verify with correct token and options', () => {
      // Arrange
      const mockPayload = { sub: 'user-id', username: 'test@example.com' };
      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);

      // Act
      const result = service.verifyAccessToken('access_token') as {
        sub: string;
        username: string;
      };

      // Assert
      const verifySpy = jest.spyOn(jwtService, 'verify');
      expect(verifySpy).toHaveBeenCalledWith('access_token', {
        secret: 'test-jwt-secret',
      });
      expect(result).toEqual(mockPayload);
    });

    it('should return null when token verification fails', () => {
      // Arrange
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = service.verifyAccessToken('invalid_token') as null;

      // Assert
      const verifySpy = jest.spyOn(jwtService, 'verify');
      expect(verifySpy).toHaveBeenCalledWith('invalid_token', {
        secret: 'test-jwt-secret',
      });
      expect(result).toBeNull();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should call jwtService.verify with correct token and options', () => {
      // Arrange
      const mockPayload = {
        sub: 'user-id',
        username: 'test@example.com',
        tokenType: 'refresh',
      };
      jest.spyOn(jwtService, 'verify').mockReturnValue(mockPayload);

      // Act
      const result = service.verifyRefreshToken('refresh_token') as {
        sub: string;
        username: string;
        tokenType: string;
      };

      // Assert
      const verifySpy = jest.spyOn(jwtService, 'verify');
      expect(verifySpy).toHaveBeenCalledWith('refresh_token', {
        secret: 'test-jwt-refresh-secret',
      });
      expect(result).toEqual(mockPayload);
    });

    it('should return null when token verification fails', () => {
      // Arrange
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = service.verifyRefreshToken('invalid_token') as null;

      // Assert
      const verifySpy = jest.spyOn(jwtService, 'verify');
      expect(verifySpy).toHaveBeenCalledWith('invalid_token', {
        secret: 'test-jwt-refresh-secret',
      });
      expect(result).toBeNull();
    });
  });
});
