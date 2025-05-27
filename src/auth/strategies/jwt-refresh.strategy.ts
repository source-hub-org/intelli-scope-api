// src/auth/jwt-refresh.strategy.ts
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users'; // Import UsersService
import { I18nService, I18nContext } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';

interface RefreshTokenPayload {
  userId: string;
  // May include iat, exp
}

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService, // Inject UsersService
    private readonly i18n: I18nService,
  ) {
    const secretOrKey = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secretOrKey) {
      throw new Error(
        i18n.t('translation.AUTH.JWT_REFRESH_SECRET_NOT_DEFINED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false, // Important: This ensures expired tokens are rejected
      secretOrKey,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): Promise<{
    userId: string;
    email: string;
    refreshToken: string;
  }> {
    // Type assertion for req.body to avoid unsafe member access
    const refreshTokenFromBody = (req.body as { refresh_token?: string })
      .refresh_token;
    if (!refreshTokenFromBody) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'No refresh token' },
        }),
      );
    }

    const user = await this.usersService.findUserByIdForAuth(payload.userId); // Get full user
    // Type guard to ensure user is properly typed
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'User or stored token not found' },
        }),
      );
    }

    // Use properly typed bcrypt compare
    let isRefreshTokenMatching = false;
    try {
      // With our type definition, this is now properly typed
      isRefreshTokenMatching = await bcrypt.compare(
        refreshTokenFromBody,
        user.hashedRefreshToken,
      );
    } catch (_error) {
      console.error('Error comparing refresh tokens:', _error);
      isRefreshTokenMatching = false;
    }
    if (!isRefreshTokenMatching) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'Refresh token mismatch' },
        }),
      );
    }
    // Return userId and refreshToken for AuthService to use
    // Return a properly typed object
    return {
      userId: payload.userId,
      email: user.email,
      refreshToken: refreshTokenFromBody,
    };
  }
}
