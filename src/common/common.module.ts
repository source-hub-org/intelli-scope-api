import { Module, Global, Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ErrorHandlerService } from './services';
import { GlobalExceptionFilter } from './filters';
import {
  ResponseTransformInterceptor,
  RequestLoggingInterceptor,
} from './interceptors';
import { ValidationPipe } from './pipes';

// Global providers
const globalProviders: Provider[] = [
  {
    provide: APP_FILTER,
    useClass: GlobalExceptionFilter,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseTransformInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: RequestLoggingInterceptor,
  },
  {
    provide: APP_PIPE,
    useClass: ValidationPipe,
  },
];

/**
 * Common module providing shared functionality across the application
 */
@Global()
@Module({
  providers: [
    // Services
    ErrorHandlerService,

    // Global providers
    ...globalProviders,
  ],
  exports: [ErrorHandlerService],
})
export class CommonModule {}
