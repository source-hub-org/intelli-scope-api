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
  @ValidateIf((o) => o.password !== undefined) // Chỉ validate nếu password tồn tại
  @Matches(/^.*$/, {
    message: (args) => {
      const obj = args.object as { password: string };
      if (obj.password !== args.value) {
        return i18nValidationMessage(
          'translation.VALIDATION.PASSWORD_CONFIRMATION_MATCH',
        )(args);
      }
      return '';
    },
  })
  readonly password_confirmation: string;
}
