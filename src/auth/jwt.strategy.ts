// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './auth.service';
import { UsersService } from '../users/users.service'; // Import UsersService
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService, // Inject UsersService
    private readonly i18n: I18nService,
  ) {
    const secretOrKey = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secretOrKey) {
      throw new Error(
        i18n.t('translation.AUTH.JWT_ACCESS_SECRET_NOT_DEFINED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Important: This ensures expired tokens are rejected
      secretOrKey,
    });
  }

  async validate(payload: TokenPayload): Promise<any> {
    // Check if the user exists (important if the user was deleted after the token was issued)
    const user = await this.usersService.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
    // Return basic user information, or the entire 'user' object if needed in req.user
    return { userId: payload.userId, email: payload.email, name: user.name };
  }
}
