import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  // Create the application
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get the config service
  const configService = app.get(ConfigService);

  // Get the application port
  const port = configService.get<number>('PORT', 3000);

  // Get the application environment
  const environment = configService.get<string>('NODE_ENV', 'development');
  const isDevelopment = environment !== 'production';

  // Create a logger
  const logger = new Logger('Bootstrap');

  // Enable CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Use compression
  app.use(compression());

  // Use helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: isDevelopment ? false : undefined,
    }),
  );

  // Set global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Configure Swagger
  if (isDevelopment) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IntelliScope API')
      .setDescription('API documentation for IntelliScope')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Setup Swagger UI
    SwaggerModule.setup('docs', app, document);

    // Generate OpenAPI JSON file
    generateOpenApiJson(app, document);
  }

  // Start the application
  await app.listen(port);

  // Log the application URL
  logger.log(`Application is running on: ${await app.getUrl()}`);

  // Log Swagger URL in development
  if (isDevelopment) {
    logger.log(`Swagger UI available at ${await app.getUrl()}/docs`);
    logger.log(`OpenAPI JSON available at ${await app.getUrl()}/docs-json`);
  }
}

/**
 * Generate and save the OpenAPI JSON file
 * @param app The NestJS application instance
 * @param document The OpenAPI document
 */
function generateOpenApiJson(app: INestApplication, document: any) {
  const outputPath = './openapi.json';
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

  const logger = new Logger('OpenAPI');
  logger.log(`OpenAPI JSON file has been generated at ${outputPath}`);
}

// Start the application
void bootstrap();
