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
   *
   * The access token is signed with JWT_ACCESS_SECRET and expires after
   * JWT_ACCESS_EXPIRATION_TIME (default: 3600 seconds / 1 hour)
   *
   * @param user User document
   * @returns Access token
   */
  generateAccessToken(user: UserDocument): string {
    const payload = {
      username: user.email,
      sub: user._id,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: parseInt(
        this.configService.get<string>('JWT_ACCESS_EXPIRATION_TIME', '3600'),
        10,
      ),
    });
  }

  /**
   * Generate a refresh token for a user
   *
   * The refresh token is signed with JWT_REFRESH_SECRET and expires after
   * JWT_REFRESH_EXPIRATION_TIME (default: 7 days)
   *
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
      expiresIn: parseInt(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION_TIME', '604800'),
        10,
      ),
    });
  }

  /**
   * Verify an access token
   *
   * Verifies the token using JWT_ACCESS_SECRET
   *
   * @param token Access token
   * @returns Decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (_error) {
      return null;
    }
  }

  /**
   * Verify a refresh token
   *
   * Verifies the token using JWT_REFRESH_SECRET
   *
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
