import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call authService.login with user from request', async () => {
      // Arrange
      const mockUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockRequest = { user: mockUser };
      const mockLoginResponse = {
        message: 'Login successful',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        access_token: 'access_token',
        refresh_token: 'refresh_token',
        expires_in: 3600,
      };
      jest.spyOn(authService, 'login').mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.login(mockRequest as any);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResponse);
    });
  });

  describe('getProfile', () => {
    it('should return user from request', () => {
      // Arrange
      const mockUser = {
        userId: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockRequest = { user: mockUser };

      // Act
      const result = controller.getProfile(mockRequest as any);

      // Assert
      expect(result).toEqual(mockUser);
    });
  });

  describe('refreshToken', () => {
    it('should call authService.refreshToken with userId and refreshToken from request', async () => {
      // Arrange
      const mockUser = {
        userId: 'user-id',
        email: 'test@example.com',
        refreshToken: 'refresh_token',
      };
      const mockRequest = { user: mockUser };
      const mockRefreshResponse = {
        message: 'Token refreshed successfully',
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_in: 3600,
      };
      jest
        .spyOn(authService, 'refreshToken')
        .mockResolvedValue(mockRefreshResponse);

      // Act
      const result = await controller.refreshToken(mockRequest as any);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'user-id',
        'refresh_token',
      );
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId from request', async () => {
      // Arrange
      const mockUser = {
        userId: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockRequest = { user: mockUser };
      const mockLogoutResponse = {
        message: 'Logout successful',
      };
      jest.spyOn(authService, 'logout').mockResolvedValue(mockLogoutResponse);

      // Act
      const result = await controller.logout(mockRequest as any);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockLogoutResponse);
    });
  });
});
