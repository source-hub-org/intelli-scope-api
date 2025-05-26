// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserDocument } from '../users/schemas/user.schema'; // Hoặc interface User của bạn
import { I18nService, I18nContext } from 'nestjs-i18n';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  // Mặc định strategy tên là 'local'
  constructor(
    private authService: AuthService,
    private readonly i18n: I18nService, // Inject I18nService
  ) {
    super({
      usernameField: 'email', // Tên trường dùng làm username, mặc định là 'username'
      // passwordField: 'password' // Mặc định là 'password'
    });
  }

  async validate(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'password_hash' | 'hashedRefreshToken'>> {
    // AuthService.validateUser đã trả về user không có password_hash hoặc ném UnauthorizedException
    const user = await this.authService.validateUser(email, pass);
    if (!user) {
      // AuthService.validateUser đã ném lỗi, nhưng để chắc chắn
      throw new UnauthorizedException(
        this.i18n.t('translation.AUTH.INVALID_CREDENTIALS', {
          lang: I18nContext.current()?.lang,
        }),
      );
    }
    return user; // Đối tượng user này sẽ được gán vào req.user
  }
}
