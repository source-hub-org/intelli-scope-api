import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interface for the standard API response
 */
export interface Response<T> {
  data: T;
  meta?: Record<string, any>;
  message?: string;
  statusCode: number;
  success: boolean;
}

/**
 * Interceptor to transform all responses to a standard format
 */
@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  /**
   * Intercept the response and transform it to the standard format
   * @param context The execution context
   * @param next The call handler
   * @returns The transformed response
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // Check if the response is already in the standard format
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Extract message and meta if they exist
        let message: string | undefined;
        let meta: Record<string, any> | undefined;
        let responseData: any = data;

        if (data && typeof data === 'object') {
          if ('message' in data) {
            message = data.message;

            // If data only contains message, set data to null
            if (Object.keys(data).length === 1) {
              responseData = null;
            }
          }

          if ('meta' in data) {
            meta = data.meta;

            // If data has a data property, use it as the response data
            if ('data' in data) {
              responseData = data.data;
            } else {
              // Otherwise, remove meta from the response data
              const { meta: _, ...rest } = data;
              responseData = Object.keys(rest).length > 0 ? rest : null;
            }
          }
        }

        // Build the standard response
        return {
          data: responseData,
          meta,
          message,
          statusCode,
          success: statusCode >= 200 && statusCode < 300,
        };
      }),
    );
  }
}
