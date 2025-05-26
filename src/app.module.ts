import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  I18nModule,
  QueryResolver,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    I18nModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // Determine if we're in development or production
        const isDevelopment = process.env.NODE_ENV !== 'production';

        // Set the path based on environment
        const i18nPath = isDevelopment
          ? path.join(process.cwd(), 'src/i18n/')
          : path.join(__dirname, 'i18n');

        return {
          fallbackLanguage: configService.get<string>('DEFAULT_LANGUAGE', 'en'),
          loaderOptions: {
            path: i18nPath,
            watch: isDevelopment, // Only watch files in development
          },
        };
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale', 'l'] },
        AcceptLanguageResolver,
        { use: HeaderResolver, options: ['x-lang'] },
      ],
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // Các tùy chọn khác cho Mongoose nếu cần
        // Ví dụ cho DocumentDB (AWS) có thể cần:
        // ssl: true,
        // sslValidate: true,
        // sslCA: [fs.readFileSync(configService.get<string>('AWS_RDS_CA_PATH'))],
        // retryAttempts: 5,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
