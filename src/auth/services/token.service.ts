import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '../../users';

/**
 * Service responsible for JWT token operations
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate an access token for a user
   * @param user User document
   * @returns Access token
   */
  generateAccessToken(user: UserDocument): string {
    const payload = {
      username: user.email,
      sub: user._id,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });
  }

  /**
   * Generate a refresh token for a user
   * @param user User document
   * @returns Refresh token
   */
  generateRefreshToken(user: UserDocument): string {
    const payload = {
      username: user.email,
      sub: user._id,
      tokenType: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  /**
   * Verify an access token
   * @param token Access token
   * @returns Decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (_error) {
      return null;
    }
  }

  /**
   * Verify a refresh token
   * @param token Refresh token
   * @returns Decoded token payload or null if invalid
   */
  verifyRefreshToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch (_error) {
      return null;
    }
  }
}
