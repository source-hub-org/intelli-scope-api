import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { I18nService, I18nContext } from 'nestjs-i18n';

/**
 * Service responsible for user authentication-related operations
 */
@Injectable()
export class UserAuthenticationService {
  private readonly logger = new Logger(UserAuthenticationService.name);
  private readonly saltRounds = 10;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Hash a password
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      this.logger.error('Error hashing password:', error);
      throw new InternalServerErrorException(
        this.i18n.t('translation.USER.CREATE_ERROR', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
  }

  /**
   * Compare a plain text password with a hashed password
   * @param plainPassword Plain text password
   * @param hashedPassword Hashed password
   * @returns True if the passwords match
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error('Error comparing passwords:', error);
      throw new InternalServerErrorException(
        this.i18n.t('translation.AUTH.PASSWORD_COMPARISON_ERROR', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
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
    if (refreshToken) {
      try {
        const hashedToken = await bcrypt.hash(refreshToken, this.saltRounds);
        await this.userModel.findByIdAndUpdate(userId, {
          hashedRefreshToken: hashedToken,
        });
      } catch (error) {
        this.logger.error('Error hashing refresh token:', error);
        throw new InternalServerErrorException(
          this.i18n.t('translation.AUTH.TOKEN_PROCESSING_ERROR', {
            lang: I18nContext.current()?.lang,
          }),
        );
      }
    } else {
      await this.userModel.findByIdAndUpdate(userId, {
        hashedRefreshToken: null,
      });
    }
  }

  /**
   * Verify if a refresh token is valid for a user
   * @param refreshToken Refresh token to verify
   * @param userId User ID
   * @returns True if the token is valid
   */
  async validateRefreshToken(
    refreshToken: string,
    userId: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.hashedRefreshToken) {
      return false;
    }

    try {
      return await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    } catch (error) {
      this.logger.error('Error validating refresh token:', error);
      return false;
    }
  }
}
