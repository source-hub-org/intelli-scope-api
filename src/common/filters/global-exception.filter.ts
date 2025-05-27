import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { MongoError } from 'mongodb';

/**
 * Global exception filter to handle all exceptions in a consistent way
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment: boolean;

  constructor(
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {
    this.isDevelopment =
      this.configService.get<string>('NODE_ENV') !== 'production';
  }

  /**
   * Catch and handle all exceptions
   * @param exception The exception object
   * @param host The arguments host
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get language from request
    const lang = request.headers['accept-language'] || 'en';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let errorDetails: null | string[] = null;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const exceptionObj = exceptionResponse as Record<string, unknown>;
        message = (exceptionObj.message as string) || exception.message;
        error =
          (exceptionObj.error as string) || this.getErrorNameFromStatus(status);

        if (Array.isArray(message)) {
          // Type assertion with a more specific type to avoid unsafe assignment warning
          errorDetails = message as string[];
          try {
            message = this.i18n.translate(
              'translation.COMMON.VALIDATION_ERROR',
              {
                lang,
              },
            );
          } catch (error) {
            this.logger.warn(
              'Failed to translate validation error message',
              error,
            );
            message = 'Validation error occurred.';
          }
        }
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof MongoError) {
      // Handle MongoDB errors
      status = HttpStatus.BAD_REQUEST;

      if (exception.code === 11000) {
        status = HttpStatus.CONFLICT;
        try {
          message = this.i18n.translate('translation.COMMON.DUPLICATE_KEY', {
            lang,
          });
        } catch (error) {
          this.logger.warn(
            'Failed to translate duplicate key error message',
            error,
          );
          message = 'A record with this key already exists.';
        }
      } else {
        try {
          message = this.i18n.translate('translation.COMMON.DATABASE_ERROR', {
            lang,
          });
        } catch (error) {
          this.logger.warn('Failed to translate database error message', error);
          message = 'A database error occurred.';
        }
      }

      error = 'Database Error';
    } else {
      // Handle other errors
      const err = exception as Error;
      try {
        message = this.i18n.translate('translation.COMMON.INTERNAL_ERROR', {
          lang,
        });
      } catch (error) {
        this.logger.warn('Failed to translate internal error message', error);
        message = 'An internal server error occurred.';
      }
      error = 'Internal Server Error';

      // Log the full error
      this.logger.error(`Unhandled exception: ${err.message}`, err.stack);
    }

    // Prepare the response
    const responseBody = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add error details in development mode or if they exist
    if (errorDetails) {
      responseBody['details'] = errorDetails;
    }

    // Add stack trace in development mode
    if (this.isDevelopment && exception instanceof Error) {
      responseBody['stack'] = exception.stack;
    }

    response.status(status).json(responseBody);
  }

  /**
   * Get the error name from the HTTP status code
   * @param status HTTP status code
   * @returns Error name
   */
  private getErrorNameFromStatus(status: number): string {
    const httpStatus = status as HttpStatus;
    switch (httpStatus) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Unprocessable Entity';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'Internal Server Error';
      default:
        return `HTTP Error ${status}`;
    }
  }
}
