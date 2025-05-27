import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { I18nService, I18nContext } from 'nestjs-i18n';

/**
 * Service for handling errors consistently across the application
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  constructor(private readonly i18n: I18nService) {}

  /**
   * Handle a database error
   * @param error Error object
   * @param entityName Name of the entity (e.g., 'User', 'Product')
   * @param operation Operation being performed (e.g., 'create', 'update')
   * @throws Appropriate exception based on the error
   */
  handleDatabaseError(
    error: unknown,
    entityName: string,
    operation: string,
  ): never {
    const err = error as Record<string, unknown>;
    this.logger.error(
      `Database error during ${operation} of ${entityName}:`,
      err,
    );

    // Handle MongoDB duplicate key error
    if (err && typeof err === 'object' && 'code' in err && err.code === 11000) {
      throw new ConflictException(
        this.i18n.t(`translation.${entityName.toUpperCase()}.ALREADY_EXISTS`, {
          lang: I18nContext.current()?.lang,
        }),
      );
    }

    // Handle other errors
    throw new InternalServerErrorException(
      this.i18n.t(
        `translation.${entityName.toUpperCase()}.${operation.toUpperCase()}_ERROR`,
        {
          lang: I18nContext.current()?.lang,
        },
      ),
    );
  }

  /**
   * Handle a not found error
   * @param entityName Name of the entity (e.g., 'User', 'Product')
   * @param id ID of the entity
   * @throws NotFoundException
   */
  handleNotFoundError(entityName: string, id: string): never {
    throw new NotFoundException(
      this.i18n.t(`translation.${entityName.toUpperCase()}.NOT_FOUND`, {
        lang: I18nContext.current()?.lang,
        args: { id },
      }),
    );
  }

  /**
   * Log an error without throwing an exception
   * @param error Error object
   * @param context Context where the error occurred
   * @param message Optional message
   */
  logError(error: unknown, context: string, message?: string): void {
    const err = error as Error;
    this.logger.error(
      `${message || 'Error occurred'} in ${context}: ${err.message}`,
      err.stack,
    );
  }
}
