import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas';
import { CreateUserDto } from '../dto';
import { UpdateUserDto } from '../dto';
import { I18nService, I18nContext } from 'nestjs-i18n';
// We can't use index.ts here because it would create a circular dependency
import { UserAuthenticationService } from './user-authentication.service';

/**
 * Service responsible for user CRUD operations
 */
@Injectable()
export class UserCrudService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly i18n: I18nService,
    private readonly authService: UserAuthenticationService,
  ) {}

  /**
   * Create a new user
   * @param createUserDto User creation data
   * @returns Created user without sensitive fields
   */
  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    const { email, password, name } = createUserDto;

    const existingUser = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .exec();
    if (existingUser) {
      throw new ConflictException(
        this.i18n.t('translation.USER.EMAIL_EXISTS', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Hash the password
    const hashedPassword = await this.authService.hashPassword(password);

    const createdUser = new this.userModel({
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      name,
    });

    try {
      const savedUser = await createdUser.save();
      // Destructure and ignore unused variables with underscore prefix
      const {
        password_hash: _ph,
        hashedRefreshToken: _hrt,
        ...result
      } = savedUser.toObject();
      // We need to cast to unknown first to avoid TypeScript error
      return result as unknown as Omit<
        UserDocument,
        'password_hash' | 'hashedRefreshToken'
      >;
    } catch (error) {
      // Handle MongoDB errors (e.g., duplicate key if unique constraint somehow missed)
      // Type assertion with type guard for error object
      const mongoError = error as Record<string, unknown>;
      if (
        mongoError &&
        typeof mongoError === 'object' &&
        'code' in mongoError &&
        mongoError.code === 11000
      ) {
        throw new ConflictException(
          this.i18n.t('translation.USER.EMAIL_EXISTS_DB_ERROR', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
      throw new InternalServerErrorException(
        this.i18n.t('translation.USER.CREATE_ERROR', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Find all users
   * @returns List of users without sensitive fields
   */
  async findAll(): Promise<
    Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>[]
  > {
    const users = await this.userModel
      .find()
      .select('-password_hash -hashedRefreshToken')
      .exec();
    return users.map(
      (user) =>
        user.toObject() as Omit<
          UserDocument,
          'password_hash' | 'hashedRefreshToken'
        >,
    );
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
    const user = await this.userModel
      .findById(id)
      .select('-password_hash -hashedRefreshToken')
      .exec();
    if (!user) {
      return null;
    }
    return user.toObject() as Omit<
      UserDocument,
      'password_hash' | 'hashedRefreshToken'
    >;
  }

  /**
   * Find a user by email (for authentication)
   * @param email User email
   * @returns Complete user document or null if not found
   */
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /**
   * Find a user by ID (for authentication)
   * @param id User ID
   * @returns Complete user document or null if not found
   */
  async findUserByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
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
    const updateData: Partial<UserDocument> = {
      ...updateUserDto,
    } as Partial<UserDocument>;

    if (updateUserDto.password) {
      // Hash the new password
      updateData.password_hash = await this.authService.hashPassword(
        updateUserDto.password,
      );

      // Remove password from updateData if it exists
      const anyUpdateData = updateData as Record<string, unknown>;
      if ('password' in anyUpdateData) {
        delete anyUpdateData.password;
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password_hash -hashedRefreshToken')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(
        this.i18n.t('translation.USER.NOT_FOUND', {
          lang: I18nContext.current()?.lang,
          args: { id },
        }),
      );
    }
    return updatedUser.toObject() as Omit<
      UserDocument,
      'password_hash' | 'hashedRefreshToken'
    >;
  }

  /**
   * Remove a user
   * @param id User ID
   * @returns Deletion result
   */
  async remove(id: string): Promise<{ deleted: boolean; message?: string }> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(
        this.i18n.t('translation.USER.NOT_FOUND', {
          lang: I18nContext.current()?.lang,
          args: { id },
        }),
      );
    }
    return { deleted: true };
  }
}
