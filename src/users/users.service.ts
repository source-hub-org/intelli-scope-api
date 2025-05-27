// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { UserCrudService, UserAuthenticationService } from './services';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserDocument } from './schemas';

/**
 * Main service for user operations
 * Acts as a facade for the specialized user services
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly userCrudService: UserCrudService,
    private readonly userAuthService: UserAuthenticationService,
  ) {}

  /**
   * Create a new user
   * @param createUserDto User creation data
   * @returns Created user without sensitive fields
   */
  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    return this.userCrudService.create(createUserDto);
  }

  /**
   * Find all users
   * @returns List of users without sensitive fields
   */
  async findAll(): Promise<
    Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>[]
  > {
    return this.userCrudService.findAll();
  }

  /**
   * Find a user by ID
   * @param id User ID
   * @returns User without sensitive fields or null if not found
   */
  async findById(
    id: string,
  ): Promise<Omit<
    UserDocument,
    'password_hash' | 'hashedRefreshToken'
  > | null> {
    return this.userCrudService.findById(id);
  }

  /**
   * Find a user by email (for authentication)
   * @param email User email
   * @returns Complete user document or null if not found
   */
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userCrudService.findOneByEmail(email);
  }

  /**
   * Find a user by ID (for authentication)
   * @param id User ID
   * @returns Complete user document or null if not found
   */
  async findUserByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userCrudService.findUserByIdForAuth(id);
  }

  /**
   * Update a user
   * @param id User ID
   * @param updateUserDto User update data
   * @returns Updated user without sensitive fields
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<
    UserDocument,
    'password_hash' | 'hashedRefreshToken'
  > | null> {
    return this.userCrudService.update(id, updateUserDto);
  }

  /**
   * Remove a user
   * @param id User ID
   * @returns Deletion result
   */
  async remove(id: string): Promise<{ deleted: boolean; message?: string }> {
    return this.userCrudService.remove(id);
  }

  /**
   * Set the current refresh token for a user
   * @param userId User ID
   * @param refreshToken Refresh token (or null to clear)
   */
  async setCurrentRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    return this.userAuthService.setCurrentRefreshToken(userId, refreshToken);
  }
}
