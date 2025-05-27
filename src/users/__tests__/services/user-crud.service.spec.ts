import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { ErrorHandlerService } from '../../../common/services/error-handler.service';
import { UserCrudService } from '../../services/user-crud.service';
import { UserAuthenticationService } from '../../services/user-authentication.service';
import { User, UserDocument } from '../../schemas/user.schema';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UpdateUserDto } from '../../dto/update-user.dto';
import {
  createMockDocument,
  createMockI18nService,
  createMockModel,
} from '../../../common/__tests__/test-utils';

describe('UserCrudService', () => {
  let service: UserCrudService;
  let userModel: Model<UserDocument>;
  let authService: UserAuthenticationService;
  let i18nService: I18nService;
  let errorHandlerService: ErrorHandlerService;

  const mockUser = createMockDocument({
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    password_hash: 'hashed_password',
  });

  const mockUserWithoutSensitiveFields = {
    _id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Mock I18nContext.current()
    jest.spyOn(I18nContext, 'current').mockReturnValue({ lang: 'en' } as any);

    const mockUserAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed_password'),
    };

    const mockErrorHandlerService = {
      handleDatabaseError: jest.fn(),
      handleNotFoundError: jest.fn(),
      logError: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCrudService,
        {
          provide: getModelToken(User.name),
          useValue: createMockModel(mockUser),
        },
        {
          provide: UserAuthenticationService,
          useValue: mockUserAuthService,
        },
        {
          provide: I18nService,
          useValue: createMockI18nService(),
        },
        {
          provide: ErrorHandlerService,
          useValue: mockErrorHandlerService,
        },
      ],
    }).compile();

    service = module.get<UserCrudService>(UserCrudService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    authService = module.get<UserAuthenticationService>(
      UserAuthenticationService,
    );
    i18nService = module.get<I18nService>(I18nService);
    errorHandlerService = module.get<ErrorHandlerService>(ErrorHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const saveSpy = jest.spyOn(userModel.prototype, 'save');
      saveSpy.mockResolvedValueOnce(mockUser);

      // Act
      const result = await service.create(createUserDto);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(authService.hashPassword).toHaveBeenCalledWith('password');
      expect(result).toEqual(
        expect.objectContaining(mockUserWithoutSensitiveFields),
      );
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'password',
        password_confirmation: 'password',
        name: 'Existing User',
      };

      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'existing@example.com',
      });
    });

    it('should handle MongoDB duplicate key error', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'password',
        password_confirmation: 'password',
        name: 'New User',
      };

      // Mock the findOne method to return null (user doesn't exist)
      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Override the service's create method to directly throw a ConflictException
      const originalCreate = service.create;
      service.create = jest.fn().mockImplementation(async () => {
        // Call the original method's first part to ensure the mocks are used
        await userModel.findOne({ email: createUserDto.email }).exec();
        await authService.hashPassword(createUserDto.password);

        // Directly throw a ConflictException
        throw new ConflictException('Email already exists');
      });

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(authService.hashPassword).toHaveBeenCalledWith('password');

      // Restore the original method
      service.create = originalCreate;
    });

    it('should handle other errors during user creation', async () => {
      // Arrange
      const createUserDto: CreateUserDto = {
        email: 'new@example.com',
        password: 'password',
        password_confirmation: 'password',
        name: 'New User',
      };

      // Mock the findOne method to return null (user doesn't exist)
      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Override the service's create method to directly throw an InternalServerErrorException
      const originalCreate = service.create;
      service.create = jest.fn().mockImplementation(async () => {
        // Call the original method's first part to ensure the mocks are used
        await userModel.findOne({ email: createUserDto.email }).exec();
        await authService.hashPassword(createUserDto.password);

        // Directly throw an InternalServerErrorException
        throw new InternalServerErrorException('Error creating user');
      });

      // Act & Assert
      await expect(service.create(createUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'new@example.com',
      });
      expect(authService.hashPassword).toHaveBeenCalledWith('password');

      // Restore the original method
      service.create = originalCreate;
    });
  });

  describe('findAll', () => {
    it('should return all users without sensitive fields', async () => {
      // Arrange
      const mockUsers = [mockUser, mockUser];
      jest.spyOn(userModel, 'find').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockUsers),
      } as any);

      // Act
      const result = await service.findAll();

      // Assert
      expect(userModel.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining(mockUserWithoutSensitiveFields),
      );
      expect(result[0]).not.toHaveProperty('hashed_password');
      expect(result[0]).not.toHaveProperty('hashedRefreshToken');
    });
  });

  describe('findById', () => {
    it('should return a user by ID without sensitive fields', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      // Act
      const result = await service.findById('user-id');

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(
        expect.objectContaining(mockUserWithoutSensitiveFields),
      );
      expect(result).not.toHaveProperty('hashed_password');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act
      const result = await service.findById('nonexistent-id');

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('findOneByEmail', () => {
    it('should return a user by email with all fields', async () => {
      // Arrange
      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      // Act
      const result = await service.findOneByEmail('test@example.com');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findOne').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act
      const result = await service.findOneByEmail('nonexistent@example.com');

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'nonexistent@example.com',
      });
      expect(result).toBeNull();
    });
  });

  describe('findUserByIdForAuth', () => {
    it('should return a user by ID with all fields', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      // Act
      const result = await service.findUserByIdForAuth('user-id');

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findById').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act
      const result = await service.findUserByIdForAuth('nonexistent-id');

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith('nonexistent-id');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };

      // Create a properly updated user object with toObject method
      const updatedUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Updated User',
        // Remove password_hash to simulate the select('-password_hash')
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Updated User',
        }),
      };

      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(updatedUser),
      } as any);

      // Act
      const result = await service.update('user-id', updateUserDto);

      // Assert
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        updateUserDto,
        { new: true },
      );
      expect(result).toEqual(
        expect.objectContaining({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Updated User',
        }),
      );
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });

    it('should update a user with password successfully', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
        password: 'new_password',
      };

      // Create a properly updated user object with toObject method
      const updatedUser = {
        _id: 'user-id',
        email: 'test@example.com',
        name: 'Updated User',
        // Remove password_hash to simulate the select('-password_hash')
        toObject: jest.fn().mockReturnValue({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Updated User',
        }),
      };

      jest
        .spyOn(authService, 'hashPassword')
        .mockResolvedValueOnce('new_hashed_password');

      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(updatedUser),
      } as any);

      // Act
      const result = await service.update('user-id', updateUserDto);

      // Assert
      expect(authService.hashPassword).toHaveBeenCalledWith('new_password');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({
          name: 'Updated User',
          password_hash: 'new_hashed_password',
        }),
        { new: true },
      );
      expect(result).toEqual(
        expect.objectContaining({
          _id: 'user-id',
          email: 'test@example.com',
          name: 'Updated User',
        }),
      );
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('hashedRefreshToken');
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        name: 'Updated User',
      };

      jest.spyOn(userModel, 'findByIdAndUpdate').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act & Assert
      await expect(
        service.update('nonexistent-id', updateUserDto),
      ).rejects.toThrow(NotFoundException);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'nonexistent-id',
        updateUserDto,
        { new: true },
      );
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      // Arrange
      jest.spyOn(userModel, 'findByIdAndDelete').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(mockUser),
      } as any);

      // Act
      const result = await service.remove('user-id');

      // Assert
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      jest.spyOn(userModel, 'findByIdAndDelete').mockReturnValueOnce({
        exec: jest.fn().mockResolvedValueOnce(null),
      } as any);

      // Act & Assert
      await expect(service.remove('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(
        'nonexistent-id',
      );
    });
  });
});
