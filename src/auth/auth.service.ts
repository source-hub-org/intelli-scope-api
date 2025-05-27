// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UsersService } from '../users';
import { UserAuthenticationService } from '../users/services';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users';
import { I18nService, I18nContext } from 'nestjs-i18n';
import { safeObjectIdToString } from '../utils';
import { TokenService } from './services';

/**
 * Interface for token payload
 */
export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Service responsible for authentication operations
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private userAuthService: UserAuthenticationService,
    private tokenService: TokenService,
    private configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  /**
   * Validate user credentials
   * @param email User email
   * @param pass User password
   * @returns User without sensitive fields
   */
  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.INVALID_CREDENTIALS', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Compare passwords using the authentication service
    const isMatch = await this.userAuthService.comparePasswords(
      pass,
      user.password_hash,
    );

    if (isMatch) {
      // Destructure and ignore unused variables with underscore prefix
      if (typeof user.toObject !== 'function') {
        throw new Error('User object does not have toObject method');
      }

      const userObj = user.toObject() as Record<string, unknown>;
      const {
        password_hash: _ph,
        hashedRefreshToken: _hrt,
        ...result
      } = userObj as Omit<
        UserDocument,
        'password_hash' | 'hashedRefreshToken'
      > & { password_hash: string; hashedRefreshToken?: string };

      return result as Omit<
        UserDocument,
        'password_hash' | 'hashedRefreshToken'
      >;
    }

    throw new UnauthorizedException(
      this.i18n.t('translation.AUTH.INVALID_CREDENTIALS', {
        lang: I18nContext.current()?.lang,
      }),
    );
  }

  /**
   * Generate access and refresh tokens
   * @param userId User ID
   * @param email User email
   * @returns Token object with access token, refresh token, and expiration
   */
  async getTokens(userId: string, _email: string) {
    const accessTokenExpiresInStr = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION_TIME',
      '3600',
    );

    // Parse expiration time to integer
    const accessTokenExpiresIn = parseInt(accessTokenExpiresInStr, 10);

    // Validate that expiration time is reasonable
    if (isNaN(accessTokenExpiresIn) || accessTokenExpiresIn < 10) {
      throw new InternalServerErrorException(
        this.i18n.t('translation.AUTH.INVALID_ACCESS_TOKEN_EXPIRATION', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Get the user to generate tokens
    const user = await this.usersService.findUserByIdForAuth(userId);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.USER_NOT_FOUND', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Generate tokens using the token service
    const accessToken = this.tokenService.generateAccessToken(user);
    const refreshToken = this.tokenService.generateRefreshToken(user);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
    };
  }

  /**
   * Login a user
   * @param user User without sensitive fields
   * @returns Login response with tokens and user info
   */
  async login(
    user: Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>,
  ) {
    // Convert ObjectId to string
    const userId = safeObjectIdToString(user._id);

    // Generate tokens
    const tokens = await this.getTokens(userId, user.email);

    // Store refresh token
    await this.usersService.setCurrentRefreshToken(
      userId,
      tokens.refresh_token,
    );

    return {
      message: this.i18n.t('translation.AUTH.LOGIN_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
      user: {
        id: safeObjectIdToString(user._id),
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  /**
   * Refresh tokens using a refresh token
   * @param userId User ID
   * @param currentRefreshToken Current refresh token
   * @returns New tokens
   */
  async refreshToken(userId: string, currentRefreshToken: string) {
    const user = await this.usersService.findUserByIdForAuth(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Validate refresh token
    const isValid = await this.userAuthService.validateRefreshToken(
      currentRefreshToken,
      userId,
    );

    if (!isValid) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Convert ObjectId to string
    const userIdStr = safeObjectIdToString(user._id);

    // Generate new tokens
    const tokens = await this.getTokens(userIdStr, user.email);

    // Store new refresh token
    await this.usersService.setCurrentRefreshToken(
      userIdStr,
      tokens.refresh_token,
    );

    return {
      message: this.i18n.t('translation.AUTH.REFRESH_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
      ...tokens,
    };
  }

  /**
   * Logout a user
   * @param userId User ID
   * @returns Logout response
   */
  async logout(userId: string) {
    await this.usersService.setCurrentRefreshToken(userId, null);
    return {
      message: this.i18n.t('translation.AUTH.LOGOUT_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }
}
