import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { validate } from 'class-validator';
// import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';

/**
 * Custom validation pipe with i18n support
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(@Optional() private readonly i18n?: I18nService) {}

  /**
   * Transform and validate the input value
   * @param value The input value
   * @param metadata The argument metadata
   * @returns The transformed value
   */
  async transform<T>(value: any, { metatype }: ArgumentMetadata): Promise<T> {
    // If no metatype or it's a primitive type, skip validation
    if (!metatype || !this.toValidate(metatype)) {
      return value as T;
    }

    // Skip validation for I18nContext objects
    if (
      value &&
      typeof value === 'object' &&
      value !== null &&
      // Use type assertion to avoid TypeScript warnings
      (value as Record<string, unknown>).constructor &&
      // Use type assertion to access constructor name safely
      (
        (value as Record<string, unknown>).constructor as unknown as {
          name: string;
        }
      ).name === 'I18nContext'
    ) {
      return value as T;
    }

    // Skip validation for undefined or null values
    if (value === undefined || value === null) {
      return value as T;
    }

    // Convert plain object to class instance
    try {
      const valueAsRecord =
        typeof value === 'object' && value !== null
          ? (value as Record<string, unknown>)
          : {};

      // Use a safer approach to transform the object
      let object: object;
      try {
        // Create a new instance of the class
        const instance = new (metatype as new () => object)();
        // Manually copy properties instead of using plainToInstance
        object = Object.assign(instance, valueAsRecord);
      } catch (error: unknown) {
        const err = error as Error;
        this.logger.error(
          `Error creating object instance: ${err.message}`,
          err.stack,
        );
        // If we can't create an instance, just return the original value
        return value as T;
      }

      // Validate the object
      const errors = await validate(object);

      if (errors.length > 0) {
        // Format validation errors
        const formattedErrors = errors.map((err) => {
          const constraints = err.constraints || {};
          const property = err.property;

          // Get the first constraint message
          const firstConstraint =
            Object.values(constraints)[0] || 'Invalid value';

          return {
            property,
            message: firstConstraint,
            constraints,
          };
        });

        // Log validation errors
        this.logger.debug(
          `Validation failed: ${JSON.stringify(formattedErrors)}`,
        );

        // Throw a bad request exception with the formatted errors
        let errorMessage = 'Validation error occurred.';

        // Try to get translated message if i18n service is available
        if (this.i18n) {
          try {
            errorMessage = this.i18n.t('translation.COMMON.VALIDATION_ERROR');
          } catch (error) {
            this.logger.warn(
              'Failed to translate validation error message',
              error,
            );
          }
        }

        throw new BadRequestException({
          message: errorMessage,
          error: 'Bad Request',
          errors: formattedErrors,
        });
      }

      return object as T;
    } catch (error: unknown) {
      // If the error is a BadRequestException, rethrow it
      if (error instanceof BadRequestException) {
        throw error;
      }

      const err = error as Error;
      this.logger.error(
        `Unexpected error in validation pipe: ${err.message}`,
        err.stack,
      );
      return value as T;
    }
  }

  /**
   * Check if the metatype should be validated
   * @param metatype The metatype to check
   * @returns True if the metatype should be validated
   */
  private toValidate(metatype: abstract new (...args: any[]) => any): boolean {
    const types: (abstract new (...args: any[]) => any)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.some((type) => type === metatype);
  }
}
