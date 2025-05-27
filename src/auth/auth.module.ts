// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import strategies from the strategies folder
import {
  JwtStrategy,
  JwtRefreshTokenStrategy,
  LocalStrategy,
} from './strategies';

// Import services
import { TokenService } from './services';

/**
 * Module for authentication functionality
 */
@Module({
  imports: [
    // Import required modules
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: parseInt(
            configService.get<string>('JWT_ACCESS_EXPIRATION_TIME') || '3600',
            10,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [
    // Main service
    AuthService,

    // Specialized services
    TokenService,

    // Strategies
    JwtStrategy,
    JwtRefreshTokenStrategy,
    LocalStrategy,
  ],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, AuthService, TokenService],
})
export class AuthModule {}
