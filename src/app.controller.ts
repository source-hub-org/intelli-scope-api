import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { I18n, I18nContext } from 'nestjs-i18n';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Get a hello message' })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message in the default language',
    type: String,
  })
  @Get()
  getHello(@I18n() i18n: I18nContext): string {
    // To get current language: i18n.lang
    return i18n.t('translation.HELLO', { args: { name: 'NestJS User' } });
  }

  @ApiOperation({ summary: 'Get a hello message in Japanese' })
  @ApiResponse({
    status: 200,
    description: 'Returns a greeting message in Japanese',
    type: String,
  })
  @Get('hello-ja') // Test
  getHelloJa(@I18n() i18n: I18nContext): string {
    return i18n.t('translation.HELLO', {
      lang: 'ja',
      args: { name: 'NestJSユーザー' },
    });
  }
}
