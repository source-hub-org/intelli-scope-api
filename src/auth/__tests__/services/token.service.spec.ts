import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../services/token.service';
import { createMockConfigService } from '../../../common/__tests__/test-utils';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

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
            JWT_SECRET: 'test-jwt-secret',
            JWT_EXPIRATION: '15m',
            JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
            JWT_REFRESH_EXPIRATION: '7d',
          }),
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
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
      const result = service.generateAccessToken(mockUser as any);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          username: 'test@example.com',
          sub: 'user-id',
        },
        {
          secret: 'test-jwt-secret',
          expiresIn: '15m',
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
      const result = service.generateRefreshToken(mockUser as any);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          username: 'test@example.com',
          sub: 'user-id',
          tokenType: 'refresh',
        },
        {
          secret: 'test-jwt-refresh-secret',
          expiresIn: '7d',
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
      const result = service.verifyAccessToken('access_token');

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith('access_token', {
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
      const result = service.verifyAccessToken('invalid_token');

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith('invalid_token', {
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
      const result = service.verifyRefreshToken('refresh_token');

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith('refresh_token', {
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
      const result = service.verifyRefreshToken('invalid_token');

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith('invalid_token', {
        secret: 'test-jwt-refresh-secret',
      });
      expect(result).toBeNull();
    });
  });
});
