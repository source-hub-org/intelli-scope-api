import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { I18nService } from 'nestjs-i18n';

/**
 * Custom validation pipe with i18n support
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  constructor(private readonly i18n: I18nService) {}

  /**
   * Transform and validate the input value
   * @param value The input value
   * @param metadata The argument metadata
   * @returns The transformed value
   */
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // If no metatype or it's a primitive type, skip validation
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Convert plain object to class instance
    const object = plainToInstance(metatype, value);

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
      throw new BadRequestException({
        message: this.i18n.translate('translation.COMMON.VALIDATION_ERROR', {
          lang: 'en', // Default language
        }),
        error: 'Validation Error',
        details: formattedErrors,
      });
    }

    return object;
  }

  /**
   * Check if the metatype should be validated
   * @param metatype The metatype to check
   * @returns True if the metatype should be validated
   */
  private toValidate(metatype: any): boolean {
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
