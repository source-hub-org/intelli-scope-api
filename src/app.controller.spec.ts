import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { I18nContext } from 'nestjs-i18n';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn().mockReturnValue('Hello World!'),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return translated hello message', () => {
      // Create a mock I18n context
      const mockI18n = {
        t: jest.fn().mockReturnValue('Hello NestJS User, how are you?'),
        lang: 'en',
      } as unknown as I18nContext;

      const result = appController.getHello(mockI18n);

      expect(result).toBe('Hello NestJS User, how are you?');
      expect(mockI18n.t).toHaveBeenCalledWith('translation.HELLO', {
        args: { name: 'NestJS User' },
      });
    });
  });

  describe('hello-ja', () => {
    it('should return translated hello message in Japanese', () => {
      // Create a mock I18n context for Japanese
      const mockI18n = {
        t: jest
          .fn()
          .mockReturnValue('こんにちは NestJSユーザー さん、お元気ですか？'),
        lang: 'ja',
      } as unknown as I18nContext;

      const result = appController.getHelloJa(mockI18n);

      expect(result).toBe('こんにちは NestJSユーザー さん、お元気ですか？');
      expect(mockI18n.t).toHaveBeenCalledWith('translation.HELLO', {
        args: { name: 'NestJSユーザー' },
        lang: 'ja',
      });
    });
  });
});
