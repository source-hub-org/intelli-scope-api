import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UserCrudService } from '../services/user-crud.service';
import { UserAuthenticationService } from '../services/user-authentication.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserDocument } from '../schemas/user.schema';

describe('UsersService', () => {
  let service: UsersService;
  let userCrudService: UserCrudService;
  let userAuthService: UserAuthenticationService;

  // Create a mock user that includes the necessary Document properties
  const mockUser = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
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
      jest.spyOn(userCrudService, 'create').mockResolvedValue(mockUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(jest.spyOn(userCrudService, 'create')).toHaveBeenCalledWith(
        createUserDto,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    it('should call userCrudService.findAll', async () => {
      // Arrange
      jest.spyOn(userCrudService, 'findAll').mockResolvedValue([mockUser]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(jest.spyOn(userCrudService, 'findAll')).toHaveBeenCalled();
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findById', () => {
    it('should call userCrudService.findById with id', async () => {
      // Arrange
      jest.spyOn(userCrudService, 'findById').mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('user-id');

      // Assert
      expect(jest.spyOn(userCrudService, 'findById')).toHaveBeenCalledWith(
        'user-id',
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findOneByEmail', () => {
    it('should call userCrudService.findOneByEmail with email', async () => {
      // Arrange
      jest.spyOn(userCrudService, 'findOneByEmail').mockResolvedValue(mockUser);

      // Act
      const result = await service.findOneByEmail('test@example.com');

      // Assert
      expect(
        jest.spyOn(userCrudService, 'findOneByEmail'),
      ).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('findUserByIdForAuth', () => {
    it('should call userCrudService.findUserByIdForAuth with id', async () => {
      // Arrange
      jest
        .spyOn(userCrudService, 'findUserByIdForAuth')
        .mockResolvedValue(mockUser);

      // Act
      const result = await service.findUserByIdForAuth('user-id');

      // Assert
      const findUserByIdForAuthSpy = jest.spyOn(
        userCrudService,
        'findUserByIdForAuth',
      );
      expect(findUserByIdForAuthSpy).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should call userCrudService.update with id and updateUserDto', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };
      const updatedUser = {
        ...mockUser,
        name: 'Updated User',
      } as unknown as UserDocument;

      jest.spyOn(userCrudService, 'update').mockResolvedValue(updatedUser);

      // Act
      const result = await service.update('user-id', updateUserDto);

      // Assert
      expect(jest.spyOn(userCrudService, 'update')).toHaveBeenCalledWith(
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
      expect(jest.spyOn(userCrudService, 'remove')).toHaveBeenCalledWith(
        'user-id',
      );
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
      expect(
        jest.spyOn(userAuthService, 'setCurrentRefreshToken'),
      ).toHaveBeenCalledWith('user-id', 'refresh_token');
    });

    it('should call userAuthService.setCurrentRefreshToken with userId and null', async () => {
      // Arrange
      jest.spyOn(userAuthService, 'setCurrentRefreshToken').mockResolvedValue();

      // Act
      await service.setCurrentRefreshToken('user-id', null);

      // Assert
      expect(
        jest.spyOn(userAuthService, 'setCurrentRefreshToken'),
      ).toHaveBeenCalledWith('user-id', null);
    });
  });
});
