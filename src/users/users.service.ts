// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly i18n: I18nService,
  ) {}

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

    const saltRounds = 10;
    // Safely handle bcrypt.hash with proper error handling
    let hashedPassword: string;
    try {
      // With our type definition, this is now properly typed
      hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new InternalServerErrorException(
        this.i18n.t('translation.USER.CREATE_ERROR', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

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

  // This function needs to return user with password_hash for AuthService to compare
  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  // This function needs to return the complete user for AuthService to use
  async findUserByIdForAuth(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

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
      const saltRounds = 10;
      // Safely handle bcrypt.hash with proper error handling
      try {
        // With our type definition, this is now properly typed
        updateData.password_hash = await bcrypt.hash(
          updateUserDto.password,
          saltRounds,
        );
      } catch (error) {
        console.error('Error hashing password during update:', error);
        throw new InternalServerErrorException(
          this.i18n.t('translation.USER.UPDATE_ERROR', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
      // Remove password from updateData if it exists
      // Safely remove password property if it exists
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

  // Function to update refresh token (for Auth)
  async setCurrentRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    if (refreshToken) {
      const saltRounds = 10;
      // Safely handle bcrypt.hash with proper error handling
      let hashedToken: string;
      try {
        // With our type definition, this is now properly typed
        hashedToken = await bcrypt.hash(refreshToken, saltRounds);
      } catch (error) {
        console.error('Error hashing refresh token:', error);
        throw new InternalServerErrorException(
          this.i18n.t('translation.AUTH.TOKEN_PROCESSING_ERROR', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
      await this.userModel.findByIdAndUpdate(userId, {
        hashedRefreshToken: hashedToken,
      });
    } else {
      await this.userModel.findByIdAndUpdate(userId, {
        hashedRefreshToken: null,
      });
    }
  }
}
