import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from './schemas';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogInterceptor } from './interceptors';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ActivityLogAspect } from './aspects';
import { RequestContextMiddleware } from './middleware';
import {
  ActivityLogSanitizerService,
  ActivityLogQueryService,
} from './services';

/**
 * Module for activity logging functionality
 * This is a global module that provides activity logging services
 * throughout the application
 */
@Global() // Make this module globally available
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    ClsModule,
    ConfigModule, // For accessing configuration
  ],
  providers: [
    // Core services
    ActivityLogService,
    ActivityLogSanitizerService,
    ActivityLogQueryService,
    ActivityLogAspect,

    // Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
  exports: [
    ActivityLogService,
    ActivityLogAspect,
    ActivityLogSanitizerService,
    ActivityLogQueryService,
  ],
})
export class ActivityLogModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // The ClsMiddleware is automatically applied by ClsModule.forRoot() in app.module.ts
    // We need to make sure our RequestContextMiddleware runs after it
    consumer.apply(RequestContextMiddleware).forRoutes('*'); // Apply to all routes
  }
}
