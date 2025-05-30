import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth';
import { UsersModule } from './users';
import { ActivityLogModule } from './activity-log';
import { CommonModule } from './common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import {
  I18nModule,
  QueryResolver,
  AcceptLanguageResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';

/**
 * Main application module
 */
@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // CLS (Continuation Local Storage)
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => {
          // Use a safer way to generate UUID that doesn't rely on crypto global
          return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
          );
        },
      },
    }),

    // Internationalization
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

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        // Other options for Mongoose if needed
        // Example for DocumentDB (AWS) might need:
        // ssl: true,
        // sslValidate: true,
        // sslCA: [fs.readFileSync(configService.get<string>('AWS_RDS_CA_PATH'))],
        // retryAttempts: 5,
      }),
      inject: [ConfigService],
    }),

    // Application modules
    CommonModule,
    ActivityLogModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
