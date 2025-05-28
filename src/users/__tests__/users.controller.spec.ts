import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ValidationPipe as _ValidationPipe,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { createMockI18nService } from '../../common/__tests__/test-utils';
import { UserDocument } from '../schemas/user.schema';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let _i18nService: I18nService; // Prefix with underscore to indicate it's intentionally unused
  let i18nContext: I18nContext<Record<string, unknown>>;

  // Create a mock user that includes the necessary Document properties
  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    // Add minimal Document interface properties
    $assertPopulated: jest.fn(),
    $clone: jest.fn(),
    $getAllSubdocs: jest.fn(),
    $ignore: jest.fn(),
    $isDefault: jest.fn(),
    $isDeleted: jest.fn(),
    $isEmpty: jest.fn(),
    $isValid: jest.fn(),
    $locals: {},
    $model: jest.fn(),
    $op: null,
    $session: jest.fn(),
    $set: jest.fn(),
    $where: jest.fn(),
    collection: {},
    db: {},
    delete: jest.fn(),
    deleteOne: jest.fn(),
    depopulate: jest.fn(),
    directModifiedPaths: jest.fn(),
    equals: jest.fn(),
    get: jest.fn(),
    getChanges: jest.fn(),
    increment: jest.fn(),
    init: jest.fn(),
    inspect: jest.fn(),
    invalidate: jest.fn(),
    isDirectModified: jest.fn(),
    isDirectSelected: jest.fn(),
    isInit: jest.fn(),
    isModified: jest.fn(),
    isNew: jest.fn(),
    isSelected: jest.fn(),
    markModified: jest.fn(),
    modifiedPaths: jest.fn(),
    overwrite: jest.fn(),
    populate: jest.fn(),
    populated: jest.fn(),
    remove: jest.fn(),
    replaceOne: jest.fn(),
    save: jest.fn(),
    schema: {},
    set: jest.fn(),
    toJSON: jest.fn(),
    toObject: jest.fn(),
    unmarkModified: jest.fn(),
    update: jest.fn(),
    updateOne: jest.fn(),
    validate: jest.fn(),
    validateSync: jest.fn(),
    __v: 0,
    $__: {},
    $errors: {},
    $isSubdocument: false,
    $parent: null,
  } as unknown as UserDocument;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    // Create a more complete mock I18nContext
    const mockContext = {
      lang: 'en',
      t: jest.fn().mockImplementation((key: string) => `translated:${key}`),
      service: {} as any,
      id: 'test-id',
      i18n: jest.fn(),
      translate: jest
        .fn()
        .mockImplementation((key: string) => `translated:${key}`),
      validate: jest.fn(),
    };

    // Cast with proper type assertion
    i18nContext = mockContext as unknown as I18nContext<
      Record<string, unknown>
    >;

    // Mock the static current() method with proper type assertion
    jest
      .spyOn(I18nContext, 'current')
      .mockReturnValue(mockContext as unknown as I18nContext<unknown>);

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
    _i18nService = module.get<I18nService>(I18nService);
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

      const createSpy = jest
        .spyOn(usersService, 'create')
        .mockResolvedValueOnce(mockUser);
      const tSpy = jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User created successfully');

      // Act
      const result = await controller.create(createUserDto, i18nContext);

      // Assert
      expect(createSpy).toHaveBeenCalledWith(createUserDto);
      expect(tSpy).toHaveBeenCalledWith('translation.USER.CREATED_SUCCESS');
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
      const findAllSpy = jest
        .spyOn(usersService, 'findAll')
        .mockResolvedValueOnce(mockUsers);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(findAllSpy).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      // Arrange
      const findByIdSpy = jest
        .spyOn(usersService, 'findById')
        .mockResolvedValueOnce(mockUser);
      const tSpy = jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User profile fetched successfully');

      // Act
      const result = await controller.findOne('user-id', i18nContext);

      // Assert
      expect(findByIdSpy).toHaveBeenCalledWith('user-id');
      expect(tSpy).toHaveBeenCalledWith('translation.USER.PROFILE_FETCHED');
      expect(result).toEqual({
        message: 'User profile fetched successfully',
        user: mockUser,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      const findByIdSpy = jest
        .spyOn(usersService, 'findById')
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        controller.findOne('nonexistent-id', i18nContext),
      ).rejects.toThrow(NotFoundException);
      expect(findByIdSpy).toHaveBeenCalledWith('nonexistent-id');
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
      } as unknown as UserDocument;

      const updateSpy = jest
        .spyOn(usersService, 'update')
        .mockResolvedValueOnce(updatedUser);
      const tSpy = jest
        .spyOn(i18nContext, 't')
        .mockReturnValueOnce('User updated successfully');

      // Act
      const result = await controller.update(
        'user-id',
        updateUserDto,
        i18nContext,
      );

      // Assert
      expect(updateSpy).toHaveBeenCalledWith('user-id', updateUserDto);
      expect(tSpy).toHaveBeenCalledWith('translation.USER.UPDATED_SUCCESS');
      expect(result).toEqual({
        message: 'User updated successfully',
        user: updatedUser,
      });
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      // Arrange
      const removeSpy = jest
        .spyOn(usersService, 'remove')
        .mockResolvedValueOnce({ deleted: true });

      // Act
      await controller.remove('user-id');

      // Assert
      expect(removeSpy).toHaveBeenCalledWith('user-id');
    });
  });
});
