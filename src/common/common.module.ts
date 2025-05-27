import { Module, Global, Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ErrorHandlerService } from './services/error-handler.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { RequestLoggingInterceptor } from './interceptors/request-logging.interceptor';
import { ValidationPipe } from './pipes/validation.pipe';

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
