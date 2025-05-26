// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // Ensure UsersModule is imported
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshTokenStrategy } from './jwt-refresh.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    UsersModule, // UsersService will be injected into AuthService and Strategies
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
    ConfigModule, // ConfigService will be injected
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshTokenStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, AuthService], // AuthService may need to be exported if used by other modules
})
export class AuthModule {}
