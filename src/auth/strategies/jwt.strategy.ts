// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users'; // Import UsersService
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

  async validate(
    payload: any,
  ): Promise<{ userId: string; email: string; name: string }> {
    // Check if the user exists (important if the user was deleted after the token was issued)
    const userId = payload.sub; // Use 'sub' from JWT payload which contains the user ID
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.ACCESS_DENIED', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
    // Return basic user information, or the entire 'user' object if needed in req.user
    return {
      userId: userId,
      email: payload.username, // Use 'username' from JWT payload which contains the email
      name: user.name,
    };
  }
}
