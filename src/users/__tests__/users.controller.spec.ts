import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, NotFoundException } from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { createMockI18nService } from '../../common/__tests__/test-utils';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let i18nService: I18nService;
  let i18nContext: I18nContext<Record<string, unknown>>;

  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    // Create a simple mock and cast it to any first, then assign to the properly typed variable
    const mockContext = {
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
    };

    // Cast to any first to avoid type checking during assignment
    i18nContext = mockContext as any;

    // Mock the static current() method with the same approach
    jest.spyOn(I18nContext, 'current').mockReturnValue(mockContext as any);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    i18nService = module.get<I18nService>(I18nService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'password',
        password_confirmation: 'password',
        name: 'New User',
      };

      jest.spyOn(usersService, 'create').mockResolvedValueOnce(mockUser as any);
      jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User created successfully');

      // Act
      const result = await controller.create(createUserDto, i18nContext);

      // Assert
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      expect(i18nContext.t).toHaveBeenCalledWith(
        'translation.USER.CREATED_SUCCESS',
      );
      expect(result).toEqual({
        message: 'User created successfully',
        user: mockUser,
      });
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      // Arrange
      const mockUsers = [mockUser, mockUser];
      jest
        .spyOn(usersService, 'findAll')
        .mockResolvedValueOnce(mockUsers as any);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(usersService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      // Arrange
      jest
        .spyOn(usersService, 'findById')
        .mockResolvedValueOnce(mockUser as any);
      jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User profile fetched successfully');

      // Act
      const result = await controller.findOne('user-id', i18nContext);

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
      expect(i18nContext.t).toHaveBeenCalledWith(
        'translation.USER.PROFILE_FETCHED',
      );
      expect(result).toEqual({
        message: 'User profile fetched successfully',
        user: mockUser,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findById').mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        controller.findOne('nonexistent-id', i18nContext),
      ).rejects.toThrow(NotFoundException);
      expect(usersService.findById).toHaveBeenCalledWith('nonexistent-id');
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };

      const updatedUser = {
        ...mockUser,
        name: 'Updated User',
      };

      jest
        .spyOn(usersService, 'update')
        .mockResolvedValueOnce(updatedUser as any);
      jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User updated successfully');

      // Act
      const result = await controller.update(
        'user-id',
        updateUserDto,
        i18nContext,
      );

      // Assert
      expect(usersService.update).toHaveBeenCalledWith(
        'user-id',
        updateUserDto,
      );
      expect(i18nContext.t).toHaveBeenCalledWith(
        'translation.USER.UPDATED_SUCCESS',
      );
      expect(result).toEqual({
        message: 'User updated successfully',
        user: updatedUser,
      });
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      // Arrange
      jest
        .spyOn(usersService, 'remove')
        .mockResolvedValueOnce({ deleted: true });

      // Act
      await controller.remove('user-id');

      // Assert
      expect(usersService.remove).toHaveBeenCalledWith('user-id');
    });
  });
});
