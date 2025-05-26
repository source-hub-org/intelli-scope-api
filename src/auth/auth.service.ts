// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../users/schemas/user.schema'; // Import UserDocument
import { I18nService, I18nContext } from 'nestjs-i18n';

export interface TokenPayload {
  userId: string; // Mongoose ID là string
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly i18n: I18nService, // Inject I18nService
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    const user = await this.usersService.findOneByEmail(email); // Returns UserDocument (with password_hash)
    if (user && user.password_hash) {
      const isMatch = await bcrypt.compare(pass, user.password_hash);
      if (isMatch) {
        const { password_hash, hashedRefreshToken, ...result } =
          user.toObject();
        return result as Omit<
          UserDocument,
          'password_hash' | 'hashedRefreshToken'
        >;
      }
    }
    throw new UnauthorizedException(
      this.i18n.t('translation.AUTH.INVALID_CREDENTIALS', {
        lang: I18nContext.current()?.lang,
      }),
    );
  }

  async getTokens(userId: string, email: string) {
    const jwtPayload: TokenPayload = { userId, email };

    const accessTokenSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessTokenExpiresInStr = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION_TIME',
    );
    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshTokenExpiresInStr = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION_TIME',
    );

    if (!accessTokenSecret || !refreshTokenSecret) {
      throw new InternalServerErrorException(
        this.i18n.t('translation.AUTH.JWT_SECRETS_NOT_CONFIGURED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Parse expiration times to integers
    const accessTokenExpiresIn = parseInt(
      accessTokenExpiresInStr || '3600',
      10,
    );
    const refreshTokenExpiresIn = parseInt(
      refreshTokenExpiresInStr || '604800',
      10,
    );

    // Validate that expiration times are reasonable
    if (isNaN(accessTokenExpiresIn) || accessTokenExpiresIn < 10) {
      throw new InternalServerErrorException(
        this.i18n.t('translation.AUTH.INVALID_ACCESS_TOKEN_EXPIRATION', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    if (isNaN(refreshTokenExpiresIn) || refreshTokenExpiresIn < 60) {
      throw new InternalServerErrorException(
        this.i18n.t('translation.AUTH.INVALID_REFRESH_TOKEN_EXPIRATION', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: accessTokenSecret,
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(
        { userId },
        {
          // Refresh token có thể chỉ cần userId
          secret: refreshTokenSecret,
          expiresIn: refreshTokenExpiresIn,
        },
      ),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
    };
  }

  async login(
    user: Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>,
  ) {
    // User ID from Mongoose is an object, need to convert to string if necessary
    const userId = user._id ? user._id.toString() : '';
    const tokens = await this.getTokens(userId, user.email);
    await this.usersService.setCurrentRefreshToken(
      userId,
      tokens.refresh_token,
    );

    return {
      message: this.i18n.t('translation.AUTH.LOGIN_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
      user: { id: user._id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async refreshToken(userId: string, currentRefreshToken: string) {
    const user = await this.usersService.findUserByIdForAuth(userId); // Get full user (with hashedRefreshToken)
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      currentRefreshToken,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenMatching) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    const userIdStr = user._id ? user._id.toString() : '';
    const tokens = await this.getTokens(userIdStr, user.email);
    await this.usersService.setCurrentRefreshToken(
      userIdStr,
      tokens.refresh_token,
    ); // Update new RT

    return {
      message: this.i18n.t('translation.AUTH.REFRESH_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.usersService.setCurrentRefreshToken(userId, null);
    return {
      message: this.i18n.t('translation.AUTH.LOGOUT_SUCCESS', {
        lang: I18nContext.current()?.lang,
      }),
    };
  }
}
