import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogInterceptor } from './interceptors/activity-log.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { ActivityLogAspect } from './aspects/activity-log.aspect';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { ActivityLogSanitizerService } from './services/activity-log-sanitizer.service';
import { ActivityLogQueryService } from './services/activity-log-query.service';

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
    consumer.apply(RequestContextMiddleware).forRoutes('*'); // Apply to all routes
  }
}
