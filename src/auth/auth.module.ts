// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // Đảm bảo UsersModule được import
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshTokenStrategy } from './jwt-refresh.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    UsersModule, // UsersService sẽ được inject vào AuthService và Strategies
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
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
    ConfigModule, // ConfigService sẽ được inject
  ],
  providers: [AuthService, JwtStrategy, JwtRefreshTokenStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, AuthService], // AuthService có thể cần export nếu module khác dùng
})
export class AuthModule {}
