import { IsString, MinLength, IsOptional, IsNotEmpty } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The name of the user',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({
    message: i18nValidationMessage('translation.VALIDATION.NAME_NOT_EMPTY'),
  })
  readonly name?: string;

  // Usually not allowing email updates through this endpoint, or requiring verification
  // @ApiPropertyOptional({
  //   description: 'The email of the user',
  //   example: 'john.doe@example.com',
  // })
  // @IsOptional()
  // @IsEmail({}, { message: i18nValidationMessage('translation.VALIDATION.EMAIL_INVALID_FORMAT') })
  // readonly email?: string;

  @ApiPropertyOptional({
    description: 'The new password of the user',
    example: 'newpassword123',
    minLength: 6,
  })
  @IsOptional()
  @MinLength(6, {
    message: i18nValidationMessage(
      'translation.VALIDATION.PASSWORD_MIN_LENGTH',
      { constraints: [6] },
    ),
  })
  readonly password?: string; // If you want to update the password
}
