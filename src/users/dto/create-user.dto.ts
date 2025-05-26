import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('translation.VALIDATION.NAME_NOT_EMPTY'),
  })
  @IsString()
  readonly name: string;

  @ApiProperty({
    description: 'The email of the user',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('translation.VALIDATION.EMAIL_NOT_EMPTY'),
  })
  @IsEmail(
    {},
    {
      message: i18nValidationMessage(
        'translation.VALIDATION.EMAIL_INVALID_FORMAT',
      ),
    },
  )
  readonly email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'password123',
    minLength: 6,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('translation.VALIDATION.PASSWORD_NOT_EMPTY'),
  })
  @MinLength(6, {
    message: i18nValidationMessage(
      'translation.VALIDATION.PASSWORD_MIN_LENGTH',
      { constraints: [6] },
    ),
  })
  readonly password: string;

  @ApiProperty({
    description: 'Password confirmation that must match the password',
    example: 'password123',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'translation.VALIDATION.PASSWORD_CONFIRMATION_NOT_EMPTY',
    ),
  })
  @ValidateIf(
    (o: Record<string, unknown>) =>
      typeof o === 'object' &&
      o !== null &&
      'password' in o &&
      o.password !== undefined,
  ) // Only validate if password exists
  @Matches(/^.*$/, {
    message: (args) => {
      // Type assertion with type guard to ensure password exists
      if (!args || typeof args !== 'object' || !args.object) {
        return '';
      }

      // Define a type guard function to check if an object has a password property
      function hasPassword(obj: unknown): obj is { password: string } {
        // First check if it's an object
        if (typeof obj !== 'object' || obj === null) {
          return false;
        }

        // Then check if it has a password property
        if (!('password' in obj)) {
          return false;
        }

        // Finally check if the password is a string
        const typedObj = obj as Record<string, unknown>;
        return typeof typedObj.password === 'string';
      }

      // Use the type guard to safely access the password
      if (hasPassword(args.object) && args.object.password !== args.value) {
        return i18nValidationMessage(
          'translation.VALIDATION.PASSWORD_CONFIRMATION_MATCH',
        )(args);
      }
      return '';
    },
  })
  readonly password_confirmation: string;
}
