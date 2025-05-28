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
  statusCode?: number;
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
    const response = ctx.getResponse<{ statusCode?: number }>();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // Check if the response is already in the standard format
        if (data && typeof data === 'object' && 'success' in data) {
          return data as unknown as Response<T>;
        }

        // Extract message and meta if they exist
        let message: string | undefined;
        let meta: Record<string, unknown> | undefined;
        let responseData: unknown = data;

        if (data && typeof data === 'object') {
          const typedData = data as Record<string, unknown>;

          if ('message' in typedData) {
            message = typedData.message as string;

            // If data only contains message, set data to null
            if (Object.keys(typedData).length === 1) {
              responseData = null;
            }
          }

          if ('meta' in typedData) {
            meta = typedData.meta as Record<string, unknown>;

            // If data has a data property, use it as the response data
            if ('data' in typedData) {
              responseData = typedData.data;
            } else {
              // Otherwise, remove meta from the response data
              const { meta: _, ...rest } = typedData;
              responseData = Object.keys(rest).length > 0 ? rest : null;
            }
          }
        }

        // Build the standard response
        const response: Response<T> = {
          data: responseData as T,
          success: statusCode >= 200 && statusCode < 300,
        };

        // Add optional fields only if they exist
        if (meta) response.meta = meta;
        if (message) response.message = message;
        if (statusCode) response.statusCode = statusCode;

        return response;
      }),
    );
  }
}
