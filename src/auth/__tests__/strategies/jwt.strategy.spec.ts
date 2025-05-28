import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { JwtStrategy } from '../../strategies/jwt.strategy';
import { UsersService } from '../../../users/users.service';
import {
  createMockI18nService,
  createMockConfigService,
} from '../../../common/__tests__/test-utils';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: UsersService;
  let configService: ConfigService;
  let i18nService: I18nService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService({
            JWT_ACCESS_SECRET: 'test-jwt-access-secret',
          }),
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
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

  describe('validate', () => {
    it('should return user info when token payload is valid', async () => {
      // Arrange
      const payload = { sub: 'user-id', username: 'test@example.com' };
      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as any);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      const findByIdSpy = jest.spyOn(usersService, 'findById');
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({
        userId: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload = { sub: 'nonexistent-id', username: 'test@example.com' };
      jest.spyOn(usersService, 'findById').mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      const findByIdSpy = jest.spyOn(usersService, 'findById');
      expect(findByIdSpy).toHaveBeenCalledWith('nonexistent-id');
    });
  });

  describe('constructor', () => {
    it('should throw Error when JWT_ACCESS_SECRET is not defined', () => {
      // Arrange
      jest.spyOn(configService, 'get').mockReturnValue(null);

      // Act & Assert
      expect(() => {
        new JwtStrategy(configService, usersService, i18nService);
      }).toThrow();
    });
  });
});
