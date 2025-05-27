import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UserCrudService } from '../services/user-crud.service';
import { UserAuthenticationService } from '../services/user-authentication.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let userCrudService: UserCrudService;
  let userAuthService: UserAuthenticationService;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUserCrudService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findOneByEmail: jest.fn(),
    findUserByIdForAuth: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserAuthService = {
    setCurrentRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserCrudService,
          useValue: mockUserCrudService,
        },
        {
          provide: UserAuthenticationService,
          useValue: mockUserAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userCrudService = module.get<UserCrudService>(UserCrudService);
    userAuthService = module.get<UserAuthenticationService>(
      UserAuthenticationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call userCrudService.create with createUserDto', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password',
        password_confirmation: 'password',
        name: 'Test User',
      };
      jest.spyOn(userCrudService, 'create').mockResolvedValue(mockUser as any);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(userCrudService.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should call userCrudService.findAll', async () => {
      // Arrange
      jest
        .spyOn(userCrudService, 'findAll')
        .mockResolvedValue([mockUser] as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(userCrudService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findById', () => {
    it('should call userCrudService.findById with id', async () => {
      // Arrange
      jest
        .spyOn(userCrudService, 'findById')
        .mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findById('user-id');

      // Assert
      expect(userCrudService.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneByEmail', () => {
    it('should call userCrudService.findOneByEmail with email', async () => {
      // Arrange
      jest
        .spyOn(userCrudService, 'findOneByEmail')
        .mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findOneByEmail('test@example.com');

      // Assert
      expect(userCrudService.findOneByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserByIdForAuth', () => {
    it('should call userCrudService.findUserByIdForAuth with id', async () => {
      // Arrange
      jest
        .spyOn(userCrudService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser as any);

      // Act
      const result = await service.findUserByIdForAuth('user-id');

      // Assert
      expect(userCrudService.findUserByIdForAuth).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should call userCrudService.update with id and updateUserDto', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };
      const updatedUser = { ...mockUser, name: 'Updated User' };
      jest
        .spyOn(userCrudService, 'update')
        .mockResolvedValue(updatedUser as any);

      // Act
      const result = await service.update('user-id', updateUserDto);

      // Assert
      expect(userCrudService.update).toHaveBeenCalledWith(
        'user-id',
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should call userCrudService.remove with id', async () => {
      // Arrange
      const deleteResult = { deleted: true };
      jest.spyOn(userCrudService, 'remove').mockResolvedValue(deleteResult);

      // Act
      const result = await service.remove('user-id');

      // Assert
      expect(userCrudService.remove).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(deleteResult);
    });
  });

  describe('setCurrentRefreshToken', () => {
    it('should call userAuthService.setCurrentRefreshToken with userId and refreshToken', async () => {
      // Arrange
      jest.spyOn(userAuthService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      await service.setCurrentRefreshToken('user-id', 'refresh_token');

      // Assert
      expect(userAuthService.setCurrentRefreshToken).toHaveBeenCalledWith(
        'user-id',
        'refresh_token',
      );
    });

    it('should call userAuthService.setCurrentRefreshToken with userId and null', async () => {
      // Arrange
      jest.spyOn(userAuthService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      await service.setCurrentRefreshToken('user-id', null);

      // Assert
      expect(userAuthService.setCurrentRefreshToken).toHaveBeenCalledWith(
        'user-id',
        null,
      );
    });
  });
});
