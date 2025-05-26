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
import { UsersService } from '../users/users.service'; // Import UsersService
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

  async validate(req: Request, payload: RefreshTokenPayload): Promise<any> {
    const refreshTokenFromBody = req.body.refresh_token;
    if (!refreshTokenFromBody) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'No refresh token' },
        }),
      );
    }

    const user = await this.usersService.findUserByIdForAuth(payload.userId); // Get full user
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'User or stored token not found' },
        }),
      );
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshTokenFromBody,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenMatching) {
      throw new ForbiddenException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
          args: { reason: 'Refresh token mismatch' },
        }),
      );
    }
    // Trả về userId và refreshToken để AuthService sử dụng
    return {
      userId: payload.userId,
      email: user.email,
      refreshToken: refreshTokenFromBody,
    };
  }
}
