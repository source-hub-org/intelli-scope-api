// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { UserDocument } from '../../users/schemas';
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  // Default strategy name is 'local'
  constructor(
    private authService: AuthService,
    private readonly i18n: I18nService, // Inject I18nService
  ) {
    super({
      usernameField: 'email', // Field name used as username, default is 'username'
      // passwordField: 'password' // Default is 'password'
    });
  }

  async validate(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    // AuthService.validateUser has returned a user without password_hash or thrown UnauthorizedException
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      // AuthService.validateUser has already thrown an error, but just to be sure
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.INVALID_CREDENTIALS', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
    return user; // This user object will be assigned to req.user
  }
}
