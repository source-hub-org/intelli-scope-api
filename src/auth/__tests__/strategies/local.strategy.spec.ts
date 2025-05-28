import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { LocalStrategy } from '../../strategies/local.strategy';
import { AuthService } from '../../auth.service';
import { UserDocument } from '../../../users';
import { createMockI18nService } from '../../../common/__tests__/test-utils';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: AuthService;
  let _i18nService: I18nService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockAuthService = {
    validateUser: jest.fn(),
  };

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest
      .spyOn(I18nContext, 'current')
      .mockReturnValue({ lang: 'en' } as I18nContext<unknown>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get<AuthService>(AuthService);
    _i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user when credentials are valid', async () => {
      // Arrange
      jest
        .spyOn(authService, 'validateUser')
        .mockResolvedValue(
          mockUser as Omit<
            UserDocument,
            'password_hash' | 'hashedRefreshToken'
          >,
        );

      // Act
      const result = await strategy.validate('test@example.com', 'password');

      // Assert
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user validation fails', async () => {
      // Arrange
      jest
        .spyOn(authService, 'validateUser')
        .mockResolvedValue(
          undefined as unknown as Omit<
            UserDocument,
            'password_hash' | 'hashedRefreshToken'
          >,
        );

      // Act & Assert
      await expect(
        strategy.validate('test@example.com', 'wrong_password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'wrong_password',
      );
    });

    it('should propagate exceptions from authService.validateUser', async () => {
      // Arrange
      const error = new UnauthorizedException('Invalid credentials');
      jest.spyOn(authService, 'validateUser').mockRejectedValue(error);

      // Act & Assert
      await expect(
        strategy.validate('test@example.com', 'password'),
      ).rejects.toThrow(error);
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'password',
      );
    });
  });
});
